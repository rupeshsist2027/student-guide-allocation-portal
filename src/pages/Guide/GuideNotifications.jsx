import { Bell } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { usePortalData } from '../../context/PortalDataContext';

function GuideNotifications() {
  const { currentFaculty, facultyNotifications } = usePortalData();

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`Alerts for ${currentFaculty.facultyName}: team allocations, project updates, progress submissions, and Admin announcements.`}
      />
      <SectionCard
        title="Recent Notifications"
        subtitle={`${facultyNotifications.length} Alert${facultyNotifications.length === 1 ? '' : 's'}`}
        icon={Bell}
        flush
      >
        {facultyNotifications.length === 0 ? (
          <div style={{ padding: '22px' }}>
            <div className="empty-state-box">
              <p className="empty-state-title">No Notifications</p>
              <p className="empty-state-desc">
                You will be notified immediately when a team selects you or submits updates.
              </p>
            </div>
          </div>
        ) : (
          <div className="activity-list">
            {facultyNotifications.map((item) => (
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
                  <span className="activity-time">{item.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default GuideNotifications;
