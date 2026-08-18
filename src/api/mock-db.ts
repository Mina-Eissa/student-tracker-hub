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

const KEY = "classtrack.mockdb.v2";

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
    role: "Admin",
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
    role: "Teacher",
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
    { id: uid(), tag: "Helpful", type: "Positive", point: 5 },
    { id: uid(), tag: "Active participation", type: "Positive", point: 3 },
    { id: uid(), tag: "Noisy", type: "Negative", point: -3 },
    { id: uid(), tag: "Late homework", type: "Negative", point: -5 },
  ];

  const today = new Date();
  const todayDow = today.getDay();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayStr = iso(today);
  const yesterday = new Date(today.getTime() - 864e5);
  const yesterdayStr = iso(yesterday);
  /** minutes-ago helper for realistic timestamps */
  const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

  /** A session happening right now, so "Start session" is usable immediately. */
  const liveSession: ClassSession = {
    id: uid(),
    teacher_id: teacher.id,
    grade_id: g1.id,
    title: "Mathematics (live now)",
    day_of_week: todayDow,
    start_time: `${String(Math.max(0, today.getHours() - 1)).padStart(2, "0")}:00`,
    end_time: `${String(Math.min(23, today.getHours() + 1)).padStart(2, "0")}:00`,
    room: "A1",
  };

  const sessions: ClassSession[] = [
    liveSession,
    {
      id: uid(),
      teacher_id: teacher.id,
      grade_id: g2.id,
      title: "Science",
      day_of_week: todayDow,
      start_time: "10:00",
      end_time: "10:45",
      room: "Lab 2",
    },
    {
      id: uid(),
      teacher_id: teacher.id,
      grade_id: g1.id,
      title: "Arabic",
      day_of_week: (todayDow + 1) % 7,
      start_time: "08:30",
      end_time: "09:15",
      room: "A1",
    },
    {
      id: uid(),
      teacher_id: teacher.id,
      grade_id: g2.id,
      title: "English",
      day_of_week: (todayDow + 2) % 7,
      start_time: "11:00",
      end_time: "11:45",
      room: "B3",
    },
  ];

  const [sara, yousef, layla, karim, nour] = students as [
    Student,
    Student,
    Student,
    Student,
    Student,
  ];

  /** Attendance already taken for the live session — every status is represented. */
  const attendance: AttendanceRecord[] = [
    {
      id: uid(),
      session_id: liveSession.id,
      student_id: sara.id,
      session_date: todayStr,
      status: "present",
      reason: null,
    },
    {
      id: uid(),
      session_id: liveSession.id,
      student_id: yousef.id,
      session_date: todayStr,
      status: "late",
      reason: "Bus delay",
    },
    {
      id: uid(),
      session_id: liveSession.id,
      student_id: layla.id,
      session_date: todayStr,
      status: "excused",
      reason: "Medical appointment",
    },
  ];

  const [helpful, active, noisy, lateHw] = tags as [
    BehaviorTag,
    BehaviorTag,
    BehaviorTag,
    BehaviorTag,
  ];

  const mkBehavior = (
    student: Student,
    tag: BehaviorTag,
    date: string,
    minutesAgo: number,
    comment: string | null,
    consequence: string | null,
    sessionId: string | null,
  ): BehaviorRecord => ({
    id: uid(),
    student_id: student.id,
    session_id: sessionId,
    tag_id: tag.id,
    type: tag.type,
    points: tag.point,
    comment,
    consequence,
    session_date: date,
    created_at: ago(minutesAgo),
  });

  /** Enough behaviour history for the scoreboard to have a real ranking. */
  const behaviors: BehaviorRecord[] = [
    mkBehavior(sara, helpful, todayStr, 40, "Helped a classmate with fractions", null, liveSession.id),
    mkBehavior(sara, active, todayStr, 25, "Answered three questions", null, liveSession.id),
    mkBehavior(layla, active, todayStr, 20, null, null, liveSession.id),
    mkBehavior(yousef, noisy, todayStr, 15, "Talking during the exercise", "Moved seat", liveSession.id),
    mkBehavior(yousef, lateHw, yesterdayStr, 1500, "Homework not handed in", "Parent contacted", null),
    mkBehavior(karim, helpful, yesterdayStr, 1600, "Tidied the lab", null, null),
    mkBehavior(nour, noisy, yesterdayStr, 1700, null, "Verbal warning", null),
  ];

  /** Bathroom trips: closed ones with durations + one still running. */
  const bathroom: BathroomLog[] = [
    {
      id: uid(),
      student_id: sara.id,
      session_id: liveSession.id,
      occurred_at: ago(52),
      returned_at: ago(43),
      duration_seconds: 540,
      duration_minutes: 9,
      note: null,
    },
    {
      id: uid(),
      student_id: sara.id,
      session_id: liveSession.id,
      occurred_at: ago(30),
      returned_at: ago(26),
      duration_seconds: 255,
      duration_minutes: 4,
      note: null,
    },
    {
      id: uid(),
      student_id: karim.id,
      session_id: liveSession.id,
      occurred_at: ago(18),
      returned_at: ago(12),
      duration_seconds: 372,
      duration_minutes: 6,
      note: "Water fountain",
    },
    {
      // still out — the timer keeps counting in the UI
      id: uid(),
      student_id: layla.id,
      session_id: liveSession.id,
      occurred_at: ago(3),
      returned_at: null,
      duration_seconds: null,
      duration_minutes: null,
      note: null,
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
    attendance,
    behaviorTags: tags,
    behaviors,
    bathroom,
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

/** Wipe the demo store and re-seed it with fresh demo data. */
export function resetMockDb() {
  cache = seed();
  save();
  return cache;
}

/** Simulate latency so loading states behave like the real thing. */
export async function delay<T>(value: T, ms = 120): Promise<T> {
  await new Promise((r) => setTimeout(r, ms));
  return value;
}
