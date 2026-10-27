"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, PackageCheck } from "lucide-react";
import { ProductCondition } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { performCheckIn, performCheckOut } from "@/lib/actions/checkout";
import { bookingStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

type CheckoutBooking = {
  id: string;
  bookingNumber: string;
  status: string;
  startDate: Date;
  plannedReturnDate: Date;
  customer: { companyName: string } | null;
  contactName: string | null;
  items: {
    product: {
      id: string;
      name: string;
      inventoryNumber: string;
      condition?: ProductCondition;
    };
  }[];
};

type CheckInFlags = {
  conditionChecked: boolean;
  accessoriesComplete: boolean;
  damageNoted: boolean;
  serialVerified: boolean;
};

export function CheckoutWizard({ bookings }: { bookings: CheckoutBooking[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"checkout" | "checkin">("checkout");
  const [selectedBooking, setSelectedBooking] = useState<CheckoutBooking | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [checkInFlags, setCheckInFlags] = useState<Record<string, CheckInFlags>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const checkoutReady = useMemo(
    () =>
      bookings.filter((b) =>
        ["ABHOLBEREIT", "BESTAETIGT", "IN_VORBEREITUNG"].includes(b.status)
      ),
    [bookings]
  );
  const returnReady = useMemo(
    () =>
      bookings.filter((b) =>
        ["AKTIV", "AUSGEGEBEN", "UNTERWEGS", "RUECKGABE_FAELLIG", "UEBERFAELLIG"].includes(
          b.status
        )
      ),
    [bookings]
  );

  function selectBooking(booking: CheckoutBooking) {
    setSelectedBooking(booking);
    setCheckedItems({});
    setNotes("");
    setError("");
    setSuccess("");
    const flags: Record<string, CheckInFlags> = {};
    for (const item of booking.items) {
      flags[item.product.id] = {
        conditionChecked: false,
        accessoriesComplete: false,
        damageNoted: false,
        serialVerified: false,
      };
    }
    setCheckInFlags(flags);
  }

  function toggleItem(productId: string) {
    setCheckedItems((prev) => ({ ...prev, [productId]: !prev[productId] }));
  }

  function updateCheckInFlag(
    productId: string,
    key: keyof CheckInFlags,
    value: boolean
  ) {
    setCheckInFlags((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] ?? {
          conditionChecked: false,
          accessoriesComplete: false,
          damageNoted: false,
          serialVerified: false,
        }),
        [key]: value,
      },
    }));
  }

  async function handleCheckout() {
    if (!selectedBooking) return;
    setLoading(true);
    setError("");
    setSuccess("");

    const result = await performCheckOut({
      bookingId: selectedBooking.id,
      notes: notes || undefined,
      recipientSigned: false,
      items: selectedBooking.items.map((item) => ({
        productId: item.product.id,
        condition: item.product.condition ?? "GUT",
        serialVerified: true,
        accessoriesChecked: true,
      })),
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Ausgabe fehlgeschlagen.");
      return;
    }

    setSuccess("Ausgabe erfolgreich bestätigt.");
    setSelectedBooking(null);
    router.refresh();
  }

  async function handleCheckin() {
    if (!selectedBooking) return;
    setLoading(true);
    setError("");
    setSuccess("");

    const incomplete = selectedBooking.items.some((item) => {
      const flags = checkInFlags[item.product.id];
      return !flags?.conditionChecked || !flags?.accessoriesComplete;
    });
    if (incomplete) {
      setError("Bitte Zustand und Zubehör für alle Produkte bestätigen.");
      setLoading(false);
      return;
    }

    const result = await performCheckIn({
      bookingId: selectedBooking.id,
      notes: notes || undefined,
      cleaningCostCents: 0,
      repairCostCents: 0,
      items: selectedBooking.items.map((item) => {
        const flags = checkInFlags[item.product.id];
        return {
          productId: item.product.id,
          condition: flags?.damageNoted
            ? "BESCHAEDIGT"
            : (item.product.condition ?? "GUT"),
          damageNoted: flags?.damageNoted ?? false,
          notes: flags?.serialVerified ? "Seriennummer verifiziert" : undefined,
        };
      }),
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Rückgabe fehlgeschlagen.");
      return;
    }

    setSuccess("Rückgabe erfolgreich bestätigt.");
    setSelectedBooking(null);
    router.refresh();
  }

  const list = tab === "checkout" ? checkoutReady : returnReady;

  return (
    <div>
      <PageHeader
        title="Ausgaben & Rückgaben"
        description="Produkte an Kunden ausgeben und bei Rückgabe prüfen"
      />

      {success && (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </p>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as "checkout" | "checkin");
          setSelectedBooking(null);
          setError("");
          setSuccess("");
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="checkout">
            <Package className="mr-2 h-4 w-4" />
            Ausgabe ({checkoutReady.length})
          </TabsTrigger>
          <TabsTrigger value="checkin">
            <PackageCheck className="mr-2 h-4 w-4" />
            Rückgabe ({returnReady.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkout">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Ausgabebereit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.length === 0 ? (
                  <p className="text-sm text-gray-500">Keine Ausgaben anstehend.</p>
                ) : (
                  list.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => selectBooking(b)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selectedBooking?.id === b.id
                          ? "border-flx-blue bg-flx-blue-light"
                          : "border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-medium">{b.bookingNumber}</div>
                      <div className="text-xs text-gray-500">
                        {b.customer?.companyName ?? b.contactName} · {formatDate(b.startDate)}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Ausgabe-Assistent</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedBooking ? (
                  <p className="text-sm text-gray-500">Buchung aus der Liste auswählen.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link
                          href={`/buchungen/${selectedBooking.id}`}
                          className="font-medium text-flx-blue hover:underline"
                        >
                          {selectedBooking.bookingNumber}
                        </Link>
                        <Badge className="ml-2" variant="secondary">
                          {
                            bookingStatusLabels[
                              selectedBooking.status as keyof typeof bookingStatusLabels
                            ]
                          }
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Produkte prüfen und abhaken</Label>
                      {selectedBooking.items.map((item) => (
                        <label
                          key={item.product.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-100 px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checkedItems[item.product.id] ?? false}
                            onChange={() => toggleItem(item.product.id)}
                          />
                          <span className="font-mono text-xs text-gray-400">
                            {item.product.inventoryNumber}
                          </span>
                          <span>{item.product.name}</span>
                        </label>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkoutNotes">Notizen zur Ausgabe</Label>
                      <Textarea
                        id="checkoutNotes"
                        rows={2}
                        placeholder="Zustand, Zubehör, Empfänger…"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    {error && <p className="text-sm text-status-damage">{error}</p>}

                    <Button
                      disabled={
                        loading ||
                        selectedBooking.items.some((i) => !checkedItems[i.product.id])
                      }
                      onClick={handleCheckout}
                    >
                      {loading ? "Wird gespeichert…" : "Ausgabe bestätigen"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="checkin">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Rückgabe fällig</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {returnReady.length === 0 ? (
                  <p className="text-sm text-gray-500">Keine Rückgaben anstehend.</p>
                ) : (
                  returnReady.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => selectBooking(b)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selectedBooking?.id === b.id
                          ? "border-flx-blue bg-flx-blue-light"
                          : "border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-medium">{b.bookingNumber}</div>
                      <div className="text-xs text-gray-500">
                        Rückgabe: {formatDate(b.plannedReturnDate)}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Rückgabe-Assistent</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedBooking ||
                !["AKTIV", "AUSGEGEBEN", "UNTERWEGS", "RUECKGABE_FAELLIG", "UEBERFAELLIG"].includes(
                  selectedBooking.status
                ) ? (
                  <p className="text-sm text-gray-500">Buchung aus der Liste auswählen.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedBooking.items.map((item) => {
                      const flags = checkInFlags[item.product.id];
                      return (
                        <div
                          key={item.product.id}
                          className="rounded-md border border-gray-100 p-3 text-sm"
                        >
                          <div className="font-medium">{item.product.name}</div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={flags?.conditionChecked ?? false}
                                onChange={(e) =>
                                  updateCheckInFlag(
                                    item.product.id,
                                    "conditionChecked",
                                    e.target.checked
                                  )
                                }
                              />
                              Zustand geprüft
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={flags?.accessoriesComplete ?? false}
                                onChange={(e) =>
                                  updateCheckInFlag(
                                    item.product.id,
                                    "accessoriesComplete",
                                    e.target.checked
                                  )
                                }
                              />
                              Zubehör vollständig
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={flags?.damageNoted ?? false}
                                onChange={(e) =>
                                  updateCheckInFlag(
                                    item.product.id,
                                    "damageNoted",
                                    e.target.checked
                                  )
                                }
                              />
                              Schaden festgestellt
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={flags?.serialVerified ?? false}
                                onChange={(e) =>
                                  updateCheckInFlag(
                                    item.product.id,
                                    "serialVerified",
                                    e.target.checked
                                  )
                                }
                              />
                              Seriennummer verifiziert
                            </label>
                          </div>
                        </div>
                      );
                    })}
                    <div className="space-y-2">
                      <Label htmlFor="checkinNotes">Rückgabenotizen</Label>
                      <Textarea
                        id="checkinNotes"
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-status-damage">{error}</p>}
                    <div className="flex gap-2">
                      <Button disabled={loading} onClick={handleCheckin}>
                        {loading ? "Wird gespeichert…" : "Rückgabe bestätigen"}
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/schaeden/neu?bookingId=${selectedBooking.id}`}>
                          Schaden melden
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
