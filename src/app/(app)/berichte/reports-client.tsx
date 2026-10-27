"use client";

import { useState } from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { damageCategoryLabels } from "@/lib/labels";
import { formatCurrency } from "@/lib/utils";
import type { MonthlyRevenue, ProductRevenue } from "@/lib/actions/reports";
import { DamageCategory } from "@prisma/client";

const COLORS = ["#0066CC", "#22C55E", "#F97316", "#8B5CF6", "#EF4444", "#6B7280"];

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
  damages: { category: DamageCategory; _count: number; _sum: { actualCostCents: number | null } }[];
  utilization: { status: string; _count: number }[];
}

export function ReportsClient({
  year,
  monthlyRevenue,
  productRevenueByMonth,
  damages,
  utilization,
}: ReportsClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("year");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const damageData = damages.map((d) => ({
    name: damageCategoryLabels[d.category],
    count: d._count,
    cost: (d._sum.actualCostCents ?? 0) / 100,
  }));

  const utilizationData = utilization.map((u) => ({
    name: u.status,
    value: u._count,
  }));

  const productRevenue = productRevenueByMonth[selectedMonth] ?? [];
  const selectedMonthMeta = monthlyRevenue[selectedMonth];
  const yearTotal = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);

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

  return (
    <div>
      <PageHeader
        title="Berichte"
        description="Auswertungen zu Umsatz, Auslastung und Schäden"
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as ViewMode)}
        >
          <TabsList>
            <TabsTrigger value="year">Jahr</TabsTrigger>
            <TabsTrigger value="month">Monat</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1">
          {viewMode === "year" ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToYear(year - 1)}
                title="Vorheriges Jahr"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="min-w-[120px] font-semibold"
                onClick={() => goToYear(new Date().getFullYear())}
              >
                {year}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToYear(year + 1)}
                title="Nächstes Jahr"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => shiftMonth(-1)}
                title="Vorheriger Monat"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="min-w-[180px] font-semibold capitalize"
                onClick={() => {
                  const now = new Date();
                  setSelectedMonth(now.getMonth());
                  if (year !== now.getFullYear()) goToYear(now.getFullYear());
                }}
              >
                {MONTH_FULL_NAMES[selectedMonth]} {year}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => shiftMonth(1)}
                title="Nächster Monat"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {viewMode === "year" && (
          <p className="text-sm text-gray-500">
            Jahresumsatz:{" "}
            <span className="font-medium text-flx-navy">
              {formatCurrency(yearTotal * 100)}
            </span>
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {viewMode === "year" ? (
          <>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  Umsatz & Buchungen {year} (Jan–Dez)
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Auf einen Monat klicken, um den Produktumsatz zu sehen.
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={monthlyRevenue}
                    onClick={(state) => {
                      const index = state?.activeTooltipIndex;
                      if (typeof index === "number") openMonth(index);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === "revenue" ? formatCurrency(value * 100) : value
                      }
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      name="Umsatz (€)"
                      fill="#0066CC"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                      onClick={(_, index) => openMonth(index)}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="bookings"
                      name="Buchungen"
                      stroke="#F97316"
                      strokeWidth={2}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Umsatzentwicklung {year}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value * 100)} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Umsatz"
                      stroke="#0066CC"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                Produktumsatz – {MONTH_FULL_NAMES[selectedMonth]} {year}
              </CardTitle>
              <p className="text-sm text-gray-500">
                Monatsumsatz:{" "}
                <span className="font-medium text-flx-navy">
                  {formatCurrency((selectedMonthMeta?.revenue ?? 0) * 100)}
                </span>
                {" · "}
                {selectedMonthMeta?.bookings ?? 0} Buchungen
              </p>
            </CardHeader>
            <CardContent>
              {productRevenue.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  Keine Produktumsätze in diesem Monat.
                </p>
              ) : (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={Math.max(280, productRevenue.length * 36)}>
                    <BarChart data={productRevenue} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={160}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value * 100)}
                        labelFormatter={(label, payload) => {
                          const item = payload?.[0]?.payload as ProductRevenue | undefined;
                          return item
                            ? `${item.name} (${item.inventoryNumber})`
                            : String(label);
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        name="Umsatz (€)"
                        fill="#0066CC"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="overflow-x-auto rounded-md border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-gray-500">
                        <tr>
                          <th className="px-4 py-2 font-medium">Produkt</th>
                          <th className="px-4 py-2 font-medium">Inventar-Nr.</th>
                          <th className="px-4 py-2 font-medium text-right">Buchungen</th>
                          <th className="px-4 py-2 font-medium text-right">Umsatz</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productRevenue.map((p) => (
                          <tr key={p.productId} className="border-t border-gray-100">
                            <td className="px-4 py-2.5 font-medium text-flx-navy">{p.name}</td>
                            <td className="px-4 py-2.5 text-gray-500">{p.inventoryNumber}</td>
                            <td className="px-4 py-2.5 text-right">{p.bookings}</td>
                            <td className="px-4 py-2.5 text-right font-medium">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Produktauslastung nach Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={utilizationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {utilizationData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schäden nach Kategorie</CardTitle>
          </CardHeader>
          <CardContent>
            {damageData.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Keine Schadensdaten vorhanden.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={damageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Anzahl" fill="#EF4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
