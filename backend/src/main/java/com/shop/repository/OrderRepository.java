package com.shop.repository;

import com.shop.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByPaymentStatus(String paymentStatus);

    long countByOrderStatus(String orderStatus);

    @Query("SELECT COALESCE(SUM(o.totalKhr), 0) FROM Order o WHERE o.paymentStatus = 'PAID'")
    BigDecimal sumTotalPaidRevenue();

    @Query("SELECT COALESCE(SUM(o.totalKhr), 0) FROM Order o WHERE o.paymentStatus = 'PAID' AND o.createdAt >= :from AND o.createdAt < :to")
    BigDecimal sumRevenueBetween(@Param("from") Instant from, @Param("to") Instant to);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.user IS NULL AND o.paymentStatus = 'PAID'")
    long countGuestCheckouts();

    @Query(value = """
            SELECT p.name, SUM(oi.quantity) as qty, SUM(oi.unit_price * oi.quantity) as revenue
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            JOIN orders o ON o.id = oi.order_id
            WHERE o.payment_status = 'PAID'
            GROUP BY p.id, p.name
            ORDER BY qty DESC
            LIMIT 5
            """, nativeQuery = true)
    List<Object[]> findTopSellingProducts();
}
