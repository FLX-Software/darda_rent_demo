import { readFile } from "fs/promises";
import path from "path";
import { jsPDF } from "jspdf";
import type {
  DamageCategory,
  DamageSeverity,
  DamageStatus,
} from "@prisma/client";
import {
  damageCategoryLabels,
  damageSeverityLabels,
  damageStatusLabels,
} from "@/lib/labels";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export type DamagePdfData = {
  damageNumber: string;
  category: DamageCategory;
  severity: DamageSeverity;
  status: DamageStatus;
  affectedPart: string | null;
  description: string;
  notes: string | null;
  repairRequired: boolean;
  stillUsable: boolean;
  isInsuranceCase: boolean;
  responsibility: string | null;
  estimatedCostCents: number | null;
  actualCostCents: number | null;
  customerChargeCents: number | null;
  reportedAt: Date;
  product: {
    name: string;
    inventoryNumber: string;
  };
  customer: { companyName: string } | null;
  booking: { bookingNumber: string; projectName: string | null } | null;
  reportedBy: { firstName: string; lastName: string };
  images: { url: string; caption: string | null }[];
};

function formatEuro(cents: number | null) {
  return cents != null ? formatCurrency(cents) : "—";
}

async function loadImageAsDataUrl(
  url: string
): Promise<{ dataUrl: string; format: "JPEG" | "PNG" } | null> {
  try {
    if (url.startsWith("/api/uploads/")) {
      const relative = url.replace("/api/uploads/", "");
      const [folder, ...rest] = relative.split("/");
      const filename = rest.join("/");
      if (!folder || !filename || !/^[\w-]+$/.test(folder) || filename.includes("..")) {
        return null;
      }
      const filePath = path.join(process.cwd(), UPLOAD_DIR, folder, filename);
      const buffer = await readFile(filePath);
      const ext = path.extname(filename).toLowerCase();
      const mime =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";
      const format = ext === ".png" ? "PNG" : "JPEG";
      // jsPDF reliably supports JPEG/PNG; skip webp
      if (ext === ".webp" || ext === ".gif") return null;
      return {
        dataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
        format,
      };
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      const res = await fetch(url);
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      if (!contentType.includes("jpeg") && !contentType.includes("jpg") && !contentType.includes("png")) {
        return null;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const format = contentType.includes("png") ? "PNG" : "JPEG";
      return {
        dataUrl: `data:${contentType};base64,${buffer.toString("base64")}`,
        format,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function buildDamageReportPdf(report: DamagePdfData): Promise<Buffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeLabelValue = (label: string, value: string) => {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20);
    const lines = doc.splitTextToSize(value || "—", contentWidth - 50);
    doc.text(lines, margin + 48, y);
    y += Math.max(7, lines.length * 5);
  };

  // Header
  doc.setFillColor(10, 22, 40);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Darda GmbH · FLX Software", margin, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Miet- und Demopark · Schadensbericht", margin, 19);
  doc.setFontSize(10);
  doc.text(report.damageNumber, pageWidth - margin, 12, { align: "right" });
  doc.setFontSize(8);
  doc.text(`Erstellt am ${formatDateTime(new Date())}`, pageWidth - margin, 19, {
    align: "right",
  });

  y = 38;

  doc.setTextColor(10, 22, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Schadensbericht ${report.damageNumber}`, margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(damageCategoryLabels[report.category], margin, y);
  y += 10;

  doc.setDrawColor(230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setTextColor(10, 22, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Schadensdetails", margin, y);
  y += 7;

  writeLabelValue("Produkt", `${report.product.name} (${report.product.inventoryNumber})`);
  if (report.customer) writeLabelValue("Kunde", report.customer.companyName);
  if (report.booking) {
    writeLabelValue(
      "Buchung",
      `${report.booking.bookingNumber}${
        report.booking.projectName ? ` · ${report.booking.projectName}` : ""
      }`
    );
  }
  writeLabelValue("Status", damageStatusLabels[report.status]);
  writeLabelValue("Schweregrad", damageSeverityLabels[report.severity]);
  writeLabelValue("Bauteil", report.affectedPart ?? "—");
  writeLabelValue(
    "Gemeldet von",
    `${report.reportedBy.firstName} ${report.reportedBy.lastName} am ${formatDateTime(report.reportedAt)}`
  );

  y += 2;
  ensureSpace(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Beschreibung", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20);
  const descLines = doc.splitTextToSize(report.description || "—", contentWidth);
  ensureSpace(descLines.length * 5 + 4);
  doc.text(descLines, margin, y);
  y += descLines.length * 5 + 6;

  ensureSpace(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 22, 40);
  doc.text("Kosten & Abwicklung", margin, y);
  y += 7;

  writeLabelValue("Geschätzte Kosten", formatEuro(report.estimatedCostCents));
  writeLabelValue("Tatsächliche Kosten", formatEuro(report.actualCostCents));
  writeLabelValue("Kundenbelastung", formatEuro(report.customerChargeCents));
  writeLabelValue("Reparatur erforderlich", report.repairRequired ? "Ja" : "Nein");
  writeLabelValue("Weiter nutzbar", report.stillUsable ? "Ja" : "Nein");
  writeLabelValue("Versicherungsfall", report.isInsuranceCase ? "Ja" : "Nein");
  if (report.responsibility) writeLabelValue("Verantwortung", report.responsibility);

  if (report.notes?.trim()) {
    y += 2;
    ensureSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(10, 22, 40);
    doc.text("Schadensbericht", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20);
    const noteLines = doc.splitTextToSize(report.notes.trim(), contentWidth);
    ensureSpace(noteLines.length * 5 + 4);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 8;
  }

  if (report.images.length > 0) {
    ensureSpace(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(10, 22, 40);
    doc.text("Schadensbilder", margin, y);
    y += 6;

    const imgWidth = (contentWidth - 6) / 2;
    const imgHeight = 48;
    let col = 0;

    for (const image of report.images) {
      const loaded = await loadImageAsDataUrl(image.url);
      if (!loaded) continue;

      if (col === 0) ensureSpace(imgHeight + 14);

      const x = margin + col * (imgWidth + 6);
      try {
        doc.addImage(loaded.dataUrl, loaded.format, x, y, imgWidth, imgHeight, undefined, "FAST");
        if (image.caption) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100);
          doc.text(image.caption, x, y + imgHeight + 4, { maxWidth: imgWidth });
        }
      } catch {
        // skip broken images
      }

      col += 1;
      if (col >= 2) {
        col = 0;
        y += imgHeight + 10;
      }
    }

    if (col !== 0) y += imgHeight + 10;
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Schadensbericht ${report.damageNumber} · Seite ${i} / ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
