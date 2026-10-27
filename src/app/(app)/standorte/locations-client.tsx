"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LocationType } from "@prisma/client";
import { MapPin, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLocation, updateLocation } from "@/lib/actions/locations";
import { locationTypeLabels } from "@/lib/labels";

type LocationRow = {
  id: string;
  name: string;
  type: LocationType;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string;
  notes: string | null;
  isActive: boolean;
  _count?: { products: number };
};

export function LocationsClient({ locations }: { locations: LocationRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<LocationType>("HAUPTLAGER");
  const [isActive, setIsActive] = useState(true);

  function openCreate() {
    setEditing(null);
    setType("HAUPTLAGER");
    setIsActive(true);
    setError("");
    setOpen(true);
  }

  function openEdit(loc: LocationRow) {
    setEditing(loc);
    setType(loc.type);
    setIsActive(loc.isActive);
    setError("");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const base = {
      name: fd.get("name") as string,
      type,
      street: (fd.get("street") as string) || undefined,
      city: (fd.get("city") as string) || undefined,
      zip: (fd.get("zip") as string) || undefined,
      country: (fd.get("country") as string) || "Deutschland",
      notes: (fd.get("notes") as string) || undefined,
    };

    const result = editing
      ? await updateLocation(editing.id, { ...base, isActive })
      : await createLocation(base);

    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Speichern fehlgeschlagen.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Standorte"
        description="Lager, Niederlassungen, Werkstätten und externe Standorte"
        actions={[
          {
            label: "Neuer Standort",
            onClick: openCreate,
            icon: <Plus className="mr-2 h-4 w-4" />,
          },
        ]}
      />

      {open && (
        <Card className="mb-6 max-w-2xl">
          <CardContent className="p-6">
            <h3 className="mb-4 font-semibold text-flx-navy">
              {editing ? "Standort bearbeiten" : "Neuer Standort"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" name="name" required defaultValue={editing?.name} />
                </div>
                <div className="space-y-2">
                  <Label>Typ *</Label>
                  <Select value={type} onValueChange={(v) => setType(v as LocationType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(locationTypeLabels) as LocationType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {locationTypeLabels[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="street">Straße</Label>
                  <Input id="street" name="street" defaultValue={editing?.street ?? undefined} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">PLZ</Label>
                  <Input id="zip" name="zip" defaultValue={editing?.zip ?? undefined} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">Ort</Label>
                  <Input id="city" name="city" defaultValue={editing?.city ?? undefined} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Land</Label>
                  <Input
                    id="country"
                    name="country"
                    defaultValue={editing?.country ?? "Deutschland"}
                  />
                </div>
              </div>
              {editing && (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                    value={isActive ? "active" : "inactive"}
                    onChange={(e) => setIsActive(e.target.value === "active")}
                  >
                    <option value="active">Aktiv</option>
                    <option value="inactive">Inaktiv</option>
                  </select>
                </div>
              )}
              {error && <p className="text-sm text-status-damage">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Speichern…" : "Speichern"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Abbrechen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {locations.length === 0 ? (
        <EmptyState title="Keine Standorte" icon={<MapPin className="h-8 w-8" />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <Card key={loc.id}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <MapPin className="h-5 w-5 text-flx-blue" />
                  <div className="flex items-center gap-2">
                    <Badge variant={loc.isActive ? "success" : "secondary"}>
                      {loc.isActive ? "Aktiv" : "Inaktiv"}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(loc)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <h3 className="font-semibold text-flx-navy">{loc.name}</h3>
                <p className="text-sm text-gray-500">{locationTypeLabels[loc.type]}</p>
                {loc.city && (
                  <p className="mt-1 text-xs text-gray-400">
                    {loc.street ? `${loc.street}, ` : ""}
                    {loc.zip} {loc.city}
                  </p>
                )}
                <p className="mt-3 text-sm font-medium text-flx-blue">
                  {loc._count?.products ?? 0} Produkt(e)
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
