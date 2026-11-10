package com.university.sgap.service;

import com.university.sgap.dto.AuthDtos.*;
import com.university.sgap.entity.AccountStatus;
import com.university.sgap.entity.Faculty;
import com.university.sgap.entity.Student;
import com.university.sgap.entity.UserAccount;
import com.university.sgap.entity.UserRole;
import com.university.sgap.repository.FacultyRepository;
import com.university.sgap.repository.StudentRepository;
import com.university.sgap.repository.UserAccountRepository;
import com.university.sgap.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final StudentRepository studentRepository;
    private final FacultyRepository facultyRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthService(
            UserAccountRepository userAccountRepository,
            StudentRepository studentRepository,
            FacultyRepository facultyRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenProvider jwtTokenProvider
    ) {
        this.userAccountRepository = userAccountRepository;
        this.studentRepository = studentRepository;
        this.facultyRepository = facultyRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        UserAccount account = userAccountRepository.findByIdentifier(request.identifier().trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid Email / User ID or password."));

        if (request.expectedRole() != null && !request.expectedRole().isBlank()) {
            String expected = request.expectedRole().trim().toUpperCase(Locale.ROOT);
            if (!account.getRole().name().equals(expected)) {
                throw new IllegalArgumentException(
                        "Account belongs to role " + account.getRole().name() + ", cannot sign in under " + expected + "."
                );
            }
        }

        if (account.getAccountStatus() == AccountStatus.DISABLED) {
            throw new IllegalArgumentException("This user account has been disabled.");
        }

        if (account.isMustSetPassword() || account.getAccountStatus() == AccountStatus.PENDING_ACTIVATION) {
            throw new IllegalArgumentException(
                    "Account requires first-login password setup. Switch to First-Time Activation and set your password using your User ID or Email."
            );
        }

        String rawPassword = request.password() != null ? request.password() : "";
        if (rawPassword.isBlank() || !passwordEncoder.matches(rawPassword, account.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid Email / User ID or password.");
        }

        String fullName = resolveFullName(account);
        String jwt = jwtTokenProvider.generateToken(account.getUsername(), account.getRole().name());

        return new AuthResponse(
                true,
                "Signed in successfully.",
                jwt,
                account.getUsername(),
                account.getEmail(),
                account.getRole().name(),
                fullName,
                false
        );
    }

    @Transactional(rollbackFor = Exception.class)
    public AuthResponse completeFirstLoginSetup(FirstLoginSetupRequest request) {
        UserAccount account = userAccountRepository.findByIdentifier(request.identifier().trim())
                .orElseThrow(() -> new IllegalArgumentException("No imported account found matching \"" + request.identifier() + "\"."));

        if (request.expectedRole() != null && !request.expectedRole().isBlank()) {
            String expected = request.expectedRole().trim().toUpperCase(Locale.ROOT);
            if (!account.getRole().name().equals(expected)) {
                throw new IllegalArgumentException(
                        "Account belongs to role " + account.getRole().name() + ", cannot activate under " + expected + "."
                );
            }
        }

        if (account.getRole() == UserRole.ADMIN) {
            throw new IllegalArgumentException("Administrator accounts cannot use first-time student/faculty activation.");
        }

        if (account.getAccountStatus() == AccountStatus.DISABLED) {
            throw new IllegalArgumentException("This user account has been disabled.");
        }

        if (!account.isMustSetPassword() && account.getAccountStatus() == AccountStatus.ACTIVE) {
            throw new IllegalArgumentException("This account is already activated. Please sign in normally.");
        }

        account.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        account.setMustSetPassword(false);
        account.setInvitationToken(null);
        account.setInvitationExpiresAt(null);
        account.setAccountStatus(AccountStatus.ACTIVE);
        userAccountRepository.save(account);

        String fullName = resolveFullName(account);
        String jwt = jwtTokenProvider.generateToken(account.getUsername(), account.getRole().name());

        return new AuthResponse(
                true,
                "Account activated and BCrypt password saved. Signed in as " + fullName + ".",
                jwt,
                account.getUsername(),
                account.getEmail(),
                account.getRole().name(),
                fullName,
                false
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse getCurrentUser(String username) {
        UserAccount account = userAccountRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new IllegalArgumentException("User session not found."));
        return new AuthResponse(
                true,
                "Session valid.",
                null,
                account.getUsername(),
                account.getEmail(),
                account.getRole().name(),
                resolveFullName(account),
                account.isMustSetPassword()
        );
    }

    private String resolveFullName(UserAccount account) {
        if (account.getRole() == UserRole.ADMIN) {
            return "Admin User";
        }
        if (account.getRole() == UserRole.STUDENT) {
            return studentRepository.findByRegisterNumber(account.getUsername())
                    .map(Student::getStudentName)
                    .orElse(account.getUsername());
        }
        if (account.getRole() == UserRole.FACULTY) {
            return facultyRepository.findByFacultyId(account.getUsername())
                    .map(Faculty::getFacultyName)
                    .orElse(account.getUsername());
        }
        return account.getUsername();
    }
}

