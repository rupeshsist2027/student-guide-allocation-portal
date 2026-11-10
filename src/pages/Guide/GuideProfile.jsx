import { UserCircle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { usePortalData } from '../../context/PortalDataContext';

function GuideProfile() {
  const { currentFaculty, facultyMetrics } = usePortalData();

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Faculty profile and mentorship allocation summary."
      />
      <SectionCard title="Faculty Guide Information" icon={UserCircle}>
        <div className="info-list">
          <div className="info-row">
            <span className="info-key">Faculty ID</span>
            <span className="info-val">{currentFaculty.facultyId}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Name</span>
            <span className="info-val">{currentFaculty.facultyName}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Department</span>
            <span className="info-val">{currentFaculty.department}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Designation</span>
            <span className="info-val">{currentFaculty.designation || 'Faculty'}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Specialization</span>
            <span className="info-val">{currentFaculty.specialization}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Email</span>
            <span className="info-val">{currentFaculty.email}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Office Location</span>
            <span className="info-val">{currentFaculty.office || '--'}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Account Status</span>
            <span className="info-val">
              <StatusBadge
                text={currentFaculty.accountStatus === 'PENDING_ACTIVATION' ? 'Pending First-Login Setup' : 'Active'}
                variant={currentFaculty.accountStatus === 'PENDING_ACTIVATION' ? 'warning' : 'success'}
              />
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Mentorship Capacity</span>
            <span className="info-val">
              <StatusBadge
                text={`${facultyMetrics.totalAssignedTeams} / ${facultyMetrics.maximumTeamCapacity} Allocated`}
                variant={facultyMetrics.availableTeamSlots > 0 ? 'info' : 'neutral'}
              />
            </span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default GuideProfile;
