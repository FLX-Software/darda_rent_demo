"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/actions/types";

interface ConfirmDeleteButtonProps {
  entityLabel: string;
  entityName: string;
  description?: ReactNode;
  onDelete: () => Promise<ActionResult<unknown>>;
  redirectTo?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
  onDeleted?: () => void;
}

export function ConfirmDeleteButton({
  entityLabel,
  entityName,
  description,
  onDelete,
  redirectTo,
  variant = "destructive",
  size = "default",
  className,
  showLabel = true,
  onDeleted,
}: ConfirmDeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setDeleting(true);
    setError("");

    const result = await onDelete();
    setDeleting(false);

    if (!result.success) {
      setError(result.error ?? `${entityLabel} konnte nicht gelöscht werden`);
      return;
    }

    setOpen(false);
    onDeleted?.();
    if (redirectTo) {
      router.push(redirectTo);
    }
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Trash2 className={showLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
        {showLabel && "Löschen"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{entityLabel} löschen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {description ?? (
              <>
                Möchten Sie {entityLabel.toLowerCase()}{" "}
                <span className="font-semibold text-flx-navy">{entityName}</span> wirklich
                löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </>
            )}
          </p>
          {error && <p className="text-sm text-status-damage">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Löschen…" : "Ja, löschen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
