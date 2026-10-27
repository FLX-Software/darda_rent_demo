import { notFound } from "next/navigation";
import {
  getProduct,
  getProductCategories,
  getLocations,
} from "@/lib/actions/products";
import { unwrapActionOrNull } from "@/lib/actions/types";
import { CreateProductForm } from "../../neu/create-product-form";

export default async function ProduktBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, locations] = await Promise.all([
    unwrapActionOrNull(await getProduct(id)),
    getProductCategories(),
    getLocations(),
  ]);

  if (!product) notFound();

  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];

  return (
    <CreateProductForm
      mode="edit"
      categories={categories}
      locations={locations}
      initial={{
        id: product.id,
        name: product.name,
        model: product.model,
        inventoryNumber: product.inventoryNumber,
        serialNumber: product.serialNumber,
        categoryId: product.categoryId,
        locationId: product.locationId,
        condition: product.condition,
        dailyRateCents: product.dailyRateCents,
        yearBuilt: product.yearBuilt,
        weightKg: product.weightKg != null ? Number(product.weightKg) : null,
        dimensions: product.dimensions,
        description: product.description,
        imageUrl: primaryImage?.url ?? null,
      }}
    />
  );
}
