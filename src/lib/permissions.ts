import { UserRole } from "@prisma/client";

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrator",
  DISPOSITION: "Disposition",
  LAGER: "Lager",
  AUSSENDIENST: "Außendienst",
  SERVICE: "Service",
  LESEND: "Lesender Benutzer",
};

export type Permission =
  | "dashboard.view"
  | "planning.view"
  | "planning.edit"
  | "products.view"
  | "products.create"
  | "products.edit"
  | "products.delete"
  | "bookings.view"
  | "bookings.create"
  | "bookings.edit"
  | "bookings.delete"
  | "customers.view"
  | "customers.create"
  | "customers.edit"
  | "events.view"
  | "events.create"
  | "events.edit"
  | "checkout.view"
  | "checkout.perform"
  | "checkin.view"
  | "checkin.perform"
  | "damages.view"
  | "damages.create"
  | "damages.edit"
  | "maintenance.view"
  | "maintenance.edit"
  | "locations.view"
  | "locations.edit"
  | "reports.view"
  | "users.view"
  | "users.edit"
  | "settings.view"
  | "settings.edit";

const rolePermissions: Record<UserRole, Permission[]> = {
  ADMIN: [
    "dashboard.view", "planning.view", "planning.edit",
    "products.view", "products.create", "products.edit", "products.delete",
    "bookings.view", "bookings.create", "bookings.edit", "bookings.delete",
    "customers.view", "customers.create", "customers.edit",
    "events.view", "events.create", "events.edit",
    "checkout.view", "checkout.perform", "checkin.view", "checkin.perform",
    "damages.view", "damages.create", "damages.edit",
    "maintenance.view", "maintenance.edit",
    "locations.view", "locations.edit",
    "reports.view", "users.view", "users.edit", "settings.view", "settings.edit",
  ],
  DISPOSITION: [
    "dashboard.view", "planning.view", "planning.edit",
    "products.view", "products.create", "products.edit",
    "bookings.view", "bookings.create", "bookings.edit",
    "customers.view", "customers.create", "customers.edit",
    "events.view", "events.create", "events.edit",
    "checkout.view", "checkin.view",
    "damages.view", "damages.create",
    "maintenance.view", "locations.view", "reports.view",
  ],
  LAGER: [
    "dashboard.view", "planning.view",
    "products.view", "bookings.view",
    "checkout.view", "checkout.perform", "checkin.view", "checkin.perform",
    "damages.view", "damages.create",
    "locations.view", "locations.edit",
  ],
  AUSSENDIENST: [
    "dashboard.view", "planning.view", "products.view",
    "bookings.view", "damages.view", "damages.create",
  ],
  SERVICE: [
    "dashboard.view", "products.view", "bookings.view",
    "damages.view", "damages.edit", "maintenance.view", "maintenance.edit",
    "reports.view",
  ],
  LESEND: [
    "dashboard.view", "planning.view",
    "products.view", "bookings.view", "customers.view",
    "events.view", "damages.view", "maintenance.view",
    "locations.view", "reports.view",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function canAccessRoute(role: UserRole, route: string): boolean {
  const routePermissions: Record<string, Permission> = {
    "/dashboard": "dashboard.view",
    "/planung": "planning.view",
    "/produkte": "products.view",
    "/buchungen": "bookings.view",
    "/kunden": "customers.view",
    "/messen-demos": "events.view",
    "/ausgaben-rueckgaben": "checkout.view",
    "/schaeden": "damages.view",
    "/standorte": "locations.view",
    "/berichte": "reports.view",
    "/benutzer": "users.view",
    "/einstellungen": "settings.view",
  };

  for (const [prefix, permission] of Object.entries(routePermissions)) {
    if (route.startsWith(prefix)) {
      return hasPermission(role, permission);
    }
  }
  return true;
}
