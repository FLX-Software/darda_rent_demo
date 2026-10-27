"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelBooking } from "@/lib/actions/bookings";

interface DeleteBookingButtonProps {
  bookingId: string;
  bookingNumber: string;
  redirectTo?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
  onDeleted?: () => void;
}

export function DeleteBookingButton({
  bookingId,
  bookingNumber,
  redirectTo = "/buchungen",
  variant = "destructive",
  size = "default",
  className,
  showLabel = true,
  onDeleted,
}: DeleteBookingButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");

    const result = await cancelBooking(bookingId);

    setDeleting(false);

    if (result.success) {
      setOpen(false);
      onDeleted?.();
      router.push(redirectTo);
      router.refresh();
      return;
    }

    setError(result.error ?? "Buchung konnte nicht gelöscht werden");
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Trash2 className={showLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
        {showLabel && "Löschen"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buchung löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Möchten Sie die Buchung{" "}
            <span className="font-semibold text-flx-navy">{bookingNumber}</span> wirklich
            löschen? Sie wird aus der Liste und Planung entfernt.
          </p>
          {error && <p className="text-sm text-status-damage">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Löschen…" : "Löschen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
