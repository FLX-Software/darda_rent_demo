import { differenceInCalendarDays } from "date-fns";

/** Inklusive Kalendertage zwischen Start und geplanter Rückgabe, mindestens 1. */
export function rentalDays(startDate: Date, endDate: Date): number {
  const days = differenceInCalendarDays(endDate, startDate) + 1;
  return Math.max(1, days);
}

export function calcRentalCostCents(
  items: { productId: string; quantity: number }[],
  rateByProductId: Map<string, number>,
  startDate: Date,
  endDate: Date
): number {
  const days = rentalDays(startDate, endDate);
  return items.reduce((sum, item) => {
    const dailyRate = rateByProductId.get(item.productId) ?? 0;
    return sum + dailyRate * item.quantity * days;
  }, 0);
}
