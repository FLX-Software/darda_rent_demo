import { notFound } from "next/navigation";
import { getBooking } from "@/lib/actions/bookings";
import { getProducts } from "@/lib/actions/products";
import { getCustomers } from "@/lib/actions/customers";
import { unwrapAction, unwrapActionOrNull } from "@/lib/actions/types";
import { CreateBookingForm } from "../../neu/create-booking-form";

export default async function BookingBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = unwrapActionOrNull(await getBooking(id));
  if (!booking) notFound();

  const products = unwrapAction(await getProducts(), []);
  const customers = unwrapAction(await getCustomers(), []);

  return (
    <CreateBookingForm
      mode="edit"
      initial={{
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        type: booking.type,
        status: booking.status,
        customerId: booking.customerId,
        contactName: booking.contactName,
        projectName: booking.projectName,
        startDate: booking.startDate,
        plannedReturnDate: booking.plannedReturnDate,
        shipmentMethod: booking.shipmentMethod,
        notes: booking.notes,
        productIds: booking.items.map((item) => item.productId),
      }}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        inventoryNumber: p.inventoryNumber,
        status: p.status,
      }))}
      customers={customers.map((c) => ({
        id: c.id,
        companyName: c.companyName,
        customerNumber: c.customerNumber,
      }))}
    />
  );
}
