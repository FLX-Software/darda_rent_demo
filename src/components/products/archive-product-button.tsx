"use client";

import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { deleteProduct } from "@/lib/actions/products";

export function ArchiveProductButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  return (
    <ConfirmDeleteButton
      entityLabel="Produkt"
      entityName={productName}
      description={
        <>
          Möchten Sie das Produkt{" "}
          <span className="font-semibold text-flx-navy">{productName}</span> wirklich löschen? Bei
          vorhandenen Buchungen oder Schäden wird es nur aus dem aktiven Bestand entfernt.
        </>
      }
      onDelete={() => deleteProduct(productId)}
      redirectTo="/produkte"
    />
  );
}
