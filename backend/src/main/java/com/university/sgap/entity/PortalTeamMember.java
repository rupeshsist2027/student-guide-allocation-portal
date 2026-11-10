package com.university.sgap.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "portal_team_members")
public class PortalTeamMember {

    @Id
    @Column(length = 60)
    private String id;

    @Column(name = "team_id", nullable = false, length = 40)
    private String teamId;

    @Column(name = "register_number", nullable = false, unique = true, length = 50)
    private String registerNumber;

    @Column(name = "member_name", nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 150)
    private String department;

    @Column(nullable = false, length = 40)
    private String role;

    @Column(name = "joined_at", nullable = false, length = 50)
    private String joinedAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTeamId() {
        return teamId;
    }

    public void setTeamId(String teamId) {
        this.teamId = teamId;
    }

    public String getRegisterNumber() {
        return registerNumber;
    }

    public void setRegisterNumber(String registerNumber) {
        this.registerNumber = registerNumber;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(String joinedAt) {
        this.joinedAt = joinedAt;
    }
}

