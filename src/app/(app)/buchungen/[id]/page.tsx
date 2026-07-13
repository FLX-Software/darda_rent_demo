import { notFound } from "next/navigation";
import Link from "next/link";
import { getBooking } from "@/lib/actions/bookings";
import { unwrapActionOrNull } from "@/lib/actions/types";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bookingStatusLabels, bookingTypeLabels } from "@/lib/labels";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = unwrapActionOrNull(await getBooking(id));
  if (!booking) notFound();

  return (
    <div>
      <PageHeader
        title={booking.bookingNumber}
        description={booking.projectName ?? bookingTypeLabels[booking.type]}
        backHref="/buchungen"
      >
        <Badge>{bookingStatusLabels[booking.status]}</Badge>
      </PageHeader>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="products">Produkte ({booking.items.length})</TabsTrigger>
          <TabsTrigger value="logistics">Logistik</TabsTrigger>
          <TabsTrigger value="costs">Kosten</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Buchungsdetails</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Typ</dt>
                    <dd>{bookingTypeLabels[booking.type]}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Status</dt>
                    <dd>{bookingStatusLabels[booking.status]}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Kunde</dt>
                    <dd>
                      {booking.customer ? (
                        <Link href={`/kunden/${booking.customer.id}`} className="text-flx-blue hover:underline">
                          {booking.customer.companyName}
                        </Link>
                      ) : (
                        booking.contactName ?? "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Ansprechpartner</dt>
                    <dd>{booking.contactName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Zeitraum</dt>
                    <dd>
                      {formatDate(booking.startDate)} – {formatDate(booking.plannedReturnDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Verantwortlich</dt>
                    <dd>
                      {booking.responsibleUser
                        ? `${booking.responsibleUser.firstName} ${booking.responsibleUser.lastName}`
                        : "—"}
                    </dd>
                  </div>
                </dl>
                {booking.notes && (
                  <p className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-600">{booking.notes}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ausgabe & Rückgabe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {booking.actualCheckoutAt ? (
                  <p>Ausgegeben: {formatDateTime(booking.actualCheckoutAt)}</p>
                ) : (
                  <p className="text-gray-500">Noch nicht ausgegeben</p>
                )}
                {booking.actualReturnAt ? (
                  <p>Zurückgegeben: {formatDateTime(booking.actualReturnAt)}</p>
                ) : (
                  <p className="text-gray-500">Noch nicht zurückgegeben</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardContent className="p-6">
              <ul className="divide-y divide-gray-100">
                {booking.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-3 text-sm">
                    <Link href={`/produkte/${item.product.id}`} className="font-medium text-flx-blue hover:underline">
                      {item.product.name}
                    </Link>
                    <span className="font-mono text-gray-400">{item.product.inventoryNumber}</span>
                  </li>
                ))}
              </ul>
              {booking.accessories.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h4 className="mb-2 text-sm font-medium">Zubehör</h4>
                  {booking.accessories.map((a) => (
                    <p key={a.id} className="text-sm text-gray-600">
                      {a.accessory.name} × {a.quantity}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logistics">
          <Card>
            <CardContent className="p-6">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500">Abholort</dt>
                  <dd>{booking.pickupLocation?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Lieferort</dt>
                  <dd>{booking.deliveryLocation?.name ?? booking.deliveryAddress ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Versandart</dt>
                  <dd>{booking.shipmentMethod ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Spediteur</dt>
                  <dd>{booking.carrier ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Sendungsnr.</dt>
                  <dd>{booking.trackingNumber ?? "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardContent className="p-6">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Mietkosten</dt>
                  <dd>{formatCurrency(booking.rentalCostCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Transport</dt>
                  <dd>{formatCurrency(booking.transportCostCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Zusatzkosten</dt>
                  <dd>{formatCurrency(booking.additionalCostCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Rabatt</dt>
                  <dd>-{formatCurrency(booking.discountCents)}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold">
                  <dt>Gesamt</dt>
                  <dd>{formatCurrency(booking.totalCostCents)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
