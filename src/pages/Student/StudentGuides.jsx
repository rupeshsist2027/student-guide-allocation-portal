import { BookOpen } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import { useStudentTeam } from '../../context/StudentTeamContext';

function getGuideStatusVariant(guide) {
  if (guide.availabilityStatus === 'Not Configured') {
    return 'warning';
  }
  return guide.availableSlots > 0 ? 'success' : 'danger';
}

function StudentGuides() {
  const { availableGuides, isAdminConfigAvailable } = useStudentTeam();

  return (
    <div>
      <PageHeader
        title="Browse Guides"
        subtitle="Explore faculty mentors, specializations, and real-time team capacity."
      />

      {!isAdminConfigAvailable && (
        <AlertBanner
          variant="warning"
          title="Admin Configuration Required"
          message="Faculty maximum team capacity has not been configured by the Admin yet."
        />
      )}

      {availableGuides.length === 0 ? (
        <SectionCard title="Available Faculty Guides" icon={BookOpen}>
          <div className="empty-state-box">
            <p className="empty-state-title">No faculty records found.</p>
            <p className="empty-state-desc">
              Faculty mentor profiles will be listed here once added by the administrator.
            </p>
          </div>
        </SectionCard>
      ) : (
        <div className="guide-cards-grid">
          {availableGuides.map((guide) => (
            <div key={guide.facultyId} className="guide-card">
              <div className="guide-card-header-row">
                <div>
                  <h3 className="guide-card-name">{guide.facultyName}</h3>
                  <p className="guide-card-dept">
                    {guide.facultyId} &bull; {guide.department}
                  </p>
                </div>
                <StatusBadge
                  text={guide.availabilityStatus}
                  variant={getGuideStatusVariant(guide)}
                />
              </div>

              <div className="info-list">
                <div className="info-row">
                  <span className="info-key">Specialization</span>
                  <span className="info-val">{guide.specialization}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Maximum Team Capacity</span>
                  <span className="info-val">
                    {guide.maxTeamCapacity != null ? guide.maxTeamCapacity : 'Not Set'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-key">Currently Assigned Teams</span>
                  <span className="info-val">{guide.assignedTeams}</span>
                </div>
                <div className="info-row">
                  <span className="info-key">Available Team Slots</span>
                  <span className="info-val">
                    {guide.availableSlots != null ? guide.availableSlots : 'Not Set'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentGuides;
