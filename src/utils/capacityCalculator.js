export const CAPACITY_CONFIG_STORAGE_KEY = 'sgap_team_capacity_settings';

export const TEAM_SIZE_DROPDOWN_OPTIONS = [
  { label: '2 Students', value: '2' },
  { label: '3 Students', value: '3' },
  { label: '4 Students', value: '4' },
  { label: '5 Students', value: '5' },
];

export const MAX_TEAMS_PER_GUIDE_OPTIONS = [
  { label: 'Automatic Calculation', value: 'auto' },
  { label: '5 Teams', value: '5' },
  { label: '8 Teams', value: '8' },
  { label: '10 Teams', value: '10' },
  { label: '12 Teams', value: '12' },
  { label: 'Custom Value', value: 'custom' },
];

export const DEFAULT_CAPACITY_FORM_VALUES = {
  studentsPerTeam: '2',
  maxTeamsMode: 'auto',
  customMaxTeamsPerGuide: '',
};

const PRESET_TEAM_SIZES = new Set(['2', '3', '4', '5']);
const PRESET_GUIDE_LIMITS = new Set(['5', '8', '10', '12']);

export function parseNonNegativeInteger(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  const str = String(value ?? '').trim();
  if (!/^\d+$/.test(str)) {
    return null;
  }
  const num = Number(str);
  return Number.isSafeInteger(num) && num >= 0 ? num : null;
}

export function parsePositiveInteger(value) {
  const num = parseNonNegativeInteger(value);
  return num != null && num > 0 ? num : null;
}

export function calculateTotalTeams(totalStudents, studentsPerTeam) {
  const stu = parsePositiveInteger(totalStudents);
  const teamSize = parsePositiveInteger(studentsPerTeam);
  if (stu == null || teamSize == null) {
    return null;
  }
  return Math.ceil(stu / teamSize);
}

export function calculateTeamBreakdown(totalStudents, studentsPerTeam) {
  const stu = parsePositiveInteger(totalStudents);
  const teamSize = parsePositiveInteger(studentsPerTeam);
  if (stu == null || teamSize == null) {
    return {
      totalTeams: 0,
      fullTeams: 0,
      remainderStudents: 0,
      hasSmallerFinalTeam: false,
    };
  }

  const totalTeams = Math.ceil(stu / teamSize);
  const remainderStudents = stu % teamSize;
  const hasSmallerFinalTeam = remainderStudents !== 0;
  const fullTeams = hasSmallerFinalTeam ? Math.floor(stu / teamSize) : totalTeams;

  return {
    totalTeams,
    fullTeams,
    remainderStudents,
    hasSmallerFinalTeam,
  };
}

export function calculateRecommendedTeamsPerGuide(totalTeamsRequired, totalGuides) {
  const teams = parsePositiveInteger(totalTeamsRequired);
  const guides = parsePositiveInteger(totalGuides);
  if (teams == null || guides == null) {
    return null;
  }
  return Math.ceil(teams / guides);
}

export function resolveConfiguredTeamsPerGuide({
  maxTeamsMode,
  customMaxTeamsPerGuide,
  recommendedTeamsPerGuide,
}) {
  const mode = String(maxTeamsMode ?? '').trim().toLowerCase();
  if (mode === 'auto') {
    return parsePositiveInteger(recommendedTeamsPerGuide);
  }
  if (PRESET_GUIDE_LIMITS.has(mode)) {
    return Number(mode);
  }
  if (mode === 'custom' || mode === 'manual') {
    return parsePositiveInteger(customMaxTeamsPerGuide);
  }
  return parsePositiveInteger(mode);
}

export function validateCapacityConfiguration({
  totalStudents,
  totalGuides,
  studentsPerTeam,
  maxTeamsMode,
  customMaxTeamsPerGuide,
}) {
  const parsedStudents = parsePositiveInteger(totalStudents);
  const parsedGuides = parsePositiveInteger(totalGuides);
  const parsedTeamSize = parsePositiveInteger(studentsPerTeam);
  const mode = String(maxTeamsMode ?? '').trim().toLowerCase();

  const errors = {
    totalStudents: '',
    totalGuides: '',
    studentsPerTeam: '',
    maxTeamsPerGuide: '',
  };

  if (parsedStudents == null) {
    errors.totalStudents =
      'Total Students must be greater than zero. Import student records in Bulk Data Import first.';
  }

  if (parsedGuides == null) {
    errors.totalGuides =
      'Total Guides must be greater than zero. Import faculty records in Bulk Data Import first.';
  }

  if (parsedTeamSize == null) {
    errors.studentsPerTeam = 'Students Per Team must be a positive whole number (> 0).';
  }

  if (mode === 'custom' || mode === 'manual') {
    if (parsePositiveInteger(customMaxTeamsPerGuide) == null) {
      errors.maxTeamsPerGuide =
        'Maximum Teams Per Guide must be a positive integer (at least 1).';
    }
  } else if (mode === 'auto') {
    const totalTeams = calculateTotalTeams(parsedStudents, parsedTeamSize);
    const recommended = calculateRecommendedTeamsPerGuide(totalTeams, parsedGuides);
    if (recommended == null && parsedStudents != null && parsedGuides != null && parsedTeamSize != null) {
      errors.maxTeamsPerGuide = 'Unable to compute automatic teams per guide.';
    }
  } else if (!PRESET_GUIDE_LIMITS.has(mode) && parsePositiveInteger(mode) == null) {
    errors.maxTeamsPerGuide = 'Maximum Teams Per Guide must be a positive integer.';
  }

  const firstError =
    errors.totalStudents ||
    errors.totalGuides ||
    errors.studentsPerTeam ||
    errors.maxTeamsPerGuide ||
    '';

  return {
    isValid: !firstError,
    errors,
    firstError,
  };
}

