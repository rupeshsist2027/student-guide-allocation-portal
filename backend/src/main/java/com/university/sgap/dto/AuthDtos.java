package com.university.sgap.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public record LoginRequest(
            @NotBlank(message = "Email or User ID is required.") String identifier,
            String password,
            String expectedRole
    ) {}

    public record FirstLoginSetupRequest(
            @NotBlank(message = "Email or User ID is required.") String identifier,
            @NotBlank(message = "New password is required.")
            @Size(min = 6, message = "Password must be at least 6 characters long.")
            String newPassword,
            String expectedRole
    ) {}

    public record AuthResponse(
            boolean ok,
            String message,
            String token,
            String username,
            String email,
            String role,
            String fullName,
            boolean mustSetPassword
    ) {}
}

