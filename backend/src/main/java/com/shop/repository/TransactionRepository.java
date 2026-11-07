package com.shop.repository;

import com.shop.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    Optional<Transaction> findByKhqrMd5(String khqrMd5);

    Page<Transaction> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Transaction> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    long countByStatus(String status);

    @Query("SELECT COALESCE(SUM(t.amountKhr), 0) FROM Transaction t")
    BigDecimal sumTotalVolume();

    @Query("SELECT COALESCE(SUM(t.amountKhr), 0) FROM Transaction t WHERE t.status = 'SUCCESS'")
    BigDecimal sumSuccessfulAmount();

    @Query("SELECT COALESCE(AVG(t.amountKhr), 0) FROM Transaction t WHERE t.status = 'SUCCESS'")
    BigDecimal averageOrderValue();

    @Query(value = """
            SELECT EXTRACT(HOUR FROM created_at) AS hour, COUNT(*) AS cnt
            FROM transactions
            WHERE status = 'SUCCESS' AND created_at >= :from
            GROUP BY EXTRACT(HOUR FROM created_at)
            ORDER BY hour
            """, nativeQuery = true)
    List<Object[]> hourlyDensity(@Param("from") Instant from);
}
