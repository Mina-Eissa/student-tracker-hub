import { ENDPOINTS, USE_MOCK } from "./config";
import { http } from "./http";
import { db, delay, save, uid } from "./mock-db";
import type {
  AttendanceRecord,
  AttendanceStatus,
  BathroomLog,
  BehaviorRecord,
  BehaviorTag,
  BehaviorType,
  ScoreRow,
} from "./types";
import { studentsApi } from "./students.api";

export const attendanceApi = {
  listForSession: async (sessionId: string, date: string): Promise<AttendanceRecord[]> => {
    if (!USE_MOCK) return http(ENDPOINTS.attendance, { query: { session_id: sessionId, date } });
    return delay(
      db().attendance.filter((a) => a.session_id === sessionId && a.session_date === date),
    );
  },
  set: async (input: {
    session_id: string;
    student_id: string;
    session_date: string;
    status: AttendanceStatus;
    reason?: string | null;
  }): Promise<void> => {
    if (!USE_MOCK) return http(ENDPOINTS.attendance, { method: "POST", body: input });
    const store = db();
    const existing = store.attendance.find(
      (a) =>
        a.session_id === input.session_id &&
        a.student_id === input.student_id &&
        a.session_date === input.session_date,
    );
    if (existing) {
      existing.status = input.status;
      existing.reason = input.reason ?? null;
    } else {
      store.attendance.push({ id: uid(), ...input, reason: input.reason ?? null });
    }
    save();
  },
};

export const behaviorTagsApi = {
  list: async (): Promise<BehaviorTag[]> => {
    if (!USE_MOCK) return http(ENDPOINTS.behaviorTags);
    return delay([...db().behaviorTags].sort((a, b) => a.name.localeCompare(b.name)));
  },
  create: async (input: { name: string; type: BehaviorType; points: number }): Promise<void> => {
    if (!USE_MOCK) return http(ENDPOINTS.behaviorTags, { method: "POST", body: input });
    db().behaviorTags.push({ id: uid(), ...input });
    save();
  },
  update: async (id: string, input: Partial<Omit<BehaviorTag, "id">>): Promise<void> => {
    if (!USE_MOCK) return http(ENDPOINTS.behaviorTag(id), { method: "PATCH", body: input });
    const tag = db().behaviorTags.find((t) => t.id === id);
    if (tag) Object.assign(tag, input);
    save();
  },
  remove: async (id: string): Promise<void> => {
    if (!USE_MOCK) return http(ENDPOINTS.behaviorTag(id), { method: "DELETE" });
    const store = db();
    store.behaviorTags = store.behaviorTags.filter((t) => t.id !== id);
    save();
  },
};

export const behaviorsApi = {
  list: async (filter: {
    session_id?: string;
    date?: string;
    student_ids?: string[];
  }): Promise<BehaviorRecord[]> => {
    if (!USE_MOCK)
      return http(ENDPOINTS.behaviors, {
        query: { session_id: filter.session_id, date: filter.date },
      });
    return delay(
      db()
        .behaviors.filter(
          (b) =>
            (!filter.session_id || b.session_id === filter.session_id) &&
            (!filter.date || b.session_date === filter.date) &&
            (!filter.student_ids || filter.student_ids.includes(b.student_id)),
        )
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    );
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
    if (!USE_MOCK) return http(ENDPOINTS.behaviors, { method: "POST", body: input });
    db().behaviors.push({
      id: uid(),
      created_at: new Date().toISOString(),
      session_id: input.session_id ?? null,
      tag_id: input.tag_id ?? null,
      comment: input.comment ?? null,
      consequence: input.consequence ?? null,
      student_id: input.student_id,
      type: input.type,
      points: input.points,
      session_date: input.session_date,
    });
    save();
  },
};

export const bathroomApi = {
  list: async (filter: { session_id?: string; student_ids?: string[] }): Promise<BathroomLog[]> => {
    if (!USE_MOCK) return http(ENDPOINTS.bathroomLogs, { query: { session_id: filter.session_id } });
    return delay(
      db()
        .bathroom.filter(
          (b) =>
            (!filter.session_id || b.session_id === filter.session_id) &&
            (!filter.student_ids || filter.student_ids.includes(b.student_id)),
        )
        .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)),
    );
  },
  log: async (input: {
    student_id: string;
    session_id?: string | null;
    note?: string | null;
  }): Promise<void> => {
    if (!USE_MOCK) return http(ENDPOINTS.bathroomLogs, { method: "POST", body: input });
    db().bathroom.push({
      id: uid(),
      student_id: input.student_id,
      session_id: input.session_id ?? null,
      occurred_at: new Date().toISOString(),
      returned_at: null,
      note: input.note ?? null,
    });
    save();
  },
};

export const scoreboardApi = {
  byGrade: async (gradeId: string): Promise<ScoreRow[]> => {
    if (!USE_MOCK) return http(ENDPOINTS.scoreboard, { query: { grade_id: gradeId } });
    const students = await studentsApi.listByGrade(gradeId);
    const ids = students.map((s) => s.id);
    if (ids.length === 0) return [];
    const rows = await behaviorsApi.list({ student_ids: ids });
    const totals = new Map<string, number>();
    for (const r of rows) totals.set(r.student_id, (totals.get(r.student_id) ?? 0) + r.points);
    return students
      .map((s) => ({ student_id: s.id, full_name: s.full_name, points: totals.get(s.id) ?? 0 }))
      .sort((a, b) => b.points - a.points || a.full_name.localeCompare(b.full_name));
  },
};
