/**
 * ============================================================
 *  BACKEND CONFIGURATION  —  edit this file, nothing else
 * ============================================================
 *
 * This app has NO built-in backend service wired in.
 * Everything the UI needs goes through `src/api/*`, and every
 * network detail is configured right here.
 *
 * 1) Point the app at YOUR backend:
 *      set VITE_API_BASE_URL in .env  (e.g. https://api.myschool.com)
 *    While it is empty the app runs on the local in-memory
 *    demo data in `src/api/mock-db.ts` so the UI stays usable.
 *
 * 2) Social sign-in (Google / Apple / your own Supabase project…):
 *    fill in SOCIAL_AUTH below and implement `signInWithSocial`
 *    in `src/api/auth.api.ts`. The button already calls it.
 */

/** Base URL of your REST API. Empty string = demo/mock mode. */
export const API_BASE_URL: string =
  (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? "";

/** When true, all api calls are served by the local demo store. */
export const USE_MOCK = API_BASE_URL.trim().length === 0;

/** Where the access token is kept in the browser. */
export const TOKEN_STORAGE_KEY = "classtrack.token";

/**
 * ------------------------------------------------------------
 * YOUR SOCIAL / SUPABASE CONFIGURATION — fill these in
 * ------------------------------------------------------------
 * Example (Supabase):
 *   url:      "https://xxxx.supabase.co"
 *   anonKey:  "sb_publishable_..."
 *   then in auth.api.ts -> signInWithSocial() call
 *   supabase.auth.signInWithOAuth({ provider })
 */
export const SOCIAL_AUTH = {
  /** Providers to show on the sign-in screen. */
  enabledProviders: ["google"] as SocialProvider[],

  /** Where the provider should send the user back to. */
  redirectUrl: typeof window !== "undefined" ? window.location.origin : "",

  /** Optional: your own Supabase project. Leave blank if unused. */
  supabase: {
    url: import.meta.env['VITE_SUPABASE_URL'] ?? "",
    anonKey: import.meta.env['VITE_SUPABASE_ANON_KEY'] ?? "",
  },

  /** Optional: OAuth client ids if you talk to providers directly. */
  clients: {
    google: import.meta.env['VITE_GOOGLE_CLIENT_ID'] ?? "",
    apple: import.meta.env['VITE_APPLE_CLIENT_ID'] ?? "",
  },
} as const;

export type SocialProvider = "google" | "apple" | "microsoft" | "facebook";

/**
 * ------------------------------------------------------------
 * ENDPOINT MAP — the exact routes the frontend expects
 * ------------------------------------------------------------
 * Rename them to match your backend; no page code changes.
 */
export const ENDPOINTS = {
  // auth
  signIn: "/auth/login",
  signUp: "/auth/register",
  signOut: "/auth/logout",
  me: "/auth/me",
  social: (provider: string) => `/auth/social/${provider}`,

  // users (admin)
  users: "/users",
  user: (id: string) => `/users/${id}`,

  // school data
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

  // tracking
  attendance: "/attendance",
  behaviorTags: "/behavior-tags",
  behaviorTag: (id: string) => `/behavior-tags/${id}`,
  behaviors: "/behaviors",
  bathroomLogs: "/bathroom-logs",
  scoreboard: "/scoreboard",
  report: "/reports/session",
} as const;
