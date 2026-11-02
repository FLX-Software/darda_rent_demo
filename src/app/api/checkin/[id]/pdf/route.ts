import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { buildReturnProtocolPdf } from "@/lib/return-pdf";
import type { UserRole } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const role = session.user.role as UserRole | undefined;
  if (
    !role ||
    (!hasPermission(role, "checkin.view") && !hasPermission(role, "bookings.view"))
  ) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { id } = await params;

  const checkIn = await prisma.checkIn.findUnique({
    where: { id },
    include: {
      checkedInBy: true,
      booking: { include: { customer: true } },
      items: true,
      conditionReports: { include: { images: true } },
    },
  });

  if (!checkIn) {
    return NextResponse.json({ error: "Rücknahme nicht gefunden" }, { status: 404 });
  }

  const products = await prisma.product.findMany({
    where: { id: { in: checkIn.items.map((item) => item.productId) } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const audit = await prisma.auditLog.findFirst({
    where: {
      entityType: "Booking",
      entityId: checkIn.bookingId,
      action: "STATUS_CHANGE",
    },
    orderBy: { createdAt: "desc" },
  });

  const oldValue = (audit?.oldValue ?? null) as {
    plannedReturnDate?: string;
  } | null;
  const newValue = (audit?.newValue ?? null) as {
    checkInId?: string;
    planningShortened?: boolean;
  } | null;

  const matched = newValue?.checkInId === checkIn.id;
  const previousPlanned = matched && oldValue?.plannedReturnDate
    ? new Date(oldValue.plannedReturnDate)
    : null;

  try {
    const pdf = await buildReturnProtocolPdf({
      checkedInAt: checkIn.checkedInAt,
      notes: checkIn.notes,
      cleaningCostCents: checkIn.cleaningCostCents,
      repairCostCents: checkIn.repairCostCents,
      previousPlannedReturnDate: previousPlanned,
      planningShortened: Boolean(matched && newValue?.planningShortened),
      checkedInBy: checkIn.checkedInBy,
      booking: {
        bookingNumber: checkIn.booking.bookingNumber,
        projectName: checkIn.booking.projectName,
        startDate: checkIn.booking.startDate,
        plannedReturnDate: checkIn.booking.plannedReturnDate,
        contactName: checkIn.booking.contactName,
        customer: checkIn.booking.customer,
      },
      items: checkIn.items.map((item) => {
        const product = productMap.get(item.productId);
        return {
          productId: item.productId,
          condition: item.condition,
          missingAccessories: item.missingAccessories,
          notes: item.notes,
          product: {
            name: product?.name ?? "Unbekanntes Produkt",
            model: product?.model ?? "—",
            inventoryNumber: product?.inventoryNumber ?? "—",
            serialNumber: product?.serialNumber ?? null,
          },
        };
      }),
      conditionReports: checkIn.conditionReports.map((report) => ({
        productId: report.productId,
        images: report.images.map((image) => ({
          url: image.url,
          caption: image.caption,
        })),
      })),
    });

    const filename = `Ruecknahmeprotokoll_${checkIn.booking.bookingNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Rücknahmeprotokoll-PDF fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "PDF konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
