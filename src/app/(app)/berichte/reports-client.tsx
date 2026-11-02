"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BookOpen,
  Package,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency } from "@/lib/utils";
import type { MonthlyRevenue, ProductRevenue } from "@/lib/actions/reports";

const CHART = {
  blue: "#0066CC",
  green: "#16A34A",
  orange: "#F97316",
  red: "#EF4444",
  purple: "#7C3AED",
  gray: "#94A3B8",
  grid: "#E8EEF5",
};

const PIE_COLORS = [
  CHART.green,
  CHART.blue,
  CHART.orange,
  CHART.purple,
  CHART.red,
  CHART.gray,
  "#0EA5E9",
  "#14B8A6",
];

const MONTH_FULL_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

type ViewMode = "year" | "month";

interface ReportsClientProps {
  year: number;
  monthlyRevenue: MonthlyRevenue[];
  productRevenueByMonth: ProductRevenue[][];
  topProducts: ProductRevenue[];
  utilization: { status: string; _count: number }[];
}

function resolveTooltipColor(entry: {
  color?: string;
  fill?: string;
  payload?: { fill?: string; color?: string };
}) {
  return (
    entry.color ||
    entry.fill ||
    entry.payload?.fill ||
    entry.payload?.color ||
    CHART.blue
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    fill?: string;
    payload?: { fill?: string; color?: string; name?: string };
  }>;
  label?: string;
  valueFormatter?: (value: number, name?: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      {label && <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const color = resolveTooltipColor(entry);
          return (
            <div key={`${entry.name}-${index}`} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-gray-500">{entry.name}</span>
              <span className="font-semibold text-flx-navy">
                {valueFormatter
                  ? valueFormatter(Number(entry.value ?? 0), entry.name)
                  : entry.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReportsClient({
  year,
  monthlyRevenue,
  productRevenueByMonth,
  topProducts,
  utilization,
}: ReportsClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("year");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const utilizationData = utilization.map((u, i) => ({
    name: u.status,
    value: u._count,
    fill: PIE_COLORS[i % PIE_COLORS.length],
  }));

  const productRevenue = productRevenueByMonth[selectedMonth] ?? [];
  const selectedMonthMeta = monthlyRevenue[selectedMonth];
  const yearTotal = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
  const yearBookings = monthlyRevenue.reduce((sum, m) => sum + m.bookings, 0);
  const productCount = utilization.reduce((sum, u) => sum + u._count, 0);
  const utilizationTotal = utilizationData.reduce((sum, u) => sum + u.value, 0) || 1;
  const outOfHouseCount =
    utilizationData.find((u) => u.name === "Außer Haus")?.value ?? 0;
  const availableCount =
    utilizationData.find((u) => u.name === "Verfügbar")?.value ?? 0;
  const outOfHousePercent = Math.round((outOfHouseCount / utilizationTotal) * 100);
  const availablePercent = Math.round((availableCount / utilizationTotal) * 100);
  const avgBookingValue =
    (viewMode === "year" ? yearBookings : selectedMonthMeta?.bookings ?? 0) > 0
      ? (viewMode === "year"
          ? yearTotal
          : selectedMonthMeta?.revenue ?? 0) /
        (viewMode === "year" ? yearBookings : selectedMonthMeta?.bookings ?? 1)
      : 0;

  const peakMonth = useMemo(() => {
    if (monthlyRevenue.length === 0) return null;
    return monthlyRevenue.reduce((best, current) =>
      current.revenue > best.revenue ? current : best
    );
  }, [monthlyRevenue]);

  function goToYear(nextYear: number) {
    router.push(`/berichte?year=${nextYear}`);
  }

  function openMonth(monthIndex: number) {
    setSelectedMonth(monthIndex);
    setViewMode("month");
  }

  function shiftMonth(delta: number) {
    const next = selectedMonth + delta;
    if (next < 0) {
      setSelectedMonth(11);
      goToYear(year - 1);
      return;
    }
    if (next > 11) {
      setSelectedMonth(0);
      goToYear(year + 1);
      return;
    }
    setSelectedMonth(next);
  }

  const summaryCards = [
    {
      label: viewMode === "year" ? "Jahresumsatz" : "Monatsumsatz",
      value: formatCurrency(
        (viewMode === "year" ? yearTotal : selectedMonthMeta?.revenue ?? 0) * 100
      ),
      icon: TrendingUp,
      accent: "border-l-flx-blue",
      iconBg: "bg-flx-blue-light text-flx-blue",
    },
    {
      label: "Buchungen",
      value: String(viewMode === "year" ? yearBookings : selectedMonthMeta?.bookings ?? 0),
      icon: BookOpen,
      accent: "border-l-status-reserved",
      iconBg: "bg-status-reserved/10 text-status-reserved",
    },
    {
      label: "Ø Buchungswert",
      value: formatCurrency(avgBookingValue * 100),
      icon: TrendingUp,
      accent: "border-l-status-transit",
      iconBg: "bg-status-transit/10 text-status-transit",
    },
    {
      label: "Produkte im Bestand",
      value: String(productCount),
      icon: Package,
      accent: "border-l-status-available",
      iconBg: "bg-status-available/10 text-status-available",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Berichte"
        description="Auswertungen zu Umsatz und Auslastung"
      />

      {/* Steuerung */}
      <Card className="shadow-none">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="bg-gray-100">
              <TabsTrigger value="year">Jahr</TabsTrigger>
              <TabsTrigger value="month">Monat</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {viewMode === "year" ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToYear(year - 1)}
                  title="Vorheriges Jahr"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  className="min-w-[96px] rounded-md px-3 py-1.5 text-sm font-semibold text-flx-navy hover:bg-flx-blue-light"
                  onClick={() => goToYear(new Date().getFullYear())}
                >
                  {year}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => goToYear(year + 1)}
                  title="Nächstes Jahr"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => shiftMonth(-1)}
                  title="Vorheriger Monat"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <button
                  type="button"
                  className="min-w-[160px] rounded-md px-3 py-1.5 text-sm font-semibold capitalize text-flx-navy hover:bg-flx-blue-light"
                  onClick={() => {
                    const now = new Date();
                    setSelectedMonth(now.getMonth());
                    if (year !== now.getFullYear()) goToYear(now.getFullYear());
                  }}
                >
                  {MONTH_FULL_NAMES[selectedMonth]} {year}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => shiftMonth(1)}
                  title="Nächster Monat"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {viewMode === "year" && peakMonth && peakMonth.revenue > 0 && (
            <p className="text-sm text-gray-500">
              Stärkster Monat:{" "}
              <span className="font-medium text-flx-navy">
                {MONTH_FULL_NAMES[peakMonth.monthIndex]} ({formatCurrency(peakMonth.revenue * 100)})
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className={cn("overflow-hidden border-l-4 shadow-none", card.accent)}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={cn("rounded-xl p-3", card.iconBg)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-500">
                    {card.label}
                  </p>
                  <p className="mt-0.5 truncate text-2xl font-bold tabular-nums tracking-tight text-flx-navy">
                    {card.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {viewMode === "year" ? (
          <>
            <Card className="shadow-none lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Umsatz & Buchungen {year}</CardTitle>
                <p className="text-sm text-gray-500">
                  Auf einen Monat klicken, um den Produktumsatz zu öffnen.
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart
                    data={monthlyRevenue}
                    onClick={(state) => {
                      const index = state?.activeTooltipIndex;
                      if (typeof index === "number") openMonth(index);
                    }}
                    style={{ cursor: "pointer" }}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" stroke={CHART.grid} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          valueFormatter={(value, name) =>
                            name?.includes("Umsatz")
                              ? formatCurrency(value * 100)
                              : String(value)
                          }
                        />
                      }
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                      iconType="circle"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      name="Umsatz (€)"
                      fill={CHART.blue}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={42}
                      cursor="pointer"
                      onClick={(_, index) => openMonth(index)}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="bookings"
                      name="Buchungen"
                      stroke={CHART.orange}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: CHART.orange, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-none lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Umsatzentwicklung {year}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyRevenue} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={CHART.grid} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          valueFormatter={(value) => formatCurrency(value * 100)}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Umsatz"
                      stroke={CHART.blue}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: CHART.blue, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="shadow-none lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Produktumsatz – {MONTH_FULL_NAMES[selectedMonth]} {year}
              </CardTitle>
              <p className="text-sm text-gray-500">
                Monatsumsatz{" "}
                <span className="font-medium text-flx-navy">
                  {formatCurrency((selectedMonthMeta?.revenue ?? 0) * 100)}
                </span>
                {" · "}
                {selectedMonthMeta?.bookings ?? 0} Buchungen
              </p>
            </CardHeader>
            <CardContent>
              {productRevenue.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/70 px-4 py-12 text-center">
                  <Package className="mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-500">Keine Produktumsätze in diesem Monat.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(280, productRevenue.length * 38)}
                  >
                    <BarChart
                      data={productRevenue}
                      layout="vertical"
                      margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="4 4" stroke={CHART.grid} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12, fill: "#64748B" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={150}
                        tick={{ fontSize: 11, fill: "#475569" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          const item = payload?.[0]?.payload as ProductRevenue | undefined;
                          return (
                            <ChartTooltip
                              active={active}
                              payload={payload as Array<{
                                name?: string;
                                value?: number;
                                color?: string;
                              }>}
                              label={
                                item
                                  ? `${item.name} (${item.inventoryNumber})`
                                  : undefined
                              }
                              valueFormatter={(value) => formatCurrency(value * 100)}
                            />
                          );
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        name="Umsatz (€)"
                        fill={CHART.blue}
                        radius={[0, 6, 6, 0]}
                        maxBarSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs uppercase tracking-wide text-gray-500">
                          <th className="px-4 py-3 font-medium">Produkt</th>
                          <th className="px-4 py-3 font-medium">Seriennr.</th>
                          <th className="px-4 py-3 text-right font-medium">Buchungen</th>
                          <th className="px-4 py-3 text-right font-medium">Umsatz</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productRevenue.map((p) => (
                          <tr
                            key={p.productId}
                            className="border-b border-gray-50 last:border-0 hover:bg-flx-blue-light/30"
                          >
                            <td className="px-4 py-3 font-medium text-flx-navy">{p.name}</td>
                            <td className="px-4 py-3 font-mono text-gray-500">
                              {p.inventoryNumber}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">{p.bookings}</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-flx-navy">
                              {formatCurrency(p.revenue * 100)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Produktauslastung</CardTitle>
            <p className="text-sm text-gray-500">Aktueller Gerätebestand nach Status</p>
          </CardHeader>
          <CardContent>
            {utilizationData.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">Keine Produktdaten.</p>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                      Außer Haus
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-flx-navy">
                      {outOfHouseCount}
                      <span className="ml-1 text-sm font-medium text-gray-400">
                        ({outOfHousePercent}%)
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                      Verfügbar
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-flx-navy">
                      {availableCount}
                      <span className="ml-1 text-sm font-medium text-gray-400">
                        ({availablePercent}%)
                      </span>
                    </p>
                  </div>
                </div>

                <div className="relative mx-auto h-[200px] w-full max-w-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={utilizationData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {utilizationData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        cursor={false}
                        content={
                          <ChartTooltip valueFormatter={(value) => `${value} Produkte`} />
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold tabular-nums text-flx-navy">
                      {productCount}
                    </p>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                      Geräte
                    </p>
                  </div>
                </div>

                <ul className="space-y-3">
                  {utilizationData.map((item, i) => {
                    const percent = Math.round((item.value / utilizationTotal) * 100);
                    return (
                      <li key={item.name} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2 text-gray-600">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                              }}
                            />
                            {item.name}
                          </span>
                          <span className="font-semibold tabular-nums text-flx-navy">
                            {item.value}
                            <span className="ml-1 text-xs font-normal text-gray-400">
                              ({percent}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top-Produkte {year}</CardTitle>
            <p className="text-sm text-gray-500">Umsatzstärkste Geräte im ausgewählten Jahr</p>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/70 px-4 py-12 text-center">
                <Package className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">Noch keine Produktumsätze in diesem Jahr.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(220, Math.min(topProducts.length, 5) * 42)}
                >
                  <BarChart
                    data={topProducts.slice(0, 5)}
                    layout="vertical"
                    margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" stroke={CHART.grid} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={110}
                      tick={{ fontSize: 11, fill: "#475569" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          valueFormatter={(value) => formatCurrency(value * 100)}
                        />
                      }
                    />
                    <Bar
                      dataKey="revenue"
                      name="Umsatz (€)"
                      fill={CHART.blue}
                      radius={[0, 6, 6, 0]}
                      maxBarSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>

                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                  {topProducts.slice(0, 5).map((product, index) => (
                    <li
                      key={product.productId}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-flx-navy">
                          <span className="mr-2 text-gray-400">{index + 1}.</span>
                          {product.name}
                        </p>
                        <p className="truncate font-mono text-xs text-gray-400">
                          {product.inventoryNumber} · {product.bookings} Buchung
                          {product.bookings === 1 ? "" : "en"}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums text-flx-navy">
                        {formatCurrency(product.revenue * 100)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
