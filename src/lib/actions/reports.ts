"use server";

import { prisma } from "@/lib/prisma";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";

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

  const utilization = await prisma.product.groupBy({
    by: ["status"],
    _count: true,
  });

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
