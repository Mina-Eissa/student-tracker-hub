import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { api } from "@/api";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!api.auth.isAuthenticated()) throw redirect({ to: "/auth" });
    const user = await api.auth.me();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: () => <Outlet />,
});
