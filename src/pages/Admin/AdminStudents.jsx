import { Link } from 'react-router-dom';
import { Upload, Users } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { usePortalData } from '../../context/PortalDataContext';

const COLUMNS = [
  { key: 'registerNumber', label: 'Register Number' },
  { key: 'name', label: 'Student Name' },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'academicMeta', label: 'Year / Sec / Sem' },
  { key: 'teamName', label: 'Team' },
  { key: 'guide', label: 'Assigned Guide' },
  {
    key: 'accountStatusLabel',
    label: 'Account',
    render: (row) => (
      <StatusBadge
        text={row.accountStatusLabel}
        variant={row.accountStatus === 'PENDING_ACTIVATION' ? 'warning' : 'info'}
      />
    ),
  },
  {
    key: 'status',
    label: 'Allocation Status',
    render: (row) => (
      <StatusBadge
        text={row.status}
        variant={row.status === 'Allocated' ? 'success' : 'neutral'}
      />
    ),
  },
];

function AdminStudents() {
  const { students, teamMembers, teams, unifiedAllocations } = usePortalData();

  const rows = students.map((student) => {
    const membership = teamMembers.find(
      (m) => m.registerNumber === student.registerNumber
    );
    const team = membership
      ? teams.find((t) => t.teamId === membership.teamId)
      : null;
    const allocation = team
      ? unifiedAllocations.find((a) => a.teamId === team.teamId)
      : null;

    const year = student.academicYear || student.batch || '--';
    const sec = student.section || '--';
    const sem = student.semester ? `Sem ${student.semester}` : '--';

    return {
      id: student.registerNumber,
      registerNumber: student.registerNumber,
      name: student.name,
      email: student.email || '--',
      department: student.department,
      academicMeta: `${year} • Sec ${sec} • ${sem}`,
      teamName: team ? `${team.teamName} (${team.teamId})` : 'Not Assigned',
      guide: allocation
        ? `${allocation.facultyName} (${allocation.facultyId})`
        : 'Unassigned',
      accountStatus: student.accountStatus || 'ACTIVE',
      accountStatusLabel:
        student.accountStatus === 'PENDING_ACTIVATION' ? 'Pending Setup' : 'Active',
      status: allocation ? 'Allocated' : 'Not Allocated',
    };
  });

  const pendingCount = rows.filter(
    (r) => r.accountStatus === 'PENDING_ACTIVATION'
  ).length;

  return (
    <div>
      <div className="page-header-row">
        <PageHeader
          title="Students"
          subtitle="Directory of registered & bulk-imported students with live team formation and FCFS guide allocation status."
        />
        <Link to="/admin/bulk-import" className="btn btn-primary">
          <Upload size={16} />
          <span>Bulk Import Students</span>
        </Link>
      </div>
      <SectionCard
        title="Student Directory"
        subtitle={`${rows.length} Total Students (${rows.length - pendingCount} Active, ${pendingCount} Pending First Login)`}
        icon={Users}
        flush
      >
        <DataTable
          columns={COLUMNS}
          rows={rows}
          emptyMessage="No student records found."
        />
      </SectionCard>
    </div>
  );
}

export default AdminStudents;
