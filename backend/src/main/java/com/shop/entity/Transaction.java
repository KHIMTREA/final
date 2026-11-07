package com.shop.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "khqr_md5", nullable = false, unique = true, length = 64)
    private String khqrMd5;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "KHR";

    @Column(name = "amount_khr", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountKhr;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "PENDING"; // PENDING, SUCCESS, EXPIRED, FAILED

    @Column(name = "from_account", length = 100)
    private String fromAccount;

    @Column(name = "bakong_hash", length = 128)
    private String bakongHash;

    @Column(name = "raw_response", columnDefinition = "TEXT")
    private String rawResponse;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
