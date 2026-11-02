import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function isDecimalLike(value: object): boolean {
  if (Object.prototype.toString.call(value) === "[object Decimal]") return true;
  return (
    typeof (value as { toFixed?: unknown }).toFixed === "function" &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  );
}

/** Prisma Decimal / ähnliche Werte für Client Components serialisieren */
export function toPlainNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && isDecimalLike(value)) {
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
  const walk = (current: unknown): unknown => {
    if (current == null) return current;
    if (current instanceof Date) return current.toISOString();
    if (typeof current === "object") {
      if (isDecimalLike(current)) {
        return (current as { toNumber: () => number }).toNumber();
      }
      if (Array.isArray(current)) return current.map(walk);
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(current as Record<string, unknown>)) {
        out[key] = walk(val);
      }
      return out;
    }
    return current;
  };
  return walk(value) as T;
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

export function generateCustomerNumber(): string {
  const random = Math.floor(Math.random() * 90000) + 10000;
  return `K-${random}`;
}

export function generateQrCodeValue(inventoryNumber: string): string {
  return `FLX-RENT-${inventoryNumber}`;
}
