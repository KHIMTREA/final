package com.shop.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

public class AdminDtos {

    @Data
    public static class CreateUserRequest {
        @NotBlank @Size(min = 2, max = 100)
        private String fullName;
        @NotBlank @Email @Size(max = 100)
        private String email;
        @NotBlank @Size(min = 6, max = 100)
        private String password;
        @Size(max = 20)
        private String phoneNumber;
        @NotEmpty
        private Set<String> roles;
        private Boolean enabled = true;
    }

    @Data
    public static class UpdateUserRequest {
        @NotBlank @Size(min = 2, max = 100)
        private String fullName;
        @NotBlank @Email @Size(max = 100)
        private String email;
        @Size(max = 100) @Pattern(regexp = "^$|.{6,100}")
        private String password;
        @Size(max = 20)
        private String phoneNumber;
        @NotEmpty
        private Set<String> roles;
        @NotNull
        private Boolean enabled;
    }

    @Data
    public static class CreateOrderRequest {
        @NotBlank @Size(max = 100)
        private String customerName;
        @NotBlank @Email @Size(max = 100)
        private String email;
        @NotBlank @Size(max = 20)
        private String phone;
        @NotBlank
        private String shippingAddress;
        @NotEmpty
        @Valid
        private List<OrderItemRequest> items;
    }

    @Data
    public static class OrderItemRequest {
        @NotNull @Positive
        private Long productId;
        @NotNull @Min(1)
        private Integer quantity;
    }

    @Data
    public static class UpdateOrderRequest {
        @NotBlank @Size(max = 100)
        private String customerName;
        @NotBlank @Email @Size(max = 100)
        private String email;
        @NotBlank @Size(max = 20)
        private String phone;
        @NotBlank
        private String shippingAddress;
        @NotBlank
        private String orderStatus;
    }

    @Data
    public static class CreateTransactionRequest {
        @NotNull @Positive
        private Long orderId;
        @NotBlank @Size(max = 64)
        private String khqrMd5;
        @NotNull @DecimalMin(value = "0.01")
        private BigDecimal amountKhr;
        @NotBlank
        private String status = "PENDING";
        @Size(max = 10)
        private String currency = "KHR";
        @Size(max = 100)
        private String fromAccount;
        @Size(max = 128)
        private String bakongHash;
    }

    @Data
    public static class UpdateTransactionRequest {
        @NotNull @Positive
        private Long orderId;
        @NotBlank @Size(max = 64)
        private String khqrMd5;
        @NotNull @DecimalMin(value = "0.01")
        private BigDecimal amountKhr;
        @NotBlank
        private String status;
        @Size(max = 10)
        private String currency;
        @Size(max = 100)
        private String fromAccount;
        @Size(max = 128)
        private String bakongHash;
    }
}
