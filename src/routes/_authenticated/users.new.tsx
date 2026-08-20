import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, type AppRole } from "@/api";
import { AppShell } from "@/components/AppShell";
import { useIsAdmin } from "@/lib/auth";
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

export const Route = createFileRoute("/_authenticated/users/new")({
  head: () => ({
    meta: [
      { title: "Create User — ClassTrack" },
      {
        name: "description",
        content:
          "Admins create a new admin or teacher account with first, middle and last name and an optional password.",
      },
      { property: "og:title", content: "Create User — ClassTrack" },
      { property: "og:description", content: "Add a new admin or teacher account." },
    ],
  }),
  component: NewUserPage,
});

function NewUserPage() {
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    email: "",
    role: "Teacher" as AppRole,
    setPassword: false,
    password: "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const create = useMutation({
    mutationFn: () =>
      api.users.create({
        first_name: form.first_name,
        middle_name: form.middle_name || null,
        last_name: form.last_name || null,
        email: form.email,
        role: form.role,
        password: form.setPassword ? form.password : null,
      }),
    onSuccess: () => {
      toast.success("User created");
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["teachers"] });
      navigate({ to: "/admin" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) {
    return (
      <AppShell title="Create user" description="Restricted area">
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Only admins can create accounts.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Create user"
      description="Add an admin or a teacher. Leave the password unset to invite them instead."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin">
            <ArrowLeft className="size-3.5" /> Admin
          </Link>
        </Button>
      }
    >
      <form
        className="max-w-xl space-y-4 rounded-lg border border-border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="first">First name</Label>
            <Input
              id="first"
              required
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="middle">Middle name</Label>
            <Input
              id="middle"
              value={form.middle_name}
              onChange={(e) => set("middle_name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last">Last name</Label>
            <Input
              id="last"
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select value={form.role} onValueChange={(v) => set("role", v as AppRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Teacher">Teacher</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border border-border p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.setPassword}
              onChange={(e) => set("setPassword", e.target.checked)}
            />
            Set a password for this user now
          </label>
          {form.setPassword && (
            <Input
              className="mt-3"
              type="text"
              minLength={6}
              required
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="Temporary password"
            />
          )}
          {!form.setPassword && (
            <p className="mt-2 text-xs text-muted-foreground">
              No password will be set — your backend can email an invitation so they choose one.
            </p>
          )}
        </div>

        <Button type="submit" disabled={create.isPending}>
          Create user
        </Button>
      </form>
    </AppShell>
  );
}
