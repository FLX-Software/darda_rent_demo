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
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue ? JSON.parse(JSON.stringify(params.oldValue)) : undefined,
      newValue: params.newValue ? JSON.parse(JSON.stringify(params.newValue)) : undefined,
    },
  });
}

export async function createNotification(params: {
  userId: string;
  type: import("@prisma/client").NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  await prisma.notification.create({ data: params });
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
