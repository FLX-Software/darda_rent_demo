import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Prisma Decimal / ähnliche Werte für Client Components serialisieren */
export function toPlainNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const n = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Wandelt Prisma-Ergebnisse (Decimal, Date, …) in reine JSON-Werte um,
 * die an Client Components übergeben werden dürfen.
 */
export function serializeForClient<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, current) => {
      if (
        current != null &&
        typeof current === "object" &&
        typeof (current as { toNumber?: unknown }).toNumber === "function"
      ) {
        return (current as { toNumber: () => number }).toNumber();
      }
      return current;
    })
  ) as T;
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function generateBookingNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `B-${year}-${random}`;
}

export function generateDamageNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `S-${year}-${random}`;
}

export function generateCustomerNumber(): string {
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `K-${random}`;
}

export function generateQrCodeValue(inventoryNumber: string): string {
  return `FLX-RENT-${inventoryNumber}`;
}
