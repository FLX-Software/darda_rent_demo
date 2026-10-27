"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MaintenanceStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { updateMaintenance } from "@/lib/actions/maintenance";

export function MaintenanceActions({
  id,
  status,
}: {
  id: string;
  status: MaintenanceStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (status === "ABGESCHLOSSEN") {
    return <span className="text-xs text-gray-400">Erledigt</span>;
  }

  async function complete() {
    setLoading(true);
    await updateMaintenance(id, {
      status: "ABGESCHLOSSEN",
      lastDate: new Date(),
    });
    setLoading(false);
    router.refresh();
  }

  async function start() {
    setLoading(true);
    await updateMaintenance(id, { status: "IN_BEARBEITUNG" });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex justify-end gap-2">
      {status !== "IN_BEARBEITUNG" && (
        <Button size="sm" variant="outline" disabled={loading} onClick={start}>
          Starten
        </Button>
      )}
      <Button size="sm" disabled={loading} onClick={complete}>
        Abschließen
      </Button>
    </div>
  );
}
