package com.shop.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

public class ProductDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateProductRequest {
        @NotBlank @Size(max = 255)
        private String name;
        private String description;
        @NotNull @DecimalMin("0.01")
        private BigDecimal price;
        @NotNull @Min(0)
        private Integer stockQuantity;
        private String imageUrl;
        private String status = "ACTIVE";
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateProductRequest {
        private String name;
        private String description;
        private BigDecimal price;
        private Integer stockQuantity;
        private String imageUrl;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductResponse {
        private Long id;
        private String name;
        private String description;
        private BigDecimal price;
        private Integer stockQuantity;
        private String imageUrl;
        private String status;
        private Instant createdAt;
    }
}
