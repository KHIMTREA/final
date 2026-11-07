package com.shop.service;

import com.shop.dto.CheckoutDtos.*;
import com.shop.entity.*;
import com.shop.exception.ApiException;
import com.shop.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckoutService {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final BakongService bakongService;
    private final AuditService auditService;

    @Transactional
    public KhqrResponse createCheckout(CheckoutRequest request) {
        // Resolve current user (may be null for guest)
        User currentUser = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            currentUser = userRepository.findByEmail(auth.getName()).orElse(null);
        }

        // Validate stock & calculate total
        BigDecimal total = BigDecimal.ZERO;
        Order order = Order.builder()
                .user(currentUser)
                .customerName(request.getCustomerName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .shippingAddress(request.getShippingAddress())
                .paymentStatus("PENDING")
                .orderStatus("PROCESSING")
                .build();

        for (CartItem item : request.getItems()) {
            Product product = productRepository.findById(item.getProductId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
                            "Product not found: " + item.getProductId()));

            if (!"ACTIVE".equals(product.getStatus())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Product is not available: " + product.getName());
            }
            if (product.getStockQuantity() < item.getQuantity()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Insufficient stock for: " + product.getName());
            }

            BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
            total = total.add(lineTotal);

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .unitPrice(product.getPrice())
                    .quantity(item.getQuantity())
                    .build();
            order.addItem(orderItem);

            // Reserve stock
            product.setStockQuantity(product.getStockQuantity() - item.getQuantity());
            productRepository.save(product);
        }

        order.setTotalKhr(total);
        order = orderRepository.save(order);

        // Generate KHQR
        String billNumber = "ORD-" + order.getId();
        BakongService.KhqrResult khqr = bakongService.generateKhqr(total, billNumber);

        Transaction tx = Transaction.builder()
                .order(order)
                .khqrMd5(khqr.md5())
                .currency("KHR")
                .amountKhr(total)
                .status("PENDING")
                .build();
        tx = transactionRepository.save(tx);
        order.setTransaction(tx);

        auditService.log("CREATE_ORDER", "ORDER", order.getId(),
                "Checkout created, total=" + total + " KHR, md5=" + khqr.md5());

        return KhqrResponse.builder()
                .orderId(order.getId())
                .khqrMd5(khqr.md5())
                .qrString(khqr.qrString())
                .qrImageBase64(khqr.qrImageBase64())
                .amountKhr(total)
                .currency("KHR")
                .expiresAt(khqr.expiresAt().atOffset(ZoneOffset.UTC)
                        .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME))
                .status("PENDING")
                .build();
    }

    @Transactional
    public PaymentStatusResponse verifyPayment(String md5) {
        Transaction tx = transactionRepository.findByKhqrMd5(md5)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Transaction not found"));

        if ("SUCCESS".equals(tx.getStatus()) || "FAILED".equals(tx.getStatus()) || "EXPIRED".equals(tx.getStatus())) {
            return toStatusResponse(tx);
        }

        // Poll Bakong
        String bakongStatus = bakongService.checkTransactionStatus(md5);

        if ("SUCCESS".equals(bakongStatus)) {
            tx.setStatus("SUCCESS");
            tx.setBakongHash("mock-hash-" + md5.substring(0, 12));
            Order order = tx.getOrder();
            order.setPaymentStatus("PAID");
            orderRepository.save(order);
            transactionRepository.save(tx);
            auditService.log("PAYMENT_SUCCESS", "TRANSACTION", tx.getId(),
                    "Payment confirmed for order " + order.getId());
        } else if ("EXPIRED".equals(bakongStatus)) {
            tx.setStatus("EXPIRED");
            Order order = tx.getOrder();
            order.setPaymentStatus("EXPIRED");
            orderRepository.save(order);
            transactionRepository.save(tx);
        }

        return toStatusResponse(tx);
    }

    /** Dev helper endpoint */
    @Transactional
    public PaymentStatusResponse simulateSuccess(String md5) {
        bakongService.simulatePaymentSuccess(md5);
        return verifyPayment(md5);
    }

    private PaymentStatusResponse toStatusResponse(Transaction tx) {
        return PaymentStatusResponse.builder()
                .md5(tx.getKhqrMd5())
                .status(tx.getStatus())
                .orderId(tx.getOrder().getId())
                .amountKhr(tx.getAmountKhr())
                .bakongHash(tx.getBakongHash())
                .message("SUCCESS".equals(tx.getStatus()) ? "Payment confirmed" : "Current status: " + tx.getStatus())
                .build();
    }
}
