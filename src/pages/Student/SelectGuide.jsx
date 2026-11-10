import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, ArrowRight } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import ConfirmDialog from '../../components/ConfirmDialog';
import { usePortalData } from '../../context/PortalDataContext';
import {
  ALLOCATION_STATUS,
  TEAM_FORMATION_STATUS,
} from '../../utils/portalAllocation';

function getGuideStatusVariant(guide) {
  if (guide.availabilityStatus === 'Not Configured') {
    return 'warning';
  }
  return guide.availableSlots > 0 ? 'success' : 'danger';
}

function SelectGuide() {
  const {
    studentTeam,
    isTeamLead,
    isAdminConfigAvailable,
    maxTeamSize,
    teamFormationStatus,
    studentAllocationRecord,
    allocationStatus,
    availableGuides,
    selectGuide,
  } = usePortalData();

  const [guideToConfirm, setGuideToConfirm] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const isAlreadyAllocated = allocationStatus === ALLOCATION_STATUS.ALLOCATED;
  const isTeamCompleted =
    isAdminConfigAvailable &&
    teamFormationStatus === TEAM_FORMATION_STATUS.COMPLETED;

  const canSelectAnyGuide =
    isAdminConfigAvailable &&
    Boolean(studentTeam) &&
    isTeamLead &&
    isTeamCompleted &&
    !isAlreadyAllocated;

  const handleConfirmAllocation = async () => {
    if (!guideToConfirm) {
      return;
    }

    const result = await selectGuide(guideToConfirm);
    setGuideToConfirm(null);

    if (!result.ok) {
      setFeedback({
        variant: 'danger',
        title: 'Allocation Failed',
        message: result.error,
      });
      return;
    }

    setFeedback({
      variant: 'success',
      title: 'Guide Allocated Immediately',
      message: `${result.faculty.facultyName} has been directly allocated to ${studentTeam.teamName} (${result.allocation.allocationId}) on a First-Come, First-Served basis.`,
    });
  };

  return (
    <div>
      <div className="page-header-row">
        <PageHeader
          title="Select Guide"
          subtitle="First-Come, First-Served (FCFS) direct faculty selection for completed teams."
        />
        {isAlreadyAllocated && (
          <Link to="/student/allocation" className="btn btn-outline">
            <span>View My Allocation</span>
            <ArrowRight size={16} />
          </Link>
        )}
      </div>

      {!isAdminConfigAvailable && (
        <AlertBanner
          variant="warning"
          title="Admin Configuration Required"
          message="Direct guide selection is disabled until the Admin configures Students Per Team and Maximum Teams Per Faculty."
        />
      )}

      {feedback && (
        <AlertBanner
          variant={feedback.variant}
          title={feedback.title}
          message={feedback.message}
        />
      )}

      {!studentTeam && (
        <AlertBanner
          variant="warning"
          title="Team Required"
          message="You are not currently part of any team. Create or join a team and complete team formation before selecting a faculty guide."
        />
      )}

      {studentTeam && !isTeamLead && (
        <AlertBanner
          variant="warning"
          title="Team Lead Permission Required"
          message="Only the Team Lead has permission to select a faculty guide. Team Members cannot perform guide selection."
        />
      )}

      {isAdminConfigAvailable &&
        studentTeam &&
        isTeamLead &&
        teamFormationStatus === TEAM_FORMATION_STATUS.IN_PROGRESS && (
          <AlertBanner
            variant="warning"
            title="Team Formation Incomplete"
            message={`Your team (${studentTeam.teamName}) currently has ${studentTeam.members.length}/${maxTeamSize} members. Guide selection is allowed only after your team is full (${maxTeamSize} students).`}
          />
        )}

      {isAdminConfigAvailable &&
        studentTeam &&
        isTeamLead &&
        teamFormationStatus === TEAM_FORMATION_STATUS.EXCEEDS_LIMIT && (
          <AlertBanner
            variant="danger"
            title="Team Size Exceeds Admin Limit"
            message={`Your team has ${studentTeam.members.length} members, exceeding the Admin-configured size of ${maxTeamSize}. Remove extra member(s) before selecting a guide.`}
          />
        )}

      {studentTeam && isAlreadyAllocated && !feedback && (
        <AlertBanner
          variant="success"
          title="Guide Already Allocated"
          message={`${studentTeam.teamName} is allocated to ${studentAllocationRecord.facultyName} (${studentAllocationRecord.facultyId}). One team can have only one faculty guide.`}
        />
      )}

      {availableGuides.length === 0 ? (
        <SectionCard title="Faculty Mentors" icon={BookOpen}>
          <div className="empty-state-box">
            <p className="empty-state-title">No faculty records found.</p>
            <p className="empty-state-desc">
              Available faculty guides will appear here once faculty profiles are imported by the Admin.
            </p>
          </div>
        </SectionCard>
      ) : (
        <div className="guide-cards-grid">
          {availableGuides.map((guide) => {
            const hasSlotsInfo = guide.availableSlots != null;
            const isGuideFull = hasSlotsInfo && guide.availableSlots <= 0;
            const isAllocatedToThisGuide =
              studentAllocationRecord?.facultyId === guide.facultyId;
            const buttonDisabled =
              !canSelectAnyGuide || !hasSlotsInfo || isGuideFull;

            return (
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

                <button
                  type="button"
                  className={`btn ${isAllocatedToThisGuide ? 'btn-outline' : 'btn-primary'} btn-full`}
                  disabled={buttonDisabled}
                  onClick={() => setGuideToConfirm(guide)}
                >
                  {isAllocatedToThisGuide ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Allocated to Your Team</span>
                    </>
                  ) : !hasSlotsInfo ? (
                    <span>Configuration Required</span>
                  ) : isGuideFull ? (
                    <span>Guide Capacity Full</span>
                  ) : (
                    <>
                      <BookOpen size={16} />
                      <span>Select Guide</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(guideToConfirm)}
        title="Confirm Direct Faculty Allocation"
        confirmLabel="Confirm & Allocate Guide"
        cancelLabel="Cancel"
        onConfirm={handleConfirmAllocation}
        onCancel={() => setGuideToConfirm(null)}
      >
        {guideToConfirm && studentTeam && (
          <div className="info-list">
            <div className="info-row">
              <span className="info-key">Team Name</span>
              <span className="info-val">
                {studentTeam.teamName} ({studentTeam.teamId})
              </span>
            </div>
            <div className="info-row">
              <span className="info-key">Selected Faculty</span>
              <span className="info-val">{guideToConfirm.facultyName}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Faculty ID</span>
              <span className="info-val">{guideToConfirm.facultyId}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Department</span>
              <span className="info-val">{guideToConfirm.department}</span>
            </div>
            <div className="info-row">
              <span className="info-key">Available Team Slots</span>
              <span className="info-val">
                {guideToConfirm.availableSlots} / {guideToConfirm.maxTeamCapacity}
              </span>
            </div>
          </div>
        )}
        <p className="modal-note">
          Allocation takes effect <strong>immediately</strong> on a First-Come, First-Served (FCFS) basis with no approval wait.
        </p>
      </ConfirmDialog>
    </div>
  );
}

export default SelectGuide;
