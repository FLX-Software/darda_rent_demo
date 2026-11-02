import { readFile } from "fs/promises";
import path from "path";
import { jsPDF } from "jspdf";
import type { ProductCondition } from "@prisma/client";
import { productConditionLabels } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/utils";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

const DARDA_CYAN: [number, number, number] = [0, 158, 227];
const DARDA_NAVY: [number, number, number] = [10, 22, 40];
const MUTED: [number, number, number] = [100, 110, 120];

export type ReturnPdfData = {
  checkedInAt: Date;
  notes: string | null;
  cleaningCostCents: number;
  repairCostCents: number;
  previousPlannedReturnDate: Date | null;
  planningShortened: boolean;
  checkedInBy: { firstName: string; lastName: string };
  booking: {
    bookingNumber: string;
    projectName: string | null;
    startDate: Date;
    plannedReturnDate: Date;
    contactName: string | null;
    customer: { companyName: string } | null;
  };
  items: {
    productId: string;
    condition: ProductCondition;
    missingAccessories: string | null;
    notes: string | null;
    product: {
      name: string;
      model: string;
      inventoryNumber: string;
      serialNumber: string | null;
    };
  }[];
  conditionReports: {
    productId: string;
    images: { url: string; caption: string | null }[];
  }[];
};

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
      if (ext === ".webp" || ext === ".gif") return null;
      const mime = ext === ".png" ? "image/png" : "image/jpeg";
      const format = ext === ".png" ? "PNG" : "JPEG";
      return {
        dataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
        format,
      };
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      const res = await fetch(url);
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      if (
        !contentType.includes("jpeg") &&
        !contentType.includes("jpg") &&
        !contentType.includes("png")
      ) {
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

async function loadDardaLogo(): Promise<{ dataUrl: string; format: "PNG" } | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "darda-logo.png");
    const buffer = await readFile(filePath);
    return {
      dataUrl: `data:image/png;base64,${buffer.toString("base64")}`,
      format: "PNG",
    };
  } catch {
    return null;
  }
}

