"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { createCustomer } from "@/lib/actions/customers";

export default function NeuerKundePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createCustomer({
      companyName: fd.get("companyName") as string,
      billingStreet: fd.get("billingStreet") as string,
      billingCity: fd.get("billingCity") as string,
      billingZip: fd.get("billingZip") as string,
      billingCountry: "Deutschland",
      paymentTerms: 30,
      discountPercent: 0,
      email: (fd.get("email") as string) || undefined,
      phone: (fd.get("phone") as string) || undefined,
      industry: (fd.get("industry") as string) || undefined,
      notes: (fd.get("notes") as string) || undefined,
    });
    if (!result.success || !result.data) return;
    router.push(`/kunden/${result.data.id}`);
  };

  return (
    <div>
      <PageHeader title="Neuer Kunde" description="Neuen Geschäftskunden anlegen" backHref="/kunden" />
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Firmenname *</Label>
              <Input id="companyName" name="companyName" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="billingStreet">Straße *</Label>
                <Input id="billingStreet" name="billingStreet" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingZip">PLZ *</Label>
                <Input id="billingZip" name="billingZip" required />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="billingCity">Ort *</Label>
                <Input id="billingCity" name="billingCity" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Branche</Label>
                <Input id="industry" name="industry" placeholder="z.B. Bau, Abbruch" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" name="phone" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notizen</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Wird angelegt…" : "Kunde anlegen"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Abbrechen
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
