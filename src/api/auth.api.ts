import { ENDPOINTS, SOCIAL_AUTH, USE_MOCK, type SocialProvider } from "./config";
import { ApiError, http, setToken, getToken } from "./http";
import { db, save, uid } from "./mock-db";
import { fullName, type AuthUser, type PersonName } from "./types";

export interface SignUpInput extends PersonName {
  email: string;
  password: string;
}

function toAuthUser(u: {
  id: string;
  email: string;
  role: "Admin" | "Teacher";
  first_name: string;
  middle_name: string | null;
  last_name: string | null;
}): AuthUser {
  return {
    id: u.id,
    email: u.email,
    first_name: u.first_name,
    middle_name: u.middle_name,
    last_name: u.last_name,
    full_name: fullName(u),
    roles: [u.role],
    isAdmin: u.role === "Admin",
  };
}

export const authApi = {
  isAuthenticated: () => !!getToken(),
  async signIn(email: string, password: string): Promise<AuthUser> {
    if (!USE_MOCK) {
      const res = await http<{ token: string; user: AuthUser }>(ENDPOINTS.signIn, {
        method: "POST",
        body: { email, password },
      });
      setToken(res.token);
      console.log("signIn successful, user:", res.user);
      return res.user;
    }
    const user = db().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || (user.password && user.password !== password)) {
      throw new ApiError("Invalid email or password", 401);
    }
    setToken(`mock.${user.id}`);
    return toAuthUser(user);
  },

  async signUp(input: SignUpInput): Promise<AuthUser> {
    if (!USE_MOCK) {
      const res = await http<{ token: string; user: AuthUser }>(ENDPOINTS.signUp, {
        method: "POST",
        body: input,
      });
      setToken(res.token);
      return res.user;
    }
    const store = db();
    if (store.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw new ApiError("An account with this email already exists", 409);
    }
    const user = {
      id: uid(),
      email: input.email,
      first_name: input.first_name,
      middle_name: input.middle_name,
      last_name: input.last_name,
      full_name: fullName(input),
      role: "Teacher" as const,
      created_at: new Date().toISOString(),
      password: input.password,
    };
    store.users.push(user);
    save();
    setToken(`mock.${user.id}`);
    return toAuthUser(user);
  },

  /**
   * SOCIAL SIGN-IN — plug your provider here.
   * See SOCIAL_AUTH in src/api/config.ts for url / keys / redirect.
   */
  async signInWithSocial(provider: SocialProvider): Promise<AuthUser | null> {
    if (!USE_MOCK) {
      const res = await http<{ token: string; user: AuthUser }>(ENDPOINTS.social(provider), {
        method: "POST",
        body: { redirect_uri: SOCIAL_AUTH.redirectUrl },
      });
      setToken(res.token);
      return res.user;
    }
    // TODO: implement with your own provider, e.g.
    //   supabase.auth.signInWithOAuth({ provider, options: { redirectTo: SOCIAL_AUTH.redirectUrl } })
    throw new ApiError(
      `Social sign-in (${provider}) is not configured yet — set it up in src/api/config.ts`,
      501,
    );
  },

  async me(): Promise<AuthUser | null> {
    const token = getToken();
    if (!token) return null;
    if (!USE_MOCK) return http<AuthUser | null>(ENDPOINTS.me);
    const id = token.replace("mock.", "");
    const user = db().users.find((u) => u.id === id);
    return user ? toAuthUser(user) : null;
  },

  async signOut(): Promise<void> {
    if (!USE_MOCK) {
      await http(ENDPOINTS.signOut, { method: "POST" }).catch(() => undefined);
    }
    setToken(null);
  },
};
