"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ProductCondition, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { authorize } from "@/lib/session";
import { StorageError } from "@/lib/storage";
import { generateQrCodeValue, serializeForClient, toPlainNumber } from "@/lib/utils";
import { saveFile } from "@/lib/storage";
import { resolveProductDisplayBookingType, visibleProductBookingTypes } from "@/lib/labels";
import { actionError, actionSuccess, getValidationError } from "./types";

const productFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  locationId: z.string().optional(),
  includeArchived: z.boolean().optional(),
});

const createProductSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  model: z.string().min(1, "Artikelnummer ist erforderlich"),
  categoryId: z.string().min(1, "Kategorie ist erforderlich"),
  manufacturer: z.string().optional(),
  inventoryNumber: z.string().min(1, "Seriennummer ist erforderlich"),
  serialNumber: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  weightKg: z.number().positive().optional(),
  dimensions: z.string().optional(),
  yearBuilt: z.number().int().optional(),
  purchaseDate: z.coerce.date().optional(),
  purchaseValueCents: z.number().int().min(0).optional(),
  replacementValueCents: z.number().int().min(0).optional(),
  dailyRateCents: z.number().int().min(0).default(0),
  weeklyRateCents: z.number().int().min(0).optional(),
  internalCostCents: z.number().int().min(0).optional(),
  depositCents: z.number().int().min(0).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  condition: z.nativeEnum(ProductCondition).optional(),
  locationId: z.string().optional(),
  notes: z.string().optional(),
});

function resolveSerialNumber(inventoryNumber: string, serialNumber?: string | null) {
  const trimmed = serialNumber?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : `SN-${inventoryNumber}`;
}

const updateProductSchema = createProductSchema.partial();

export async function getProducts(filters?: z.infer<typeof productFiltersSchema>) {
  try {
    const auth = await authorize("products.view");
    if (!auth.ok) return actionError(auth.error);

    const parsed = filters ? productFiltersSchema.safeParse(filters) : { success: true as const, data: {} };
    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const { search, categoryId, status, locationId, includeArchived } = parsed.data;
    const now = new Date();

    const products = await prisma.product.findMany({
      where: {
        ...(includeArchived ? {} : { isArchived: false }),
        ...(categoryId ? { categoryId } : {}),
        ...(status ? { status } : {}),
        ...(locationId ? { locationId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { model: { contains: search, mode: "insensitive" } },
                { inventoryNumber: { contains: search, mode: "insensitive" } },
                { serialNumber: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        location: true,
        images: { orderBy: { sortOrder: "asc" } },
        bookingItems: {
          where: {
            booking: {
              isArchived: false,
              status: { notIn: ["STORNIERT", "ABGESCHLOSSEN", "ENTWURF"] },
              startDate: { lte: now },
              plannedReturnDate: { gte: now },
              type: { in: visibleProductBookingTypes },
            },
          },
          select: {
            booking: { select: { type: true } },
          },
          orderBy: { booking: { startDate: "desc" } },
          take: 1,
        },
      },
      orderBy: [{ name: "asc" }, { inventoryNumber: "asc" }],
    });

    const productsWithDisplayType = products.map(({ bookingItems, ...product }) => ({
      ...product,
      weightKg: toPlainNumber(product.weightKg),
      displayBookingType: resolveProductDisplayBookingType(
        product.status,
        bookingItems[0]?.booking.type ?? null
      ),
    }));

    return actionSuccess(serializeForClient(productsWithDisplayType));
  } catch {
    return actionError("Produkte konnten nicht geladen werden");
  }
}

export async function getProduct(id: string) {
  try {
    const auth = await authorize("products.view");
    if (!auth.ok) return actionError(auth.error);

    if (!id) {
      return actionError("Produkt-ID ist erforderlich");
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        location: true,
        images: { orderBy: { sortOrder: "asc" } },
        documents: true,
        accessories: { include: { accessory: true } },
        statusHistory: { orderBy: { changedAt: "desc" }, take: 10 },
        maintenanceRecords: { orderBy: { nextDate: "asc" }, take: 5 },
      },
    });

    if (!product) {
      return actionError("Produkt nicht gefunden");
    }

    return actionSuccess(
      serializeForClient({
        ...product,
        weightKg: toPlainNumber(product.weightKg),
      })
    );
  } catch {
    return actionError("Produkt konnte nicht geladen werden");
  }
}

export async function createProduct(input: z.infer<typeof createProductSchema>) {
  try {
    const auth = await authorize("products.create");
    if (!auth.ok) return actionError(auth.error);
    const user = auth.user;
    const parsed = createProductSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;
    const serialNumber = resolveSerialNumber(data.inventoryNumber, data.serialNumber);

    const existing = await prisma.product.findFirst({
      where: {
        OR: [{ inventoryNumber: data.inventoryNumber }, { serialNumber }],
      },
    });

    if (existing) {
      return actionError("Seriennummer bereits vergeben");
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        serialNumber,
        locationId: data.locationId ?? null,
        qrCode: generateQrCodeValue(data.inventoryNumber),
        manufacturer: data.manufacturer ?? "Darda GmbH",
      },
      include: { category: true, location: true },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entityType: "Product",
      entityId: product.id,
      newValue: product,
    });

    revalidatePath("/produkte");
    return actionSuccess(serializeForClient({ ...product, weightKg: toPlainNumber(product.weightKg) }));
  } catch {
    return actionError("Produkt konnte nicht erstellt werden");
  }
}

