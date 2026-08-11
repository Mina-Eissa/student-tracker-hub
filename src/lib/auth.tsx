import { useAuth } from "@/context/AuthContext";
export type { AppRole, AuthUser } from "@/api";

/** Current user (null when signed out). */
export function useSession() {
  const { user, isLoading } = useAuth();
  return { data: user, isLoading };
}

export function useMe() {
  const { user, isLoading } = useAuth();
  return { data: user, isLoading };
}

export function useMyRoles() {
  const { user } = useAuth();
  return { data: user?.role ?? "Teacher" };
}

/**
 * The one check that separates the two user types:
 *   admin   -> grades, students, users, teacher assignments, timetable
 *   teacher -> own sessions: attendance, behavior, bathroom, reports
 */
export function useIsAdmin() {
  return useAuth().isAdmin;
}
