package com.shop.controller;

import com.shop.entity.Order;
import com.shop.exception.ApiException;
import com.shop.repository.OrderRepository;
import com.shop.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderRepository orderRepository;
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
    public ResponseEntity<Map<String, Object>> get(@PathVariable Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        return ResponseEntity.ok(toDetail(order));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        String newStatus = body.get("orderStatus");
        if (newStatus != null) {
            order.setOrderStatus(newStatus);
            auditService.log("UPDATE_ORDER_STATUS", "ORDER", id, "Status -> " + newStatus);
        }
        String paymentStatus = body.get("paymentStatus");
        if (paymentStatus != null) {
            order.setPaymentStatus(paymentStatus);
        }

        orderRepository.save(order);
        return ResponseEntity.ok(toSummary(order));
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
