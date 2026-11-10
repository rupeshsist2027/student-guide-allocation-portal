package com.university.sgap.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "portal_project_topics")
public class PortalProjectTopic {

    @Id
    @Column(name = "topic_id", length = 40)
    private String topicId;

    @Column(name = "faculty_id", nullable = false, length = 50)
    private String facultyId;

    @Column(name = "project_title", nullable = false, length = 255)
    private String projectTitle;

    @Column(name = "project_domain", nullable = false, length = 150)
    private String projectDomain;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "technologies_used", nullable = false, length = 255)
    private String technologiesUsed;

    public String getTopicId() {
        return topicId;
    }

    public void setTopicId(String topicId) {
        this.topicId = topicId;
    }

    public String getFacultyId() {
        return facultyId;
    }

    public void setFacultyId(String facultyId) {
        this.facultyId = facultyId;
    }

    public String getProjectTitle() {
        return projectTitle;
    }

    public void setProjectTitle(String projectTitle) {
        this.projectTitle = projectTitle;
    }

    public String getProjectDomain() {
        return projectDomain;
    }

    public void setProjectDomain(String projectDomain) {
        this.projectDomain = projectDomain;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getTechnologiesUsed() {
        return technologiesUsed;
    }

    public void setTechnologiesUsed(String technologiesUsed) {
        this.technologiesUsed = technologiesUsed;
    }
}

