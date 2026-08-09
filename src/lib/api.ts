/**
 * API layer — the ONLY place the frontend talks to a backend.
 *
 * Pages/components must import from here, never from
 * `@/integrations/supabase/client` directly.
 *
 * Two transports are supported:
 *   1. HTTP  — used when `VITE_API_BASE_URL` is set. Every call becomes a
 *              REST request to your own backend using ENDPOINTS below.
 *   2. Cloud — the default fallback (Lovable Cloud / Postgres over the
 *              auto-generated data API), so the app keeps working today.
 *
 * To move to your backend: set VITE_API_BASE_URL and implement the routes in
 * ENDPOINTS. No page code has to change.
 */
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const BASE_URL = (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? "";
const USE_HTTP = BASE_URL.length > 0;

/** Single source of truth for backend routes. */
export const ENDPOINTS = {
  me: "/me",
  grades: "/grades",
  grade: (id: string) => `/grades/${id}`,
  students: "/students",
  student: (id: string) => `/students/${id}`,
  studentsBulk: "/students/bulk",
  teachers: "/teachers",
  teacherGrades: "/teacher-grades",
  teacherGrade: (id: string) => `/teacher-grades/${id}`,
  sessions: "/sessions",
  session: (id: string) => `/sessions/${id}`,
  attendance: "/attendance",
  attendanceItem: (id: string) => `/attendance/${id}`,
  behaviorTags: "/behavior-tags",
  behaviorTag: (id: string) => `/behavior-tags/${id}`,
  behaviors: "/behaviors",
  behaviorItem: (id: string) => `/behaviors/${id}`,
  bathroomLogs: "/bathroom-logs",
  bathroomLog: (id: string) => `/bathroom-logs/${id}`,
  scoreboard: "/scoreboard",
  report: "/reports/session",
} as const;

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AppRole = "admin" | "teacher";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type BehaviorType = "positive" | "negative";

export interface Me {
  id: string;
  email: string;
  fullName: string;
  roles: AppRole[];
  /** Convenience flag — the difference between admin and a normal teacher. */
  isAdmin: boolean;
}

export interface Grade { id: string; name: string }
export interface Student { id: string; grade_id: string; full_name: string; student_code: string | null }
export interface TeacherProfile { id: string; full_name: string; email: string }
export interface TeacherGrade { id: string; teacher_id: string; grade_id: string }
export interface Session {
  id: string; teacher_id: string; grade_id: string; title: string;
  day_of_week: number; start_time: string; end_time: string; room: string | null;
}
export interface AttendanceRecord {
  id: string; session_id: string; student_id: string; session_date: string;
  status: AttendanceStatus; reason: string | null;
}
export interface BehaviorTag { id: string; name: string; type: BehaviorType; points: number }
export interface BehaviorRecord {
  id: string; student_id: string; session_id: string | null; tag_id: string | null;
  type: BehaviorType; points: number; comment: string | null; consequence: string | null;
  session_date: string; created_at: string;
}
export interface BathroomLog {
  id: string; student_id: string; session_id: string | null;
  occurred_at: string; returned_at: string | null; note: string | null;
}
export interface ScoreRow { student_id: string; full_name: string; points: number }

/* ------------------------------------------------------------------ */
/* HTTP transport                                                      */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
    this.name = "ApiError";
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function http<T>(
  path: string,
  opts: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const url = new URL(BASE_URL.replace(/\/$/, "") + path, window.location.origin);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    ...(opts.body === undefined ? {} : { body: JSON.stringify(opts.body) }),
  });
  if (!res.ok) throw new ApiError(await res.text().catch(() => res.statusText), res.status);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Cloud fallback helper: unwrap `{ data, error }`. */
function unwrap<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new ApiError(r.error.message);
  return (r.data ?? []) as T;
}

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */

