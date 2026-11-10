package com.university.sgap.dto;

import com.university.sgap.entity.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public class PortalDtos {

    public record AdminStatisticsDto(
            int totalStudents,
            int totalFaculty,
            String updatedAt
    ) {}

    public record AdminStatisticsUpdateRequest(
            @NotNull(message = "Total Students count is required.")
            @Min(value = 0, message = "Total Students count cannot be negative.")
            Integer totalStudents,
            @NotNull(message = "Total Faculty count is required.")
            @Min(value = 0, message = "Total Faculty count cannot be negative.")
            Integer totalFaculty
    ) {}

    public record TeamGuideConfigDto(
            boolean configured,
            Integer studentsPerTeam,
            Integer maxTeamsPerFaculty,
            String updatedAt,
            int totalStudents,
            int totalGuides,
            String maxTeamsMode,
            Integer customMaxTeamsPerGuide,
            Integer totalTeamsRequired,
            Integer recommendedTeamsPerGuide,
            Integer totalGuideCapacity,
            Integer remainingTeamSlots,
            Boolean capacitySufficient
    ) {}

    public record TeamGuideConfigUpdateRequest(
            @NotNull(message = "Students per team is required.")
            @Min(value = 1, message = "Students per team must be at least 1.")
            Integer studentsPerTeam,
            @Min(value = 1, message = "Maximum teams per faculty must be at least 1.")
            Integer maxTeamsPerFaculty,
            String maxTeamsMode,
            Integer customMaxTeamsPerGuide
    ) {}

    public record StudentViewDto(
            Long id,
            String name,
            String registerNumber,
            String department,
            String academicYear,
            String section,
            String semester,
            String batch,
            String email,
            String accountStatus
    ) {}

    public record FacultyViewDto(
            String facultyId,
            String facultyName,
            String department,
            String designation,
            String specialization,
            String email,
            String office,
            String accountStatus
    ) {}

    public record PortalBootstrapResponse(
            List<Department> departments,
            List<StudentViewDto> students,
            List<FacultyViewDto> facultyList,
            AdminStatisticsDto adminStatistics,
            TeamGuideConfigDto teamConfig,
            List<PortalTeam> teams,
            List<PortalTeamMember> teamMembers,
            List<PortalGuideAllocation> guideAllocations,
            List<PortalProjectTopic> projectTopics,
            List<PortalProjectProgress> projectProgress,
            List<PortalNotification> notifications
    ) {}

    public record CreateTeamRequest(String registerNumber) {}
    public record AddMemberRequest(String teamId, String actingRegisterNumber, String targetRegisterNumber) {}
    public record RemoveMemberRequest(String teamId, String actingRegisterNumber, String targetRegisterNumber) {}
    public record SelectGuideRequest(String teamId, String actingRegisterNumber, String facultyId) {}
    public record UpdateProjectTitleRequest(String teamId, String actingRegisterNumber, String projectTitle) {}
    public record ProgressNoteRequest(String teamId, String studentName, String note) {}
    public record TopicUpsertRequest(String facultyId, String projectTitle, String projectDomain, String description, String technologiesUsed) {}
    public record FacultyProgressUpdateRequest(String teamId, String facultyId, String stage, String projectTitle, String feedback) {}
    public record AnnouncementRequest(String title, String message) {}
}
