package com.university.sgap;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.sgap.entity.*;
import com.university.sgap.repository.*;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "app.security.auth-rate-limit-per-minute=200")
@AutoConfigureMockMvc
@Transactional
class BulkImportIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private FacultyRepository facultyRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private AdminStatisticsRepository statisticsRepository;

    @Autowired
    private AdminCapacitySettingsRepository capacityRepository;

    @Autowired
    private PortalGuideAllocationRepository allocationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String loginAs(String identifier, String password, String expectedRole) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "identifier", identifier,
                "password", password,
                "expectedRole", expectedRole
        ));
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("token").asText();
    }

    private UserAccount createActiveTestAdmin(String username, String rawPass) {
        UserAccount admin = new UserAccount();
        admin.setUsername(username);
        admin.setEmail(username.toLowerCase() + "@test.university.edu");
        admin.setPasswordHash(passwordEncoder.encode(rawPass));
        admin.setRole(UserRole.ADMIN);
        admin.setMustSetPassword(false);
        admin.setAccountStatus(AccountStatus.ACTIVE);
        return userAccountRepository.save(admin);
    }

    private Student createActiveTestStudent(String regNo, String name, String email, String rawPass) {
        Department cse = departmentRepository.findByCodeIgnoreCase("CSE").orElseThrow();
        UserAccount user = new UserAccount();
        user.setUsername(regNo);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPass));
        user.setRole(UserRole.STUDENT);
        user.setMustSetPassword(false);
        user.setAccountStatus(AccountStatus.ACTIVE);
        userAccountRepository.save(user);

        Student s = new Student();
        s.setUser(user);
        s.setRegisterNumber(regNo);
        s.setStudentName(name);
        s.setEmail(email);
        s.setDepartment(cse);
        s.setAcademicYear("2025-2026");
        s.setSection("A");
        s.setSemester("Semester 8");
        s.setBatch("2025-2026");
        return studentRepository.save(s);
    }

    private Faculty createActiveTestFaculty(String facultyId, String name, String email, String rawPass) {
        Department cse = departmentRepository.findByCodeIgnoreCase("CSE").orElseThrow();
        UserAccount user = new UserAccount();
        user.setUsername(facultyId);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPass));
        user.setRole(UserRole.FACULTY);
        user.setMustSetPassword(false);
        user.setAccountStatus(AccountStatus.ACTIVE);
        userAccountRepository.save(user);

        Faculty f = new Faculty();
        f.setUser(user);
        f.setFacultyId(facultyId);
        f.setFacultyName(name);
        f.setEmail(email);
        f.setDepartment(cse);
        f.setDesignation("Professor");
        f.setSpecialization("Distributed Systems");
        f.setOffice("CSE Wing");
        return facultyRepository.save(f);
    }

    private byte[] buildXlsx(List<String> headers, List<List<String>> rows) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Data");
            Row headerRow = sheet.createRow(0);
            for (int c = 0; c < headers.size(); c++) {
                headerRow.createCell(c).setCellValue(headers.get(c));
            }
            for (int r = 0; r < rows.size(); r++) {
                Row dataRow = sheet.createRow(r + 1);
                List<String> vals = rows.get(r);
                for (int c = 0; c < vals.size(); c++) {
                    if (vals.get(c) != null) {
                        dataRow.createCell(c).setCellValue(vals.get(c));
                    }
                }
            }
            workbook.write(out);
            return out.toByteArray();
        }
    }

    @Test
    void bootstrapRequiresAuthenticationAndActuatorHealthIsPublic() throws Exception {
        // Cloud health probe must respond 200 UP publicly
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());

        // Anonymous callers cannot enumerate portal directories or PII
        mockMvc.perform(get("/api/portal/bootstrap")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/student/teams")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"registerNumber\":\"43611001\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/faculty/progress")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"teamId\":\"TEAM-001\",\"facultyId\":\"FAC001\",\"stage\":\"Design\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void bootstrapMatchesPersistedDatabaseStateAndEnforcesStrictRoleIsolation() throws Exception {
        int expectedStudents = (int) studentRepository.count();
        int expectedFaculty = (int) facultyRepository.count();
        int expectedStatsStudents = statisticsRepository.findById(1L)
                .map(AdminStatistics::getTotalStudents)
                .orElse(0);
        int expectedStatsFaculty = statisticsRepository.findById(1L)
                .map(AdminStatistics::getTotalFaculty)
                .orElse(0);

        createActiveTestAdmin("ADM-TEST-1", "TestAdmin@2026");
        createActiveTestStudent("STU-9001", "Test Student", "stu9001@college.edu", "Pass@123");
        createActiveTestStudent("STU-9002", "Other Student", "stu9002@college.edu", "Pass@123");
        createActiveTestFaculty("FAC-9001", "Dr. Test Faculty", "fac9001@college.edu", "Pass@123");

        String adminToken = loginAs("ADM-TEST-1", "TestAdmin@2026", "ADMIN");
        String stuToken = loginAs("STU-9001", "Pass@123", "STUDENT");
        String facToken = loginAs("FAC-9001", "Pass@123", "FACULTY");

        // Admin bootstrap returns full database state
        MvcResult bootstrapRes = mockMvc.perform(get("/api/portal/bootstrap")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode boot = objectMapper.readTree(bootstrapRes.getResponse().getContentAsString());
        assertThat(boot.get("students").size()).isEqualTo(expectedStudents + 2);
        assertThat(boot.get("facultyList").size()).isEqualTo(expectedFaculty + 1);
        assertThat(boot.get("adminStatistics").get("totalStudents").asInt()).isEqualTo(expectedStatsStudents);
        assertThat(boot.get("adminStatistics").get("totalFaculty").asInt()).isEqualTo(expectedStatsFaculty);

        // Student bootstrap redacts other users' email/status while keeping own email
        MvcResult stuBootRes = mockMvc.perform(get("/api/portal/bootstrap")
                        .header("Authorization", "Bearer " + stuToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode stuBoot = objectMapper.readTree(stuBootRes.getResponse().getContentAsString());
        for (JsonNode row : stuBoot.get("students")) {
            if ("STU-9001".equals(row.get("registerNumber").asText())) {
                assertThat(row.get("email").asText()).isEqualTo("stu9001@college.edu");
            } else {
                assertThat(row.get("email").isNull()).isTrue();
            }
        }
        assertThat(stuBoot.get("notifications").size()).isZero();

        // Cross-role and self-impersonation calls are blocked with 403
        mockMvc.perform(post("/api/student/teams")
                        .header("Authorization", "Bearer " + stuToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"registerNumber\":\"STU-9002\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/student/teams")
                        .header("Authorization", "Bearer " + facToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"registerNumber\":\"STU-9001\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/faculty/topics")
                        .header("Authorization", "Bearer " + stuToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"facultyId\":\"FAC-9001\",\"projectTitle\":\"T\",\"projectDomain\":\"D\",\"description\":\"X\",\"technologiesUsed\":\"Java\"}"))
                .andExpect(status().isForbidden());

        // Admin statistics & team settings update endpoints require ADMIN role
        mockMvc.perform(get("/api/admin/statistics")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/team-settings")).andExpect(status().isUnauthorized());

        mockMvc.perform(put("/api/admin/statistics")
                        .header("Authorization", "Bearer " + stuToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalStudents\":50,\"totalFaculty\":10}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/admin/team-settings")
                        .header("Authorization", "Bearer " + stuToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentsPerTeam\":3,\"maxTeamsPerFaculty\":2}"))
                .andExpect(status().isForbidden());

        // Removed capacity-settings planning endpoint is no longer exposed
        mockMvc.perform(get("/api/admin/capacity-settings")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());

        // Invalid team-settings rejected cleanly with 400
        mockMvc.perform(put("/api/admin/team-settings")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentsPerTeam\":0,\"maxTeamsPerFaculty\":2}"))
                .andExpect(status().isBadRequest());

        // Valid Admin team-settings update persists to admin_capacity_settings
        MvcResult teamCfgRes = mockMvc.perform(put("/api/admin/team-settings")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentsPerTeam\":3,\"maxTeamsPerFaculty\":4}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode teamCfgJson = objectMapper.readTree(teamCfgRes.getResponse().getContentAsString());
        assertThat(teamCfgJson.get("configured").asBoolean()).isTrue();
        assertThat(teamCfgJson.get("studentsPerTeam").asInt()).isEqualTo(3);
        assertThat(teamCfgJson.get("maxTeamsPerFaculty").asInt()).isEqualTo(4);
        assertThat(teamCfgJson.get("updatedAt").asText()).isNotBlank();

        AdminCapacitySettings savedCfg = capacityRepository.findById(1L).orElseThrow();
        assertThat(savedCfg.getStudentsPerTeam()).isEqualTo(3);
        assertThat(savedCfg.getConfiguredTeamsPerGuide()).isEqualTo(4);

        // Negative values rejected cleanly with 400
        mockMvc.perform(put("/api/admin/statistics")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalStudents\":-1,\"totalFaculty\":10}"))
                .andExpect(status().isBadRequest());

        // Valid Admin update persists to admin_statistics
        MvcResult updateRes = mockMvc.perform(put("/api/admin/statistics")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalStudents\":140,\"totalFaculty\":18}"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode updatedJson = objectMapper.readTree(updateRes.getResponse().getContentAsString());
        assertThat(updatedJson.get("totalStudents").asInt()).isEqualTo(140);
        assertThat(updatedJson.get("totalFaculty").asInt()).isEqualTo(18);
        assertThat(updatedJson.get("updatedAt").asText()).isNotBlank();

        AdminStatistics dbStats = statisticsRepository.findById(1L).orElseThrow();
        assertThat(dbStats.getTotalStudents()).isEqualTo(140);
        assertThat(dbStats.getTotalFaculty()).isEqualTo(18);
    }

    @Test
    void adminBulkImportEndpointsEnforceStrictRbac() throws Exception {
        createActiveTestStudent("STU-RBAC-1", "RBAC Student", "rbac.stu@college.edu", "StudentPass@1");
        createActiveTestFaculty("FAC-RBAC-1", "Dr. RBAC Faculty", "rbac.fac@college.edu", "FacultyPass@1");

        byte[] sampleBytes = buildXlsx(
                List.of("Register Number", "Student Name", "Email", "Department", "Academic Year", "Section", "Semester"),
                List.of(List.of("0099887701", "Test RBAC", "rbac.student@university.edu", "CSE", "2025-2026", "A", "8"))
        );
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "students.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                sampleBytes
        );

        // Unauthenticated requests -> 401
        mockMvc.perform(multipart("/api/admin/students/import/preview").file(file))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/admin/students/import/template"))
                .andExpect(status().isUnauthorized());

        // Student token -> 403
        String studentToken = loginAs("STU-RBAC-1", "StudentPass@1", "STUDENT");
        mockMvc.perform(multipart("/api/admin/students/import/preview")
                        .file(file)
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/admin/faculty/import/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"importToken\":\"fake\",\"strategy\":\"IMPORT_VALID_ONLY\"}")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());

        // Faculty token -> 403
        String facultyToken = loginAs("FAC-RBAC-1", "FacultyPass@1", "FACULTY");
        mockMvc.perform(multipart("/api/admin/faculty/import/preview")
                        .file(file)
                        .header("Authorization", "Bearer " + facultyToken))
                .andExpect(status().isForbidden());

        // Admin token -> 200
        createActiveTestAdmin("ADM-TEST-2", "TestAdmin@2026");
        String adminToken = loginAs("ADM-TEST-2", "TestAdmin@2026", "ADMIN");
        mockMvc.perform(get("/api/admin/students/import/template")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    @Test
    void downloadOfficialStudentAndFacultyExcelTemplates() throws Exception {
        createActiveTestAdmin("ADM-TEST-3", "TestAdmin@2026");
        String adminToken = loginAs("ADM-TEST-3", "TestAdmin@2026", "ADMIN");

        MvcResult stuRes = mockMvc.perform(get("/api/admin/students/import/template")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(stuRes.getResponse().getContentAsByteArray()))) {
            Sheet sheet = wb.getSheetAt(0);
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Register Number");
            assertThat(sheet.getRow(0).getCell(6).getStringCellValue()).isEqualTo("Semester");
            assertThat(sheet.getRow(1).getCell(0).getStringCellValue()).startsWith("00");
        }

        MvcResult facRes = mockMvc.perform(get("/api/admin/faculty/import/template")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(facRes.getResponse().getContentAsByteArray()))) {
            Sheet sheet = wb.getSheetAt(0);
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Faculty ID");
            assertThat(sheet.getRow(0).getCell(5).getStringCellValue()).isEqualTo("Specialization");
            assertThat(sheet.getRow(0).getLastCellNum()).isEqualTo((short) 6);
        }
    }

    @Test
    void rejectsUploadContainingPasswordColumn() throws Exception {
        createActiveTestAdmin("ADM-TEST-4", "TestAdmin@2026");
        String adminToken = loginAs("ADM-TEST-4", "TestAdmin@2026", "ADMIN");

        byte[] xlsxWithPassword = buildXlsx(
                List.of("Register Number", "Student Name", "Email", "Department", "Academic Year", "Section", "Semester", "Password"),
                List.of(List.of("0011223344", "Unsafe Row", "unsafe@university.edu", "CSE", "2025-2026", "A", "8", "plain123"))
        );

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "unsafe-students.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                xlsxWithPassword
        );

        MvcResult res = mockMvc.perform(multipart("/api/admin/students/import/preview")
                        .file(file)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andReturn();

        JsonNode json = objectMapper.readTree(res.getResponse().getContentAsString());
        assertThat(json.get("message").asText()).contains("Do not place passwords");
    }

    @Test
    void studentExcelPreviewConfirmLeadingZerosStrategiesAndFirstLoginActivation() throws Exception {
        createActiveTestStudent("EXISTING-001", "Existing Student", "existing.stu@college.edu", "Pass@123");
        createActiveTestAdmin("ADM-TEST-5", "TestAdmin@2026");
        String adminToken = loginAs("ADM-TEST-5", "TestAdmin@2026", "ADMIN");
        long initialStudentCount = studentRepository.count();

        byte[] studentXlsx = buildXlsx(
                List.of("Register Number", "Student Name", "Email", "Department", "Academic Year", "Section", "Semester"),
                List.of(
                        // Row 2: Valid with leading zero!
                        List.of("0088119901", "Kavya Nair", "kavya.nair.test@university.edu", "CSE", "2025-2026", "A", "8"),
                        // Row 3: Valid with leading zero and full department name!
                        List.of("0088119902", "Vikram Rao", "vikram.rao.test@university.edu", "Information Technology", "2025-2026", "B", "Semester 8"),
                        // Row 4: Duplicate Register Number already in MySQL!
                        List.of("EXISTING-001", "Dup Existing", "dup.existing@university.edu", "CSE", "2025-2026", "A", "8"),
                        // Row 5: Duplicate inside same file + invalid email!
                        List.of("0088119901", "In File Dup", "not-an-email", "CSE", "2025-2026", "A", "8"),
                        // Row 6: Missing name, unknown department, invalid semester 12!
                        List.of("0088119905", "", "bad.row@university.edu", "ASTROLOGY", "2025-2026", "A", "12")
                )
        );

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "batch-students.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                studentXlsx
        );

        // Step 2 & 3: Preview without importing
        MvcResult previewRes = mockMvc.perform(multipart("/api/admin/students/import/preview")
                        .file(file)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode previewJson = objectMapper.readTree(previewRes.getResponse().getContentAsString());
        assertThat(previewJson.get("totalRecords").asInt()).isEqualTo(5);
        assertThat(previewJson.get("validRecords").asInt()).isEqualTo(2);
        assertThat(previewJson.get("duplicateRecords").asInt()).isEqualTo(2);
        assertThat(previewJson.get("invalidRecords").asInt()).isEqualTo(1);
        assertThat(studentRepository.count()).isEqualTo(initialStudentCount);

        String importToken = previewJson.get("importToken").asText();
        assertThat(previewJson.get("rows").get(0).get("data").get("Register Number").asText()).isEqualTo("0088119901");
        assertThat(previewJson.get("rows").get(2).get("errors").get(0).asText()).contains("Row 4: Duplicate Register Number");

        // Test Strict Strategy -> must abort with 0 imported
        String strictBody = objectMapper.writeValueAsString(Map.of(
                "importToken", importToken,
                "strategy", "FAIL_ON_ANY_ERROR"
        ));
        MvcResult strictRes = mockMvc.perform(post("/api/admin/students/import/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(strictBody))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode strictJson = objectMapper.readTree(strictRes.getResponse().getContentAsString());
        assertThat(strictJson.get("ok").asBoolean()).isFalse();
        assertThat(strictJson.get("successfullyImported").asInt()).isZero();
        assertThat(studentRepository.count()).isEqualTo(initialStudentCount);

        // Test IMPORT_VALID_ONLY -> imports 2 valid rows + syncs admin_statistics!
        String validOnlyBody = objectMapper.writeValueAsString(Map.of(
                "importToken", importToken,
                "strategy", "IMPORT_VALID_ONLY"
        ));
        MvcResult confirmRes = mockMvc.perform(post("/api/admin/students/import/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validOnlyBody))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode confirmJson = objectMapper.readTree(confirmRes.getResponse().getContentAsString());
        assertThat(confirmJson.get("ok").asBoolean()).isTrue();
        assertThat(confirmJson.get("successfullyImported").asInt()).isEqualTo(2);
        assertThat(confirmJson.get("failedRecords").asInt()).isEqualTo(3);
        assertThat(studentRepository.count()).isEqualTo(initialStudentCount + 2);
        assertThat(statisticsRepository.findById(1L).orElseThrow().getTotalStudents())
                .isEqualTo((int) (initialStudentCount + 2));

        // Leading zero preserved verbatim in MySQL entity + PENDING_ACTIVATION + BCrypt secret
        Student importedStudent = studentRepository.findByRegisterNumber("0088119901").orElseThrow();
        assertThat(importedStudent.getStudentName()).isEqualTo("Kavya Nair");
        assertThat(importedStudent.getUser().getAccountStatus()).isEqualTo(AccountStatus.PENDING_ACTIVATION);
        assertThat(importedStudent.getUser().isMustSetPassword()).isTrue();
        assertThat(importedStudent.getUser().getPasswordHash()).startsWith("$2");

        assertThat(importedStudent.getUser().getInvitationToken()).isNull();

        // Download Failed Records Report (.xlsx)
        String reportPayload = objectMapper.writeValueAsString(Map.of(
                "importType", "STUDENT",
                "failedRows", objectMapper.convertValue(confirmJson.get("failedRows"), List.class)
        ));
        MvcResult reportRes = mockMvc.perform(post("/api/admin/import/failed-report")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportPayload))
                .andExpect(status().isOk())
                .andReturn();

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(reportRes.getResponse().getContentAsByteArray()))) {
            Sheet sheet = wb.getSheetAt(0);
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Row Number");
            assertThat(sheet.getLastRowNum()).isEqualTo(3);
        }

        // First-Login Password Setup directly by Register Number (no token required) -> BCrypt saved + normal login works
        String activateBody = objectMapper.writeValueAsString(Map.of(
                "identifier", "0088119901",
                "newPassword", "KavyaPass@2026",
                "expectedRole", "STUDENT"
        ));
        mockMvc.perform(post("/api/auth/first-login-setup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(activateBody))
                .andExpect(status().isOk());

        UserAccount activatedAccount = userAccountRepository.findByUsernameIgnoreCase("0088119901").orElseThrow();
        assertThat(activatedAccount.getAccountStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(activatedAccount.isMustSetPassword()).isFalse();
        assertThat(activatedAccount.getInvitationToken()).isNull();
        assertThat(passwordEncoder.matches("KavyaPass@2026", activatedAccount.getPasswordHash())).isTrue();

        // Re-activating an already active account must be rejected
        mockMvc.perform(post("/api/auth/first-login-setup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(activateBody))
                .andExpect(status().isBadRequest());

        String newStudentJwt = loginAs("0088119901", "KavyaPass@2026", "STUDENT");
        assertThat(newStudentJwt).isNotBlank();
    }

    @Test
    void csvAndFacultyImportSyncCountsAndIntegrateWithAuthenticatedFcfsAllocation() throws Exception {
        createActiveTestFaculty("FAC-EX-01", "Dr. Existing Faculty", "existing.fac@college.edu", "FacPass@1");
        createActiveTestAdmin("ADM-TEST-6", "TestAdmin@2026");
        String adminToken = loginAs("ADM-TEST-6", "TestAdmin@2026", "ADMIN");

        // Admin configures Team Size = 2 and Max Teams Per Faculty = 3
        mockMvc.perform(put("/api/admin/team-settings")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentsPerTeam\":2,\"maxTeamsPerFaculty\":3}"))
                .andExpect(status().isOk());

        long initialStudents = studentRepository.count();
        long initialFaculty = facultyRepository.count();

        // CSV upload with UTF-8 BOM + leading-zero register numbers
        String csvText = "\uFEFFRegister Number,Student Name,Email,Department,Academic Year,Section,Semester\n"
                + "0099110001,Deepa Menon,deepa.menon@university.edu,CSE,2025-2026,A,8\n"
                + "0099110002,Rohan Das,rohan.das@university.edu,CSE,2025-2026,A,8\n";
        MockMultipartFile csvFile = new MockMultipartFile(
                "file",
                "students.csv",
                "text/csv",
                csvText.getBytes(StandardCharsets.UTF_8)
        );

        MvcResult csvConfirm = mockMvc.perform(multipart("/api/admin/students/import/confirm")
                        .file(csvFile)
                        .param("strategy", "IMPORT_VALID_ONLY")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode csvJson = objectMapper.readTree(csvConfirm.getResponse().getContentAsString());
        assertThat(csvJson.get("successfullyImported").asInt()).isEqualTo(2);
        assertThat(studentRepository.count()).isEqualTo(initialStudents + 2);
        assertThat(statisticsRepository.findById(1L).orElseThrow().getTotalStudents())
                .isEqualTo((int) (initialStudents + 2));

        // Faculty Excel with extra ignored capacity column -> capacity stays Admin-configured limit (3)
        byte[] facultyXlsx = buildXlsx(
                List.of("Faculty ID", "Faculty Name", "Email", "Department", "Designation", "Specialization", "Maximum Team Capacity"),
                List.of(
                        List.of("FAC-201", "Dr. Sunitha Verma", "sunitha.verma@university.edu", "CSE", "Associate Professor", "Cloud Systems", "999"),
                        List.of("FAC-EX-01", "Duplicate Guide", "dup.fac@college.edu", "CSE", "Professor", "AI", "50")
                )
        );
        MockMultipartFile facFile = new MockMultipartFile(
                "file",
                "faculty.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                facultyXlsx
        );

        MvcResult facPreview = mockMvc.perform(multipart("/api/admin/faculty/import/preview")
                        .file(facFile)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode facPreviewJson = objectMapper.readTree(facPreview.getResponse().getContentAsString());
        assertThat(facPreviewJson.get("validRecords").asInt()).isEqualTo(1);
        assertThat(facPreviewJson.get("duplicateRecords").asInt()).isEqualTo(1);
        assertThat(facPreviewJson.get("adminConfiguredMaxCapacity").asInt()).isEqualTo(3);

        String facConfirmBody = objectMapper.writeValueAsString(Map.of(
                "importToken", facPreviewJson.get("importToken").asText(),
                "strategy", "IMPORT_VALID_ONLY"
        ));
        mockMvc.perform(post("/api/admin/faculty/import/confirm")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(facConfirmBody))
                .andExpect(status().isOk());

        assertThat(facultyRepository.count()).isEqualTo(initialFaculty + 1);
        assertThat(statisticsRepository.findById(1L).orElseThrow().getTotalFaculty())
                .isEqualTo((int) (initialFaculty + 1));

        // Activate lead student (no token required) & authenticate for Team Formation + FCFS Direct Allocation
        MvcResult leadActivateRes = mockMvc.perform(post("/api/auth/first-login-setup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "identifier", "0099110001",
                                "newPassword", "DeepaPass@2026",
                                "expectedRole", "STUDENT"
                        ))))
                .andExpect(status().isOk())
                .andReturn();
        String leadJwt = objectMapper.readTree(leadActivateRes.getResponse().getContentAsString()).get("token").asText();

        MvcResult createTeamRes = mockMvc.perform(post("/api/student/teams")
                        .header("Authorization", "Bearer " + leadJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"registerNumber\":\"0099110001\"}"))
                .andExpect(status().isOk())
                .andReturn();
        PortalTeam createdTeam = objectMapper.readValue(createTeamRes.getResponse().getContentAsString(), PortalTeam.class);

        String addMemberBody = objectMapper.writeValueAsString(Map.of(
                "teamId", createdTeam.getTeamId(),
                "actingRegisterNumber", "0099110001",
                "targetRegisterNumber", "0099110002"
        ));
        mockMvc.perform(post("/api/student/teams/members")
                        .header("Authorization", "Bearer " + leadJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addMemberBody))
                .andExpect(status().isOk());

        String selectGuideBody = objectMapper.writeValueAsString(Map.of(
                "teamId", createdTeam.getTeamId(),
                "actingRegisterNumber", "0099110001",
                "facultyId", "FAC-201"
        ));
        MvcResult allocRes = mockMvc.perform(post("/api/student/select-guide")
                        .header("Authorization", "Bearer " + leadJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(selectGuideBody))
                .andExpect(status().isOk())
                .andReturn();
        PortalGuideAllocation alloc = objectMapper.readValue(allocRes.getResponse().getContentAsString(), PortalGuideAllocation.class);
        assertThat(alloc.getFacultyId()).isEqualTo("FAC-201");
        assertThat(allocationRepository.countByFacultyIdAndStatus("FAC-201", "Allocated")).isEqualTo(1L);
    }

    @Test
    void capacityCalculationsAndTotalCountsAutoSyncDirectlyDuringBulkImport() throws Exception {
        createActiveTestAdmin("ADM-TEST-7", "TestAdmin@2026");
        String adminToken = loginAs("ADM-TEST-7", "TestAdmin@2026", "ADMIN");
        long initialStudents = studentRepository.count();
        long initialFaculty = facultyRepository.count();

        // Auto calculation fails cleanly when no students exist
        if (initialStudents == 0) {
            MvcResult noStuRes = mockMvc.perform(put("/api/admin/team-settings")
                            .header("Authorization", "Bearer " + adminToken)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"studentsPerTeam\":2,\"maxTeamsMode\":\"auto\"}"))
                    .andExpect(status().isBadRequest())
                    .andReturn();
            assertThat(objectMapper.readTree(noStuRes.getResponse().getContentAsString()).get("message").asText())
                    .contains("Total Students must be greater than zero");
        }

        // Bulk import 5 students -> Total Students directly calculated & stored in MySQL
        byte[] fiveStudentsXlsx = buildXlsx(
                List.of("Register Number", "Student Name", "Email", "Department", "Academic Year", "Section", "Semester"),
                List.of(
                        List.of("CAP-STU-01", "Student One", "cap1@university.edu", "CSE", "2025-2026", "A", "8"),
                        List.of("CAP-STU-02", "Student Two", "cap2@university.edu", "CSE", "2025-2026", "A", "8"),
                        List.of("CAP-STU-03", "Student Three", "cap3@university.edu", "CSE", "2025-2026", "A", "8"),
                        List.of("CAP-STU-04", "Student Four", "cap4@university.edu", "CSE", "2025-2026", "A", "8"),
                        List.of("CAP-STU-05", "Student Five", "cap5@university.edu", "CSE", "2025-2026", "A", "8")
                )
        );
        mockMvc.perform(multipart("/api/admin/students/import/confirm")
                        .file(new MockMultipartFile("file", "cap-students.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fiveStudentsXlsx))
                        .param("strategy", "IMPORT_VALID_ONLY")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Bulk import 2 faculty -> Total Guides directly calculated & stored in MySQL
        byte[] twoFacultyXlsx = buildXlsx(
                List.of("Faculty ID", "Faculty Name", "Email", "Department", "Designation", "Specialization"),
                List.of(
                        List.of("CAP-FAC-01", "Dr. Alpha Guide", "capf1@university.edu", "CSE", "Professor", "AI"),
                        List.of("CAP-FAC-02", "Dr. Beta Guide", "capf2@university.edu", "CSE", "Associate Professor", "Cloud")
                )
        );
        mockMvc.perform(multipart("/api/admin/faculty/import/confirm")
                        .file(new MockMultipartFile("file", "cap-faculty.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", twoFacultyXlsx))
                        .param("strategy", "IMPORT_VALID_ONLY")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        int expectedStudents = (int) initialStudents + 5;
        int expectedGuides = (int) initialFaculty + 2;

        AdminCapacitySettings afterImport = capacityRepository.findById(1L).orElseThrow();
        assertThat(afterImport.getTotalStudents()).isEqualTo(expectedStudents);
        assertThat(afterImport.getTotalGuides()).isEqualTo(expectedGuides);
        assertThat(statisticsRepository.findById(1L).orElseThrow().getTotalStudents()).isEqualTo(expectedStudents);
        assertThat(statisticsRepository.findById(1L).orElseThrow().getTotalFaculty()).isEqualTo(expectedGuides);

        // Save Automatic Calculation with 2 Students Per Team
        MvcResult autoSaveRes = mockMvc.perform(put("/api/admin/team-settings")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentsPerTeam\":2,\"maxTeamsMode\":\"auto\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode autoJson = objectMapper.readTree(autoSaveRes.getResponse().getContentAsString());

        int expectedTeams = (int) Math.ceil((double) expectedStudents / 2.0);
        int expectedAutoPerGuide = (int) Math.ceil((double) expectedTeams / expectedGuides);
        assertThat(autoJson.get("configured").asBoolean()).isTrue();
        assertThat(autoJson.get("totalStudents").asInt()).isEqualTo(expectedStudents);
        assertThat(autoJson.get("totalGuides").asInt()).isEqualTo(expectedGuides);
        assertThat(autoJson.get("maxTeamsMode").asText()).isEqualTo("auto");
        assertThat(autoJson.get("totalTeamsRequired").asInt()).isEqualTo(expectedTeams);
        assertThat(autoJson.get("recommendedTeamsPerGuide").asInt()).isEqualTo(expectedAutoPerGuide);
        assertThat(autoJson.get("maxTeamsPerFaculty").asInt()).isEqualTo(expectedAutoPerGuide);
        assertThat(autoJson.get("capacitySufficient").asBoolean()).isTrue();

        // Save custom insufficient capacity (1 team per guide -> capacity 2 < 3 required)
        MvcResult manualRes = mockMvc.perform(put("/api/admin/team-settings")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentsPerTeam\":2,\"maxTeamsPerFaculty\":1,\"maxTeamsMode\":\"custom\",\"customMaxTeamsPerGuide\":1}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode manualJson = objectMapper.readTree(manualRes.getResponse().getContentAsString());
        assertThat(manualJson.get("maxTeamsPerFaculty").asInt()).isEqualTo(1);
        assertThat(manualJson.get("totalGuideCapacity").asInt()).isEqualTo(expectedGuides);
        assertThat(manualJson.get("capacitySufficient").asBoolean()).isEqualTo(expectedGuides >= expectedTeams);

        // Re-enable Automatic Calculation, then bulk import 4 more students -> auto limit recalculates immediately!
        mockMvc.perform(put("/api/admin/team-settings")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentsPerTeam\":2,\"maxTeamsMode\":\"auto\"}"))
                .andExpect(status().isOk());

        byte[] fourMoreStudentsXlsx = buildXlsx(
                List.of("Register Number", "Student Name", "Email", "Department", "Academic Year", "Section", "Semester"),
                List.of(
                        List.of("CAP-STU-06", "Student Six", "cap6@university.edu", "CSE", "2025-2026", "A", "8"),
                        List.of("CAP-STU-07", "Student Seven", "cap7@university.edu", "CSE", "2025-2026", "A", "8"),
                        List.of("CAP-STU-08", "Student Eight", "cap8@university.edu", "CSE", "2025-2026", "A", "8"),
                        List.of("CAP-STU-09", "Student Nine", "cap9@university.edu", "CSE", "2025-2026", "A", "8")
                )
        );
        mockMvc.perform(multipart("/api/admin/students/import/confirm")
                        .file(new MockMultipartFile("file", "cap-students-2.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fourMoreStudentsXlsx))
                        .param("strategy", "IMPORT_VALID_ONLY")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        int updatedStudents = expectedStudents + 4;
        int updatedTeams = (int) Math.ceil((double) updatedStudents / 2.0);
        int updatedAutoPerGuide = (int) Math.ceil((double) updatedTeams / expectedGuides);
        AdminCapacitySettings syncedSettings = capacityRepository.findById(1L).orElseThrow();
        assertThat(syncedSettings.getTotalStudents()).isEqualTo(updatedStudents);
        assertThat(syncedSettings.getConfiguredTeamsPerGuide()).isEqualTo(updatedAutoPerGuide);
    }
}
