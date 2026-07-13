import { getCustomers } from "@/lib/actions/customers";
import { unwrapAction } from "@/lib/actions/types";
import { CustomersList } from "./customers-list";

export default async function KundenPage() {
  const customers = unwrapAction(await getCustomers(), []);
  return <CustomersList customers={customers} />;
}
