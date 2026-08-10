import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Play, CalendarDays } from "lucide-react";
import { api } from "@/api";
import { useSession, useIsAdmin } from "@/lib/auth";
import { DAYS, fmtTime } from "@/lib/format";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [
      { title: "Weekly Schedule — ClassTrack" },
      {
        name: "description",
        content:
          "See every session for the grades assigned to you and start a class to load its student list.",
      },
      { property: "og:title", content: "Weekly Schedule — ClassTrack" },
      {
        property: "og:description",
        content: "Your weekly class sessions with one-tap session start.",
      },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const { data: user } = useSession();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const todayIdx = new Date().getDay();

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["schedule", user?.id, isAdmin],
    enabled: !!user?.id,
    queryFn: () => api.sessions.list(isAdmin ? {} : { teacher_id: user!.id }),
  });

  return (
    <AppShell
      title="Weekly schedule"
      description="Sessions for the grades assigned to you. Start a session to load its students."
    >
      {isLoading && <p className="text-sm text-muted-foreground">Loading schedule…</p>}
      {!isLoading && (sessions ?? []).length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
          <CalendarDays className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No sessions assigned yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            An administrator needs to assign grades and create sessions for you.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {DAYS.map((day, idx) => {
          const rows = (sessions ?? []).filter((s) => s.day_of_week === idx);
          if (rows.length === 0) return null;
          return (
            <section
              key={day}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <header className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">{day}</h2>
                {idx === todayIdx && <Badge>Today</Badge>}
              </header>
              <ul className="divide-y divide-border">
                {rows.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.grade_name} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
                        {s.room ? ` · ${s.room}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        navigate({
                          to: "/session/$sessionId",
                          params: { sessionId: s.id },
                        })
                      }
                    >
                      <Play className="size-3.5" /> Start
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
