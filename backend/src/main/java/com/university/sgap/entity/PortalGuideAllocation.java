package com.university.sgap.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "portal_guide_allocations")
public class PortalGuideAllocation {

    @Id
    @Column(name = "allocation_id", length = 40)
    private String allocationId;

    @Column(name = "allocation_order", nullable = false)
    private int allocationOrder;

    @Column(name = "team_id", nullable = false, unique = true, length = 40)
    private String teamId;

    @Column(name = "faculty_id", nullable = false, length = 50)
    private String facultyId;

    @Column(name = "allocated_at", nullable = false, length = 50)
    private String allocatedAt;

    @Column(name = "allocation_date", nullable = false, length = 40)
    private String allocationDate;

    @Column(nullable = false, length = 40)
    private String status;

    public String getAllocationId() {
        return allocationId;
    }

    public void setAllocationId(String allocationId) {
        this.allocationId = allocationId;
    }

    public int getAllocationOrder() {
        return allocationOrder;
    }

    public void setAllocationOrder(int allocationOrder) {
        this.allocationOrder = allocationOrder;
    }

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

    public String getAllocatedAt() {
        return allocatedAt;
    }

    public void setAllocatedAt(String allocatedAt) {
        this.allocatedAt = allocatedAt;
    }

    public String getAllocationDate() {
        return allocationDate;
    }

    public void setAllocationDate(String allocationDate) {
        this.allocationDate = allocationDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}