export async function buildReturnProtocolPdf(data: ReturnPdfData): Promise<Buffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 18) {
      doc.addPage();
      y = margin;
    }
  };

  const sectionTitle = (title: string) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...DARDA_CYAN);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(...DARDA_CYAN);
    doc.setLineWidth(0.4);
    doc.line(margin, y, margin + 42, y);
    y += 6;
  };

  const writeLabelValue = (label: string, value: string) => {
    ensureSpace(9);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARDA_NAVY);
    const lines = doc.splitTextToSize(value || "—", contentWidth - 52);
    doc.text(lines, margin + 48, y);
    y += Math.max(7, lines.length * 5);
  };

  doc.setDrawColor(...DARDA_CYAN);
  doc.setLineWidth(1.2);
  doc.line(0, 32, pageWidth, 32);

  const logo = await loadDardaLogo();
  if (logo) {
    try {
      doc.addImage(logo.dataUrl, logo.format, margin, 7, 42, 16, undefined, "FAST");
    } catch {
      // ignore
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...DARDA_CYAN);
    doc.text("darda", margin, 16);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...DARDA_NAVY);
  doc.text("Rücknahmeprotokoll", pageWidth - margin, 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Miet- und Demopark · Geräterücknahme", pageWidth - margin, 20, {
    align: "right",
  });
  doc.text(data.booking.bookingNumber, pageWidth - margin, 26, { align: "right" });

  y = 42;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...DARDA_NAVY);
  doc.text("Protokoll der Geräterücknahme", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    `Erstellt am ${formatDateTime(new Date())} · Rücknahme am ${formatDateTime(data.checkedInAt)}`,
    margin,
    y
  );
  y += 10;

  sectionTitle("Buchung & Rücknahme");
  writeLabelValue("Buchung", data.booking.bookingNumber);
  if (data.booking.projectName) writeLabelValue("Projekt", data.booking.projectName);
  writeLabelValue(
    "Kunde",
    data.booking.customer?.companyName ?? data.booking.contactName ?? "—"
  );
  writeLabelValue(
    "Urspr. Mietende",
    data.previousPlannedReturnDate
      ? formatDate(data.previousPlannedReturnDate)
      : formatDate(data.booking.plannedReturnDate)
  );
  writeLabelValue("Tatsächliche Rücknahme", formatDate(data.checkedInAt));
  writeLabelValue(
    "Planung angepasst",
    data.planningShortened
      ? `Ja – Belegung verkürzt bis ${formatDate(data.booking.plannedReturnDate)}`
      : "Nein"
  );
  writeLabelValue(
    "Zurückgenommen von",
    `${data.checkedInBy.firstName} ${data.checkedInBy.lastName}`
  );

  if (data.notes?.trim()) {
    y += 2;
    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("NOTIZEN ZUR RÜCKNAHME", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARDA_NAVY);
    const noteLines = doc.splitTextToSize(data.notes.trim(), contentWidth);
    ensureSpace(noteLines.length * 5 + 4);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 6;
  }

  sectionTitle("Zurückgenommene Produkte");

  for (const item of data.items) {
    ensureSpace(36);
    doc.setFillColor(245, 249, 252);
    doc.roundedRect(margin, y - 4, contentWidth, 28, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...DARDA_NAVY);
    doc.text(`${item.product.name} (${item.product.model})`, margin + 3, y + 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `Seriennr.: ${item.product.inventoryNumber}${
        item.product.serialNumber ? `  ·  SN: ${item.product.serialNumber}` : ""
      }`,
      margin + 3,
      y + 9
    );

    doc.setFontSize(9);
    doc.setTextColor(...DARDA_NAVY);
    const checks = [
      `Zustand: ${productConditionLabels[item.condition] ?? item.condition}`,
      item.missingAccessories ? `Fehlendes Zubehör: ${item.missingAccessories}` : "Zubehör ok",
    ].join("  ·  ");
    doc.text(checks, margin + 3, y + 16, { maxWidth: contentWidth - 6 });

    if (item.notes?.trim()) {
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(item.notes.trim(), margin + 3, y + 22, { maxWidth: contentWidth - 6 });
    }

    y += 32;
  }

  const imagesWithMeta = data.conditionReports.flatMap((report) => {
    const productName =
      data.items.find((item) => item.productId === report.productId)?.product.name ??
      "Produkt";
    return report.images.map((image) => ({
      ...image,
      productName,
    }));
  });

  if (imagesWithMeta.length > 0) {
    sectionTitle("Rücknahmefotos");

    const imgWidth = (contentWidth - 6) / 2;
    const imgHeight = 46;
    let col = 0;

    for (const image of imagesWithMeta) {
      const loaded = await loadImageAsDataUrl(image.url);
      if (!loaded) continue;

      if (col === 0) ensureSpace(imgHeight + 16);

      const x = margin + col * (imgWidth + 6);
      try {
        doc.addImage(loaded.dataUrl, loaded.format, x, y, imgWidth, imgHeight, undefined, "FAST");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(image.caption || image.productName, x, y + imgHeight + 4, {
          maxWidth: imgWidth,
        });
      } catch {
        // skip
      }

      col += 1;
      if (col >= 2) {
        col = 0;
        y += imgHeight + 12;
      }
    }

    if (col !== 0) y += imgHeight + 12;
  }

  ensureSpace(42);
  sectionTitle("Bestätigung");
  const boxW = (contentWidth - 8) / 2;
  const boxH = 28;

  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, boxW, boxH, 1, 1, "S");
  doc.roundedRect(margin + boxW + 8, y, boxW, boxH, 1, 1, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("DARDA / RÜCKNAHME", margin + 3, y + 6);
  doc.text("KUNDE / ÜBERGABE", margin + boxW + 11, y + 6);

  doc.setDrawColor(...DARDA_CYAN);
  doc.setLineWidth(0.35);
  doc.line(margin + 3, y + 20, margin + boxW - 3, y + 20);
  doc.line(margin + boxW + 11, y + 20, margin + 2 * boxW + 5, y + 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    `${data.checkedInBy.firstName} ${data.checkedInBy.lastName}`,
    margin + 3,
    y + 25
  );
  doc.text(
    data.booking.customer?.companyName ?? data.booking.contactName ?? "Name / Unterschrift",
    margin + boxW + 11,
    y + 25
  );

  y += boxH + 10;

  ensureSpace(14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  const disclaimer =
    "Mit diesem Protokoll wird der Zustand der zurückgenommenen Geräte dokumentiert. Bei früherer Rückgabe wird die Belegung in der Planung automatisch verkürzt.";
  doc.text(doc.splitTextToSize(disclaimer, contentWidth), margin, y);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...DARDA_CYAN);
    doc.setLineWidth(0.6);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(
      `Darda GmbH · Demolition Technology · Rücknahmeprotokoll ${data.booking.bookingNumber}`,
      margin,
      pageHeight - 7
    );
    doc.text(`Seite ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 7, {
      align: "right",
    });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
