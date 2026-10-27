import Link from "next/link";
import { getMaintenances } from "@/lib/actions/maintenance";
import { getProducts } from "@/lib/actions/products";
import { unwrapAction } from "@/lib/actions/types";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { maintenanceStatusLabels, maintenanceTypeLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { Wrench } from "lucide-react";
import { MaintenanceActions } from "./maintenance-actions";
import { CreateMaintenanceForm } from "./create-maintenance-form";

export default async function WartungenPage() {
  const [maintenances, products] = await Promise.all([
    unwrapAction(await getMaintenances(), []),
    unwrapAction(await getProducts(), []),
  ]);

  return (
    <div>
      <PageHeader
        title="Wartungen"
        description="Geplante und fällige Wartungen sowie Sicherheitsprüfungen"
      />

      <div className="mb-6">
        <CreateMaintenanceForm
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            inventoryNumber: p.inventoryNumber,
          }))}
        />
      </div>

      {maintenances.length === 0 ? (
        <EmptyState title="Keine Wartungen" icon={<Wrench className="h-8 w-8" />} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Produkt</th>
                    <th className="px-4 py-3 font-medium">Typ</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Nächster Termin</th>
                    <th className="px-4 py-3 font-medium text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenances.map((m) => (
                    <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-0">
                        <Link href={`/wartungen/${m.id}`} className="block px-4 py-3">
                          <span className="font-medium text-flx-blue hover:underline">
                            {m.product.name}
                          </span>
                          <div className="text-xs text-gray-400">{m.product.inventoryNumber}</div>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/wartungen/${m.id}`} className="block px-4 py-3 text-gray-700">
                          {maintenanceTypeLabels[m.type]}
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/wartungen/${m.id}`} className="block px-4 py-3">
                          <Badge
                            variant={
                              m.status === "UEBERFAELLIG" || m.status === "FAELLIG"
                                ? "warning"
                                : m.status === "ABGESCHLOSSEN"
                                  ? "success"
                                  : "secondary"
                            }
                          >
                            {maintenanceStatusLabels[m.status]}
                          </Badge>
                        </Link>
                      </td>
                      <td className="p-0">
                        <Link href={`/wartungen/${m.id}`} className="block px-4 py-3">
                          {m.nextDate ? formatDate(m.nextDate) : "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <MaintenanceActions id={m.id} status={m.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
