import { ENDPOINTS, USE_MOCK } from "./config";
import { ApiError, http } from "./http";
import { db, delay, save, uid } from "./mock-db";
import { fullName, type AppRole, type PersonName, type UserRecord } from "./types";

export interface CreateUserInput extends PersonName {
  email: string;
  role: AppRole;
  /** Leave empty so the user sets their own password by invitation. */
  password?: string | null;
}

/** Admin-only: manage the people who can sign in (admins & teachers). */
export const usersApi = {
  list: async (): Promise<UserRecord[]> => {
    if (!USE_MOCK) {
      const rows = await http<UserRecord[]>(ENDPOINTS.users);
      // The backend may return only the name parts — always derive a display name.
      return (rows ?? []).map((u) => ({ ...u, full_name: fullName(u) }));
    }
    return delay(db().users.map(({ password: _p, ...u }) => ({ ...u, full_name: fullName(u) })));
  },

  create: async (input: CreateUserInput): Promise<UserRecord> => {
    if (!input.first_name.trim()) throw new ApiError("First name is required");
    if (!input.email.trim()) throw new ApiError("Email is required");
    if (!USE_MOCK) return http(ENDPOINTS.usersCreate, { method: "POST", body: input });

    const store = db();
    if (store.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw new ApiError("An account with this email already exists", 409);
    }
    const user = {
      id: uid(),
      email: input.email.trim(),
      first_name: input.first_name.trim(),
      middle_name: input.middle_name?.trim() || null,
      last_name: input.last_name?.trim() || null,
      full_name: fullName(input),
      role: input.role,
      created_at: new Date().toISOString(),
      password: input.password?.trim() || null,
    };
    store.users.push(user);
    save();
    const { password: _p, ...rest } = user;
    return delay(rest);
  },

  remove: async (id: string): Promise<void> => {
    if (!USE_MOCK) return http(ENDPOINTS.user(id), { method: "DELETE" });
    const store = db();
    store.users = store.users.filter((u) => u.id !== id);
    save();
  },
};
