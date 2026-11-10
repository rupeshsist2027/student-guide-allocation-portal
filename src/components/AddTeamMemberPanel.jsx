import { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { useStudentTeam } from '../context/StudentTeamContext';
import AlertBanner from './AlertBanner';
import StatusBadge from './StatusBadge';

function AddTeamMemberPanel() {
  const {
    currentStudent,
    studentTeam,
    isTeamLead,
    isAdminConfigAvailable,
    maxTeamSize,
    searchStudent,
    addMember,
  } = useStudentTeam();

  const [registerInput, setRegisterInput] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [feedback, setFeedback] = useState(null);

  if (!studentTeam || !isTeamLead) {
    return null;
  }

  const currentCount = studentTeam.members.length;
  const isAlreadyAllocated = Boolean(studentTeam.allocation);
  const isTeamFull =
    isAdminConfigAvailable && maxTeamSize != null && currentCount >= maxTeamSize;
  const disableSearchControls =
    !isAdminConfigAvailable || isTeamFull || isAlreadyAllocated;

  const handleSearch = (event) => {
    event.preventDefault();
    setFeedback(null);

    const trimmed = registerInput.trim();
    if (!trimmed) {
      setSearchResult(null);
      setFeedback({
        variant: 'warning',
        title: 'Register Number Required',
        message: 'Please enter a student register number to search.',
      });
      return;
    }

    const result = searchStudent(trimmed);
    if (!result.found) {
      setSearchResult(null);
      setFeedback({
        variant: 'danger',
        title: 'Student Not Found',
        message: `No student found with Register Number "${trimmed}".`,
      });
      return;
    }

    setSearchResult(result);
  };

  const handleAddMember = async () => {
    if (!searchResult?.student) {
      return;
    }
    const result = await addMember(searchResult.student.registerNumber);
    if (!result.ok) {
      setFeedback({
        variant: 'danger',
        title: 'Cannot Add Member',
        message: result.error,
      });
      return;
    }

    setFeedback({
      variant: 'success',
      title: 'Team Member Added',
      message: `${result.addedMember.name} (${result.addedMember.registerNumber}) has been added to ${studentTeam.teamName}.`,
    });
    setRegisterInput('');
    setSearchResult(null);
  };

  const foundStudent = searchResult?.student || null;
  const existingTeam = searchResult?.existingTeam || null;
  const isSelf = foundStudent?.registerNumber === currentStudent.registerNumber;
  const isAlreadyInAnotherOrSameTeam = Boolean(existingTeam);
  const disableAddMember =
    disableSearchControls ||
    !foundStudent ||
    isSelf ||
    isAlreadyInAnotherOrSameTeam;

  return (
    <div className="add-member-panel">
      {!isAdminConfigAvailable && (
        <AlertBanner
          variant="warning"
          title="Admin Configuration Required"
          message="Adding members is disabled until the Admin configures Students Per Team and Maximum Teams Per Faculty."
        />
      )}

      {isAlreadyAllocated && (
        <AlertBanner
          variant="info"
          title="Roster Locked After Allocation"
          message="This team already has an allocated faculty guide. Members cannot be added after allocation."
        />
      )}

      {isTeamFull && !isAlreadyAllocated && (
        <AlertBanner
          variant="success"
          title="Team Completed"
          message={
            currentCount > maxTeamSize
              ? `${studentTeam.teamName} currently has ${currentCount}/${maxTeamSize} members, exceeding the Admin-configured limit.`
              : `${studentTeam.teamName} is now full (${currentCount}/${maxTeamSize}) and ready for faculty guide selection.`
          }
        />
      )}

      {feedback && (
        <AlertBanner
          variant={feedback.variant}
          title={feedback.title}
          message={feedback.message}
        />
      )}

      <form className="search-member-form" onSubmit={handleSearch}>
        <div className="form-group search-member-input-wrap">
          <label htmlFor="member-register-number" className="form-label">
            Student Register Number
          </label>
          <input
            id="member-register-number"
            type="text"
            className="form-input"
            placeholder="Enter student register number"
            value={registerInput}
            onChange={(e) => setRegisterInput(e.target.value)}
            disabled={disableSearchControls}
          />
          <span className="form-hint">
            Enter a registered student&apos;s exact Register Number to search eligibility.
          </span>
        </div>

        <button
          type="submit"
          className="btn btn-accent search-member-btn"
          disabled={disableSearchControls}
        >
          <Search size={16} />
          <span>Search Student</span>
        </button>
      </form>

      {foundStudent && (
        <div className="search-result-card">
          <div className="search-result-info">
            <div className="info-list">
              <div className="info-row">
                <span className="info-key">Student Name</span>
                <span className="info-val">{foundStudent.name}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Register Number</span>
                <span className="info-val">{foundStudent.registerNumber}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Department</span>
                <span className="info-val">{foundStudent.department}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Eligibility</span>
                <span className="info-val">
                  {isSelf ? (
                    <StatusBadge text="Already Team Lead" variant="warning" />
                  ) : existingTeam ? (
                    <StatusBadge
                      text={`Already in ${existingTeam.teamName}`}
                      variant="danger"
                    />
                  ) : (
                    <StatusBadge text="Available to Join" variant="success" />
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="search-result-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddMember}
              disabled={disableAddMember}
            >
              <UserPlus size={16} />
              <span>Add Member</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AddTeamMemberPanel;
