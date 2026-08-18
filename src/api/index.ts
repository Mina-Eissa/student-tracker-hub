/**
 * Single entry point for all backend calls.
 *   import { api } from "@/api";
 *
 * Configure your backend URL, endpoints and social login in ./config.ts
 */
import { authApi } from "./auth.api";
import { usersApi } from "./users.api";
import { gradesApi, studentsApi } from "./students.api";
import { sessionsApi, teachersApi } from "./sessions.api";
import { resetMockDb } from "./mock-db";
import {
  attendanceApi,
  bathroomApi,
  behaviorTagsApi,
  behaviorsApi,
  scoreboardApi,
} from "./tracking.api";

export const api = {
  auth: authApi,
  users: usersApi,
  grades: gradesApi,
  students: studentsApi,
  teachers: teachersApi,
  sessions: sessionsApi,
  attendance: attendanceApi,
  behaviorTags: behaviorTagsApi,
  behaviors: behaviorsApi,
  bathroom: bathroomApi,
  scoreboard: scoreboardApi,
  /** Demo helpers — only meaningful while USE_MOCK is true. */
  mock: { reset: resetMockDb },
};

// Handy in the browser console: __classtrack.mock.reset() then reload.
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>)["__classtrack"] = api;
}

export * from "./types";
export { ApiError } from "./http";
export { API_BASE_URL, ENDPOINTS, SOCIAL_AUTH, USE_MOCK } from "./config";
export type { SocialProvider } from "./config";
export { parseRosterLine } from "./students.api";
export { parseRosterFile } from "./roster-file";
export type { StudentInput } from "./students.api";
export type { CreateUserInput } from "./users.api";
