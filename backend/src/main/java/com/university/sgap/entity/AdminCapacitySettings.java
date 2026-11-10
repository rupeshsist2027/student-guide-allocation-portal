package com.university.sgap.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "admin_capacity_settings")
public class AdminCapacitySettings {

    @Id
    private Long id = 1L;

    @Column(name = "total_students", nullable = false)
    private int totalStudents;

    @Column(name = "total_guides", nullable = false)
    private int totalGuides;

    @Column(name = "students_per_team", nullable = false)
    private int studentsPerTeam;

    @Column(name = "max_teams_mode", nullable = false, length = 20)
    private String maxTeamsMode;

    @Column(name = "custom_max_teams_per_guide", nullable = false)
    private int customMaxTeamsPerGuide;

    @Column(name = "configured_teams_per_guide", nullable = false)
    private int configuredTeamsPerGuide;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void touchUpdatedAt() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public int getTotalStudents() {
        return totalStudents;
    }

    public void setTotalStudents(int totalStudents) {
        this.totalStudents = totalStudents;
    }

    public int getTotalGuides() {
        return totalGuides;
    }

    public void setTotalGuides(int totalGuides) {
        this.totalGuides = totalGuides;
    }

    public int getStudentsPerTeam() {
        return studentsPerTeam;
    }

    public void setStudentsPerTeam(int studentsPerTeam) {
        this.studentsPerTeam = studentsPerTeam;
    }

    public String getMaxTeamsMode() {
        return maxTeamsMode;
    }

    public void setMaxTeamsMode(String maxTeamsMode) {
        this.maxTeamsMode = maxTeamsMode;
    }

    public int getCustomMaxTeamsPerGuide() {
        return customMaxTeamsPerGuide;
    }

    public void setCustomMaxTeamsPerGuide(int customMaxTeamsPerGuide) {
        this.customMaxTeamsPerGuide = customMaxTeamsPerGuide;
    }

    public int getConfiguredTeamsPerGuide() {
        return configuredTeamsPerGuide;
    }

    public void setConfiguredTeamsPerGuide(int configuredTeamsPerGuide) {
        this.configuredTeamsPerGuide = configuredTeamsPerGuide;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

