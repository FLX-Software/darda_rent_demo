"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateDamageReportNotes } from "@/lib/actions/damages";

export function DamageReportEditor({
  damageId,
  initialNotes,
}: {
  damageId: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    setError("");
    setSaved(false);
    const result = await updateDamageReportNotes(damageId, notes);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Speichern fehlgeschlagen");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="damage-report-notes">Schadensbericht</Label>
        <Textarea
          id="damage-report-notes"
          rows={8}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder="Detaillierte Feststellungen, Ursache, Maßnahmen, Empfehlungen…"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={loading}>
          {loading ? "Wird gespeichert…" : "Bericht speichern"}
        </Button>
        {saved && <span className="text-sm text-emerald-600">Gespeichert</span>}
        {error && <span className="text-sm text-status-damage">{error}</span>}
      </div>
    </div>
  );
}
