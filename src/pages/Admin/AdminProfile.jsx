import { UserCircle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { usePortalData } from '../../context/PortalDataContext';

function AdminProfile() {
  const { authSession } = usePortalData();

  return (
    <div>
      <PageHeader
        title="Admin Profile"
        subtitle="Account information for the portal administrator."
      />
      <SectionCard title="Administrator Details" icon={UserCircle}>
        <div className="info-list">
          <div className="info-row">
            <span className="info-key">Admin ID</span>
            <span className="info-val">{authSession?.username || '--'}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Full Name</span>
            <span className="info-val">{authSession?.fullName || 'Administrator'}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Role</span>
            <span className="info-val">{authSession?.role || 'ADMIN'}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Email Address</span>
            <span className="info-val">{authSession?.email || '--'}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Account Status</span>
            <span className="info-val">
              <StatusBadge text="Active" variant="success" />
            </span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default AdminProfile;
