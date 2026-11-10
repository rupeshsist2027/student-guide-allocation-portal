package com.university.sgap.repository;

import com.university.sgap.entity.PortalGuideAllocation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PortalGuideAllocationRepository extends JpaRepository<PortalGuideAllocation, String> {
    Optional<PortalGuideAllocation> findByTeamId(String teamId);
    long countByFacultyIdAndStatus(String facultyId, String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM PortalGuideAllocation a WHERE a.facultyId = :facultyId AND a.status = :status")
    List<PortalGuideAllocation> findByFacultyIdAndStatusForUpdate(
            @Param("facultyId") String facultyId,
            @Param("status") String status
    );

    @Query("SELECT COALESCE(MAX(a.allocationOrder), 0) FROM PortalGuideAllocation a")
    int findMaxAllocationOrder();

    void deleteByTeamId(String teamId);
}
