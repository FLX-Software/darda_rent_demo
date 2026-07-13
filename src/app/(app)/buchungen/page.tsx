import { getBookings } from "@/lib/actions/bookings";
import { unwrapAction } from "@/lib/actions/types";
import { BookingsList } from "./bookings-list";

export default async function BuchungenPage() {
  const bookings = unwrapAction(await getBookings(), []);
  return <BookingsList bookings={bookings} />;
}
