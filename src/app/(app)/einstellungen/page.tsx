import { PageHeader } from "@/components/shared/page-header";
import { getSettings } from "@/lib/actions/settings";
import { requireAuth } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function EinstellungenPage() {
  const user = await requireAuth();
  const settings = await getSettings();
  const canEdit = hasPermission(user.role, "settings.edit");

  return (
    <div>
      <PageHeader
        title="Einstellungen"
        description="Systemkonfiguration und Unternehmensdaten"
      />
      {!canEdit && (
        <p className="mb-4 text-sm text-gray-500">
          Nur Administratoren können Einstellungen ändern.
        </p>
      )}
      <SettingsForm initial={settings} canEdit={canEdit} />
    </div>
  );
}
