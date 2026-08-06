import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/tags")({
  head: () => ({
    meta: [
      { title: "Behavior Tags — ClassTrack" },
      {
        name: "description",
        content:
          "Create and update behavior tags and the plus or minus points they award on the scoreboard.",
      },
      { property: "og:title", content: "Behavior Tags — ClassTrack" },
      {
        property: "og:description",
        content: "Manage behavior tags and their point values.",
      },
    ],
  }),
  component: TagsPage,
});

type Tag = {
  id: string;
  name: string;
  type: "positive" | "negative";
  points: number;
};

function TagsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Tag> | null>(null);

  const { data: tags } = useQuery({
    queryKey: ["behavior_tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("behavior_tags")
        .select("id,name,type,points")
        .order("type")
        .order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

  const save = useMutation({
    mutationFn: async (t: Partial<Tag>) => {
      const name = (t.name ?? "").trim();
      if (!name) throw new Error("Tag name is required");
      const type = (t.type ?? "positive") as "positive" | "negative";
      const magnitude = Math.abs(Number(t.points ?? 1));
      const points = type === "positive" ? magnitude : -magnitude;
      if (t.id) {
        const { error } = await supabase
          .from("behavior_tags")
          .update({ name, type, points })
          .eq("id", t.id);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("behavior_tags")
          .insert({ name, type, points, created_by: u.user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Tag saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["behavior_tags"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("behavior_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tag deleted");
      qc.invalidateQueries({ queryKey: ["behavior_tags"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups: Array<["positive" | "negative", string]> = [
    ["positive", "Positive tags"],
    ["negative", "Negative tags"],
  ];

  return (
    <AppShell
      title="Behavior tags"
      description="Points from these tags feed straight into the scoreboard."
      actions={
        <Button size="sm" onClick={() => setEditing({ type: "positive", points: 1 })}>
          <Plus className="size-3.5" /> New tag
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map(([type, label]) => (
          <div key={type} className="rounded-lg border border-border bg-card">
            <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">{label}</h2>
            <ul className="divide-y divide-border">
              {(tags ?? [])
                .filter((t) => t.type === type)
                .map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p
                        className={`text-xs tabular-nums ${
                          t.points >= 0 ? "text-primary" : "text-destructive"
                        }`}
                      >
                        {t.points > 0 ? `+${t.points}` : t.points} points
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(t)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove.mutate(t.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              {(tags ?? []).filter((t) => t.type === type).length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No tags yet.
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit tag" : "New tag"}</DialogTitle>
            <DialogDescription>
              Enter the point value as a positive number — the type decides the sign.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Tag name</Label>
              <Input
                id="name"
                maxLength={60}
                value={editing?.name ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                placeholder="Helpful, Noisy, Active…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={editing?.type ?? "positive"}
                  onValueChange={(v) =>
                    setEditing((p) => ({ ...p, type: v as "positive" | "negative" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="points">Points</Label>
                <Input
                  id="points"
                  type="number"
                  min={0}
                  max={100}
                  value={Math.abs(Number(editing?.points ?? 1))}
                  onChange={(e) => setEditing((p) => ({ ...p, points: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
              Save tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
