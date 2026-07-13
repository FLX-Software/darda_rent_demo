import { notFound } from "next/navigation";
import Link from "next/link";
import { getCustomer } from "@/lib/actions/customers";
import { unwrapActionOrNull } from "@/lib/actions/types";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { bookingStatusLabels, bookingTypeLabels } from "@/lib/labels";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Mail, MapPin, Phone, User } from "lucide-react";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = unwrapActionOrNull(await getCustomer(id));
  if (!customer) notFound();

  return (
    <div>
      <PageHeader
        title={customer.companyName}
        description={`Kundennr. ${customer.customerNumber}`}
        backHref="/kunden"
      >
        <Badge variant={customer.isActive ? "default" : "secondary"}>
          {customer.isActive ? "Aktiv" : "Inaktiv"}
        </Badge>
      </PageHeader>

      <Tabs defaultValue="stammdaten" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stammdaten">Stammdaten</TabsTrigger>
          <TabsTrigger value="kontakte">Kontakte ({customer.contacts.length})</TabsTrigger>
          <TabsTrigger value="buchungen">Buchungen ({customer.bookings.length})</TabsTrigger>
          <TabsTrigger value="lieferadressen">
            Lieferadressen ({customer.deliveryAddresses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stammdaten">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Firmendaten</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Branche</dt>
                    <dd>{customer.industry ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Zahlungsziel</dt>
                    <dd>{customer.paymentTerms} Tage</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Rabatt</dt>
                    <dd>{Number(customer.discountPercent)}%</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">E-Mail</dt>
                    <dd>
                      {customer.email ? (
                        <a href={`mailto:${customer.email}`} className="text-flx-blue hover:underline">
                          {customer.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Telefon</dt>
                    <dd>{customer.phone ?? "—"}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rechnungsadresse</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <div>
                    <p>{customer.billingStreet}</p>
                    <p>
                      {customer.billingZip} {customer.billingCity}
                    </p>
                    <p>{customer.billingCountry}</p>
                  </div>
                </div>
                {customer.notes && (
                  <p className="mt-4 rounded-md bg-gray-50 p-3 text-gray-600">{customer.notes}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {customer.customPrices.length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Individuelle Preise</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-gray-100 text-sm">
                  {customer.customPrices.map((cp) => (
                    <li key={cp.id} className="flex items-center justify-between py-2">
                      <Link
                        href={`/produkte/${cp.product.id}`}
                        className="font-medium text-flx-blue hover:underline"
                      >
                        {cp.product.name}
                      </Link>
                      <span>
                        {cp.dailyRateCents != null
                          ? `${formatCurrency(cp.dailyRateCents)} / Tag`
                          : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="kontakte">
          <Card>
            <CardContent className="p-6">
              {customer.contacts.length === 0 ? (
                <p className="text-sm text-gray-500">Keine Kontakte hinterlegt.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {customer.contacts.map((contact) => (
                    <li key={contact.id} className="flex items-start gap-4 py-4">
                      <div className="rounded-full bg-gray-100 p-2">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </p>
                          {contact.isPrimary && <Badge variant="secondary">Hauptkontakt</Badge>}
                        </div>
                        {contact.position && (
                          <p className="text-sm text-gray-500">{contact.position}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-600">
                          {contact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              <a href={`mailto:${contact.email}`} className="hover:underline">
                                {contact.email}
                              </a>
                            </span>
                          )}
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {contact.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buchungen">
          <Card>
            <CardContent className="p-6">
              {customer.bookings.length === 0 ? (
                <p className="text-sm text-gray-500">Keine Buchungen vorhanden.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {customer.bookings.map((booking) => (
                    <li key={booking.id} className="py-3">
                      <Link
                        href={`/buchungen/${booking.id}`}
                        className="flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 py-1 rounded-md"
                      >
                        <div>
                          <p className="font-medium text-flx-blue">{booking.bookingNumber}</p>
                          <p className="text-sm text-gray-500">
                            {bookingTypeLabels[booking.type]} · {booking.projectName ?? "—"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(booking.startDate)} – {formatDate(booking.plannedReturnDate)}
                          </p>
                        </div>
                        <Badge variant="outline">{bookingStatusLabels[booking.status]}</Badge>
                      </Link>
                      {booking.items.length > 0 && (
                        <p className="mt-1 text-xs text-gray-400">
                          {booking.items.map((i) => i.product.name).join(", ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lieferadressen">
          <Card>
            <CardContent className="p-6">
              {customer.deliveryAddresses.length === 0 ? (
                <p className="text-sm text-gray-500">Keine Lieferadressen hinterlegt.</p>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {customer.deliveryAddresses.map((addr) => (
                    <li
                      key={addr.id}
                      className="rounded-lg border border-gray-100 p-4 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{addr.label}</p>
                        {addr.isDefault && <Badge variant="secondary">Standard</Badge>}
                      </div>
                      <p className="mt-2 text-gray-600">{addr.street}</p>
                      <p className="text-gray-600">
                        {addr.zip} {addr.city}
                      </p>
                      <p className="text-gray-500">{addr.country}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
