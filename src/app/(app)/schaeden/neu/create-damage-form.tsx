"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DamageCategory, DamageSeverity } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDamage } from "@/lib/actions/damages";
import { damageCategoryLabels, damageSeverityLabels } from "@/lib/labels";

interface CreateDamageFormProps {
  products: { id: string; name: string; inventoryNumber: string }[];
}

export default function CreateDamageForm({ products }: CreateDamageFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [productId, setProductId] = useState("");
  const [category, setCategory] = useState<DamageCategory>("SONSTIGER_SCHADEN");
  const [severity, setSeverity] = useState<DamageSeverity>("MITTEL");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!productId) return;
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const result = await createDamage({
      productId,
      category,
      severity,
      description: fd.get("description") as string,
      affectedPart: (fd.get("affectedPart") as string) || undefined,
      repairRequired: false,
      stillUsable: false,
      isInsuranceCase: false,
    });
    if (!result.success || !result.data) {
      setLoading(false);
      return;
    }
    router.push(`/schaeden/${result.data.id}`);
  };

  return (
    <div>
      <PageHeader title="Schaden melden" description="Neuen Schaden an einem Produkt erfassen" backHref="/schaeden" />
      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Produkt *</Label>
              <Select value={productId} onValueChange={setProductId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Produkt wählen" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.inventoryNumber} – {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Kategorie *</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as DamageCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(damageCategoryLabels) as DamageCategory[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {damageCategoryLabels[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Schweregrad *</Label>
                <Select value={severity} onValueChange={(v) => setSeverity(v as DamageSeverity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(damageSeverityLabels) as DamageSeverity[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {damageSeverityLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="affectedPart">Betroffenes Bauteil</Label>
              <Input id="affectedPart" name="affectedPart" placeholder="z.B. Hydraulikzylinder" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung *</Label>
              <Textarea id="description" name="description" rows={4} required />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={loading || !productId}>
                {loading ? "Wird gemeldet…" : "Schaden melden"}
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
