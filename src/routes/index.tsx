import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, DoorOpen, FileText, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClassTrack — Attendance, Behavior & Session Reports" },
      {
        name: "description",
        content:
          "ClassTrack helps teachers take attendance, award behavior points, log bathroom trips and print session reports from one schedule.",
      },
      { property: "og:title", content: "ClassTrack — Attendance, Behavior & Session Reports" },
      {
        property: "og:description",
        content:
          "Run your class session in one place: attendance, behavior points, bathroom logs and printable reports.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: ClipboardList,
    title: "Attendance in one tap",
    body: "Present, absent, late or excused — with a reason field where it matters.",
  },
  {
    icon: Trophy,
    title: "Behavior points",
    body: "Custom tags with plus/minus points that roll straight into the grade scoreboard.",
  },
  {
    icon: DoorOpen,
    title: "Bathroom log",
    body: "Count every trip per student and keep the exact time it happened.",
  },
  {
    icon: FileText,
    title: "Printable reports",
    body: "Pick a date and session, then print or save a clean PDF report.",
  },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/schedule", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-5 text-primary" />
          <span className="font-semibold tracking-tight">ClassTrack</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" /> Built around your weekly schedule
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
          Everything you track in a class session, in one screen.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Start a session from your timetable and ClassTrack loads the student list. Take
          attendance, log behavior, record bathroom trips, then print the report.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-2">
        {features.map((f) => (
          <div key={f.title} className="rounded-lg border border-border bg-card p-5">
            <f.icon className="size-5 text-primary" />
            <h2 className="mt-3 font-medium">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
