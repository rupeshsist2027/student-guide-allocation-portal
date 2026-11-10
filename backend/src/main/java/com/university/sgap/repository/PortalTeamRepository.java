package com.university.sgap.repository;

import com.university.sgap.entity.PortalTeam;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PortalTeamRepository extends JpaRepository<PortalTeam, String> {
    @Query("SELECT COALESCE(MAX(t.teamNumber), 0) FROM PortalTeam t")
    int findMaxTeamNumber();

    Optional<PortalTeam> findByTeamId(String teamId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM PortalTeam t WHERE t.teamId = :teamId")
    Optional<PortalTeam> findByTeamIdForUpdate(@Param("teamId") String teamId);
}
