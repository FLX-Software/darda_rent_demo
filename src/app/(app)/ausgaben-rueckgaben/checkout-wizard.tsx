"use client";

import { useState } from "react";
import Link from "next/link";
import { Package, PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  items: { product: { id: string; name: string; inventoryNumber: string } }[];
};

export function CheckoutWizard({ bookings }: { bookings: CheckoutBooking[] }) {
  const [selectedBooking, setSelectedBooking] = useState<CheckoutBooking | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const checkoutReady = bookings.filter((b) =>
    ["ABHOLBEREIT", "BESTAETIGT", "IN_VORBEREITUNG"].includes(b.status)
  );
  const returnReady = bookings.filter((b) =>
    ["AKTIV", "RUECKGABE_FAELLIG", "UEBERFAELLIG"].includes(b.status)
  );

  const toggleItem = (productId: string) => {
    setCheckedItems((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  return (
    <div>
      <PageHeader
        title="Ausgaben & Rückgaben"
        description="Produkte an Kunden ausgeben und bei Rückgabe prüfen"
      />

      <Tabs defaultValue="checkout" className="space-y-4">
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
                {checkoutReady.length === 0 ? (
                  <p className="text-sm text-gray-500">Keine Ausgaben anstehend.</p>
                ) : (
                  checkoutReady.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBooking(b);
                        setCheckedItems({});
                      }}
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
                        <Link href={`/buchungen/${selectedBooking.id}`} className="font-medium text-flx-blue hover:underline">
                          {selectedBooking.bookingNumber}
                        </Link>
                        <Badge className="ml-2" variant="secondary">
                          {bookingStatusLabels[selectedBooking.status as keyof typeof bookingStatusLabels]}
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
                          <span className="font-mono text-xs text-gray-400">{item.product.inventoryNumber}</span>
                          <span>{item.product.name}</span>
                        </label>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkoutNotes">Notizen zur Ausgabe</Label>
                      <Textarea id="checkoutNotes" rows={2} placeholder="Zustand, Zubehör, Empfänger…" />
                    </div>

                    <Button
                      disabled={
                        selectedBooking.items.some((i) => !checkedItems[i.product.id])
                      }
                    >
                      Ausgabe bestätigen
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
                      onClick={() => {
                        setSelectedBooking(b);
                        setCheckedItems({});
                      }}
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
                {!selectedBooking ? (
                  <p className="text-sm text-gray-500">Buchung aus der Liste auswählen.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedBooking.items.map((item) => (
                      <div key={item.product.id} className="rounded-md border border-gray-100 p-3 text-sm">
                        <div className="font-medium">{item.product.name}</div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" /> Zustand geprüft
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" /> Zubehör vollständig
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" /> Schaden festgestellt
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" /> Seriennummer verifiziert
                          </label>
                        </div>
                      </div>
                    ))}
                    <div className="space-y-2">
                      <Label htmlFor="checkinNotes">Rückgabenotizen</Label>
                      <Textarea id="checkinNotes" rows={2} />
                    </div>
                    <div className="flex gap-2">
                      <Button>Rückgabe bestätigen</Button>
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
