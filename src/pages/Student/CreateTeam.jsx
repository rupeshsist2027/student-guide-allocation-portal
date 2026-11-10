import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Users, UserPlus, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import AddTeamMemberPanel from '../../components/AddTeamMemberPanel';
import { useStudentTeam } from '../../context/StudentTeamContext';
import { TEAM_FORMATION_STATUS } from '../../utils/teamFormation';

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

function CreateTeam() {
  const {
    currentStudent,
    studentTeam,
    studentRole,
    isTeamLead,
    isAdminConfigAvailable,
    maxTeamSize,
    teamFormationStatus,
    createTeam,
  } = useStudentTeam();

  const [feedback, setFeedback] = useState(null);

  const handleCreateTeam = async () => {
    const result = await createTeam();
    if (!result.ok) {
      setFeedback({
        variant: 'danger',
        title: 'Cannot Create Team',
        message: result.error,
      });
      return;
    }

    setFeedback({
      variant: 'success',
      title: `${result.team.teamName} Created`,
      message: `${result.team.teamName} (${result.team.teamId}) has been created with ${currentStudent.name} (${currentStudent.registerNumber}) as Team Lead.`,
    });
  };

  const currentTeamCountText = !isAdminConfigAvailable
    ? studentTeam
      ? `${studentTeam.members.length}`
      : '0'
    : studentTeam
      ? `${studentTeam.members.length} / ${maxTeamSize}`
      : `0 / ${maxTeamSize}`;

  return (
    <div>
      <div className="page-header-row">
        <PageHeader
          title="Create Team"
          subtitle="Form a new project team and invite eligible students using their register numbers."
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
          message="Team creation is currently disabled because the Admin has not configured Students Per Team and Maximum Teams Per Faculty yet."
        />
      )}

      {feedback && (
        <AlertBanner
          variant={feedback.variant}
          title={feedback.title}
          message={feedback.message}
        />
      )}

      {studentTeam && !feedback && (
        <AlertBanner
          variant="info"
          title={`Already in ${studentTeam.teamName}`}
          message={`You already belong to ${studentTeam.teamName} (${studentTeam.teamId}) as ${studentRole}. A student can belong to only one team.`}
        />
      )}

      <div className="cards-grid-2" style={{ marginBottom: '24px' }}>
        <SectionCard title="Student & Team Allowance" icon={Users}>
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
              <span className="info-key">Maximum Team Size</span>
              <span className="info-val">
                {isAdminConfigAvailable ? `${maxTeamSize} Students` : 'Not Set by Admin'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Current Team Count</span>
              <span className="info-val">{currentTeamCountText}</span>
            </div>
          </div>

          <div className="config-actions" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateTeam}
              disabled={!isAdminConfigAvailable || Boolean(studentTeam)}
            >
              <PlusCircle size={16} />
              <span>Create New Team</span>
            </button>
            {studentTeam && (
              <Link to="/student/my-team" className="btn btn-outline">
                <span>View My Team</span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Created Team Preview" icon={Users}>
          {!studentTeam ? (
            <div className="empty-state-box">
              <p className="empty-state-title">No teams created yet.</p>
              <p className="empty-state-desc">
                Click <strong>Create New Team</strong> to generate your sequential Team ID
                and Team Name automatically. You will be assigned as Team Lead.
              </p>
            </div>
          ) : (
            <div>
              <div className="info-list" style={{ marginBottom: '16px' }}>
                <div className="info-row">
                  <span className="info-key">Team Name</span>
                  <span className="info-val">{studentTeam.teamName}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Team ID</span>
                  <span className="info-val">{studentTeam.teamId}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Team Size</span>
                  <span className="info-val">{currentTeamCountText}</span>
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

              <div className="team-member-mini-list">
                <p className="team-member-mini-heading">Team Members</p>
                {studentTeam.members.map((member, index) => (
                  <div key={member.registerNumber} className="team-member-mini-item">
                    <span>
                      {index + 1}. {member.name} &ndash; {member.registerNumber}
                    </span>
                    <StatusBadge
                      text={member.role}
                      variant={member.role === 'Team Lead' ? 'info' : 'neutral'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {studentTeam && isTeamLead && (
        <SectionCard
          title="Add Team Members"
          subtitle={
            isAdminConfigAvailable
              ? `Available Slots: ${Math.max(0, maxTeamSize - studentTeam.members.length)}`
              : 'Admin Configuration Required'
          }
          icon={UserPlus}
        >
          <AddTeamMemberPanel />
        </SectionCard>
      )}
    </div>
  );
}

export default CreateTeam;
