import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Trash2, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import ConfirmDialog from '../../components/ConfirmDialog';
import AddTeamMemberPanel from '../../components/AddTeamMemberPanel';
import { useStudentTeam } from '../../context/StudentTeamContext';
import {
  ALLOCATION_STATUS,
  TEAM_FORMATION_STATUS,
} from '../../utils/teamFormation';

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

function MyTeam() {
  const {
    studentTeam,
    isTeamLead,
    isAdminConfigAvailable,
    maxTeamSize,
    teamFormationStatus,
    allocationStatus,
    removeMember,
    deleteTeam,
  } = useStudentTeam();

  const [feedback, setFeedback] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleRemoveMember = async (member) => {
    const result = await removeMember(member.registerNumber);
    if (!result.ok) {
      setFeedback({
        variant: 'danger',
        title: 'Cannot Remove Member',
        message: result.error,
      });
      return;
    }

    setFeedback({
      variant: 'info',
      title: 'Member Removed',
      message: `${member.name} (${member.registerNumber}) was removed from ${studentTeam.teamName}.`,
    });
  };

  const handleDeleteTeam = async () => {
    const targetName = studentTeam?.teamName || 'Team';
    setConfirmDeleteOpen(false);
    const result = await deleteTeam();
    if (!result.ok) {
      setFeedback({
        variant: 'danger',
        title: 'Cannot Delete Team',
        message: result.error,
      });
      return;
    }
    setFeedback({
      variant: 'info',
      title: `${targetName} Deleted`,
      message: `${targetName} has been disbanded. Its team number will not be reused.`,
    });
  };

  if (!studentTeam) {
    return (
      <div>
        <div className="page-header-row">
          <PageHeader
            title="My Team"
            subtitle="View your project team details, team lead, and current members."
          />
          <span className="max-team-size-pill">
            {isAdminConfigAvailable
              ? `Maximum Team Size: ${maxTeamSize} Students`
              : 'Admin Configuration Required'}
          </span>
        </div>

        {feedback && (
          <AlertBanner
            variant={feedback.variant}
            title={feedback.title}
            message={feedback.message}
          />
        )}

        {!isAdminConfigAvailable && (
          <AlertBanner
            variant="warning"
            title="Admin Configuration Required"
            message="The Admin must configure Students Per Team and Maximum Teams Per Faculty before students can create teams."
          />
        )}

        <AlertBanner
          variant="info"
          title="No teams created yet."
          message="You are not currently part of any team. Create a team or wait for a Team Lead to invite you."
        />

        <SectionCard title="Team Status" icon={Users}>
          <div className="info-list" style={{ marginBottom: '20px' }}>
            <div className="info-row">
              <span className="info-key">Team Formation Status</span>
              <span className="info-val">
                <StatusBadge text={TEAM_FORMATION_STATUS.NOT_CREATED} variant="neutral" />
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Maximum Team Size</span>
              <span className="info-val">
                {isAdminConfigAvailable ? `${maxTeamSize} Students` : 'Not Set by Admin'}
              </span>
            </div>
          </div>

          <Link to="/student/create-team" className="btn btn-primary">
            <span>Go to Create Team</span>
            <ArrowRight size={16} />
          </Link>
        </SectionCard>
      </div>
    );
  }

  const teamLeadMember = studentTeam.members.find(
    (member) => member.registerNumber === studentTeam.leadRegisterNumber
  );
  const availableSlots = isAdminConfigAvailable
    ? Math.max(0, maxTeamSize - studentTeam.members.length)
    : 0;
  const isAllocated = allocationStatus === ALLOCATION_STATUS.ALLOCATED;

  return (
    <div>
      <div className="page-header-row">
        <PageHeader
          title="My Team"
          subtitle="Manage your team members and monitor team formation progress."
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
          message="The Admin must configure Students Per Team and Maximum Teams Per Faculty before team formation can be completed or a guide can be selected."
        />
      )}

      {isAdminConfigAvailable && teamFormationStatus === TEAM_FORMATION_STATUS.EXCEEDS_LIMIT && (
        <AlertBanner
          variant="danger"
          title="Team Exceeds Admin-Configured Limit"
          message={`Your team has ${studentTeam.members.length} members, which exceeds the configured size of ${maxTeamSize}. Remove extra member(s) before selecting a faculty guide.`}
        />
      )}

      {!isTeamLead && (
        <AlertBanner
          variant="info"
          title="Team Member View (Read-Only)"
          message="You are a Team Member in this team. Only the Team Lead can add or remove members and select a project guide."
        />
      )}

      {feedback && (
        <AlertBanner
          variant={feedback.variant}
          title={feedback.title}
          message={feedback.message}
        />
      )}

      <div className="cards-grid-2" style={{ marginBottom: '24px' }}>
        <SectionCard title={studentTeam.teamName} subtitle={studentTeam.teamId} icon={Users}>
          <div className="info-list">
            <div className="info-row">
              <span className="info-key">Team Name</span>
              <span className="info-val">{studentTeam.teamName}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Team ID</span>
              <span className="info-val">{studentTeam.teamId}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Total Team Members</span>
              <span className="info-val">{studentTeam.members.length}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Maximum Team Size</span>
              <span className="info-val">
                {isAdminConfigAvailable ? `${maxTeamSize} Students` : 'Not Set'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Team Size</span>
              <span className="info-val">
                {isAdminConfigAvailable
                  ? `${studentTeam.members.length} / ${maxTeamSize}`
                  : `${studentTeam.members.length}`}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Available Slots</span>
              <span className="info-val">
                {isAdminConfigAvailable ? availableSlots : '--'}
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
          </div>
        </SectionCard>

        <SectionCard title="Team Lead Information" icon={Users}>
          <div className="info-list" style={{ marginBottom: '20px' }}>
            <div className="info-row">
              <span className="info-key">Team Lead</span>
              <span className="info-val">{teamLeadMember?.name || '--'}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Register Number</span>
              <span className="info-val">
                {teamLeadMember?.registerNumber || studentTeam.leadRegisterNumber}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Department</span>
              <span className="info-val">
                {teamLeadMember?.department || studentTeam.department}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Guide Selection</span>
              <span className="info-val">
                {!isAdminConfigAvailable
                  ? 'Pending Admin configuration'
                  : teamFormationStatus === TEAM_FORMATION_STATUS.COMPLETED
                    ? allocationStatus
                    : `Full team (${maxTeamSize} members) required`}
              </span>
            </div>
          </div>

          <div className="config-actions">
            {isTeamLead &&
              isAdminConfigAvailable &&
              teamFormationStatus === TEAM_FORMATION_STATUS.COMPLETED &&
              !isAllocated && (
                <Link to="/student/select-guide" className="btn btn-primary">
                  <span>Select Guide</span>
                  <ArrowRight size={16} />
                </Link>
              )}
            <Link to="/student/allocation" className="btn btn-outline">
              <span>View Allocation Details</span>
            </Link>
            {isTeamLead && !isAllocated && (
              <button
                type="button"
                className="btn btn-outline btn-danger-outline"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 size={15} />
                <span>Disband Team</span>
              </button>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Team Members"
        subtitle={
          isAdminConfigAvailable
            ? `${studentTeam.members.length} of ${maxTeamSize} Members`
            : `${studentTeam.members.length} Members`
        }
        icon={Users}
        flush
      >
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Register Number</th>
                <th>Department</th>
                <th>Role</th>
                {isTeamLead && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {studentTeam.members.map((member, index) => (
                <tr key={member.registerNumber}>
                  <td>{index + 1}</td>
                  <td>{member.name}</td>
                  <td>{member.registerNumber}</td>
                  <td>{member.department}</td>
                  <td>
                    <StatusBadge
                      text={member.role}
                      variant={member.role === 'Team Lead' ? 'info' : 'neutral'}
                    />
                  </td>
                  {isTeamLead && (
                    <td>
                      {member.role === 'Team Lead' ? (
                        <span className="text-muted-sm">Lead (Locked)</span>
                      ) : isAllocated ? (
                        <span className="text-muted-sm">Allocated (Locked)</span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm btn-danger-outline"
                          onClick={() => handleRemoveMember(member)}
                        >
                          <Trash2 size={14} />
                          <span>Remove</span>
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {isTeamLead && (
        <div style={{ marginTop: '24px' }}>
          <SectionCard
            title="Add Team Member"
            subtitle={
              isAdminConfigAvailable
                ? `Available Slots: ${availableSlots}`
                : 'Admin Configuration Required'
            }
            icon={UserPlus}
          >
            <AddTeamMemberPanel />
          </SectionCard>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Disband Project Team"
        confirmLabel="Disband Team"
        cancelLabel="Cancel"
        onConfirm={handleDeleteTeam}
        onCancel={() => setConfirmDeleteOpen(false)}
      >
        <div className="info-list">
          <div className="info-row">
            <span className="info-key">Team</span>
            <span className="info-val">
              {studentTeam.teamName} ({studentTeam.teamId})
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Current Members</span>
            <span className="info-val">{studentTeam.members.length}</span>
          </div>
        </div>
        <p className="modal-note">
          Disbanding this team removes all members from{' '}
          <strong>{studentTeam.teamName}</strong>. Team number{' '}
          <strong>{studentTeam.teamId}</strong> will not be reused when future teams are created.
        </p>
      </ConfirmDialog>
    </div>
  );
}

export default MyTeam;
