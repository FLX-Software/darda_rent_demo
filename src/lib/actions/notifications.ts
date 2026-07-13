"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { actionError, actionSuccess, getValidationError } from "./types";

const notificationFiltersSchema = z.object({
  unreadOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const markAsReadSchema = z.object({
  notificationIds: z.array(z.string()).min(1, "Mindestens eine Benachrichtigung erforderlich"),
});

export async function getNotifications(
  userIdOrFilters?: string | z.infer<typeof notificationFiltersSchema>
) {
  try {
    const user = await requireAuth();

    if (typeof userIdOrFilters === "string") {
      const notifications = await prisma.notification.findMany({
        where: { userId: userIdOrFilters },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return notifications;
    }

    const parsed = userIdOrFilters
      ? notificationFiltersSchema.safeParse(userIdOrFilters)
      : { success: true as const, data: {} };

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const { unreadOnly, limit } = parsed.data;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: user.id,
          ...(unreadOnly ? { isRead: false } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit ?? 50,
      }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false },
      }),
    ]);

    return actionSuccess({ notifications, unreadCount });
  } catch {
    if (typeof userIdOrFilters === "string") {
      return [];
    }
    return actionError("Benachrichtigungen konnten nicht geladen werden");
  }
}

export async function markAsRead(input: z.infer<typeof markAsReadSchema>) {
  try {
    const user = await requireAuth();
    const parsed = markAsReadSchema.safeParse(input);

    if (!parsed.success) {
      return actionError(getValidationError(parsed.error));
    }

    const { notificationIds } = parsed.data;

    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: user.id,
      },
      data: { isRead: true },
    });

    revalidatePath("/benachrichtigungen");
    return actionSuccess({ updatedCount: result.count });
  } catch {
    return actionError("Benachrichtigungen konnten nicht als gelesen markiert werden");
  }
}

export async function markAllNotificationsRead(userId: string) {
  try {
    const user = await requireAuth();

    if (user.id !== userId && user.role !== "ADMIN") {
      return actionError("Keine Berechtigung");
    }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    revalidatePath("/benachrichtigungen");
    return actionSuccess({ updated: true });
  } catch {
    return actionError("Benachrichtigungen konnten nicht als gelesen markiert werden");
  }
}
