// Explicitly extract the role type so components can import it cleanly
export type UserRole = 'student' | 'professor';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  id_number: string;
  created_at?: string;
}

// Keeping a Profile alias just in case other modules look for it
export type Profile = UserProfile;

export interface Module {
  module_code: string;
  title: string;
  credits: number;
}

export interface Enrollment {
  id: string;
  student_id: string;
  module_code: string;
  professor_id: string;
  numeric_grade: number | null;
  letter_grade: string | null;
  status: 'completed' | 'current' | 'remaining';
  cumulative_gpa_snapshot: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}