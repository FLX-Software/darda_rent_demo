"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MaintenanceStatus, MaintenanceType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateMaintenance } from "@/lib/actions/maintenance";
import { maintenanceStatusLabels, maintenanceTypeLabels } from "@/lib/labels";

function toDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function EditMaintenanceForm({
  maintenance,
}: {
  maintenance: {
    id: string;
    type: MaintenanceType;
    status: MaintenanceStatus;
    intervalDays: number | null;
    lastDate: Date | null;
    nextDate: Date | null;
    operatingHours: number | null;
    serviceProvider: string | null;
    costCents: number | null;
    result: string | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [type, setType] = useState<MaintenanceType>(maintenance.type);
  const [status, setStatus] = useState<MaintenanceStatus>(maintenance.status);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);

    const fd = new FormData(e.currentTarget);
    const nextDateRaw = fd.get("nextDate")?.toString();
    const lastDateRaw = fd.get("lastDate")?.toString();
    const intervalRaw = fd.get("intervalDays")?.toString();
    const hoursRaw = fd.get("operatingHours")?.toString();
    const costRaw = fd.get("costEuros")?.toString();

    const result = await updateMaintenance(maintenance.id, {
      type,
      status,
      intervalDays: intervalRaw ? Number(intervalRaw) : undefined,
      nextDate: nextDateRaw ? new Date(`${nextDateRaw}T12:00:00.000Z`) : undefined,
      lastDate: lastDateRaw ? new Date(`${lastDateRaw}T12:00:00.000Z`) : undefined,
      operatingHours: hoursRaw ? Number(hoursRaw) : undefined,
      serviceProvider: (fd.get("serviceProvider") as string) || undefined,
      costCents: costRaw ? Math.round(Number(costRaw.replace(",", ".")) * 100) : undefined,
      result: (fd.get("result") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Speichern fehlgeschlagen");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
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
        <div className="space-y-2">
          <Label>Status *</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as MaintenanceStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(maintenanceStatusLabels) as MaintenanceStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {maintenanceStatusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nextDate">Nächster Termin</Label>
          <Input
            id="nextDate"
            name="nextDate"
            type="date"
            defaultValue={toDateInput(maintenance.nextDate)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastDate">Letzter Termin</Label>
          <Input
            id="lastDate"
            name="lastDate"
            type="date"
            defaultValue={toDateInput(maintenance.lastDate)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="intervalDays">Intervall (Tage)</Label>
          <Input
            id="intervalDays"
            name="intervalDays"
            type="number"
            min={1}
            defaultValue={maintenance.intervalDays ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="operatingHours">Betriebsstunden</Label>
          <Input
            id="operatingHours"
            name="operatingHours"
            type="number"
            min={0}
            defaultValue={maintenance.operatingHours ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="serviceProvider">Dienstleister</Label>
          <Input
            id="serviceProvider"
            name="serviceProvider"
            defaultValue={maintenance.serviceProvider ?? ""}
            placeholder="z.B. interner Service"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="costEuros">Kosten (€)</Label>
          <Input
            id="costEuros"
            name="costEuros"
            type="number"
            min={0}
            step="0.01"
            defaultValue={
              maintenance.costCents != null ? (maintenance.costCents / 100).toFixed(2) : ""
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="result">Ergebnis / Befund</Label>
        <Textarea
          id="result"
          name="result"
          rows={4}
          defaultValue={maintenance.result ?? ""}
          placeholder="Was wurde geprüft oder repariert?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notizen</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={maintenance.notes ?? ""}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Wird gespeichert…" : "Speichern"}
        </Button>
        {saved && <span className="text-sm text-emerald-600">Gespeichert</span>}
        {error && <span className="text-sm text-status-damage">{error}</span>}
      </div>
    </form>
  );
}
