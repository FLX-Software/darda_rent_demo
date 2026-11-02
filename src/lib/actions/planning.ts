"use server";

import { prisma } from "@/lib/prisma";
import { BookingType, ProductStatus } from "@prisma/client";
import { authorize } from "@/lib/session";
import { updateBookingDates as updateBookingDatesSecure } from "@/lib/actions/bookings";

export interface PlanningProductRow {
  id: string;
  name: string;
  inventoryNumber: string;
  categoryId: string;
  categoryName: string;
  status: ProductStatus;
}

export interface PlanningBookingBar {
  id: string;
  productId: string;
  bookingNumber: string;
  type: BookingType;
  customerName: string | null;
  projectName: string | null;
  startDate: string;
  endDate: string;
  hasConflict?: boolean;
}

export async function getPlanningData(
  startDate: Date,
  endDate: Date,
  filters?: { categoryId?: string; status?: ProductStatus; search?: string }
) {
  const auth = await authorize("planning.view");
  if (!auth.ok) {
    return { products: [], bookings: [] };
  }

  const products = await prisma.product.findMany({
    where: {
      isArchived: false,
      ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { inventoryNumber: { contains: filters.search, mode: "insensitive" } },
              { model: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { category: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    take: 100,
  });

  const productIds = products.map((p) => p.id);

  const bookings = await prisma.booking.findMany({
    where: {
      isArchived: false,
      status: { notIn: ["STORNIERT", "ABGESCHLOSSEN", "ENTWURF"] },
      items: { some: { productId: { in: productIds } } },
      startDate: { lte: endDate },
      plannedReturnDate: { gte: startDate },
    },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  });

  const bars: PlanningBookingBar[] = [];
  for (const booking of bookings) {
    for (const item of booking.items) {
      if (!productIds.includes(item.productId)) continue;
      bars.push({
        id: `${booking.id}-${item.productId}`,
        productId: item.productId,
        bookingNumber: booking.bookingNumber,
        type: booking.type,
        customerName: booking.customer?.companyName ?? booking.contactName,
        projectName: booking.projectName,
        startDate: booking.startDate.toISOString(),
        endDate: booking.plannedReturnDate.toISOString(),
      });
    }
  }

  for (const bar of bars) {
    const barStart = new Date(bar.startDate);
    const barEnd = new Date(bar.endDate);
    bar.hasConflict = bars.some((other) => {
      if (other.id === bar.id || other.productId !== bar.productId) return false;
      const otherStart = new Date(other.startDate);
      const otherEnd = new Date(other.endDate);
      return barStart <= otherEnd && otherStart <= barEnd;
    });
  }

  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      inventoryNumber: p.inventoryNumber,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      status: p.status,
    })),
    bookings: bars,
  };
}

export async function updateBookingDates(
  bookingId: string,
  productId: string,
  startDate: string,
  endDate: string
) {
  const result = await updateBookingDatesSecure(bookingId, productId, startDate, endDate);
  if (!result.success) {
    return { success: false as const, error: result.error ?? "Speichern fehlgeschlagen", conflicts: 0 };
  }
  return {
    success: true as const,
    conflicts: result.data?.conflicts ?? 0,
  };
}

export async function getPlanningCategories() {
  const auth = await authorize("planning.view");
  if (!auth.ok) return [];
  return prisma.productCategory.findMany({ orderBy: { sortOrder: "asc" } });
}
