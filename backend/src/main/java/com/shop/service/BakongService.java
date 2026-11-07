package com.shop.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.shop.exception.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Bakong KHQR integration service.
 *
 * In production (BAKONG_MOCK=false + real credentials):
 *   - Uses official Bakong Open API / Java SDK to generate KHQR and verify by MD5.
 *
 * In development (default mock mode):
 *   - Generates a valid-looking EMVCo-style KHQR payload
 *   - Returns a real QR image (PNG base64)
 *   - Simulates payment status (call simulatePaymentSuccess for testing)
 */
@Service
@Slf4j
public class BakongService {

    @Value("${app.bakong.mock-mode:true}")
    private boolean mockMode;

    @Value("${app.bakong.merchant-name:Bakong Shop}")
    private String merchantName;

    @Value("${app.bakong.merchant-city:Phnom Penh}")
    private String merchantCity;

    @Value("${app.bakong.account-id:merchant@bank}")
    private String accountId;

    // In-memory store for mock payment status (md5 -> status)
    private final Map<String, String> mockStatusStore = new ConcurrentHashMap<>();

    public record KhqrResult(
            String qrString,
            String md5,
            String qrImageBase64,
            Instant expiresAt
    ) {}

    public KhqrResult generateKhqr(BigDecimal amountKhr, String billNumber) {
        if (mockMode) {
            return generateMockKhqr(amountKhr, billNumber);
        }
        // Production path – integrate official SDK here
        // Example with tongbora starter or kh.gov.nbc.bakong_khqr:sdk-java
        throw new ApiException(HttpStatus.NOT_IMPLEMENTED,
                "Real Bakong mode requires valid credentials. Set app.bakong.mock-mode=true for development.");
    }

    public String checkTransactionStatus(String md5) {
        if (mockMode) {
            return mockStatusStore.getOrDefault(md5, "PENDING");
        }
        // Production: call Bakong Open API check_transaction_by_md5
        throw new ApiException(HttpStatus.NOT_IMPLEMENTED, "Real Bakong verification not configured");
    }

    /** Test helper – mark a mock transaction as paid */
    public void simulatePaymentSuccess(String md5) {
        if (mockMode) {
            mockStatusStore.put(md5, "SUCCESS");
            log.info("Mock payment SUCCESS for MD5={}", md5);
        }
    }

    public void markExpired(String md5) {
        if (mockMode) {
            mockStatusStore.put(md5, "EXPIRED");
        }
    }

    private KhqrResult generateMockKhqr(BigDecimal amountKhr, String billNumber) {
        // Simplified EMVCo / KHQR-like payload (for development only)
        String payload = String.format(
                "00020101021229300012%s0108%s52045999530311654%02d%s5802KH5913%s6009%s62070503***6304",
                accountId,
                billNumber != null ? billNumber : "INV",
                amountKhr.toPlainString().length(),
                amountKhr.toPlainString(),
                merchantName.length() > 13 ? merchantName.substring(0, 13) : merchantName,
                merchantCity.length() > 9 ? merchantCity.substring(0, 9) : merchantCity
        );

        // CRC placeholder (real KHQR uses CRC16)
        String qrString = payload + "ABCD";

        String md5 = md5Hex(qrString + UUID.randomUUID());
        Instant expiresAt = Instant.now().plus(10, ChronoUnit.MINUTES);

        mockStatusStore.put(md5, "PENDING");

        String qrImage = generateQrImageBase64(qrString);

        log.info("Generated MOCK KHQR md5={} amount={} KHR", md5, amountKhr);
        return new KhqrResult(qrString, md5, qrImage, expiresAt);
    }

    private String generateQrImageBase64(String content) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, 300, 300);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (Exception e) {
            log.error("Failed to generate QR image", e);
            return null;
        }
    }

    private String md5Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }
}
