package com.university.sgap.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "portal_project_progress")
public class PortalProjectProgress {

    @Id
    @Column(name = "team_id", length = 40)
    private String teamId;

    @Column(name = "faculty_id", nullable = false, length = 50)
    private String facultyId;

    @Column(nullable = false, length = 80)
    private String stage;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "updated_at", nullable = false, length = 50)
    private String updatedAt;

    @Column(name = "updated_date", nullable = false, length = 40)
    private String updatedDate;

    public String getTeamId() {
        return teamId;
    }

    public void setTeamId(String teamId) {
        this.teamId = teamId;
    }

    public String getFacultyId() {
        return facultyId;
    }

    public void setFacultyId(String facultyId) {
        this.facultyId = facultyId;
    }

    public String getStage() {
        return stage;
    }

    public void setStage(String stage) {
        this.stage = stage;
    }

    public String getFeedback() {
        return feedback;
    }

    public void setFeedback(String feedback) {
        this.feedback = feedback;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getUpdatedDate() {
        return updatedDate;
    }

    public void setUpdatedDate(String updatedDate) {
        this.updatedDate = updatedDate;
    }
}

