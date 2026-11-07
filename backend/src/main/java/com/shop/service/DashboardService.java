package com.shop.service;

import com.shop.dto.DashboardDtos.*;
import com.shop.entity.Transaction;
import com.shop.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    public SummaryResponse getSummary() {
        return SummaryResponse.builder()
                .totalRevenueKhr(orderRepository.sumTotalPaidRevenue())
                .totalOrders(orderRepository.count())
                .pendingOrders(orderRepository.countByPaymentStatus("PENDING"))
                .paidOrders(orderRepository.countByPaymentStatus("PAID"))
                .shippedOrders(orderRepository.countByOrderStatus("SHIPPED"))
                .cancelledOrders(orderRepository.countByOrderStatus("CANCELLED"))
                .lowStockCount(productRepository.countLowStock())
                .registeredCustomers(userRepository.countCustomers())
                .guestCheckouts(orderRepository.countGuestCheckouts())
                .build();
    }

    public List<TopProduct> getTopProducts() {
        return orderRepository.findTopSellingProducts().stream()
                .map(row -> TopProduct.builder()
                        .name((String) row[0])
                        .quantitySold(((Number) row[1]).longValue())
                        .revenue((BigDecimal) row[2])
                        .build())
                .collect(Collectors.toList());
    }

    public TransactionAnalytics getTransactionAnalytics() {
        long totalTx = transactionRepository.count();
        long success = transactionRepository.countByStatus("SUCCESS");
        long failedOrExpired = transactionRepository.countByStatus("FAILED")
                + transactionRepository.countByStatus("EXPIRED");

        double failRate = totalTx == 0 ? 0.0 :
                BigDecimal.valueOf(failedOrExpired * 100.0 / totalTx)
                        .setScale(2, RoundingMode.HALF_UP).doubleValue();

        Instant since = Instant.now().minus(7, ChronoUnit.DAYS);
        Map<Integer, Long> hourly = new HashMap<>();
        for (Object[] row : transactionRepository.hourlyDensity(since)) {
            hourly.put(((Number) row[0]).intValue(), ((Number) row[1]).longValue());
        }

        return TransactionAnalytics.builder()
                .totalVolumeKhr(transactionRepository.sumTotalVolume())
                .successfulPaymentsKhr(transactionRepository.sumSuccessfulAmount())
                .failedExpiredRate(failRate)
                .averageOrderValue(transactionRepository.averageOrderValue())
                .hourlyDensity(hourly)
                .build();
    }

    public Page<TransactionRow> getTransactions(String status, Pageable pageable) {
        Page<Transaction> page = (status == null || status.isBlank())
                ? transactionRepository.findAllByOrderByCreatedAtDesc(pageable)
                : transactionRepository.findByStatusOrderByCreatedAtDesc(status, pageable);

        return page.map(tx -> TransactionRow.builder()
                .id(tx.getId())
                .orderId(tx.getOrder().getId())
                .khqrMd5(tx.getKhqrMd5())
                .currency(tx.getCurrency())
                .amountKhr(tx.getAmountKhr())
                .status(tx.getStatus())
                .fromAccount(tx.getFromAccount())
                .bakongHash(tx.getBakongHash())
                .createdAt(tx.getCreatedAt().toString())
                .build());
    }
}
