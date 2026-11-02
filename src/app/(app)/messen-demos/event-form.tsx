"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventStatus, EventType } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEvent, deleteEvent, updateEvent } from "@/lib/actions/events";
import { eventStatusLabels, eventTypeLabels } from "@/lib/labels";

export type EventFormValues = {
  id?: string;
  name: string;
  type: EventType;
  status: EventStatus;
  venue?: string | null;
  street?: string | null;
  city?: string | null;
  zip?: string | null;
  eventStartDate: Date | string;
  eventEndDate: Date | string;
  setupStartDate?: Date | string | null;
  setupEndDate?: Date | string | null;
  teardownStartDate?: Date | string | null;
  teardownEndDate?: Date | string | null;
  transportNotes?: string | null;
  carrier?: string | null;
  hotelInfo?: string | null;
  contactOnSite?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  budgetCents?: number | null;
};

function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function optionalString(
  value: FormDataEntryValue | null,
  clearable = false
): string | null | undefined {
  const s = value?.toString().trim();
  if (s) return s;
  return clearable ? null : undefined;
}

function optionalDate(
  value: FormDataEntryValue | null,
  clearable = false
): Date | null | undefined {
  const s = value?.toString().trim();
  if (s) return new Date(`${s}T12:00:00.000Z`);
  return clearable ? null : undefined;
}

interface EventFormProps {
  mode: "create" | "edit";
  initial?: EventFormValues;
}

