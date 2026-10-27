import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/actions/customers";
import { unwrapActionOrNull } from "@/lib/actions/types";
import { CustomerForm } from "../../customer-form";

export default async function KundeBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = unwrapActionOrNull(await getCustomer(id));
  if (!customer) notFound();

  return (
    <CustomerForm
      mode="edit"
      initial={{
        id: customer.id,
        customerNumber: customer.customerNumber,
        companyName: customer.companyName,
        billingStreet: customer.billingStreet,
        billingCity: customer.billingCity,
        billingZip: customer.billingZip,
        billingCountry: customer.billingCountry,
        industry: customer.industry,
        email: customer.email,
        phone: customer.phone,
        paymentTerms: customer.paymentTerms,
        discountPercent: Number(customer.discountPercent),
        notes: customer.notes,
        isActive: customer.isActive,
      }}
    />
  );
}
