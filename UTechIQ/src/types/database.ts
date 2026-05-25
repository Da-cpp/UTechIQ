export type UserRole = 'student' | 'professor';

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;               // maps to auth.users.id (UUID)
  role: UserRole;
  email: string;
  created_at: string;
  is_active: boolean;
}

// ─── Students ─────────────────────────────────────────────────────────────────

export interface StudentProfile {
  student_id: string;       // school ID e.g. "20210001"
  user_id: string;          // FK → auth.users.id
  first_name: string;
  last_name: string;
  middle_names: string | null;
  birthdate: string;        // stored as ddmmyy in auth metadata
  course_of_study: string;
  major: string;
  minor: string | null;
  phone_number: string;
  campus: string;
  entry_year: number;
  current_year: number;
  current_semester: number;
  cumulative_gpa: number | null;
}

// ─── Professors ───────────────────────────────────────────────────────────────

export interface ProfessorProfile {
  professor_id: string;     // e.g. "P2010001"
  user_id: string;          // FK → auth.users.id
  first_name: string;
  last_name: string;
  department: string;
  invite_code: string;
  office_email: string;
}

// Union type used throughout the app when role isn't known yet
export type Profile = StudentProfile | ProfessorProfile;

// ─── Modules ──────────────────────────────────────────────────────────────────

export interface Module {
  module_code: string;      // PK e.g. "CIT3001"
  module_name: string;
  credits: number;
  department: string;
  level: number;
}

// ─── Professor–Module Assignments ─────────────────────────────────────────────

export interface ProfessorModuleAssignment {
  assignment_id: string;
  professor_id: string;     // FK → professors.professor_id
  module_code: string;      // FK → modules.module_code
  academic_year: string;    // e.g. "2024/2025"
  semester: number;
}

// ─── Student Grades ───────────────────────────────────────────────────────────

export type AttemptType = 'first_attempt' | 'repeat';

export interface StudentGrade {
  grade_id: string;
  student_id: string;       // FK → students.student_id
  module_code: string;      // FK → modules.module_code
  academic_year: string;
  semester: number;
  attempt_type: AttemptType;
  grade_letter: string;
  grade_points: number;     // DECIMAL(2,1)
  credits: number;
  included_in_gpa: boolean;
  forgiven: boolean;
  professor_assignment_id: string; // FK → professor_module_assignments
  created_at: string;
}

// ─── Grade Forgiveness Requests ───────────────────────────────────────────────

export type ForgivenessStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';

export interface GradeForgivenessRequest {
  request_id: string;
  student_id: string;       // FK → students.student_id
  grade_id: string;         // FK → student_grades.grade_id
  request_date: string;
  status: ForgivenessStatus;
  student_signature: string | null;
  professor_comment: string | null;
  professor_approval: boolean | null;
  reviewed_by_professor_id: string | null;
  reviewed_at: string | null;
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  student_id: string;       // FK → students.student_id
  sender: 'student' | 'ai';
  message: string;
  timestamp: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  notification_id: string;
  user_id: string;          // FK → users.user_id
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}