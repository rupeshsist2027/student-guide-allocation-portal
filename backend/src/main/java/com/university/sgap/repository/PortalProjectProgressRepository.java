package com.university.sgap.repository;

import com.university.sgap.entity.PortalProjectProgress;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PortalProjectProgressRepository extends JpaRepository<PortalProjectProgress, String> {
    void deleteByTeamId(String teamId);
}
