import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/scoreboard")({
  head: () => ({
    meta: [
      { title: "Scoreboard — ClassTrack" },
      {
        name: "description",
        content:
          "Ranked behavior point totals for every student in a grade, built from your positive and negative tags.",
      },
      { property: "og:title", content: "Scoreboard — ClassTrack" },
      {
        property: "og:description",
        content: "Students in a grade ranked by behavior points.",
      },
    ],
  }),
  component: Scoreboard,
});

function Scoreboard() {
  const [gradeId, setGradeId] = useState<string>("");

  const { data: grades } = useQuery({
    queryKey: ["grades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grades").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const activeGrade = gradeId || grades?.[0]?.id || "";

  const { data: students } = useQuery({
    queryKey: ["students", activeGrade],
    enabled: !!activeGrade,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,full_name,student_code")
        .eq("grade_id", activeGrade);
      if (error) throw error;
      return data;
    },
  });

  const ids = (students ?? []).map((s) => s.id);

  const { data: behaviors } = useQuery({
    queryKey: ["scores", activeGrade, ids.length],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("behaviors")
        .select("student_id,points,type")
        .in("student_id", ids);
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(() => {
    const map = new Map<string, { points: number; pos: number; neg: number }>();
    (students ?? []).forEach((s) => map.set(s.id, { points: 0, pos: 0, neg: 0 }));
    (behaviors ?? []).forEach((b) => {
      const cur = map.get(b.student_id);
      if (!cur) return;
      cur.points += b.points;
      if (b.type === "positive") cur.pos += 1;
      else cur.neg += 1;
    });
    return (students ?? [])
      .map((s) => ({ ...s, ...map.get(s.id)! }))
      .sort((a, b) => b.points - a.points || a.full_name.localeCompare(b.full_name));
  }, [students, behaviors]);

  return (
    <AppShell
      title="Scoreboard"
      description="Students ranked by total behavior points."
      actions={
        <Select value={activeGrade} onValueChange={setGradeId}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Select grade" />
          </SelectTrigger>
          <SelectContent>
            {(grades ?? []).map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Student</th>
              <th className="px-4 py-3 text-right font-medium">Positive</th>
              <th className="px-4 py-3 text-right font-medium">Negative</th>
              <th className="px-4 py-3 text-right font-medium">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {i < 3 ? <Trophy className="size-4 text-primary" /> : i + 1}
                </td>
                <td className="px-4 py-3 font-medium">
                  {r.full_name}
                  <span className="ml-2 text-xs text-muted-foreground">{r.student_code}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{r.pos}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{r.neg}</td>
                <td
                  className={`px-4 py-3 text-right font-semibold tabular-nums ${
                    r.points > 0
                      ? "text-primary"
                      : r.points < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {r.points > 0 ? `+${r.points}` : r.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No students in this grade yet.
          </p>
        )}
      </div>
    </AppShell>
  );
}
