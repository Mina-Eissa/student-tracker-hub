import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { DAYS, fmtTime } from "@/lib/format";
import { useIsAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — ClassTrack" },
      {
        name: "description",
        content:
          "Admin tools to create grades, upload student rosters, assign grades to teachers and build the session timetable.",
      },
      { property: "og:title", content: "Admin — ClassTrack" },
      {
        property: "og:description",
        content: "Manage grades, students, teacher assignments and sessions.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const isAdmin = useIsAdmin();


  if (!isAdmin) {
    return (
      <AppShell title="Admin" description="Restricted area">
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          You need an admin role to manage grades, students and sessions.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin" description="Grades, students, teachers and the timetable.">
      <Tabs defaultValue="grades">
        <TabsList className="mb-4">
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="grades">
          <GradesTab />
        </TabsContent>
        <TabsContent value="students">
          <StudentsTab />
        </TabsContent>
        <TabsContent value="teachers">
          <TeachersTab />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function useGrades() {
  return useQuery({
    queryKey: ["grades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("grades").select("id,name").order("name");
      if (error) throw error;
      return data;
    },
  });
}

function useTeachers() {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function GradesTab() {
  const qc = useQueryClient();
  const { data: grades } = useGrades();
  const [name, setName] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const value = name.trim();
      if (!value) throw new Error("Grade name is required");
      const { error } = await supabase.from("grades").insert({ name: value });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      toast.success("Grade added");
      qc.invalidateQueries({ queryKey: ["grades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grades"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Add a grade">
        <div className="flex gap-2">
          <Input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            placeholder="Grade 7A"
          />
          <Button onClick={() => add.mutate()}>
            <Plus className="size-3.5" /> Add
          </Button>
        </div>
      </Card>
      <Card title="Grades">
        <ul className="divide-y divide-border text-sm">
          {(grades ?? []).map((g) => (
            <li key={g.id} className="flex items-center justify-between py-2">
              {g.name}
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(g.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
          {(grades ?? []).length === 0 && <li className="py-2 text-muted-foreground">None yet.</li>}
        </ul>
      </Card>
    </div>
  );
}

function StudentsTab() {
  const qc = useQueryClient();
  const { data: grades } = useGrades();
  const [gradeId, setGradeId] = useState("");
  const [bulk, setBulk] = useState("");

  const { data: students } = useQuery({
    queryKey: ["students", gradeId],
    enabled: !!gradeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id,full_name,student_code")
        .eq("grade_id", gradeId)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!gradeId) throw new Error("Pick a grade first");
      const rows = bulk
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
          const [full_name, student_code] = line.split(",").map((p) => p.trim());
          return { full_name: full_name!, student_code: student_code || null, grade_id: gradeId };
        })
        .filter((r) => r.full_name.length > 0);
      if (rows.length === 0) throw new Error("Nothing to upload");
      const { error } = await supabase.from("students").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      setBulk("");
      toast.success(`${n} student(s) added`);
      qc.invalidateQueries({ queryKey: ["students", gradeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["students", gradeId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Upload students">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Grade</Label>
            <Select value={gradeId} onValueChange={setGradeId}>
              <SelectTrigger>
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk">One student per line — {"`name, code`"}</Label>
            <Textarea
              id="bulk"
              rows={8}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder={"Sara Ahmed, S-101\nOmar Khaled, S-102"}
            />
          </div>
          <Button onClick={() => upload.mutate()} disabled={upload.isPending}>
            Upload roster
          </Button>
        </div>
      </Card>
      <Card title="Roster">
        <ul className="divide-y divide-border text-sm">
          {(students ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <span>
                {s.full_name}
                <span className="ml-2 text-xs text-muted-foreground">{s.student_code}</span>
              </span>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
          {(students ?? []).length === 0 && (
            <li className="py-2 text-muted-foreground">Select a grade to see its roster.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

function TeachersTab() {
  const qc = useQueryClient();
  const { data: grades } = useGrades();
  const { data: teachers } = useTeachers();
  const [teacherId, setTeacherId] = useState("");
  const [gradeId, setGradeId] = useState("");

  const { data: assignments } = useQuery({
    queryKey: ["teacher_grades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_grades")
        .select("id,teacher_id,grade_id,grades(name)");
      if (error) throw error;
      return data;
    },
  });

  const assign = useMutation({
    mutationFn: async () => {
      if (!teacherId || !gradeId) throw new Error("Pick a teacher and a grade");
      const { error } = await supabase
        .from("teacher_grades")
        .insert({ teacher_id: teacherId, grade_id: gradeId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Grade assigned");
      qc.invalidateQueries({ queryKey: ["teacher_grades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teacher_grades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher_grades"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title="Assign a grade to a teacher">
        <div className="space-y-3">
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger>
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              {(teachers ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.full_name || t.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={gradeId} onValueChange={setGradeId}>
            <SelectTrigger>
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              {(grades ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => assign.mutate()}>Assign</Button>
        </div>
      </Card>
      <Card title="Assignments">
        <ul className="divide-y divide-border text-sm">
          {(assignments ?? []).map((a) => {
            const t = (teachers ?? []).find((x) => x.id === a.teacher_id);
            return (
              <li key={a.id} className="flex items-center justify-between py-2">
                <span>
                  {t?.full_name || t?.email || "Unknown"}
                  <span className="ml-2 text-xs text-muted-foreground">{a.grades?.name}</span>
                </span>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(a.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            );
          })}
          {(assignments ?? []).length === 0 && (
            <li className="py-2 text-muted-foreground">No assignments yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

function SessionsTab() {
  const qc = useQueryClient();
  const { data: grades } = useGrades();
  const { data: teachers } = useTeachers();
  const [form, setForm] = useState({
    title: "",
    teacher_id: "",
    grade_id: "",
    day_of_week: "1",
    start_time: "08:00",
    end_time: "08:45",
    room: "",
  });

  const { data: sessions } = useQuery({
    queryKey: ["all-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id,title,day_of_week,start_time,end_time,room,teacher_id,grades(name)")
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.teacher_id || !form.grade_id)
        throw new Error("Title, teacher and grade are required");
      const { error } = await supabase.from("sessions").insert({
        title: form.title.trim(),
        teacher_id: form.teacher_id,
        grade_id: form.grade_id,
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        room: form.room.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session added");
      setForm((f) => ({ ...f, title: "", room: "" }));
      qc.invalidateQueries({ queryKey: ["all-sessions"] });
      qc.invalidateQueries({ queryKey: ["my-sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-sessions"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="New session">
        <div className="space-y-3">
          <Input
            placeholder="Subject / title"
            maxLength={80}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Select
            value={form.teacher_id}
            onValueChange={(v) => setForm({ ...form, teacher_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              {(teachers ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.full_name || t.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={form.grade_id} onValueChange={(v) => setForm({ ...form, grade_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              {(grades ?? []).map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={form.day_of_week}
            onValueChange={(v) => setForm({ ...form, day_of_week: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((d, i) => (
                <SelectItem key={d} value={String(i)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
            <Input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </div>
          <Input
            placeholder="Room (optional)"
            maxLength={40}
            value={form.room}
            onChange={(e) => setForm({ ...form, room: e.target.value })}
          />
          <Button onClick={() => create.mutate()} disabled={create.isPending}>
            Add session
          </Button>
        </div>
      </Card>
      <Card title="Timetable">
        <ul className="divide-y divide-border text-sm">
          {(sessions ?? []).map((s) => {
            const t = (teachers ?? []).find((x) => x.id === s.teacher_id);
            return (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{s.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {DAYS[s.day_of_week]} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)} ·{" "}
                    {s.grades?.name} · {t?.full_name || t?.email || "—"}
                  </span>
                </span>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            );
          })}
          {(sessions ?? []).length === 0 && (
            <li className="py-2 text-muted-foreground">No sessions yet.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
