package com.shop.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class DashboardDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryResponse {
        private BigDecimal totalRevenueKhr;
        private long totalOrders;
        private long pendingOrders;
        private long paidOrders;
        private long shippedOrders;
        private long cancelledOrders;
        private long lowStockCount;
        private long registeredCustomers;
        private long guestCheckouts;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopProduct {
        private String name;
        private long quantitySold;
        private BigDecimal revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransactionAnalytics {
        private BigDecimal totalVolumeKhr;
        private BigDecimal successfulPaymentsKhr;
        private double failedExpiredRate;
        private BigDecimal averageOrderValue;
        private Map<Integer, Long> hourlyDensity; // hour -> count
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransactionRow {
        private Long id;
        private Long orderId;
        private String khqrMd5;
        private String currency;
        private BigDecimal amountKhr;
        private String status;
        private String fromAccount;
        private String bakongHash;
        private String createdAt;
    }
}
