import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { prisma } from "./prisma";
import { canAccessRoute, hasPermission, Permission } from "./permissions";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user;
  if (!sessionUser?.email) return null;

  // Nach DB-Seed kann die JWT-ID veraltet sein – per E-Mail nachladen
  const dbUser = await prisma.user.findFirst({
    where: {
      isActive: true,
      OR: [{ id: sessionUser.id }, { email: sessionUser.email }],
    },
  });

  if (!dbUser) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: `${dbUser.firstName} ${dbUser.lastName}`,
    role: dbUser.role,
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) {
    redirect("/dashboard?error=keine_berechtigung");
  }
  return user;
}

export async function requireRouteAccess(pathname: string) {
  const user = await requireAuth();
  if (!canAccessRoute(user.role, pathname)) {
    redirect("/dashboard?error=keine_berechtigung");
  }
  return user;
}

export function isAdmin(role: UserRole): boolean {
  return role === "ADMIN";
}
