import { ENDPOINTS, USE_MOCK } from "./config";
import { ApiError, http } from "./http";
import { db, delay, save, uid } from "./mock-db";
import type { ClassSession, TeacherGrade, TeacherProfile } from "./types";

export const teachersApi = {
  list: async (): Promise<TeacherProfile[]> => {
    if (!USE_MOCK) return http(ENDPOINTS.teachers);
    return delay(
      db()
        .users.filter((u) => u.role === "Teacher" || u.role === "Admin")
        .map((u) => ({ id: u.id, full_name: u.full_name, email: u.email })),
    );
  },
  listAssignments: async (): Promise<TeacherGrade[]> => {
    if (!USE_MOCK) return http(ENDPOINTS.teacherGrades);
    return delay([...db().teacherGrades]);
  },
  assignGrade: async (teacherId: string, gradeId: string): Promise<void> => {
    if (!teacherId || !gradeId) throw new ApiError("Pick a teacher and a grade");
    if (!USE_MOCK)
      return http(ENDPOINTS.teacherGrades, {
        method: "POST",
        body: { teacher_id: teacherId, grade_id: gradeId },
      });
    db().teacherGrades.push({ id: uid(), teacher_id: teacherId, grade_id: gradeId });
    save();
  },
  unassignGrade: async (id: string): Promise<void> => {
    if (!USE_MOCK) return http(ENDPOINTS.teacherGrade(id), { method: "DELETE" });
    const store = db();
    store.teacherGrades = store.teacherGrades.filter((t) => t.id !== id);
    save();
  },
};

export const sessionsApi = {
  /** Teacher: pass their id. Admin: omit to get the whole timetable. */
  list: async (teacherId?: string): Promise<ClassSession[]> => {
    if (!USE_MOCK) return http(ENDPOINTS.sessions, { query: { teacher_id: teacherId } });
    return delay(
      db()
        .sessions.filter((s) => !teacherId || s.teacher_id === teacherId)
        .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)),
    );
  },
  get: async (id: string): Promise<ClassSession | null> => {
    if (!USE_MOCK) return http(ENDPOINTS.session(id));
    return delay(db().sessions.find((s) => s.id === id) ?? null);
  },
  create: async (input: Omit<ClassSession, "id">): Promise<void> => {
    if (!USE_MOCK) return http(ENDPOINTS.sessions, { method: "POST", body: input });
    db().sessions.push({ id: uid(), ...input });
    save();
  },
  remove: async (id: string): Promise<void> => {
    if (!USE_MOCK) return http(ENDPOINTS.session(id), { method: "DELETE" });
    const store = db();
    store.sessions = store.sessions.filter((s) => s.id !== id);
    save();
  },
};
