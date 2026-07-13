import { getProducts } from "@/lib/actions/products";
import { unwrapAction } from "@/lib/actions/types";
import CreateDamageForm from "./create-damage-form";

export default async function NeuerSchadenPageWrapper() {
  const products = unwrapAction(await getProducts(), []);
  return (
    <CreateDamageForm
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        inventoryNumber: p.inventoryNumber,
      }))}
    />
  );
}
