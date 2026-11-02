"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createProductCategory } from "@/lib/actions/products";

export function CreateCategoryDialog({
  onCreated,
}: {
  onCreated?: (category: { id: string; name: string }) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const result = await createProductCategory({
      name: fd.get("name") as string,
      description: (fd.get("description") as string) || undefined,
    });
    setLoading(false);
    if (!result.success || !result.data) {
      setError(result.error ?? "Kategorie konnte nicht angelegt werden.");
      return;
    }
    onCreated?.({ id: result.data.id, name: result.data.name });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Kategorie
      </Button>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-3">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="cat-name">Neue Kategorie</Label>
            <Input id="cat-name" name="name" required placeholder="z.B. MC" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cat-desc">Beschreibung</Label>
            <Input id="cat-desc" name="description" placeholder="Optional" />
          </div>
          {error && <p className="text-xs text-status-damage">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "…" : "Anlegen"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
