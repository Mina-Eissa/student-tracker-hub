import { Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  LogOut,
  Settings,
  Tags,
  Trophy,
  FileText,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

const nav = [
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/scoreboard", label: "Scoreboard", icon: Trophy },
  { to: "/tags", label: "Behavior tags", icon: Tags },
  { to: "/reports", label: "Reports", icon: FileText },
];

export function AppShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string | undefined;
  children: ReactNode;
  actions?: ReactNode | undefined;
}) {
  const { user, isAdmin, signOut: doSignOut } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await doSignOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar p-4 text-sidebar-foreground md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <ClipboardList className="size-5 text-sidebar-primary" />
          <span className="text-sm font-semibold tracking-tight">ClassTrack</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
            >
              <Settings className="size-4" />
              Admin
            </Link>
          )}
        </nav>
        <div className="border-t border-sidebar-border pt-3">
          <p className="truncate px-3 pb-2 text-xs text-sidebar-foreground/60">{user?.email}</p>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex flex-wrap items-end justify-between gap-3 border-b border-border bg-card px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
        <nav className="no-print flex gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2 md:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-md px-3 py-1.5 text-xs whitespace-nowrap text-muted-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-md px-3 py-1.5 text-xs whitespace-nowrap text-muted-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
            >
              Admin
            </Link>
          )}
          <Button variant="ghost" size="sm" className="text-xs" onClick={signOut}>
            Sign out
          </Button>
        </nav>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
