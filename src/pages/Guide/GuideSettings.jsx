import { useState } from 'react';
import { Settings, Lock, Save } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import AlertBanner from '../../components/AlertBanner';
import { usePortalData } from '../../context/PortalDataContext';

function GuideSettings() {
  const {
    currentFaculty,
    facultyMetrics,
    facultyPreferences,
    updateFacultyPreferences,
  } = usePortalData();

  const [officeHours, setOfficeHours] = useState(facultyPreferences.officeHours);
  const [notifyOnAllocation, setNotifyOnAllocation] = useState(
    facultyPreferences.notifyOnAllocation
  );
  const [notifyOnProgress, setNotifyOnProgress] = useState(
    facultyPreferences.notifyOnProgress
  );
  const [notifyOnAdminAnnouncement, setNotifyOnAdminAnnouncement] = useState(
    facultyPreferences.notifyOnAdminAnnouncement
  );
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (event) => {
    event.preventDefault();
    updateFacultyPreferences({
      officeHours,
      notifyOnAllocation,
      notifyOnProgress,
      notifyOnAdminAnnouncement,
    });
    setSavedNotice(true);
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage consultation schedule and portal notification preferences."
      />

      {savedNotice && (
        <AlertBanner
          variant="success"
          title="Settings Saved"
          message="Your faculty portal preferences have been saved."
        />
      )}

      <div className="cards-grid-2">
        <SectionCard title="Consultation & Notification Preferences" icon={Settings}>
          <form className="config-form-fields" onSubmit={handleSave}>
            <div className="form-group">
              <label htmlFor="office-hours" className="form-label">
                Weekly Consultation Hours
              </label>
              <input
                id="office-hours"
                type="text"
                className="form-input"
                value={officeHours}
                onChange={(e) => {
                  setOfficeHours(e.target.value);
                  setSavedNotice(false);
                }}
              />
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={notifyOnAllocation}
                onChange={(e) => {
                  setNotifyOnAllocation(e.target.checked);
                  setSavedNotice(false);
                }}
              />
              <span>Notify when a new team is allocated via FCFS</span>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={notifyOnProgress}
                onChange={(e) => {
                  setNotifyOnProgress(e.target.checked);
                  setSavedNotice(false);
                }}
              />
              <span>Notify when students submit project updates or progress</span>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={notifyOnAdminAnnouncement}
                onChange={(e) => {
                  setNotifyOnAdminAnnouncement(e.target.checked);
                  setSavedNotice(false);
                }}
              />
              <span>Notify on Admin academic announcements</span>
            </label>

            <div>
              <button type="submit" className="btn btn-primary">
                <Save size={16} />
                <span>Save Settings</span>
              </button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Mentorship Allocation Summary" icon={Lock}>
          <div className="info-list">
            <div className="info-row">
              <span className="info-key">Faculty ID</span>
              <span className="info-val">{currentFaculty.facultyId}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Maximum Team Limit</span>
              <span className="info-val">
                {facultyMetrics.maximumTeamCapacity != null
                  ? `${facultyMetrics.maximumTeamCapacity} Teams`
                  : 'Not Set'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Currently Assigned Teams</span>
              <span className="info-val">{facultyMetrics.totalAssignedTeams} Teams</span>
            </div>
            <div className="info-row">
              <span className="info-key">Available Team Slots</span>
              <span className="info-val">
                {facultyMetrics.availableTeamSlots != null
                  ? `${facultyMetrics.availableTeamSlots} Slots`
                  : 'Not Set'}
              </span>
            </div>
          </div>
          <p className="form-hint" style={{ marginTop: '14px' }}>
            Maximum team capacity is governed by Admin Team &amp; Guide Settings and cannot be changed by faculty. Allocated teams appear automatically via First-Come, First-Served guide selection.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}

export default GuideSettings;

