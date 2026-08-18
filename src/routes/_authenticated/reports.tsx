import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { api } from "@/api";
import { AppShell } from "@/components/AppShell";
import { fmtClock, fmtTime, todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Session Reports — ClassTrack" },
      {
        name: "description",
        content:
          "Pick a date and session to build a printable PDF report of attendance, behavior points and bathroom trips.",
      },
      { property: "og:title", content: "Session Reports — ClassTrack" },
      {
        property: "og:description",
        content: "Printable per-session attendance and behavior reports.",
      },
    ],
  }),
  component: Reports,
});

function Reports() {
  const [date, setDate] = useState(todayISO());
  const [sessionId, setSessionId] = useState("");

  const { data: sessions } = useQuery({
    queryKey: ["all-sessions"],
    queryFn: () => api.sessions.list(),
  });

  const session = (sessions ?? []).find((s) => s.id === sessionId);
  const { data: grades } = useQuery({ queryKey: ["grades"], queryFn: () => api.grades.list() });
  const { data: tags } = useQuery({ queryKey: ["behavior_tags"], queryFn: () => api.behaviorTags.list() });
  const gradeName = (id: string) => grades?.find((g) => g.id === id)?.name ?? "";

  const { data: report } = useQuery({
    queryKey: ["report", sessionId, date],
    enabled: !!sessionId && !!date,
    queryFn: async () => {
      const [students, attendance, behaviors, bathroom] = await Promise.all([
        api.students.listByGrade(session!.grade_id),
        api.attendance.listForSession(sessionId, date),
        api.behaviors.list({ session_id: sessionId, date }),
        api.bathroom.list({ session_id: sessionId }),
      ]);
      return {
        students,
        attendance,
        behaviors,
        bathroom: bathroom.filter((b) => b.occurred_at.slice(0, 10) === date),
      };
    },
  });

  return (
    <AppShell
      title="Reports"
      description="Choose a date and session, then print or save as PDF."
      actions={
        <Button size="sm" disabled={!report} onClick={() => window.print()}>
          <Printer className="size-3.5" /> Print / Save PDF
        </Button>
      }
    >
      <div className="mb-6 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 print:hidden">
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Session</Label>
          <Select value={sessionId} onValueChange={setSessionId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a session" />
            </SelectTrigger>
            <SelectContent>
              {(sessions ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title} — {gradeName(s.grade_id)} ({fmtTime(s.start_time)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!report && (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground print:hidden">
          Pick a date and session to build the report.
        </p>
      )}

      {report && session && (
        <article className="rounded-lg border border-border bg-card p-6 print:border-0 print:p-0">
          <header className="border-b border-border pb-4">
            <h2 className="text-lg font-semibold">{session.title}</h2>
            <p className="text-sm text-muted-foreground">
              {gradeName(session.grade_id)} · {new Date(date).toDateString()} ·{" "}
              {fmtTime(session.start_time)}–{fmtTime(session.end_time)}
              {session.room ? ` · ${session.room}` : ""}
            </p>
          </header>

          <section className="mt-5">
            <h3 className="mb-2 text-sm font-semibold">Attendance</h3>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Student</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Reason</th>
                  <th className="py-2 text-right">Points</th>
                  <th className="py-2 text-right">Bathroom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.students.map((s) => {
                  const a = report.attendance.find((x) => x.student_id === s.id);
                  const pts = report.behaviors
                    .filter((b) => b.student_id === s.id)
                    .reduce((sum, b) => sum + b.points, 0);
                  const trips = report.bathroom.filter((b) => b.student_id === s.id);
                  return (
                    <tr key={s.id}>
                      <td className="py-2">{s.full_name}</td>
                      <td className="py-2 capitalize">{a?.status ?? "—"}</td>
                      <td className="py-2 text-muted-foreground">{a?.reason ?? "—"}</td>
                      <td className="py-2 text-right tabular-nums">
                        {pts > 0 ? `+${pts}` : pts}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {trips.length}
                        {trips.length > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({trips.map((t) => fmtClock(t.occurred_at)).join(", ")})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="mt-6">
            <h3 className="mb-2 text-sm font-semibold">Behavior notes</h3>
            <ul className="space-y-2 text-sm">
              {report.behaviors.map((b, i) => (
                <li key={i} className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {report.students.find((s) => s.id === b.student_id)?.full_name}
                  </span>{" "}
                  — {(tags ?? []).find((t) => t.id === b.tag_id)?.tag ?? b.type} ({b.points > 0 ? `+${b.points}` : b.points})
                  {b.comment ? ` · ${b.comment}` : ""}
                  {b.consequence ? ` · Consequence: ${b.consequence}` : ""}
                </li>
              ))}
              {report.behaviors.length === 0 && (
                <li className="text-muted-foreground">No behavior recorded.</li>
              )}
            </ul>
          </section>
        </article>
      )}
    </AppShell>
  );
}
