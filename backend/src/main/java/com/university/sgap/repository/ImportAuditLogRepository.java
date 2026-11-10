package com.university.sgap.repository;

import com.university.sgap.entity.ImportAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ImportAuditLogRepository extends JpaRepository<ImportAuditLog, Long> {
    List<ImportAuditLog> findTop25ByOrderByCreatedAtDesc();
}

