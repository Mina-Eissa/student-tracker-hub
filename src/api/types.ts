/** Shared types for every API module. */

export type AppRole = "admin" | "teacher";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type BehaviorType = "positive" | "negative";

/** Every person (user or student) is named this way: at least one part. */
export interface PersonName {
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
}

export function fullName(p: Partial<PersonName> & { full_name?: string }): string {
  if (p.full_name && p.full_name.trim()) return p.full_name.trim();
  return [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ").trim();
}

export interface AuthUser extends PersonName {
  id: string;
  email: string;
  full_name: string;
  roles: AppRole[];
  isAdmin: boolean;
}

export interface UserRecord extends PersonName {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  created_at: string;
}

export interface Grade {
  id: string;
  name: string;
}

export interface Student extends PersonName {
  id: string;
  grade_id: string;
  full_name: string;
  student_code: string | null;
}

export interface TeacherProfile {
  id: string;
  full_name: string;
  email: string;
}

export interface TeacherGrade {
  id: string;
  teacher_id: string;
  grade_id: string;
}

export interface ClassSession {
  id: string;
  teacher_id: string;
  grade_id: string;
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  session_date: string;
  status: AttendanceStatus;
  reason: string | null;
}

export interface BehaviorTag {
  id: string;
  name: string;
  type: BehaviorType;
  points: number;
}

export interface BehaviorRecord {
  id: string;
  student_id: string;
  session_id: string | null;
  tag_id: string | null;
  type: BehaviorType;
  points: number;
  comment: string | null;
  consequence: string | null;
  session_date: string;
  created_at: string;
}

export interface BathroomLog {
  id: string;
  student_id: string;
  session_id: string | null;
  occurred_at: string;
  returned_at: string | null;
  note: string | null;
}

export interface ScoreRow {
  student_id: string;
  full_name: string;
  points: number;
}
