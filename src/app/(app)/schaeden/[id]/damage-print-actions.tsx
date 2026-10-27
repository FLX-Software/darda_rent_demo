"use client";

import { useState } from "react";
import { Download, Mail, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DamagePrintActions({
  damageId,
  damageNumber,
}: {
  damageId: string;
  damageNumber: string;
}) {
  const [loading, setLoading] = useState<"pdf" | "email" | null>(null);
  const [error, setError] = useState("");

  async function fetchPdfBlob() {
    const response = await fetch(`/api/schaeden/${damageId}/pdf`);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error ?? "PDF konnte nicht erstellt werden");
    }
    return response.blob();
  }

  function downloadBlob(blob: Blob) {
    const filename = `Schadensbericht_${damageNumber}.pdf`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPdf() {
    setLoading("pdf");
    setError("");
    try {
      const blob = await fetchPdfBlob();
      downloadBlob(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF-Download fehlgeschlagen");
    } finally {
      setLoading(null);
    }
  }

  async function handleEmail() {
    setLoading("email");
    setError("");
    try {
      const blob = await fetchPdfBlob();
      const filename = `Schadensbericht_${damageNumber}.pdf`;
      const file = new File([blob], filename, { type: "application/pdf" });

      const canShareFiles =
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (canShareFiles && typeof navigator.share === "function") {
        await navigator.share({
          files: [file],
          title: `Schadensbericht ${damageNumber}`,
          text: `Schadensbericht ${damageNumber} aus FLX Software`,
        });
        return;
      }

      downloadBlob(blob);
      const subject = encodeURIComponent(`Schadensbericht ${damageNumber}`);
      const body = encodeURIComponent(
        `Guten Tag,\n\nanbei der Schadensbericht ${damageNumber}.\n\nDie PDF-Datei „${filename}“ wurde heruntergeladen – bitte als Anhang an diese E-Mail anfügen.\n\nMit freundlichen Grüßen`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "E-Mail-Versand fehlgeschlagen");
    } finally {
      setLoading(null);
    }
  }

  function handlePrint() {
    const previousTitle = document.title;
    document.title = `Schadensbericht_${damageNumber}`;
    window.print();
    document.title = previousTitle;
  }

  return (
    <div className="flex flex-col items-end gap-1 print:hidden">
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Drucken
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleDownloadPdf}
          disabled={loading !== null}
        >
          <Download className="mr-2 h-4 w-4" />
          {loading === "pdf" ? "PDF wird erstellt…" : "Als PDF speichern"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleEmail}
          disabled={loading !== null}
        >
          <Mail className="mr-2 h-4 w-4" />
          {loading === "email" ? "Wird vorbereitet…" : "Per E-Mail senden"}
        </Button>
      </div>
      {error && <p className="text-sm text-status-damage">{error}</p>}
    </div>
  );
}
