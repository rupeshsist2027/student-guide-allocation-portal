import { GitMerge } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { usePortalData } from '../../context/PortalDataContext';

const COLUMNS = [
  { key: 'allocationId', label: 'Allocation ID' },
  {
    key: 'allocationOrder',
    label: 'FCFS #',
    render: (row) => `#${row.allocationOrder}`,
  },
  {
    key: 'teamName',
    label: 'Team',
    render: (row) => `${row.teamName} (${row.teamId})`,
  },
  {
    key: 'leadName',
    label: 'Team Lead',
    render: (row) => `${row.leadName} (${row.leadRegisterNumber})`,
  },
  { key: 'projectTitle', label: 'Project Title' },
  {
    key: 'facultyName',
    label: 'Allocated Guide',
    render: (row) => `${row.facultyName} (${row.facultyId})`,
  },
  { key: 'allocationDate', label: 'Allocation Date' },
  {
    key: 'stage',
    label: 'Project Stage',
    render: (row) => (
      <StatusBadge
        text={row.stage}
        variant={row.isCompleted ? 'success' : 'info'}
      />
    ),
  },
  {
    key: 'status',
    label: 'Allocation Status',
    render: (row) => <StatusBadge text={row.status} variant="success" />,
  },
];

function AdminAllocation() {
  const { unifiedAllocations } = usePortalData();
  const sortedAllocations = [...unifiedAllocations].sort(
    (a, b) => b.allocationOrder - a.allocationOrder
  );

  return (
    <div>
      <PageHeader
        title="Guide Allocation"
        subtitle="Real-time First-Come, First-Served (FCFS) team-to-faculty guide allocations."
      />
      <SectionCard
        title="Allocation Records"
        subtitle={`${sortedAllocations.length} Allocated Teams`}
        icon={GitMerge}
        flush
      >
        <DataTable
          columns={COLUMNS}
          rows={sortedAllocations}
          emptyMessage="No allocations available."
        />
      </SectionCard>
    </div>
  );
}

export default AdminAllocation;
