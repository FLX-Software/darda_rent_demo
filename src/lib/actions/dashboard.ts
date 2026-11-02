"use server";

import { addDays, endOfDay, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { serializeForClient } from "@/lib/utils";
import { actionError, actionSuccess } from "./types";

/** Wie in der Planung: Entwurf/Storno/abgeschlossen ausblenden */
const PLANNING_EXCLUDED: BookingStatus[] = [
  "ENTWURF",
  "STORNIERT",
  "ABGESCHLOSSEN",
];

export async function getDashboardStats() {
  try {
    await requireAuth();

    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const weekEnd = endOfDay(addDays(today, 6)); // heute + 6 Tage = 7-Tage-Fenster
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const dayEnd = endOfDay(today);

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
      pendingMaintenances,
      monthlyRevenue,
      upcomingCheckouts,
      upcomingReturns,
      recentProducts,
      conflictCount,
    ] = await Promise.all([
      prisma.product.count({ where: { isArchived: false } }),
      // Verfügbar = kein laufender Einsatz heute (wie in der Planung)
      prisma.product.count({
        where: {
          isArchived: false,
          bookingItems: {
            none: {
              booking: {
                isArchived: false,
                status: { notIn: PLANNING_EXCLUDED },
                startDate: { lte: dayEnd },
                plannedReturnDate: { gte: today },
              },
            },
          },
        },
      }),
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
          status: { notIn: PLANNING_EXCLUDED },
          startDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.booking.count({
        where: {
          isArchived: false,
          status: { notIn: PLANNING_EXCLUDED },
          plannedReturnDate: { gte: today, lt: tomorrow },
        },
      }),
      // Aktive Buchungen = läuft heute ODER startet in den nächsten 7 Tagen (wie Planung)
      prisma.booking.count({
        where: {
          isArchived: false,
          status: { notIn: PLANNING_EXCLUDED },
          OR: [
            {
              startDate: { lte: dayEnd },
              plannedReturnDate: { gte: today },
            },
            {
              startDate: { gte: today, lte: weekEnd },
            },
          ],
        },
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
          status: { notIn: PLANNING_EXCLUDED },
          startDate: { gte: today, lte: weekEnd },
        },
        select: {
          id: true,
          bookingNumber: true,
          type: true,
          status: true,
          startDate: true,
          projectName: true,
          contactName: true,
          customer: { select: { companyName: true } },
        },
        orderBy: { startDate: "asc" },
        take: 15,
      }),
      prisma.booking.findMany({
        where: {
          isArchived: false,
          status: { notIn: PLANNING_EXCLUDED },
          plannedReturnDate: { gte: today, lte: weekEnd },
        },
        select: {
          id: true,
          bookingNumber: true,
          type: true,
          status: true,
          plannedReturnDate: true,
          projectName: true,
          contactName: true,
          customer: { select: { companyName: true } },
        },
        orderBy: { plannedReturnDate: "asc" },
        take: 15,
      }),
      prisma.product.findMany({
        where: { isArchived: false },
        select: {
          id: true,
          name: true,
          inventoryNumber: true,
          status: true,
          dailyRateCents: true,
          category: { select: { name: true } },
        },
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

    return actionSuccess(
      serializeForClient({
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
          pendingMaintenances,
          monthlyRevenueCents: monthlyRevenue._sum.amountCents ?? 0,
        },
        warnings,
        upcomingCheckouts,
        upcomingReturns,
        recentProducts,
      })
    );
  } catch {
    return actionError("Dashboard-Daten konnten nicht geladen werden");
  }
}