export function calculateCapacitySummary({
  totalStudents,
  totalGuides,
  studentsPerTeam,
  maxTeamsMode,
  customMaxTeamsPerGuide,
}) {
  const totalStudentsCount = parseNonNegativeInteger(totalStudents) ?? 0;
  const totalGuidesCount = parseNonNegativeInteger(totalGuides) ?? 0;
  const studentsPerTeamCount = parsePositiveInteger(studentsPerTeam);

  const totalTeamsRequired = calculateTotalTeams(
    totalStudentsCount,
    studentsPerTeamCount
  );
  const teamBreakdown = calculateTeamBreakdown(
    totalStudentsCount,
    studentsPerTeamCount
  );
  const recommendedTeamsPerGuide = calculateRecommendedTeamsPerGuide(
    totalTeamsRequired,
    totalGuidesCount
  );
  const configuredTeamsPerGuide = resolveConfiguredTeamsPerGuide({
    maxTeamsMode,
    customMaxTeamsPerGuide,
    recommendedTeamsPerGuide,
  });

  const totalGuideCapacity =
    totalGuidesCount > 0 && configuredTeamsPerGuide != null
      ? totalGuidesCount * configuredTeamsPerGuide
      : null;

  const canCompareCapacity =
    totalTeamsRequired != null && totalGuideCapacity != null;

  const remainingTeamSlots = canCompareCapacity
    ? totalGuideCapacity - totalTeamsRequired
    : null;
  const surplusTeamSlots =
    remainingTeamSlots != null ? Math.max(0, remainingTeamSlots) : null;
  const shortfallTeamSlots =
    remainingTeamSlots != null ? Math.max(0, -remainingTeamSlots) : 0;

  const isCapacityInsufficient =
    canCompareCapacity && totalGuideCapacity < totalTeamsRequired;

  let capacityStatus = 'Incomplete Inputs';
  let capacityStatusVariant = 'warning';
  if (canCompareCapacity) {
    if (isCapacityInsufficient) {
      capacityStatus = 'Insufficient Capacity';
      capacityStatusVariant = 'danger';
    } else {
      capacityStatus = 'Sufficient Capacity';
      capacityStatusVariant = 'success';
    }
  }

  const validation = validateCapacityConfiguration({
    totalStudents: totalStudentsCount,
    totalGuides: totalGuidesCount,
    studentsPerTeam,
    maxTeamsMode,
    customMaxTeamsPerGuide,
  });

  return {
    totalStudentsCount,
    totalGuidesCount,
    studentsPerTeamCount,
    totalTeamsRequired,
    teamBreakdown,
    recommendedTeamsPerGuide,
    configuredTeamsPerGuide,
    totalGuideCapacity,
    remainingTeamSlots,
    surplusTeamSlots,
    shortfallTeamSlots,
    canCompareCapacity,
    isCapacityInsufficient,
    capacityStatus,
    capacityStatusVariant,
    validation,
  };
}

export function buildFormValuesFromTeamConfig(teamConfig) {
  if (!teamConfig?.configured) {
    return { ...DEFAULT_CAPACITY_FORM_VALUES };
  }

  const studentsPerTeamStr =
    teamConfig.studentsPerTeam != null
      ? String(teamConfig.studentsPerTeam)
      : DEFAULT_CAPACITY_FORM_VALUES.studentsPerTeam;

  const savedMode = String(teamConfig.maxTeamsMode ?? '').trim().toLowerCase();
  const limitStr =
    teamConfig.maxTeamsPerFaculty != null
      ? String(teamConfig.maxTeamsPerFaculty)
      : '';

  if (savedMode === 'auto') {
    return {
      studentsPerTeam: studentsPerTeamStr,
      maxTeamsMode: 'auto',
      customMaxTeamsPerGuide: '',
    };
  }

  if (PRESET_GUIDE_LIMITS.has(savedMode)) {
    return {
      studentsPerTeam: studentsPerTeamStr,
      maxTeamsMode: savedMode,
      customMaxTeamsPerGuide: '',
    };
  }

  if (PRESET_GUIDE_LIMITS.has(limitStr) && savedMode !== 'custom') {
    return {
      studentsPerTeam: studentsPerTeamStr,
      maxTeamsMode: limitStr,
      customMaxTeamsPerGuide: '',
    };
  }

  return {
    studentsPerTeam: studentsPerTeamStr,
    maxTeamsMode: 'custom',
    customMaxTeamsPerGuide:
      teamConfig.customMaxTeamsPerGuide != null
        ? String(teamConfig.customMaxTeamsPerGuide)
        : limitStr,
  };
}

export function isPresetTeamSize(value) {
  return PRESET_TEAM_SIZES.has(String(value ?? ''));
}

export function loadStoredCapacityConfig() {
  try {
    const raw = localStorage.getItem(CAPACITY_CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredCapacityConfig(config) {
  try {
    if (!config) {
      localStorage.removeItem(CAPACITY_CONFIG_STORAGE_KEY);
      return;
    }
    localStorage.setItem(CAPACITY_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearStoredCapacityConfig() {
  saveStoredCapacityConfig(null);
}

