import { notFound } from "next/navigation";
import Link from "next/link";
import { getDamage } from "@/lib/actions/damages";
import { unwrapActionOrNull } from "@/lib/actions/types";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  damageCategoryLabels,
  damageSeverityLabels,
  damageStatusLabels,
} from "@/lib/labels";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default async function SchadenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = unwrapActionOrNull(await getDamage(id));
  if (!report) notFound();

  return (
    <div>
      <PageHeader
        title={report.damageNumber}
        description={damageCategoryLabels[report.category]}
        backHref="/schaeden"
      >
        <Badge variant={report.severity === "SICHERHEITSRELEVANT" ? "danger" : "warning"}>
          {damageSeverityLabels[report.severity]}
        </Badge>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schadensdetails</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Produkt</dt>
                <dd>
                  <Link href={`/produkte/${report.product.id}`} className="text-flx-blue hover:underline">
                    {report.product.name} ({report.product.inventoryNumber})
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Status</dt>
                <dd>{damageStatusLabels[report.status]}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Betroffenes Bauteil</dt>
                <dd>{report.affectedPart ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Beschreibung</dt>
                <dd>{report.description}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Gemeldet von</dt>
                <dd>
                  {report.reportedBy.firstName} {report.reportedBy.lastName} am{" "}
                  {formatDateTime(report.reportedAt)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kosten & Abwicklung</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Geschätzte Kosten</dt>
                <dd>{report.estimatedCostCents ? formatCurrency(report.estimatedCostCents) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Tatsächliche Kosten</dt>
                <dd>{report.actualCostCents ? formatCurrency(report.actualCostCents) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Kundenbelastung</dt>
                <dd>{report.customerChargeCents ? formatCurrency(report.customerChargeCents) : "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Reparatur erforderlich</dt>
                <dd>{report.repairRequired ? "Ja" : "Nein"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Weiter nutzbar</dt>
                <dd>{report.stillUsable ? "Ja" : "Nein"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {report.history.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Statusverlauf</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {report.history.map((h) => (
                <li key={h.id} className="flex items-center gap-2">
                  <span className="text-gray-400">{formatDate(h.changedAt)}</span>
                  {h.fromStatus && <span>{damageStatusLabels[h.fromStatus]}</span>}
                  <span>→</span>
                  <span>{damageStatusLabels[h.toStatus]}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
