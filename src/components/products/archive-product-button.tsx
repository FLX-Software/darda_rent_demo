"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveProduct } from "@/lib/actions/products";

export function ArchiveProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleArchive() {
    if (!confirm(`Produkt „${productName}“ archivieren?`)) return;
    setLoading(true);
    const result = await archiveProduct(productId);
    setLoading(false);
    if (!result.success) {
      alert(result.error ?? "Archivieren fehlgeschlagen.");
      return;
    }
    router.push("/produkte");
  }

  return (
    <Button variant="outline" disabled={loading} onClick={handleArchive}>
      <Archive className="mr-2 h-4 w-4" />
      Archivieren
    </Button>
  );
}
