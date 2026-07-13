import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
