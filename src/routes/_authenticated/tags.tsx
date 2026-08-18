import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, type BehaviorTag } from "@/api";
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

type Tag = BehaviorTag;

function TagsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Tag> | null>(null);

  const { data: tags } = useQuery({
    queryKey: ["behavior_tags"],
    queryFn: () => api.behaviorTags.list(),
  });

  const save = useMutation({
    mutationFn: async (t: Partial<Tag>) => {
      const tag = (t.tag ?? "").trim();
      if (!tag) throw new Error("Tag is required");
      const type = (t.type ?? "Positive") as "Positive" | "Negative";
      const magnitude = Math.abs(Number(t.point ?? 1));
      const point = type === "Positive" ? magnitude : -magnitude;
      if (t.id) await api.behaviorTags.update(t.id, { tag, type, point });
      else await api.behaviorTags.create({ tag, type, point });
    },
    onSuccess: () => {
      toast.success("Tag saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["behavior_tags"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.behaviorTags.remove(id),
    onSuccess: () => {
      toast.success("Tag deleted");
      qc.invalidateQueries({ queryKey: ["behavior_tags"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups: Array<["Positive" | "Negative", string]> = [
    ["Positive", "Positive tags"],
    ["Negative", "Negative tags"],
  ];

  return (
    <AppShell
      title="Behavior tags"
      description="Points from these tags feed straight into the scoreboard."
      actions={
        <Button size="sm" onClick={() => setEditing({ type: "Positive", point: 1 })}>
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
                      <p className="text-sm font-medium">{t.tag}</p>
                      <p
                        className={`text-xs tabular-nums ${
                          t.point >= 0 ? "text-primary" : "text-destructive"
                        }`}
                      >
                        {t.point > 0 ? `+${t.point}` : t.point} points
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
                value={editing?.tag ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, tag: e.target.value }))}
                placeholder="Helpful, Noisy, Active…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={editing?.type ?? "Positive"}
                  onValueChange={(v) =>
                    setEditing((p) => ({ ...p, type: v as "Positive" | "Negative" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Positive">Positive</SelectItem>
                    <SelectItem value="Negative">Negative</SelectItem>
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
                  value={Math.abs(Number(editing?.point ?? 1))}
                  onChange={(e) => setEditing((p) => ({ ...p, point: Number(e.target.value) }))}
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
