import Link from "next/link";
import {
  Package,
  BookOpen,
  AlertTriangle,
  Plus,
  Calendar,
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { unwrapAction } from "@/lib/actions/types";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductStatusBadge } from "@/components/products/product-status-badge";
import { formatCurrency, cn } from "@/lib/utils";

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
      accent: "border-l-flx-blue",
      iconBg: "bg-flx-blue-light text-flx-blue",
    },
    {
      label: "Verfügbar",
      value: data.stats.availableProducts,
      icon: CheckCircle2,
      accent: "border-l-status-available",
      iconBg: "bg-status-available/10 text-status-available",
    },
    {
      label: "Aktive Buchungen",
      value: data.stats.activeBookings,
      icon: BookOpen,
      accent: "border-l-status-reserved",
      iconBg: "bg-status-reserved/10 text-status-reserved",
    },
    {
      label: "Überfällige Rückgaben",
      value: data.stats.overdueReturns,
      icon: AlertTriangle,
      accent:
        data.stats.overdueReturns > 0 ? "border-l-status-damage" : "border-l-gray-300",
      iconBg:
        data.stats.overdueReturns > 0
          ? "bg-status-damage/10 text-status-damage"
          : "bg-gray-100 text-gray-400",
      emphasize: data.stats.overdueReturns > 0,
    },
  ];

  const quickActions = [
    { href: "/buchungen/neu", label: "Buchung anlegen", icon: Plus },
    { href: "/produkte/neu", label: "Produkt anlegen", icon: Package },
    { href: "/ausgaben-rueckgaben", label: "Ausgabe / Rückgabe", icon: ArrowLeftRight },
    { href: "/schaeden/neu", label: "Schaden melden", icon: AlertTriangle },
    { href: "/planung", label: "Planung öffnen", icon: Calendar },
  ];

  const upcoming = [
    ...data.upcomingCheckouts.map((b) => ({
      id: `out-${b.id}`,
      href: `/buchungen/${b.id}`,
      bookingNumber: b.bookingNumber,
      party: b.customer?.companyName ?? b.contactName,
      date: b.startDate,
      kind: "Ausgabe" as const,
    })),
    ...data.upcomingReturns.map((b) => ({
      id: `in-${b.id}`,
      href: `/buchungen/${b.id}`,
      bookingNumber: b.bookingNumber,
      party: b.customer?.companyName ?? b.contactName,
      date: b.plannedReturnDate,
      kind: "Rückgabe" as const,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Überblick über Vermietung, Verfügbarkeit und anstehende Aufgaben"
        actions={[
          { label: "Neue Buchung", href: "/buchungen/neu", icon: <Plus className="h-4 w-4" /> },
        ]}
      />

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={cn(
                "overflow-hidden border-l-4 shadow-none",
                stat.accent,
                stat.emphasize && "bg-status-damage/[0.03]"
              )}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className={cn("rounded-xl p-3", stat.iconBg)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-500">
                    {stat.label}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-3xl font-bold tabular-nums tracking-tight",
                      stat.emphasize ? "text-status-damage" : "text-flx-navy"
                    )}
                  >
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Hinweise */}
      {data.warnings.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {data.warnings.map((w) => (
            <Link
              key={w.message}
              href={w.href}
              className="group flex items-center justify-between gap-3 rounded-lg border border-status-transit/25 bg-gradient-to-r from-status-transit/10 to-transparent px-4 py-3 transition-colors hover:border-status-transit/40 hover:from-status-transit/15"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium text-status-transit">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-status-transit/15">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                {w.message}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-status-transit/70 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}

      {/* Aktionen + Vorschau */}
      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="shadow-none lg:col-span-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Schnellaktionen</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.href}
                  variant="outline"
                  asChild
                  className="h-auto justify-start gap-3 border-gray-200 px-3 py-3 hover:border-flx-blue/30 hover:bg-flx-blue-light/60"
                >
                  <Link href={action.href}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-flx-blue-light text-flx-blue">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-flx-navy">{action.label}</span>
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-none lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">7-Tage-Vorschau</CardTitle>
              <p className="mt-1 text-xs text-gray-500">Ausgaben und Rückgaben der nächsten Woche</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-flx-blue">
              <Link href="/planung">
                Planung
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/60 px-4 py-10 text-center">
                <Calendar className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">
                  Keine anstehenden Termine in den nächsten 7 Tagen.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {upcoming.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
                    >
                      <div className="w-14 shrink-0 text-center">
                        <p className="text-lg font-bold tabular-nums leading-none text-flx-navy">
                          {format(new Date(item.date), "d")}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          {format(new Date(item.date), "MMM", { locale: de })}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "h-10 w-1 shrink-0 rounded-full",
                          item.kind === "Ausgabe" ? "bg-status-reserved" : "bg-status-transit"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-medium text-flx-navy">
                            {item.bookingNumber}
                          </span>
                          <Badge
                            variant={item.kind === "Ausgabe" ? "secondary" : "warning"}
                            className="text-[10px]"
                          >
                            {item.kind}
                          </Badge>
                        </div>
                        <p className="truncate text-sm text-gray-500">
                          {item.party ?? "Ohne Kundenzuordnung"}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Produkte */}
      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Zuletzt aktualisierte Produkte</CardTitle>
            <p className="mt-1 text-xs text-gray-500">Aktueller Bestand auf einen Blick</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-flx-blue">
            <Link href="/produkte">
              Alle Produkte
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-gray-100 bg-gray-50/80 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-3 font-medium">Inventarnr.</th>
                  <th className="px-4 py-3 font-medium">Produkt</th>
                  <th className="px-4 py-3 font-medium">Kategorie</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Standort</th>
                  <th className="px-6 py-3 text-right font-medium">Tagessatz</th>
                </tr>
              </thead>
              <tbody>
                {data.recentProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-flx-blue-light/30"
                  >
                    <td className="px-6 py-3">
                      <Link
                        href={`/produkte/${p.id}`}
                        className="font-mono text-flx-blue hover:underline"
                      >
                        {p.inventoryNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-flx-navy">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.category.name}</td>
                    <td className="px-4 py-3">
                      <ProductStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.location?.name ?? "—"}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-flx-navy">
                      {formatCurrency(p.dailyRateCents)}
                    </td>
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
