package com.shop.controller;

import com.shop.dto.AdminDtos.CreateOrderRequest;
import com.shop.dto.AdminDtos.OrderItemRequest;
import com.shop.dto.AdminDtos.UpdateOrderRequest;
import com.shop.entity.Order;
import com.shop.entity.OrderItem;
import com.shop.entity.Product;
import com.shop.entity.Transaction;
import com.shop.exception.ApiException;
import com.shop.repository.OrderRepository;
import com.shop.repository.ProductRepository;
import com.shop.service.AuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final AuditService auditService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<Page<Map<String, Object>>> list(
            @PageableDefault(size = 20) Pageable pageable) {
        Page<Map<String, Object>> page = orderRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::toSummary);
        return ResponseEntity.ok(page);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> get(@PathVariable("id") Long id) {
        Order order = orderRepository.findWithDetailsById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        return ResponseEntity.ok(toDetail(order));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CreateOrderRequest request) {
        Order order = Order.builder()
                .customerName(request.getCustomerName().trim())
                .email(request.getEmail().trim())
                .phone(request.getPhone().trim())
                .shippingAddress(request.getShippingAddress().trim())
                .paymentStatus("PENDING")
                .orderStatus("PROCESSING")
                .build();
        BigDecimal total = BigDecimal.ZERO;
        Map<Long, Long> quantities = new LinkedHashMap<>();
        for (OrderItemRequest item : request.getItems()) {
            quantities.merge(item.getProductId(), item.getQuantity().longValue(), Long::sum);
        }
        for (Map.Entry<Long, Long> entry : quantities.entrySet()) {
            Product product = productRepository.findById(entry.getKey())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                            "Product not found: " + entry.getKey()));
            if (!"ACTIVE".equals(product.getStatus())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Product is inactive: " + product.getName());
            }
            if (entry.getValue() > product.getStockQuantity()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Insufficient stock for: " + product.getName());
            }
            int quantity = Math.toIntExact(entry.getValue());
            product.setStockQuantity(product.getStockQuantity() - quantity);
            BigDecimal lineTotal = product.getPrice().multiply(BigDecimal.valueOf(quantity));
            total = total.add(lineTotal);
            order.addItem(OrderItem.builder()
                    .product(product)
                    .unitPrice(product.getPrice())
                    .quantity(quantity)
                    .build());
        }
        order.setTotalKhr(total);
        order = orderRepository.save(order);
        auditService.log("CREATE_ORDER", "ORDER", order.getId(), "Created order, total=" + total + " KHR");
        return ResponseEntity.status(HttpStatus.CREATED).body(toDetail(order));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable("id") Long id,
            @Valid @RequestBody UpdateOrderRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        validateOrderStatus(request.getOrderStatus());
        Transaction transaction = order.getTransaction();

        order.setCustomerName(request.getCustomerName().trim());
        order.setEmail(request.getEmail().trim());
        order.setPhone(request.getPhone().trim());
        order.setShippingAddress(request.getShippingAddress().trim());
        order.setOrderStatus(request.getOrderStatus());
        if (transaction != null && "SUCCESS".equals(transaction.getStatus())
                && !"PAID".equals(order.getPaymentStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Payment status is inconsistent with its verified transaction");
        }

        order = orderRepository.save(order);
        auditService.log("UPDATE_ORDER", "ORDER", id,
                "Updated order details and status to " + order.getOrderStatus());
        return ResponseEntity.ok(toDetail(order));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable("id") Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        if ("PAID".equals(order.getPaymentStatus())
                || (order.getTransaction() != null && "SUCCESS".equals(order.getTransaction().getStatus()))) {
            throw new ApiException(HttpStatus.CONFLICT, "Paid orders cannot be deleted");
        }
        for (OrderItem item : order.getItems()) {
            Product product = item.getProduct();
            product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
            productRepository.save(product);
        }
        auditService.log("DELETE_ORDER", "ORDER", id, "Deleted unpaid order");
        orderRepository.delete(order);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable("id") Long id,
            @RequestBody Map<String, String> body) {

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        String newStatus = body.get("orderStatus");
        String paymentStatus = body.get("paymentStatus");
        if (paymentStatus != null) {
            throw new ApiException(HttpStatus.CONFLICT, "Payment status can only be changed by Bakong verification");
        }
        if (newStatus != null) validateOrderStatus(newStatus);
        if (newStatus != null) {
            order.setOrderStatus(newStatus);
            auditService.log("UPDATE_ORDER_STATUS", "ORDER", id, "Status -> " + newStatus);
        }

        orderRepository.save(order);
        return ResponseEntity.ok(toSummary(order));
    }

    private void validateOrderStatus(String orderStatus) {
        if (!Set.of("PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED").contains(orderStatus)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid order status");
        }
    }

    private Map<String, Object> toSummary(Order o) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("customerName", o.getCustomerName());
        m.put("email", o.getEmail());
        m.put("phone", o.getPhone());
        m.put("totalKhr", o.getTotalKhr());
        m.put("paymentStatus", o.getPaymentStatus());
        m.put("orderStatus", o.getOrderStatus());
        m.put("createdAt", o.getCreatedAt());
        return m;
    }

    private Map<String, Object> toDetail(Order o) {
        Map<String, Object> m = toSummary(o);
        m.put("shippingAddress", o.getShippingAddress());
        m.put("items", o.getItems().stream().map(item -> {
            Map<String, Object> i = new LinkedHashMap<>();
            i.put("productId", item.getProduct().getId());
            i.put("productName", item.getProduct().getName());
            i.put("unitPrice", item.getUnitPrice());
            i.put("quantity", item.getQuantity());
            return i;
        }).collect(Collectors.toList()));
        if (o.getTransaction() != null) {
            Map<String, Object> tx = new LinkedHashMap<>();
            tx.put("md5", o.getTransaction().getKhqrMd5());
            tx.put("status", o.getTransaction().getStatus());
            tx.put("bakongHash", o.getTransaction().getBakongHash());
            m.put("transaction", tx);
        }
        return m;
    }
}
