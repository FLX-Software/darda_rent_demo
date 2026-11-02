import { UserRole } from "@prisma/client";

/** Lizenzlimit: max. 6 aktive Konten – 2 Administratoren + 4 Benutzer */
export const MAX_ACTIVE_USERS = 6;
export const MAX_ACTIVE_ADMINS = 2;
export const MAX_ACTIVE_STANDARD_USERS = 4;

export function isAdminRole(role: UserRole): boolean {
  return role === "ADMIN";
}

export type UserLimitCounts = {
  totalActive: number;
  activeAdmins: number;
  activeStandard: number;
};

export function getUserLimitMessage(counts: UserLimitCounts): string {
  return `Aktiv: ${counts.totalActive}/${MAX_ACTIVE_USERS} (Admins ${counts.activeAdmins}/${MAX_ACTIVE_ADMINS}, Benutzer ${counts.activeStandard}/${MAX_ACTIVE_STANDARD_USERS})`;
}

export function canAddActiveUser(
  counts: UserLimitCounts,
  role: UserRole
): { ok: true } | { ok: false; error: string } {
  if (counts.totalActive >= MAX_ACTIVE_USERS) {
    return {
      ok: false,
      error: `Benutzerobergrenze erreicht (${MAX_ACTIVE_USERS} aktive Konten: max. ${MAX_ACTIVE_ADMINS} Administratoren und ${MAX_ACTIVE_STANDARD_USERS} Benutzer).`,
    };
  }

  if (isAdminRole(role)) {
    if (counts.activeAdmins >= MAX_ACTIVE_ADMINS) {
      return {
        ok: false,
        error: `Maximal ${MAX_ACTIVE_ADMINS} Administratoren erlaubt.`,
      };
    }
  } else if (counts.activeStandard >= MAX_ACTIVE_STANDARD_USERS) {
    return {
      ok: false,
      error: `Maximal ${MAX_ACTIVE_STANDARD_USERS} Benutzer (ohne Administrator) erlaubt.`,
    };
  }

  return { ok: true };
}
