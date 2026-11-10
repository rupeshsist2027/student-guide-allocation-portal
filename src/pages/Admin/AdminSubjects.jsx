import { Library } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { usePortalData } from '../../context/PortalDataContext';

const COLUMNS = [
  { key: 'code', label: 'Department Code' },
  { key: 'name', label: 'Department Name' },
  {
    key: 'status',
    label: 'Status',
    render: (row) => <StatusBadge text={row.status} variant="success" />,
  },
];

function AdminSubjects() {
  const { departments } = usePortalData();

  const rows = departments.map((dept) => ({
    id: dept.code || dept.id,
    code: dept.code,
    name: dept.name,
    status: 'Active',
  }));

  return (
    <div>
      <PageHeader
        title="Subjects & Departments"
        subtitle="Academic departments registered in MySQL for project teams and guide allocation."
      />
      <SectionCard
        title="Registered Departments"
        subtitle={`${rows.length} Department${rows.length === 1 ? '' : 's'}`}
        icon={Library}
        flush
      >
        <DataTable
          columns={COLUMNS}
          rows={rows}
          emptyMessage="No department or subject records found."
        />
      </SectionCard>
    </div>
  );
}

export default AdminSubjects;
