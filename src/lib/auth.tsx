import { useQuery } from "@tanstack/react-query";
import { api, type AppRole, type Me } from "@/lib/api";

export type { AppRole, Me };

/** Current user + roles, fetched through the API layer (src/lib/api.ts). */
export function useMe() {
  return useQuery<Me | null>({
    queryKey: ["me"],
    queryFn: () => api.auth.me(),
  });
}

export function useSession() {
  const q = useMe();
  return { ...q, data: q.data ? { id: q.data.id, email: q.data.email } : null };
}

export function useMyRoles() {
  const q = useMe();
  return { ...q, data: q.data?.roles ?? [] };
}

/**
 * The one check that separates the two user types:
 *   admin   -> grades, students, teacher assignments, timetable management
 *   teacher -> own sessions: attendance, behavior, bathroom, reports
 */
export function useIsAdmin() {
  const { data } = useMe();
  return data?.isAdmin ?? false;
}
