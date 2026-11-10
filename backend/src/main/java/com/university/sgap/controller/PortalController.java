package com.university.sgap.controller;

import com.university.sgap.dto.PortalDtos.*;
import com.university.sgap.entity.*;
import com.university.sgap.service.PortalService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class PortalController {

    private final PortalService portalService;

    public PortalController(PortalService portalService) {
        this.portalService = portalService;
    }

    @GetMapping("/portal/bootstrap")
    public ResponseEntity<PortalBootstrapResponse> getBootstrap(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw new AccessDeniedException("Authentication required.");
        }
        return ResponseEntity.ok(portalService.getBootstrap(authentication));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/statistics")
    public ResponseEntity<AdminStatisticsDto> getAdminStatistics() {
        return ResponseEntity.ok(portalService.getAdminStatistics());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/admin/statistics")
    public ResponseEntity<AdminStatisticsDto> updateAdminStatistics(
            @Valid @RequestBody AdminStatisticsUpdateRequest req
    ) {
        return ResponseEntity.ok(portalService.updateAdminStatistics(req));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/team-settings")
    public ResponseEntity<TeamGuideConfigDto> getTeamGuideConfig() {
        return ResponseEntity.ok(portalService.getTeamGuideConfig());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/admin/team-settings")
    public ResponseEntity<TeamGuideConfigDto> updateTeamGuideConfig(
            @Valid @RequestBody TeamGuideConfigUpdateRequest req
    ) {
        return ResponseEntity.ok(portalService.updateTeamGuideConfig(req));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/admin/teams/{teamId}")
    public ResponseEntity<Map<String, Object>> adminDeleteTeam(@PathVariable String teamId) {
        portalService.adminDeleteTeam(teamId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/admin/announcements")
    public ResponseEntity<Map<String, Object>> publishAnnouncement(@RequestBody AnnouncementRequest req) {
        portalService.publishAnnouncement(req);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/student/teams")
    public ResponseEntity<PortalTeam> createTeam(
            @RequestBody CreateTeamRequest req,
            Authentication authentication
    ) {
        enforceRoleIdentity(authentication, "ROLE_STUDENT", req != null ? req.registerNumber() : null);
        return ResponseEntity.ok(portalService.createTeam(req));
    }

    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/student/teams/members")
    public ResponseEntity<PortalTeamMember> addTeamMember(
            @RequestBody AddMemberRequest req,
            Authentication authentication
    ) {
        enforceRoleIdentity(authentication, "ROLE_STUDENT", req != null ? req.actingRegisterNumber() : null);
        return ResponseEntity.ok(portalService.addTeamMember(req));
    }

    @PreAuthorize("hasRole('STUDENT')")
    @DeleteMapping("/student/teams/members")
    public ResponseEntity<Map<String, Object>> removeTeamMember(
            @RequestBody RemoveMemberRequest req,
            Authentication authentication
    ) {
        enforceRoleIdentity(authentication, "ROLE_STUDENT", req != null ? req.actingRegisterNumber() : null);
        portalService.removeTeamMember(req);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PreAuthorize("hasRole('STUDENT')")
    @DeleteMapping("/student/teams/{teamId}")
    public ResponseEntity<Map<String, Object>> deleteTeam(
            @PathVariable String teamId,
            @RequestParam("registerNumber") String registerNumber,
            Authentication authentication
    ) {
        enforceRoleIdentity(authentication, "ROLE_STUDENT", registerNumber);
        portalService.deleteTeam(teamId, registerNumber);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/student/select-guide")
    public ResponseEntity<PortalGuideAllocation> selectGuide(
            @RequestBody SelectGuideRequest req,
            Authentication authentication
    ) {
        enforceRoleIdentity(authentication, "ROLE_STUDENT", req != null ? req.actingRegisterNumber() : null);
        return ResponseEntity.ok(portalService.selectGuideFCFS(req));
    }

    @PreAuthorize("hasRole('STUDENT')")
    @PutMapping("/student/project-title")
    public ResponseEntity<Map<String, Object>> updateProjectTitle(
            @RequestBody UpdateProjectTitleRequest req,
            Authentication authentication
    ) {
        enforceRoleIdentity(authentication, "ROLE_STUDENT", req != null ? req.actingRegisterNumber() : null);
        portalService.updateProjectTitle(req);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PreAuthorize("hasRole('STUDENT')")
    @PostMapping("/student/progress-note")
    public ResponseEntity<Map<String, Object>> submitProgressNote(
            @RequestBody ProgressNoteRequest req,
            Authentication authentication
    ) {
        enforceRoleIdentity(authentication, "ROLE_STUDENT", null);
        portalService.submitProgressNote(req, authentication.getName());
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PreAuthorize("hasRole('FACULTY')")
    @PostMapping("/faculty/topics")
    public ResponseEntity<PortalProjectTopic> addTopic(
            @RequestBody TopicUpsertRequest req,
            Authentication authentication
    ) {
        enforceRoleIdentity(authentication, "ROLE_FACULTY", req != null ? req.facultyId() : null);
        return ResponseEntity.ok(portalService.addTopic(req));
    }

    @PreAuthorize("hasRole('FACULTY')")
    @PutMapping("/faculty/topics/{topicId}")
    public ResponseEntity<PortalProjectTopic> updateTopic(
            @PathVariable String topicId,
            @RequestBody TopicUpsertRequest req,
            Authentication authentication
    ) {
        enforceRoleIdentity(authentication, "ROLE_FACULTY", req != null ? req.facultyId() : null);
        return ResponseEntity.ok(portalService.updateTopic(topicId, req));
    }

    @PreAuthorize("hasRole('FACULTY')")
    @DeleteMapping("/faculty/topics/{topicId}")
    public ResponseEntity<Map<String, Object>> deleteTopic(
            @PathVariable String topicId,
            @RequestParam("facultyId") String facultyId,
            Authentication authentication
    ) {
        enforceRoleIdentity(authentication, "ROLE_FACULTY", facultyId);
        portalService.deleteTopic(topicId, facultyId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PreAuthorize("hasRole('FACULTY')")
    @PutMapping("/faculty/progress")
    public ResponseEntity<Map<String, Object>> updateProgress(
            @RequestBody FacultyProgressUpdateRequest req,
            Authentication authentication
    ) {
        enforceRoleIdentity(authentication, "ROLE_FACULTY", req != null ? req.facultyId() : null);
        portalService.updateProgress(req);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private void enforceRoleIdentity(
            Authentication authentication,
            String requiredAuthority,
            String claimedId
    ) {
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw new AccessDeniedException("Authentication required for this operation.");
        }
        boolean hasRole = authentication.getAuthorities().stream()
                .anyMatch(a -> requiredAuthority.equals(a.getAuthority()));
        if (!hasRole) {
            throw new AccessDeniedException("Role mismatch for requested operation.");
        }
        if (claimedId != null) {
            if (claimedId.trim().isEmpty()
                    || !authentication.getName().equalsIgnoreCase(claimedId.trim())) {
                throw new AccessDeniedException("Authenticated user identity does not match request identity.");
            }
        }
    }
}
