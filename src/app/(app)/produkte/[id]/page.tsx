import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getProduct } from "@/lib/actions/products";
import { unwrapActionOrNull } from "@/lib/actions/types";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import {
  maintenanceStatusLabels,
  productConditionLabels,
  productStatusLabels,
} from "@/lib/labels";

const maintenanceTypeLabels: Record<string, string> = {
  ROUTINE: "Routine-Wartung",
  SICHERHEITSPRUEFUNG: "Sicherheitsprüfung",
  INSPEKTION: "Inspektion",
  REPARATUR: "Reparatur",
  KALIBRIERUNG: "Kalibrierung",
};
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { MapPin, Package, QrCode, Wrench } from "lucide-react";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = unwrapActionOrNull(await getProduct(id));
  if (!product) notFound();

  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`${product.model} · ${product.inventoryNumber}`}
        backHref="/produkte"
        actions={[
          { label: "Neue Buchung", href: `/buchungen/neu?productId=${product.id}` },
        ]}
      >
        <ProductStatusBadge status={product.status} />
      </PageHeader>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="zubehoer">Zubehör ({product.accessories.length})</TabsTrigger>
          <TabsTrigger value="historie">Historie</TabsTrigger>
          <TabsTrigger value="dokumente">Dokumente ({product.documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardContent className="p-4">
                {primaryImage ? (
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={primaryImage.url}
                      alt={primaryImage.caption ?? product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 300px"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100">
                    <Package className="h-16 w-16 text-gray-300" />
                  </div>
                )}
                {product.images.length > 1 && (
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {product.images.slice(0, 4).map((img) => (
                      <div
                        key={img.id}
                        className="relative aspect-square overflow-hidden rounded-md bg-gray-100"
                      >
                        <Image
                          src={img.url}
                          alt={img.caption ?? ""}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Produktdaten</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-3">
                    <div>
                      <dt className="text-gray-500">Kategorie</dt>
                      <dd>{product.category.name}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Hersteller</dt>
                      <dd>{product.manufacturer ?? "Darda GmbH"}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Zustand</dt>
                      <dd>{productConditionLabels[product.condition]}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Seriennummer</dt>
                      <dd className="font-mono">{product.serialNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Barcode</dt>
                      <dd className="font-mono">{product.barcode ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Baujahr</dt>
                      <dd>{product.yearBuilt ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Gewicht</dt>
                      <dd>{product.weightKg ? `${product.weightKg} kg` : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Abmessungen</dt>
                      <dd>{product.dimensions ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Standort</dt>
                      <dd className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {product.location?.name ?? "—"}
                      </dd>
                    </div>
                  </dl>
                  {product.description && (
                    <p className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
                      {product.description}
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Preise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Tagessatz</dt>
                        <dd className="font-medium">{formatCurrency(product.dailyRateCents)}</dd>
                      </div>
                      {product.weeklyRateCents != null && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Wochensatz</dt>
                          <dd>{formatCurrency(product.weeklyRateCents)}</dd>
                        </div>
                      )}
                      {product.depositCents != null && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Kaution</dt>
                          <dd>{formatCurrency(product.depositCents)}</dd>
                        </div>
                      )}
                      {product.replacementValueCents != null && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Wiederbeschaffungswert</dt>
                          <dd>{formatCurrency(product.replacementValueCents)}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">QR-Code</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-gray-400" />
                      <Link
                        href={`/qr/${encodeURIComponent(product.qrCode)}`}
                        className="font-mono text-flx-blue hover:underline"
                      >
                        {product.qrCode}
                      </Link>
                    </div>
                    {product.notes && (
                      <p className="mt-3 text-gray-600">{product.notes}</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {product.maintenanceRecords.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Wartungen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y divide-gray-100 text-sm">
                      {product.maintenanceRecords.map((m) => (
                        <li key={m.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-gray-400" />
                            <span>{maintenanceTypeLabels[m.type] ?? m.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.nextDate && (
                              <span className="text-gray-500">{formatDate(m.nextDate)}</span>
                            )}
                            <Badge variant="outline">
                              {maintenanceStatusLabels[m.status]}
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="zubehoer">
          <Card>
            <CardContent className="p-6">
              {product.accessories.length === 0 ? (
                <p className="text-sm text-gray-500">Kein Zubehör zugeordnet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {product.accessories.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium">{a.accessory.name}</p>
                        {a.accessory.description && (
                          <p className="text-gray-500">{a.accessory.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary">{a.quantity}×</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historie">
          <Card>
            <CardContent className="p-6">
              {product.statusHistory.length === 0 ? (
                <p className="text-sm text-gray-500">Keine Statusänderungen vorhanden.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {product.statusHistory.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium">
                          {productStatusLabels[entry.toStatus]}
                          {entry.fromStatus && (
                            <span className="font-normal text-gray-400">
                              {" "}
                              (vorher: {productStatusLabels[entry.fromStatus]})
                            </span>
                          )}
                        </p>
                        {entry.note && (
                          <p className="text-gray-500">{entry.note}</p>
                        )}
                      </div>
                      <span className="text-gray-400">{formatDateTime(entry.changedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dokumente">
          <Card>
            <CardContent className="p-6">
              {product.documents.length === 0 ? (
                <p className="text-sm text-gray-500">Keine Dokumente hinterlegt.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {product.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium">{doc.name}</p>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-flx-blue hover:underline"
                      >
                        Öffnen
                      </a>
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
