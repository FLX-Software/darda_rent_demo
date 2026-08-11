"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EventStatus, EventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { requireAuth } from "@/lib/session";
import { actionError, actionSuccess, getValidationError } from "./types";

const CHECKLIST_ITEMS = [
  "productsReserved",
  "accessoriesComplete",
  "productChecked",
  "transportOrganized",
  "documentsReady",
  "productsLoaded",
  "returnPlanned",
  "returnCompleted",
] as const;

type ChecklistItemKey = (typeof CHECKLIST_ITEMS)[number];

const eventFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(EventStatus).optional(),
  type: z.nativeEnum(EventType).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});

const optionalDateField = z.preprocess(
  (val) => (val === "" || val === undefined ? undefined : val),
  z.union([z.coerce.date(), z.null()]).optional()
);

const optionalStringField = z.union([z.string(), z.null()]).optional();

const createEventBaseSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  type: z.nativeEnum(EventType),
  status: z.nativeEnum(EventStatus).default("GEPLANT"),
  customerId: optionalStringField,
  venue: optionalStringField,
  street: optionalStringField,
  city: optionalStringField,
  zip: optionalStringField,
  setupStartDate: optionalDateField,
  setupEndDate: optionalDateField,
  eventStartDate: z.coerce.date(),
  eventEndDate: z.coerce.date(),
  teardownStartDate: optionalDateField,
  teardownEndDate: optionalDateField,
  responsibleUserId: optionalStringField,
  transportNotes: optionalStringField,
  carrier: optionalStringField,
  hotelInfo: optionalStringField,
  budgetCents: z.union([z.number().int().min(0), z.null()]).optional(),
  contactOnSite: optionalStringField,
  contactPhone: optionalStringField,
  notes: optionalStringField,
  productIds: z.array(z.string()).optional(),
  participantIds: z.array(z.string()).optional(),
});

const createEventSchema = createEventBaseSchema.refine(
  (data) => data.eventEndDate >= data.eventStartDate,
  {
    message: "Enddatum muss nach dem Startdatum liegen",
    path: ["eventEndDate"],
  }
);

const updateEventSchema = createEventBaseSchema.partial().refine(
  (data) => {
    if (data.eventStartDate && data.eventEndDate) {
      return data.eventEndDate >= data.eventStartDate;
    }
    return true;
  },
  {
    message: "Enddatum muss nach dem Startdatum liegen",
    path: ["eventEndDate"],
  }
);

const toggleChecklistSchema = z.object({
  eventId: z.string().min(1, "Veranstaltungs-ID ist erforderlich"),
  item: z.enum(CHECKLIST_ITEMS),
  value: z.boolean().optional(),
});

export async function getEvents(filters?: z.infer<typeof eventFiltersSchema>) {
  try {
    await requireAuth();

    const parsed = filters ? eventFiltersSchema.safeParse(filters) : { success: true as const, data: {} };
    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const { search, status, type, fromDate, toDate } = parsed.data;

    const events = await prisma.event.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(fromDate || toDate
          ? {
              AND: [
                ...(fromDate ? [{ eventEndDate: { gte: fromDate } }] : []),
                ...(toDate ? [{ eventStartDate: { lte: toDate } }] : []),
              ],
            }
          : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { venue: { contains: search, mode: "insensitive" } },
                { city: { contains: search, mode: "insensitive" } },
                { customer: { companyName: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        responsibleUser: true,
        products: { include: { product: true } },
        checklist: true,
        _count: { select: { participants: true, bookings: true } },
      },
      orderBy: { eventStartDate: "asc" },
    });

    return actionSuccess(events);
  } catch {
    return actionError("Veranstaltungen konnten nicht geladen werden");
  }
}

export async function getEvent(id: string) {
  try {
    await requireAuth();

    if (!id) {
      return actionError("Veranstaltungs-ID ist erforderlich");
    }

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        customer: true,
        responsibleUser: true,
        participants: { include: { user: true } },
        products: { include: { product: { include: { category: true, images: true } } } },
        checklist: true,
        bookings: { include: { items: { include: { product: true } } } },
        documents: true,
      },
    });

    if (!event) {
      return actionError("Veranstaltung nicht gefunden");
    }

    return actionSuccess(event);
  } catch {
    return actionError("Veranstaltung konnte nicht geladen werden");
  }
}

