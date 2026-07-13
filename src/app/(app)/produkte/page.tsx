import { getProducts, getProductCategories } from "@/lib/actions/products";
import { unwrapAction } from "@/lib/actions/types";
import { ProductsList } from "./products-list";

export default async function ProduktePage() {
  const products = unwrapAction(await getProducts(), []);
  const categories = await getProductCategories();

  return <ProductsList products={products} categories={categories} />;
}