export async function createProductFromForm(formData: FormData) {
  try {
    const auth = await authorize("products.create");
    if (!auth.ok) return actionError(auth.error);
    const user = auth.user;

    const dailyRate = parseFloat(formData.get("dailyRate")?.toString() ?? "0");
    const weightRaw = formData.get("weightKg")?.toString().trim();
    const yearRaw = formData.get("yearBuilt")?.toString().trim();
    const dimensionsRaw = formData.get("dimensions")?.toString().trim();

    const weightKg = weightRaw ? Number.parseFloat(weightRaw.replace(",", ".")) : undefined;
    const yearBuilt = yearRaw ? Number.parseInt(yearRaw, 10) : undefined;

    const inventoryNumber = formData.get("inventoryNumber")?.toString() ?? "";
    const input = {
      name: formData.get("name")?.toString() ?? "",
      model: formData.get("model")?.toString() ?? "",
      categoryId: formData.get("categoryId")?.toString() ?? "",
      inventoryNumber,
      serialNumber: resolveSerialNumber(inventoryNumber),
      dailyRateCents: Math.round(dailyRate * 100),
      description: formData.get("description")?.toString() || undefined,
      condition: (formData.get("condition")?.toString() as ProductCondition) || undefined,
      weightKg: Number.isFinite(weightKg) && (weightKg as number) > 0 ? weightKg : undefined,
      yearBuilt: Number.isFinite(yearBuilt) ? yearBuilt : undefined,
      dimensions: dimensionsRaw || undefined,
    };

    const parsed = createProductSchema.safeParse(input);
    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;
    const serialNumber = resolveSerialNumber(data.inventoryNumber, data.serialNumber);

    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { inventoryNumber: data.inventoryNumber },
          { serialNumber },
        ],
      },
    });

    if (existing) {
      return actionError("Seriennummer bereits vergeben");
    }

    const product = await prisma.product.create({
      data: {
        ...data,
        serialNumber,
        locationId: null,
        qrCode: generateQrCodeValue(data.inventoryNumber),
        manufacturer: data.manufacturer ?? "Darda GmbH",
      },
      include: { category: true, location: true },
    });

    const imageFile = formData.get("image");
    if (imageFile && imageFile instanceof File && imageFile.size > 0) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(imageFile.type)) {
        return actionError("Nur JPG, PNG, WebP oder GIF erlaubt");
      }
      if (imageFile.size > 10 * 1024 * 1024) {
        return actionError("Bild darf maximal 10 MB groß sein");
      }

      const { url } = await saveFile(imageFile, "products");
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url,
          isPrimary: true,
          sortOrder: 0,
          caption: product.name,
        },
      });
    }

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entityType: "Product",
      entityId: product.id,
      newValue: product,
    });

    revalidatePath("/produkte");
    revalidatePath(`/produkte/${product.id}`);
    return actionSuccess(serializeForClient({ ...product, weightKg: toPlainNumber(product.weightKg) }));
  } catch (error) {
    if (error instanceof StorageError) return actionError(error.message);
    return actionError("Produkt konnte nicht erstellt werden");
  }
}

