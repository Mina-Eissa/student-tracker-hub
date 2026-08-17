import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api, parseRosterLine, type StudentInput } from "@/api";
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
          "Admin tools to create users, grades, upload student rosters, assign grades to teachers and build the session timetable.",
      },
      { property: "og:title", content: "Admin — ClassTrack" },
      {
        property: "og:description",
        content: "Manage users, grades, students, teacher assignments and sessions.",
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
          You need an admin role to manage users, grades, students and sessions.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Admin"
      description="Users, grades, students, teachers and the timetable."
    >
      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
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
  return useQuery({ queryKey: ["grades"], queryFn: () => api.grades.list() });
}
function useTeachers() {
  return useQuery({ queryKey: ["teachers"], queryFn: () => api.teachers.list() });
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ---------------------------------- Users --------------------------------- */

function UsersTab() {
  const qc = useQueryClient();
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => api.users.list() });

  const remove = useMutation({
    mutationFn: (id: string) => api.users.remove(id),
    onSuccess: () => {
      toast.success("User removed");
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["teachers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel
      title="Accounts that can sign in"
      action={
        <Button size="sm" asChild>
          <Link to="/users/new">
            <UserPlus className="size-3.5" /> Create user
          </Link>
        </Button>
      }
    >
      <ul className="divide-y divide-border">
        {(users ?? []).map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{u.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {u.email} · <span className="capitalize">{u.role}</span>
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => remove.mutate(u.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </li>
        ))}
        {(users ?? []).length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">No users yet.</li>
        )}
      </ul>
    </Panel>
  );
}

/* --------------------------------- Grades --------------------------------- */

function GradesTab() {
  const qc = useQueryClient();
  const { data: grades } = useGrades();
  const [name, setName] = useState("");

  const create = useMutation({
    mutationFn: () => api.grades.create(name),
    onSuccess: () => {
      setName("");
      toast.success("Grade added");
      qc.invalidateQueries({ queryKey: ["grades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.grades.remove(id),
    onSuccess: () => {
      toast.success("Grade removed");
      qc.invalidateQueries({ queryKey: ["grades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="New grade">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grade 5A" />
          <Button type="submit">
            <Plus className="size-4" /> Add
          </Button>
        </form>
      </Panel>
      <Panel title="Grades">
        <ul className="divide-y divide-border">
          {(grades ?? []).map((g) => (
            <li key={g.id} className="flex items-center justify-between py-2 text-sm">
              {g.name}
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(g.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
          {(grades ?? []).length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No grades yet.</li>
          )}
        </ul>
      </Panel>
    </div>
  );
}

/* -------------------------------- Students -------------------------------- */

function StudentsTab() {
  const qc = useQueryClient();
  const { data: grades } = useGrades();
  const [gradeId, setGradeId] = useState("");
  const active = gradeId || grades?.[0]?.id || "";
  const [first, setFirst] = useState("");
  const [middle, setMiddle] = useState("");
  const [last, setLast] = useState("");
  const [code, setCode] = useState("");
  const [bulk, setBulk] = useState("");

  const { data: students } = useQuery({
    queryKey: ["students", active],
    enabled: !!active,
    queryFn: () => api.students.listByGrade(active),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["students", active] });

  const addOne = useMutation({
    mutationFn: () =>
      api.students.create(active, {
        first_name: first,
        middle_name: middle || null,
        last_name: last || null,
        student_code: code || null,
      }),
    onSuccess: () => {
      setFirst("");
      setMiddle("");
      setLast("");
      setCode("");
      toast.success("Student added");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upload = useMutation({
    mutationFn: () => {
      const rows = bulk.split("\n").map(parseRosterLine).filter(Boolean) as StudentInput[];
      return api.students.bulkCreate(active, rows);
    },
    onSuccess: (n) => {
      setBulk("");
      toast.success(`${n} student(s) uploaded`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.students.remove(id),
    onSuccess: () => {
      toast.success("Student removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Panel title="Grade">
        <Select value={active} onValueChange={setGradeId}>
          <SelectTrigger className="w-full sm:w-64">
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
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Add one student">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              addOne.mutate();
            }}
          >
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="sfirst">First name</Label>
                <Input id="sfirst" value={first} onChange={(e) => setFirst(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="smid">Middle</Label>
                <Input id="smid" value={middle} onChange={(e) => setMiddle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slast">Last</Label>
                <Input id="slast" value={last} onChange={(e) => setLast(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="scode">Student code (optional)</Label>
              <Input id="scode" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <Button type="submit" disabled={!active}>
              <Plus className="size-4" /> Add student
            </Button>
          </form>
        </Panel>

        <Panel title="Upload roster">
          <p className="mb-2 text-xs text-muted-foreground">
            One student per line: <code>First, Middle, Last, code</code> — middle, last and code are
            optional.
          </p>
          <Textarea
            rows={6}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"Sara, Ahmed, Kamal, S-101\nOmar, , Nasser"}
          />
          <Button className="mt-3" disabled={!active} onClick={() => upload.mutate()}>
            Upload
          </Button>
        </Panel>
      </div>

      <Panel title="Roster">
        <ul className="divide-y divide-border">
          {(students ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {s.full_name}
                {s.student_code && (
                  <span className="ml-2 text-xs text-muted-foreground">{s.student_code}</span>
                )}
              </span>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
          {(students ?? []).length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">
              No students in this grade.
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}

/* -------------------------------- Teachers -------------------------------- */

function TeachersTab() {
  const qc = useQueryClient();
  const { data: grades } = useGrades();
  const { data: teachers } = useTeachers();
  const [teacherId, setTeacherId] = useState("");
  const [gradeId, setGradeId] = useState("");

  const { data: assignments } = useQuery({
    queryKey: ["teacher_grades"],
    queryFn: () => api.teachers.listAssignments(),
  });

  const assign = useMutation({
    mutationFn: () => api.teachers.assignGrade(teacherId, gradeId),
    onSuccess: () => {
      toast.success("Grade assigned");
      qc.invalidateQueries({ queryKey: ["teacher_grades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unassign = useMutation({
    mutationFn: (id: string) => api.teachers.unassignGrade(id),
    onSuccess: () => {
      toast.success("Assignment removed");
      qc.invalidateQueries({ queryKey: ["teacher_grades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const label = (id: string, list?: Array<{ id: string; name?: string; full_name?: string }>) =>
    list?.find((x) => x.id === id)?.name ?? list?.find((x) => x.id === id)?.full_name ?? "—";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="Assign a grade to a teacher">
        <div className="space-y-3">
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger>
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              {(teachers ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.full_name} — {t.email}
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
      </Panel>
      <Panel title="Assignments">
        <ul className="divide-y divide-border">
          {(assignments ?? []).map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {label(a.teacher_id, teachers)} → {label(a.grade_id, grades)}
              </span>
              <Button size="icon" variant="ghost" onClick={() => unassign.mutate(a.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
          {(assignments ?? []).length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No assignments yet.</li>
          )}
        </ul>
      </Panel>
    </div>
  );
}

/* -------------------------------- Sessions -------------------------------- */

function SessionsTab() {
  const qc = useQueryClient();
  const { data: grades } = useGrades();
  const { data: teachers } = useTeachers();
  const [form, setForm] = useState({
    teacher_id: "",
    grade_id: "",
    title: "",
    day_of_week: "1",
    start_time: "08:00",
    end_time: "08:45",
    room: "",
  });

  const { data: sessions } = useQuery({
    queryKey: ["all-sessions"],
    queryFn: () => api.sessions.list(),
  });

  const create = useMutation({
    mutationFn: () =>
      api.sessions.create({
        teacher_id: form.teacher_id,
        grade_id: form.grade_id,
        title: form.title.trim(),
        day_of_week: Number(form.day_of_week),
        start_time: form.start_time,
        end_time: form.end_time,
        room: form.room.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Session created");
      qc.invalidateQueries({ queryKey: ["all-sessions"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.sessions.remove(id),
    onSuccess: () => {
      toast.success("Session removed");
      qc.invalidateQueries({ queryKey: ["all-sessions"] });
      qc.invalidateQueries({ queryKey: ["schedule"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="New session">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => set("title")(e.target.value)}
              placeholder="Mathematics"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={form.teacher_id} onValueChange={set("teacher_id")}>
              <SelectTrigger>
                <SelectValue placeholder="Teacher" />
              </SelectTrigger>
              <SelectContent>
                {(teachers ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.grade_id} onValueChange={set("grade_id")}>
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
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Select value={form.day_of_week} onValueChange={set("day_of_week")}>
              <SelectTrigger>
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => (
                  <SelectItem key={d} value={String(i)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="time"
              value={form.start_time}
              onChange={(e) => set("start_time")(e.target.value)}
            />
            <Input
              type="time"
              value={form.end_time}
              onChange={(e) => set("end_time")(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="room">Room (optional)</Label>
            <Input id="room" value={form.room} onChange={(e) => set("room")(e.target.value)} />
          </div>
          <Button type="submit">
            <Plus className="size-4" /> Create session
          </Button>
        </form>
      </Panel>

      <Panel title="Timetable">
        <ul className="divide-y divide-border">
          {(sessions ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">
                  {DAYS[s.day_of_week]} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)} ·{" "}
                  {grades?.find((g) => g.id === s.grade_id)?.name} ·{" "}
                  {teachers?.find((t) => t.id === s.teacher_id)?.full_name}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </li>
          ))}
          {(sessions ?? []).length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No sessions yet.</li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
