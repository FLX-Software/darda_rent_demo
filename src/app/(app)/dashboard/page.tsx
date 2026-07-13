import Link from "next/link";
import {
  Package,
  BookOpen,
  AlertTriangle,
  Plus,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { unwrapAction } from "@/lib/actions/types";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
  const data = unwrapAction(await getDashboardStats(), {
    stats: {
      totalProducts: 0,
      availableProducts: 0,
      atCustomer: 0,
      atMesse: 0,
      atDemo: 0,
      inTransit: 0,
      inMaintenance: 0,
      damaged: 0,
      overdueReturns: 0,
      todayCheckouts: 0,
      todayReturns: 0,
      activeBookings: 0,
      openDamages: 0,
      pendingMaintenances: 0,
      monthlyRevenueCents: 0,
    },
    warnings: [],
    upcomingCheckouts: [],
    upcomingReturns: [],
    recentProducts: [],
  });

  const statCards = [
    {
      label: "Produkte gesamt",
      value: data.stats.totalProducts,
      icon: Package,
      color: "text-flx-blue",
    },
    {
      label: "Verfügbar",
      value: data.stats.availableProducts,
      icon: Package,
      color: "text-status-available",
    },
    {
      label: "Aktive Buchungen",
      value: data.stats.activeBookings,
      icon: BookOpen,
      color: "text-status-reserved",
    },
    {
      label: "Überfällige Rückgaben",
      value: data.stats.overdueReturns,
      icon: AlertTriangle,
      color: "text-status-damage",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Überblick über Vermietung, Verfügbarkeit und anstehende Aufgaben"
        actions={[
          { label: "Neue Buchung", href: "/buchungen/neu", icon: <Plus className="h-4 w-4" /> },
        ]}
      />

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg bg-gray-50 p-3 ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-flx-navy">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="mb-6 space-y-2">
          {data.warnings.map((w) => (
            <Link
              key={w.message}
              href={w.href}
              className="flex items-center justify-between rounded-lg border border-status-transit/30 bg-status-transit/5 px-4 py-3 text-sm hover:bg-status-transit/10"
            >
              <span className="flex items-center gap-2 font-medium text-status-transit">
                <AlertTriangle className="h-4 w-4" />
                {w.message}
              </span>
              <ArrowRight className="h-4 w-4 text-status-transit" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schnellaktionen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" asChild className="justify-start">
              <Link href="/buchungen/neu">
                <Plus className="mr-2 h-4 w-4" /> Buchung anlegen
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link href="/produkte/neu">
                <Plus className="mr-2 h-4 w-4" /> Produkt anlegen
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link href="/ausgaben-rueckgaben">
                <Package className="mr-2 h-4 w-4" /> Ausgabe / Rückgabe
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link href="/schaeden/neu">
                <AlertTriangle className="mr-2 h-4 w-4" /> Schaden melden
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link href="/planung">
                <Calendar className="mr-2 h-4 w-4" /> Planung öffnen
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* 7-day calendar preview */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">7-Tage-Vorschau</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/planung">Planung öffnen</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.upcomingCheckouts.length === 0 && data.upcomingReturns.length === 0 ? (
                <p className="text-sm text-gray-500">Keine anstehenden Termine in den nächsten 7 Tagen.</p>
              ) : (
                <>
                  {data.upcomingCheckouts.map((b) => (
                    <Link
                      key={`out-${b.id}`}
                      href={`/buchungen/${b.id}`}
                      className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 hover:bg-gray-50"
                    >
                      <div>
                        <span className="text-sm font-medium">{b.bookingNumber}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          Ausgabe · {b.customer?.companyName ?? b.contactName}
                        </span>
                      </div>
                      <Badge variant="secondary">{formatDate(b.startDate)}</Badge>
                    </Link>
                  ))}
                  {data.upcomingReturns.map((b) => (
                    <Link
                      key={`in-${b.id}`}
                      href={`/buchungen/${b.id}`}
                      className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 hover:bg-gray-50"
                    >
                      <div>
                        <span className="text-sm font-medium">{b.bookingNumber}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          Rückgabe · {b.customer?.companyName ?? b.contactName}
                        </span>
                      </div>
                      <Badge variant="warning">{formatDate(b.plannedReturnDate)}</Badge>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent products */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Zuletzt aktualisierte Produkte</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/produkte">Alle Produkte</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">Inventarnr.</th>
                  <th className="pb-2 font-medium">Produkt</th>
                  <th className="pb-2 font-medium">Kategorie</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Standort</th>
                  <th className="pb-2 font-medium">Tagessatz</th>
                </tr>
              </thead>
              <tbody>
                {data.recentProducts.map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2">
                      <Link href={`/produkte/${p.id}`} className="font-mono text-flx-blue hover:underline">
                        {p.inventoryNumber}
                      </Link>
                    </td>
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="py-2 text-gray-500">{p.category.name}</td>
                    <td className="py-2">
                      <ProductStatusBadge status={p.status} />
                    </td>
                    <td className="py-2 text-gray-500">{p.location?.name ?? "—"}</td>
                    <td className="py-2">{formatCurrency(p.dailyRateCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
