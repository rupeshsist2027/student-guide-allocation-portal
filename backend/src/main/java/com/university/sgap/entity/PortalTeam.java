package com.university.sgap.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "portal_teams")
public class PortalTeam {

    @Id
    @Column(name = "team_id", length = 40)
    private String teamId;

    @Column(name = "team_number")
    private Integer teamNumber;

    @Column(name = "team_name", nullable = false, length = 150)
    private String teamName;

    @Column(nullable = false, length = 150)
    private String department;

    @Column(name = "lead_register_number", nullable = false, length = 50)
    private String leadRegisterNumber;

    @Column(name = "project_title", nullable = false, length = 255)
    private String projectTitle;

    @Column(name = "created_at", nullable = false, length = 50)
    private String createdAt;

    public String getTeamId() {
        return teamId;
    }

    public void setTeamId(String teamId) {
        this.teamId = teamId;
    }

    public Integer getTeamNumber() {
        return teamNumber;
    }

    public void setTeamNumber(Integer teamNumber) {
        this.teamNumber = teamNumber;
    }

    public String getTeamName() {
        return teamName;
    }

    public void setTeamName(String teamName) {
        this.teamName = teamName;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getLeadRegisterNumber() {
        return leadRegisterNumber;
    }

    public void setLeadRegisterNumber(String leadRegisterNumber) {
        this.leadRegisterNumber = leadRegisterNumber;
    }

    public String getProjectTitle() {
        return projectTitle;
    }

    public void setProjectTitle(String projectTitle) {
        this.projectTitle = projectTitle;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }
}

