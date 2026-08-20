import { ENDPOINTS, USE_MOCK } from "./config";
import { ApiError, http } from "./http";
import { db, delay, save, uid } from "./mock-db";
import { fullName, type Grade, type PersonName, type Student } from "./types";

export const gradesApi = {
  list: async (): Promise<Grade[]> => {
    if (!USE_MOCK) return http(ENDPOINTS.grades);
    return delay([...db().grades].sort((a, b) => a.level.localeCompare(b.level)));
  },
  create: async (level: string, section: string): Promise<void> => {
    const value = level && section ? `${level} - ${section}` : undefined;
    if (!value) throw new ApiError("Grade name is required");
    if (!USE_MOCK) return http(ENDPOINTS.grades, { method: "POST", body: { level, section } });
    db().grades.push({ id: uid(), level, section });
    save();
  },
  remove: async (id: string): Promise<void> => {
    if (!USE_MOCK) return http(ENDPOINTS.grade(id), { method: "DELETE" });
    const store = db();
    store.grades = store.grades.filter((g) => g.id !== id);
    store.students = store.students.filter((s) => s.grade_id !== id);
    save();
  },
};

export interface StudentInput extends PersonName {
  student_code?: string | null;
}

export const studentsApi = {
  listByGrade: async (gradeId: string): Promise<Student[]> => {
    if (!USE_MOCK) return http(ENDPOINTS.students, { query: { grade_id: gradeId } });
    return delay(
      db()
        .students.filter((s) => s.grade_id === gradeId)
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    );
  },
  create: async (gradeId: string, input: StudentInput): Promise<void> => {
    if (!input.first_name.trim()) throw new ApiError("First name is required");
    if (!USE_MOCK)
      return http(ENDPOINTS.students, { method: "POST", body: { grade_id: gradeId, ...input } });
    db().students.push({
      id: uid(),
      grade_id: gradeId,
      first_name: input.first_name.trim(),
      middle_name: input.middle_name?.trim() || null,
      last_name: input.last_name?.trim() || null,
      full_name: fullName(input),
      student_code: input.student_code?.trim() || null,
    });
    save();
  },
  bulkCreate: async (gradeId: string, rows: StudentInput[]): Promise<number> => {
    if (rows.length === 0) throw new ApiError("Nothing to upload");
    if (!USE_MOCK) {
      await http(ENDPOINTS.studentsBulk, {
        method: "POST",
        body: { grade_id: gradeId, students: rows },
      });
      return rows.length;
    }
    for (const r of rows) {
      db().students.push({
        id: uid(),
        grade_id: gradeId,
        first_name: r.first_name,
        middle_name: r.middle_name || null,
        last_name: r.last_name || null,
        full_name: fullName(r),
        student_code: r.student_code || null,
      });
    }
    save();
    return rows.length;
  },
  remove: async (id: string): Promise<void> => {
    if (!USE_MOCK) return http(ENDPOINTS.student(id), { method: "DELETE" });
    const store = db();
    store.students = store.students.filter((s) => s.id !== id);
    save();
  },
};

/** "First, Middle, Last, code" per line — middle/last and code are optional. */
export function parseRosterLine(line: string): StudentInput | null {
  const parts = line.split(",").map((p) => p.trim());
  const [first = "", middle = "", last = "", code = ""] = parts;
  if (!first) return null;
  return {
    first_name: first,
    middle_name: middle || null,
    last_name: last || null,
    student_code: code || null,
  };
}
