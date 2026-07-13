import { ProductStatus } from "@prisma/client";
import { productStatusLabels, productStatusColors } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface ProductStatusBadgeProps {
  status: ProductStatus;
  className?: string;
}

export function ProductStatusBadge({ status, className }: ProductStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        productStatusColors[status],
        className
      )}
    >
      {productStatusLabels[status]}
    </span>
  );
}
