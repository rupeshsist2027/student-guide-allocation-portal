import { useState } from 'react';
import { Users, Eye, X } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { usePortalData } from '../../context/PortalDataContext';

function GuideTeams() {
  const { currentFaculty, facultyAllocatedTeams } = usePortalData();
  const [selectedTeam, setSelectedTeam] = useState(null);

  return (
    <div>
      <PageHeader
        title="My Teams"
        subtitle={`Teams directly allocated to ${currentFaculty.facultyName} (${currentFaculty.facultyId}) via First-Come, First-Served selection.`}
      />

      <SectionCard
        title="Allocated Teams"
        subtitle={`${facultyAllocatedTeams.length} Team${facultyAllocatedTeams.length === 1 ? '' : 's'}`}
        icon={Users}
        flush
      >
        {facultyAllocatedTeams.length === 0 ? (
          <div style={{ padding: '22px' }}>
            <div className="empty-state-box">
              <p className="empty-state-title">No Teams Allocated Yet</p>
              <p className="empty-state-desc">
                Any completed student team whose Team Lead selects you will automatically
                appear here with no manual approval required.
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
                  <th>Team Lead Name</th>
                  <th>Lead Reg. No.</th>
                  <th>Team Members</th>
                  <th>Project Title</th>
                  <th>Department</th>
                  <th>Allocation Date</th>
                  <th>Project Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {facultyAllocatedTeams.map((team) => (
                  <tr key={team.teamId}>
                    <td>{team.teamId}</td>
                    <td>{team.teamName}</td>
                    <td>{team.leadName}</td>
                    <td>{team.leadRegisterNumber}</td>
                    <td>
                      {team.members
                        .map((member) => `${member.name} (${member.registerNumber})`)
                        .join(', ')}
                    </td>
                    <td>{team.projectTitle}</td>
                    <td>{team.department}</td>
                    <td>{team.allocationDate}</td>
                    <td>
                      <StatusBadge
                        text={team.stage}
                        variant={team.isCompleted ? 'success' : 'info'}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setSelectedTeam(team)}
                      >
                        <Eye size={14} />
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {selectedTeam && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="team-detail-modal-title"
          onClick={() => setSelectedTeam(null)}
        >
          <div
            className="modal-card modal-card--wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="team-detail-modal-title" className="modal-title">
                {selectedTeam.teamName} ({selectedTeam.teamId})
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedTeam(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="info-list" style={{ marginBottom: '18px' }}>
                <div className="info-row">
                  <span className="info-key">Allocation ID</span>
                  <span className="info-val">
                    {selectedTeam.allocationId} (FCFS #{selectedTeam.allocationOrder})
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Team Lead</span>
                  <span className="info-val">
                    {selectedTeam.leadName} ({selectedTeam.leadRegisterNumber})
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Department</span>
                  <span className="info-val">{selectedTeam.department}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Project Title</span>
                  <span className="info-val">{selectedTeam.projectTitle}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Allocation Date</span>
                  <span className="info-val">{selectedTeam.allocationDate}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Current Stage</span>
                  <span className="info-val">
                    <StatusBadge
                      text={selectedTeam.stage}
                      variant={selectedTeam.isCompleted ? 'success' : 'info'}
                    />
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Latest Feedback</span>
                  <span className="info-val">
                    {selectedTeam.feedback || 'No feedback logged yet'}
                  </span>
                </div>
              </div>

              <div className="team-member-mini-list">
                <p className="team-member-mini-heading">
                  Team Members ({selectedTeam.members.length})
                </p>
                {selectedTeam.members.map((member, index) => (
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
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSelectedTeam(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuideTeams;

