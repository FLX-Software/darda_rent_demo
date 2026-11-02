import { getProductCategories } from "@/lib/actions/products";
import { CreateProductForm } from "./create-product-form";

export default async function NeuesProduktPage() {
  const categories = await getProductCategories();
  return <CreateProductForm categories={categories} />;
}
