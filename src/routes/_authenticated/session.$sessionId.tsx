import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, DoorOpen, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtClock, fmtTime, todayISO } from "@/lib/format";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/session/$sessionId")({
  head: () => ({
    meta: [
      { title: "Live Session — ClassTrack" },
      {
        name: "description",
        content:
          "Run a live class session: mark attendance, award behavior points and log bathroom trips.",
      },
      { property: "og:title", content: "Live Session — ClassTrack" },
      {
        property: "og:description",
        content: "Attendance, behavior and bathroom tracking for the running session.",
      },
    ],
  }),
  component: SessionPage,
});

const STATUSES = ["present", "absent", "late", "excused"] as const;
type Status = (typeof STATUSES)[number];
const NEEDS_REASON: Status[] = ["late", "excused"];

const statusStyle: Record<Status, string> = {
  present: "bg-primary text-primary-foreground",
  absent: "bg-destructive text-destructive-foreground",
  late: "bg-warning text-warning-foreground",
  excused: "bg-info text-info-foreground",
};

function SessionPage() {
  const { sessionId } = Route.useParams();
  const qc = useQueryClient();
  const date = todayISO();
  const [reasonFor, setReasonFor] = useState<{ studentId: string; status: Status } | null>(null);
  const [reason, setReason] = useState("");
  const [behaviorFor, setBehaviorFor] = useState<{ id: string; full_name: string } | null>(null);

  const { data: session } = useQuery({
    queryKey: ["session-detail", sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id,title,grade_id,start_time,end_time,room,grades(name)")
        .eq("id", sessionId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const gradeId = session?.grade_id;

  const { data: students } = useQuery({
    queryKey: ["students", gradeId],
    enabled: !!gradeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,full_name,student_code")
        .eq("grade_id", gradeId!)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: attendance } = useQuery({
    queryKey: ["attendance", sessionId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("student_id,status,reason")
        .eq("session_id", sessionId)
        .eq("session_date", date);
      if (error) throw error;
      return data;
    },
  });

  const { data: tags } = useQuery({
    queryKey: ["behavior_tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("behavior_tags")
        .select("*")
        .order("type")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: behaviors } = useQuery({
    queryKey: ["behaviors", sessionId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("behaviors")
        .select("id,student_id,points,type,comment,consequence,created_at,behavior_tags(name)")
        .eq("session_id", sessionId)
        .eq("session_date", date)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: bathroom } = useQuery({
    queryKey: ["bathroom", sessionId, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bathroom_logs")
        .select("id,student_id,occurred_at,note")
        .eq("session_id", sessionId)
        .gte("occurred_at", `${date}T00:00:00`)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const attMap = useMemo(() => {
    const m = new Map<string, { status: Status; reason: string | null }>();
    (attendance ?? []).forEach((a) =>
      m.set(a.student_id, { status: a.status as Status, reason: a.reason }),
    );
    return m;
  }, [attendance]);

  const pointsMap = useMemo(() => {
    const m = new Map<string, number>();
    (behaviors ?? []).forEach((b) => m.set(b.student_id, (m.get(b.student_id) ?? 0) + b.points));
    return m;
  }, [behaviors]);

  const bathroomCount = useMemo(() => {
    const m = new Map<string, number>();
    (bathroom ?? []).forEach((b) => m.set(b.student_id, (m.get(b.student_id) ?? 0) + 1));
    return m;
  }, [bathroom]);

  const setStatus = useMutation({
    mutationFn: async (v: { studentId: string; status: Status; reason?: string | null }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("attendance").upsert(
        {
          session_id: sessionId,
          student_id: v.studentId,
          session_date: date,
          status: v.status,
          reason: v.reason ?? null,
          recorded_by: u.user!.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "session_id,student_id,session_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance", sessionId, date] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const logBathroom = useMutation({
    mutationFn: async (studentId: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("bathroom_logs").insert({
        student_id: studentId,
        session_id: sessionId,
        recorded_by: u.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bathroom trip logged");
      qc.invalidateQueries({ queryKey: ["bathroom", sessionId, date] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleStatusClick(studentId: string, status: Status) {
    if (NEEDS_REASON.includes(status)) {
      setReason(attMap.get(studentId)?.reason ?? "");
      setReasonFor({ studentId, status });
      return;
    }
    setStatus.mutate({ studentId, status, reason: null });
  }

  return (
    <AppShell
      title={session?.title ?? "Session"}
      description={
        session
          ? `${session.grades?.name ?? ""} · ${fmtTime(session.start_time)}–${fmtTime(
              session.end_time,
            )} · ${new Date().toLocaleDateString()}`
          : undefined
      }
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/schedule">
            <ArrowLeft className="size-3.5" /> Schedule
          </Link>
        </Button>
      }
    >
      <Tabs defaultValue="attendance">
        <TabsList className="mb-4">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="bathroom">Bathroom log</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <ul className="divide-y divide-border">
              {(students ?? []).map((s) => {
                const rec = attMap.get(s.id);
                return (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.student_code ?? "—"}
                        {rec?.reason ? ` · ${rec.reason}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUSES.map((st) => (
                        <button
                          key={st}
                          onClick={() => handleStatusClick(s.id, st)}
                          className={`rounded-md border border-border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                            rec?.status === st
                              ? statusStyle[st]
                              : "bg-background text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
            {(students ?? []).length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No students in this grade yet.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="behavior">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <ul className="divide-y divide-border">
                {(students ?? []).map((s) => {
                  const pts = pointsMap.get(s.id) ?? 0;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <p className="text-sm font-medium">{s.full_name}</p>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            pts > 0
                              ? "text-primary"
                              : pts < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {pts > 0 ? `+${pts}` : pts}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => setBehaviorFor(s)}>
                          Log behavior
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Today in this session</h3>
              <ul className="mt-3 space-y-3">
                {(behaviors ?? []).map((b) => (
                  <li key={b.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant={b.type === "positive" ? "default" : "destructive"}>
                        {b.behavior_tags?.name ?? b.type}
                      </Badge>
                      <span className="tabular-nums text-muted-foreground">
                        {b.points > 0 ? `+${b.points}` : b.points}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {(students ?? []).find((s) => s.id === b.student_id)?.full_name}
                      {b.comment ? ` — ${b.comment}` : ""}
                    </p>
                    {b.consequence && (
                      <p className="text-muted-foreground">Consequence: {b.consequence}</p>
                    )}
                  </li>
                ))}
                {(behaviors ?? []).length === 0 && (
                  <li className="text-xs text-muted-foreground">Nothing logged yet.</li>
                )}
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bathroom">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <ul className="divide-y divide-border">
                {(students ?? []).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {bathroomCount.get(s.id) ?? 0} trip(s) today
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => logBathroom.mutate(s.id)}>
                      <DoorOpen className="size-3.5" /> Log trip
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold">Trip times</h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                {(bathroom ?? []).map((b) => (
                  <li key={b.id} className="flex justify-between gap-2">
                    <span>{(students ?? []).find((s) => s.id === b.student_id)?.full_name}</span>
                    <span className="tabular-nums">{fmtClock(b.occurred_at)}</span>
                  </li>
                ))}
                {(bathroom ?? []).length === 0 && <li>No trips recorded.</li>}
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <ReasonDialog
        open={!!reasonFor}
        status={reasonFor?.status}
        reason={reason}
        setReason={setReason}
        onClose={() => setReasonFor(null)}
        onSave={() => {
          if (reasonFor) {
            setStatus.mutate({
              studentId: reasonFor.studentId,
              status: reasonFor.status,
              reason: reason.trim() || null,
            });
          }
          setReasonFor(null);
        }}
      />

      <BehaviorDialog
        student={behaviorFor}
        sessionId={sessionId}
        date={date}
        tags={tags ?? []}
        onClose={() => setBehaviorFor(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["behaviors", sessionId, date] })}
      />
    </AppShell>
  );
}

function ReasonDialog({
  open,
  status,
  reason,
  setReason,
  onClose,
  onSave,
}: {
  open: boolean;
  status?: Status;
  reason: string;
  setReason: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">{status} — reason</DialogTitle>
          <DialogDescription>
            Add the reason so it appears on the printed session report.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Bus delay, medical appointment…"
          maxLength={300}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Tag = { id: string; name: string; type: string; points: number };

function BehaviorDialog({
  student,
  sessionId,
  date,
  tags,
  onClose,
  onSaved,
}: {
  student: { id: string; full_name: string } | null;
  sessionId: string;
  date: string;
  tags: Tag[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tagId, setTagId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [consequence, setConsequence] = useState("");
  const tag = tags.find((t) => t.id === tagId);

  const save = useMutation({
    mutationFn: async () => {
      if (!student || !tag) throw new Error("Pick a behavior tag first");
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("behaviors").insert({
        student_id: student.id,
        session_id: sessionId,
        session_date: date,
        tag_id: tag.id,
        type: tag.type as "positive" | "negative",
        points: tag.points,
        comment: comment.trim() || null,
        consequence: consequence.trim() || null,
        recorded_by: u.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Behavior recorded");
      setTagId(null);
      setComment("");
      setConsequence("");
      onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!student} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log behavior — {student?.full_name}</DialogTitle>
          <DialogDescription>Points come from the selected tag.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Positive</Label>
            <div className="flex flex-wrap gap-2">
              {tags
                .filter((t) => t.type === "positive")
                .map((t) => (
                  <TagChip key={t.id} tag={t} active={t.id === tagId} onClick={() => setTagId(t.id)} />
                ))}
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Negative</Label>
            <div className="flex flex-wrap gap-2">
              {tags
                .filter((t) => t.type === "negative")
                .map((t) => (
                  <TagChip key={t.id} tag={t} active={t.id === tagId} onClick={() => setTagId(t.id)} />
                ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              value={comment}
              maxLength={500}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="consequence">Consequence</Label>
            <Input
              id="consequence"
              value={consequence}
              maxLength={200}
              onChange={(e) => setConsequence(e.target.value)}
              placeholder="e.g. Moved seat, parent contacted"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={!tagId || save.isPending}>
            Save behavior
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TagChip({ tag, active, onClick }: { tag: Tag; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-secondary"
      }`}
    >
      {tag.points >= 0 ? <Plus className="size-3" /> : <Minus className="size-3" />}
      {tag.name}
      <span className="tabular-nums opacity-70">{Math.abs(tag.points)}</span>
    </button>
  );
}
