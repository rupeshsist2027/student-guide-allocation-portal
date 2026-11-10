import { Bell } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { usePortalData } from '../../context/PortalDataContext';
import {
  ALLOCATION_STATUS,
  TEAM_FORMATION_STATUS,
} from '../../utils/portalAllocation';

function StudentNotifications() {
  const {
    currentStudent,
    studentTeam,
    studentAllocationRecord,
    isAdminConfigAvailable,
    maxTeamSize,
    teamFormationStatus,
    allocationStatus,
  } = usePortalData();

  const notifications = [];

  if (!isAdminConfigAvailable) {
    notifications.push({
      id: 'admin-config-pending',
      title: 'Admin Configuration Pending',
      description:
        'Team creation and guide selection will open once the Admin configures Students Per Team and Maximum Teams Per Faculty.',
      time: 'Action Needed',
      tag: 'Pending Setup',
      variant: 'warning',
    });
  }

  if (studentAllocationRecord && allocationStatus === ALLOCATION_STATUS.ALLOCATED) {
    notifications.push({
      id: 'guide-allocated',
      title: 'Faculty Guide Allocated',
      description: `${studentTeam.teamName} was directly allocated to ${studentAllocationRecord.facultyName} (${studentAllocationRecord.facultyId}) on ${studentAllocationRecord.allocationDate}. Current Stage: ${studentAllocationRecord.stage}.`,
      time: studentAllocationRecord.allocationDate,
      tag: 'Allocated',
      variant: 'success',
    });
  }

  if (studentTeam && isAdminConfigAvailable) {
    const desc =
      teamFormationStatus === TEAM_FORMATION_STATUS.COMPLETED
        ? `Your team is complete (${studentTeam.members.length}/${maxTeamSize} members) and eligible for guide selection.`
        : teamFormationStatus === TEAM_FORMATION_STATUS.EXCEEDS_LIMIT
          ? `Your team currently has ${studentTeam.members.length}/${maxTeamSize} members, exceeding the configured team size. Remove extra member(s) before selecting a guide.`
          : `Your team currently has ${studentTeam.members.length}/${maxTeamSize} members. Fill your team to ${maxTeamSize} members to unlock guide selection.`;

    notifications.push({
      id: 'team-status',
      title: `${studentTeam.teamName} — ${teamFormationStatus}`,
      description: desc,
      time: 'Active',
      tag: teamFormationStatus,
      variant:
        teamFormationStatus === TEAM_FORMATION_STATUS.COMPLETED
          ? 'success'
          : teamFormationStatus === TEAM_FORMATION_STATUS.EXCEEDS_LIMIT
            ? 'danger'
            : 'info',
    });
  } else if (!studentTeam && isAdminConfigAvailable) {
    notifications.push({
      id: 'no-team',
      title: 'Team Formation Open',
      description: `Configured team size is ${maxTeamSize} students. Create a team or wait for a Team Lead to add your Register Number (${currentStudent.registerNumber}).`,
      time: 'Today',
      tag: 'Action Needed',
      variant: 'warning',
    });
  }

  notifications.push({
    id: 'portal-verified',
    title: 'Student Account Verified',
    description: `Profile for ${currentStudent.name} (${currentStudent.registerNumber}) is active for academic project allocation.`,
    time: 'This Term',
    tag: 'Info',
    variant: 'info',
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Team formation progress and direct guide allocation updates."
      />
      <SectionCard title="Student Alerts" icon={Bell} flush>
        <div className="activity-list">
          {notifications.map((item) => (
            <div key={item.id} className="activity-item">
              <div className="activity-main">
                <span className="activity-dot" />
                <div>
                  <p className="activity-title">{item.title}</p>
                  <p className="activity-desc">{item.description}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StatusBadge text={item.tag} variant={item.variant} />
                <span className="activity-time">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

export default StudentNotifications;
