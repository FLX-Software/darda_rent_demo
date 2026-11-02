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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    const result = await createProductCategory({
      name,
      description: description || undefined,
    });
    setLoading(false);
    if (!result.success || !result.data) {
      setError(result.error ?? "Kategorie konnte nicht angelegt werden.");
      return;
    }
    onCreated?.({ id: result.data.id, name: result.data.name });
    setName("");
    setDescription("");
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
      <CardContent className="space-y-2 p-3">
        <div className="space-y-1">
          <Label htmlFor="cat-name">Neue Kategorie</Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="z.B. MC"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cat-desc">Beschreibung</Label>
          <Input
            id="cat-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </div>
        {error && <p className="text-xs text-status-damage">{error}</p>}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            disabled={loading || !name.trim()}
            onClick={handleCreate}
          >
            {loading ? "…" : "Anlegen"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setError("");
            }}
          >
            Abbrechen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
