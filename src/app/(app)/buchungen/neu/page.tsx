import { getProducts } from "@/lib/actions/products";
import { getCustomers } from "@/lib/actions/customers";
import { unwrapAction } from "@/lib/actions/types";
import { CreateBookingForm } from "./create-booking-form";

export default async function NeueBuchungPage() {
  const products = unwrapAction(await getProducts(), []);
  const customers = unwrapAction(await getCustomers(), []);
  return (
    <CreateBookingForm
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
