"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookingType, ShipmentMethod } from "@prisma/client";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBooking } from "@/lib/actions/bookings";
import { checkMultipleProductsAvailability } from "@/lib/availability";
import { bookingTypeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface CreateBookingFormProps {
  products: { id: string; name: string; inventoryNumber: string; status: string }[];
  customers: { id: string; companyName: string; customerNumber: string }[];
}

export function CreateBookingForm({ products, customers }: CreateBookingFormProps) {
  const router = useRouter();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [availability, setAvailability] = useState<Awaited<
    ReturnType<typeof checkMultipleProductsAvailability>
  > | null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bookingType, setBookingType] = useState<BookingType>("KUNDENVERMIETUNG");
  const [customerId, setCustomerId] = useState("");
  const [shipmentMethod, setShipmentMethod] = useState<ShipmentMethod | "">("");

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
    setAvailability(null);
  };

  const checkAvailability = async () => {
    if (!startDate || !endDate || selectedProducts.length === 0) return;
    setChecking(true);
    const result = await checkMultipleProductsAvailability(
      selectedProducts,
      new Date(startDate),
      new Date(endDate)
    );
    setAvailability(result);
    setChecking(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);

    const result = await createBooking({
      type: bookingType,
      status: "ENTWURF",
      customerId: customerId || undefined,
      contactName: (fd.get("contactName") as string) || undefined,
      projectName: (fd.get("projectName") as string) || undefined,
      startDate: new Date(startDate),
      plannedReturnDate: new Date(endDate),
      prepDaysBefore: 0,
      prepDaysAfter: 0,
      shipmentMethod: shipmentMethod || undefined,
      notes: (fd.get("notes") as string) || undefined,
      items: selectedProducts.map((productId) => ({ productId, quantity: 1 })),
    });

    if (!result.success || !result.data) {
      setError(result.error ?? "Buchung konnte nicht erstellt werden");
      setLoading(false);
      return;
    }

    router.push(`/buchungen/${result.data.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Neue Buchung"
        description="Vermietung, Messe, Demo oder internen Einsatz planen"
        backHref="/buchungen"
      />

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buchungsdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Buchungstyp *</Label>
                  <Select value={bookingType} onValueChange={(v) => setBookingType(v as BookingType)} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Typ wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(bookingTypeLabels) as BookingType[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {bookingTypeLabels[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerId">Kunde</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kunde wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.companyName} ({c.customerNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Projektname</Label>
                  <Input id="projectName" name="projectName" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Ansprechpartner</Label>
                  <Input id="contactName" name="contactName" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Startdatum *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setAvailability(null);
                    }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Rückgabedatum *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setAvailability(null);
                    }}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipmentMethod">Versandart</Label>
                <Select value={shipmentMethod} onValueChange={(v) => setShipmentMethod(v as ShipmentMethod)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Versandart wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABHOLUNG">Abholung</SelectItem>
                    <SelectItem value="EIGENTRANSPORT">Eigentransport</SelectItem>
                    <SelectItem value="SPEDITION">Spedition</SelectItem>
                    <SelectItem value="KURIER">Kurier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notizen</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Produkte auswählen</CardTitle>
              <Badge variant="secondary">{selectedProducts.length} ausgewählt</Badge>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {products.map((p) => (
                  <label
                    key={p.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                      selectedProducts.includes(p.id)
                        ? "border-flx-blue bg-flx-blue-light"
                        : "border-gray-100 hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="font-mono text-xs text-gray-400">{p.inventoryNumber}</span>
                    <span className="font-medium">{p.name}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verfügbarkeitsprüfung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={checkAvailability}
                disabled={checking || !startDate || !endDate || selectedProducts.length === 0}
              >
                {checking ? "Prüfe…" : "Verfügbarkeit prüfen"}
              </Button>

              {availability && (
                <div
                  className={cn(
                    "rounded-md p-3 text-sm",
                    availability.available
                      ? "bg-status-available/10 text-status-available"
                      : "bg-status-damage/10 text-status-damage"
                  )}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {availability.available ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    {availability.available
                      ? "Alle Produkte verfügbar"
                      : `${availability.conflicts.length} Konflikt(e) gefunden`}
                  </div>
                  {availability.conflicts.map((c, i) => (
                    <p key={i} className="mt-2 text-xs">
                      {c.productName}: {c.bookingNumber} ({c.overlapStart.toLocaleDateString("de-DE")} –{" "}
                      {c.overlapEnd.toLocaleDateString("de-DE")})
                    </p>
                  ))}
                  {availability.alternatives.length > 0 && (
                    <div className="mt-3 border-t border-current/20 pt-2">
                      <p className="text-xs font-medium">Alternativen:</p>
                      {availability.alternatives.map((a) => (
                        <p key={a.id} className="text-xs">
                          {a.inventoryNumber} – {a.name}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || selectedProducts.length === 0}
              >
                {loading ? "Wird erstellt…" : "Buchung anlegen"}
              </Button>
              {error && <p className="text-sm text-status-damage">{error}</p>}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
