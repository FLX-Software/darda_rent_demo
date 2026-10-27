import { BookingStatus } from "@prisma/client";

export const BOOKING_STATUS_FLOW: Partial<Record<BookingStatus, BookingStatus>> = {
  ENTWURF: "BESTAETIGT",
  ANFRAGE: "BESTAETIGT",
  VORGEMERKT: "BESTAETIGT",
  BESTAETIGT: "IN_VORBEREITUNG",
  IN_VORBEREITUNG: "ABHOLBEREIT",
  ZURUECKGEGEBEN: "ABGESCHLOSSEN",
  IN_PRUEFUNG: "ABGESCHLOSSEN",
};

export function getNextBookingStatus(status: BookingStatus): BookingStatus | null {
  return BOOKING_STATUS_FLOW[status] ?? null;
}
