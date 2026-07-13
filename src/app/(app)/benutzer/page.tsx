import { getUsers } from "@/lib/actions/users";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { roleLabels } from "@/lib/permissions";
import { UserRole } from "@prisma/client";

export default async function BenutzerPage() {
  const users = await getUsers();

  return (
    <div>
      <PageHeader
        title="Benutzer"
        description="Benutzerkonten und Rollen verwalten"
      />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">E-Mail</th>
              <th className="px-4 py-3 font-medium">Rolle</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {u.firstName} {u.lastName}
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{roleLabels[u.role as UserRole]}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.isActive ? "success" : "danger"}>
                    {u.isActive ? "Aktiv" : "Deaktiviert"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
