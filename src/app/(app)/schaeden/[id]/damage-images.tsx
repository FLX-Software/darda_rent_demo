"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteDamageImage, uploadDamageImage } from "@/lib/actions/damages";

interface DamageImageItem {
  id: string;
  url: string;
  caption: string | null;
}

export function DamageImages({
  damageId,
  images,
}: {
  damageId: string;
  images: DamageImageItem[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleUpload(file: File) {
    setLoading(true);
    setError("");
    const fd = new FormData();
    fd.set("file", file);
    if (caption.trim()) fd.set("caption", caption.trim());

    const result = await uploadDamageImage(damageId, fd);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Upload fehlgeschlagen");
      return;
    }
    setCaption("");
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function handleDelete(imageId: string) {
    setDeletingId(imageId);
    setError("");
    const result = await deleteDamageImage(imageId);
    setDeletingId(null);
    if (!result.success) {
      setError(result.error ?? "Löschen fehlgeschlagen");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {images.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div key={img.id} className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              <div className="relative aspect-[4/3]">
                <Image
                  src={img.url}
                  alt={img.caption ?? "Schadensbild"}
                  fill
                  className="object-contain p-2"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
              </div>
              {img.caption && (
                <p className="border-t border-gray-100 bg-white px-3 py-2 text-xs text-gray-600">
                  {img.caption}
                </p>
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                disabled={deletingId === img.id}
                onClick={() => handleDelete(img.id)}
                aria-label="Bild löschen"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Noch keine Bilder vorhanden.</p>
      )}

      <div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4">
        <div className="space-y-2">
          <Label htmlFor="damage-image-caption">Bildbeschriftung (optional)</Label>
          <Input
            id="damage-image-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="z.B. Leckage rechte Seite"
          />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          {loading ? "Wird hochgeladen…" : "Bild hinzufügen"}
        </Button>
        {error && <p className="text-sm text-status-damage">{error}</p>}
      </div>
    </div>
  );
}
