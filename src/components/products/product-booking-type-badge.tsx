import { BookingType } from "@prisma/client";
import { bookingTypeColors, bookingTypeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface ProductBookingTypeBadgeProps {
  type: BookingType | null;
  className?: string;
}

export function ProductBookingTypeBadge({ type, className }: ProductBookingTypeBadgeProps) {
  if (!type) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
          "bg-status-available/15 text-status-available border-status-available/30",
          className
        )}
      >
        Verfügbar
      </span>
    );
  }

  const color = bookingTypeColors[type];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        color,
        borderColor: `${color}50`,
      }}
    >
      {bookingTypeLabels[type]}
    </span>
  );
}
