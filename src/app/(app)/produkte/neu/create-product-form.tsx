"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ProductCondition } from "@prisma/client";
import { ImagePlus, X } from "lucide-react";
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
import { createProductFromForm } from "@/lib/actions/products";
import { productConditionLabels } from "@/lib/labels";

interface CreateProductFormProps {
  categories: { id: string; name: string }[];
  locations: { id: string; name: string }[];
}

export function CreateProductForm({ categories, locations }: CreateProductFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [condition, setCondition] = useState<ProductCondition>("GUT");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (file: File | null) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!categoryId) {
      setError("Bitte eine Kategorie wählen.");
      setLoading(false);
      return;
    }

    const fd = new FormData(e.currentTarget);
    fd.set("categoryId", categoryId);
    fd.set("locationId", locationId);
    fd.set("condition", condition);
    if (imageFile) {
      fd.set("image", imageFile);
    }

    try {
      const result = await createProductFromForm(fd);
      if (!result.success || !result.data) {
        setError(result.error ?? "Fehler beim Anlegen des Produkts.");
        setLoading(false);
        return;
      }
      router.push(`/produkte/${result.data.id}`);
    } catch {
      setError("Fehler beim Anlegen des Produkts.");
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Neues Produkt"
        description="Werkzeug oder Gerät dem Vermietbestand hinzufügen"
        backHref="/produkte"
      />

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Produktbild */}
            <div className="space-y-2">
              <Label>Produktbild</Label>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div
                  className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-flx-blue hover:bg-flx-blue-light/30 sm:w-48"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file?.type.startsWith("image/")) handleImageChange(file);
                  }}
                >
                  {imagePreview ? (
                    <div className="relative h-full w-full overflow-hidden rounded-lg">
                      <Image
                        src={imagePreview}
                        alt="Vorschau"
                        fill
                        className="object-contain p-2"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <>
                      <ImagePlus className="mb-2 h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-500">Bild hochladen</span>
                      <span className="text-xs text-gray-400">JPG, PNG, WebP · max. 10 MB</span>
                    </>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    {imageFile ? "Anderes Bild wählen" : "Bild auswählen"}
                  </Button>
                  {imageFile && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="truncate">{imageFile.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          handleImageChange(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-gray-400 hover:text-status-damage"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">
                    Das Bild wird als Hauptbild des Produkts gespeichert.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Produktname *</Label>
                <Input id="name" name="name" required placeholder="z.B. Darda MC300 Zange" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modell *</Label>
                <Input id="model" name="model" required placeholder="z.B. MC300" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inventoryNumber">Inventarnummer *</Label>
                <Input id="inventoryNumber" name="inventoryNumber" required placeholder="DARDA-MC300-002" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Seriennummer *</Label>
                <Input id="serialNumber" name="serialNumber" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Kategorie *</Label>
                <Select value={categoryId} onValueChange={setCategoryId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationId">Standort</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Standort wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dailyRate">Tagessatz (€) *</Label>
                <Input id="dailyRate" name="dailyRate" type="number" step="0.01" min="0" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Zustand</Label>
                <Select value={condition} onValueChange={(v) => setCondition(v as ProductCondition)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(productConditionLabels) as ProductCondition[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {productConditionLabels[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>

            {error && <p className="text-sm text-status-damage">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Wird angelegt…" : "Produkt anlegen"}
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
