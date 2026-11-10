package com.university.sgap.controller;

import com.university.sgap.dto.AuthDtos.*;
import com.university.sgap.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/first-login-setup")
    public ResponseEntity<AuthResponse> firstLoginSetup(@Valid @RequestBody FirstLoginSetupRequest request) {
        return ResponseEntity.ok(authService.completeFirstLoginSetup(request));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(Authentication authentication) {
        if (authentication == null) {
            throw new IllegalArgumentException("Not authenticated.");
        }
        return ResponseEntity.ok(authService.getCurrentUser(authentication.getName()));
    }
}

