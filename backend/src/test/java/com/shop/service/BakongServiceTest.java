package com.shop.service;

import kh.gov.nbc.bakong_khqr.BakongKHQR;
import kh.gov.nbc.bakong_khqr.model.CRCValidation;
import kh.gov.nbc.bakong_khqr.model.KHQRResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BakongServiceTest {

    private BakongService bakongService;

    @BeforeEach
    void setUp() {
        bakongService = new BakongService();
        ReflectionTestUtils.setField(bakongService, "mockMode", true);
        ReflectionTestUtils.setField(bakongService, "merchantName", "Bakong Shop");
        ReflectionTestUtils.setField(bakongService, "merchantCity", "Phnom Penh");
    }

    @Test
    void mockModeGeneratesSdkValidatedQrAndCannotConfirmPayment() {
        BakongService.KhqrResult result = bakongService.generateKhqr(new BigDecimal("1250"), "ORD-123");

        assertValidQr(result);

        BakongService.PaymentCheck paymentCheck =
                bakongService.checkTransactionStatus(result.md5(), new BigDecimal("1250"));
        assertEquals("PENDING", paymentCheck.status());
    }

    @Test
    void liveModeGeneratesSdkValidatedQrWithMerchantConfiguration() {
        ReflectionTestUtils.setField(bakongService, "mockMode", false);
        ReflectionTestUtils.setField(bakongService, "token", "test-token");
        ReflectionTestUtils.setField(bakongService, "accountId", "merchant@bank");

        BakongService.KhqrResult result = bakongService.generateKhqr(new BigDecimal("1250"), "ORD-123");

        assertValidQr(result);
    }

    private void assertValidQr(BakongService.KhqrResult result) {
        assertNotNull(result.qrImageBase64());
        assertTrue(result.qrImageBase64().startsWith("data:image/png;base64,"));
        assertNotNull(result.expiresAt());

        KHQRResponse<CRCValidation> verification = BakongKHQR.verify(result.qrString());
        assertEquals(0, verification.getKHQRStatus().getCode());
        assertTrue(verification.getData().isValid());
    }
}
