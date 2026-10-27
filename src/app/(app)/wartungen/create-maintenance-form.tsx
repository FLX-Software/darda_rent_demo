"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MaintenanceType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMaintenance } from "@/lib/actions/maintenance";
import { maintenanceTypeLabels } from "@/lib/labels";

export function CreateMaintenanceForm({
  products,
}: {
  products: { id: string; name: string; inventoryNumber: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<MaintenanceType>("ROUTINE");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!productId) {
      setError("Bitte ein Produkt wählen.");
      return;
    }
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const nextDateRaw = fd.get("nextDate")?.toString();
    const result = await createMaintenance({
      productId,
      type,
      status: "GEPLANT",
      nextDate: nextDateRaw ? new Date(`${nextDateRaw}T12:00:00.000Z`) : undefined,
      notes: (fd.get("notes") as string) || undefined,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Wartung konnte nicht angelegt werden.");
      return;
    }
    setOpen(false);
    setProductId("");
    if (result.data?.id) {
      router.push(`/wartungen/${result.data.id}`);
      return;
    }
    router.refresh();
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>Wartung anlegen</Button>
    );
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Produkt *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Produkt wählen" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.inventoryNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Typ *</Label>
              <Select value={type} onValueChange={(v) => setType(v as MaintenanceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(maintenanceTypeLabels) as MaintenanceType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {maintenanceTypeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="nextDate">Nächster Termin</Label>
              <Input id="nextDate" name="nextDate" type="date" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notizen</Label>
              <Input id="notes" name="notes" />
            </div>
          </div>
          {error && <p className="text-sm text-status-damage">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "…" : "Anlegen"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
