"use server";

import { prisma } from "@/lib/prisma";

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { lastName: "asc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}
