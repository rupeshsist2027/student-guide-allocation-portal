import { useEffect, useState } from 'react';
import { TrendingUp, Save } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import { usePortalData } from '../../context/PortalDataContext';
import { PROJECT_PROGRESS_STAGES } from '../../constants/portalConstants';

function TeamProgressCard({ team, onSave }) {
  const [stage, setStage] = useState(team.stage);
  const [projectTitle, setProjectTitle] = useState(team.projectTitle);
  const [feedbackText, setFeedbackText] = useState(team.feedback || '');

  useEffect(() => {
    setStage(team.stage);
    setProjectTitle(team.projectTitle);
    setFeedbackText(team.feedback || '');
  }, [team.stage, team.projectTitle, team.feedback]);

  const stageIndex = PROJECT_PROGRESS_STAGES.indexOf(team.stage);
  const stepNumber = stageIndex >= 0 ? stageIndex + 1 : 1;
  const percent = Math.round(
    (stepNumber / PROJECT_PROGRESS_STAGES.length) * 100
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(team.teamId, {
      stage,
      projectTitle,
      feedback: feedbackText,
    });
  };

  return (
    <SectionCard
      title={`${team.teamName} (${team.teamId})`}
      subtitle={`Stage ${stepNumber} of ${PROJECT_PROGRESS_STAGES.length} (${percent}%)`}
      icon={TrendingUp}
    >
      <div className="info-list" style={{ marginBottom: '16px' }}>
        <div className="info-row">
          <span className="info-key">Team Lead</span>
          <span className="info-val">
            {team.leadName} ({team.leadRegisterNumber})
          </span>
        </div>
        <div className="info-row">
          <span className="info-key">Members</span>
          <span className="info-val">
            {team.members.map((m) => m.name).join(', ')}
          </span>
        </div>
        <div className="info-row">
          <span className="info-key">Current Stage</span>
          <span className="info-val">
            <StatusBadge
              text={team.stage}
              variant={team.isCompleted ? 'success' : 'info'}
            />
          </span>
        </div>
        <div className="info-row">
          <span className="info-key">Last Updated</span>
          <span className="info-val">{team.progressUpdatedDate}</span>
        </div>
      </div>

      <div className="capacity-progress-track" style={{ marginBottom: '18px' }}>
        <div
          className="capacity-progress-bar"
          style={{ width: `${percent}%` }}
        />
      </div>

      <form className="config-form-fields" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor={`stage-${team.teamId}`} className="form-label">
            Project Stage
          </label>
          <select
            id={`stage-${team.teamId}`}
            className="form-input"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            {PROJECT_PROGRESS_STAGES.map((stageName, idx) => (
              <option key={stageName} value={stageName}>
                {idx + 1}. {stageName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor={`title-${team.teamId}`} className="form-label">
            Project Title
          </label>
          <input
            id={`title-${team.teamId}`}
            type="text"
            className="form-input"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor={`feedback-${team.teamId}`} className="form-label">
            Faculty Feedback
          </label>
          <textarea
            id={`feedback-${team.teamId}`}
            rows={2}
            className="form-input"
            placeholder="Add milestone guidance or review comments..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
          />
        </div>

        <div>
          <button type="submit" className="btn btn-primary">
            <Save size={16} />
            <span>Save Progress</span>
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

function GuideProgress() {
  const { currentFaculty, facultyAllocatedTeams, updateTeamProgress } =
    usePortalData();
  const [notice, setNotice] = useState(null);

  const handleSaveProgress = async (teamId, payload) => {
    const result = await updateTeamProgress(teamId, payload);
    if (!result.ok) {
      setNotice({
        variant: 'danger',
        title: 'Update Failed',
        message: result.error,
      });
      return;
    }
    setNotice({
      variant: 'success',
      title: 'Project Progress Updated',
      message: `Progress for ${teamId} updated to "${payload.stage}".`,
    });
  };

  return (
    <div>
      <PageHeader
        title="Project Progress"
        subtitle={`Track and update milestone stages for teams allocated to ${currentFaculty.facultyName}.`}
      />

      {notice && (
        <AlertBanner
          variant={notice.variant}
          title={notice.title}
          message={notice.message}
        />
      )}

      {facultyAllocatedTeams.length === 0 ? (
        <SectionCard title="Allocated Team Progress" icon={TrendingUp}>
          <div className="empty-state-box">
            <p className="empty-state-title">No Allocated Teams</p>
            <p className="empty-state-desc">
              Teams allocated to you will appear here with 7-stage progress tracking.
            </p>
          </div>
        </SectionCard>
      ) : (
        <div className="cards-grid-2">
          {facultyAllocatedTeams.map((team) => (
            <TeamProgressCard
              key={team.teamId}
              team={team}
              onSave={handleSaveProgress}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default GuideProgress;
