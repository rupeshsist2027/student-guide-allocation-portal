package com.university.sgap.dto;

import java.util.List;
import java.util.Map;

public class BulkImportDtos {

    public enum ImportStrategy {
        IMPORT_VALID_ONLY,
        FAIL_ON_ANY_ERROR
    }

    public record ImportRowPreviewDto(
            int rowNumber,
            String status,
            List<String> errors,
            Map<String, String> data
    ) {}

    public record ImportPreviewResponse(
            boolean ok,
            String importType,
            String importToken,
            String fileName,
            int totalRecords,
            int validRecords,
            int failedRecords,
            int duplicateRecords,
            int invalidRecords,
            Integer adminConfiguredMaxCapacity,
            List<ImportRowPreviewDto> rows
    ) {}

    public record ImportConfirmRequest(
            String importToken,
            ImportStrategy strategy
    ) {}

    public record InvitedAccountSummaryDto(
            String identifier,
            String fullName,
            String email,
            String department,
            String role,
            String accountStatus
    ) {}

    public record ImportConfirmResponse(
            boolean ok,
            String message,
            String importType,
            ImportStrategy strategy,
            String fileName,
            int totalRecords,
            int successfullyImported,
            int failedRecords,
            int duplicateRecords,
            int invalidRecords,
            List<ImportRowPreviewDto> failedRows,
            List<InvitedAccountSummaryDto> importedInvitations
    ) {}

    public record FailedReportRequest(
            String importType,
            List<ImportRowPreviewDto> failedRows
    ) {}
}

