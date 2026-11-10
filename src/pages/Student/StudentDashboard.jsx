import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Layers,
  CheckCircle2,
  BookOpen,
  Clock,
  User,
  ArrowRight,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import { usePortalData } from '../../context/PortalDataContext';
import {
  ALLOCATION_STATUS,
  TEAM_FORMATION_STATUS,
} from '../../utils/portalAllocation';

function getTeamStatusVariant(status) {
  if (status === TEAM_FORMATION_STATUS.COMPLETED) {
    return 'success';
  }
  if (status === TEAM_FORMATION_STATUS.EXCEEDS_LIMIT) {
    return 'danger';
  }
  if (status === TEAM_FORMATION_STATUS.IN_PROGRESS) {
    return 'warning';
  }
  return 'neutral';
}

function StudentDashboard() {
  const {
    currentStudent,
    studentTeam,
    studentRole,
    isTeamLead,
    isAdminConfigAvailable,
    maxTeamSize,
    teamFormationStatus,
    studentAllocationRecord,
    allocationStatus,
  } = usePortalData();

  const teamMemberCountText = !isAdminConfigAvailable
    ? studentTeam
      ? `${studentTeam.members.length}`
      : '0'
    : studentTeam
      ? `${studentTeam.members.length} / ${maxTeamSize}`
      : `0 / ${maxTeamSize}`;

  const isAllocated = allocationStatus === ALLOCATION_STATUS.ALLOCATED;

  return (
    <div>
      <div className="page-header-row">
        <PageHeader
          title="Welcome Student"
          subtitle={`Signed in as ${currentStudent.name} (${currentStudent.registerNumber}) — ${currentStudent.department}`}
        />
        <span className="max-team-size-pill">
          {isAdminConfigAvailable
            ? `Maximum Team Size: ${maxTeamSize} Students`
            : 'Admin Configuration Required'}
        </span>
      </div>

      {!isAdminConfigAvailable && (
        <AlertBanner
          variant="warning"
          title="Admin Configuration Required"
          message="The Admin has not configured Students Per Team and Maximum Teams Per Faculty yet. Team creation and guide selection will open once configured."
        />
      )}

      {isAdminConfigAvailable && !studentTeam && (
        <AlertBanner
          variant="info"
          title="No teams created yet."
          message={`You are not currently part of any team. Form a full team of ${maxTeamSize} student${maxTeamSize === 1 ? '' : 's'} or wait for a Team Lead to add your Register Number.`}
        />
      )}

      <div className="stats-grid stats-grid--3">
        <StatCard
          label="My Team"
          value={studentTeam ? studentTeam.teamName : 'Not Created'}
          note={studentTeam ? `Team ID: ${studentTeam.teamId}` : 'Create or join a team'}
          icon={Layers}
        />
        <StatCard
          label="Team Members"
          value={teamMemberCountText}
          note={
            studentTeam
              ? `Your role: ${studentRole}`
              : 'No members added yet'
          }
          icon={Users}
        />
        <StatCard
          label="Maximum Team Size"
          value={isAdminConfigAvailable ? `${maxTeamSize} Students` : 'Not Set'}
          note={
            isAdminConfigAvailable
              ? 'Full team required to select a guide'
              : 'Pending Admin configuration'
          }
          icon={UserCheck}
        />
        <StatCard
          label="Team Formation Status"
          value={teamFormationStatus}
          note={
            !isAdminConfigAvailable
              ? 'Awaiting Admin team size setup'
              : teamFormationStatus === TEAM_FORMATION_STATUS.COMPLETED
                ? 'Full team ready for direct guide selection'
                : teamFormationStatus === TEAM_FORMATION_STATUS.EXCEEDS_LIMIT
                  ? `Reduce members to ${maxTeamSize} before selecting a guide`
                  : `Fill team to ${maxTeamSize} members to select a guide`
          }
          icon={CheckCircle2}
        />
        <StatCard
          label="Selected Guide"
          value={studentAllocationRecord?.facultyName || 'Not Selected'}
          note={
            studentAllocationRecord
              ? `Faculty ID: ${studentAllocationRecord.facultyId}`
              : 'No guide allocated yet'
          }
          icon={BookOpen}
        />
        <StatCard
          label="Allocation Status"
          value={allocationStatus}
          note={
            studentAllocationRecord
              ? `Allocated on ${studentAllocationRecord.allocationDate}`
              : 'Select an available faculty guide'
          }
          icon={Clock}
        />
      </div>

      <div className="cards-grid-2">
        <SectionCard title="Student Information" icon={User}>
          <div className="info-list">
            <div className="info-row">
              <span className="info-key">Student Name</span>
              <span className="info-val">{currentStudent.name}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Register Number</span>
              <span className="info-val">{currentStudent.registerNumber}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Department</span>
              <span className="info-val">{currentStudent.department}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Semester</span>
              <span className="info-val">{currentStudent.semester}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Team & Guide Quick Status" icon={Layers}>
          <div className="info-list">
            <div className="info-row">
              <span className="info-key">Maximum Team Size</span>
              <span className="info-val">
                {isAdminConfigAvailable ? `${maxTeamSize} Students` : 'Not Set'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Team Formation Status</span>
              <span className="info-val">
                <StatusBadge
                  text={teamFormationStatus}
                  variant={getTeamStatusVariant(teamFormationStatus)}
                />
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Allocation Status</span>
              <span className="info-val">
                <StatusBadge
                  text={allocationStatus}
                  variant={isAllocated ? 'success' : 'neutral'}
                />
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Next Action</span>
              <span className="info-val">
                {!isAdminConfigAvailable ? (
                  <span className="text-muted-sm">Awaiting Admin setup</span>
                ) : !studentTeam ? (
                  <Link to="/student/create-team" className="btn btn-primary btn-sm">
                    <span>Create Team</span>
                    <ArrowRight size={14} />
                  </Link>
                ) : teamFormationStatus !== TEAM_FORMATION_STATUS.COMPLETED ? (
                  <Link to="/student/my-team" className="btn btn-primary btn-sm">
                    <span>{isTeamLead ? 'Manage Team Members' : 'View My Team'}</span>
                    <ArrowRight size={14} />
                  </Link>
                ) : isTeamLead && !isAllocated ? (
                  <Link to="/student/select-guide" className="btn btn-primary btn-sm">
                    <span>Select Guide</span>
                    <ArrowRight size={14} />
                  </Link>
                ) : (
                  <Link to="/student/allocation" className="btn btn-outline btn-sm">
                    <span>View My Allocation</span>
                    <ArrowRight size={14} />
                  </Link>
                )}
              </span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default StudentDashboard;
