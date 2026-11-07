package com.shop.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

public class CheckoutDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CheckoutRequest {
        @NotBlank
        private String customerName;
        @NotBlank @Email
        private String email;
        @NotBlank
        private String phone;
        @NotBlank
        private String shippingAddress;
        @NotEmpty
        @Valid
        private List<CartItem> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartItem {
        @NotNull
        private Long productId;
        @NotNull @Min(1)
        private Integer quantity;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KhqrResponse {
        private Long orderId;
        private String khqrMd5;
        private String qrString;
        private String qrImageBase64;   // data:image/png;base64,...
        private BigDecimal amountKhr;
        private String currency;
        private String expiresAt;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentStatusResponse {
        private String md5;
        private String status;          // PENDING, SUCCESS, EXPIRED, FAILED
        private Long orderId;
        private BigDecimal amountKhr;
        private String bakongHash;
        private String message;
    }
}
