import { notFound } from "next/navigation";
import { getProduct, getProductCategories } from "@/lib/actions/products";
import { unwrapActionOrNull } from "@/lib/actions/types";
import { CreateProductForm } from "../../neu/create-product-form";

export default async function ProduktBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    unwrapActionOrNull(await getProduct(id)),
    getProductCategories(),
  ]);

  if (!product) notFound();

  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];

  return (
    <CreateProductForm
      mode="edit"
      categories={categories}
      initial={{
        id: product.id,
        name: product.name,
        model: product.model,
        inventoryNumber: product.inventoryNumber,
        categoryId: product.categoryId,
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
