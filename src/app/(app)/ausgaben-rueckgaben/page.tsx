import { getBookingsForCheckout } from "@/lib/actions/bookings";
import { CheckoutWizard } from "./checkout-wizard";

export default async function AusgabenRueckgabenPage() {
  const bookings = await getBookingsForCheckout();
  return <CheckoutWizard bookings={bookings} />;
}
