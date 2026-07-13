"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ProductCondition, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/session";
import { generateQrCodeValue } from "@/lib/utils";
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
  model: z.string().min(1, "Modell ist erforderlich"),
  categoryId: z.string().min(1, "Kategorie ist erforderlich"),
  manufacturer: z.string().optional(),
  inventoryNumber: z.string().min(1, "Inventarnummer ist erforderlich"),
  serialNumber: z.string().min(1, "Seriennummer ist erforderlich"),
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

const updateProductSchema = createProductSchema.partial();

export async function getProducts(filters?: z.infer<typeof productFiltersSchema>) {
  try {
    await requireAuth();

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
      displayBookingType: resolveProductDisplayBookingType(
        product.status,
        bookingItems[0]?.booking.type ?? null
      ),
    }));

    return actionSuccess(productsWithDisplayType);
  } catch {
    return actionError("Produkte konnten nicht geladen werden");
  }
}

export async function getProduct(id: string) {
  try {
    await requireAuth();

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

    return actionSuccess(product);
  } catch {
    return actionError("Produkt konnte nicht geladen werden");
  }
}

export async function createProduct(input: z.infer<typeof createProductSchema>) {
  try {
    const user = await requireAuth();
    const parsed = createProductSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;

    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { inventoryNumber: data.inventoryNumber },
          { serialNumber: data.serialNumber },
        ],
      },
    });

    if (existing) {
      return actionError("Inventarnummer oder Seriennummer bereits vergeben");
    }

    const product = await prisma.product.create({
      data: {
        ...data,
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
    return actionSuccess(product);
  } catch {
    return actionError("Produkt konnte nicht erstellt werden");
  }
}

export async function createProductFromForm(formData: FormData) {
  try {
    const user = await requireAuth();

    const dailyRate = parseFloat(formData.get("dailyRate")?.toString() ?? "0");
    const input = {
      name: formData.get("name")?.toString() ?? "",
      model: formData.get("model")?.toString() ?? "",
      categoryId: formData.get("categoryId")?.toString() ?? "",
      inventoryNumber: formData.get("inventoryNumber")?.toString() ?? "",
      serialNumber: formData.get("serialNumber")?.toString() ?? "",
      dailyRateCents: Math.round(dailyRate * 100),
      description: formData.get("description")?.toString() || undefined,
      locationId: formData.get("locationId")?.toString() || undefined,
      condition: (formData.get("condition")?.toString() as ProductCondition) || undefined,
    };

    const parsed = createProductSchema.safeParse(input);
    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;

    const existing = await prisma.product.findFirst({
      where: {
        OR: [
          { inventoryNumber: data.inventoryNumber },
          { serialNumber: data.serialNumber },
        ],
      },
    });

    if (existing) {
      return actionError("Inventarnummer oder Seriennummer bereits vergeben");
    }

    const product = await prisma.product.create({
      data: {
        ...data,
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
    return actionSuccess(product);
  } catch {
    return actionError("Produkt konnte nicht erstellt werden");
  }
}

export async function updateProduct(id: string, input: z.infer<typeof updateProductSchema>) {
  try {
    const user = await requireAuth();
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
        return actionError("Inventarnummer oder Seriennummer bereits vergeben");
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
    return actionSuccess(product);
  } catch {
    return actionError("Produkt konnte nicht aktualisiert werden");
  }
}

export async function archiveProduct(id: string) {
  try {
    const user = await requireAuth();

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
    return actionSuccess(product);
  } catch {
    return actionError("Produkt konnte nicht archiviert werden");
  }
}

export async function uploadProductImage(productId: string, formData: FormData) {
  try {
    const user = await requireAuth();

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

/** Hilfsfunktionen für bestehende Seiten */
export async function getProductCategories() {
  await requireAuth();
  return prisma.productCategory.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getLocations() {
  await requireAuth();
  return prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function getProductByQrCode(code: string) {
  await requireAuth();
  return prisma.product.findFirst({
    where: {
      OR: [{ qrCode: code }, { inventoryNumber: code.replace("FLX-RENT-", "") }],
    },
    include: { category: true, location: true, accessories: { include: { accessory: true } } },
  });
}
