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
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteDamage } from "@/lib/actions/damages";
import { DamageStatusActions } from "./damage-status-actions";
import { DamageImages } from "./damage-images";
import { DamageReportEditor } from "./damage-report-editor";
import { DamagePrintActions } from "./damage-print-actions";

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
      <div className="print:hidden">
        <PageHeader
          title={report.damageNumber}
          description={damageCategoryLabels[report.category]}
          backHref="/schaeden"
        >
          <Badge variant={report.severity === "SICHERHEITSRELEVANT" ? "danger" : "warning"}>
            {damageSeverityLabels[report.severity]}
          </Badge>
          <DamageStatusActions damageId={report.id} status={report.status} />
          <DamagePrintActions damageId={report.id} damageNumber={report.damageNumber} />
          <ConfirmDeleteButton
            entityLabel="Schadensmeldung"
            entityName={report.damageNumber}
            onDelete={deleteDamage.bind(null, report.id)}
            redirectTo="/schaeden"
          />
        </PageHeader>
      </div>

      {/* Druck-/PDF-Kopf */}
      <div className="mb-6 hidden border-b border-gray-300 pb-4 print:block">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Darda GmbH · FLX Software</p>
            <h1 className="mt-1 text-2xl font-bold text-flx-navy">Schadensbericht {report.damageNumber}</h1>
            <p className="mt-1 text-sm text-gray-600">{damageCategoryLabels[report.category]}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Gedruckt am {formatDateTime(new Date())}</p>
            <p className="mt-1">
              Schwere: <strong>{damageSeverityLabels[report.severity]}</strong>
            </p>
            <p>
              Status: <strong>{damageStatusLabels[report.status]}</strong>
            </p>
          </div>
        </div>
      </div>

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
                  <Link
                    href={`/produkte/${report.product.id}`}
                    className="text-flx-blue hover:underline print:text-gray-900 print:no-underline"
                  >
                    {report.product.name} ({report.product.inventoryNumber})
                  </Link>
                </dd>
              </div>
              {report.customer && (
                <div>
                  <dt className="text-gray-500">Kunde</dt>
                  <dd>{report.customer.companyName}</dd>
                </div>
              )}
              {report.booking && (
                <div>
                  <dt className="text-gray-500">Buchung</dt>
                  <dd>
                    <Link
                      href={`/buchungen/${report.booking.id}`}
                      className="text-flx-blue hover:underline print:text-gray-900 print:no-underline"
                    >
                      {report.booking.bookingNumber}
                      {report.booking.projectName ? ` · ${report.booking.projectName}` : ""}
                    </Link>
                  </dd>
                </div>
              )}
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
                <dd className="whitespace-pre-wrap">{report.description}</dd>
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
              {report.responsibility && (
                <div>
                  <dt className="text-gray-500">Verantwortung</dt>
                  <dd>{report.responsibility}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">Versicherungsfall</dt>
                <dd>{report.isInsuranceCase ? "Ja" : "Nein"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Bilder</CardTitle>
        </CardHeader>
        <CardContent>
          <DamageImages damageId={report.id} images={report.images} />
        </CardContent>
      </Card>

      {report.images.length > 0 && (
        <Card className="mt-4 hidden print:block">
          <CardHeader>
            <CardTitle className="text-base">Schadensbilder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {report.images.map((img) => (
                <div key={img.id} className="overflow-hidden rounded border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.caption ?? "Schadensbild"}
                    className="h-48 w-full object-contain bg-gray-50"
                  />
                  {img.caption && (
                    <p className="border-t border-gray-100 px-2 py-1 text-xs text-gray-600">{img.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4 print:hidden">
        <CardHeader>
          <CardTitle className="text-base">Schadensbericht</CardTitle>
        </CardHeader>
        <CardContent>
          <DamageReportEditor damageId={report.id} initialNotes={report.notes} />
        </CardContent>
      </Card>

      {report.notes && (
        <Card className="mt-4 hidden print:block">
          <CardHeader>
            <CardTitle className="text-base">Schadensbericht</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{report.notes}</p>
          </CardContent>
        </Card>
      )}

      {report.history.length > 0 && (
        <Card className="mt-4 print:hidden">
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
                  {h.note && <span className="text-gray-500">· {h.note}</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
