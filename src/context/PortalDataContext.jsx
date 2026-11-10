import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { EMPTY_SHARED_PORTAL_STATE } from '../constants/portalConstants';
import {
  ALLOCATION_STATUS,
  FACULTY_SETTINGS_STORAGE_KEY,
  buildFacultyProfilesWithCapacity,
  buildUnifiedAllocationRecords,
  findStudentByRegisterNumber,
  findStudentTeam,
  getStudentRoleInTeam,
  getTeamFormationStatus,
} from '../utils/portalAllocation';
import {
  authApi,
  clearAuthSession,
  getAuthSession,
  portalApi,
  setAuthSession,
} from '../utils/apiClient';
import {
  calculateCapacitySummary,
  clearStoredCapacityConfig,
  loadStoredCapacityConfig,
  saveStoredCapacityConfig,
} from '../utils/capacityCalculator';

const PortalDataContext = createContext(null);

const DEFAULT_FACULTY_PREFERENCES = {
  officeHours: 'Mon & Wed, 03:00 PM - 04:30 PM',
  notifyOnAllocation: true,
  notifyOnProgress: true,
  notifyOnAdminAnnouncement: true,
};

const EMPTY_ADMIN_STATISTICS = {
  totalStudents: 0,
  totalFaculty: 0,
  updatedAt: null,
};

const EMPTY_TEAM_CONFIG = {
  configured: false,
  studentsPerTeam: null,
  maxTeamsPerFaculty: null,
  updatedAt: null,
  totalStudents: 0,
  totalGuides: 0,
  maxTeamsMode: 'auto',
  customMaxTeamsPerGuide: null,
  totalTeamsRequired: 0,
  recommendedTeamsPerGuide: null,
  totalGuideCapacity: 0,
  remainingTeamSlots: 0,
  capacitySufficient: null,
};

