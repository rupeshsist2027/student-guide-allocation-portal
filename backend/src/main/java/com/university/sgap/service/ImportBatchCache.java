package com.university.sgap.service;

import com.university.sgap.dto.BulkImportDtos.ImportRowPreviewDto;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ImportBatchCache {

    public record StagedImportBatch(
            String importToken,
            String importType,
            String fileName,
            String createdBy,
            Instant expiresAt,
            List<ImportRowPreviewDto> rows
    ) {}

    private static final long TTL_SECONDS = 1800; // 30 minutes
    private final Map<String, StagedImportBatch> store = new ConcurrentHashMap<>();

    public StagedImportBatch stage(
            String importType,
            String fileName,
            String createdBy,
            List<ImportRowPreviewDto> rows
    ) {
        evictExpired();
        String token = UUID.randomUUID().toString();
        StagedImportBatch batch = new StagedImportBatch(
                token,
                importType,
                fileName,
                createdBy,
                Instant.now().plusSeconds(TTL_SECONDS),
                rows
        );
        store.put(token, batch);
        return batch;
    }

    public StagedImportBatch getAndValidate(String token, String expectedType) {
        evictExpired();
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Import preview token is missing. Please preview the file again.");
        }
        StagedImportBatch batch = store.get(token);
        if (batch == null) {
            throw new IllegalArgumentException("Import preview session expired or was already consumed. Please re-run preview.");
        }
        if (!expectedType.equalsIgnoreCase(batch.importType())) {
            throw new IllegalArgumentException("Import token belongs to " + batch.importType() + ", not " + expectedType + ".");
        }
        return batch;
    }

    public void remove(String token) {
        if (token != null) {
            store.remove(token);
        }
    }

    private void evictExpired() {
        Instant now = Instant.now();
        store.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }
}

