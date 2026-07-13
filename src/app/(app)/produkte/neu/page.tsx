import { getProductCategories, getLocations } from "@/lib/actions/products";
import { CreateProductForm } from "./create-product-form";

export default async function NeuesProduktPage() {
  const [categories, locations] = await Promise.all([getProductCategories(), getLocations()]);
  return <CreateProductForm categories={categories} locations={locations} />;
}
