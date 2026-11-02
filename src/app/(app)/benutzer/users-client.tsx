"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { roleLabels } from "@/lib/permissions";
import {
  MAX_ACTIVE_ADMINS,
  MAX_ACTIVE_STANDARD_USERS,
  MAX_ACTIVE_USERS,
  isAdminRole,
} from "@/lib/user-limits";
import { createUser, deleteUser, updateUser } from "@/lib/actions/users";

export type UserListItem = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
};

const ALL_ROLES = Object.keys(roleLabels) as UserRole[];

type Limits = {
  totalActive: number;
  activeAdmins: number;
  activeStandard: number;
  message: string;
};

export function UsersClient({
  users,
  currentUserId,
  canEdit,
  limits,
}: {
  users: UserListItem[];
  currentUserId: string;
  canEdit: boolean;
  limits: Limits;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("LESEND");
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canCreateMore = limits.totalActive < MAX_ACTIVE_USERS;

  function resetForm(defaults?: Partial<UserListItem>) {
    setFirstName(defaults?.firstName ?? "");
    setLastName(defaults?.lastName ?? "");
    setEmail(defaults?.email ?? "");
    setPhone(defaults?.phone ?? "");
    setRole(defaults?.role ?? "LESEND");
    setIsActive(defaults?.isActive ?? true);
    setPassword("");
    setError("");
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setCreating(true);
  }

  function openEdit(user: UserListItem) {
    setCreating(false);
    setEditing(user);
    resetForm(user);
  }

  function closeDialog() {
    setCreating(false);
    setEditing(null);
    setError("");
  }

  async function handleSave() {
    setLoading(true);
    setError("");

    if (creating) {
      const result = await createUser({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        role,
        isActive,
        password,
      });
      setLoading(false);
      if (!result.success) {
        setError(result.error ?? "Anlegen fehlgeschlagen.");
        return;
      }
    } else if (editing) {
      const result = await updateUser(editing.id, {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        role,
        isActive,
        password: password || undefined,
      });
      setLoading(false);
      if (!result.success) {
        setError(result.error ?? "Speichern fehlgeschlagen.");
        return;
      }
    }

    closeDialog();
    router.refresh();
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {limits.message}
          <span className="ml-1 text-gray-400">
            · Limit: {MAX_ACTIVE_ADMINS} Admins + {MAX_ACTIVE_STANDARD_USERS} Benutzer
          </span>
        </p>
        {canEdit && (
          <Button
            type="button"
            size="sm"
            disabled={!canCreateMore}
            title={
              canCreateMore
                ? "Neuen Benutzer anlegen"
                : "Benutzerobergrenze erreicht"
            }
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            Neuer Benutzer
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">E-Mail</th>
              <th className="px-4 py-3 font-medium">Rolle</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canEdit && <th className="px-4 py-3 text-right font-medium">Aktionen</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">
                  {u.firstName} {u.lastName}
                  {u.id === currentUserId && (
                    <span className="ml-2 text-xs font-normal text-gray-400">(Sie)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={isAdminRole(u.role) ? "default" : "secondary"}>
                    {roleLabels[u.role]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.isActive ? "success" : "danger"}>
                    {u.isActive ? "Aktiv" : "Deaktiviert"}
                  </Badge>
                </td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        title="Bearbeiten"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {u.id !== currentUserId && (
                        <ConfirmDeleteButton
                          entityLabel="Benutzer"
                          entityName={`${u.firstName} ${u.lastName}`}
                          description={
                            <>
                              Der Benutzer{" "}
                              <span className="font-semibold text-flx-navy">
                                {u.firstName} {u.lastName}
                              </span>{" "}
                              wird deaktiviert und kann sich nicht mehr anmelden.
                              Historische Daten bleiben erhalten.
                            </>
                          }
                          onDelete={() => deleteUser(u.id)}
                          variant="ghost"
                          size="icon"
                          showLabel={false}
                          className="text-status-damage hover:text-status-damage"
                        />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={creating || !!editing}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {creating ? "Benutzer anlegen" : "Benutzer bearbeiten"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user-firstName">Vorname *</Label>
                <Input
                  id="user-firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-lastName">Nachname *</Label>
                <Input
                  id="user-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">E-Mail *</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-phone">Telefon</Label>
              <Input
                id="user-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Rolle *</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabels[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={isActive ? "active" : "inactive"}
                  onValueChange={(v) => setIsActive(v === "active")}
                  disabled={editing?.id === currentUserId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Deaktiviert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-password">
                {creating ? "Passwort *" : "Neues Passwort"}
              </Label>
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={creating ? "Mindestens 6 Zeichen" : "Leer lassen = unverändert"}
                autoComplete="new-password"
                required={creating}
              />
            </div>

            {error && <p className="text-sm text-status-damage">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Abbrechen
              </Button>
              <Button type="button" disabled={loading} onClick={handleSave}>
                {loading
                  ? creating
                    ? "Wird angelegt…"
                    : "Wird gespeichert…"
                  : creating
                    ? "Anlegen"
                    : "Speichern"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