export const api = {
  /** True when the app is pointed at your own backend. */
  usingCustomBackend: USE_HTTP,

  auth: {
    async signIn(email: string, password: string) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new ApiError(error.message);
    },
    async signUp(email: string, password: string, fullName: string) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
      });
      if (error) throw new ApiError(error.message);
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    /**
     * Who am I + what may I do. This is the single role check for the whole UI.
     * Admin  -> isAdmin true  : can manage grades, students, teachers, sessions.
     * Teacher-> isAdmin false : can only run their own sessions and log data.
     */
    async me(): Promise<Me | null> {
      if (USE_HTTP) return http<Me | null>(ENDPOINTS.me);
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) return null;
      const [{ data: profile }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const roles = ((roleRows ?? []) as { role: AppRole }[]).map((r) => r.role);
      return {
        id: user.id,
        email: profile?.email || user.email || "",
        fullName: profile?.full_name || "",
        roles,
        isAdmin: roles.includes("admin"),
      };
    },
  },

  grades: {
    list: async (): Promise<Grade[]> =>
      USE_HTTP
        ? http(ENDPOINTS.grades)
        : unwrap(await supabase.from("grades").select("id, name").order("name")),
    create: async (name: string): Promise<void> => {
      if (USE_HTTP) return http(ENDPOINTS.grades, { method: "POST", body: { name } });
      const { error } = await supabase.from("grades").insert({ name });
      if (error) throw new ApiError(error.message);
    },
    remove: async (id: string): Promise<void> => {
      if (USE_HTTP) return http(ENDPOINTS.grade(id), { method: "DELETE" });
      const { error } = await supabase.from("grades").delete().eq("id", id);
      if (error) throw new ApiError(error.message);
    },
  },

  students: {
    listByGrade: async (gradeId: string): Promise<Student[]> =>
      USE_HTTP
        ? http(ENDPOINTS.students, { query: { grade_id: gradeId } })
        : unwrap(
            await supabase
              .from("students")
              .select("id, grade_id, full_name, student_code")
              .eq("grade_id", gradeId)
              .order("full_name"),
          ),
    bulkCreate: async (
      gradeId: string,
      rows: { full_name: string; student_code?: string | null }[],
    ): Promise<void> => {
      if (USE_HTTP)
        return http(ENDPOINTS.studentsBulk, { method: "POST", body: { grade_id: gradeId, students: rows } });
      const { error } = await supabase
        .from("students")
        .insert(rows.map((r) => ({ ...r, grade_id: gradeId })));
      if (error) throw new ApiError(error.message);
    },
    remove: async (id: string): Promise<void> => {
      if (USE_HTTP) return http(ENDPOINTS.student(id), { method: "DELETE" });
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw new ApiError(error.message);
    },
  },

  teachers: {
    list: async (): Promise<TeacherProfile[]> =>
      USE_HTTP
        ? http(ENDPOINTS.teachers)
        : unwrap(await supabase.from("profiles").select("id, full_name, email").order("full_name")),
    listAssignments: async (): Promise<TeacherGrade[]> =>
      USE_HTTP
        ? http(ENDPOINTS.teacherGrades)
        : unwrap(await supabase.from("teacher_grades").select("id, teacher_id, grade_id")),
    assignGrade: async (teacherId: string, gradeId: string): Promise<void> => {
      if (USE_HTTP)
        return http(ENDPOINTS.teacherGrades, { method: "POST", body: { teacher_id: teacherId, grade_id: gradeId } });
      const { error } = await supabase
        .from("teacher_grades")
        .insert({ teacher_id: teacherId, grade_id: gradeId });
      if (error) throw new ApiError(error.message);
    },
    unassignGrade: async (id: string): Promise<void> => {
      if (USE_HTTP) return http(ENDPOINTS.teacherGrade(id), { method: "DELETE" });
      const { error } = await supabase.from("teacher_grades").delete().eq("id", id);
      if (error) throw new ApiError(error.message);
    },
  },

  sessions: {
    /** Teacher: pass their id to get only their timetable. Admin: omit for all. */
    list: async (teacherId?: string): Promise<Session[]> => {
      if (USE_HTTP) return http(ENDPOINTS.sessions, { query: { teacher_id: teacherId } });
      let q = supabase
        .from("sessions")
        .select("id, teacher_id, grade_id, title, day_of_week, start_time, end_time, room")
        .order("day_of_week")
        .order("start_time");
      if (teacherId) q = q.eq("teacher_id", teacherId);
      return unwrap(await q);
    },
    get: async (id: string): Promise<Session | null> => {
      if (USE_HTTP) return http(ENDPOINTS.session(id));
      const { data, error } = await supabase
        .from("sessions")
        .select("id, teacher_id, grade_id, title, day_of_week, start_time, end_time, room")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new ApiError(error.message);
      return data;
    },
    create: async (input: Omit<Session, "id">): Promise<void> => {
      if (USE_HTTP) return http(ENDPOINTS.sessions, { method: "POST", body: input });
      const { error } = await supabase.from("sessions").insert(input);
      if (error) throw new ApiError(error.message);
    },
    remove: async (id: string): Promise<void> => {
      if (USE_HTTP) return http(ENDPOINTS.session(id), { method: "DELETE" });
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      if (error) throw new ApiError(error.message);
    },
  },

  attendance: {
    listForSession: async (sessionId: string, date: string): Promise<AttendanceRecord[]> =>
      USE_HTTP
        ? http(ENDPOINTS.attendance, { query: { session_id: sessionId, date } })
        : unwrap(
            await supabase
              .from("attendance")
              .select("id, session_id, student_id, session_date, status, reason")
              .eq("session_id", sessionId)
              .eq("session_date", date),
          ),
    set: async (input: {
      session_id: string;
      student_id: string;
      session_date: string;
      status: AttendanceStatus;
      reason?: string | null;
    }): Promise<void> => {
      if (USE_HTTP) return http(ENDPOINTS.attendance, { method: "POST", body: input });
      const { error } = await supabase
        .from("attendance")
        .upsert(input, { onConflict: "session_id,student_id,session_date" });
      if (error) throw new ApiError(error.message);
    },
  },

  behaviorTags: {
    list: async (): Promise<BehaviorTag[]> =>
      USE_HTTP
        ? http(ENDPOINTS.behaviorTags)
        : unwrap(await supabase.from("behavior_tags").select("id, name, type, points").order("name")),
    create: async (input: Omit<BehaviorTag, "id">): Promise<void> => {
      if (USE_HTTP) return http(ENDPOINTS.behaviorTags, { method: "POST", body: input });
      const { error } = await supabase.from("behavior_tags").insert(input);
      if (error) throw new ApiError(error.message);
    },
    update: async (id: string, input: Partial<Omit<BehaviorTag, "id">>): Promise<void> => {
      if (USE_HTTP) return http(ENDPOINTS.behaviorTag(id), { method: "PATCH", body: input });
      const { error } = await supabase.from("behavior_tags").update(input).eq("id", id);
      if (error) throw new ApiError(error.message);
    },
    remove: async (id: string): Promise<void> => {
      if (USE_HTTP) return http(ENDPOINTS.behaviorTag(id), { method: "DELETE" });
      const { error } = await supabase.from("behavior_tags").delete().eq("id", id);
      if (error) throw new ApiError(error.message);
    },
  },

  behaviors: {
    list: async (filter: { session_id?: string; date?: string; student_ids?: string[] }): Promise<BehaviorRecord[]> => {
      if (USE_HTTP)
        return http(ENDPOINTS.behaviors, {
          query: { session_id: filter.session_id, date: filter.date },
        });
      let q = supabase
        .from("behaviors")
        .select(
          "id, student_id, session_id, tag_id, type, points, comment, consequence, session_date, created_at",
        )
        .order("created_at", { ascending: false });
      if (filter.session_id) q = q.eq("session_id", filter.session_id);
      if (filter.date) q = q.eq("session_date", filter.date);
      if (filter.student_ids) q = q.in("student_id", filter.student_ids);
      return unwrap(await q);
    },
    create: async (input: {
      student_id: string;
      session_id?: string | null;
      tag_id?: string | null;
      type: BehaviorType;
      points: number;
      comment?: string | null;
      consequence?: string | null;
      session_date: string;
    }): Promise<void> => {
      if (USE_HTTP) return http(ENDPOINTS.behaviors, { method: "POST", body: input });
      const { error } = await supabase.from("behaviors").insert(input);
      if (error) throw new ApiError(error.message);
    },
  },

  bathroom: {
    list: async (filter: { session_id?: string; student_ids?: string[] }): Promise<BathroomLog[]> => {
      if (USE_HTTP) return http(ENDPOINTS.bathroomLogs, { query: { session_id: filter.session_id } });
      let q = supabase
        .from("bathroom_logs")
        .select("id, student_id, session_id, occurred_at, returned_at, note")
        .order("occurred_at", { ascending: false });
      if (filter.session_id) q = q.eq("session_id", filter.session_id);
      if (filter.student_ids) q = q.in("student_id", filter.student_ids);
      return unwrap(await q);
    },
    log: async (input: { student_id: string; session_id?: string | null; note?: string | null }): Promise<void> => {
      if (USE_HTTP) return http(ENDPOINTS.bathroomLogs, { method: "POST", body: input });
      const { error } = await supabase.from("bathroom_logs").insert(input);
      if (error) throw new ApiError(error.message);
    },
  },

  scoreboard: {
    /** Students of a grade ranked by total behavior points. */
    byGrade: async (gradeId: string): Promise<ScoreRow[]> => {
      if (USE_HTTP) return http(ENDPOINTS.scoreboard, { query: { grade_id: gradeId } });
      const students = await api.students.listByGrade(gradeId);
      const ids = students.map((s) => s.id);
      if (ids.length === 0) return [];
      const rows = await api.behaviors.list({ student_ids: ids });
      const totals = new Map<string, number>();
      for (const r of rows) totals.set(r.student_id, (totals.get(r.student_id) ?? 0) + r.points);
      return students
        .map((s) => ({ student_id: s.id, full_name: s.full_name, points: totals.get(s.id) ?? 0 }))
        .sort((a, b) => b.points - a.points);
    },
  },
};

export type Api = typeof api;
