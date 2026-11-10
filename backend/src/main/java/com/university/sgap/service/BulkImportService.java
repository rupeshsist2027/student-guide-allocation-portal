package com.university.sgap.service;

import com.university.sgap.dto.BulkImportDtos.*;
import com.university.sgap.entity.*;
import com.university.sgap.repository.*;
import com.university.sgap.service.ImportBatchCache.StagedImportBatch;
import com.university.sgap.service.SpreadsheetParserService.ParsedRow;
import com.university.sgap.service.SpreadsheetParserService.ParsedSheet;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class BulkImportService {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern SEMESTER_PATTERN =
            Pattern.compile("^(?:(?:sem(?:ester)?)\\s*[-:]?\\s*)?(\\d+)$", Pattern.CASE_INSENSITIVE);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final SpreadsheetParserService parserService;
    private final ImportBatchCache batchCache;
    private final DepartmentRepository departmentRepository;
    private final UserAccountRepository userAccountRepository;
    private final StudentRepository studentRepository;
    private final FacultyRepository facultyRepository;
    private final AdminStatisticsRepository statisticsRepository;
    private final AdminCapacitySettingsRepository capacityRepository;
    private final ImportAuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;

    public BulkImportService(
            SpreadsheetParserService parserService,
            ImportBatchCache batchCache,
            DepartmentRepository departmentRepository,
            UserAccountRepository userAccountRepository,
            StudentRepository studentRepository,
            FacultyRepository facultyRepository,
            AdminStatisticsRepository statisticsRepository,
            AdminCapacitySettingsRepository capacityRepository,
            ImportAuditLogRepository auditLogRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.parserService = parserService;
        this.batchCache = batchCache;
        this.departmentRepository = departmentRepository;
        this.userAccountRepository = userAccountRepository;
        this.studentRepository = studentRepository;
        this.facultyRepository = facultyRepository;
        this.statisticsRepository = statisticsRepository;
        this.capacityRepository = capacityRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public ImportPreviewResponse previewStudents(MultipartFile file, String adminUsername) {
        ParsedSheet sheet = parserService.parseFile(file);
        Map<String, Integer> columnIndexMap = resolveColumnIndexes(
                sheet.headers(),
                ExcelTemplateService.STUDENT_COLUMNS,
                "Student"
        );

        ValidationSnapshot snapshot = loadDatabaseSnapshot();
        List<ImportRowPreviewDto> evaluated = evaluateStudentRows(sheet.rows(), columnIndexMap, snapshot);

        return stagePreviewResult(
                "STUDENT",
                file.getOriginalFilename(),
                adminUsername,
                null,
                evaluated
        );
    }

    public ImportPreviewResponse previewFaculty(MultipartFile file, String adminUsername) {
        ParsedSheet sheet = parserService.parseFile(file);
        Map<String, Integer> columnIndexMap = resolveColumnIndexes(
                sheet.headers(),
                ExcelTemplateService.FACULTY_COLUMNS,
                "Faculty"
        );

        ValidationSnapshot snapshot = loadDatabaseSnapshot();
        List<ImportRowPreviewDto> evaluated = evaluateFacultyRows(sheet.rows(), columnIndexMap, snapshot);
        Integer adminCapacity = capacityRepository.findById(1L)
                .map(AdminCapacitySettings::getConfiguredTeamsPerGuide)
                .filter(val -> val > 0)
                .orElse(null);

        return stagePreviewResult(
                "FACULTY",
                file.getOriginalFilename(),
                adminUsername,
                adminCapacity,
                evaluated
        );
    }

    @Transactional(rollbackFor = Exception.class)
    public ImportConfirmResponse confirmStudentsFromToken(
            String importToken,
            ImportStrategy strategy,
            String adminUsername
    ) {
        StagedImportBatch batch = batchCache.getAndValidate(importToken, "STUDENT");
        ImportStrategy chosenStrategy = strategy != null ? strategy : ImportStrategy.IMPORT_VALID_ONLY;

        // Re-validate against latest DB state inside transaction to guarantee no stale duplicates
        ValidationSnapshot liveSnapshot = loadDatabaseSnapshot();
        List<ImportRowPreviewDto> revalidatedRows = revalidateMappedStudentRows(batch.rows(), liveSnapshot);

        ImportConfirmResponse response = executeStudentImportTransaction(
                batch.fileName(),
                revalidatedRows,
                chosenStrategy,
                adminUsername,
                liveSnapshot
        );

        if (response.ok()) {
            batchCache.remove(importToken);
        }
        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    public ImportConfirmResponse confirmStudentsFromFile(
            MultipartFile file,
            ImportStrategy strategy,
            String adminUsername
    ) {
        ImportPreviewResponse preview = previewStudents(file, adminUsername);
        return confirmStudentsFromToken(preview.importToken(), strategy, adminUsername);
    }

    @Transactional(rollbackFor = Exception.class)
    public ImportConfirmResponse confirmFacultyFromToken(
            String importToken,
            ImportStrategy strategy,
            String adminUsername
    ) {
        StagedImportBatch batch = batchCache.getAndValidate(importToken, "FACULTY");
        ImportStrategy chosenStrategy = strategy != null ? strategy : ImportStrategy.IMPORT_VALID_ONLY;

        ValidationSnapshot liveSnapshot = loadDatabaseSnapshot();
        List<ImportRowPreviewDto> revalidatedRows = revalidateMappedFacultyRows(batch.rows(), liveSnapshot);

        ImportConfirmResponse response = executeFacultyImportTransaction(
                batch.fileName(),
                revalidatedRows,
                chosenStrategy,
                adminUsername,
                liveSnapshot
        );

        if (response.ok()) {
            batchCache.remove(importToken);
        }
        return response;
    }

    @Transactional(rollbackFor = Exception.class)
    public ImportConfirmResponse confirmFacultyFromFile(
            MultipartFile file,
            ImportStrategy strategy,
            String adminUsername
    ) {
        ImportPreviewResponse preview = previewFaculty(file, adminUsername);
        return confirmFacultyFromToken(preview.importToken(), strategy, adminUsername);
    }

    private ImportConfirmResponse executeStudentImportTransaction(
            String fileName,
            List<ImportRowPreviewDto> rows,
            ImportStrategy strategy,
            String adminUsername,
            ValidationSnapshot snapshot
    ) {
        Counts counts = countRowStatuses(rows);
        List<ImportRowPreviewDto> failedRows = rows.stream()
                .filter(r -> !"VALID".equals(r.status()))
                .toList();
        List<ImportRowPreviewDto> validRows = rows.stream()
                .filter(r -> "VALID".equals(r.status()))
                .toList();

        if (counts.total == 0) {
            throw new IllegalArgumentException("No student records found to import.");
        }

        if (strategy == ImportStrategy.FAIL_ON_ANY_ERROR && !failedRows.isEmpty()) {
            return new ImportConfirmResponse(
                    false,
                    "Strict All-or-Nothing strategy aborted import because " + failedRows.size()
                            + " record(s) failed validation. Zero records were saved.",
                    "STUDENT",
                    strategy,
                    fileName,
                    counts.total,
                    0,
                    counts.failed,
                    counts.duplicates,
                    counts.invalid,
                    failedRows,
                    List.of()
            );
        }

        if (validRows.isEmpty()) {
            return new ImportConfirmResponse(
                    false,
                    "No valid student records found. Resolve validation errors and re-upload.",
                    "STUDENT",
                    strategy,
                    fileName,
                    counts.total,
                    0,
                    counts.failed,
                    counts.duplicates,
                    counts.invalid,
                    failedRows,
                    List.of()
            );
        }

        List<UserAccount> usersToSave = new ArrayList<>(validRows.size());
        List<Student> studentsToSave = new ArrayList<>(validRows.size());
        List<InvitedAccountSummaryDto> invitations = new ArrayList<>(validRows.size());

        for (ImportRowPreviewDto row : validRows) {
            Map<String, String> data = row.data();
            String regNo = data.get("Register Number"); // Exact string; leading zeros preserved
            String studentName = data.get("Student Name");
            String email = data.get("Email").toLowerCase(Locale.ROOT);
            String deptInput = data.get("Department");
            String academicYear = data.get("Academic Year");
            String section = data.get("Section");
            String semester = normalizeSemester(data.get("Semester"));

            Department department = resolveDepartment(snapshot.departmentsByKey, deptInput);
            if (department == null) {
                throw new IllegalStateException("Row " + row.rowNumber() + ": Department not found during commit.");
            }

            UserAccount user = createPendingUserAccount(regNo, email, UserRole.STUDENT);
            usersToSave.add(user);

            Student student = new Student();
            student.setUser(user);
            student.setRegisterNumber(regNo);
            student.setStudentName(studentName);
            student.setEmail(email);
            student.setDepartment(department);
            student.setAcademicYear(academicYear);
            student.setSection(section);
            student.setSemester(semester);
            student.setBatch(academicYear);
            studentsToSave.add(student);

            invitations.add(new InvitedAccountSummaryDto(
                    regNo,
                    studentName,
                    email,
                    department.getName(),
                    UserRole.STUDENT.name(),
                    AccountStatus.PENDING_ACTIVATION.name()
            ));
        }

        userAccountRepository.saveAll(usersToSave);
        studentRepository.saveAll(studentsToSave);
        studentRepository.flush();
        syncAdminStatisticsAndCapacitySettings(true, false);
        recordAuditLog("STUDENT", fileName, strategy, counts, validRows.size(), adminUsername);

        String message = failedRows.isEmpty()
                ? "Successfully imported all " + validRows.size() + " student record(s) into MySQL."
                : "Imported " + validRows.size() + " valid student record(s). "
                + failedRows.size() + " failed record(s) require attention (download failed report).";

        return new ImportConfirmResponse(
                true,
                message,
                "STUDENT",
                strategy,
                fileName,
                counts.total,
                validRows.size(),
                counts.failed,
                counts.duplicates,
                counts.invalid,
                failedRows,
                invitations
        );
    }

    private ImportConfirmResponse executeFacultyImportTransaction(
            String fileName,
            List<ImportRowPreviewDto> rows,
            ImportStrategy strategy,
            String adminUsername,
            ValidationSnapshot snapshot
    ) {
        Counts counts = countRowStatuses(rows);
        List<ImportRowPreviewDto> failedRows = rows.stream()
                .filter(r -> !"VALID".equals(r.status()))
                .toList();
        List<ImportRowPreviewDto> validRows = rows.stream()
                .filter(r -> "VALID".equals(r.status()))
                .toList();

        if (counts.total == 0) {
            throw new IllegalArgumentException("No faculty records found to import.");
        }

        if (strategy == ImportStrategy.FAIL_ON_ANY_ERROR && !failedRows.isEmpty()) {
            return new ImportConfirmResponse(
                    false,
                    "Strict All-or-Nothing strategy aborted import because " + failedRows.size()
                            + " record(s) failed validation. Zero records were saved.",
                    "FACULTY",
                    strategy,
                    fileName,
                    counts.total,
                    0,
                    counts.failed,
                    counts.duplicates,
                    counts.invalid,
                    failedRows,
                    List.of()
            );
        }

        if (validRows.isEmpty()) {
            return new ImportConfirmResponse(
                    false,
                    "No valid faculty records found. Resolve validation errors and re-upload.",
                    "FACULTY",
                    strategy,
                    fileName,
                    counts.total,
                    0,
                    counts.failed,
                    counts.duplicates,
                    counts.invalid,
                    failedRows,
                    List.of()
            );
        }

        List<UserAccount> usersToSave = new ArrayList<>(validRows.size());
        List<Faculty> facultyToSave = new ArrayList<>(validRows.size());
        List<InvitedAccountSummaryDto> invitations = new ArrayList<>(validRows.size());

        for (ImportRowPreviewDto row : validRows) {
            Map<String, String> data = row.data();
            String facultyId = data.get("Faculty ID");
            String facultyName = data.get("Faculty Name");
            String email = data.get("Email").toLowerCase(Locale.ROOT);
            String deptInput = data.get("Department");
            String designation = data.get("Designation");
            String specialization = data.get("Specialization");

            Department department = resolveDepartment(snapshot.departmentsByKey, deptInput);
            if (department == null) {
                throw new IllegalStateException("Row " + row.rowNumber() + ": Department not found during commit.");
            }

            UserAccount user = createPendingUserAccount(facultyId, email, UserRole.FACULTY);
            usersToSave.add(user);

            Faculty faculty = new Faculty();
            faculty.setUser(user);
            faculty.setFacultyId(facultyId);
            faculty.setFacultyName(facultyName);
            faculty.setEmail(email);
            faculty.setDepartment(department);
            faculty.setDesignation(designation);
            faculty.setSpecialization(specialization);
            faculty.setOffice(department.getCode() + " Faculty Wing");
            facultyToSave.add(faculty);

            invitations.add(new InvitedAccountSummaryDto(
                    facultyId,
                    facultyName,
                    email,
                    department.getName(),
                    UserRole.FACULTY.name(),
                    AccountStatus.PENDING_ACTIVATION.name()
            ));
        }

        userAccountRepository.saveAll(usersToSave);
        facultyRepository.saveAll(facultyToSave);
        facultyRepository.flush();
        syncAdminStatisticsAndCapacitySettings(false, true);
        recordAuditLog("FACULTY", fileName, strategy, counts, validRows.size(), adminUsername);

        String message = failedRows.isEmpty()
                ? "Successfully imported all " + validRows.size() + " faculty record(s) into MySQL."
                : "Imported " + validRows.size() + " valid faculty record(s). "
                + failedRows.size() + " failed record(s) require attention (download failed report).";

        return new ImportConfirmResponse(
                true,
                message,
                "FACULTY",
                strategy,
                fileName,
                counts.total,
                validRows.size(),
                counts.failed,
                counts.duplicates,
                counts.invalid,
                failedRows,
                invitations
        );
    }

    private void syncAdminStatisticsAndCapacitySettings(boolean updateStudents, boolean updateFaculty) {
        int actualStudents = (int) studentRepository.count();
        int actualFaculty = (int) facultyRepository.count();

        AdminStatistics stats = statisticsRepository.findById(1L).orElseGet(() -> {
            AdminStatistics s = new AdminStatistics();
            s.setId(1L);
            s.setTotalStudents(0);
            s.setTotalFaculty(0);
            return s;
        });
        if (updateStudents) {
            stats.setTotalStudents(actualStudents);
        }
        if (updateFaculty) {
            stats.setTotalFaculty(actualFaculty);
        }
        stats.setUpdatedAt(LocalDateTime.now());
        statisticsRepository.save(stats);

        AdminCapacitySettings capacitySettings = capacityRepository.findById(1L).orElseGet(() -> {
            AdminCapacitySettings s = new AdminCapacitySettings();
            s.setId(1L);
            s.setStudentsPerTeam(0);
            s.setMaxTeamsMode("auto");
            s.setCustomMaxTeamsPerGuide(0);
            s.setConfiguredTeamsPerGuide(0);
            return s;
        });
        capacitySettings.setTotalStudents(actualStudents);
        capacitySettings.setTotalGuides(actualFaculty);
        if ("auto".equalsIgnoreCase(capacitySettings.getMaxTeamsMode())
                && capacitySettings.getStudentsPerTeam() > 0
                && actualStudents > 0
                && actualFaculty > 0) {
            int totalTeams = (int) Math.ceil((double) actualStudents / capacitySettings.getStudentsPerTeam());
            int recommended = (int) Math.ceil((double) totalTeams / actualFaculty);
            capacitySettings.setConfiguredTeamsPerGuide(recommended);
            capacitySettings.setCustomMaxTeamsPerGuide(recommended);
        }
        capacitySettings.setUpdatedAt(LocalDateTime.now());
        capacityRepository.save(capacitySettings);
    }

    private UserAccount createPendingUserAccount(
            String username,
            String email,
            UserRole role
    ) {
        byte[] randomSecret = new byte[24];
        SECURE_RANDOM.nextBytes(randomSecret);
        String unguessableInitialSecret = Base64.getUrlEncoder().withoutPadding().encodeToString(randomSecret);

        UserAccount user = new UserAccount();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(unguessableInitialSecret));
        user.setRole(role);
        user.setMustSetPassword(true);
        user.setInvitationToken(null);
        user.setInvitationExpiresAt(null);
        user.setAccountStatus(AccountStatus.PENDING_ACTIVATION);
        return user;
    }

    private void recordAuditLog(
            String importType,
            String fileName,
            ImportStrategy strategy,
            Counts counts,
            int importedCount,
            String adminUsername
    ) {
        ImportAuditLog log = new ImportAuditLog();
        log.setImportType(importType);
        log.setFileName(fileName != null ? fileName : "upload");
        log.setStrategy(strategy.name());
        log.setTotalRecords(counts.total);
        log.setImportedRecords(importedCount);
        log.setFailedRecords(counts.failed);
        log.setDuplicateRecords(counts.duplicates);
        log.setInvalidRecords(counts.invalid);
        log.setImportedBy(adminUsername != null ? adminUsername : "ADM001");
        auditLogRepository.save(log);
    }

    private List<ImportRowPreviewDto> evaluateStudentRows(
            List<ParsedRow> parsedRows,
            Map<String, Integer> colIndexMap,
            ValidationSnapshot snapshot
    ) {
        List<Map<String, String>> mapped = new ArrayList<>(parsedRows.size());
        List<Integer> rowNumbers = new ArrayList<>(parsedRows.size());

        for (ParsedRow row : parsedRows) {
            rowNumbers.add(row.rowNumber());
            Map<String, String> data = new LinkedHashMap<>();
            for (String col : ExcelTemplateService.STUDENT_COLUMNS) {
                int idx = colIndexMap.get(col);
                String val = idx < row.cells().size() ? row.cells().get(idx) : "";
                data.put(col, val != null ? val.trim() : "");
            }
            mapped.add(data);
        }

        return evaluateMappedStudentData(rowNumbers, mapped, snapshot);
    }

    private List<ImportRowPreviewDto> revalidateMappedStudentRows(
            List<ImportRowPreviewDto> existingRows,
            ValidationSnapshot snapshot
    ) {
        List<Integer> rowNumbers = existingRows.stream().map(ImportRowPreviewDto::rowNumber).toList();
        List<Map<String, String>> mapped = existingRows.stream().map(ImportRowPreviewDto::data).toList();
        return evaluateMappedStudentData(rowNumbers, mapped, snapshot);
    }

    private List<ImportRowPreviewDto> evaluateMappedStudentData(
            List<Integer> rowNumbers,
            List<Map<String, String>> mappedRows,
            ValidationSnapshot snapshot
    ) {
        List<ImportRowPreviewDto> results = new ArrayList<>(mappedRows.size());
        Map<String, Integer> seenRegNosInFile = new HashMap<>();
        Map<String, Integer> seenEmailsInFile = new HashMap<>();

        for (int i = 0; i < mappedRows.size(); i++) {
            int rowNum = rowNumbers.get(i);
            Map<String, String> raw = mappedRows.get(i);
            Map<String, String> normalizedData = new LinkedHashMap<>(raw);

            String regNo = raw.getOrDefault("Register Number", "").trim();
            String studentName = raw.getOrDefault("Student Name", "").trim();
            String email = raw.getOrDefault("Email", "").trim();
            String departmentName = raw.getOrDefault("Department", "").trim();
            String academicYear = raw.getOrDefault("Academic Year", "").trim();
            String section = raw.getOrDefault("Section", "").trim();
            String semesterRaw = raw.getOrDefault("Semester", "").trim();

            List<String> errors = new ArrayList<>();
            boolean hasDuplicate = false;

            if (regNo.isEmpty()) {
                errors.add("Row " + rowNum + ": Missing Register Number.");
            } else {
                String regKey = regNo.toLowerCase(Locale.ROOT);
                if (snapshot.existingRegisterNumbers.contains(regKey)
                        || snapshot.existingUsernames.contains(regKey)) {
                    errors.add("Row " + rowNum + ": Duplicate Register Number (already exists in database).");
                    hasDuplicate = true;
                } else if (seenRegNosInFile.containsKey(regKey)) {
                    errors.add("Row " + rowNum + ": Duplicate Register Number in uploaded file (first seen at Row "
                            + seenRegNosInFile.get(regKey) + ").");
                    hasDuplicate = true;
                } else {
                    seenRegNosInFile.put(regKey, rowNum);
                }
            }

            if (studentName.isEmpty()) {
                errors.add("Row " + rowNum + ": Missing Student Name.");
            }

            if (email.isEmpty()) {
                errors.add("Row " + rowNum + ": Missing Email.");
            } else if (!EMAIL_PATTERN.matcher(email).matches()) {
                errors.add("Row " + rowNum + ": Invalid Email.");
            } else {
                String emailKey = email.toLowerCase(Locale.ROOT);
                if (snapshot.existingEmails.contains(emailKey)) {
                    errors.add("Row " + rowNum + ": Duplicate Email (account already exists in database).");
                    hasDuplicate = true;
                } else if (seenEmailsInFile.containsKey(emailKey)) {
                    errors.add("Row " + rowNum + ": Duplicate Email in uploaded file (first seen at Row "
                            + seenEmailsInFile.get(emailKey) + ").");
                    hasDuplicate = true;
                } else {
                    seenEmailsInFile.put(emailKey, rowNum);
                }
            }

            if (departmentName.isEmpty()) {
                errors.add("Row " + rowNum + ": Missing Department.");
            } else {
                Department resolvedDept = resolveDepartment(snapshot.departmentsByKey, departmentName);
                if (resolvedDept == null) {
                    errors.add("Row " + rowNum + ": Department not found.");
                } else {
                    normalizedData.put("Department", resolvedDept.getName());
                }
            }

            if (academicYear.isEmpty()) {
                errors.add("Row " + rowNum + ": Missing Academic Year.");
            }

            if (section.isEmpty()) {
                errors.add("Row " + rowNum + ": Missing Section.");
            }

            if (semesterRaw.isEmpty()) {
                errors.add("Row " + rowNum + ": Missing Semester.");
            } else {
                String normalizedSemester = normalizeSemester(semesterRaw);
                if (normalizedSemester == null) {
                    errors.add("Row " + rowNum + ": Invalid Semester (must be 1 to 8, e.g., 8 or Semester 8).");
                } else {
                    normalizedData.put("Semester", normalizedSemester);
                }
            }

            String status = errors.isEmpty() ? "VALID" : (hasDuplicate ? "DUPLICATE" : "INVALID");
            results.add(new ImportRowPreviewDto(rowNum, status, errors, normalizedData));
        }

        return results;
    }

    private List<ImportRowPreviewDto> evaluateFacultyRows(
            List<ParsedRow> parsedRows,
            Map<String, Integer> colIndexMap,
            ValidationSnapshot snapshot
    ) {
        List<Integer> rowNumbers = new ArrayList<>(parsedRows.size());
        List<Map<String, String>> mapped = new ArrayList<>(parsedRows.size());

        for (ParsedRow row : parsedRows) {
            rowNumbers.add(row.rowNumber());
            Map<String, String> data = new LinkedHashMap<>();
            for (String col : ExcelTemplateService.FACULTY_COLUMNS) {
                int idx = colIndexMap.get(col);
                String val = idx < row.cells().size() ? row.cells().get(idx) : "";
                data.put(col, val != null ? val.trim() : "");
            }
            mapped.add(data);
        }

        return evaluateMappedFacultyData(rowNumbers, mapped, snapshot);
    }

    private List<ImportRowPreviewDto> revalidateMappedFacultyRows(
            List<ImportRowPreviewDto> existingRows,
            ValidationSnapshot snapshot
    ) {
        List<Integer> rowNumbers = existingRows.stream().map(ImportRowPreviewDto::rowNumber).toList();
        List<Map<String, String>> mapped = existingRows.stream().map(ImportRowPreviewDto::data).toList();
        return evaluateMappedFacultyData(rowNumbers, mapped, snapshot);
    }

    private List<ImportRowPreviewDto> evaluateMappedFacultyData(
            List<Integer> rowNumbers,
            List<Map<String, String>> mappedRows,
            ValidationSnapshot snapshot
    ) {
        List<ImportRowPreviewDto> results = new ArrayList<>(mappedRows.size());
        Map<String, Integer> seenFacultyIdsInFile = new HashMap<>();
        Map<String, Integer> seenEmailsInFile = new HashMap<>();

        for (int i = 0; i < mappedRows.size(); i++) {
            int rowNum = rowNumbers.get(i);
            Map<String, String> raw = mappedRows.get(i);
            Map<String, String> normalizedData = new LinkedHashMap<>(raw);

            String facultyId = raw.getOrDefault("Faculty ID", "").trim();
            String facultyName = raw.getOrDefault("Faculty Name", "").trim();
            String email = raw.getOrDefault("Email", "").trim();
            String departmentName = raw.getOrDefault("Department", "").trim();
            String designation = raw.getOrDefault("Designation", "").trim();
            String specialization = raw.getOrDefault("Specialization", "").trim();

            List<String> errors = new ArrayList<>();
            boolean hasDuplicate = false;

            if (facultyId.isEmpty()) {
                errors.add("Row " + rowNum + ": Missing Faculty ID.");
            } else {
                String idKey = facultyId.toLowerCase(Locale.ROOT);
                if (snapshot.existingFacultyIds.contains(idKey)
                        || snapshot.existingUsernames.contains(idKey)) {
                    errors.add("Row " + rowNum + ": Duplicate Faculty ID (already exists in database).");
                    hasDuplicate = true;
                } else if (seenFacultyIdsInFile.containsKey(idKey)) {
                    errors.add("Row " + rowNum + ": Duplicate Faculty ID in uploaded file (first seen at Row "
                            + seenFacultyIdsInFile.get(idKey) + ").");
                    hasDuplicate = true;
                } else {
                    seenFacultyIdsInFile.put(idKey, rowNum);
                }
            }

            if (facultyName.isEmpty()) {
                errors.add("Row " + rowNum + ": Missing Faculty Name.");
            }

            if (email.isEmpty()) {
                errors.add("Row " + rowNum + ": Missing Email.");
            } else if (!EMAIL_PATTERN.matcher(email).matches()) {
                errors.add("Row " + rowNum + ": Invalid Email.");
            } else {
                String emailKey = email.toLowerCase(Locale.ROOT);
                if (snapshot.existingEmails.contains(emailKey)) {
                    errors.add("Row " + rowNum + ": Duplicate Email (account already exists in database).");
                    hasDuplicate = true;
                } else if (seenEmailsInFile.containsKey(emailKey)) {
                    errors.add("Row " + rowNum + ": Duplicate Email in uploaded file (first seen at Row "
                            + seenEmailsInFile.get(emailKey) + ").");
                    hasDuplicate = true;
                } else {
                    seenEmailsInFile.put(emailKey, rowNum);
                }
            }

            if (departmentName.isEmpty()) {
                errors.add("Row " + rowNum + ": Missing Department.");
            } else {
                Department resolvedDept = resolveDepartment(snapshot.departmentsByKey, departmentName);
                if (resolvedDept == null) {
                    errors.add("Row " + rowNum + ": Department not found.");
                } else {
                    normalizedData.put("Department", resolvedDept.getName());
                }
            }

            if (designation.isEmpty()) {
                errors.add("Row " + rowNum + ": Missing Designation.");
            }

            if (specialization.isEmpty()) {
                errors.add("Row " + rowNum + ": Missing Specialization.");
            }

            String status = errors.isEmpty() ? "VALID" : (hasDuplicate ? "DUPLICATE" : "INVALID");
            results.add(new ImportRowPreviewDto(rowNum, status, errors, normalizedData));
        }

        return results;
    }

    private ImportPreviewResponse stagePreviewResult(
            String importType,
            String fileName,
            String adminUsername,
            Integer adminMaxCapacity,
            List<ImportRowPreviewDto> rows
    ) {
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("No data rows were found below the header row in \"" + fileName + "\".");
        }

        Counts counts = countRowStatuses(rows);
        StagedImportBatch batch = batchCache.stage(importType, fileName, adminUsername, rows);

        return new ImportPreviewResponse(
                true,
                importType,
                batch.importToken(),
                fileName,
                counts.total,
                counts.valid,
                counts.failed,
                counts.duplicates,
                counts.invalid,
                adminMaxCapacity,
                rows
        );
    }

    private Map<String, Integer> resolveColumnIndexes(
            List<String> actualHeaders,
            List<String> expectedColumns,
            String categoryLabel
    ) {
        Map<String, Integer> normalizedActual = new HashMap<>();
        for (int i = 0; i < actualHeaders.size(); i++) {
            String key = normalizeHeaderName(actualHeaders.get(i));
            if ("password".equals(key)) {
                throw new IllegalArgumentException(
                        "Security Policy Error: Do not place passwords in Excel/CSV files. Imported accounts use a secure first-login setup invitation."
                );
            }
            if (!key.isEmpty() && !normalizedActual.containsKey(key)) {
                normalizedActual.put(key, i);
            }
        }

        Map<String, Integer> resolved = new LinkedHashMap<>();
        List<String> missing = new ArrayList<>();
        for (String expected : expectedColumns) {
            Integer idx = normalizedActual.get(normalizeHeaderName(expected));
            if (idx == null) {
                missing.add(expected);
            } else {
                resolved.put(expected, idx);
            }
        }

        if (!missing.isEmpty()) {
            throw new IllegalArgumentException(
                    categoryLabel + " template mismatch. Missing required column(s): "
                            + String.join(", ", missing)
                            + ". Please download the official " + categoryLabel + " Excel template."
            );
        }

        return resolved;
    }

    private static String normalizeHeaderName(String header) {
        if (header == null) {
            return "";
        }
        return header.trim()
                .replace("_", " ")
                .replace("-", " ")
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }

    private static String normalizeSemester(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        Matcher matcher = SEMESTER_PATTERN.matcher(raw.trim());
        if (!matcher.matches()) {
            return null;
        }
        try {
            int semNum = Integer.parseInt(matcher.group(1));
            if (semNum < 1 || semNum > 8) {
                return null;
            }
            return "Semester " + semNum;
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static Department resolveDepartment(Map<String, Department> departmentsByKey, String input) {
        if (input == null || input.isBlank()) {
            return null;
        }
        return departmentsByKey.get(input.trim().toLowerCase(Locale.ROOT));
    }

    private ValidationSnapshot loadDatabaseSnapshot() {
        Set<String> existingEmails = new HashSet<>();
        userAccountRepository.findAllEmails().forEach(e -> existingEmails.add(e.toLowerCase(Locale.ROOT)));
        studentRepository.findAllEmails().forEach(e -> existingEmails.add(e.toLowerCase(Locale.ROOT)));
        facultyRepository.findAllEmails().forEach(e -> existingEmails.add(e.toLowerCase(Locale.ROOT)));

        Set<String> existingUsernames = new HashSet<>();
        userAccountRepository.findAllUsernames().forEach(u -> existingUsernames.add(u.toLowerCase(Locale.ROOT)));

        Set<String> existingRegNos = new HashSet<>();
        studentRepository.findAllRegisterNumbers().forEach(r -> existingRegNos.add(r.toLowerCase(Locale.ROOT)));

        Set<String> existingFacultyIds = new HashSet<>();
        facultyRepository.findAllFacultyIds().forEach(f -> existingFacultyIds.add(f.toLowerCase(Locale.ROOT)));

        Map<String, Department> departmentsByKey = new HashMap<>();
        for (Department dept : departmentRepository.findAll()) {
            departmentsByKey.put(dept.getName().trim().toLowerCase(Locale.ROOT), dept);
            departmentsByKey.put(dept.getCode().trim().toLowerCase(Locale.ROOT), dept);
        }

        return new ValidationSnapshot(
                existingEmails,
                existingUsernames,
                existingRegNos,
                existingFacultyIds,
                departmentsByKey
        );
    }

    private static Counts countRowStatuses(List<ImportRowPreviewDto> rows) {
        int valid = 0;
        int duplicates = 0;
        int invalid = 0;
        for (ImportRowPreviewDto row : rows) {
            if ("VALID".equals(row.status())) {
                valid++;
            } else if ("DUPLICATE".equals(row.status())) {
                duplicates++;
            } else {
                invalid++;
            }
        }
        return new Counts(rows.size(), valid, duplicates, invalid, duplicates + invalid);
    }

    private record ValidationSnapshot(
            Set<String> existingEmails,
            Set<String> existingUsernames,
            Set<String> existingRegisterNumbers,
            Set<String> existingFacultyIds,
            Map<String, Department> departmentsByKey
    ) {}

    private record Counts(int total, int valid, int duplicates, int invalid, int failed) {}
}

