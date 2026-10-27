"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DamageStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateDamage } from "@/lib/actions/damages";
import { damageStatusLabels } from "@/lib/labels";

export function DamageStatusActions({
  damageId,
  status,
}: {
  damageId: string;
  status: DamageStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState<DamageStatus>(status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (value === status) return;
    setLoading(true);
    setError("");
    const result = await updateDamage(damageId, { status: value });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Status konnte nicht gespeichert werden.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value} onValueChange={(v) => setValue(v as DamageStatus)}>
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(damageStatusLabels) as DamageStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {damageStatusLabels[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button disabled={loading || value === status} onClick={handleSave}>
        {loading ? "…" : "Status speichern"}
      </Button>
      {error && <p className="w-full text-sm text-status-damage">{error}</p>}
    </div>
  );
}
