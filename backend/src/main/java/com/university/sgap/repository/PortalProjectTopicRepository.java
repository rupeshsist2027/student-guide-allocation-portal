package com.university.sgap.repository;

import com.university.sgap.entity.PortalProjectTopic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PortalProjectTopicRepository extends JpaRepository<PortalProjectTopic, String> {
    List<PortalProjectTopic> findByFacultyId(String facultyId);
}

