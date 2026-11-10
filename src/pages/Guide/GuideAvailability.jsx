import { CheckSquare, Lock } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import { usePortalData } from '../../context/PortalDataContext';

function GuideAvailability() {
  const { currentFaculty, facultyMetrics, isAdminConfigAvailable } = usePortalData();
  const hasCapacity = facultyMetrics.maximumTeamCapacity != null;
  const isAvailable = hasCapacity && facultyMetrics.availableTeamSlots > 0;
  const utilizationPercent =
    hasCapacity && facultyMetrics.maximumTeamCapacity > 0
      ? Math.min(
          100,
          Math.round(
            (facultyMetrics.totalAssignedTeams / facultyMetrics.maximumTeamCapacity) *
              100
          )
        )
      : 0;

  return (
    <div>
      <PageHeader
        title="My Availability"
        subtitle="Real-time mentorship slot availability based on your allocated teams."
      />

      {isAdminConfigAvailable ? (
        <AlertBanner
          variant="info"
          title="Admin-Configured Guide Capacity Policy"
          message={`Each faculty guide can mentor up to ${facultyMetrics.maximumTeamCapacity} project teams via First-Come, First-Served direct allocation. Capacity limits are set by the Admin and cannot be modified here.`}
        />
      ) : (
        <AlertBanner
          variant="warning"
          title="Admin Configuration Pending"
          message="The Admin has not configured Maximum Teams Per Guide yet. Direct guide selection is disabled until the Admin saves Team & Guide Capacity Settings."
        />
      )}

      <div className="cards-grid-2">
        <SectionCard title="Capacity Summary" icon={CheckSquare}>
          <div className="info-list">
            <div className="info-row">
              <span className="info-key">Faculty Member</span>
              <span className="info-val">
                {currentFaculty.facultyName} ({currentFaculty.facultyId})
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Maximum Team Limit</span>
              <span className="info-val">
                {hasCapacity ? `${facultyMetrics.maximumTeamCapacity} Teams` : 'Not Set'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Currently Assigned Teams</span>
              <span className="info-val">{facultyMetrics.totalAssignedTeams} Teams</span>
            </div>
            <div className="info-row">
              <span className="info-key">Available Team Slots</span>
              <span className="info-val">
                {hasCapacity ? `${facultyMetrics.availableTeamSlots} Slots` : 'Not Set'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Availability Status</span>
              <span className="info-val">
                <StatusBadge
                  text={facultyMetrics.availabilityStatus}
                  variant={
                    !hasCapacity ? 'warning' : isAvailable ? 'success' : 'danger'
                  }
                />
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Allocation Utilization" icon={Lock}>
          <div className="capacity-progress-wrap">
            <div className="capacity-progress-header">
              <span>Assigned Slots</span>
              <strong>
                {hasCapacity
                  ? `${facultyMetrics.totalAssignedTeams} / ${facultyMetrics.maximumTeamCapacity} (${utilizationPercent}%)`
                  : `${facultyMetrics.totalAssignedTeams} / Not Set`}
              </strong>
            </div>
            <div className="capacity-progress-track">
              <div
                className={`capacity-progress-bar ${isAvailable ? '' : 'is-full'}`}
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
            {hasCapacity ? (
              <p className="form-hint" style={{ marginTop: '12px' }}>
                Available Slots = max(0, {facultyMetrics.maximumTeamCapacity} &minus; {facultyMetrics.totalAssignedTeams}) = {facultyMetrics.availableTeamSlots}.
              </p>
            ) : (
              <p className="form-hint" style={{ marginTop: '12px' }}>
                Available slots will be calculated automatically once Admin saves Team &amp; Guide Capacity Settings.
              </p>
            )}
            <p className="form-hint" style={{ marginTop: '8px' }}>
              {!hasCapacity
                ? 'Awaiting Admin configuration before student guide selection opens.'
                : isAvailable
                  ? 'Student Team Leads can currently select you for direct First-Come, First-Served allocation.'
                  : 'You have reached the maximum team allocation limit.'}
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default GuideAvailability;
