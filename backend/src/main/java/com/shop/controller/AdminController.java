package com.shop.controller;

import com.shop.dto.DashboardDtos.*;
import com.shop.entity.Role;
import com.shop.entity.User;
import com.shop.exception.ApiException;
import com.shop.repository.RoleRepository;
import com.shop.repository.UserRepository;
import com.shop.service.AuditService;
import com.shop.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    private final AuditService auditService;

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
            @RequestParam(required = false) String status,
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

    @PostMapping("/users/{userId}/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> assignRoles(
            @PathVariable Long userId,
            @RequestBody Map<String, List<String>> body) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));

        List<String> roleNames = body.getOrDefault("roles", List.of());
        Set<Role> roles = new HashSet<>();
        for (String name : roleNames) {
            Role role = roleRepository.findByName(name)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Unknown role: " + name));
            roles.add(role);
        }

        user.setRoles(roles);
        userRepository.save(user);
        auditService.log("ROLE_ASSIGNMENT", "USER", userId, "Roles set to: " + roleNames);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("userId", userId);
        resp.put("roles", roleNames);
        return ResponseEntity.ok(resp);
    }
}
