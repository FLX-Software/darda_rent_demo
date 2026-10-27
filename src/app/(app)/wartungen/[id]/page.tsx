import { notFound } from "next/navigation";
import Link from "next/link";
import { getMaintenance } from "@/lib/actions/maintenance";
import { unwrapActionOrNull } from "@/lib/actions/types";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { maintenanceStatusLabels, maintenanceTypeLabels } from "@/lib/labels";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteMaintenance } from "@/lib/actions/maintenance";
import { MaintenanceActions } from "../maintenance-actions";
import { EditMaintenanceForm } from "./edit-maintenance-form";

export default async function WartungDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const maintenance = unwrapActionOrNull(await getMaintenance(id));
  if (!maintenance) notFound();

  return (
    <div>
      <PageHeader
        title={maintenanceTypeLabels[maintenance.type]}
        description={`${maintenance.product.name} · ${maintenance.product.inventoryNumber}`}
        backHref="/wartungen"
      >
        <Badge
          variant={
            maintenance.status === "UEBERFAELLIG" || maintenance.status === "FAELLIG"
              ? "warning"
              : maintenance.status === "ABGESCHLOSSEN"
                ? "success"
                : "secondary"
          }
        >
          {maintenanceStatusLabels[maintenance.status]}
        </Badge>
        <MaintenanceActions id={maintenance.id} status={maintenance.status} />
        <ConfirmDeleteButton
          entityLabel="Wartung"
          entityName={maintenanceTypeLabels[maintenance.type]}
          onDelete={deleteMaintenance.bind(null, maintenance.id)}
          redirectTo="/wartungen"
        />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Übersicht</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Produkt</dt>
                <dd>
                  <Link
                    href={`/produkte/${maintenance.product.id}`}
                    className="text-flx-blue hover:underline"
                  >
                    {maintenance.product.name} ({maintenance.product.inventoryNumber})
                  </Link>
                </dd>
              </div>
              {maintenance.product.location && (
                <div>
                  <dt className="text-gray-500">Standort</dt>
                  <dd>{maintenance.product.location.name}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Typ</dt>
                <dd>{maintenanceTypeLabels[maintenance.type]}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd>{maintenanceStatusLabels[maintenance.status]}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Nächster Termin</dt>
                <dd>{maintenance.nextDate ? formatDate(maintenance.nextDate) : "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Letzter Termin</dt>
                <dd>{maintenance.lastDate ? formatDate(maintenance.lastDate) : "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Intervall</dt>
                <dd>
                  {maintenance.intervalDays != null ? `${maintenance.intervalDays} Tage` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Dienstleister</dt>
                <dd>{maintenance.serviceProvider ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Kosten</dt>
                <dd>
                  {maintenance.costCents != null ? formatCurrency(maintenance.costCents) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Durchgeführt von</dt>
                <dd>
                  {maintenance.performedBy
                    ? `${maintenance.performedBy.firstName} ${maintenance.performedBy.lastName}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Angelegt</dt>
                <dd>{formatDateTime(maintenance.createdAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bearbeiten</CardTitle>
          </CardHeader>
          <CardContent>
            <EditMaintenanceForm maintenance={maintenance} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
