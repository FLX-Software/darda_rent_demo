"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookingStatus } from "@prisma/client";
import { Archive, ArrowRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteBookingButton } from "@/components/bookings/delete-booking-button";
import { advanceBookingStatus, archiveBooking } from "@/lib/actions/bookings";
import { getNextBookingStatus } from "@/lib/booking-status";
import { bookingStatusLabels } from "@/lib/labels";

interface BookingDetailActionsProps {
  bookingId: string;
  bookingNumber: string;
  status: BookingStatus;
  isArchived: boolean;
}

export function BookingDetailActions({
  bookingId,
  bookingNumber,
  status,
  isArchived,
}: BookingDetailActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const nextStatus = getNextBookingStatus(status);

  async function handleAdvance() {
    setLoading(true);
    setError("");
    const result = await advanceBookingStatus(bookingId);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Statuswechsel fehlgeschlagen.");
      return;
    }
    router.refresh();
  }

  async function handleArchive() {
    if (!confirm(`Buchung ${bookingNumber} archivieren?`)) return;
    setLoading(true);
    setError("");
    const result = await archiveBooking(bookingId);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Archivieren fehlgeschlagen.");
      return;
    }
    router.push("/buchungen");
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {nextStatus && !isArchived && (
          <Button variant="default" disabled={loading} onClick={handleAdvance}>
            <ArrowRight className="mr-2 h-4 w-4" />
            {bookingStatusLabels[nextStatus]}
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href={`/buchungen/${bookingId}/bearbeiten`}>
            <Pencil className="mr-2 h-4 w-4" />
            Bearbeiten
          </Link>
        </Button>
        {!isArchived && (
          <Button variant="outline" disabled={loading} onClick={handleArchive}>
            <Archive className="mr-2 h-4 w-4" />
            Archivieren
          </Button>
        )}
        <DeleteBookingButton bookingId={bookingId} bookingNumber={bookingNumber} />
      </div>
      {error && <p className="text-sm text-status-damage">{error}</p>}
    </div>
  );
}
