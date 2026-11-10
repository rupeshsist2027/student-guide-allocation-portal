import { UserCircle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { useStudentTeam } from '../../context/StudentTeamContext';

function StudentProfile() {
  const { currentStudent, studentTeam, studentRole } = useStudentTeam();

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Personal and academic enrollment details."
      />
      <SectionCard title="Student Profile Details" icon={UserCircle}>
        <div className="info-list">
          <div className="info-row">
            <span className="info-key">Register Number</span>
            <span className="info-val">{currentStudent.registerNumber}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Full Name</span>
            <span className="info-val">{currentStudent.name}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Department</span>
            <span className="info-val">{currentStudent.department}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Semester</span>
            <span className="info-val">{currentStudent.semester}</span>
          </div>
          {currentStudent.section && (
            <div className="info-row">
              <span className="info-key">Section</span>
              <span className="info-val">{currentStudent.section}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-key">Academic Year / Batch</span>
            <span className="info-val">{currentStudent.academicYear || currentStudent.batch}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Email Address</span>
            <span className="info-val">{currentStudent.email}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Team Assignment</span>
            <span className="info-val">
              {studentTeam
                ? `${studentTeam.teamName} (${studentRole})`
                : 'Not Assigned'}
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Enrollment Status</span>
            <span className="info-val">
              <StatusBadge text="Verified" variant="success" />
            </span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default StudentProfile;
