import { Link } from 'react-router-dom';
import {
  Users,
  ShieldCheck,
  CheckSquare,
  FolderKanban,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import SectionCard from '../../components/SectionCard';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import { usePortalData } from '../../context/PortalDataContext';

const RECENT_COLUMNS = [
  { key: 'teamId', label: 'Team ID' },
  { key: 'teamName', label: 'Team Name' },
  {
    key: 'leadName',
    label: 'Team Lead',
    render: (row) => `${row.leadName} (${row.leadRegisterNumber})`,
  },
  { key: 'projectTitle', label: 'Project Title' },
  { key: 'allocationDate', label: 'Allocation Date' },
  {
    key: 'stage',
    label: 'Project Status',
    render: (row) => (
      <StatusBadge
        text={row.stage}
        variant={row.isCompleted ? 'success' : 'info'}
      />
    ),
  },
];

function GuideDashboard() {
  const {
    currentFaculty,
    facultyMetrics,
    facultyAllocatedTeams,
    isAdminConfigAvailable,
  } = usePortalData();
  const recentAllocations = facultyAllocatedTeams.slice(0, 5);

  const hasCapacity = facultyMetrics.maximumTeamCapacity != null;

  return (
    <div>
      <div className="page-header-row">
        <PageHeader
          title="Welcome Faculty"
          subtitle={`Signed in as ${currentFaculty.facultyName} (${currentFaculty.facultyId}) — ${currentFaculty.department}`}
        />
        <Link to="/guide/teams" className="btn btn-outline">
          <span>View My Teams</span>
          <ArrowRight size={16} />
        </Link>
      </div>

      {!isAdminConfigAvailable && (
        <AlertBanner
          variant="warning"
          title="Admin Configuration Pending"
          message="The Admin has not configured Students Per Team and Maximum Teams Per Faculty yet. Direct student guide selection is paused until configuration is saved."
        />
      )}

      <div className="stats-grid stats-grid--5">
        <StatCard
          label="Total Assigned Teams"
          value={facultyMetrics.totalAssignedTeams}
          note="Allocated via FCFS"
          icon={Users}
        />
        <StatCard
          label="Maximum Team Capacity"
          value={hasCapacity ? facultyMetrics.maximumTeamCapacity : 'Not Set'}
          note={hasCapacity ? 'Admin-configured limit' : 'Awaiting Admin setup'}
          icon={ShieldCheck}
        />
        <StatCard
          label="Available Team Slots"
          value={hasCapacity ? facultyMetrics.availableTeamSlots : 'Not Set'}
          note={
            !hasCapacity
              ? 'Pending Admin setup'
              : facultyMetrics.availableTeamSlots > 0
                ? 'Open for direct selection'
                : 'Capacity full'
          }
          icon={CheckSquare}
        />
        <StatCard
          label="Active Projects"
          value={facultyMetrics.activeProjects}
          note="Currently in progress"
          icon={FolderKanban}
        />
        <StatCard
          label="Completed Projects"
          value={facultyMetrics.completedProjects}
          note="Reached Final Submission"
          icon={CheckCircle2}
        />
      </div>

      <SectionCard
        title="Recent Team Allocations"
        subtitle="First-Come, First-Served Direct Selections"
        icon={Clock}
        flush
      >
        {recentAllocations.length === 0 ? (
          <div style={{ padding: '22px' }}>
            <div className="empty-state-box">
              <p className="empty-state-title">No Teams Allocated Yet</p>
              <p className="empty-state-desc">
                When a Team Lead directly selects you from the Student Portal, the
                team will appear here immediately.
              </p>
            </div>
          </div>
        ) : (
          <DataTable columns={RECENT_COLUMNS} rows={recentAllocations} />
        )}
      </SectionCard>
    </div>
  );
}

export default GuideDashboard;
