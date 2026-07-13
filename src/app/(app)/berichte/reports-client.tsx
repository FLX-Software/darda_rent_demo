"use client";

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
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { damageCategoryLabels } from "@/lib/labels";
import { formatCurrency } from "@/lib/utils";
import { DamageCategory } from "@prisma/client";

const COLORS = ["#0066CC", "#22C55E", "#F97316", "#8B5CF6", "#EF4444", "#6B7280"];

interface ReportsClientProps {
  monthlyRevenue: { month: string; revenue: number; bookings: number }[];
  damages: { category: DamageCategory; _count: number; _sum: { actualCostCents: number | null } }[];
  utilization: { status: string; _count: number }[];
}

export function ReportsClient({ monthlyRevenue, damages, utilization }: ReportsClientProps) {
  const damageData = damages.map((d) => ({
    name: damageCategoryLabels[d.category],
    count: d._count,
    cost: (d._sum.actualCostCents ?? 0) / 100,
  }));

  const utilizationData = utilization.map((u) => ({
    name: u.status.replace(/_/g, " "),
    value: u._count,
  }));

  return (
    <div>
      <PageHeader
        title="Berichte"
        description="Auswertungen zu Umsatz, Auslastung und Schäden"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Umsatz & Buchungen (6 Monate)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
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
                <Bar yAxisId="left" dataKey="revenue" name="Umsatz (€)" fill="#0066CC" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="bookings" name="Buchungen" stroke="#F97316" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Umsatzentwicklung</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => formatCurrency(value * 100)} />
                <Line type="monotone" dataKey="revenue" name="Umsatz" stroke="#0066CC" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