function loadFacultyPreferences() {
  try {
    const raw = localStorage.getItem(FACULTY_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return DEFAULT_FACULTY_PREFERENCES;
    }
    return { ...DEFAULT_FACULTY_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FACULTY_PREFERENCES;
  }
}

function normalizeTeamConfig(raw) {
  if (
    raw &&
    raw.configured &&
    Number(raw.studentsPerTeam) > 0 &&
    Number(raw.maxTeamsPerFaculty) > 0
  ) {
    return {
      configured: true,
      studentsPerTeam: Number(raw.studentsPerTeam),
      maxTeamsPerFaculty: Number(raw.maxTeamsPerFaculty),
      updatedAt: raw.updatedAt || null,
      totalStudents: Number(raw.totalStudents) || 0,
      totalGuides: Number(raw.totalGuides) || 0,
      maxTeamsMode: raw.maxTeamsMode || 'manual',
      customMaxTeamsPerGuide:
        raw.customMaxTeamsPerGuide != null
          ? Number(raw.customMaxTeamsPerGuide)
          : Number(raw.maxTeamsPerFaculty),
      totalTeamsRequired:
        raw.totalTeamsRequired != null ? Number(raw.totalTeamsRequired) : 0,
      recommendedTeamsPerGuide:
        raw.recommendedTeamsPerGuide != null
          ? Number(raw.recommendedTeamsPerGuide)
          : null,
      totalGuideCapacity:
        raw.totalGuideCapacity != null ? Number(raw.totalGuideCapacity) : 0,
      remainingTeamSlots:
        raw.remainingTeamSlots != null ? Number(raw.remainingTeamSlots) : 0,
      capacitySufficient:
        typeof raw.capacitySufficient === 'boolean'
          ? raw.capacitySufficient
          : null,
    };
  }
  return {
    ...EMPTY_TEAM_CONFIG,
    totalStudents: Number(raw?.totalStudents) || 0,
    totalGuides: Number(raw?.totalGuides) || 0,
  };
}

export function PortalDataProvider({ children }) {
  const [departments, setDepartments] = useState([]);
  const [students, setStudents] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [adminStatistics, setAdminStatistics] = useState(EMPTY_ADMIN_STATISTICS);
  const [teamConfig, setTeamConfig] = useState(() =>
    normalizeTeamConfig(loadStoredCapacityConfig())
  );
  const [sharedState, setSharedState] = useState(EMPTY_SHARED_PORTAL_STATE);
  const [backendConnected, setBackendConnected] = useState(false);
  const [authSession, setAuthSessionState] = useState(getAuthSession);
  const [facultyPreferences, setFacultyPreferences] = useState(loadFacultyPreferences);

  const applyBootstrapPayload = useCallback((data) => {
    if (!data) {
      return;
    }

    setDepartments(Array.isArray(data.departments) ? data.departments : []);
    setStudents(Array.isArray(data.students) ? data.students : []);
    setFacultyList(
      Array.isArray(data.facultyList)
        ? data.facultyList.map((f) => ({
            ...f,
            office: f.office || (f.department ? `${f.department} Wing` : '--'),
          }))
        : []
    );

    if (data.adminStatistics) {
      setAdminStatistics({
        totalStudents: Number(data.adminStatistics.totalStudents) || 0,
        totalFaculty: Number(data.adminStatistics.totalFaculty) || 0,
        updatedAt: data.adminStatistics.updatedAt || null,
      });
    } else {
      setAdminStatistics(EMPTY_ADMIN_STATISTICS);
    }

    const normalizedConfig = normalizeTeamConfig(data.teamConfig);
    setTeamConfig(normalizedConfig);
    if (normalizedConfig.configured) {
      saveStoredCapacityConfig(normalizedConfig);
    } else {
      clearStoredCapacityConfig();
    }

    const teams = Array.isArray(data.teams) ? data.teams : [];
    const guideAllocations = Array.isArray(data.guideAllocations)
      ? data.guideAllocations
      : [];

    const maxTeamNum = teams.reduce(
      (maxVal, t) => Math.max(maxVal, Number(t.teamNumber) || 0),
      0
    );
    const maxAllocOrder = guideAllocations.reduce(
      (maxVal, a) => Math.max(maxVal, Number(a.allocationOrder) || 0),
      0
    );

    setSharedState({
      nextTeamNumber: maxTeamNum + 1,
      nextAllocationOrder: maxAllocOrder + 1,
      nextTopicNumber: 200,
      teams,
      teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : [],
      guideAllocations,
      projectTopics: Array.isArray(data.projectTopics)
        ? data.projectTopics
        : [],
      projectProgress: Array.isArray(data.projectProgress)
        ? data.projectProgress
        : [],
      notifications: Array.isArray(data.notifications)
        ? data.notifications
        : [],
    });
    setBackendConnected(true);
  }, []);

  const refreshPortalData = useCallback(
    async (sessionOverride = null) => {
      const activeSession = sessionOverride || getAuthSession();
      if (!activeSession?.token) {
        const healthy = await portalApi.pingHealth();
        setBackendConnected(healthy);
        return healthy;
      }

      try {
        const data = await portalApi.getBootstrap();
        applyBootstrapPayload(data);
        return true;
      } catch (err) {
        if (err?.status === 401 || err?.status === 403) {
          clearAuthSession();
          setAuthSessionState(null);
          const healthy = await portalApi.pingHealth();
          setBackendConnected(healthy);
          return false;
        }
        setBackendConnected(false);
        return false;
      }
    },
    [applyBootstrapPayload]
  );

  useEffect(() => {
    let active = true;

    async function initialize() {
      const existingSession = getAuthSession();
      let activeVerifiedSession = null;

      if (existingSession?.token) {
        try {
          const verified = await authApi.me();
          if (active && verified) {
            activeVerifiedSession = {
              token: verified.token || existingSession.token,
              username: verified.username,
              email: verified.email,
              role: verified.role,
              fullName: verified.fullName,
            };
            setAuthSession(activeVerifiedSession);
            setAuthSessionState(activeVerifiedSession);
          }
        } catch (err) {
          if (
            active &&
            (err.status === 400 ||
              err.status === 401 ||
              err.status === 403 ||
              err.status === 404)
          ) {
            clearAuthSession();
            setAuthSessionState(null);
          }
        }
      }

      if (active) {
        await refreshPortalData(activeVerifiedSession);
      }
    }

    initialize();
    return () => {
      active = false;
    };
  }, [refreshPortalData]);

  // --- Auth Helpers ---
  const loginWithCredentials = async (identifier, password, expectedRole) => {
    const res = await authApi.login(identifier, password, expectedRole);
    const session = {
      token: res.token,
      username: res.username,
      email: res.email,
      role: res.role,
      fullName: res.fullName,
    };
    setAuthSession(session);
    setAuthSessionState(session);
    await refreshPortalData(session);
    return res;
  };

  const activateFirstLoginAccount = async (
    identifier,
    newPassword,
    expectedRole
  ) => {
    const res = await authApi.firstLoginSetup(
      identifier,
      newPassword,
      expectedRole
    );
    const session = {
      token: res.token,
      username: res.username,
      email: res.email,
      role: res.role,
      fullName: res.fullName,
    };
    setAuthSession(session);
    setAuthSessionState(session);
    await refreshPortalData(session);
    return res;
  };

  const logoutAuth = useCallback(() => {
    clearAuthSession();
    setAuthSessionState(null);
    setDepartments([]);
    setStudents([]);
    setFacultyList([]);
    setAdminStatistics(EMPTY_ADMIN_STATISTICS);
    setSharedState(EMPTY_SHARED_PORTAL_STATE);
    setTeamConfig(EMPTY_TEAM_CONFIG);
  }, []);

  // --- Admin Actions ---
  const updateAdminStatistics = async (totalStudents, totalFaculty) => {
    const parsedStudents = Number(totalStudents);
    const parsedFaculty = Number(totalFaculty);

    if (
      !Number.isInteger(parsedStudents) ||
      parsedStudents < 0 ||
      !Number.isInteger(parsedFaculty) ||
      parsedFaculty < 0
    ) {
      return {
        ok: false,
        error: 'Total Students and Total Faculty must be non-negative whole numbers.',
      };
    }

    try {
      const updated = await portalApi.updateAdminStatistics(
        parsedStudents,
        parsedFaculty
      );
      setAdminStatistics({
        totalStudents: Number(updated.totalStudents) || 0,
        totalFaculty: Number(updated.totalFaculty) || 0,
        updatedAt: updated.updatedAt || null,
      });
      await refreshPortalData();
      return { ok: true, data: updated };
    } catch (err) {
      return {
        ok: false,
        error: err.message || 'Failed to save statistics to MySQL.',
      };
    }
  };

  const updateTeamConfig = async (payloadOrSize, maybeMaxTeams, maybeOptions = {}) => {
    const isObj =
      payloadOrSize && typeof payloadOrSize === 'object' && !Array.isArray(payloadOrSize);
    const parsedTeamSize = Number(
      isObj ? payloadOrSize.studentsPerTeam : payloadOrSize
    );
    const mode = String(
      isObj ? payloadOrSize.maxTeamsMode || 'manual' : maybeOptions.maxTeamsMode || 'manual'
    )
      .trim()
      .toLowerCase();
    const rawLimit = isObj ? payloadOrSize.maxTeamsPerFaculty : maybeMaxTeams;
    const parsedMaxFacultyTeams =
      rawLimit != null && rawLimit !== '' ? Number(rawLimit) : null;
    const rawCustom = isObj
      ? payloadOrSize.customMaxTeamsPerGuide
      : maybeOptions.customMaxTeamsPerGuide;
    const parsedCustom =
      rawCustom != null && rawCustom !== '' ? Number(rawCustom) : parsedMaxFacultyTeams;

    if (!Number.isInteger(parsedTeamSize) || parsedTeamSize < 1) {
      return {
        ok: false,
        error: 'Students Per Team must be a positive whole number (at least 1).',
      };
    }

    if (
      mode !== 'auto' &&
      (!Number.isInteger(parsedMaxFacultyTeams) || parsedMaxFacultyTeams < 1)
    ) {
      return {
        ok: false,
        error: 'Maximum Teams Per Guide must be a positive whole number (at least 1).',
      };
    }

    try {
      const updated = await portalApi.updateTeamSettings(
        parsedTeamSize,
        parsedMaxFacultyTeams,
        mode,
        parsedCustom
      );
      const normalized = normalizeTeamConfig(updated);
      setTeamConfig(normalized);
      if (normalized.configured) {
        saveStoredCapacityConfig(normalized);
      }
      await refreshPortalData();
      return { ok: true, data: normalized };
    } catch (err) {
      return {
        ok: false,
        error: err.message || 'Failed to save team configuration to MySQL.',
      };
    }
  };

  const adminDeleteTeam = async (teamId) => {
    try {
      await portalApi.adminDeleteTeam(teamId);
      await refreshPortalData();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || 'Failed to delete team.' };
    }
  };

  // --- Derived Admin Rules & Auto-Calculated Record Counts (Zero Hardcoding) ---
  const totalStudentsCount = backendConnected
    ? students.length
    : Number(adminStatistics.totalStudents) || 0;
  const totalFacultyCount = backendConnected
    ? facultyList.length
    : Number(adminStatistics.totalFaculty) || 0;

  const isAdminConfigAvailable = Boolean(
    teamConfig?.configured &&
      Number.isInteger(teamConfig.studentsPerTeam) &&
      teamConfig.studentsPerTeam > 0 &&
      Number.isInteger(teamConfig.maxTeamsPerFaculty) &&
      teamConfig.maxTeamsPerFaculty > 0
  );
  const maxTeamSize = isAdminConfigAvailable
    ? Number(teamConfig.studentsPerTeam)
    : null;
  const maxTeamsPerGuide = isAdminConfigAvailable
    ? Number(teamConfig.maxTeamsPerFaculty)
    : null;

  const savedCapacitySummary = useMemo(() => {
    if (!isAdminConfigAvailable) {
      return calculateCapacitySummary({
        totalStudents: totalStudentsCount,
        totalGuides: totalFacultyCount,
        studentsPerTeam: '',
        maxTeamsMode: 'auto',
        customMaxTeamsPerGuide: '',
      });
    }
    return calculateCapacitySummary({
      totalStudents: totalStudentsCount,
      totalGuides: totalFacultyCount,
      studentsPerTeam: teamConfig.studentsPerTeam,
      maxTeamsMode: teamConfig.maxTeamsMode || 'custom',
      customMaxTeamsPerGuide:
        teamConfig.customMaxTeamsPerGuide ?? teamConfig.maxTeamsPerFaculty,
    });
  }, [isAdminConfigAvailable, totalStudentsCount, totalFacultyCount, teamConfig]);

  const facultyProfiles = useMemo(
    () =>
      buildFacultyProfilesWithCapacity(
        facultyList,
        sharedState.guideAllocations,
        maxTeamsPerGuide
      ),
    [facultyList, sharedState.guideAllocations, maxTeamsPerGuide]
  );

  const unifiedAllocations = useMemo(
    () => buildUnifiedAllocationRecords(sharedState, facultyList),
    [sharedState, facultyList]
  );

  // --- Student Derived State (Strictly from Authenticated Student Session) ---
  const currentStudent = useMemo(() => {
    if (authSession?.role !== 'STUDENT' || !authSession?.username) {
      return null;
    }
    const matched = findStudentByRegisterNumber(students, authSession.username);
    if (matched) {
      return matched;
    }
    return {
      registerNumber: authSession.username,
      name: authSession.fullName || authSession.username,
      email: authSession.email || '--',
      department: '--',
      academicYear: '--',
      section: '--',
      semester: '--',
      accountStatus: 'ACTIVE',
    };
  }, [authSession, students]);

  const studentTeam = useMemo(
    () =>
      currentStudent
        ? findStudentTeam(sharedState, currentStudent.registerNumber)
        : null,
    [sharedState, currentStudent]
  );

  const studentRole = useMemo(
    () =>
      currentStudent
        ? getStudentRoleInTeam(studentTeam, currentStudent.registerNumber)
        : null,
    [studentTeam, currentStudent]
  );

  const isTeamLead = studentRole === 'Team Lead';

  const teamFormationStatus = useMemo(
    () => getTeamFormationStatus(studentTeam, maxTeamSize),
    [studentTeam, maxTeamSize]
  );

  const studentAllocationRecord = useMemo(() => {
    if (!studentTeam) {
      return null;
    }
    return (
      unifiedAllocations.find(
        (record) => record.teamId === studentTeam.teamId
      ) || null
    );
  }, [unifiedAllocations, studentTeam]);

  const allocationStatus = studentAllocationRecord
    ? ALLOCATION_STATUS.ALLOCATED
    : ALLOCATION_STATUS.NOT_ALLOCATED;

  // --- Faculty Derived State (Strictly from Authenticated Faculty Session) ---
  const currentFaculty = useMemo(() => {
    if (authSession?.role !== 'FACULTY' || !authSession?.username) {
      return null;
    }
    const matched = facultyProfiles.find(
      (f) =>
        String(f.facultyId || '').toLowerCase() ===
        String(authSession.username || '').toLowerCase()
    );
    if (matched) {
      return matched;
    }
    return {
      facultyId: authSession.username,
      facultyName: authSession.fullName || authSession.username,
      department: '--',
      designation: '--',
      specialization: '--',
      email: authSession.email || '--',
      office: '--',
      accountStatus: 'ACTIVE',
      maxTeamCapacity: maxTeamsPerGuide,
      assignedTeams: 0,
      availableSlots: maxTeamsPerGuide,
      availabilityStatus: maxTeamsPerGuide != null ? 'Available' : 'Not Configured',
      isOverLimit: false,
    };
  }, [authSession, facultyProfiles, maxTeamsPerGuide]);

  const facultyAllocatedTeams = useMemo(() => {
    if (!currentFaculty) {
      return [];
    }
    return unifiedAllocations
      .filter((record) => record.facultyId === currentFaculty.facultyId)
      .sort((a, b) => new Date(b.allocatedAt) - new Date(a.allocatedAt));
  }, [unifiedAllocations, currentFaculty]);

  const facultyMetrics = useMemo(() => {
    if (!currentFaculty) {
      return {
        totalAssignedTeams: 0,
        maximumTeamCapacity: maxTeamsPerGuide,
        availableTeamSlots: maxTeamsPerGuide,
        activeProjects: 0,
        completedProjects: 0,
        availabilityStatus: maxTeamsPerGuide != null ? 'Available' : 'Not Configured',
      };
    }
    const totalAssignedTeams = currentFaculty.assignedTeams;
    const maximumTeamCapacity = currentFaculty.maxTeamCapacity;
    const availableTeamSlots = currentFaculty.availableSlots;
    const completedProjects = facultyAllocatedTeams.filter(
      (t) => t.isCompleted
    ).length;
    const activeProjects = totalAssignedTeams - completedProjects;

    return {
      totalAssignedTeams,
      maximumTeamCapacity,
      availableTeamSlots,
      activeProjects,
      completedProjects,
      availabilityStatus: currentFaculty.availabilityStatus,
    };
  }, [currentFaculty, facultyAllocatedTeams, maxTeamsPerGuide]);

  const facultyTopics = useMemo(() => {
    if (!currentFaculty) {
      return [];
    }
    return sharedState.projectTopics.filter(
      (topic) => topic.facultyId === currentFaculty.facultyId
    );
  }, [sharedState.projectTopics, currentFaculty]);

  const facultyNotifications = useMemo(() => {
    if (!currentFaculty) {
      return [];
    }
    return sharedState.notifications.filter((item) => {
      const matchesAudience =
        item.audience === 'all_faculty' ||
        (item.audience === 'faculty' &&
          item.facultyId === currentFaculty.facultyId);
      if (!matchesAudience) {
        return false;
      }
      if (item.category === 'Team Allocation') {
        return facultyPreferences.notifyOnAllocation;
      }
      if (
        item.category === 'Progress Submission' ||
        item.category === 'Project Update'
      ) {
        return facultyPreferences.notifyOnProgress;
      }
      if (item.category === 'Admin Announcement') {
        return facultyPreferences.notifyOnAdminAnnouncement;
      }
      return true;
    });
  }, [sharedState.notifications, currentFaculty, facultyPreferences]);

  // --- Student Actions (Strict MySQL Persistence) ---
  const createTeam = async () => {
    if (!currentStudent) {
      return { ok: false, error: 'Student login session required.' };
    }
    if (!backendConnected) {
      return {
        ok: false,
        error: 'Backend server unavailable. Please start Spring Boot with MySQL.',
      };
    }
    if (!isAdminConfigAvailable) {
      return {
        ok: false,
        error:
          'Admin Configuration Required: Please ask the Admin to configure Students Per Team and Maximum Teams Per Faculty before creating a team.',
      };
    }
    try {
      const created = await portalApi.createTeam(currentStudent.registerNumber);
      await refreshPortalData();
      return { ok: true, team: created };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const searchStudent = (registerNumber) => {
    const found = findStudentByRegisterNumber(students, registerNumber);
    if (!found) {
      return { found: false, student: null, existingTeam: null };
    }
    const existingTeam = findStudentTeam(sharedState, found.registerNumber);
    return { found: true, student: found, existingTeam };
  };

  const addMember = async (targetRegisterNumber) => {
    if (!currentStudent || !studentTeam) {
      return { ok: false, error: 'Create a team first before adding members.' };
    }
    if (!isAdminConfigAvailable) {
      return {
        ok: false,
        error:
          'Admin Configuration Required: Team size settings must be configured by Admin before adding members.',
      };
    }
    try {
      const added = await portalApi.addTeamMember(
        studentTeam.teamId,
        currentStudent.registerNumber,
        targetRegisterNumber
      );
      await refreshPortalData();
      return { ok: true, addedMember: added };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const removeMember = async (memberRegNo) => {
    if (!currentStudent || !studentTeam) {
      return { ok: false, error: 'No active team found.' };
    }
    try {
      await portalApi.removeTeamMember(
        studentTeam.teamId,
        currentStudent.registerNumber,
        memberRegNo
      );
      await refreshPortalData();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const deleteTeam = async () => {
    if (!currentStudent || !studentTeam) {
      return { ok: false, error: 'No active team found.' };
    }
    try {
      await portalApi.deleteTeam(
        studentTeam.teamId,
        currentStudent.registerNumber
      );
      await refreshPortalData();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const selectGuide = async (facultyProfile) => {
    if (!isAdminConfigAvailable) {
      return {
        ok: false,
        error:
          'Admin Configuration Required: Guide capacity and team size must be configured by Admin before selecting a guide.',
      };
    }
    if (!currentStudent || !studentTeam) {
      return {
        ok: false,
        error: 'You must belong to a completed team to select a faculty guide.',
      };
    }
    try {
      const allocation = await portalApi.selectGuide(
        studentTeam.teamId,
        currentStudent.registerNumber,
        facultyProfile?.facultyId
      );
      await refreshPortalData();
      return { ok: true, allocation, faculty: facultyProfile };
    } catch (err) {
      await refreshPortalData();
      return { ok: false, error: err.message };
    }
  };

  const updateProjectTitle = async (newTitle) => {
    if (!currentStudent || !studentTeam || !isTeamLead) {
      return { ok: false, error: 'Only the Team Lead can update the project title.' };
    }
    try {
      await portalApi.updateProjectTitle(
        studentTeam.teamId,
        currentStudent.registerNumber,
        newTitle
      );
      await refreshPortalData();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const submitProgressNote = async (note) => {
    if (!currentStudent || !studentTeam) {
      return { ok: false, error: 'No active team found.' };
    }
    try {
      await portalApi.submitProgressNote(
        studentTeam.teamId,
        currentStudent.name,
        note
      );
      await refreshPortalData();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  // --- Faculty Actions ---
  const addTopic = async (topicInput) => {
    if (!currentFaculty) {
      return { ok: false, error: 'Faculty login session required.' };
    }
    try {
      const topic = await portalApi.addTopic({
        facultyId: currentFaculty.facultyId,
        ...topicInput,
      });
      await refreshPortalData();
      return { ok: true, topic };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const editTopic = async (topicId, topicInput) => {
    if (!currentFaculty) {
      return { ok: false, error: 'Faculty login session required.' };
    }
    try {
      const topic = await portalApi.updateTopic(topicId, {
        facultyId: currentFaculty.facultyId,
        ...topicInput,
      });
      await refreshPortalData();
      return { ok: true, topic };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const deleteTopic = async (topicId) => {
    if (!currentFaculty) {
      return { ok: false, error: 'Faculty login session required.' };
    }
    try {
      await portalApi.deleteTopic(topicId, currentFaculty.facultyId);
      await refreshPortalData();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const updateTeamProgress = async (teamId, payload) => {
    if (!currentFaculty) {
      return { ok: false, error: 'Faculty login session required.' };
    }
    try {
      await portalApi.updateProgress({
        teamId,
        facultyId: currentFaculty.facultyId,
        ...payload,
      });
      await refreshPortalData();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const updateFacultyPreferences = (nextPrefs) => {
    const merged = { ...facultyPreferences, ...nextPrefs };
    setFacultyPreferences(merged);
    try {
      localStorage.setItem(FACULTY_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Ignore storage errors
    }
    return merged;
  };

  // --- Admin Announcement Action ---
  const publishAnnouncement = async (title, message) => {
    const trimmedTitle = String(title || '').trim();
    const trimmedMessage = String(message || '').trim();
    if (!trimmedTitle || !trimmedMessage) {
      return {
        ok: false,
        error: 'Announcement title and message are required.',
      };
    }

    try {
      await portalApi.publishAnnouncement(trimmedTitle, trimmedMessage);
      await refreshPortalData();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const value = useMemo(
    () => ({
      // Connectivity & Auth
      backendConnected,
      refreshPortalData,
      departments,
      authSession,
      loginWithCredentials,
      activateFirstLoginAccount,
      logoutAuth,

      // Admin Statistics & Team/Guide Configuration
      adminStatistics,
      updateAdminStatistics,
      totalStudentsCount,
      totalFacultyCount,
      teamConfig,
      isAdminConfigAvailable,
      maxTeamSize,
      maxTeamsPerGuide,
      savedCapacitySummary,
      updateTeamConfig,
      adminDeleteTeam,
      publishAnnouncement,

      // Shared Data
      students,
      facultyList,
      facultyProfiles,
      teams: sharedState.teams,
      teamMembers: sharedState.teamMembers,
      guideAllocations: sharedState.guideAllocations,
      unifiedAllocations,

      // Student Portal
      currentStudent,
      studentTeam,
      studentRole,
      isTeamLead,
      teamFormationStatus,
      studentAllocationRecord,
      allocationStatus,
      availableGuides: facultyProfiles,
      createTeam,
      searchStudent,
      addMember,
      removeMember,
      deleteTeam,
      selectGuide,
      updateProjectTitle,
      submitProgressNote,

      // Faculty Portal
      currentFaculty,
      facultyAllocatedTeams,
      facultyMetrics,
      facultyTopics,
      facultyNotifications,
      addTopic,
      editTopic,
      deleteTopic,
      updateTeamProgress,
      facultyPreferences,
      updateFacultyPreferences,
    }),
    [
      backendConnected,
      refreshPortalData,
      departments,
      authSession,
      logoutAuth,
      adminStatistics,
      totalStudentsCount,
      totalFacultyCount,
      teamConfig,
      isAdminConfigAvailable,
      maxTeamSize,
      maxTeamsPerGuide,
      savedCapacitySummary,
      students,
      facultyList,
      sharedState,
      facultyProfiles,
      unifiedAllocations,
      currentStudent,
      studentTeam,
      studentRole,
      isTeamLead,
      teamFormationStatus,
      studentAllocationRecord,
      allocationStatus,
      currentFaculty,
      facultyAllocatedTeams,
      facultyMetrics,
      facultyTopics,
      facultyNotifications,
      facultyPreferences,
    ]
  );

  return (
    <PortalDataContext.Provider value={value}>
      {children}
    </PortalDataContext.Provider>
  );
}

export function usePortalData() {
  const context = useContext(PortalDataContext);
  if (!context) {
    throw new Error('usePortalData must be used inside a PortalDataProvider');
  }
  return context;
}
