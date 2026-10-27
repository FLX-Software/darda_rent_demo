"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createCustomer, deleteCustomer, updateCustomer } from "@/lib/actions/customers";

export type CustomerFormValues = {
  id: string;
  customerNumber: string;
  companyName: string;
  billingStreet: string;
  billingCity: string;
  billingZip: string;
  billingCountry: string;
  industry?: string | null;
  email?: string | null;
  phone?: string | null;
  paymentTerms: number;
  discountPercent: number;
  notes?: string | null;
  isActive: boolean;
};

interface CustomerFormProps {
  mode?: "create" | "edit";
  initial?: CustomerFormValues;
}

export function CustomerForm({ mode = "create", initial }: CustomerFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit" && !!initial;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const paymentTermsRaw = fd.get("paymentTerms")?.toString().trim();
    const discountRaw = fd.get("discountPercent")?.toString().trim();
    const paymentTerms = paymentTermsRaw ? Number.parseInt(paymentTermsRaw, 10) : 30;
    const discountPercent = discountRaw
      ? Number.parseFloat(discountRaw.replace(",", "."))
      : 0;

    const payload = {
      companyName: fd.get("companyName") as string,
      billingStreet: fd.get("billingStreet") as string,
      billingCity: fd.get("billingCity") as string,
      billingZip: fd.get("billingZip") as string,
      billingCountry: (fd.get("billingCountry") as string) || "Deutschland",
      paymentTerms: Number.isFinite(paymentTerms) ? paymentTerms : 30,
      discountPercent: Number.isFinite(discountPercent) ? discountPercent : 0,
      email: (fd.get("email") as string) || undefined,
      phone: (fd.get("phone") as string) || undefined,
      industry: (fd.get("industry") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    };

    try {
      const result = isEdit
        ? await updateCustomer(initial!.id, { ...payload, isActive })
        : await createCustomer(payload);

      if (!result.success || !result.data) {
        setError(
          result.error ??
            (isEdit
              ? "Kunde konnte nicht gespeichert werden."
              : "Kunde konnte nicht angelegt werden.")
        );
        setLoading(false);
        return;
      }

      router.push(`/kunden/${result.data.id}`);
    } catch {
      setError(
        isEdit
          ? "Kunde konnte nicht gespeichert werden."
          : "Kunde konnte nicht angelegt werden."
      );
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={isEdit ? "Kunde bearbeiten" : "Neuer Kunde"}
        description={
          isEdit
            ? `Kundennr. ${initial!.customerNumber}`
            : "Neuen Geschäftskunden anlegen"
        }
        backHref={isEdit ? `/kunden/${initial!.id}` : "/kunden"}
      />

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Firmenname *</Label>
              <Input
                id="companyName"
                name="companyName"
                required
                defaultValue={initial?.companyName}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="billingStreet">Straße *</Label>
                <Input
                  id="billingStreet"
                  name="billingStreet"
                  required
                  defaultValue={initial?.billingStreet}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingZip">PLZ *</Label>
                <Input
                  id="billingZip"
                  name="billingZip"
                  required
                  defaultValue={initial?.billingZip}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="billingCity">Ort *</Label>
                <Input
                  id="billingCity"
                  name="billingCity"
                  required
                  defaultValue={initial?.billingCity}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingCountry">Land</Label>
                <Input
                  id="billingCountry"
                  name="billingCountry"
                  defaultValue={initial?.billingCountry ?? "Deutschland"}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="industry">Branche</Label>
                <Input
                  id="industry"
                  name="industry"
                  placeholder="z.B. Bau, Abbruch"
                  defaultValue={initial?.industry ?? undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={initial?.phone ?? undefined}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={initial?.email ?? undefined}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Zahlungsziel (Tage)</Label>
                <Input
                  id="paymentTerms"
                  name="paymentTerms"
                  type="number"
                  min="0"
                  defaultValue={initial?.paymentTerms ?? 30}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discountPercent">Rabatt (%)</Label>
                <Input
                  id="discountPercent"
                  name="discountPercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  defaultValue={initial?.discountPercent ?? 0}
                />
              </div>
              {isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="isActive">Status</Label>
                  <select
                    id="isActive"
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                    value={isActive ? "active" : "inactive"}
                    onChange={(e) => setIsActive(e.target.value === "active")}
                  >
                    <option value="active">Aktiv</option>
                    <option value="inactive">Inaktiv</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={initial?.notes ?? undefined}
              />
            </div>

            {error && <p className="text-sm text-status-damage">{error}</p>}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={loading}>
                {loading
                  ? isEdit
                    ? "Wird gespeichert…"
                    : "Wird angelegt…"
                  : isEdit
                    ? "Speichern"
                    : "Kunde anlegen"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Abbrechen
              </Button>
              {isEdit && initial && (
                <div className="ml-auto">
                  <ConfirmDeleteButton
                    entityLabel="Kunde"
                    entityName={initial.companyName}
                    description={
                      <>
                        Möchten Sie den Kunden{" "}
                        <span className="font-semibold text-flx-navy">{initial.companyName}</span>{" "}
                        wirklich löschen? Bei vorhandenen Buchungen wird der Kunde nur deaktiviert.
                      </>
                    }
                    onDelete={() => deleteCustomer(initial.id)}
                    redirectTo="/kunden"
                  />
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
