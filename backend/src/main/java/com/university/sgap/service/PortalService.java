package com.university.sgap.service;

import com.university.sgap.dto.PortalDtos.*;
import com.university.sgap.entity.*;
import com.university.sgap.repository.*;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class PortalService {

    private static final String SEQ_TEAM_NUMBER = "TEAM_NUMBER";
    private static final String SEQ_ALLOCATION_ORDER = "ALLOCATION_ORDER";

    private static final DateTimeFormatter DISPLAY_DATE_FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH);

    private static final List<String> VALID_STAGES = List.of(
            "Team Allocated",
            "Topic Finalized",
            "Requirements Analysis",
            "Design",
            "Development",
            "Testing",
            "Final Submission"
    );

    private final DepartmentRepository departmentRepository;
    private final StudentRepository studentRepository;
    private final FacultyRepository facultyRepository;
    private final AdminStatisticsRepository statisticsRepository;
    private final AdminCapacitySettingsRepository capacityRepository;
    private final PortalSequenceRepository sequenceRepository;
    private final PortalTeamRepository teamRepository;
    private final PortalTeamMemberRepository teamMemberRepository;
    private final PortalGuideAllocationRepository allocationRepository;
    private final PortalProjectTopicRepository topicRepository;
    private final PortalProjectProgressRepository progressRepository;
    private final PortalNotificationRepository notificationRepository;

    public PortalService(
            DepartmentRepository departmentRepository,
            StudentRepository studentRepository,
            FacultyRepository facultyRepository,
            AdminStatisticsRepository statisticsRepository,
            AdminCapacitySettingsRepository capacityRepository,
            PortalSequenceRepository sequenceRepository,
            PortalTeamRepository teamRepository,
            PortalTeamMemberRepository teamMemberRepository,
            PortalGuideAllocationRepository allocationRepository,
            PortalProjectTopicRepository topicRepository,
            PortalProjectProgressRepository progressRepository,
            PortalNotificationRepository notificationRepository
    ) {
        this.departmentRepository = departmentRepository;
        this.studentRepository = studentRepository;
        this.facultyRepository = facultyRepository;
        this.statisticsRepository = statisticsRepository;
        this.capacityRepository = capacityRepository;
        this.sequenceRepository = sequenceRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.allocationRepository = allocationRepository;
        this.topicRepository = topicRepository;
        this.progressRepository = progressRepository;
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public PortalBootstrapResponse getBootstrap(Authentication authentication) {
        String principalUsername = authentication != null ? authentication.getName() : "";
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        boolean isFaculty = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_FACULTY".equals(a.getAuthority()));

        List<StudentViewDto> students = studentRepository.findAllByOrderByIdAsc().stream()
                .map(s -> {
                    boolean canViewPrivateStudentFields =
                            isAdmin || s.getRegisterNumber().equalsIgnoreCase(principalUsername);
                    return new StudentViewDto(
                            s.getId(),
                            s.getStudentName(),
                            s.getRegisterNumber(),
                            s.getDepartment().getName(),
                            s.getAcademicYear(),
                            s.getSection(),
                            s.getSemester(),
                            s.getBatch() != null ? s.getBatch() : s.getAcademicYear(),
                            canViewPrivateStudentFields ? s.getEmail() : null,
                            canViewPrivateStudentFields ? s.getUser().getAccountStatus().name() : null
                    );
                })
                .toList();

        String allocatedFacultyIdForStudent = null;
        if (!isAdmin && !isFaculty && !isBlank(principalUsername)) {
            allocatedFacultyIdForStudent = teamMemberRepository.findByRegisterNumber(principalUsername)
                    .flatMap(member -> allocationRepository.findByTeamId(member.getTeamId()))
                    .map(PortalGuideAllocation::getFacultyId)
                    .orElse(null);
        }
        final String visibleAllocatedFacultyId = allocatedFacultyIdForStudent;

        List<FacultyViewDto> facultyList = facultyRepository.findAllByOrderByIdAsc().stream()
                .map(f -> {
                    boolean canViewPrivateFacultyFields =
                            isAdmin || f.getFacultyId().equalsIgnoreCase(principalUsername);
                    boolean canViewFacultyEmail = canViewPrivateFacultyFields
                            || (visibleAllocatedFacultyId != null
                            && f.getFacultyId().equalsIgnoreCase(visibleAllocatedFacultyId));
                    return new FacultyViewDto(
                            f.getFacultyId(),
                            f.getFacultyName(),
                            f.getDepartment().getName(),
                            f.getDesignation(),
                            f.getSpecialization(),
                            canViewFacultyEmail ? f.getEmail() : null,
                            f.getOffice() != null ? f.getOffice() : f.getDepartment().getCode() + " Wing",
                            canViewPrivateFacultyFields ? f.getUser().getAccountStatus().name() : null
                    );
                })
                .toList();

        AdminStatisticsDto statsDto = getAdminStatistics();
        TeamGuideConfigDto teamConfigDto = getTeamGuideConfig();

        List<PortalNotification> visibleNotifications;
        if (isAdmin) {
            visibleNotifications = notificationRepository.findAllByOrderByCreatedAtDesc();
        } else if (isFaculty) {
            visibleNotifications = notificationRepository.findAllByOrderByCreatedAtDesc().stream()
                    .filter(n -> "all_faculty".equalsIgnoreCase(n.getAudience())
                            || (n.getFacultyId() != null && n.getFacultyId().equalsIgnoreCase(principalUsername)))
                    .toList();
        } else {
            visibleNotifications = List.of();
        }

        return new PortalBootstrapResponse(
                departmentRepository.findAll(),
                students,
                facultyList,
                statsDto,
                teamConfigDto,
                teamRepository.findAll(),
                teamMemberRepository.findAll(),
                allocationRepository.findAll(),
                topicRepository.findAll(),
                progressRepository.findAll(),
                visibleNotifications
        );
    }

    public AdminStatisticsDto getAdminStatistics() {
        AdminStatistics stats = statisticsRepository.findById(1L).orElseGet(() -> {
            AdminStatistics empty = new AdminStatistics();
            empty.setId(1L);
            empty.setTotalStudents(0);
            empty.setTotalFaculty(0);
            return empty;
        });
        return toStatisticsDto(stats);
    }

    @Transactional
    public AdminStatisticsDto updateAdminStatistics(AdminStatisticsUpdateRequest req) {
        if (req == null || req.totalStudents() == null || req.totalFaculty() == null) {
            throw new IllegalArgumentException("Both Total Students and Total Faculty counts are required.");
        }
        if (req.totalStudents() < 0 || req.totalFaculty() < 0) {
            throw new IllegalArgumentException("Counts cannot be negative.");
        }

        AdminStatistics stats = statisticsRepository.findById(1L).orElseGet(AdminStatistics::new);
        stats.setId(1L);
        stats.setTotalStudents(req.totalStudents());
        stats.setTotalFaculty(req.totalFaculty());
        stats.setUpdatedAt(LocalDateTime.now());
        AdminStatistics saved = statisticsRepository.saveAndFlush(stats);
        return toStatisticsDto(saved);
    }

    private AdminStatisticsDto toStatisticsDto(AdminStatistics stats) {
        return new AdminStatisticsDto(
                stats.getTotalStudents(),
                stats.getTotalFaculty(),
                stats.getUpdatedAt() != null ? stats.getUpdatedAt().toString() : null
        );
    }

    public TeamGuideConfigDto getTeamGuideConfig() {
        int actualStudents = (int) studentRepository.count();
        int actualGuides = (int) facultyRepository.count();

        return capacityRepository.findById(1L)
                .filter(s -> s.getStudentsPerTeam() > 0 && s.getConfiguredTeamsPerGuide() > 0)
                .map(s -> toTeamGuideConfigDto(s, actualStudents, actualGuides))
                .orElse(new TeamGuideConfigDto(
                        false,
                        null,
                        null,
                        null,
                        actualStudents,
                        actualGuides,
                        "auto",
                        null,
                        0,
                        null,
                        0,
                        0,
                        null
                ));
    }

    @Transactional
    public TeamGuideConfigDto updateTeamGuideConfig(TeamGuideConfigUpdateRequest req) {
        if (req == null || req.studentsPerTeam() == null) {
            throw new IllegalArgumentException("Students per team is required.");
        }
        if (req.studentsPerTeam() < 1) {
            throw new IllegalArgumentException("Students per team must be at least 1.");
        }

        int actualStudents = (int) studentRepository.count();
        int actualGuides = (int) facultyRepository.count();

        String normalizedMode = normalizeMaxTeamsMode(req.maxTeamsMode());
        int totalTeamsRequired = actualStudents > 0
                ? (int) Math.ceil((double) actualStudents / req.studentsPerTeam())
                : 0;

        int configuredLimit;
        int customLimit;

        if ("auto".equals(normalizedMode)) {
            if (actualStudents <= 0) {
                throw new IllegalArgumentException(
                        "Total Students must be greater than zero before saving Automatic Calculation. Import student records via Bulk Data Import first."
                );
            }
            if (actualGuides <= 0) {
                throw new IllegalArgumentException(
                        "Total Guides must be greater than zero before saving Automatic Calculation. Import faculty records via Bulk Data Import first."
                );
            }
            configuredLimit = (int) Math.ceil((double) totalTeamsRequired / actualGuides);
            customLimit = configuredLimit;
        } else {
            Integer requestedLimit = "custom".equals(normalizedMode)
                    ? (req.customMaxTeamsPerGuide() != null ? req.customMaxTeamsPerGuide() : req.maxTeamsPerFaculty())
                    : req.maxTeamsPerFaculty();
            if (requestedLimit == null || requestedLimit < 1) {
                throw new IllegalArgumentException("Maximum teams per guide must be a positive whole number.");
            }
            configuredLimit = requestedLimit;
            customLimit = "custom".equals(normalizedMode) || "manual".equals(normalizedMode)
                    ? requestedLimit
                    : (req.customMaxTeamsPerGuide() != null && req.customMaxTeamsPerGuide() > 0
                            ? req.customMaxTeamsPerGuide()
                            : requestedLimit);
        }

        AdminCapacitySettings settings = capacityRepository.findById(1L)
                .orElseGet(AdminCapacitySettings::new);
        settings.setId(1L);
        settings.setTotalStudents(actualStudents);
        settings.setTotalGuides(actualGuides);
        settings.setStudentsPerTeam(req.studentsPerTeam());
        settings.setMaxTeamsMode(normalizedMode);
        settings.setCustomMaxTeamsPerGuide(customLimit);
        settings.setConfiguredTeamsPerGuide(configuredLimit);
        settings.setUpdatedAt(LocalDateTime.now());
        AdminCapacitySettings saved = capacityRepository.saveAndFlush(settings);
        return toTeamGuideConfigDto(saved, actualStudents, actualGuides);
    }

    private String normalizeMaxTeamsMode(String rawMode) {
        if (isBlank(rawMode)) {
            return "manual";
        }
        String trimmed = rawMode.trim().toLowerCase(Locale.ROOT);
        if ("auto".equals(trimmed)
                || "5".equals(trimmed)
                || "8".equals(trimmed)
                || "10".equals(trimmed)
                || "12".equals(trimmed)
                || "custom".equals(trimmed)
                || "manual".equals(trimmed)) {
            return trimmed;
        }
        return "custom";
    }

    private TeamGuideConfigDto toTeamGuideConfigDto(
            AdminCapacitySettings settings,
            int actualStudents,
            int actualGuides
    ) {
        int studentsPerTeam = settings.getStudentsPerTeam();
        int configuredTeamsPerGuide = settings.getConfiguredTeamsPerGuide();

        int totalTeamsRequired = (actualStudents > 0 && studentsPerTeam > 0)
                ? (int) Math.ceil((double) actualStudents / studentsPerTeam)
                : 0;
        Integer recommendedTeamsPerGuide = (totalTeamsRequired > 0 && actualGuides > 0)
                ? (int) Math.ceil((double) totalTeamsRequired / actualGuides)
                : null;
        int totalGuideCapacity = (actualGuides > 0 && configuredTeamsPerGuide > 0)
                ? actualGuides * configuredTeamsPerGuide
                : 0;
        int remainingTeamSlots = totalGuideCapacity - totalTeamsRequired;
        Boolean capacitySufficient = (actualStudents > 0 && actualGuides > 0)
                ? totalGuideCapacity >= totalTeamsRequired
                : null;

        return new TeamGuideConfigDto(
                true,
                studentsPerTeam,
                configuredTeamsPerGuide,
                settings.getUpdatedAt() != null ? settings.getUpdatedAt().toString() : null,
                actualStudents,
                actualGuides,
                settings.getMaxTeamsMode(),
                settings.getCustomMaxTeamsPerGuide() > 0 ? settings.getCustomMaxTeamsPerGuide() : null,
                totalTeamsRequired,
                recommendedTeamsPerGuide,
                totalGuideCapacity,
                remainingTeamSlots,
                capacitySufficient
        );
    }

    private AdminCapacitySettings requireAdminConfig() {
        return capacityRepository.findById(1L)
                .filter(s -> s.getStudentsPerTeam() > 0 && s.getConfiguredTeamsPerGuide() > 0)
                .orElseThrow(() -> new IllegalStateException(
                        "Admin Configuration Required: Please configure Students Per Team and Maximum Teams Per Guide in Team & Guide Capacity Settings before creating teams or selecting guides."
                ));
    }

    private int nextSequenceValue(String seqName, int minFloor) {
        sequenceRepository.ensureRowExists(seqName, minFloor);
        PortalSequence seq = sequenceRepository.findBySeqNameForUpdate(seqName)
                .orElseThrow(() -> new IllegalStateException("Sequence initialization failed for " + seqName));
        int nextValue = Math.max(seq.getNextVal(), minFloor);
        seq.setNextVal(nextValue + 1);
        sequenceRepository.saveAndFlush(seq);
        return nextValue;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public PortalTeam createTeam(CreateTeamRequest req) {
        requireAdminConfig();

        if (req == null || isBlank(req.registerNumber())) {
            throw new IllegalArgumentException("Student Register Number is required.");
        }

        Student student = studentRepository.findByRegisterNumberForUpdate(req.registerNumber().trim())
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + req.registerNumber()));

        if (teamMemberRepository.findByRegisterNumber(student.getRegisterNumber()).isPresent()) {
            throw new IllegalArgumentException("You already belong to a team. A student can belong to only one team.");
        }

        int minFloor = Math.max(1, teamRepository.findMaxTeamNumber() + 1);
        int nextNumber = nextSequenceValue(SEQ_TEAM_NUMBER, minFloor);
        String teamId = String.format("TEAM-%03d", nextNumber);
        String nowIso = Instant.now().toString();

        PortalTeam team = new PortalTeam();
        team.setTeamId(teamId);
        team.setTeamNumber(nextNumber);
        team.setTeamName("Team " + nextNumber);
        team.setDepartment(student.getDepartment().getName());
        team.setLeadRegisterNumber(student.getRegisterNumber());
        team.setProjectTitle("Topic Not Finalized");
        team.setCreatedAt(nowIso);
        teamRepository.save(team);

        PortalTeamMember lead = new PortalTeamMember();
        lead.setId("MEM-" + shortUuid());
        lead.setTeamId(teamId);
        lead.setRegisterNumber(student.getRegisterNumber());
        lead.setName(student.getStudentName());
        lead.setDepartment(student.getDepartment().getName());
        lead.setRole("Team Lead");
        lead.setJoinedAt(nowIso);
        teamMemberRepository.save(lead);

        return team;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public PortalTeamMember addTeamMember(AddMemberRequest req) {
        AdminCapacitySettings config = requireAdminConfig();

        if (req == null || isBlank(req.teamId()) || isBlank(req.actingRegisterNumber()) || isBlank(req.targetRegisterNumber())) {
            throw new IllegalArgumentException("Team ID, Acting Register Number, and Target Register Number are required.");
        }

        PortalTeam team = teamRepository.findByTeamIdForUpdate(req.teamId())
                .orElseThrow(() -> new IllegalArgumentException("Team not found."));

        if (!team.getLeadRegisterNumber().equals(req.actingRegisterNumber())) {
            throw new IllegalArgumentException("Only the Team Lead can add members to the team.");
        }

        if (allocationRepository.findByTeamId(team.getTeamId()).isPresent()) {
            throw new IllegalArgumentException("Team roster cannot be modified after a faculty guide has been allocated.");
        }

        int configuredTeamSize = config.getStudentsPerTeam();
        List<PortalTeamMember> currentMembers = teamMemberRepository.findByTeamId(team.getTeamId());
        if (currentMembers.size() >= configuredTeamSize) {
            throw new IllegalArgumentException(
                    "This team has already reached the Admin-configured team size of " + configuredTeamSize + " students."
            );
        }

        String targetRegNo = req.targetRegisterNumber().trim();
        Student target = studentRepository.findByRegisterNumberForUpdate(targetRegNo)
                .orElseThrow(() -> new IllegalArgumentException("No student found with Register Number \"" + req.targetRegisterNumber() + "\"."));

        if (target.getRegisterNumber().equals(req.actingRegisterNumber())) {
            throw new IllegalArgumentException("You cannot add yourself again as a team member.");
        }
        if (teamMemberRepository.findByRegisterNumber(target.getRegisterNumber()).isPresent()) {
            throw new IllegalArgumentException(target.getStudentName() + " (" + target.getRegisterNumber() + ") already belongs to a team.");
        }

        PortalTeamMember member = new PortalTeamMember();
        member.setId("MEM-" + shortUuid());
        member.setTeamId(team.getTeamId());
        member.setRegisterNumber(target.getRegisterNumber());
        member.setName(target.getStudentName());
        member.setDepartment(target.getDepartment().getName());
        member.setRole("Member");
        member.setJoinedAt(Instant.now().toString());
        return teamMemberRepository.save(member);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public void removeTeamMember(RemoveMemberRequest req) {
        if (req == null || isBlank(req.teamId()) || isBlank(req.actingRegisterNumber()) || isBlank(req.targetRegisterNumber())) {
            throw new IllegalArgumentException("Team ID, Acting Register Number, and Target Register Number are required.");
        }

        PortalTeam team = teamRepository.findByTeamIdForUpdate(req.teamId())
                .orElseThrow(() -> new IllegalArgumentException("Team not found."));

        if (!team.getLeadRegisterNumber().equals(req.actingRegisterNumber())) {
            throw new IllegalArgumentException("Only the Team Lead can remove team members.");
        }
        if (allocationRepository.findByTeamId(team.getTeamId()).isPresent()) {
            throw new IllegalArgumentException("Team members cannot be removed after a faculty guide has been allocated.");
        }
        if (team.getLeadRegisterNumber().equals(req.targetRegisterNumber())) {
            throw new IllegalArgumentException("The Team Lead cannot be removed from the team.");
        }
        long deleted = teamMemberRepository.deleteByTeamIdAndRegisterNumber(req.teamId(), req.targetRegisterNumber());
        if (deleted == 0) {
            throw new IllegalArgumentException("Specified student is not a member of this team.");
        }
    }

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public void deleteTeam(String teamId, String actingRegisterNumber) {
        PortalTeam team = teamRepository.findByTeamIdForUpdate(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found."));

        if (!team.getLeadRegisterNumber().equals(actingRegisterNumber)) {
            throw new IllegalArgumentException("Only the Team Lead can delete the team.");
        }
        if (allocationRepository.findByTeamId(team.getTeamId()).isPresent()) {
            throw new IllegalArgumentException("Allocated teams cannot be deleted by students. Contact the Admin if changes are needed.");
        }

        teamMemberRepository.deleteByTeamId(team.getTeamId());
        teamMemberRepository.flush();
        teamRepository.delete(team);
        teamRepository.flush();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public void adminDeleteTeam(String teamId) {
        PortalTeam team = teamRepository.findByTeamIdForUpdate(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId));

        progressRepository.deleteByTeamId(team.getTeamId());
        allocationRepository.deleteByTeamId(team.getTeamId());
        teamMemberRepository.deleteByTeamId(team.getTeamId());
        teamMemberRepository.flush();
        teamRepository.delete(team);
        teamRepository.flush();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public PortalGuideAllocation selectGuideFCFS(SelectGuideRequest req) {
        AdminCapacitySettings config = requireAdminConfig();

        if (req == null || isBlank(req.teamId()) || isBlank(req.actingRegisterNumber()) || isBlank(req.facultyId())) {
            throw new IllegalArgumentException("Team ID, Team Lead Register Number, and Faculty ID are required.");
        }

        PortalTeam team = teamRepository.findByTeamIdForUpdate(req.teamId())
                .orElseThrow(() -> new IllegalArgumentException("Team not found."));

        if (!team.getLeadRegisterNumber().equals(req.actingRegisterNumber())) {
            throw new IllegalArgumentException("Only the Team Lead has permission to select a project guide.");
        }

        if (allocationRepository.findByTeamId(team.getTeamId()).isPresent()) {
            throw new IllegalArgumentException(team.getTeamName() + " already has an allocated faculty guide.");
        }

        int requiredTeamSize = config.getStudentsPerTeam();
        List<PortalTeamMember> members = teamMemberRepository.findByTeamId(team.getTeamId());
        if (members.size() < requiredTeamSize) {
            throw new IllegalArgumentException(
                    "Your team must be completely formed with " + requiredTeamSize
                            + " members (" + members.size() + "/" + requiredTeamSize + ") before selecting a faculty guide."
            );
        }
        if (members.size() > requiredTeamSize) {
            throw new IllegalArgumentException(
                    "Your team currently has " + members.size()
                            + " members, which exceeds the Admin-configured team size of "
                            + requiredTeamSize + ". Remove extra member(s) before selecting a faculty guide."
            );
        }

        Faculty faculty = facultyRepository.findByFacultyIdForUpdate(req.facultyId())
                .orElseThrow(() -> new IllegalArgumentException("Selected faculty member not found."));

        int maxTeamsPerFaculty = config.getConfiguredTeamsPerGuide();
        long assignedCount = allocationRepository
                .findByFacultyIdAndStatusForUpdate(faculty.getFacultyId(), "Allocated")
                .size();
        if (assignedCount >= maxTeamsPerFaculty) {
            throw new IllegalArgumentException(
                    faculty.getFacultyName() + " has reached full capacity (" + assignedCount + "/" + maxTeamsPerFaculty + ")."
            );
        }

        int minOrderFloor = Math.max(1, allocationRepository.findMaxAllocationOrder() + 1);
        int order = nextSequenceValue(SEQ_ALLOCATION_ORDER, minOrderFloor);
        String allocId = String.format("ALC-%03d", order + 100);
        String nowIso = Instant.now().toString();
        String displayDate = LocalDate.now().format(DISPLAY_DATE_FMT);

        PortalGuideAllocation alloc = new PortalGuideAllocation();
        alloc.setAllocationId(allocId);
        alloc.setAllocationOrder(order);
        alloc.setTeamId(team.getTeamId());
        alloc.setFacultyId(faculty.getFacultyId());
        alloc.setAllocatedAt(nowIso);
        alloc.setAllocationDate(displayDate);
        alloc.setStatus("Allocated");
        allocationRepository.save(alloc);

        PortalProjectProgress progress = new PortalProjectProgress();
        progress.setTeamId(team.getTeamId());
        progress.setFacultyId(faculty.getFacultyId());
        progress.setStage(VALID_STAGES.get(0));
        progress.setFeedback("Directly allocated to " + faculty.getFacultyName() + " via FCFS.");
        progress.setUpdatedAt(nowIso);
        progress.setUpdatedDate(displayDate);
        progressRepository.save(progress);

        PortalNotification notif = new PortalNotification();
        notif.setId("NOTIF-" + shortUuid());
        notif.setAudience("faculty");
        notif.setFacultyId(faculty.getFacultyId());
        notif.setCategory("Team Allocation");
        notif.setTitle("New Team Allocated: " + team.getTeamName());
        notif.setDescription(team.getTeamName() + " (" + team.getTeamId() + ") selected you via FCFS allocation.");
        notif.setTimestamp(displayDate);
        notif.setTag("Allocated");
        notif.setVariant("success");
        notificationRepository.save(notif);

        return alloc;
    }

    @Transactional
    public void updateProjectTitle(UpdateProjectTitleRequest req) {
        PortalTeam team = teamRepository.findByTeamId(req.teamId())
                .orElseThrow(() -> new IllegalArgumentException("Team not found."));
        if (!team.getLeadRegisterNumber().equals(req.actingRegisterNumber())) {
            throw new IllegalArgumentException("Only the Team Lead can update the project title.");
        }
        String trimmed = req.projectTitle() != null ? req.projectTitle().trim() : "";
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Project title cannot be empty.");
        }
        team.setProjectTitle(trimmed);
        teamRepository.save(team);

        allocationRepository.findByTeamId(team.getTeamId()).ifPresent(alloc -> {
            PortalNotification n = new PortalNotification();
            n.setId("NOTIF-" + shortUuid());
            n.setAudience("faculty");
            n.setFacultyId(alloc.getFacultyId());
            n.setCategory("Project Update");
            n.setTitle("Project Details Updated: " + team.getTeamName());
            n.setDescription(team.getTeamName() + " updated project title to \"" + trimmed + "\".");
            n.setTimestamp(LocalDate.now().format(DISPLAY_DATE_FMT));
            n.setTag("Updated");
            n.setVariant("info");
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void submitProgressNote(ProgressNoteRequest req, String authenticatedRegisterNumber) {
        if (req == null || isBlank(req.teamId())) {
            throw new IllegalArgumentException("Team ID is required.");
        }
        PortalTeam team = teamRepository.findByTeamId(req.teamId())
                .orElseThrow(() -> new IllegalArgumentException("Team not found."));
        PortalTeamMember actingMember = teamMemberRepository.findByTeamId(team.getTeamId()).stream()
                .filter(m -> m.getRegisterNumber().equalsIgnoreCase(authenticatedRegisterNumber))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("You can only submit progress notes for your own team."));
        PortalGuideAllocation alloc = allocationRepository.findByTeamId(req.teamId())
                .orElseThrow(() -> new IllegalArgumentException("A guide must be allocated before submitting progress notes."));
        String note = req.note() != null ? req.note().trim() : "";
        if (note.isEmpty()) {
            throw new IllegalArgumentException("Please enter a progress update note.");
        }

        PortalNotification n = new PortalNotification();
        n.setId("NOTIF-" + shortUuid());
        n.setAudience("faculty");
        n.setFacultyId(alloc.getFacultyId());
        n.setCategory("Progress Submission");
        n.setTitle("Student Progress Submitted: " + team.getTeamName());
        n.setDescription(actingMember.getName() + " submitted an update: \"" + note + "\"");
        n.setTimestamp(LocalDate.now().format(DISPLAY_DATE_FMT));
        n.setTag("Progress");
        n.setVariant("info");
        notificationRepository.save(n);
    }

    @Transactional
    public PortalProjectTopic addTopic(TopicUpsertRequest req) {
        if (isBlank(req.projectTitle()) || isBlank(req.projectDomain())
                || isBlank(req.description()) || isBlank(req.technologiesUsed())) {
            throw new IllegalArgumentException("Please fill in Project Title, Domain, Description, and Technologies Used.");
        }
        PortalProjectTopic topic = new PortalProjectTopic();
        topic.setTopicId("TOP-" + shortUuid().substring(0, 12));
        topic.setFacultyId(req.facultyId());
        topic.setProjectTitle(req.projectTitle().trim());
        topic.setProjectDomain(req.projectDomain().trim());
        topic.setDescription(req.description().trim());
        topic.setTechnologiesUsed(req.technologiesUsed().trim());
        return topicRepository.save(topic);
    }

    @Transactional
    public PortalProjectTopic updateTopic(String topicId, TopicUpsertRequest req) {
        PortalProjectTopic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new IllegalArgumentException("Project topic not found."));
        if (!topic.getFacultyId().equals(req.facultyId())) {
            throw new IllegalArgumentException("Project topic does not belong to logged-in faculty.");
        }
        topic.setProjectTitle(req.projectTitle().trim());
        topic.setProjectDomain(req.projectDomain().trim());
        topic.setDescription(req.description().trim());
        topic.setTechnologiesUsed(req.technologiesUsed().trim());
        return topicRepository.save(topic);
    }

    @Transactional
    public void deleteTopic(String topicId, String facultyId) {
        PortalProjectTopic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new IllegalArgumentException("Project topic not found."));
        if (!topic.getFacultyId().equals(facultyId)) {
            throw new IllegalArgumentException("Project topic does not belong to logged-in faculty.");
        }
        topicRepository.delete(topic);
    }

    @Transactional
    public void updateProgress(FacultyProgressUpdateRequest req) {
        if (!VALID_STAGES.contains(req.stage())) {
            throw new IllegalArgumentException("Invalid project progress stage.");
        }
        PortalGuideAllocation alloc = allocationRepository.findByTeamId(req.teamId())
                .orElseThrow(() -> new IllegalArgumentException("Allocation not found for team."));
        if (!alloc.getFacultyId().equals(req.facultyId())) {
            throw new IllegalArgumentException("This team is not allocated to logged-in faculty.");
        }
        if (!isBlank(req.projectTitle())) {
            teamRepository.findByTeamId(req.teamId()).ifPresent(team -> {
                team.setProjectTitle(req.projectTitle().trim());
                teamRepository.save(team);
            });
        }

        PortalProjectProgress progress = progressRepository.findById(req.teamId())
                .orElseGet(PortalProjectProgress::new);
        progress.setTeamId(req.teamId());
        progress.setFacultyId(req.facultyId());
        progress.setStage(req.stage());
        progress.setFeedback(!isBlank(req.feedback()) ? req.feedback().trim() : "Progress updated by faculty.");
        progress.setUpdatedAt(Instant.now().toString());
        progress.setUpdatedDate(LocalDate.now().format(DISPLAY_DATE_FMT));
        progressRepository.save(progress);
    }

    @Transactional
    public void publishAnnouncement(AnnouncementRequest req) {
        if (isBlank(req.title()) || isBlank(req.message())) {
            throw new IllegalArgumentException("Announcement title and message are required.");
        }
        PortalNotification n = new PortalNotification();
        n.setId("NOTIF-" + shortUuid());
        n.setAudience("all_faculty");
        n.setFacultyId(null);
        n.setCategory("Admin Announcement");
        n.setTitle(req.title().trim());
        n.setDescription(req.message().trim());
        n.setTimestamp(LocalDate.now().format(DISPLAY_DATE_FMT));
        n.setTag("Announcement");
        n.setVariant("warning");
        notificationRepository.save(n);
    }

    private static String shortUuid() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase(Locale.ROOT);
    }

    private static boolean isBlank(String val) {
        return val == null || val.trim().isEmpty();
    }
}
