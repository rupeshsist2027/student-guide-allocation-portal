import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sliders,
  Calculator,
  BookOpen,
  Users,
  Save,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { usePortalData } from '../../context/PortalDataContext';
import {
  buildFormValuesFromTeamConfig,
  calculateCapacitySummary,
  DEFAULT_CAPACITY_FORM_VALUES,
  isPresetTeamSize,
  MAX_TEAMS_PER_GUIDE_OPTIONS,
  TEAM_SIZE_DROPDOWN_OPTIONS,
} from '../../utils/capacityCalculator';
import { getTeamFormationStatus, TEAM_FORMATION_STATUS } from '../../utils/portalAllocation';

function formatUpdatedTimestamp(value) {
  if (!value) {
    return 'Not saved yet';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFacultyBadgeVariant(status, isOverLimit) {
  if (status === 'Not Configured') {
    return 'warning';
  }
  if (isOverLimit || status === 'Full') {
    return 'danger';
  }
  return 'success';
}

function getTeamStatusVariant(status) {
  if (status === TEAM_FORMATION_STATUS.COMPLETED) {
    return 'success';
  }
  if (status === TEAM_FORMATION_STATUS.EXCEEDS_LIMIT) {
    return 'danger';
  }
  return 'warning';
}

const FACULTY_COLUMNS = [
  { key: 'facultyId', label: 'Faculty ID' },
  { key: 'facultyName', label: 'Faculty Name' },
  { key: 'department', label: 'Department' },
  {
    key: 'maxTeamCapacity',
    label: 'Maximum Team Capacity',
    render: (row) => (row.maxTeamCapacity != null ? row.maxTeamCapacity : 'Not Set'),
  },
  { key: 'assignedTeams', label: 'Currently Assigned Teams' },
  {
    key: 'availableSlots',
    label: 'Remaining Team Slots',
    render: (row) => (row.availableSlots != null ? row.availableSlots : 'Not Set'),
  },
  {
    key: 'availabilityStatus',
    label: 'Availability',
    render: (row) => (
      <StatusBadge
        text={row.isOverLimit ? 'Over Limit' : row.availabilityStatus}
        variant={getFacultyBadgeVariant(row.availabilityStatus, row.isOverLimit)}
      />
    ),
  },
];

function TeamSettings() {
  const {
    backendConnected,
    totalStudentsCount,
    totalFacultyCount,
    teamConfig,
    isAdminConfigAvailable,
    maxTeamSize,
    maxTeamsPerGuide,
    updateTeamConfig,
    adminDeleteTeam,
    facultyProfiles,
    teams,
    teamMembers,
    guideAllocations,
    students,
  } = usePortalData();

  const [studentsPerTeam, setStudentsPerTeam] = useState(
    DEFAULT_CAPACITY_FORM_VALUES.studentsPerTeam
  );
  const [maxTeamsMode, setMaxTeamsMode] = useState(
    DEFAULT_CAPACITY_FORM_VALUES.maxTeamsMode
  );
  const [customMaxTeamsPerGuide, setCustomMaxTeamsPerGuide] = useState(
    DEFAULT_CAPACITY_FORM_VALUES.customMaxTeamsPerGuide
  );
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [teamToDelete, setTeamToDelete] = useState(null);

  useEffect(() => {
    if (isAdminConfigAvailable) {
      const synced = buildFormValuesFromTeamConfig(teamConfig);
      setStudentsPerTeam(synced.studentsPerTeam);
      setMaxTeamsMode(synced.maxTeamsMode);
      setCustomMaxTeamsPerGuide(synced.customMaxTeamsPerGuide);
      setAttemptedSave(false);
    }
  }, [
    isAdminConfigAvailable,
    teamConfig.studentsPerTeam,
    teamConfig.maxTeamsPerFaculty,
    teamConfig.maxTeamsMode,
    teamConfig.customMaxTeamsPerGuide,
  ]);

  const capacitySummary = useMemo(
    () =>
      calculateCapacitySummary({
        totalStudents: totalStudentsCount,
        totalGuides: totalFacultyCount,
        studentsPerTeam,
        maxTeamsMode,
        customMaxTeamsPerGuide,
      }),
    [
      totalStudentsCount,
      totalFacultyCount,
      studentsPerTeam,
      maxTeamsMode,
      customMaxTeamsPerGuide,
    ]
  );

  const teamSizeSelectOptions = useMemo(() => {
    if (
      studentsPerTeam &&
      !isPresetTeamSize(studentsPerTeam) &&
      Number.isInteger(Number(studentsPerTeam)) &&
      Number(studentsPerTeam) > 0
    ) {
      return [
        ...TEAM_SIZE_DROPDOWN_OPTIONS,
        {
          label: `${studentsPerTeam} Students (Saved)`,
          value: String(studentsPerTeam),
        },
      ];
    }
    return TEAM_SIZE_DROPDOWN_OPTIONS;
  }, [studentsPerTeam]);

  const teamRows = useMemo(() => {
    return teams
      .map((team) => {
        const members = teamMembers.filter((m) => m.teamId === team.teamId);
        const leadMember =
          members.find((m) => m.registerNumber === team.leadRegisterNumber) || null;
        const matchedStudent = students.find(
          (s) => s.registerNumber === team.leadRegisterNumber
        );
        const allocation =
          guideAllocations.find((a) => a.teamId === team.teamId) || null;
        const formationStatus = getTeamFormationStatus(
          { ...team, members },
          maxTeamSize
        );
        const guideProfile = allocation
          ? facultyProfiles.find((f) => f.facultyId === allocation.facultyId)
          : null;

        return {
          ...team,
          membersCount: members.length,
          leadDisplay: leadMember?.name
            ? `${leadMember.name} (${team.leadRegisterNumber})`
            : matchedStudent?.name
              ? `${matchedStudent.name} (${team.leadRegisterNumber})`
              : team.leadRegisterNumber,
          formationStatus,
          allocation,
          guideDisplay: allocation
            ? guideProfile
              ? `${guideProfile.facultyName} (${allocation.facultyId})`
              : allocation.facultyId
            : 'Not Allocated',
        };
      })
      .sort((a, b) => (a.teamNumber || 0) - (b.teamNumber || 0));
  }, [teams, teamMembers, guideAllocations, students, maxTeamSize, facultyProfiles]);

  const handleSave = async (event) => {
    event.preventDefault();
    setAttemptedSave(true);
    setFeedback(null);

    if (!backendConnected) {
      setFeedback({
        variant: 'danger',
        title: 'Backend Unavailable',
        message:
          'Connect to Spring Boot & MySQL before saving Team & Guide Capacity Settings.',
      });
      return;
    }

    if (!capacitySummary.validation.isValid) {
      setFeedback({
        variant: 'danger',
        title: 'Invalid Configuration',
        message: capacitySummary.validation.firstError,
      });
      return;
    }

    setSaving(true);
    const result = await updateTeamConfig({
      studentsPerTeam: capacitySummary.studentsPerTeamCount,
      maxTeamsPerFaculty: capacitySummary.configuredTeamsPerGuide,
      maxTeamsMode,
      customMaxTeamsPerGuide:
        maxTeamsMode === 'custom'
          ? capacitySummary.configuredTeamsPerGuide
          : null,
    });
    setSaving(false);

    if (!result.ok) {
      setFeedback({
        variant: 'danger',
        title: 'Save Failed',
        message: result.error,
      });
      return;
    }

    setAttemptedSave(false);
    setFeedback({
      variant: 'success',
      title: 'Configuration Saved Successfully',
      message: `Saved ${result.data.studentsPerTeam} Students/Team and ${result.data.maxTeamsPerFaculty} Teams/Guide (${capacitySummary.totalTeamsRequired} Total Teams calculated across ${capacitySummary.totalStudentsCount} students and ${capacitySummary.totalGuidesCount} guides).`,
    });
  };

  const handleReset = () => {
    setStudentsPerTeam(DEFAULT_CAPACITY_FORM_VALUES.studentsPerTeam);
    setMaxTeamsMode(DEFAULT_CAPACITY_FORM_VALUES.maxTeamsMode);
    setCustomMaxTeamsPerGuide(DEFAULT_CAPACITY_FORM_VALUES.customMaxTeamsPerGuide);
    setAttemptedSave(false);
    setFeedback({
      variant: 'info',
      title: 'Form Inputs Reset',
      message:
        'Reset inputs to 2 Students Per Team and Automatic Calculation. Click Save Configuration to store changes.',
    });
  };

  const handleConfirmDeleteTeam = async () => {
    if (!teamToDelete) {
      return;
    }
    const target = teamToDelete;
    setTeamToDelete(null);
    const res = await adminDeleteTeam(target.teamId);
    if (!res.ok) {
      setFeedback({
        variant: 'danger',
        title: 'Delete Failed',
        message: res.error,
      });
      return;
    }
    setFeedback({
      variant: 'info',
      title: `${target.teamName} Deleted`,
      message: `${target.teamName} (${target.teamId}) was removed. Team number ${target.teamNumber} will remain retired and will not be reused.`,
    });
  };

  const showCustomError =
    maxTeamsMode === 'custom' &&
    Boolean(capacitySummary.validation.errors.maxTeamsPerGuide) &&
    (attemptedSave || customMaxTeamsPerGuide.trim() !== '');

  return (
    <div>
      <div className="page-header-row">
        <PageHeader
          title="Team & Guide Capacity Settings"
          subtitle="Configure team formation size and faculty mentorship capacity using auto-calculated student and faculty counts."
        />
        <span className="max-team-size-pill">
          {isAdminConfigAvailable
            ? `Active Rules: ${maxTeamSize} Students / Team · ${maxTeamsPerGuide} Teams / Guide`
            : 'Configuration Status: Not Set'}
        </span>
      </div>

      {!isAdminConfigAvailable && (
        <AlertBanner
          variant="warning"
          title="Admin Configuration Required"
          message="Students cannot create teams or select faculty guides until valid Team & Guide Capacity Settings are saved."
        />
      )}

      {(totalStudentsCount === 0 || totalFacultyCount === 0) && (
        <AlertBanner
          variant="info"
          title="Student & Faculty Records Drive Capacity Calculations"
          message={
            <span>
              Total Students ({totalStudentsCount}) and Total Guides ({totalFacultyCount}) are directly calculated and stored when records are imported via{' '}
              <Link to="/admin/bulk-import" style={{ fontWeight: 700, textDecoration: 'underline' }}>
                Bulk Data Import
              </Link>
              .
            </span>
          }
        />
      )}

      {feedback && (
        <AlertBanner
          variant={feedback.variant}
          title={feedback.title}
          message={feedback.message}
        />
      )}

      <div className="config-layout">
        <SectionCard
          title="Capacity Configuration"
          subtitle={`Last saved: ${formatUpdatedTimestamp(teamConfig?.updatedAt)}`}
          icon={Sliders}
        >
          <form className="config-form-fields" onSubmit={handleSave} noValidate>
            <div className="cards-grid-2">
              <div className="form-group">
                <label htmlFor="admin-total-students" className="form-label">
                  1. Total Students
                </label>
                <input
                  id="admin-total-students"
                  type="number"
                  readOnly
                  className={`form-input form-input--readonly ${
                    attemptedSave && capacitySummary.validation.errors.totalStudents
                      ? 'is-invalid'
                      : ''
                  }`}
                  value={totalStudentsCount}
                />
                {attemptedSave && capacitySummary.validation.errors.totalStudents ? (
                  <span className="form-error">
                    {capacitySummary.validation.errors.totalStudents}
                  </span>
                ) : (
                  <span className="form-hint">
                    Auto-calculated &amp; stored when student records are imported.
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="admin-total-guides" className="form-label">
                  2. Total Guides
                </label>
                <input
                  id="admin-total-guides"
                  type="number"
                  readOnly
                  className={`form-input form-input--readonly ${
                    attemptedSave && capacitySummary.validation.errors.totalGuides
                      ? 'is-invalid'
                      : ''
                  }`}
                  value={totalFacultyCount}
                />
                {attemptedSave && capacitySummary.validation.errors.totalGuides ? (
                  <span className="form-error">
                    {capacitySummary.validation.errors.totalGuides}
                  </span>
                ) : (
                  <span className="form-hint">
                    Auto-calculated &amp; stored when faculty records are imported.
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="admin-students-per-team" className="form-label">
                3. Students Per Team
              </label>
              <select
                id="admin-students-per-team"
                className="form-input"
                value={studentsPerTeam}
                onChange={(e) => {
                  setStudentsPerTeam(e.target.value);
                  setFeedback(null);
                }}
              >
                {teamSizeSelectOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {attemptedSave && capacitySummary.validation.errors.studentsPerTeam && (
                <span className="form-error">
                  {capacitySummary.validation.errors.studentsPerTeam}
                </span>
              )}
              <span className="form-hint">
                Students must fill their team to this size before selecting a faculty guide. Remainder students form one smaller final team.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="admin-max-teams-guide" className="form-label">
                4. Maximum Teams Per Guide
              </label>
              <select
                id="admin-max-teams-guide"
                className="form-input"
                value={maxTeamsMode}
                onChange={(e) => {
                  setMaxTeamsMode(e.target.value);
                  setFeedback(null);
                }}
              >
                {MAX_TEAMS_PER_GUIDE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {maxTeamsMode === 'custom' && (
                <input
                  id="admin-custom-max-teams-guide"
                  type="number"
                  min={1}
                  step={1}
                  className={`form-input ${showCustomError ? 'is-invalid' : ''}`}
                  placeholder="Enter custom maximum teams per guide"
                  value={customMaxTeamsPerGuide}
                  onChange={(e) => {
                    setCustomMaxTeamsPerGuide(e.target.value);
                    setFeedback(null);
                  }}
                />
              )}

              {(showCustomError ||
                (attemptedSave && capacitySummary.validation.errors.maxTeamsPerGuide)) && (
                <span className="form-error">
                  {capacitySummary.validation.errors.maxTeamsPerGuide}
                </span>
              )}

              <span className="form-hint">
                {maxTeamsMode === 'auto'
                  ? 'Automatic Calculation uses Ceiling(Total Teams / Total Guides) and auto-recalculates when new records are imported.'
                  : 'Faculty guides become Full once allocated teams reach this configured limit.'}
              </span>
            </div>

            <div className="config-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !backendConnected}
              >
                <Save size={16} />
                <span>{saving ? 'Saving Configuration...' : 'Save Configuration'}</span>
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleReset}
                disabled={saving}
              >
                <RotateCcw size={16} />
                <span>Reset</span>
              </button>
              {(totalStudentsCount === 0 || totalFacultyCount === 0) && (
                <Link to="/admin/bulk-import" className="btn btn-outline">
                  <Upload size={16} />
                  <span>Import Records</span>
                </Link>
              )}
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Capacity Comparison & Live Calculation"
          subtitle="Updates immediately as inputs change"
          icon={Calculator}
        >
          {capacitySummary.isCapacityInsufficient && (
            <AlertBanner
              variant="danger"
              title="Insufficient Guide Capacity Warning"
              message={`Total Guide Capacity (${capacitySummary.totalGuideCapacity} team slots) is less than Total Teams Required (${capacitySummary.totalTeamsRequired} teams) by ${capacitySummary.shortfallTeamSlots} team slot${capacitySummary.shortfallTeamSlots === 1 ? '' : 's'}. Switch to Automatic Calculation, increase Maximum Teams Per Guide, or import more guides.`}
            />
          )}

          <div className="info-list">
            <div className="info-row">
              <span className="info-key">Total Teams Required</span>
              <span className="info-val" data-testid="calc-total-teams-required">
                {capacitySummary.totalTeamsRequired != null
                  ? `${capacitySummary.totalTeamsRequired} Teams`
                  : '--'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Total Guide Capacity</span>
              <span className="info-val" data-testid="calc-total-guide-capacity">
                {capacitySummary.totalGuideCapacity != null
                  ? `${capacitySummary.totalGuideCapacity} Team Slots`
                  : '--'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Recommended Teams Per Guide</span>
              <span className="info-val" data-testid="calc-recommended-per-guide">
                {capacitySummary.recommendedTeamsPerGuide != null
                  ? `${capacitySummary.recommendedTeamsPerGuide} Teams`
                  : '--'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Configured Teams Per Guide</span>
              <span className="info-val" data-testid="calc-configured-per-guide">
                {capacitySummary.configuredTeamsPerGuide != null
                  ? `${capacitySummary.configuredTeamsPerGuide} Teams${
                      maxTeamsMode === 'auto' ? ' (Auto)' : ''
                    }`
                  : '--'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Remaining Team Slots</span>
              <span className="info-val" data-testid="calc-remaining-slots">
                {!capacitySummary.canCompareCapacity ? (
                  '--'
                ) : capacitySummary.isCapacityInsufficient ? (
                  <span className="capacity-text-danger">
                    0 Available ({capacitySummary.shortfallTeamSlots} Slots Short)
                  </span>
                ) : capacitySummary.surplusTeamSlots === 0 ? (
                  <span className="capacity-text-success">
                    0 Surplus (Exact Capacity Match)
                  </span>
                ) : (
                  <span className="capacity-text-success">
                    {capacitySummary.surplusTeamSlots} Team Slots Surplus
                  </span>
                )}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Capacity Status</span>
              <span className="info-val" data-testid="calc-capacity-status">
                <StatusBadge
                  text={capacitySummary.capacityStatus}
                  variant={capacitySummary.capacityStatusVariant}
                />
              </span>
            </div>
          </div>

          <div className="team-breakdown-box">
            <p className="team-breakdown-title">Calculation Breakdown</p>
            <p className="team-breakdown-text">
              {capacitySummary.totalTeamsRequired != null ? (
                <>
                  &bull; <strong>Teams Formula:</strong> Ceiling({capacitySummary.totalStudentsCount} &divide;{' '}
                  {capacitySummary.studentsPerTeamCount}) ={' '}
                  <strong>{capacitySummary.totalTeamsRequired} Teams</strong>{' '}
                  {capacitySummary.teamBreakdown.hasSmallerFinalTeam
                    ? `(${capacitySummary.teamBreakdown.fullTeams} full team${
                        capacitySummary.teamBreakdown.fullTeams === 1 ? '' : 's'
                      } of ${capacitySummary.studentsPerTeamCount} + 1 smaller final team of ${
                        capacitySummary.teamBreakdown.remainderStudents
                      })`
                    : '(equal team distribution)'}
                  <br />
                  {capacitySummary.recommendedTeamsPerGuide != null && (
                    <>
                      &bull; <strong>Auto Guide Formula:</strong> Ceiling({capacitySummary.totalTeamsRequired} &divide;{' '}
                      {capacitySummary.totalGuidesCount}) ={' '}
                      <strong>{capacitySummary.recommendedTeamsPerGuide} Teams / Guide</strong>
                      <br />
                    </>
                  )}
                  {capacitySummary.totalGuideCapacity != null && (
                    <>
                      &bull; <strong>Guide Pool Capacity:</strong> {capacitySummary.totalGuidesCount} Guides &times;{' '}
                      {capacitySummary.configuredTeamsPerGuide} Teams ={' '}
                      <strong>{capacitySummary.totalGuideCapacity} Team Slots</strong>
                    </>
                  )}
                </>
              ) : (
                'Import student and faculty records in Bulk Data Import and select valid positive integers to preview team and guide capacity calculations.'
              )}
            </p>
          </div>
        </SectionCard>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <SectionCard
          title="Faculty Guide Capacity Overview"
          subtitle="Guide mentorship slots prepared from active MySQL allocation counts"
          icon={BookOpen}
          flush
        >
          <DataTable
            columns={FACULTY_COLUMNS}
            rows={facultyProfiles}
            emptyMessage="No faculty records imported yet."
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Formed Project Teams"
        subtitle={`${teamRows.length} Active Team${teamRows.length === 1 ? '' : 's'}`}
        icon={Users}
        flush
      >
        {teamRows.length === 0 ? (
          <div style={{ padding: '22px' }}>
            <div className="empty-state-box">
              <p className="empty-state-title">No Teams Formed Yet</p>
              <p className="empty-state-desc">
                Teams created by students will appear here with sequential Team IDs.
              </p>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Team ID</th>
                  <th>Team Name</th>
                  <th>Team Lead</th>
                  <th>Members</th>
                  <th>Formation Status</th>
                  <th>Allocated Guide</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {teamRows.map((row) => (
                  <tr key={row.teamId}>
                    <td className="mono-cell">{row.teamId}</td>
                    <td>{row.teamName}</td>
                    <td>{row.leadDisplay}</td>
                    <td>
                      {isAdminConfigAvailable
                        ? `${row.membersCount} / ${maxTeamSize}`
                        : `${row.membersCount}`}
                    </td>
                    <td>
                      <StatusBadge
                        text={row.formationStatus}
                        variant={getTeamStatusVariant(row.formationStatus)}
                      />
                    </td>
                    <td>{row.guideDisplay}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm btn-danger-outline"
                        onClick={() => setTeamToDelete(row)}
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        isOpen={Boolean(teamToDelete)}
        title="Delete Project Team"
        confirmLabel="Delete Team"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDeleteTeam}
        onCancel={() => setTeamToDelete(null)}
      >
        {teamToDelete && (
          <div className="info-list">
            <div className="info-row">
              <span className="info-key">Team</span>
              <span className="info-val">
                {teamToDelete.teamName} ({teamToDelete.teamId})
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Members Removed</span>
              <span className="info-val">{teamToDelete.membersCount}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Guide Allocation</span>
              <span className="info-val">{teamToDelete.guideDisplay}</span>
            </div>
          </div>
        )}
        <p className="modal-note">
          Deleting this team releases its members and any assigned faculty slot. Team ID{' '}
          <strong>{teamToDelete?.teamId}</strong> will not be reused for future teams.
        </p>
      </ConfirmDialog>
    </div>
  );
}

export default TeamSettings;
