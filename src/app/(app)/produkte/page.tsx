import { getProducts, getProductCategories } from "@/lib/actions/products";
import { unwrapAction } from "@/lib/actions/types";
import { ProductsList } from "./products-list";

export default async function ProduktePage() {
  const products = unwrapAction(await getProducts(), []);
  const categories = await getProductCategories();

  return (
    <ProductsList
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        model: p.model,
        inventoryNumber: p.inventoryNumber,
        dailyRateCents: p.dailyRateCents,
        displayBookingType: p.displayBookingType,
        category: { id: p.category.id, name: p.category.name },
        location: p.location ? { name: p.location.name } : null,
      }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
