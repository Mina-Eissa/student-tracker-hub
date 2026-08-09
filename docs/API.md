# ClassTrack — API / Endpoint Reference

The app talks to the backend directly through the generated client
(`import { supabase } from "@/integrations/supabase/client"`).
Every table is exposed as a REST resource:

```
BASE = <VITE_SUPABASE_URL>/rest/v1
Headers: apikey: <publishable key>, Authorization: Bearer <user access token>
```

There are **no custom server functions / edge functions**. Permissions are
enforced by Row Level Security (RLS) in the database, so the *same* endpoint
behaves differently depending on the signed-in user's role.

---

## 1. Roles

| Role | How it is assigned | Stored in |
|---|---|---|
| `teacher` | automatically on sign-up (DB trigger `handle_new_user`) | `user_roles` |
| `admin` | manually inserted into `user_roles` | `user_roles` |

Role checks in SQL use `has_role(auth.uid(), 'admin')`.
Role checks in the UI use `useIsAdmin()` (`src/lib/auth.tsx`) — this only
hides UI; the database is the real gate.

---

## 2. Auth endpoints

| Action | Call | Endpoint |
|---|---|---|
| Sign in | `supabase.auth.signInWithPassword({email,password})` | `POST /auth/v1/token?grant_type=password` |
| Sign up | `supabase.auth.signUp({email,password,options})` | `POST /auth/v1/signup` |
| Google | `lovable.auth.signInWithOAuth("google")` | `GET /auth/v1/authorize?provider=google` |
| Sign out | `supabase.auth.signOut()` | `POST /auth/v1/logout` |
| Current user | `supabase.auth.getUser()` | `GET /auth/v1/user` |

Used in `src/routes/auth.tsx` and `src/components/AppShell.tsx`.

---

## 3. Data endpoints

Legend: **A** = admin, **T** = teacher, **any** = any signed-in user.
Anonymous (not signed in) has **no access to anything**.

### grades — `/rest/v1/grades`
| Method | Who | Used by |
|---|---|---|
| `GET` select | any | scoreboard, admin, session |
| `POST` insert | **A only** | Admin → Grades |
| `DELETE` | **A only** | Admin → Grades |

### students — `/rest/v1/students`
| Method | Who | Used by |
|---|---|---|
| `GET` (filter `grade_id`) | any | session roster, scoreboard, reports |
| `POST` bulk insert | **A only** | Admin → Students (roster upload) |
| `DELETE` | **A only** | Admin → Students |

### teacher_grades — `/rest/v1/teacher_grades`
| Method | Who |
|---|---|
| `GET` | any |
| `POST` / `DELETE` | **A only** |

### sessions — `/rest/v1/sessions`
| Method | Who | Notes |
|---|---|---|
| `GET` | any | Schedule page filters `teacher_id = auth.uid()`; Admin lists all |
| `POST` / `DELETE` | **A only** | Admin → Sessions builds the timetable |

### profiles — `/rest/v1/profiles`
| Method | Who |
|---|---|
| `GET` | any (teacher picker in admin) |
| `INSERT` / `UPDATE` | only your own row (`id = auth.uid()`) |
| `DELETE` | nobody |

### user_roles — `/rest/v1/user_roles`
| Method | Who |
|---|---|
| `GET` | any (used by `useMyRoles`) |
| `INSERT` / `UPDATE` / `DELETE` | **nobody via API** — DB/admin only (anti privilege-escalation) |

### behavior_tags — `/rest/v1/behavior_tags`
| Method | Who | Used by |
|---|---|---|
| `GET` / `POST` / `PATCH` / `DELETE` | any signed-in user | Tags page (create/update tag + points) |

> Tags are intentionally shared and editable by teachers. Tighten to admin-only
> by changing the `tags write` policy to `has_role(auth.uid(),'admin')`.

### attendance — `/rest/v1/attendance`
| Method | Who |
|---|---|
| `GET` | any |
| `POST` upsert / `PATCH` / `DELETE` | **owner or admin** — row must have `recorded_by = auth.uid()`, admin may touch any row |

Body: `{ session_id, student_id, session_date, status: present|absent|late|excused, reason }`

### behaviors — `/rest/v1/behaviors`
| Method | Who |
|---|---|
| `GET` | any |
| write | **owner or admin** (`recorded_by = auth.uid()`) |

Body: `{ student_id, session_id, tag_id, type: positive|negative, points, comment, consequence, session_date }`
Points feed the Scoreboard (summed per student inside a grade).

### bathroom_logs — `/rest/v1/bathroom_logs`
| Method | Who |
|---|---|
| `GET` | any |
| write | **owner or admin** (`recorded_by = auth.uid()`) |

Body: `{ student_id, session_id, occurred_at, returned_at, note }`

---

## 4. Database function

`has_role(_user_id uuid, _role app_role) -> boolean`
`POST /rest/v1/rpc/has_role` — executable by authenticated users only.

---

## 5. Admin vs teacher — summary

| Capability | Teacher | Admin |
|---|---|---|
| Sign in / see own schedule | ✅ | ✅ |
| Start a session, take attendance | ✅ (own records) | ✅ (all records) |
| Log behavior + bathroom trips | ✅ (own records) | ✅ (all records) |
| Edit/delete someone else's records | ❌ | ✅ |
| View scoreboard & reports | ✅ | ✅ |
| Create/edit behavior tags | ✅ | ✅ |
| Create/delete grades | ❌ | ✅ |
| Upload/delete students | ❌ | ✅ |
| Assign grades to teachers | ❌ | ✅ |
| Create/delete sessions (timetable) | ❌ | ✅ |
| Access `/admin` page | ❌ (blocked message) | ✅ |
| Grant roles | ❌ | ❌ (database only) |

A teacher who calls an admin-only endpoint directly gets a
`403 / new row violates row-level security policy` from the database, even if
the UI button is hidden — the frontend check is cosmetic, RLS is the real one.

---

## Frontend → backend layer: `src/lib/api.ts`

All screens call `api.*` from `src/lib/api.ts`. Nothing else in the UI talks to a backend.

- `ENDPOINTS` in that file lists every route path the app needs (`/me`, `/grades`, `/students`, `/sessions`, `/attendance`, `/behavior-tags`, `/behaviors`, `/bathroom-logs`, `/scoreboard`, `/reports/session`).
- Set `VITE_API_BASE_URL` to your own server and every call becomes an HTTP request to those routes (JSON, `Authorization: Bearer <token>`). Leave it empty and it uses the built-in Lovable Cloud database.

### Telling admin from teacher

`GET /me` must return:

```json
{ "id": "...", "email": "...", "fullName": "...", "roles": ["admin"], "isAdmin": true }
```

In the UI: `useIsAdmin()` / `useMe()` from `src/lib/auth.tsx`.

| | teacher | admin |
|---|---|---|
| Schedule, run session, attendance, behavior, bathroom, reports | yes (own sessions) | yes (all) |
| Behavior tags | view | create / edit / delete |
| Grades, students upload, teacher↔grade assignment, timetable | no | yes |

Roles are never trusted from the client — your backend must re-check `isAdmin` on every admin route.
