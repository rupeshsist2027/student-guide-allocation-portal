import { PROJECT_PROGRESS_STAGES } from '../constants/portalConstants.js';

export const FACULTY_SETTINGS_STORAGE_KEY = 'sgap_faculty_preferences';

export const TEAM_FORMATION_STATUS = {
  NOT_CREATED: 'Not Created',
  IN_PROGRESS: 'Formation in Progress',
  COMPLETED: 'Team Completed',
  EXCEEDS_LIMIT: 'Exceeds Admin Limit',
};

export const ALLOCATION_STATUS = {
  NOT_ALLOCATED: 'Not Allocated',
  ALLOCATED: 'Allocated',
};

export function formatTeamId(teamNumber) {
  return `TEAM-${String(teamNumber).padStart(3, '0')}`;
}

export function formatAllocationId(order) {
  return `ALC-${String(order + 100).padStart(3, '0')}`;
}

export function formatTopicId(num) {
  return `TOP-${String(num).padStart(3, '0')}`;
}

export function formatDisplayDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function findStudentByRegisterNumber(students, registerNumber) {
  const normalized = String(registerNumber || '').trim().toLowerCase();
  if (!normalized || !Array.isArray(students)) {
    return null;
  }
  return (
    students.find(
      (student) => String(student.registerNumber || '').toLowerCase() === normalized
    ) || null
  );
}

/**
 * Joins a team with its members, allocation, and progress from MySQL-backed portal arrays.
 */
export function getEnrichedTeam(state, teamId) {
  const team = state.teams.find((t) => t.teamId === teamId);
  if (!team) {
    return null;
  }

  const members = state.teamMembers.filter((m) => m.teamId === teamId);
  const allocation =
    state.guideAllocations.find((a) => a.teamId === teamId) || null;
  const progress =
    state.projectProgress.find((p) => p.teamId === teamId) || null;

  return {
    ...team,
    members,
    allocation,
    progress,
  };
}

export function findStudentTeam(state, registerNumber) {
  const normalized = String(registerNumber || '').trim();
  if (!normalized || !state?.teamMembers) {
    return null;
  }
  const membership = state.teamMembers.find(
    (member) => member.registerNumber === normalized
  );
  if (!membership) {
    return null;
  }
  return getEnrichedTeam(state, membership.teamId);
}

export function getStudentRoleInTeam(team, registerNumber) {
  if (!team || !registerNumber) {
    return null;
  }
  if (team.leadRegisterNumber === registerNumber) {
    return 'Team Lead';
  }
  const isMember = team.members.some(
    (member) => member.registerNumber === registerNumber
  );
  return isMember ? 'Member' : null;
}

export function getTeamFormationStatus(team, configuredTeamSize) {
  if (!team) {
    return TEAM_FORMATION_STATUS.NOT_CREATED;
  }
  if (!Number.isInteger(configuredTeamSize) || configuredTeamSize <= 0) {
    return TEAM_FORMATION_STATUS.IN_PROGRESS;
  }
  if (team.members.length > configuredTeamSize) {
    return TEAM_FORMATION_STATUS.EXCEEDS_LIMIT;
  }
  if (team.members.length === configuredTeamSize) {
    return TEAM_FORMATION_STATUS.COMPLETED;
  }
  return TEAM_FORMATION_STATUS.IN_PROGRESS;
}

/**
 * Counts assigned teams for a faculty member directly from actual Guide Allocations.
 */
export function countAssignedTeamsForFaculty(guideAllocations, facultyId) {
  return guideAllocations.filter(
    (allocation) =>
      allocation.facultyId === facultyId &&
      allocation.status === ALLOCATION_STATUS.ALLOCATED
  ).length;
}

/**
 * Builds faculty availability & capacity profiles directly from actual allocated teams
 * and the Admin-configured per-guide limit.
 */
export function buildFacultyProfilesWithCapacity(
  facultyList,
  guideAllocations,
  maxTeamsPerGuide
) {
  const hasConfiguredLimit =
    Number.isInteger(maxTeamsPerGuide) && maxTeamsPerGuide > 0;
  const maxCapacity = hasConfiguredLimit ? maxTeamsPerGuide : null;

  return facultyList.map((faculty) => {
    const assignedTeams = countAssignedTeamsForFaculty(
      guideAllocations,
      faculty.facultyId
    );
    if (!hasConfiguredLimit) {
      return {
        ...faculty,
        maxTeamCapacity: null,
        assignedTeams,
        availableSlots: null,
        availabilityStatus: 'Not Configured',
        isOverLimit: false,
      };
    }

    const availableSlots = Math.max(0, maxCapacity - assignedTeams);
    const isOverLimit = assignedTeams > maxCapacity;
    const availabilityStatus = availableSlots > 0 ? 'Available' : 'Full';

    return {
      ...faculty,
      maxTeamCapacity: maxCapacity,
      assignedTeams,
      availableSlots,
      availabilityStatus,
      isOverLimit,
    };
  });
}

/**
 * Joins shared Allocations, Teams, Team Members, Faculty, and Progress into unified records
 * for Faculty My Teams, Faculty Project Progress, and Admin Guide Allocation.
 */
export function buildUnifiedAllocationRecords(state, facultyList) {
  return state.guideAllocations.map((allocation) => {
    const team = state.teams.find((t) => t.teamId === allocation.teamId);
    const members = state.teamMembers.filter((m) => m.teamId === allocation.teamId);
    const leadMember =
      members.find((m) => m.registerNumber === team?.leadRegisterNumber) || members[0];
    const faculty = facultyList.find((f) => f.facultyId === allocation.facultyId);
    const progress = state.projectProgress.find(
      (p) => p.teamId === allocation.teamId
    );

    const stage = progress?.stage || PROJECT_PROGRESS_STAGES[0];
    const isCompleted = stage === 'Final Submission';

    return {
      ...allocation,
      teamName: team?.teamName || allocation.teamId,
      department: team?.department || '--',
      projectTitle: team?.projectTitle || 'Topic Not Finalized',
      leadName: leadMember?.name || '--',
      leadRegisterNumber:
        leadMember?.registerNumber || team?.leadRegisterNumber || '--',
      members,
      facultyName: faculty?.facultyName || allocation.facultyId,
      facultyEmail: faculty?.email || '--',
      facultyDepartment: faculty?.department || '--',
      stage,
      feedback: progress?.feedback || '',
      progressUpdatedDate: progress?.updatedDate || allocation.allocationDate,
      isCompleted,
    };
  });
}
