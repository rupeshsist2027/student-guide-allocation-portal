package com.university.sgap.controller;

import com.university.sgap.dto.BulkImportDtos.*;
import com.university.sgap.entity.AdminCapacitySettings;
import com.university.sgap.entity.Department;
import com.university.sgap.entity.ImportAuditLog;
import com.university.sgap.repository.AdminCapacitySettingsRepository;
import com.university.sgap.repository.DepartmentRepository;
import com.university.sgap.repository.ImportAuditLogRepository;
import com.university.sgap.service.BulkImportService;
import com.university.sgap.service.ExcelTemplateService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminBulkImportController {

    private static final MediaType XLSX_MEDIA_TYPE = MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    private final BulkImportService bulkImportService;
    private final ExcelTemplateService excelTemplateService;
    private final DepartmentRepository departmentRepository;
    private final AdminCapacitySettingsRepository capacityRepository;
    private final ImportAuditLogRepository auditLogRepository;

    public AdminBulkImportController(
            BulkImportService bulkImportService,
            ExcelTemplateService excelTemplateService,
            DepartmentRepository departmentRepository,
            AdminCapacitySettingsRepository capacityRepository,
            ImportAuditLogRepository auditLogRepository
    ) {
        this.bulkImportService = bulkImportService;
        this.excelTemplateService = excelTemplateService;
        this.departmentRepository = departmentRepository;
        this.capacityRepository = capacityRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @PostMapping(value = "/students/import/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportPreviewResponse> previewStudentImport(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                bulkImportService.previewStudents(file, authentication.getName())
        );
    }

    @PostMapping(value = "/students/import/confirm", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ImportConfirmResponse> confirmStudentImportByToken(
            @RequestBody ImportConfirmRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                bulkImportService.confirmStudentsFromToken(
                        request.importToken(),
                        request.strategy(),
                        authentication.getName()
                )
        );
    }

    @PostMapping(value = "/students/import/confirm", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportConfirmResponse> confirmStudentImportMultipart(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "strategy", defaultValue = "IMPORT_VALID_ONLY") ImportStrategy strategy,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                bulkImportService.confirmStudentsFromFile(file, strategy, authentication.getName())
        );
    }

    @PostMapping(value = "/faculty/import/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportPreviewResponse> previewFacultyImport(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                bulkImportService.previewFaculty(file, authentication.getName())
        );
    }

    @PostMapping(value = "/faculty/import/confirm", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ImportConfirmResponse> confirmFacultyImportByToken(
            @RequestBody ImportConfirmRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                bulkImportService.confirmFacultyFromToken(
                        request.importToken(),
                        request.strategy(),
                        authentication.getName()
                )
        );
    }

    @PostMapping(value = "/faculty/import/confirm", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportConfirmResponse> confirmFacultyImportMultipart(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "strategy", defaultValue = "IMPORT_VALID_ONLY") ImportStrategy strategy,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                bulkImportService.confirmFacultyFromFile(file, strategy, authentication.getName())
        );
    }

    @GetMapping("/students/import/template")
    public ResponseEntity<byte[]> downloadStudentTemplate() throws IOException {
        byte[] bytes = excelTemplateService.generateStudentTemplate(departmentRepository.findAll());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"student-bulk-import-template.xlsx\"")
                .contentType(XLSX_MEDIA_TYPE)
                .body(bytes);
    }

    @GetMapping("/faculty/import/template")
    public ResponseEntity<byte[]> downloadFacultyTemplate() throws IOException {
        Integer configuredCapacity = capacityRepository.findById(1L)
                .map(AdminCapacitySettings::getConfiguredTeamsPerGuide)
                .filter(val -> val > 0)
                .orElse(null);
        byte[] bytes = excelTemplateService.generateFacultyTemplate(
                departmentRepository.findAll(),
                configuredCapacity
        );
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"faculty-bulk-import-template.xlsx\"")
                .contentType(XLSX_MEDIA_TYPE)
                .body(bytes);
    }

    @PostMapping("/import/failed-report")
    public ResponseEntity<byte[]> downloadFailedReport(@RequestBody FailedReportRequest request) throws IOException {
        List<ImportRowPreviewDto> rows = request.failedRows() != null ? request.failedRows() : List.of();
        byte[] bytes = excelTemplateService.generateFailedRecordsWorkbook(request.importType(), rows);
        String safeType = "FACULTY".equalsIgnoreCase(request.importType()) ? "faculty" : "student";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + safeType + "-failed-records-report.xlsx\"")
                .contentType(XLSX_MEDIA_TYPE)
                .body(bytes);
    }

    @GetMapping("/departments")
    public ResponseEntity<List<Department>> listDepartments() {
        return ResponseEntity.ok(departmentRepository.findAll());
    }

    @GetMapping("/import/history")
    public ResponseEntity<List<ImportAuditLog>> getImportHistory() {
        return ResponseEntity.ok(auditLogRepository.findTop25ByOrderByCreatedAtDesc());
    }
}
