package com.university.sgap;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.sgap.entity.*;
import com.university.sgap.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "app.security.auth-rate-limit-per-minute=200")
@AutoConfigureMockMvc
class TeamFormationAndFcfsConcurrencyIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private FacultyRepository facultyRepository;

    @Autowired
    private AdminCapacitySettingsRepository capacityRepository;

    @Autowired
    private PortalSequenceRepository sequenceRepository;

    @Autowired
    private PortalTeamRepository teamRepository;

    @Autowired
    private PortalTeamMemberRepository teamMemberRepository;

    @Autowired
    private PortalGuideAllocationRepository allocationRepository;

    @Autowired
    private PortalProjectProgressRepository progressRepository;

    @Autowired
    private PortalNotificationRepository notificationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final List<String> createdTeamIds = new ArrayList<>();
    private final List<String> createdStudentRegNos = new ArrayList<>();
    private final List<String> createdFacultyIds = new ArrayList<>();
    private final List<String> createdUsernames = new ArrayList<>();

    private Optional<AdminCapacitySettings> preTestSettings;
    private List<PortalSequence> preTestSequences;

    @BeforeEach
    void capturePreTestState() {
        preTestSettings = capacityRepository.findById(1L);
        preTestSequences = sequenceRepository.findAll();
        capacityRepository.deleteAll();
    }

    @AfterEach
    void cleanUpTestRecords() {
        for (String teamId : createdTeamIds) {
            progressRepository.findById(teamId).ifPresent(progressRepository::delete);
            allocationRepository.findByTeamId(teamId).ifPresent(a -> {
                notificationRepository.findAll().stream()
                        .filter(n -> n.getDescription() != null && n.getDescription().contains(teamId))
                        .forEach(notificationRepository::delete);
                allocationRepository.delete(a);
            });
            teamMemberRepository.findByTeamId(teamId).forEach(teamMemberRepository::delete);
            teamRepository.findByTeamId(teamId).ifPresent(teamRepository::delete);
        }
        createdTeamIds.clear();

        for (String regNo : createdStudentRegNos) {
            teamMemberRepository.findByRegisterNumber(regNo).ifPresent(teamMemberRepository::delete);
            studentRepository.findByRegisterNumber(regNo).ifPresent(studentRepository::delete);
        }
        createdStudentRegNos.clear();

        for (String facultyId : createdFacultyIds) {
            notificationRepository.findAll().stream()
                    .filter(n -> facultyId.equals(n.getFacultyId()))
                    .forEach(notificationRepository::delete);
            facultyRepository.findByFacultyId(facultyId).ifPresent(facultyRepository::delete);
        }
        createdFacultyIds.clear();

        for (String username : createdUsernames) {
            userAccountRepository.findByUsernameIgnoreCase(username).ifPresent(userAccountRepository::delete);
        }
        createdUsernames.clear();

        capacityRepository.deleteAll();
        preTestSettings.ifPresent(prev -> {
            AdminCapacitySettings restored = new AdminCapacitySettings();
            restored.setId(1L);
            restored.setTotalStudents(prev.getTotalStudents());
            restored.setTotalGuides(prev.getTotalGuides());
            restored.setStudentsPerTeam(prev.getStudentsPerTeam());
            restored.setMaxTeamsMode(prev.getMaxTeamsMode());
            restored.setCustomMaxTeamsPerGuide(prev.getCustomMaxTeamsPerGuide());
            restored.setConfiguredTeamsPerGuide(prev.getConfiguredTeamsPerGuide());
            restored.setUpdatedAt(prev.getUpdatedAt());
            capacityRepository.save(restored);
        });

        sequenceRepository.deleteAll();
        if (!preTestSequences.isEmpty()) {
            for (PortalSequence prevSeq : preTestSequences) {
                PortalSequence restoredSeq = new PortalSequence();
                restoredSeq.setSeqName(prevSeq.getSeqName());
                restoredSeq.setNextVal(prevSeq.getNextVal());
                sequenceRepository.save(restoredSeq);
            }
        }
    }

    private String loginAs(String identifier, String password, String expectedRole) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "identifier", identifier,
                                "password", password,
                                "expectedRole", expectedRole
                        ))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    private UserAccount createTestAdmin(String username, String rawPassword) {
        UserAccount admin = new UserAccount();
        admin.setUsername(username);
        admin.setEmail(username.toLowerCase() + "@test.university.edu");
        admin.setPasswordHash(passwordEncoder.encode(rawPassword));
        admin.setRole(UserRole.ADMIN);
        admin.setMustSetPassword(false);
        admin.setAccountStatus(AccountStatus.ACTIVE);
        UserAccount saved = userAccountRepository.save(admin);
        createdUsernames.add(username);
        return saved;
    }

    private Student createTestStudent(String regNo, String name) {
        Department cse = departmentRepository.findByCodeIgnoreCase("CSE").orElseThrow();
        UserAccount user = new UserAccount();
        user.setUsername(regNo);
        user.setEmail(regNo.toLowerCase() + "@test.university.edu");
        user.setPasswordHash(passwordEncoder.encode("Pass@123"));
        user.setRole(UserRole.STUDENT);
        user.setMustSetPassword(false);
        user.setAccountStatus(AccountStatus.ACTIVE);
        userAccountRepository.save(user);
        createdUsernames.add(regNo);

        Student s = new Student();
        s.setUser(user);
        s.setRegisterNumber(regNo);
        s.setStudentName(name);
        s.setEmail(user.getEmail());
        s.setDepartment(cse);
        s.setAcademicYear("2025-2026");
        s.setSection("A");
        s.setSemester("Semester 8");
        s.setBatch("2025-2026");
        Student saved = studentRepository.save(s);
        createdStudentRegNos.add(regNo);
        return saved;
    }

    private Faculty createTestFaculty(String facultyId, String name) {
        Department cse = departmentRepository.findByCodeIgnoreCase("CSE").orElseThrow();
        UserAccount user = new UserAccount();
        user.setUsername(facultyId);
        user.setEmail(facultyId.toLowerCase() + "@test.university.edu");
        user.setPasswordHash(passwordEncoder.encode("Pass@123"));
        user.setRole(UserRole.FACULTY);
        user.setMustSetPassword(false);
        user.setAccountStatus(AccountStatus.ACTIVE);
        userAccountRepository.save(user);
        createdUsernames.add(facultyId);

        Faculty f = new Faculty();
        f.setUser(user);
        f.setFacultyId(facultyId);
        f.setFacultyName(name);
        f.setEmail(user.getEmail());
        f.setDepartment(cse);
        f.setDesignation("Associate Professor");
        f.setSpecialization("AI & Distributed Systems");
        f.setOffice("CSE Wing");
        Faculty saved = facultyRepository.save(f);
        createdFacultyIds.add(facultyId);
        return saved;
    }

    private PortalTeam createTeamViaApi(String regNo, String jwt) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/student/teams")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("registerNumber", regNo))))
                .andExpect(status().isOk())
                .andReturn();
        PortalTeam team = objectMapper.readValue(res.getResponse().getContentAsString(), PortalTeam.class);
        createdTeamIds.add(team.getTeamId());
        return team;
    }

    private void addMemberViaApi(String teamId, String actingRegNo, String targetRegNo, String jwt) throws Exception {
        mockMvc.perform(post("/api/student/teams/members")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "teamId", teamId,
                                "actingRegisterNumber", actingRegNo,
                                "targetRegisterNumber", targetRegNo
                        ))))
                .andExpect(status().isOk());
    }

    @Test
    void enforcesAdminConfigTeamFormationLeadMemberRulesFullTeamGateAndNonReusedNumbers() throws Exception {
        // Seed 9 students & 1 faculty & ephemeral test admin for full workflow test
        for (int i = 1; i <= 9; i++) {
            createTestStudent("TST-00" + i, "Test Student " + i);
        }
        createTestFaculty("FAC-T1", "Dr. Capacity Guide");
        createTestAdmin("ADM-TEST-RACE-1", "TestAdmin@2026");

        int existingSeqNext = sequenceRepository.findById("TEAM_NUMBER")
                .map(PortalSequence::getNextVal)
                .orElse(1);
        int baseTeamNumber = Math.max(Math.max(1, teamRepository.findMaxTeamNumber() + 1), existingSeqNext);

        String adminJwt = loginAs("ADM-TEST-RACE-1", "TestAdmin@2026", "ADMIN");
        String stu1Jwt = loginAs("TST-001", "Pass@123", "STUDENT");
        String stu2Jwt = loginAs("TST-002", "Pass@123", "STUDENT");
        String stu4Jwt = loginAs("TST-004", "Pass@123", "STUDENT");
        String stu7Jwt = loginAs("TST-007", "Pass@123", "STUDENT");

        // 1. Unconfigured state -> team creation MUST fail with 400
        MvcResult uncfgRes = mockMvc.perform(post("/api/student/teams")
                        .header("Authorization", "Bearer " + stu1Jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"registerNumber\":\"TST-001\"}"))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertThat(objectMapper.readTree(uncfgRes.getResponse().getContentAsString()).get("message").asText())
                .contains("Admin Configuration Required");

        // 2. Admin saves Students Per Team = 3 and Maximum Teams Per Faculty = 2
        mockMvc.perform(put("/api/admin/team-settings")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentsPerTeam\":3,\"maxTeamsPerFaculty\":2}"))
                .andExpect(status().isOk());

        // 3. Lead creates first sequential team; cannot create a second team
        PortalTeam team1 = createTeamViaApi("TST-001", stu1Jwt);
        assertThat(team1.getTeamNumber()).isEqualTo(baseTeamNumber);
        assertThat(team1.getTeamId()).isEqualTo(String.format("TEAM-%03d", baseTeamNumber));
        assertThat(team1.getLeadRegisterNumber()).isEqualTo("TST-001");

        mockMvc.perform(post("/api/student/teams")
                        .header("Authorization", "Bearer " + stu1Jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"registerNumber\":\"TST-001\"}"))
                .andExpect(status().isBadRequest());

        // 4. Add member 2; non-lead cannot add member 3
        addMemberViaApi(team1.getTeamId(), "TST-001", "TST-002", stu1Jwt);

        mockMvc.perform(post("/api/student/teams/members")
                        .header("Authorization", "Bearer " + stu2Jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "teamId", team1.getTeamId(),
                                "actingRegisterNumber", "TST-002",
                                "targetRegisterNumber", "TST-003"
                        ))))
                .andExpect(status().isBadRequest());

        // 5. Incomplete team (2/3) CANNOT select a guide!
        MvcResult incompleteSelectRes = mockMvc.perform(post("/api/student/select-guide")
                        .header("Authorization", "Bearer " + stu1Jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "teamId", team1.getTeamId(),
                                "actingRegisterNumber", "TST-001",
                                "facultyId", "FAC-T1"
                        ))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertThat(objectMapper.readTree(incompleteSelectRes.getResponse().getContentAsString()).get("message").asText())
                .contains("2/3");

        // 6. Add member 3 (team now full 3/3); adding 4th member MUST fail
        addMemberViaApi(team1.getTeamId(), "TST-001", "TST-003", stu1Jwt);
        mockMvc.perform(post("/api/student/teams/members")
                        .header("Authorization", "Bearer " + stu1Jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "teamId", team1.getTeamId(),
                                "actingRegisterNumber", "TST-001",
                                "targetRegisterNumber", "TST-004"
                        ))))
                .andExpect(status().isBadRequest());

        // 7. Create sequential team 2 by Student 4; cannot steal already-teamed Student 2; delete team 2 -> next gets +2!
        PortalTeam team2 = createTeamViaApi("TST-004", stu4Jwt);
        assertThat(team2.getTeamNumber()).isEqualTo(baseTeamNumber + 1);
        assertThat(team2.getTeamId()).isEqualTo(String.format("TEAM-%03d", baseTeamNumber + 1));

        mockMvc.perform(post("/api/student/teams/members")
                        .header("Authorization", "Bearer " + stu4Jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "teamId", team2.getTeamId(),
                                "actingRegisterNumber", "TST-004",
                                "targetRegisterNumber", "TST-002"
                        ))))
                .andExpect(status().isBadRequest());

        // Delete unallocated team2 by its Lead
        mockMvc.perform(delete("/api/student/teams/" + team2.getTeamId())
                        .param("registerNumber", "TST-004")
                        .header("Authorization", "Bearer " + stu4Jwt))
                .andExpect(status().isOk());

        // Creating next team MUST increment sequentially (never reusing deleted team2's number!)
        PortalTeam team3 = createTeamViaApi("TST-004", stu4Jwt);
        assertThat(team3.getTeamNumber()).isEqualTo(baseTeamNumber + 2);
        assertThat(team3.getTeamId()).isEqualTo(String.format("TEAM-%03d", baseTeamNumber + 2));

        // 8. Full Team 1 selects FAC-T1 (slot 1 of 2 taken); post-allocation removal & deletion are blocked
        mockMvc.perform(post("/api/student/select-guide")
                        .header("Authorization", "Bearer " + stu1Jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "teamId", team1.getTeamId(),
                                "actingRegisterNumber", "TST-001",
                                "facultyId", "FAC-T1"
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/student/teams/members")
                        .header("Authorization", "Bearer " + stu1Jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "teamId", team1.getTeamId(),
                                "actingRegisterNumber", "TST-001",
                                "targetRegisterNumber", "TST-003"
                        ))))
                .andExpect(status().isBadRequest());

        // 9. Fill Team 3 (3/3) and allocate FAC-T1 (slot 2 of 2 -> Full!)
        addMemberViaApi(team3.getTeamId(), "TST-004", "TST-005", stu4Jwt);
        addMemberViaApi(team3.getTeamId(), "TST-004", "TST-006", stu4Jwt);
        mockMvc.perform(post("/api/student/select-guide")
                        .header("Authorization", "Bearer " + stu4Jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "teamId", team3.getTeamId(),
                                "actingRegisterNumber", "TST-004",
                                "facultyId", "FAC-T1"
                        ))))
                .andExpect(status().isOk());

        // 10. Full Team 4 tries to select full FAC-T1 -> MUST fail with capacity error!
        PortalTeam team4 = createTeamViaApi("TST-007", stu7Jwt);
        assertThat(team4.getTeamNumber()).isEqualTo(baseTeamNumber + 3);
        assertThat(team4.getTeamId()).isEqualTo(String.format("TEAM-%03d", baseTeamNumber + 3));
        addMemberViaApi(team4.getTeamId(), "TST-007", "TST-008", stu7Jwt);
        addMemberViaApi(team4.getTeamId(), "TST-007", "TST-009", stu7Jwt);

        MvcResult fullCapRes = mockMvc.perform(post("/api/student/select-guide")
                        .header("Authorization", "Bearer " + stu7Jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "teamId", team4.getTeamId(),
                                "actingRegisterNumber", "TST-007",
                                "facultyId", "FAC-T1"
                        ))))
                .andExpect(status().isBadRequest())
                .andReturn();
        assertThat(objectMapper.readTree(fullCapRes.getResponse().getContentAsString()).get("message").asText())
                .contains("full capacity (2/2)");
        assertThat(allocationRepository.countByFacultyIdAndStatus("FAC-T1", "Allocated")).isEqualTo(2L);
    }

    @Test
    void concurrentFinalSlotFcfsRaceAllowsOnlyOneWinnerAndConcurrentTeamCreationGetsUniqueSequentialIds() throws Exception {
        for (int i = 1; i <= 4; i++) {
            createTestStudent("RACE-00" + i, "Race Student " + i);
        }
        createTestFaculty("FAC-RACE-1", "Dr. Single Slot Faculty");
        createTestAdmin("ADM-TEST-RACE-2", "TestAdmin@2026");

        String adminJwt = loginAs("ADM-TEST-RACE-2", "TestAdmin@2026", "ADMIN");
        mockMvc.perform(put("/api/admin/team-settings")
                        .header("Authorization", "Bearer " + adminJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"studentsPerTeam\":2,\"maxTeamsPerFaculty\":1}"))
                .andExpect(status().isOk());

        String r1Jwt = loginAs("RACE-001", "Pass@123", "STUDENT");
        String r3Jwt = loginAs("RACE-003", "Pass@123", "STUDENT");

        // Concurrent team creation by RACE-001 and RACE-003
        ExecutorService createPool = Executors.newFixedThreadPool(2);
        CountDownLatch createGate = new CountDownLatch(1);
        Future<PortalTeam> teamAFuture = createPool.submit(() -> {
            createGate.await(5, TimeUnit.SECONDS);
            return createTeamViaApi("RACE-001", r1Jwt);
        });
        Future<PortalTeam> teamBFuture = createPool.submit(() -> {
            createGate.await(5, TimeUnit.SECONDS);
            return createTeamViaApi("RACE-003", r3Jwt);
        });
        createGate.countDown();
        PortalTeam teamA = teamAFuture.get(15, TimeUnit.SECONDS);
        PortalTeam teamB = teamBFuture.get(15, TimeUnit.SECONDS);
        createPool.shutdownNow();

        assertThat(Set.of(teamA.getTeamNumber(), teamB.getTeamNumber())).hasSize(2);
        assertThat(teamA.getTeamId()).isNotEqualTo(teamB.getTeamId());

        // Complete both teams to size 2
        addMemberViaApi(teamA.getTeamId(), "RACE-001", "RACE-002", r1Jwt);
        addMemberViaApi(teamB.getTeamId(), "RACE-003", "RACE-004", r3Jwt);

        // Concurrent FCFS race on FAC-RACE-1 with maxTeamsPerFaculty = 1
        ExecutorService racePool = Executors.newFixedThreadPool(2);
        CountDownLatch startGate = new CountDownLatch(1);
        Callable<Integer> selectA = () -> {
            startGate.await(5, TimeUnit.SECONDS);
            return mockMvc.perform(post("/api/student/select-guide")
                            .header("Authorization", "Bearer " + r1Jwt)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "teamId", teamA.getTeamId(),
                                    "actingRegisterNumber", "RACE-001",
                                    "facultyId", "FAC-RACE-1"
                            ))))
                    .andReturn()
                    .getResponse()
                    .getStatus();
        };
        Callable<Integer> selectB = () -> {
            startGate.await(5, TimeUnit.SECONDS);
            return mockMvc.perform(post("/api/student/select-guide")
                            .header("Authorization", "Bearer " + r3Jwt)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "teamId", teamB.getTeamId(),
                                    "actingRegisterNumber", "RACE-003",
                                    "facultyId", "FAC-RACE-1"
                            ))))
                    .andReturn()
                    .getResponse()
                    .getStatus();
        };

        Future<Integer> statusAFuture = racePool.submit(selectA);
        Future<Integer> statusBFuture = racePool.submit(selectB);
        startGate.countDown();

        int statusA = statusAFuture.get(15, TimeUnit.SECONDS);
        int statusB = statusBFuture.get(15, TimeUnit.SECONDS);
        racePool.shutdownNow();

        List<Integer> statuses = List.of(statusA, statusB);
        assertThat(statuses.stream().filter(s -> s == 200).collect(Collectors.toList())).hasSize(1);
        assertThat(statuses.stream().filter(s -> s == 400).collect(Collectors.toList())).hasSize(1);
        assertThat(allocationRepository.countByFacultyIdAndStatus("FAC-RACE-1", "Allocated")).isEqualTo(1L);
    }
}
