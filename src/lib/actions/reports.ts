"use server";

import { ProductStatus } from "@prisma/client";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { productStatusLabels } from "@/lib/labels";

/** Statuses that mean the product is currently out of the main warehouse */
const OUT_OF_HOUSE_STATUSES: ProductStatus[] = [
  "UNTERWEGS",
  "BEIM_KUNDEN",
  "AUF_MESSE",
  "BEI_DEMO",
  "INTERN_IM_EINSATZ",
  "RUECKGABE_AUSSTEHEND",
];

function utilizationLabel(
  status: ProductStatus,
  locationType: string | null | undefined
): string {
  if (OUT_OF_HOUSE_STATUSES.includes(status)) {
    return "Außer Haus";
  }
  // Stock at Außenlager / partner sites counts as out of house even if still "available" there
  if (
    (status === "VERFUEGBAR" || status === "RESERVIERT") &&
    locationType &&
    locationType !== "HAUPTLAGER"
  ) {
    return "Außer Haus";
  }
  return productStatusLabels[status];
}

export async function getReportData() {
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 5);

  const bookings = await prisma.booking.findMany({
    where: {
      isArchived: false,
      createdAt: { gte: startOfMonth(sixMonthsAgo) },
    },
    select: {
      createdAt: true,
      totalCostCents: true,
      type: true,
      status: true,
    },
  });

  const damages = await prisma.damageReport.groupBy({
    by: ["category"],
    _count: true,
    _sum: { actualCostCents: true },
  });

  const products = await prisma.product.findMany({
    where: { isArchived: false },
    select: {
      status: true,
      location: { select: { type: true } },
    },
  });

  const utilizationCounts = new Map<string, number>();
  for (const product of products) {
    const label = utilizationLabel(product.status, product.location?.type);
    utilizationCounts.set(label, (utilizationCounts.get(label) ?? 0) + 1);
  }

  const utilization = Array.from(utilizationCounts.entries())
    .map(([status, _count]) => ({ status, _count }))
    .sort((a, b) => b._count - a._count);

  const monthlyRevenue: { month: string; revenue: number; bookings: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(monthStart);
    const monthBookings = bookings.filter(
      (b) => b.createdAt >= monthStart && b.createdAt <= monthEnd
    );
    monthlyRevenue.push({
      month: monthStart.toLocaleDateString("de-DE", { month: "short", year: "2-digit" }),
      revenue: monthBookings.reduce((s, b) => s + b.totalCostCents, 0) / 100,
      bookings: monthBookings.length,
    });
  }

  return { monthlyRevenue, damages, utilization, bookings };
}
