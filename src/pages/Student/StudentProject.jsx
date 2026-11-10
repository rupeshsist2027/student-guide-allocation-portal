import { FolderKanban } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { usePortalData } from '../../context/PortalDataContext';

function StudentProject() {
  const { studentTeam, studentAllocationRecord } = usePortalData();

  return (
    <div>
      <PageHeader
        title="Project Details"
        subtitle="Overview of your registered academic project."
      />
      <SectionCard title="Registered Project Summary" icon={FolderKanban}>
        {!studentTeam ? (
          <div className="empty-state-box">
            <p className="empty-state-title">No teams created yet.</p>
            <p className="empty-state-desc">
              Create or join a team and finalize your guide allocation to track project details here.
            </p>
          </div>
        ) : (
          <div className="info-list">
            <div className="info-row">
              <span className="info-key">Team ID</span>
              <span className="info-val">{studentTeam.teamId}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Team Name</span>
              <span className="info-val">{studentTeam.teamName}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Project Title</span>
              <span className="info-val">{studentTeam.projectTitle || 'Topic Not Finalized'}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Department</span>
              <span className="info-val">{studentTeam.department}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Assigned Faculty Guide</span>
              <span className="info-val">
                {studentAllocationRecord
                  ? `${studentAllocationRecord.facultyName} (${studentAllocationRecord.facultyId})`
                  : 'Not Allocated'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Current Project Stage</span>
              <span className="info-val">
                <StatusBadge
                  text={studentAllocationRecord?.stage || 'Pending Allocation'}
                  variant={studentAllocationRecord?.isCompleted ? 'success' : 'info'}
                />
              </span>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default StudentProject;