function parseOptionalWeightKg(raw: string | undefined): number | null | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseOptionalYearBuilt(raw: string | undefined): number | null | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number.parseInt(trimmed, 10);
  return Number.isFinite(value) ? value : null;
}

async function savePrimaryProductImage(productId: string, imageFile: File, caption?: string) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(imageFile.type)) {
    return actionError("Nur JPG, PNG, WebP oder GIF erlaubt");
  }
  if (imageFile.size > 10 * 1024 * 1024) {
    return actionError("Bild darf maximal 10 MB groß sein");
  }

  const { url } = await saveFile(imageFile, "products");
  await prisma.productImage.updateMany({
    where: { productId },
    data: { isPrimary: false },
  });
  const imageCount = await prisma.productImage.count({ where: { productId } });
  await prisma.productImage.create({
    data: {
      productId,
      url,
      isPrimary: true,
      sortOrder: imageCount,
      caption,
    },
  });
  return actionSuccess(true);
}

export async function updateProduct(id: string, input: z.infer<typeof updateProductSchema>) {
  try {
    const auth = await authorize("products.edit");
    if (!auth.ok) return actionError(auth.error);
    const user = auth.user;
    const parsed = updateProductSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    if (!id) {
      return actionError("Produkt-ID ist erforderlich");
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return actionError("Produkt nicht gefunden");
    }

    if (parsed.data.inventoryNumber || parsed.data.serialNumber) {
      const duplicate = await prisma.product.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(parsed.data.inventoryNumber
              ? [{ inventoryNumber: parsed.data.inventoryNumber }]
              : []),
            ...(parsed.data.serialNumber
              ? [{ serialNumber: parsed.data.serialNumber }]
              : []),
          ],
        },
      });

      if (duplicate) {
        return actionError("Seriennummer bereits vergeben");
      }
    }

    const updateData: z.infer<typeof updateProductSchema> & { qrCode?: string } = {
      ...parsed.data,
    };
    if (updateData.inventoryNumber) {
      updateData.qrCode = generateQrCodeValue(updateData.inventoryNumber);
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true, location: true, images: true },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entityType: "Product",
      entityId: product.id,
      oldValue: existing,
      newValue: product,
    });

    revalidatePath("/produkte");
    revalidatePath(`/produkte/${id}`);
    return actionSuccess(serializeForClient({ ...product, weightKg: toPlainNumber(product.weightKg) }));
  } catch {
    return actionError("Produkt konnte nicht aktualisiert werden");
  }
}

