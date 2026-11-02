import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { buildHandoverProtocolPdf } from "@/lib/handover-pdf";
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
    (!hasPermission(role, "checkout.view") && !hasPermission(role, "bookings.view"))
  ) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { id } = await params;

  const checkOut = await prisma.checkOut.findUnique({
    where: { id },
    include: {
      checkedOutBy: true,
      booking: {
        include: { customer: true },
      },
      items: true,
      conditionReports: {
        include: { images: true },
      },
    },
  });

  if (!checkOut) {
    return NextResponse.json({ error: "Ausgabe nicht gefunden" }, { status: 404 });
  }

  const productIds = checkOut.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  try {
    const pdf = await buildHandoverProtocolPdf({
      checkedOutAt: checkOut.checkedOutAt,
      recipientName: checkOut.recipientName,
      recipientSigned: checkOut.recipientSigned,
      notes: checkOut.notes,
      checkedOutBy: checkOut.checkedOutBy,
      booking: {
        bookingNumber: checkOut.booking.bookingNumber,
        projectName: checkOut.booking.projectName,
        startDate: checkOut.booking.startDate,
        plannedReturnDate: checkOut.booking.plannedReturnDate,
        contactName: checkOut.booking.contactName,
        customer: checkOut.booking.customer,
      },
      items: checkOut.items.map((item) => {
        const product = productMap.get(item.productId);
        return {
          productId: item.productId,
          condition: item.condition,
          serialVerified: item.serialVerified,
          accessoriesChecked: item.accessoriesChecked,
          notes: item.notes,
          product: {
            name: product?.name ?? "Unbekanntes Produkt",
            model: product?.model ?? "—",
            inventoryNumber: product?.inventoryNumber ?? "—",
            serialNumber: product?.serialNumber ?? null,
          },
        };
      }),
      conditionReports: checkOut.conditionReports.map((report) => ({
        productId: report.productId,
        images: report.images.map((image) => ({
          url: image.url,
          caption: image.caption,
        })),
      })),
    });

    const filename = `Uebergabeprotokoll_${checkOut.booking.bookingNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Übergabeprotokoll-PDF fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "PDF konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
