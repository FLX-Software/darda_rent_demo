import { prisma } from "./prisma";
import { AuditAction } from "@prisma/client";

export async function createAuditLog(params: {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  try {
    let userId = params.userId;
    if (userId) {
      const exists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!exists) userId = undefined;
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue
          ? JSON.parse(JSON.stringify(params.oldValue))
          : undefined,
        newValue: params.newValue
          ? JSON.parse(JSON.stringify(params.newValue))
          : undefined,
      },
    });
  } catch (error) {
    console.error("Audit-Log konnte nicht geschrieben werden:", error);
  }
}

export async function createNotification(params: {
  userId: string;
  type: import("@prisma/client").NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    await prisma.notification.create({ data: params });
  } catch (error) {
    console.error("Benachrichtigung konnte nicht erstellt werden:", error);
  }
}

export async function notifyAdmins(params: {
  type: import("@prisma/client").NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
    })),
  });
}
