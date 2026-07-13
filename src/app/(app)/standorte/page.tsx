import { getLocationsList } from "@/lib/actions/locations";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { locationTypeLabels } from "@/lib/labels";
import { MapPin } from "lucide-react";

export default async function StandortePage() {
  const locations = await getLocationsList();

  return (
    <div>
      <PageHeader
        title="Standorte"
        description="Lager, Niederlassungen, Werkstätten und externe Standorte"
      />

      {locations.length === 0 ? (
        <EmptyState title="Keine Standorte" icon={<MapPin className="h-8 w-8" />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <Card key={loc.id}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <MapPin className="h-5 w-5 text-flx-blue" />
                  <Badge variant={loc.isActive ? "success" : "secondary"}>
                    {loc.isActive ? "Aktiv" : "Inaktiv"}
                  </Badge>
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
