/**
 * Local demo store — used ONLY while VITE_API_BASE_URL is empty.
 * Delete this file once your real backend is wired in.
 */
import type {
  AttendanceRecord,
  BathroomLog,
  BehaviorRecord,
  BehaviorTag,
  ClassSession,
  Grade,
  Student,
  TeacherGrade,
  UserRecord,
} from "./types";
import { fullName } from "./types";

const KEY = "classtrack.mockdb.v1";

export interface MockDb {
  users: (UserRecord & { password: string | null })[];
  grades: Grade[];
  students: Student[];
  teacherGrades: TeacherGrade[];
  sessions: ClassSession[];
  attendance: AttendanceRecord[];
  behaviorTags: BehaviorTag[];
  behaviors: BehaviorRecord[];
  bathroom: BathroomLog[];
}

export const uid = () => Math.random().toString(36).slice(2, 11);
const now = () => new Date().toISOString();

function seed(): MockDb {
  const admin: UserRecord & { password: string | null } = {
    id: uid(),
    email: "admin@school.test",
    first_name: "Amina",
    middle_name: "Hassan",
    last_name: "Saleh",
    full_name: "Amina Hassan Saleh",
    role: "admin",
    created_at: now(),
    password: "admin123",
  };
  const teacher: UserRecord & { password: string | null } = {
    id: uid(),
    email: "teacher@school.test",
    first_name: "Omar",
    middle_name: null,
    last_name: "Khaled",
    full_name: "Omar Khaled",
    role: "teacher",
    created_at: now(),
    password: "teacher123",
  };
  const g1: Grade = { id: uid(), name: "Grade 7A" };
  const g2: Grade = { id: uid(), name: "Grade 8B" };

  const mkStudent = (
    grade: Grade,
    first: string,
    middle: string | null,
    last: string | null,
    code: string,
  ): Student => ({
    id: uid(),
    grade_id: grade.id,
    first_name: first,
    middle_name: middle,
    last_name: last,
    full_name: fullName({ first_name: first, middle_name: middle, last_name: last }),
    student_code: code,
  });

  const students = [
    mkStudent(g1, "Sara", "Ahmed", "Fouad", "S-101"),
    mkStudent(g1, "Yousef", null, "Nabil", "S-102"),
    mkStudent(g1, "Layla", "Mostafa", "Zaki", "S-103"),
    mkStudent(g2, "Karim", "Adel", "Sami", "S-201"),
    mkStudent(g2, "Nour", null, "Hany", "S-202"),
  ];

  const tags: BehaviorTag[] = [
    { id: uid(), name: "Helpful", type: "positive", points: 5 },
    { id: uid(), name: "Active participation", type: "positive", points: 3 },
    { id: uid(), name: "Noisy", type: "negative", points: -3 },
    { id: uid(), name: "Late homework", type: "negative", points: -5 },
  ];

  const sessions: ClassSession[] = [
    {
      id: uid(),
      teacher_id: teacher.id,
      grade_id: g1.id,
      title: "Mathematics",
      day_of_week: 1,
      start_time: "08:30",
      end_time: "09:15",
      room: "A1",
    },
    {
      id: uid(),
      teacher_id: teacher.id,
      grade_id: g2.id,
      title: "Science",
      day_of_week: 3,
      start_time: "10:00",
      end_time: "10:45",
      room: "Lab 2",
    },
  ];

  return {
    users: [admin, teacher],
    grades: [g1, g2],
    students,
    teacherGrades: [
      { id: uid(), teacher_id: teacher.id, grade_id: g1.id },
      { id: uid(), teacher_id: teacher.id, grade_id: g2.id },
    ],
    sessions,
    attendance: [],
    behaviorTags: tags,
    behaviors: [],
    bathroom: [],
  };
}

let cache: MockDb | null = null;

export function db(): MockDb {
  if (cache) return cache;
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      try {
        cache = JSON.parse(raw) as MockDb;
        return cache;
      } catch {
        /* fall through to seed */
      }
    }
  }
  cache = seed();
  save();
  return cache;
}

export function save() {
  if (typeof window !== "undefined" && cache) {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  }
}

/** Simulate latency so loading states behave like the real thing. */
export async function delay<T>(value: T, ms = 120): Promise<T> {
  await new Promise((r) => setTimeout(r, ms));
  return value;
}
