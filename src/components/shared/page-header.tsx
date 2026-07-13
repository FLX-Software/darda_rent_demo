import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface PageHeaderAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  icon?: React.ReactNode;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: PageHeaderAction[];
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  backHref,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex items-start gap-3">
        {backHref && (
          <Button variant="ghost" size="icon" asChild className="mt-0.5 shrink-0">
            <Link href={backHref}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold text-flx-navy">{title}</h2>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {actions?.map((action) =>
          action.href ? (
            <Button key={action.label} variant={action.variant ?? "default"} asChild>
              <Link href={action.href}>
                {action.icon}
                {action.label}
              </Link>
            </Button>
          ) : (
            <Button key={action.label} variant={action.variant ?? "default"} onClick={action.onClick}>
              {action.icon}
              {action.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
