import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { buildDamageReportPdf } from "@/lib/damage-pdf";
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
  if (!role || !hasPermission(role, "damages.view")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { id } = await params;

  const report = await prisma.damageReport.findUnique({
    where: { id },
    include: {
      product: true,
      customer: true,
      booking: true,
      reportedBy: true,
      images: true,
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Schadensmeldung nicht gefunden" }, { status: 404 });
  }

  try {
    const pdf = await buildDamageReportPdf(report);
    const filename = `Schadensbericht_${report.damageNumber}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF-Erstellung fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "PDF konnte nicht erstellt werden" },
      { status: 500 }
    );
  }
}
