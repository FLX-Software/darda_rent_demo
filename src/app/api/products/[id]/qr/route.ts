import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  const role = session.user.role as UserRole | undefined;
  if (!role || !hasPermission(role, "products.view")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") || "png";

  const product = await prisma.product.findUnique({
    where: { id },
    select: { qrCode: true, name: true, inventoryNumber: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
  }

  const url = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/qr/${product.qrCode}`;

  if (format === "svg") {
    const svg = await QRCode.toString(url, { type: "svg", margin: 2, width: 300 });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="qr-${product.inventoryNumber}.svg"`,
      },
    });
  }

  const buffer = await QRCode.toBuffer(url, { type: "png", margin: 2, width: 300 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${product.inventoryNumber}.png"`,
    },
  });
}
