import { getCustomers } from "@/lib/actions/customers";
import { unwrapAction } from "@/lib/actions/types";
import { CustomersList } from "./customers-list";

export default async function KundenPage() {
  const customers = unwrapAction(await getCustomers(), []);
  return (
    <CustomersList
      customers={customers.map((c) => ({
        id: c.id,
        customerNumber: c.customerNumber,
        companyName: c.companyName,
        billingCity: c.billingCity,
        email: c.email,
        phone: c.phone,
        _count: { bookings: c._count.bookings },
      }))}
    />
  );
}
