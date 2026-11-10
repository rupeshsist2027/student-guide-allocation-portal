import { Link } from 'react-router-dom';
import { BookOpen, Upload } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { usePortalData } from '../../context/PortalDataContext';

function getGuideStatusVariant(status, isOverLimit) {
  if (status === 'Not Configured') {
    return 'warning';
  }
  if (isOverLimit || status === 'Full') {
    return 'danger';
  }
  return 'success';
}

const COLUMNS = [
  { key: 'facultyId', label: 'Faculty ID' },
  { key: 'facultyName', label: 'Faculty Name' },
  { key: 'department', label: 'Department' },
  {
    key: 'designation',
    label: 'Designation',
    render: (row) => row.designation || 'Faculty Mentor',
  },
  {
    key: 'specialization',
    label: 'Specialization',
    render: (row) => row.specialization || '--',
  },
  {
    key: 'maxTeamCapacity',
    label: 'Max Capacity',
    render: (row) => (row.maxTeamCapacity != null ? row.maxTeamCapacity : 'Not Set'),
  },
  { key: 'assignedTeams', label: 'Assigned' },
  {
    key: 'availableSlots',
    label: 'Remaining',
    render: (row) => (row.availableSlots != null ? row.availableSlots : 'Not Set'),
  },
  {
    key: 'accountStatus',
    label: 'Account',
    render: (row) => (
      <StatusBadge
        text={row.accountStatus === 'PENDING_ACTIVATION' ? 'Pending Setup' : 'Active'}
        variant={row.accountStatus === 'PENDING_ACTIVATION' ? 'warning' : 'info'}
      />
    ),
  },
  {
    key: 'availabilityStatus',
    label: 'Slot Status',
    render: (row) => (
      <StatusBadge
        text={row.isOverLimit ? 'Over Limit' : row.availabilityStatus}
        variant={getGuideStatusVariant(row.availabilityStatus, row.isOverLimit)}
      />
    ),
  },
];

function AdminGuides() {
  const { facultyProfiles, maxTeamsPerGuide } = usePortalData();

  return (
    <div>
      <div className="page-header-row">
        <PageHeader
          title="Guides"
          subtitle="Faculty mentors and real-time team allocations."
        />
        <Link to="/admin/bulk-import" className="btn btn-primary">
          <Upload size={16} />
          <span>Bulk Import Faculty</span>
        </Link>
      </div>
      <SectionCard
        title="Faculty Guides & Mentorship Status"
        subtitle={
          maxTeamsPerGuide != null
            ? `${facultyProfiles.length} Faculty Guide${facultyProfiles.length === 1 ? '' : 's'} (Admin Limit: ${maxTeamsPerGuide} Teams / Guide)`
            : `${facultyProfiles.length} Faculty Guide${facultyProfiles.length === 1 ? '' : 's'} (Capacity limit not configured yet)`
        }
        icon={BookOpen}
        flush
      >
        <DataTable
          columns={COLUMNS}
          rows={facultyProfiles}
          emptyMessage="No faculty records found."
        />
      </SectionCard>
    </div>
  );
}

export default AdminGuides;
