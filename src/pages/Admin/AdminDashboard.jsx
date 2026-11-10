import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Layers,
  ShieldCheck,
  Activity,
  Upload,
  Megaphone,
  Send,
  Sliders,
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import { usePortalData } from '../../context/PortalDataContext';

function AdminDashboard() {
  const {
    totalStudentsCount,
    totalFacultyCount,
    teamConfig,
    isAdminConfigAvailable,
    maxTeamSize,
    maxTeamsPerGuide,
    savedCapacitySummary,
    teams,
    unifiedAllocations,
    publishAnnouncement,
    backendConnected,
  } = usePortalData();

  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementFeedback, setAnnouncementFeedback] = useState(null);

  const recentActivities = [...unifiedAllocations]
    .sort((a, b) => b.allocationOrder - a.allocationOrder)
    .slice(0, 5)
    .map((alloc) => ({
      id: alloc.allocationId,
      title: `FCFS #${alloc.allocationOrder}: ${alloc.teamName} Allocated`,
      description: `${alloc.teamName} (${alloc.teamId}) led by ${alloc.leadName} selected ${alloc.facultyName} (${alloc.facultyId}).`,
      time: alloc.allocationDate,
      status: alloc.status,
      variant: 'success',
    }));

  const handlePublishAnnouncement = async (event) => {
    event.preventDefault();
    const result = await publishAnnouncement(announcementTitle, announcementMessage);
    if (!result.ok) {
      setAnnouncementFeedback({
        variant: 'danger',
        title: 'Cannot Publish',
        message: result.error,
      });
      return;
    }
    setAnnouncementTitle('');
    setAnnouncementMessage('');
    setAnnouncementFeedback({
      variant: 'success',
      title: 'Announcement Published',
      message: 'All faculty members can now view this announcement in Notifications.',
    });
  };

  const totalTeamsCardValue = !isAdminConfigAvailable
    ? 'Not Set'
    : savedCapacitySummary.totalTeamsRequired != null
      ? savedCapacitySummary.totalTeamsRequired
      : 0;

  const totalTeamsCardNote = !isAdminConfigAvailable
    ? 'Configure Team & Guide Capacity Settings'
    : totalStudentsCount > 0
      ? `ceil(${totalStudentsCount} ÷ ${maxTeamSize}) · ${teams.length} active formed`
      : 'Import student records to calculate teams';

  const teamsPerGuideCardValue = !isAdminConfigAvailable
    ? 'Not Set'
    : maxTeamsPerGuide;

  const teamsPerGuideCardNote = !isAdminConfigAvailable
    ? 'Configure Team & Guide Capacity Settings'
    : `${teamConfig.maxTeamsMode === 'auto' ? 'Automatic Calculation' : 'Manual Limit'} · ${totalFacultyCount * maxTeamsPerGuide} total slots`;

  return (
    <div>
      <div className="page-header-row">
        <PageHeader
          title="Welcome Admin"
          subtitle="Auto-synced student/faculty record counts, capacity calculations, and portal operations."
        />
        <div className="table-actions">
          <Link to="/admin/team-settings" className="btn btn-outline">
            <Sliders size={16} />
            <span>Team &amp; Guide Capacity Settings</span>
          </Link>
          <Link to="/admin/bulk-import" className="btn btn-primary">
            <Upload size={16} />
            <span>Bulk Data Import</span>
          </Link>
        </div>
      </div>

      {!backendConnected && (
        <AlertBanner
          variant="warning"
          title="Backend Connection Unavailable"
          message="Unable to reach the backend API server. Ensure Spring Boot and MySQL/TiDB are online (on Render Free tier, initial cold start may take 30-60 seconds)."
        />
      )}

      {backendConnected && !isAdminConfigAvailable && (
        <AlertBanner
          variant="warning"
          title="Team & Guide Capacity Settings Not Configured"
          message={
            <span>
              Students cannot create teams or select guides until you configure Students Per Team and Maximum Teams Per Guide under{' '}
              <Link to="/admin/team-settings" style={{ fontWeight: 700, textDecoration: 'underline' }}>
                Team &amp; Guide Capacity Settings
              </Link>
              .
            </span>
          }
        />
      )}

      {backendConnected && isAdminConfigAvailable && savedCapacitySummary.isCapacityInsufficient && (
        <AlertBanner
          variant="danger"
          title="Insufficient Guide Capacity"
          message={`Total Guide Capacity (${savedCapacitySummary.totalGuideCapacity} slots) is below Total Teams (${savedCapacitySummary.totalTeamsRequired} teams). Review Team & Guide Capacity Settings.`}
        />
      )}

      {backendConnected && isAdminConfigAvailable && !savedCapacitySummary.isCapacityInsufficient && (
        <AlertBanner
          variant="info"
          title="Active Team & Guide Capacity Policy"
          message={`Students Per Team: ${maxTeamSize} Students · Teams Per Guide: ${maxTeamsPerGuide} Teams (${teamConfig.maxTeamsMode === 'auto' ? 'Automatic Calculation' : 'Manual Limit'}).`}
        />
      )}

      <div className="stats-grid stats-grid--4">
        <StatCard
          label="Total Students"
          value={totalStudentsCount}
          note="Calculated when student records are imported"
          icon={Users}
        />
        <StatCard
          label="Total Faculty"
          value={totalFacultyCount}
          note="Calculated when faculty records are imported"
          icon={BookOpen}
        />
        <StatCard
          label="Total Teams"
          value={totalTeamsCardValue}
          note={totalTeamsCardNote}
          icon={Layers}
        />
        <StatCard
          label="Teams Per Guide"
          value={teamsPerGuideCardValue}
          note={teamsPerGuideCardNote}
          icon={ShieldCheck}
        />
      </div>

      <div className="cards-grid-2">
        <SectionCard
          title="Recent Activities"
          subtitle="Latest FCFS allocations"
          icon={Activity}
          flush
        >
          {recentActivities.length === 0 ? (
            <div style={{ padding: '22px' }}>
              <div className="empty-state-box">
                <p className="empty-state-title">No allocations available.</p>
                <p className="empty-state-desc">
                  Team formations and direct faculty selections will appear here once active.
                </p>
              </div>
            </div>
          ) : (
            <div className="activity-list">
              {recentActivities.map((item) => (
                <div key={item.id} className="activity-item">
                  <div className="activity-main">
                    <span className="activity-dot" />
                    <div>
                      <p className="activity-title">{item.title}</p>
                      <p className="activity-desc">{item.description}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <StatusBadge text={item.status} variant={item.variant} />
                    <span className="activity-time">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Publish Faculty Announcement"
          subtitle="Broadcast to Faculty Notifications"
          icon={Megaphone}
        >
          {announcementFeedback && (
            <AlertBanner
              variant={announcementFeedback.variant}
              title={announcementFeedback.title}
              message={announcementFeedback.message}
            />
          )}
          <form className="config-form-fields" onSubmit={handlePublishAnnouncement}>
            <div className="form-group">
              <label htmlFor="admin-announce-title" className="form-label">
                Announcement Title
              </label>
              <input
                id="admin-announce-title"
                type="text"
                className="form-input"
                placeholder="e.g., Phase II Review Dates Announced"
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="admin-announce-msg" className="form-label">
                Message
              </label>
              <textarea
                id="admin-announce-msg"
                rows={3}
                className="form-input"
                placeholder="Enter details for faculty guides..."
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value)}
              />
            </div>
            <div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!backendConnected}
              >
                <Send size={16} />
                <span>Publish Announcement</span>
              </button>
            </div>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}

export default AdminDashboard;