export async function createEvent(input: z.infer<typeof createEventSchema>) {
  try {
    const user = await requireAuth();
    const parsed = createEventSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const data = parsed.data;

    const event = await prisma.event.create({
      data: {
        name: data.name,
        type: data.type,
        status: data.status,
        customerId: data.customerId,
        venue: data.venue,
        street: data.street,
        city: data.city,
        zip: data.zip,
        setupStartDate: data.setupStartDate,
        setupEndDate: data.setupEndDate,
        eventStartDate: data.eventStartDate,
        eventEndDate: data.eventEndDate,
        teardownStartDate: data.teardownStartDate,
        teardownEndDate: data.teardownEndDate,
        responsibleUserId: data.responsibleUserId ?? user.id,
        transportNotes: data.transportNotes,
        carrier: data.carrier,
        hotelInfo: data.hotelInfo,
        budgetCents: data.budgetCents,
        contactOnSite: data.contactOnSite,
        contactPhone: data.contactPhone,
        notes: data.notes,
        checklist: { create: {} },
        products: data.productIds
          ? { create: data.productIds.map((productId) => ({ productId })) }
          : undefined,
        participants: data.participantIds
          ? { create: data.participantIds.map((userId) => ({ userId })) }
          : undefined,
      },
      include: {
        customer: true,
        responsibleUser: true,
        products: { include: { product: true } },
        checklist: true,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entityType: "Event",
      entityId: event.id,
      newValue: event,
    });

    revalidatePath("/messen-demos");
    revalidatePath("/planung");
    return actionSuccess(event);
  } catch {
    return actionError("Veranstaltung konnte nicht erstellt werden");
  }
}

export async function updateEvent(id: string, input: z.infer<typeof updateEventSchema>) {
  try {
    const user = await requireAuth();
    const parsed = updateEventSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    if (!id) {
      return actionError("Veranstaltungs-ID ist erforderlich");
    }

    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return actionError("Veranstaltung nicht gefunden");
    }

    const data = parsed.data;
    const { productIds, participantIds, ...eventData } = data;

    const event = await prisma.$transaction(async (tx) => {
      if (productIds) {
        await tx.eventProduct.deleteMany({ where: { eventId: id } });
      }
      if (participantIds) {
        await tx.eventParticipant.deleteMany({ where: { eventId: id } });
      }

      return tx.event.update({
        where: { id },
        data: {
          ...eventData,
          products: productIds
            ? { create: productIds.map((productId) => ({ productId })) }
            : undefined,
          participants: participantIds
            ? { create: participantIds.map((userId) => ({ userId })) }
            : undefined,
        },
        include: {
          customer: true,
          responsibleUser: true,
          products: { include: { product: true } },
          checklist: true,
        },
      });
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entityType: "Event",
      entityId: event.id,
      oldValue: existing,
      newValue: event,
    });

    revalidatePath("/messen-demos");
    revalidatePath(`/messen-demos/${id}`);
    return actionSuccess(event);
  } catch {
    return actionError("Veranstaltung konnte nicht aktualisiert werden");
  }
}

export async function toggleChecklistItem(input: z.infer<typeof toggleChecklistSchema>) {
  try {
    const user = await requireAuth();
    const parsed = toggleChecklistSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const { eventId, item, value } = parsed.data;

    const checklist = await prisma.eventChecklist.findUnique({
      where: { eventId },
    });

    if (!checklist) {
      return actionError("Checkliste nicht gefunden");
    }

    const currentValue = checklist[item as ChecklistItemKey];
    const newValue = value !== undefined ? value : !currentValue;

    const updated = await prisma.eventChecklist.update({
      where: { eventId },
      data: { [item]: newValue },
    });

    await createAuditLog({
      userId: user.id,
      action: "UPDATE",
      entityType: "EventChecklist",
      entityId: updated.id,
      oldValue: { [item]: currentValue },
      newValue: { [item]: newValue },
    });

    revalidatePath("/messen-demos");
    revalidatePath(`/messen-demos/${eventId}`);
    return actionSuccess(updated);
  } catch {
    return actionError("Checklistenpunkt konnte nicht aktualisiert werden");
  }
}
