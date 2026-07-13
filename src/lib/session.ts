import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { canAccessRoute, hasPermission, Permission } from "./permissions";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
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
