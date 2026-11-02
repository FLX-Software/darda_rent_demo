"use server";

import { ProductStatus } from "@prisma/client";
import { endOfMonth, endOfYear, startOfMonth, startOfYear } from "date-fns";
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

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
] as const;

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

export type MonthlyRevenue = {
  monthIndex: number;
  month: string;
  revenue: number;
  bookings: number;
};

export type ProductRevenue = {
  productId: string;
  name: string;
  inventoryNumber: string;
  revenue: number;
  bookings: number;
};

export async function getReportData(year?: number) {
  const now = new Date();
  const selectedYear = year ?? now.getFullYear();
  const yearStart = startOfYear(new Date(selectedYear, 0, 1));
  const yearEnd = endOfYear(yearStart);

  const [bookings, products] = await Promise.all([
    prisma.booking.findMany({
      where: {
        isArchived: false,
        createdAt: { gte: yearStart, lte: yearEnd },
      },
      select: {
        createdAt: true,
        totalCostCents: true,
        items: {
          select: {
            quantity: true,
            dailyRateCents: true,
            product: {
              select: {
                id: true,
                name: true,
                inventoryNumber: true,
                dailyRateCents: true,
              },
            },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { isArchived: false },
      select: {
        status: true,
        location: { select: { type: true } },
      },
    }),
  ]);

  const utilizationCounts = new Map<string, number>();
  for (const product of products) {
    const label = utilizationLabel(product.status, product.location?.type);
    utilizationCounts.set(label, (utilizationCounts.get(label) ?? 0) + 1);
  }

  const utilization = Array.from(utilizationCounts.entries())
    .map(([status, _count]) => ({ status, _count }))
    .sort((a, b) => b._count - a._count);

  const monthlyRevenue: MonthlyRevenue[] = [];
  const productRevenueByMonth: ProductRevenue[][] = [];

  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthStart = startOfMonth(new Date(selectedYear, monthIndex, 1));
    const monthEnd = endOfMonth(monthStart);
    const monthBookings = bookings.filter(
      (b) => b.createdAt >= monthStart && b.createdAt <= monthEnd
    );

    monthlyRevenue.push({
      monthIndex,
      month: MONTH_LABELS[monthIndex],
      revenue: monthBookings.reduce((s, b) => s + b.totalCostCents, 0) / 100,
      bookings: monthBookings.length,
    });

    const productMap = new Map<
      string,
      { name: string; inventoryNumber: string; revenue: number; bookings: number }
    >();

    for (const booking of monthBookings) {
      for (const item of booking.items) {
        const rateCents = item.dailyRateCents ?? item.product.dailyRateCents;
        const itemRevenue = (rateCents * item.quantity) / 100;
        const existing = productMap.get(item.product.id);
        if (existing) {
          existing.revenue += itemRevenue;
          existing.bookings += 1;
        } else {
          productMap.set(item.product.id, {
            name: item.product.name,
            inventoryNumber: item.product.inventoryNumber,
            revenue: itemRevenue,
            bookings: 1,
          });
        }
      }
    }

    productRevenueByMonth.push(
      Array.from(productMap.entries())
        .map(([productId, data]) => ({ productId, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
    );
  }

  const topProductMap = new Map<
    string,
    { name: string; inventoryNumber: string; revenue: number; bookings: number }
  >();
  for (const monthProducts of productRevenueByMonth) {
    for (const item of monthProducts) {
      const existing = topProductMap.get(item.productId);
      if (existing) {
        existing.revenue += item.revenue;
        existing.bookings += item.bookings;
      } else {
        topProductMap.set(item.productId, {
          name: item.name,
          inventoryNumber: item.inventoryNumber,
          revenue: item.revenue,
          bookings: item.bookings,
        });
      }
    }
  }

  const topProducts = Array.from(topProductMap.entries())
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return {
    year: selectedYear,
    monthlyRevenue,
    productRevenueByMonth,
    topProducts,
    utilization,
  };
}
