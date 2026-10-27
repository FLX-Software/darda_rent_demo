import { notFound } from "next/navigation";
import Link from "next/link";
import { getEvent } from "@/lib/actions/events";
import { unwrapActionOrNull } from "@/lib/actions/types";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { eventTypeLabels, eventStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = unwrapActionOrNull(await getEvent(id));
  if (!event) notFound();

  const isMesse = event.type === "MESSE";

  const checklistItems = event.checklist
    ? [
        { label: "Produkte reserviert", done: event.checklist.productsReserved },
        { label: "Zubehör komplett", done: event.checklist.accessoriesComplete },
        { label: "Produkte geprüft", done: event.checklist.productChecked },
        { label: "Transport organisiert", done: event.checklist.transportOrganized },
        { label: "Dokumente bereit", done: event.checklist.documentsReady },
        { label: "Produkte verladen", done: event.checklist.productsLoaded },
        { label: "Rückgabe geplant", done: event.checklist.returnPlanned },
        { label: "Rückgabe abgeschlossen", done: event.checklist.returnCompleted },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title={event.name}
        description={eventTypeLabels[event.type]}
        backHref="/messen-demos"
        actions={[
          {
            label: "Bearbeiten",
            href: `/messen-demos/${event.id}/bearbeiten`,
            variant: "outline",
          },
        ]}
      >
        <Badge>{eventStatusLabels[event.status]}</Badge>
      </PageHeader>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="products">Produkte ({event.products.length})</TabsTrigger>
          {!isMesse && (
            <TabsTrigger value="team">Team ({event.participants.length})</TabsTrigger>
          )}
          {!isMesse && <TabsTrigger value="checklist">Checkliste</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Veranstaltungsdetails</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Veranstaltungsort</dt>
                    <dd>{event.venue ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Adresse</dt>
                    <dd>
                      {[event.street, [event.zip, event.city].filter(Boolean).join(" ")]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Kunde</dt>
                    <dd>
                      {event.customer ? (
                        <Link href={`/kunden/${event.customer.id}`} className="text-flx-blue hover:underline">
                          {event.customer.companyName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Zeitraum</dt>
                    <dd>
                      {formatDate(event.eventStartDate)} – {formatDate(event.eventEndDate)}
                    </dd>
                  </div>
                  {(event.setupStartDate || event.setupEndDate) && (
                    <div>
                      <dt className="text-gray-500">Aufbau</dt>
                      <dd>
                        {event.setupStartDate ? formatDate(event.setupStartDate) : "—"} –{" "}
                        {event.setupEndDate ? formatDate(event.setupEndDate) : "—"}
                      </dd>
                    </div>
                  )}
                  {(event.teardownStartDate || event.teardownEndDate) && (
                    <div>
                      <dt className="text-gray-500">Abbau</dt>
                      <dd>
                        {event.teardownStartDate ? formatDate(event.teardownStartDate) : "—"} –{" "}
                        {event.teardownEndDate ? formatDate(event.teardownEndDate) : "—"}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-gray-500">Ansprechpartner vor Ort</dt>
                    <dd>{event.contactOnSite ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Telefon vor Ort</dt>
                    <dd>{event.contactPhone ?? "—"}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logistik</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>{event.transportNotes ?? "Keine Transportnotizen"}</p>
                {event.carrier && <p className="text-gray-500">Spediteur: {event.carrier}</p>}
                {event.hotelInfo && <p className="text-gray-500">Hotel: {event.hotelInfo}</p>}
                {event.notes && <p className="text-gray-500">Notizen: {event.notes}</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardContent className="p-6">
              {event.products.length === 0 ? (
                <p className="text-sm text-gray-500">Keine Produkte zugeordnet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {event.products.map((ep) => (
                    <li key={ep.id} className="py-3">
                      <Link href={`/produkte/${ep.product.id}`} className="font-medium text-flx-blue hover:underline">
                        {ep.product.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {!isMesse && (
          <TabsContent value="team">
            <Card>
              <CardContent className="p-6">
                {event.participants.length === 0 ? (
                  <p className="text-sm text-gray-500">Keine Teilnehmer zugeordnet.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {event.participants.map((p) => (
                      <li key={p.id} className="py-3 text-sm">
                        {p.user.firstName} {p.user.lastName}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {!isMesse && (
          <TabsContent value="checklist">
            <Card>
              <CardContent className="p-6">
                {checklistItems.length === 0 ? (
                  <p className="text-sm text-gray-500">Keine Checkliste vorhanden.</p>
                ) : (
                  <ul className="space-y-2">
                    {checklistItems.map((item) => (
                      <li key={item.label} className="flex items-center gap-2 text-sm">
                        {item.done ? (
                          <CheckCircle2 className="h-4 w-4 text-status-available" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-300" />
                        )}
                        {item.label}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
