"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateSettings } from "@/lib/actions/settings";
import type { AppSettingsData } from "@/lib/settings-types";

const NOTIFICATION_FIELDS = [
  { key: "notifyCheckoutTomorrow", label: "Ausgabe morgen" },
  { key: "notifyReturnTomorrow", label: "Rückgabe morgen" },
  { key: "notifyOverdueReturn", label: "Überfällige Rückgabe" },
  { key: "notifyNewBooking", label: "Neue Buchung" },
  { key: "notifyBookingConflict", label: "Buchungskonflikt" },
  { key: "notifyMaintenanceDue", label: "Wartung fällig" },
] as const;

export function SettingsForm({
  initial,
  canEdit,
}: {
  initial: AppSettingsData;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  function setField<K extends keyof AppSettingsData>(key: K, value: AppSettingsData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess("");
    setError("");
  }

  function handleSave() {
    if (!canEdit) {
      setError("Keine Berechtigung zum Speichern.");
      return;
    }

    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        const result = await updateSettings({
          companyName: form.companyName.trim(),
          companyAddress: form.companyAddress.trim(),
          contactEmail: form.contactEmail.trim(),
          prepDaysDefault: Number(form.prepDaysDefault),
          returnDaysDefault: Number(form.returnDaysDefault),
          notifyCheckoutTomorrow: form.notifyCheckoutTomorrow,
          notifyReturnTomorrow: form.notifyReturnTomorrow,
          notifyOverdueReturn: form.notifyOverdueReturn,
          notifyNewBooking: form.notifyNewBooking,
          notifyBookingConflict: form.notifyBookingConflict,
          notifyMaintenanceDue: form.notifyMaintenanceDue,
        });

        if (!result.success) {
          setError(result.error ?? "Speichern fehlgeschlagen.");
          return;
        }

        if (result.data) setForm(result.data);
        setSuccess("Einstellungen wurden gespeichert.");
        router.refresh();
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Speichern fehlgeschlagen. Seite neu laden und erneut versuchen."
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      {(error || success) && (
        <div
          className={
            error
              ? "rounded-md border border-status-damage/30 bg-status-damage/10 px-4 py-3 text-sm text-status-damage"
              : "rounded-md border border-status-available/30 bg-status-available/10 px-4 py-3 text-sm text-status-available"
          }
        >
          {error || success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unternehmen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Firmenname</Label>
              <Input
                id="company"
                value={form.companyName}
                disabled={!canEdit || pending}
                onChange={(e) => setField("companyName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Hauptstandort</Label>
              <Input
                id="address"
                value={form.companyAddress}
                disabled={!canEdit || pending}
                onChange={(e) => setField("companyAddress", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Kontakt-E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={form.contactEmail}
                disabled={!canEdit || pending}
                onChange={(e) => setField("contactEmail", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vermietung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prepDays">Standard-Vorbereitungstage</Label>
              <Input
                id="prepDays"
                type="number"
                min={0}
                max={30}
                value={form.prepDaysDefault}
                disabled={!canEdit || pending}
                onChange={(e) =>
                  setField("prepDaysDefault", Number.parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnDays">Standard-Nachbereitungstage</Label>
              <Input
                id="returnDays"
                type="number"
                min={0}
                max={30}
                value={form.returnDaysDefault}
                disabled={!canEdit || pending}
                onChange={(e) =>
                  setField("returnDaysDefault", Number.parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Währung</Label>
              <Input id="currency" value={form.currency} disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Benachrichtigungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {NOTIFICATION_FIELDS.map(({ key, label }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between rounded-md border border-gray-100 px-3 py-2"
              >
                <span>{label}</span>
                {canEdit ? (
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-flx-blue"
                    checked={form[key]}
                    disabled={pending}
                    onChange={(e) => setField(key, e.target.checked)}
                  />
                ) : (
                  <Badge variant={form[key] ? "success" : "secondary"}>
                    {form[key] ? "Aktiv" : "Aus"}
                  </Badge>
                )}
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">System</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Version</span>
              <span>FLX Software 1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Datenbank</span>
              <Badge variant="success">Verbunden</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Letztes Backup</span>
              <span>—</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {canEdit && (
        <div className="flex items-center gap-3">
          <Button type="button" disabled={pending} onClick={handleSave}>
            {pending ? "Wird gespeichert…" : "Alle Einstellungen speichern"}
          </Button>
          {!success && !error && (
            <span className="text-sm text-gray-500">
              Änderungen werden erst nach dem Speichern übernommen.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
