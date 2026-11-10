package com.university.sgap.service;

import com.university.sgap.entity.*;
import com.university.sgap.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final DepartmentRepository departmentRepository;
    private final UserAccountRepository userAccountRepository;
    private final AdminStatisticsRepository statisticsRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:ADM001}")
    private String adminUsername;

    @Value("${app.admin.email:admin@university.edu}")
    private String adminEmail;

    @Value("${app.admin.initial-password:}")
    private String adminInitialPassword;

    public DataSeeder(
            DepartmentRepository departmentRepository,
            UserAccountRepository userAccountRepository,
            AdminStatisticsRepository statisticsRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.departmentRepository = departmentRepository;
        this.userAccountRepository = userAccountRepository;
        this.statisticsRepository = statisticsRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        seedDepartments();
        seedAdminUser();
        seedAdminStatistics();
    }

    private void seedDepartments() {
        if (departmentRepository.count() > 0) {
            return;
        }
        List<String[]> depts = List.of(
                new String[]{"CSE", "Computer Science & Engineering"},
                new String[]{"IT", "Information Technology"},
                new String[]{"ECE", "Electronics & Communication"},
                new String[]{"EEE", "Electrical & Electronics Engineering"},
                new String[]{"MECH", "Mechanical Engineering"},
                new String[]{"CIVIL", "Civil Engineering"},
                new String[]{"AIDS", "Artificial Intelligence & Data Science"}
        );
        for (String[] pair : depts) {
            Department d = new Department();
            d.setCode(pair[0]);
            d.setName(pair[1]);
            departmentRepository.save(d);
        }
    }

    private void seedAdminUser() {
        String resolvedUsername = (adminUsername != null && !adminUsername.isBlank())
                ? adminUsername.trim()
                : "ADM001";

        if (userAccountRepository.findByUsernameIgnoreCase(resolvedUsername).isPresent()) {
            return;
        }

        if (adminInitialPassword == null || adminInitialPassword.isBlank()) {
            log.warn(
                    "Admin account '{}' does not exist and ADMIN_INITIAL_PASSWORD is not set; skipping automatic admin user creation.",
                    resolvedUsername
            );
            return;
        }

        String resolvedEmail = (adminEmail != null && !adminEmail.isBlank())
                ? adminEmail.trim()
                : "admin@university.edu";

        UserAccount admin = new UserAccount();
        admin.setUsername(resolvedUsername);
        admin.setEmail(resolvedEmail);
        admin.setPasswordHash(passwordEncoder.encode(adminInitialPassword.trim()));
        admin.setRole(UserRole.ADMIN);
        admin.setMustSetPassword(false);
        admin.setAccountStatus(AccountStatus.ACTIVE);
        userAccountRepository.save(admin);
        log.info("Bootstrapped administrator account '{}'.", resolvedUsername);
    }

    private void seedAdminStatistics() {
        if (statisticsRepository.existsById(1L)) {
            return;
        }
        AdminStatistics stats = new AdminStatistics();
        stats.setId(1L);
        stats.setTotalStudents(0);
        stats.setTotalFaculty(0);
        stats.setUpdatedAt(LocalDateTime.now());
        statisticsRepository.save(stats);
    }
}
