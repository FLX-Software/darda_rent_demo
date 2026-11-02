import { getUserLimits, getUsers } from "@/lib/actions/users";
import { requireAuth } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { UsersClient } from "./users-client";

export default async function BenutzerPage() {
  const currentUser = await requireAuth();
  const [users, limits] = await Promise.all([getUsers(), getUserLimits()]);
  const canEdit = hasPermission(currentUser.role, "users.edit");

  return (
    <div>
      <PageHeader
        title="Benutzer"
        description="Benutzerkonten und Rollen verwalten (max. 6: 2 Admins + 4 Benutzer)"
      />

      <UsersClient
        users={users}
        currentUserId={currentUser.id}
        canEdit={canEdit}
        limits={limits}
      />
    </div>
  );
}
