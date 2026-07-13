import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-flx-blue text-white",
        secondary: "border-transparent bg-gray-100 text-gray-700",
        outline: "text-flx-navy border-gray-200",
        success: "border-transparent bg-status-available/15 text-status-available",
        warning: "border-transparent bg-status-transit/15 text-status-transit",
        danger: "border-transparent bg-status-damage/15 text-status-damage",
        demo: "border-transparent bg-status-demo/15 text-status-demo",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
