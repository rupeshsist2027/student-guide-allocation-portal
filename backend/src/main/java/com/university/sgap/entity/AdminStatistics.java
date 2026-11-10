package com.university.sgap.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "admin_statistics")
public class AdminStatistics {

    @Id
    private Long id = 1L;

    @Column(name = "total_students", nullable = false)
    private int totalStudents;

    @Column(name = "total_faculty", nullable = false)
    private int totalFaculty;

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

    public int getTotalFaculty() {
        return totalFaculty;
    }

    public void setTotalFaculty(int totalFaculty) {
        this.totalFaculty = totalFaculty;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

