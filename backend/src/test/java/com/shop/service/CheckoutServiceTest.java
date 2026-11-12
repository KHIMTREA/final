package com.shop.service;

import com.shop.entity.Order;
import com.shop.entity.Transaction;
import com.shop.repository.OrderRepository;
import com.shop.repository.ProductRepository;
import com.shop.repository.TransactionRepository;
import com.shop.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CheckoutServiceTest {

    private final ProductRepository productRepository = mock(ProductRepository.class);
    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private final TransactionRepository transactionRepository = mock(TransactionRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final BakongService bakongService = mock(BakongService.class);
    private final AuditService auditService = mock(AuditService.class);
    private CheckoutService checkoutService;
    private Order order;
    private Transaction transaction;

    @BeforeEach
    void setUp() {
        checkoutService = new CheckoutService(productRepository, orderRepository,
                transactionRepository, userRepository, bakongService, auditService);
        order = Order.builder().paymentStatus("PENDING").build();
        transaction = Transaction.builder()
                .order(order)
                .khqrMd5("test-md5")
                .amountKhr(new BigDecimal("1250"))
                .status("PENDING")
                .build();
        when(transactionRepository.findByKhqrMd5("test-md5")).thenReturn(Optional.of(transaction));
    }

    @Test
    void pendingBakongCheckDoesNotMarkOrderPaid() {
        when(bakongService.checkTransactionStatus("test-md5", new BigDecimal("1250")))
                .thenReturn(new BakongService.PaymentCheck("PENDING", null, null, "Waiting for payment"));

        checkoutService.verifyPayment("test-md5");

        assertEquals("PENDING", transaction.getStatus());
        assertEquals("PENDING", order.getPaymentStatus());
    }

    @Test
    void failedBakongCheckDoesNotMarkOrderPaid() {
        when(bakongService.checkTransactionStatus("test-md5", new BigDecimal("1250")))
                .thenReturn(new BakongService.PaymentCheck("FAILED", null, null, "Payment details mismatch"));

        checkoutService.verifyPayment("test-md5");

        assertEquals("FAILED", transaction.getStatus());
        assertEquals("FAILED", order.getPaymentStatus());
    }

    @Test
    void onlySuccessfulBakongCheckMarksOrderPaid() {
        when(bakongService.checkTransactionStatus("test-md5", new BigDecimal("1250")))
                .thenReturn(new BakongService.PaymentCheck("SUCCESS", "confirmed-hash", "payer@bank", "Confirmed"));

        checkoutService.verifyPayment("test-md5");

        assertEquals("SUCCESS", transaction.getStatus());
        assertEquals("PAID", order.getPaymentStatus());
        assertEquals("confirmed-hash", transaction.getBakongHash());
        assertEquals("payer@bank", transaction.getFromAccount());
    }
}
