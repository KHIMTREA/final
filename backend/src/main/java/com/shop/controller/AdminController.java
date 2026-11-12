package com.shop.controller;

import com.shop.dto.DashboardDtos.*;
import com.shop.dto.AdminDtos.*;
import com.shop.entity.Order;
import com.shop.entity.Role;
import com.shop.entity.Transaction;
import com.shop.entity.User;
import com.shop.exception.ApiException;
import com.shop.repository.OrderRepository;
import com.shop.repository.RoleRepository;
import com.shop.repository.TransactionRepository;
import com.shop.repository.UserRepository;
import com.shop.service.AuditService;
import com.shop.service.DashboardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final DashboardService dashboardService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/dashboard/summary")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<SummaryResponse> summary() {
        return ResponseEntity.ok(dashboardService.getSummary());
    }

    @GetMapping("/dashboard/top-products")
    @PreAuthorize("hasAnyRole('ADMIN','STAFF')")
    public ResponseEntity<List<TopProduct>> topProducts() {
        return ResponseEntity.ok(dashboardService.getTopProducts());
    }

    @GetMapping("/transactions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<TransactionRow>> transactions(
            @RequestParam(name = "status", required = false) String status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(dashboardService.getTransactions(status, pageable));
    }

    @GetMapping("/transactions/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TransactionAnalytics> analytics() {
        return ResponseEntity.ok(dashboardService.getTransactionAnalytics());
    }

    // ---------- User & Role Management (Admin only) ----------

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> listUsers() {
        List<Map<String, Object>> result = userRepository.findAll().stream()
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("fullName", u.getFullName());
                    m.put("email", u.getEmail());
                    m.put("phoneNumber", u.getPhoneNumber());
                    m.put("enabled", u.getEnabled());
                    m.put("roles", u.getRoles().stream().map(Role::getName).collect(Collectors.toSet()));
                    m.put("createdAt", u.getCreatedAt());
                    return m;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> createUser(@Valid @RequestBody CreateUserRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .enabled(request.getEnabled() == null || request.getEnabled())
                .roles(resolveRoles(request.getRoles()))
                .build();
        user = userRepository.save(user);
        auditService.log("CREATE_USER", "USER", user.getId(), "Created user: " + user.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).body(toUserResponse(user));
    }

    @PutMapping("/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateUser(
            @PathVariable("userId") Long userId,
            @Valid @RequestBody UpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (!email.equalsIgnoreCase(user.getEmail()) && userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }

        Set<Role> roles = resolveRoles(request.getRoles());
        boolean editingSelf = isCurrentUser(user);
        if (editingSelf && (!request.getEnabled() || !hasAdminRole(roles) || !email.equalsIgnoreCase(user.getEmail()))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot disable, demote, or change the email of your own account");
        }
        boolean removingAdminAccess = user.getEnabled() && hasAdminRole(user.getRoles())
                && (!request.getEnabled() || !hasAdminRole(roles));
        if (removingAdminAccess && userRepository.countEnabledUsersWithRole("ROLE_ADMIN") <= 1) {
            throw new ApiException(HttpStatus.CONFLICT, "The last enabled administrator cannot be disabled or demoted");
        }

        user.setFullName(request.getFullName().trim());
        user.setEmail(email);
        user.setPhoneNumber(request.getPhoneNumber());
        user.setEnabled(request.getEnabled());
        user.setRoles(roles);
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        user = userRepository.save(user);
        auditService.log("UPDATE_USER", "USER", userId, "Updated user: " + user.getEmail());
        return ResponseEntity.ok(toUserResponse(user));
    }

    @DeleteMapping("/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Void> deleteUser(@PathVariable("userId") Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (isCurrentUser(user)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot delete your own account");
        }
        if (Boolean.TRUE.equals(user.getEnabled()) && hasAdminRole(user.getRoles())
                && userRepository.countEnabledUsersWithRole("ROLE_ADMIN") <= 1) {
            throw new ApiException(HttpStatus.CONFLICT, "The last enabled administrator cannot be deleted");
        }
        userRepository.delete(user);
        auditService.log("DELETE_USER", "USER", userId, "Deleted user: " + user.getEmail());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/users/{userId}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> assignRoles(
            @PathVariable("userId") Long userId,
            @RequestBody Map<String, List<String>> body) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        List<String> roleNames = body.get("roles");
        if (roleNames == null || roleNames.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "At least one role is required");
        }
        Set<Role> roles = resolveRoles(new HashSet<>(roleNames));
        if (isCurrentUser(user) && !hasAdminRole(roles)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You cannot remove your own administrator role");
        }
        if (Boolean.TRUE.equals(user.getEnabled()) && hasAdminRole(user.getRoles()) && !hasAdminRole(roles)
                && userRepository.countEnabledUsersWithRole("ROLE_ADMIN") <= 1) {
            throw new ApiException(HttpStatus.CONFLICT, "The last enabled administrator role cannot be removed");
        }

        user.setRoles(roles);
        userRepository.save(user);
        auditService.log("ROLE_ASSIGNMENT", "USER", userId, "Roles set to: " + roleNames);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("userId", userId);
        resp.put("roles", roleNames);
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/transactions")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<TransactionRow> createTransaction(@Valid @RequestBody CreateTransactionRequest request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        if (order.getTransaction() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "Order already has a transaction");
        }
        validateTransactionFields(request.getKhqrMd5(), request.getAmountKhr(), request.getStatus(),
                request.getCurrency(), order);
        if (!"PENDING".equals(request.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "New transactions must start as PENDING");
        }
        if (transactionRepository.existsByKhqrMd5(request.getKhqrMd5())) {
            throw new ApiException(HttpStatus.CONFLICT, "KHQR MD5 already exists");
        }

        Transaction transaction = Transaction.builder()
                .order(order)
                .khqrMd5(request.getKhqrMd5().trim())
                .currency("KHR")
                .amountKhr(request.getAmountKhr())
                .status("PENDING")
                .fromAccount(request.getFromAccount())
                .bakongHash(request.getBakongHash())
                .build();
        transaction = transactionRepository.save(transaction);
        order.setTransaction(transaction);
        orderRepository.save(order);
        auditService.log("CREATE_TRANSACTION", "TRANSACTION", transaction.getId(),
                "Created transaction for order " + order.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(toTransactionRow(transaction));
    }

    @PutMapping("/transactions/{transactionId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<TransactionRow> updateTransaction(
            @PathVariable("transactionId") Long transactionId,
            @Valid @RequestBody UpdateTransactionRequest request) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Transaction not found"));
        Order previousOrder = transaction.getOrder();
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
        validateTransactionFields(request.getKhqrMd5(), request.getAmountKhr(), request.getStatus(),
                request.getCurrency(), order);
        if (transactionRepository.existsByKhqrMd5(request.getKhqrMd5())
                && !transaction.getKhqrMd5().equals(request.getKhqrMd5())) {
            throw new ApiException(HttpStatus.CONFLICT, "KHQR MD5 already exists");
        }
        if (!previousOrder.getId().equals(order.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A transaction cannot be moved to another order");
        }
        if ("SUCCESS".equals(transaction.getStatus())
                || "SUCCESS".equals(request.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Payment success can only be recorded by Bakong verification");
        }

        transaction.setKhqrMd5(request.getKhqrMd5().trim());
        transaction.setCurrency("KHR");
        transaction.setAmountKhr(request.getAmountKhr());
        transaction.setStatus(request.getStatus());
        transaction.setFromAccount(request.getFromAccount());
        transaction.setBakongHash(request.getBakongHash());
        syncPaymentStatus(order, transaction.getStatus());
        transaction = transactionRepository.save(transaction);
        auditService.log("UPDATE_TRANSACTION", "TRANSACTION", transactionId,
                "Updated transaction for order " + order.getId() + " to " + transaction.getStatus());
        return ResponseEntity.ok(toTransactionRow(transaction));
    }

    @DeleteMapping("/transactions/{transactionId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<Void> deleteTransaction(@PathVariable("transactionId") Long transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Transaction not found"));
        if ("SUCCESS".equals(transaction.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Successful transactions cannot be deleted");
        }
        Order order = transaction.getOrder();
        order.setTransaction(null);
        order.setPaymentStatus("PENDING");
        orderRepository.saveAndFlush(order);
        auditService.log("DELETE_TRANSACTION", "TRANSACTION", transactionId,
                "Deleted transaction for order " + order.getId());
        return ResponseEntity.noContent().build();
    }

    private Set<Role> resolveRoles(Set<String> roleNames) {
        return roleNames.stream()
                .map(name -> roleRepository.findByName(name)
                        .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Unknown role: " + name)))
                .collect(Collectors.toSet());
    }

    private boolean isCurrentUser(User user) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && user.getEmail().equalsIgnoreCase(authentication.getName());
    }

    private boolean hasAdminRole(Set<Role> roles) {
        return roles.stream().anyMatch(role -> "ROLE_ADMIN".equals(role.getName()));
    }

    private Map<String, Object> toUserResponse(User user) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", user.getId());
        response.put("fullName", user.getFullName());
        response.put("email", user.getEmail());
        response.put("phoneNumber", user.getPhoneNumber());
        response.put("enabled", user.getEnabled());
        response.put("roles", user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()));
        response.put("createdAt", user.getCreatedAt());
        return response;
    }

    private void validateTransactionFields(String md5, java.math.BigDecimal amount, String status,
                                           String currency, Order order) {
        if (md5 == null || md5.isBlank() || md5.length() > 64) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "KHQR MD5 is required and must be at most 64 characters");
        }
        if (amount == null || amount.compareTo(order.getTotalKhr()) != 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Transaction amount must match the order total");
        }
        if (currency != null && !"KHR".equalsIgnoreCase(currency)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only KHR transactions are supported");
        }
        if (!Set.of("PENDING", "FAILED", "EXPIRED").contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid transaction status");
        }
    }

    private void syncPaymentStatus(Order order, String status) {
        order.setPaymentStatus(switch (status) {
            case "SUCCESS" -> "PAID";
            case "FAILED" -> "FAILED";
            case "EXPIRED" -> "EXPIRED";
            default -> "PENDING";
        });
        orderRepository.save(order);
    }

    private TransactionRow toTransactionRow(Transaction transaction) {
        return TransactionRow.builder()
                .id(transaction.getId())
                .orderId(transaction.getOrder().getId())
                .khqrMd5(transaction.getKhqrMd5())
                .currency(transaction.getCurrency())
                .amountKhr(transaction.getAmountKhr())
                .status(transaction.getStatus())
                .fromAccount(transaction.getFromAccount())
                .bakongHash(transaction.getBakongHash())
                .createdAt(transaction.getCreatedAt() == null ? null : transaction.getCreatedAt().toString())
                .build();
    }
}
