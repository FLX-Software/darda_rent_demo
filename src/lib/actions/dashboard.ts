"use server";

import { addDays, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { actionError, actionSuccess } from "./types";

export async function getDashboardStats() {
  try {
    await requireAuth();

    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const weekEnd = addDays(today, 7);
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const [
      totalProducts,
      availableProducts,
      atCustomer,
      atMesse,
      atDemo,
      inTransit,
      inMaintenance,
      damaged,
      overdueReturns,
      todayCheckouts,
      todayReturns,
      activeBookings,
      openDamages,
      pendingMaintenances,
      monthlyRevenue,
      upcomingCheckouts,
      upcomingReturns,
      recentProducts,
      conflictCount,
    ] = await Promise.all([
      prisma.product.count({ where: { isArchived: false } }),
      prisma.product.count({ where: { isArchived: false, status: "VERFUEGBAR" } }),
      prisma.product.count({ where: { isArchived: false, status: "BEIM_KUNDEN" } }),
      prisma.product.count({ where: { isArchived: false, status: "AUF_MESSE" } }),
      prisma.product.count({ where: { isArchived: false, status: "BEI_DEMO" } }),
      prisma.product.count({ where: { isArchived: false, status: "UNTERWEGS" } }),
      prisma.product.count({ where: { isArchived: false, status: { in: ["IN_WARTUNG", "IN_REPARATUR"] } } }),
      prisma.product.count({ where: { isArchived: false, status: "BESCHAEDIGT" } }),
      prisma.booking.count({ where: { status: "UEBERFAELLIG", isArchived: false } }),
      prisma.booking.count({
        where: {
          isArchived: false,
          status: { in: ["ABHOLBEREIT", "BESTAETIGT", "IN_VORBEREITUNG"] },
          startDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.booking.count({
        where: {
          isArchived: false,
          status: { in: ["AKTIV", "RUECKGABE_FAELLIG"] },
          plannedReturnDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.booking.count({
        where: { isArchived: false, status: { in: ["AKTIV", "UNTERWEGS", "AUSGEGEBEN"] } },
      }),
      prisma.damageReport.count({
        where: { status: { notIn: ["GESCHLOSSEN", "REPARIERT"] } },
      }),
      prisma.maintenance.count({
        where: { status: { in: ["FAELLIG", "UEBERFAELLIG"] } },
      }),
      prisma.cost.aggregate({
        where: { type: "MIETE", date: { gte: monthStart, lte: monthEnd } },
        _sum: { amountCents: true },
      }),
      prisma.booking.findMany({
        where: {
          isArchived: false,
          status: { in: ["ABHOLBEREIT", "BESTAETIGT", "IN_VORBEREITUNG"] },
          startDate: { gte: today, lte: weekEnd },
        },
        include: { customer: true },
        orderBy: { startDate: "asc" },
        take: 10,
      }),
      prisma.booking.findMany({
        where: {
          isArchived: false,
          status: { in: ["AKTIV", "RUECKGABE_FAELLIG", "UEBERFAELLIG"] },
          plannedReturnDate: { gte: today, lte: weekEnd },
        },
        include: { customer: true },
        orderBy: { plannedReturnDate: "asc" },
        take: 10,
      }),
      prisma.product.findMany({
        where: { isArchived: false },
        include: { category: true, location: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.booking.count({ where: { status: "UEBERFAELLIG", isArchived: false } }),
    ]);

    const warnings: { message: string; href: string }[] = [];

    if (overdueReturns > 0) {
      warnings.push({
        message: `${overdueReturns} überfällige Rückgabe(n)`,
        href: "/buchungen",
      });
    }
    if (openDamages > 0) {
      warnings.push({
        message: `${openDamages} offene Schadensfälle`,
        href: "/schaeden",
      });
    }
    if (pendingMaintenances > 0) {
      warnings.push({
        message: `${pendingMaintenances} fällige Wartung(en)`,
        href: "/produkte",
      });
    }
    if (conflictCount > 0) {
      warnings.push({
        message: "Überfällige Buchungen prüfen",
        href: "/planung",
      });
    }

    return actionSuccess({
      stats: {
        totalProducts,
        availableProducts,
        atCustomer,
        atMesse,
        atDemo,
        inTransit,
        inMaintenance,
        damaged,
        overdueReturns,
        todayCheckouts,
        todayReturns,
        activeBookings,
        openDamages,
        pendingMaintenances,
        monthlyRevenueCents: monthlyRevenue._sum.amountCents ?? 0,
      },
      warnings,
      upcomingCheckouts,
      upcomingReturns,
      recentProducts,
    });
  } catch {
    return actionError("Dashboard-Daten konnten nicht geladen werden");
  }
}
