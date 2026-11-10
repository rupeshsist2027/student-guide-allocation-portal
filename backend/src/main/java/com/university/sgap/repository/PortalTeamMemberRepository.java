package com.university.sgap.repository;

import com.university.sgap.entity.PortalTeamMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PortalTeamMemberRepository extends JpaRepository<PortalTeamMember, String> {
    Optional<PortalTeamMember> findByRegisterNumber(String registerNumber);
    List<PortalTeamMember> findByTeamId(String teamId);
    long deleteByTeamIdAndRegisterNumber(String teamId, String registerNumber);
    void deleteByTeamId(String teamId);
}
