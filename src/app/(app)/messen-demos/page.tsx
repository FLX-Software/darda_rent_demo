import Link from "next/link";
import { Plus } from "lucide-react";
import { getEvents } from "@/lib/actions/events";
import { unwrapAction } from "@/lib/actions/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { eventTypeLabels, eventStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export default async function MessenDemosPage() {
  const events = unwrapAction(await getEvents(), []);

  return (
    <div>
      <PageHeader
        title="Messen"
        description="Messeauftritte und Veranstaltungen planen"
        actions={[{ label: "Neue Veranstaltung", href: "/messen-demos/neu", icon: <Plus className="h-4 w-4" /> }]}
      />

      {events.length === 0 ? (
        <EmptyState
          title="Keine Veranstaltungen"
          description="Legen Sie eine Messe oder Veranstaltung an."
          actionLabel="Veranstaltung anlegen"
          actionHref="/messen-demos/neu"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <Link key={e.id} href={`/messen-demos/${e.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="demo">{eventTypeLabels[e.type]}</Badge>
                    <Badge variant="secondary">{eventStatusLabels[e.status]}</Badge>
                  </div>
                  <h3 className="font-semibold text-flx-navy">{e.name}</h3>
                  {e.venue && <p className="text-sm text-gray-500">{e.venue}</p>}
                  <p className="mt-2 text-xs text-gray-400">
                    {formatDate(e.eventStartDate)} – {formatDate(e.eventEndDate)}
                  </p>
                  <div className="mt-3 flex gap-2 text-xs text-gray-500">
                    <span>{e.products.length} Produkte</span>
                    <span>·</span>
                    <span>{e._count.participants} Teilnehmer</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