export function EventForm({ mode, initial }: EventFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<EventType>(initial?.type ?? "MESSE");
  const [status, setStatus] = useState<EventStatus>(initial?.status ?? "GEPLANT");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const eventStartDate = optionalDate(fd.get("eventStartDate"));
    const eventEndDate = optionalDate(fd.get("eventEndDate"));

    if (!eventStartDate || !eventEndDate) {
      setError("Start- und Enddatum sind erforderlich.");
      setLoading(false);
      return;
    }

    if (eventEndDate < eventStartDate) {
      setError("Enddatum muss nach dem Startdatum liegen.");
      setLoading(false);
      return;
    }

    const clearable = mode === "edit";
    const budgetRaw = fd.get("budget")?.toString().trim();
    const budgetCents =
      budgetRaw && !Number.isNaN(parseFloat(budgetRaw))
        ? Math.round(parseFloat(budgetRaw) * 100)
        : clearable
          ? null
          : undefined;

    const payload = {
      name: fd.get("name")?.toString().trim() ?? "",
      type,
      status,
      venue: optionalString(fd.get("venue"), clearable),
      street: optionalString(fd.get("street"), clearable),
      city: optionalString(fd.get("city"), clearable),
      zip: optionalString(fd.get("zip"), clearable),
      eventStartDate,
      eventEndDate,
      setupStartDate: optionalDate(fd.get("setupStartDate"), clearable),
      setupEndDate: optionalDate(fd.get("setupEndDate"), clearable),
      teardownStartDate: optionalDate(fd.get("teardownStartDate"), clearable),
      teardownEndDate: optionalDate(fd.get("teardownEndDate"), clearable),
      transportNotes: optionalString(fd.get("transportNotes"), clearable),
      carrier: optionalString(fd.get("carrier"), clearable),
      hotelInfo: optionalString(fd.get("hotelInfo"), clearable),
      contactOnSite: optionalString(fd.get("contactOnSite"), clearable),
      contactPhone: optionalString(fd.get("contactPhone"), clearable),
      notes: optionalString(fd.get("notes"), clearable),
      budgetCents,
    };

    try {
      const result =
        mode === "edit" && initial?.id
          ? await updateEvent(initial.id, payload)
          : await createEvent(payload);

      if (!result.success || !result.data) {
        setError(result.error ?? "Speichern fehlgeschlagen.");
        setLoading(false);
        return;
      }

      router.push(`/messen-demos/${result.data.id}`);
      router.refresh();
    } catch {
      setError("Speichern fehlgeschlagen.");
      setLoading(false);
    }
  };

  const backHref =
    mode === "edit" && initial?.id ? `/messen-demos/${initial.id}` : "/messen-demos";

  return (
    <div>
      <PageHeader
        title={mode === "edit" ? "Veranstaltung bearbeiten" : "Neue Veranstaltung"}
        description={
          mode === "edit"
            ? "Daten der Messe anpassen"
            : "Messe oder Vorführung anlegen"
        }
        backHref={backHref}
      />

      <Card className="max-w-3xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={initial?.name ?? ""}
                  placeholder="z.B. bauma"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Typ *</Label>
                  <Select value={type} onValueChange={(v) => setType(v as EventType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(eventTypeLabels) as EventType[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {eventTypeLabels[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as EventStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(eventStatusLabels) as EventStatus[]).map((key) => (
                        <SelectItem key={key} value={key}>
                          {eventStatusLabels[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-flx-navy">Zeitraum</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="eventStartDate">Start *</Label>
                  <Input
                    id="eventStartDate"
                    name="eventStartDate"
                    type="date"
                    required
                    defaultValue={toDateInputValue(initial?.eventStartDate)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventEndDate">Ende *</Label>
                  <Input
                    id="eventEndDate"
                    name="eventEndDate"
                    type="date"
                    required
                    defaultValue={toDateInputValue(initial?.eventEndDate)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setupStartDate">Aufbau von</Label>
                  <Input
                    id="setupStartDate"
                    name="setupStartDate"
                    type="date"
                    defaultValue={toDateInputValue(initial?.setupStartDate)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setupEndDate">Aufbau bis</Label>
                  <Input
                    id="setupEndDate"
                    name="setupEndDate"
                    type="date"
                    defaultValue={toDateInputValue(initial?.setupEndDate)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teardownStartDate">Abbau von</Label>
                  <Input
                    id="teardownStartDate"
                    name="teardownStartDate"
                    type="date"
                    defaultValue={toDateInputValue(initial?.teardownStartDate)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teardownEndDate">Abbau bis</Label>
                  <Input
                    id="teardownEndDate"
                    name="teardownEndDate"
                    type="date"
                    defaultValue={toDateInputValue(initial?.teardownEndDate)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-flx-navy">Ort</h3>
              <div className="space-y-2">
                <Label htmlFor="venue">Veranstaltungsort</Label>
                <Input
                  id="venue"
                  name="venue"
                  defaultValue={initial?.venue ?? ""}
                  placeholder="z.B. Messe München"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="street">Straße</Label>
                  <Input id="street" name="street" defaultValue={initial?.street ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">PLZ</Label>
                  <Input id="zip" name="zip" defaultValue={initial?.zip ?? ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ort</Label>
                <Input id="city" name="city" defaultValue={initial?.city ?? ""} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-flx-navy">Logistik & Kontakt</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="carrier">Spediteur</Label>
                  <Input id="carrier" name="carrier" defaultValue={initial?.carrier ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget (EUR)</Label>
                  <Input
                    id="budget"
                    name="budget"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={
                      initial?.budgetCents != null ? (initial.budgetCents / 100).toString() : ""
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactOnSite">Ansprechpartner vor Ort</Label>
                  <Input
                    id="contactOnSite"
                    name="contactOnSite"
                    defaultValue={initial?.contactOnSite ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Telefon vor Ort</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    defaultValue={initial?.contactPhone ?? ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transportNotes">Transportnotizen</Label>
                <Textarea
                  id="transportNotes"
                  name="transportNotes"
                  rows={2}
                  defaultValue={initial?.transportNotes ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hotelInfo">Hotel / Unterkunft</Label>
                <Textarea
                  id="hotelInfo"
                  name="hotelInfo"
                  rows={2}
                  defaultValue={initial?.hotelInfo ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea id="notes" name="notes" rows={2} defaultValue={initial?.notes ?? ""} />
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Wird gespeichert…"
                  : mode === "edit"
                    ? "Änderungen speichern"
                    : "Veranstaltung anlegen"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Abbrechen
              </Button>
              {mode === "edit" && initial?.id && (
                <div className="ml-auto">
                  <ConfirmDeleteButton
                    entityLabel="Veranstaltung"
                    entityName={initial.name}
                    onDelete={() => deleteEvent(initial.id!)}
                    redirectTo="/messen-demos"
                  />
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