export async function updateProductFromForm(id: string, formData: FormData) {
  try {
    const auth = await authorize("products.edit");
    if (!auth.ok) return actionError(auth.error);
    const user = auth.user;

    if (!id) {
      return actionError("Produkt-ID ist erforderlich");
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return actionError("Produkt nicht gefunden");
    }

    const dailyRate = parseFloat(formData.get("dailyRate")?.toString() ?? "0");
    const weightKg = parseOptionalWeightKg(formData.get("weightKg")?.toString());
    const yearBuilt = parseOptionalYearBuilt(formData.get("yearBuilt")?.toString());
    const dimensionsRaw = formData.get("dimensions")?.toString().trim() ?? "";
    const descriptionRaw = formData.get("description")?.toString().trim() ?? "";
    const inventoryNumber = formData.get("inventoryNumber")?.toString() ?? "";
    const input = {
      name: formData.get("name")?.toString() ?? "",
      model: formData.get("model")?.toString() ?? "",
      categoryId: formData.get("categoryId")?.toString() ?? "",
      inventoryNumber,
      serialNumber: existing.serialNumber,
      dailyRateCents: Math.round(dailyRate * 100),
      description: descriptionRaw || null,
      condition: (formData.get("condition")?.toString() as ProductCondition) || undefined,
      weightKg: weightKg === undefined ? undefined : weightKg,
      yearBuilt: yearBuilt === undefined ? undefined : yearBuilt,
      dimensions: dimensionsRaw || null,
    };

    const parsed = createProductSchema
      .extend({
        weightKg: z.number().positive().nullable().optional(),
        yearBuilt: z.number().int().nullable().optional(),
        dimensions: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
      })
      .safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;

    const duplicate = await prisma.product.findFirst({
      where: {
        id: { not: id },
        inventoryNumber: data.inventoryNumber,
      },
    });

    if (duplicate) {
      return actionError("Seriennummer bereits vergeben");
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        model: data.model,
        categoryId: data.categoryId,
        inventoryNumber: data.inventoryNumber,
        dailyRateCents: data.dailyRateCents,
        description: data.description,
        condition: data.condition,
        weightKg: data.weightKg,
        yearBuilt: data.yearBuilt,
        dimensions: data.dimensions,
        qrCode: generateQrCodeValue(data.inventoryNumber),
        manufacturer: data.manufacturer ?? existing.manufacturer,
      },
      include: { category: true, location: true, images: true },
    });

    const imageFile = formData.get("image");
    if (imageFile && imageFile instanceof File && imageFile.size > 0) {
      const imageResult = await savePrimaryProductImage(id, imageFile, product.name);
      if (!imageResult.success) {
        return actionError(imageResult.error ?? "Produktbild konnte nicht gespeichert werden");
      }
    }

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entityType: "Product",
      entityId: product.id,
      oldValue: existing,
      newValue: product,
    });

    revalidatePath("/produkte");
    revalidatePath(`/produkte/${id}`);
    return actionSuccess(serializeForClient({ ...product, weightKg: toPlainNumber(product.weightKg) }));
  } catch {
    return actionError("Produkt konnte nicht aktualisiert werden");
  }
}

export async function archiveProduct(id: string) {
  try {
    const auth = await authorize("products.delete");
    if (!auth.ok) return actionError(auth.error);
    const user = auth.user;

    if (!id) {
      return actionError("Produkt-ID ist erforderlich");
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return actionError("Produkt nicht gefunden");
    }

    const product = await prisma.product.update({
      where: { id },
      data: { isArchived: true, status: "AUSGEMUSTERT" },
    });

    await createAuditLog({
      userId: user.id,
      action: "ARCHIVE",
      entityType: "Product",
      entityId: product.id,
      oldValue: existing,
      newValue: product,
    });

    revalidatePath("/produkte");
    return actionSuccess(serializeForClient({ ...product, weightKg: toPlainNumber(product.weightKg) }));
  } catch {
    return actionError("Produkt konnte nicht archiviert werden");
  }
}

