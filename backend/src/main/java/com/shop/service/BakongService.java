package com.shop.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.WriterException;
import com.shop.exception.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import kh.gov.nbc.bakong_khqr.BakongKHQR;
import kh.gov.nbc.bakong_khqr.model.KHQRCurrency;
import kh.gov.nbc.bakong_khqr.model.KHQRData;
import kh.gov.nbc.bakong_khqr.model.KHQRResponse;
import kh.gov.nbc.bakong_khqr.model.IndividualInfo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.http.client.JdkClientHttpRequestFactory;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Map;

/**
 * Bakong KHQR integration service.
 *
 * In production (BAKONG_MOCK=false + real credentials):
 *   - Uses the official KHQR SDK to generate a payable KHQR for the configured
 *     Bakong receiving account.
 *   - Verifies payment details against Bakong Open API before reporting success.
 *
 * In development mock mode:
 *   - Generates an SDK-validated KHQR for a synthetic account
 *   - Returns a real QR image (PNG base64)
 *   - Never reports a mock payment as successful
 */
@Service
@Slf4j
public class BakongService {

    private static final String MOCK_BAKONG_ACCOUNT_ID = "mock@bakong";

    @Value("${app.bakong.mock-mode:false}")
    private boolean mockMode;

    @Value("${app.bakong.base-url:https://api-bakong.nbc.gov.kh}")
    private String baseUrl;

    @Value("${app.bakong.token:}")
    private String token;

    @Value("${app.bakong.merchant-name:Bakong Shop}")
    private String merchantName;

    @Value("${app.bakong.merchant-city:Phnom Penh}")
    private String merchantCity;

    @Value("${app.bakong.account-id:}")
    private String accountId;

    private final RestClient restClient = createRestClient();

    private static RestClient createRestClient() {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(10));
        return RestClient.builder().requestFactory(requestFactory).build();
    }

    public record KhqrResult(
            String qrString,
            String md5,
            String qrImageBase64,
            Instant expiresAt
    ) {}

    public record PaymentCheck(String status, String transactionHash, String fromAccount, String message) {}

    public KhqrResult generateKhqr(BigDecimal amountKhr, String billNumber) {
        if (mockMode) {
            return generateKhqr(amountKhr, billNumber, MOCK_BAKONG_ACCOUNT_ID);
        }

        requireLiveConfiguration();
        return generateKhqr(amountKhr, billNumber, accountId);
    }

    private KhqrResult generateKhqr(BigDecimal amountKhr, String billNumber, String receivingAccountId) {
        Instant expiresAt = Instant.now().plus(10, ChronoUnit.MINUTES);
        IndividualInfo individualInfo = new IndividualInfo();
        individualInfo.setBakongAccountId(receivingAccountId);
        individualInfo.setCurrency(KHQRCurrency.KHR);
        individualInfo.setAmount(amountKhr.doubleValue());
        individualInfo.setMerchantName(merchantName);
        individualInfo.setMerchantCity(merchantCity);
        individualInfo.setBillNumber(billNumber);
        individualInfo.setExpirationTimestamp(expiresAt.toEpochMilli());

        KHQRResponse<KHQRData> response = BakongKHQR.generateIndividual(individualInfo);
        KHQRData data = response == null ? null : response.getData();
        if (data == null || data.getQr() == null || data.getQr().isBlank()
                || data.getMd5() == null || data.getMd5().isBlank()) {
            log.warn("KHQR generation failed: {}", response == null ? "empty SDK response" : response.getKHQRStatus());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Bakong could not generate a payment QR code");
        }

        return new KhqrResult(data.getQr(), data.getMd5(),
                generateQrImageBase64(data.getQr()), expiresAt);
    }

    public PaymentCheck checkTransactionStatus(String md5, BigDecimal expectedAmount) {
        if (mockMode) {
            return new PaymentCheck("PENDING", null, null,
                    "Mock mode cannot confirm real payments");
        }

        requireLiveConfiguration();
        JsonNode response;
        try {
            response = restClient.post()
                    .uri(baseUrl.replaceAll("/+$", "") + "/v1/check_transaction_by_md5")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + token)
                    .body(Map.of("md5", md5))
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException exception) {
            log.error("Bakong payment verification request failed: {}", exception.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Bakong payment verification is temporarily unavailable");
        }
        if (response == null) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Bakong returned an empty verification response");
        }

        int responseCode = response.path("responseCode").asInt(-1);
        if (responseCode == 1) {
            return new PaymentCheck("PENDING", null, null, "Waiting for payment confirmation from Bakong");
        }
        if (responseCode != 0) {
            log.warn("Bakong verification returned response code {}", responseCode);
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Bakong could not verify this payment");
        }

        JsonNode data = response.path("data");
        if (!data.isObject()) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Bakong returned incomplete payment details");
        }
        String hash = data.path("hash").asText("");
        String fromAccount = data.path("fromAccountId").asText("");
        String recipient = data.path("toAccountId").asText("");
        String currency = data.path("currency").asText("");
        JsonNode amountNode = data.get("amount");
        BigDecimal actualAmount = amountNode != null && amountNode.isNumber()
                ? amountNode.decimalValue()
                : null;

        boolean matches = !hash.isBlank()
                && !recipient.isBlank()
                && recipient.equalsIgnoreCase(accountId)
                && "KHR".equalsIgnoreCase(currency)
                && actualAmount != null
                && actualAmount.compareTo(expectedAmount) == 0;
        if (!matches) {
            log.warn("Bakong transaction details did not match the order for MD5={}", md5);
            return new PaymentCheck("FAILED", hash.isBlank() ? null : hash,
                    fromAccount.isBlank() ? null : fromAccount,
                    "Bakong payment details did not match the order amount, currency, or merchant");
        }

        return new PaymentCheck("SUCCESS", hash,
                fromAccount.isBlank() ? null : fromAccount, "Payment confirmed by Bakong");
    }

    private void requireLiveConfiguration() {
        if (token.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Bakong API token is not configured");
        }
        if (accountId.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Bakong merchant account ID is not configured");
        }
    }

    private String generateQrImageBase64(String content) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, 300, 300);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (WriterException | IOException exception) {
            log.error("Failed to generate QR image", exception);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not render the payment QR code");
        }
    }
}
