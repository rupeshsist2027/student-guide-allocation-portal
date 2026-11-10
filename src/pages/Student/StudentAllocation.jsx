import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Users, ArrowRight, Save, Send } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import { usePortalData } from '../../context/PortalDataContext';
import {
  ALLOCATION_STATUS,
  TEAM_FORMATION_STATUS,
} from '../../utils/portalAllocation';

function StudentAllocation() {
  const {
    studentTeam,
    studentAllocationRecord,
    isTeamLead,
    teamFormationStatus,
    allocationStatus,
    updateProjectTitle,
    submitProgressNote,
  } = usePortalData();

  const [titleInput, setTitleInput] = useState(
    studentTeam?.projectTitle || ''
  );
  const [progressNote, setProgressNote] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setTitleInput(studentTeam?.projectTitle || '');
  }, [studentTeam?.projectTitle]);

  if (!studentTeam) {
    return (
      <div>
        <PageHeader
          title="My Allocation"
          subtitle="Track your team's direct faculty allocation and project progress."
        />

        <AlertBanner
          variant="info"
          title="Not Created"
          message="You are not currently part of any team. Create a team or wait for a team invitation before selecting a guide."
        />

        <SectionCard title="Allocation Summary" icon={ClipboardCheck}>
          <div className="info-list" style={{ marginBottom: '20px' }}>
            <div className="info-row">
              <span className="info-key">Team Name</span>
              <span className="info-val">Not Created</span>
            </div>
            <div className="info-row">
              <span className="info-key">Selected Guide</span>
              <span className="info-val">Not Allocated</span>
            </div>
            <div className="info-row">
              <span className="info-key">Allocation Date</span>
              <span className="info-val">--</span>
            </div>
            <div className="info-row">
              <span className="info-key">Allocation Status</span>
              <span className="info-val">
                <StatusBadge text={ALLOCATION_STATUS.NOT_ALLOCATED} variant="neutral" />
              </span>
            </div>
          </div>

          <Link to="/student/create-team" className="btn btn-primary">
            <span>Create Team</span>
            <ArrowRight size={16} />
          </Link>
        </SectionCard>
      </div>
    );
  }

  const teamLeadMember = studentTeam.members.find(
    (member) => member.registerNumber === studentTeam.leadRegisterNumber
  );

  const isAllocated = allocationStatus === ALLOCATION_STATUS.ALLOCATED;

  const handleSaveProjectTitle = async (event) => {
    event.preventDefault();
    const result = await updateProjectTitle(titleInput);
    if (!result.ok) {
      setFeedback({ variant: 'danger', title: 'Update Failed', message: result.error });
      return;
    }
    setFeedback({
      variant: 'success',
      title: 'Project Details Updated',
      message: 'Project title saved and your allocated faculty guide has been notified.',
    });
  };

  const handleSendProgressNote = async (event) => {
    event.preventDefault();
    const result = await submitProgressNote(progressNote);
    if (!result.ok) {
      setFeedback({ variant: 'danger', title: 'Submission Failed', message: result.error });
      return;
    }
    setProgressNote('');
    setFeedback({
      variant: 'success',
      title: 'Progress Update Sent',
      message: 'Your progress update has been sent to your faculty guide.',
    });
  };

  return (
    <div>
      <PageHeader
        title="My Allocation"
        subtitle="Track your team's direct First-Come, First-Served (FCFS) faculty allocation."
      />

      {feedback && (
        <AlertBanner
          variant={feedback.variant}
          title={feedback.title}
          message={feedback.message}
        />
      )}

      {isAllocated && !feedback && (
        <AlertBanner
          variant="success"
          title="Faculty Guide Allocated"
          message={`${studentAllocationRecord.facultyName} (${studentAllocationRecord.facultyId}) was allocated to ${studentTeam.teamName} on ${studentAllocationRecord.allocationDate} (FCFS #${studentAllocationRecord.allocationOrder}).`}
        />
      )}

      {!isAllocated &&
        teamFormationStatus === TEAM_FORMATION_STATUS.COMPLETED &&
        isTeamLead && (
          <AlertBanner
            variant="info"
            title="Ready for Direct Guide Selection"
            message="Your team formation is complete. Select an available faculty guide for immediate allocation."
          />
        )}

      <div className="cards-grid-2" style={{ marginBottom: '24px' }}>
        <SectionCard title="Guide Allocation Details" icon={ClipboardCheck}>
          <div className="info-list" style={{ marginBottom: '20px' }}>
            <div className="info-row">
              <span className="info-key">Team Name</span>
              <span className="info-val">
                {studentTeam.teamName} ({studentTeam.teamId})
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Team Lead</span>
              <span className="info-val">
                {teamLeadMember
                  ? `${teamLeadMember.name} (${teamLeadMember.registerNumber})`
                  : studentTeam.leadRegisterNumber}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Allocated Guide</span>
              <span className="info-val">
                {studentAllocationRecord
                  ? `${studentAllocationRecord.facultyName} (${studentAllocationRecord.facultyId})`
                  : 'Not Allocated'}
              </span>
            </div>
            {studentAllocationRecord && (
              <>
                <div className="info-row">
                  <span className="info-key">Guide Department</span>
                  <span className="info-val">
                    {studentAllocationRecord.facultyDepartment}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Guide Email</span>
                  <span className="info-val">
                    {studentAllocationRecord.facultyEmail}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Allocation Reference</span>
                  <span className="info-val">
                    {studentAllocationRecord.allocationId} (FCFS #
                    {studentAllocationRecord.allocationOrder})
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Project Title</span>
                  <span className="info-val">
                    {studentAllocationRecord.projectTitle}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Project Stage</span>
                  <span className="info-val">
                    <StatusBadge
                      text={studentAllocationRecord.stage}
                      variant={studentAllocationRecord.isCompleted ? 'success' : 'info'}
                    />
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Faculty Feedback</span>
                  <span className="info-val">
                    {studentAllocationRecord.feedback || '--'}
                  </span>
                </div>
              </>
            )}
            <div className="info-row">
              <span className="info-key">Allocation Date</span>
              <span className="info-val">
                {studentAllocationRecord?.allocationDate || '--'}
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
          </div>

          {isTeamLead &&
            teamFormationStatus === TEAM_FORMATION_STATUS.COMPLETED &&
            !isAllocated && (
              <Link to="/student/select-guide" className="btn btn-primary">
                <span>Select Guide</span>
                <ArrowRight size={16} />
              </Link>
            )}
        </SectionCard>

        <SectionCard title="Team Members" subtitle={studentTeam.teamName} icon={Users}>
          <div className="team-member-mini-list">
            {studentTeam.members.map((member, index) => (
              <div key={member.registerNumber} className="team-member-mini-item">
                <div>
                  <p className="team-member-name">
                    {index + 1}. {member.name}
                  </p>
                  <p className="team-member-meta">
                    Register No: {member.registerNumber} &bull; {member.department}
                  </p>
                </div>
                <StatusBadge
                  text={member.role}
                  variant={member.role === 'Team Lead' ? 'info' : 'neutral'}
                />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {isAllocated && (
        <div className="cards-grid-2">
          {isTeamLead && (
            <SectionCard title="Update Project Details" icon={Save}>
              <form className="config-form-fields" onSubmit={handleSaveProjectTitle}>
                <div className="form-group">
                  <label htmlFor="student-project-title" className="form-label">
                    Project Title
                  </label>
                  <input
                    id="student-project-title"
                    type="text"
                    className="form-input"
                    placeholder="Enter your finalized project title"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                  />
                </div>
                <div>
                  <button type="submit" className="btn btn-primary">
                    <Save size={16} />
                    <span>Save Project Title</span>
                  </button>
                </div>
              </form>
            </SectionCard>
          )}

          <SectionCard title="Submit Progress Note to Faculty" icon={Send}>
            <form className="config-form-fields" onSubmit={handleSendProgressNote}>
              <div className="form-group">
                <label htmlFor="student-progress-note" className="form-label">
                  Progress Update
                </label>
                <input
                  id="student-progress-note"
                  type="text"
                  className="form-input"
                  placeholder="e.g., Completed ER diagram and API contract"
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                />
              </div>
              <div>
                <button type="submit" className="btn btn-accent">
                  <Send size={16} />
                  <span>Send Progress Update</span>
                </button>
              </div>
            </form>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

export default StudentAllocation;
