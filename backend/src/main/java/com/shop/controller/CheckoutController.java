package com.shop.controller;

import com.shop.dto.CheckoutDtos.*;
import com.shop.service.CheckoutService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/checkout")
@RequiredArgsConstructor
public class CheckoutController {

    private final CheckoutService checkoutService;

    @PostMapping("/khqr")
    public ResponseEntity<KhqrResponse> createKhqr(@Valid @RequestBody CheckoutRequest request) {
        return ResponseEntity.ok(checkoutService.createCheckout(request));
    }

    @GetMapping("/verify/{md5}")
    public ResponseEntity<PaymentStatusResponse> verify(@PathVariable("md5") String md5) {
        return ResponseEntity.ok(checkoutService.verifyPayment(md5));
    }

}
