"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/session";
import { generateCustomerNumber } from "@/lib/utils";
import { actionError, actionSuccess, getValidationError } from "./types";

const customerFiltersSchema = z.object({
  search: z.string().optional(),
  includeInactive: z.boolean().optional(),
});

const contactSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich"),
  lastName: z.string().min(1, "Nachname ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
  phone: z.string().optional(),
  position: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const deliveryAddressSchema = z.object({
  label: z.string().min(1, "Bezeichnung ist erforderlich"),
  street: z.string().min(1, "Straße ist erforderlich"),
  city: z.string().min(1, "Stadt ist erforderlich"),
  zip: z.string().min(1, "PLZ ist erforderlich"),
  country: z.string().default("Deutschland"),
  isDefault: z.boolean().optional(),
});

const createCustomerSchema = z.object({
  companyName: z.string().min(1, "Firmenname ist erforderlich"),
  industry: z.string().optional(),
  billingStreet: z.string().min(1, "Rechnungsstraße ist erforderlich"),
  billingCity: z.string().min(1, "Rechnungsstadt ist erforderlich"),
  billingZip: z.string().min(1, "Rechnungs-PLZ ist erforderlich"),
  billingCountry: z.string().default("Deutschland"),
  email: z.string().email("Ungültige E-Mail-Adresse").optional().or(z.literal("")),
  phone: z.string().optional(),
  paymentTerms: z.number().int().min(0).default(30),
  discountPercent: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  contacts: z.array(contactSchema).optional(),
  deliveryAddresses: z.array(deliveryAddressSchema).optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

export async function getCustomers(filters?: z.infer<typeof customerFiltersSchema> | string) {
  try {
    await requireAuth();

    const normalizedFilters =
      typeof filters === "string" ? { search: filters } : filters;

    const parsed = normalizedFilters
      ? customerFiltersSchema.safeParse(normalizedFilters)
      : { success: true as const, data: {} };

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const { search, includeInactive } = parsed.data;

    const customers = await prisma.customer.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(search
          ? {
              OR: [
                { companyName: { contains: search, mode: "insensitive" } },
                { customerNumber: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        contacts: true,
        deliveryAddresses: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { companyName: "asc" },
    });

    return actionSuccess(customers);
  } catch {
    return actionError("Kunden konnten nicht geladen werden");
  }
}

export async function getCustomer(id: string) {
  try {
    await requireAuth();

    if (!id) {
      return actionError("Kunden-ID ist erforderlich");
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        contacts: true,
        deliveryAddresses: true,
        bookings: {
          orderBy: { startDate: "desc" },
          take: 10,
          include: { items: { include: { product: true } } },
        },
        customPrices: { include: { product: true } },
        documents: true,
      },
    });

    if (!customer) {
      return actionError("Kunde nicht gefunden");
    }

    return actionSuccess(customer);
  } catch {
    return actionError("Kunde konnte nicht geladen werden");
  }
}

export async function createCustomer(input: z.infer<typeof createCustomerSchema>) {
  try {
    const user = await requireAuth();
    const parsed = createCustomerSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;

    const customer = await prisma.customer.create({
      data: {
        customerNumber: generateCustomerNumber(),
        companyName: data.companyName,
        industry: data.industry,
        billingStreet: data.billingStreet,
        billingCity: data.billingCity,
        billingZip: data.billingZip,
        billingCountry: data.billingCountry,
        email: data.email || null,
        phone: data.phone,
        paymentTerms: data.paymentTerms,
        discountPercent: data.discountPercent,
        notes: data.notes,
        contacts: data.contacts
          ? { create: data.contacts.map((c) => ({ ...c, email: c.email || null })) }
          : undefined,
        deliveryAddresses: data.deliveryAddresses
          ? { create: data.deliveryAddresses }
          : undefined,
      },
      include: {
        contacts: true,
        deliveryAddresses: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entityType: "Customer",
      entityId: customer.id,
      newValue: customer,
    });

    revalidatePath("/kunden");
    return actionSuccess(customer);
  } catch {
    return actionError("Kunde konnte nicht erstellt werden");
  }
}

export async function updateCustomer(id: string, input: z.infer<typeof updateCustomerSchema>) {
  try {
    const user = await requireAuth();
    const parsed = updateCustomerSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    if (!id) {
      return actionError("Kunden-ID ist erforderlich");
    }

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      return actionError("Kunde nicht gefunden");
    }

    const data = parsed.data;
    const { contacts, deliveryAddresses, ...customerData } = data;

    const customer = await prisma.$transaction(async (tx) => {
      if (contacts) {
        await tx.customerContact.deleteMany({ where: { customerId: id } });
      }
      if (deliveryAddresses) {
        await tx.deliveryAddress.deleteMany({ where: { customerId: id } });
      }

      return tx.customer.update({
        where: { id },
        data: {
          ...customerData,
          email: customerData.email !== undefined ? customerData.email || null : undefined,
          contacts: contacts
            ? { create: contacts.map((c) => ({ ...c, email: c.email || null })) }
            : undefined,
          deliveryAddresses: deliveryAddresses ? { create: deliveryAddresses } : undefined,
        },
        include: {
          contacts: true,
          deliveryAddresses: true,
        },
      });
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entityType: "Customer",
      entityId: customer.id,
      oldValue: existing,
      newValue: customer,
    });

    revalidatePath("/kunden");
    revalidatePath(`/kunden/${id}`);
    return actionSuccess(customer);
  } catch {
    return actionError("Kunde konnte nicht aktualisiert werden");
  }
}