export async function deleteProduct(id: string) {
  try {
    const auth = await authorize("products.delete");
    if (!auth.ok) return actionError(auth.error);
    const user = auth.user;

    if (!id) {
      return actionError("Produkt-ID ist erforderlich");
    }

    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookingItems: true,
            eventProducts: true,
          },
        },
      },
    });

    if (!existing) {
      return actionError("Produkt nicht gefunden");
    }

    const linked = existing._count.bookingItems + existing._count.eventProducts;

    if (linked > 0) {
      const product = await prisma.product.update({
        where: { id },
        data: { isArchived: true, status: "AUSGEMUSTERT" },
      });

      await createAuditLog({
        userId: user.id,
        action: "ARCHIVE",
        entityType: "Product",
        entityId: product.id,
        oldValue: existing,
        newValue: product,
      });

      revalidatePath("/produkte");
      revalidatePath(`/produkte/${id}`);
      return actionSuccess(serializeForClient({ ...product, weightKg: toPlainNumber(product.weightKg) }));
    }

    await prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productDocument.deleteMany({ where: { productId: id } });
      await tx.productAccessory.deleteMany({ where: { productId: id } });
      await tx.productCompatibility.deleteMany({
        where: { OR: [{ productAId: id }, { productBId: id }] },
      });
      await tx.customerProductPrice.deleteMany({ where: { productId: id } });
      await tx.maintenance.deleteMany({ where: { productId: id } });
      await tx.conditionReport.deleteMany({ where: { productId: id } });
      await tx.locationHistory.deleteMany({ where: { productId: id } });
      await tx.statusHistory.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    await createAuditLog({
      userId: user.id,
      action: "DELETE",
      entityType: "Product",
      entityId: id,
      oldValue: existing,
    });

    revalidatePath("/produkte");
    return actionSuccess({ id });
  } catch {
    return actionError("Produkt konnte nicht gelöscht werden");
  }
}

export async function uploadProductImage(productId: string, formData: FormData) {
  try {
    const auth = await authorize("products.edit");
    if (!auth.ok) return actionError(auth.error);
    const user = auth.user;

    if (!productId) {
      return actionError("Produkt-ID ist erforderlich");
    }

    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return actionError("Keine gültige Datei hochgeladen");
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return actionError("Produkt nicht gefunden");
    }

    const caption = formData.get("caption")?.toString();
    const isPrimary = formData.get("isPrimary") === "true";

    const { url } = await saveFile(file, "products");

    if (isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    const imageCount = await prisma.productImage.count({ where: { productId } });

    const image = await prisma.productImage.create({
      data: {
        productId,
        url,
        caption,
        isPrimary: isPrimary || imageCount === 0,
        sortOrder: imageCount,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entityType: "ProductImage",
      entityId: image.id,
      newValue: image,
    });

    revalidatePath("/produkte");
    revalidatePath(`/produkte/${productId}`);
    return actionSuccess(image);
  } catch {
    return actionError("Produktbild konnte nicht hochgeladen werden");
  }
}

const createCategorySchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function createProductCategory(input: z.infer<typeof createCategorySchema>) {
  try {
    const auth = await authorize("products.create");
    if (!auth.ok) return actionError(auth.error);
    const user = auth.user;
    const parsed = createCategorySchema.safeParse(input);
    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const existing = await prisma.productCategory.findFirst({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return actionError("Kategorie existiert bereits");
    }

    const maxSort = await prisma.productCategory.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.productCategory.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        sortOrder: parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entityType: "ProductCategory",
      entityId: category.id,
      newValue: category,
    });

    revalidatePath("/produkte");
    return actionSuccess(category);
  } catch {
    return actionError("Kategorie konnte nicht erstellt werden");
  }
}

/** Hilfsfunktionen für bestehende Seiten */
export async function getProductCategories() {
  const auth = await authorize("products.view");
  if (!auth.ok) return [];
  return prisma.productCategory.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getLocations() {
  const auth = await authorize("locations.view");
  if (!auth.ok) return [];
  return prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function getProductByQrCode(code: string) {
  const auth = await authorize("products.view");
  if (!auth.ok) return null;
  return prisma.product.findFirst({
    where: {
      OR: [{ qrCode: code }, { inventoryNumber: code.replace("FLX-RENT-", "") }],
    },
    include: { category: true, location: true, accessories: { include: { accessory: true } } },
  });
}
