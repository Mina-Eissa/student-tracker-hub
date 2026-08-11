import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type AuthUser, type SocialProvider } from "@/api";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    first_name: string;
    middle_name: string | null;
    last_name: string | null;
    email: string;
    password: string;
  }) => Promise<void>;
  signInWithSocial: (provider: SocialProvider) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.auth.me(),
    staleTime: 30_000,
  });

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["me"] });
  }, [qc]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: data ?? null,
      isLoading,
      isAdmin: data?.role === "Admin",
      signIn: async (email, password) => {
        const user = await api.auth.signIn(email, password);
        qc.setQueryData(["me"], user);
      },
      signUp: async (input) => {
        const user = await api.auth.signUp(input);
        qc.setQueryData(["me"], user);
      },
      signInWithSocial: async (provider) => {
        const user = await api.auth.signInWithSocial(provider);
        if (user) qc.setQueryData(["me"], user);
      },
      signOut: async () => {
        await api.auth.signOut();
        qc.clear();
      },
      refresh,
    }),
    [data, isLoading, qc, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
