"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileDown, Package, PackageCheck, X } from "lucide-react";
import { ProductCondition } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { PhotoCaptureButtons } from "@/components/shared/photo-capture-buttons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  performCheckIn,
  performCheckOut,
  uploadCheckoutImage,
} from "@/lib/actions/checkout";
import { bookingStatusLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

type CheckoutBooking = {
  id: string;
  bookingNumber: string;
  status: string;
  startDate: Date;
  plannedReturnDate: Date;
  customer: { companyName: string } | null;
  contactName: string | null;
  items: {
    product: {
      id: string;
      name: string;
      inventoryNumber: string;
      condition?: ProductCondition;
    };
  }[];
};

type CheckInFlags = {
  conditionChecked: boolean;
  accessoriesComplete: boolean;
  serialVerified: boolean;
};

type PendingPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
};

export function CheckoutWizard({ bookings }: { bookings: CheckoutBooking[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"checkout" | "checkin">("checkout");
  const [selectedBooking, setSelectedBooking] = useState<CheckoutBooking | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [checkInFlags, setCheckInFlags] = useState<Record<string, CheckInFlags>>({});
  const [photosByProduct, setPhotosByProduct] = useState<Record<string, PendingPhoto[]>>(
    {}
  );
  const [recipientName, setRecipientName] = useState("");
  const [recipientSigned, setRecipientSigned] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastCheckOutId, setLastCheckOutId] = useState<string | null>(null);
  const [lastCheckInId, setLastCheckInId] = useState<string | null>(null);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [checkinDialogStep, setCheckinDialogStep] = useState<"ask" | "protocol">("ask");

  const checkoutReady = useMemo(
    () =>
      bookings.filter((b) =>
        ["ABHOLBEREIT", "BESTAETIGT", "IN_VORBEREITUNG"].includes(b.status)
      ),
    [bookings]
  );
  const returnReady = useMemo(
    () =>
      bookings.filter((b) =>
        ["AKTIV", "AUSGEGEBEN", "UNTERWEGS", "RUECKGABE_FAELLIG", "UEBERFAELLIG"].includes(
          b.status
        )
      ),
    [bookings]
  );

  function clearPhotos(state: Record<string, PendingPhoto[]>) {
    for (const photos of Object.values(state)) {
      for (const photo of photos) URL.revokeObjectURL(photo.previewUrl);
    }
  }

  function selectBooking(booking: CheckoutBooking) {
    clearPhotos(photosByProduct);
    setSelectedBooking(booking);
    setCheckedItems({});
    setNotes("");
    setRecipientName(booking.contactName ?? "");
    setRecipientSigned(false);
    setError("");
    setSuccess("");
    setLastCheckOutId(null);
    setLastCheckInId(null);
    setCheckinDialogOpen(false);
    setCheckinDialogStep("ask");
    setPhotosByProduct({});
    const flags: Record<string, CheckInFlags> = {};
    for (const item of booking.items) {
      flags[item.product.id] = {
        conditionChecked: false,
        accessoriesComplete: false,
        serialVerified: false,
      };
    }
    setCheckInFlags(flags);
  }

  function toggleItem(productId: string) {
    setCheckedItems((prev) => ({ ...prev, [productId]: !prev[productId] }));
  }

  function updateCheckInFlag(
    productId: string,
    key: keyof CheckInFlags,
    value: boolean
  ) {
    setCheckInFlags((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] ?? {
          conditionChecked: false,
          accessoriesComplete: false,
          serialVerified: false,
        }),
        [key]: value,
      },
    }));
  }

  function addPhotos(productId: string, files: File[] | FileList | null) {
    if (!files?.length) return;
    const list = Array.isArray(files) ? files : Array.from(files);
    const next: PendingPhoto[] = list.map((file) => ({
      id: `${productId}-${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      caption: "",
    }));
    setPhotosByProduct((prev) => ({
      ...prev,
      [productId]: [...(prev[productId] ?? []), ...next],
    }));
  }

  function removePhoto(productId: string, photoId: string) {
    setPhotosByProduct((prev) => {
      const current = prev[productId] ?? [];
      const target = current.find((p) => p.id === photoId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return {
        ...prev,
        [productId]: current.filter((p) => p.id !== photoId),
      };
    });
  }

  function updatePhotoCaption(productId: string, photoId: string, caption: string) {
    setPhotosByProduct((prev) => ({
      ...prev,
      [productId]: (prev[productId] ?? []).map((photo) =>
        photo.id === photoId ? { ...photo, caption } : photo
      ),
    }));
  }

  async function handleCheckout() {
    if (!selectedBooking) return;
    setLoading(true);
    setError("");
    setSuccess("");
    setLastCheckOutId(null);

    try {
      const images: { productId: string; url: string; caption?: string }[] = [];

      for (const [productId, photos] of Object.entries(photosByProduct)) {
        for (const photo of photos) {
          const fd = new FormData();
          fd.set("file", photo.file);
          if (photo.caption.trim()) fd.set("caption", photo.caption.trim());
          const uploaded = await uploadCheckoutImage(fd);
          if (!uploaded.success || !uploaded.data) {
            setError(uploaded.error ?? "Bild-Upload fehlgeschlagen.");
            setLoading(false);
            return;
          }
          images.push({
            productId,
            url: uploaded.data.url,
            caption: uploaded.data.caption,
          });
        }
      }

      const result = await performCheckOut({
        bookingId: selectedBooking.id,
        notes: notes || undefined,
        recipientName: recipientName.trim() || undefined,
        recipientSigned,
        items: selectedBooking.items.map((item) => ({
          productId: item.product.id,
          condition: item.product.condition ?? "GUT",
          serialVerified: true,
          accessoriesChecked: true,
        })),
        images,
      });

      if (!result.success || !result.data) {
        setError(result.error ?? "Übergabe fehlgeschlagen.");
        setLoading(false);
        return;
      }

      clearPhotos(photosByProduct);
      setPhotosByProduct({});
      setLastCheckOutId(result.data.checkOutId);
      setSuccess("Übergabe erfolgreich bestätigt. Übergabeprotokoll ist bereit.");
      setSelectedBooking(null);
      router.refresh();
    } catch {
      setError("Übergabe fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  function openCheckinDialog() {
    if (!selectedBooking) return;
    const incomplete = selectedBooking.items.some((item) => {
      const flags = checkInFlags[item.product.id];
      return !flags?.conditionChecked || !flags?.accessoriesComplete;
    });
    if (incomplete) {
      setError("Bitte Zustand und Zubehör für alle Produkte bestätigen.");
      return;
    }
    setError("");
    setCheckinDialogStep("ask");
    setCheckinDialogOpen(true);
  }

  async function completeCheckin(createProtocol: boolean) {
    if (!selectedBooking) return;
    setLoading(true);
    setError("");
    setSuccess("");
    setLastCheckInId(null);

    try {
      const images: { productId: string; url: string; caption?: string }[] = [];

      if (createProtocol) {
        for (const [productId, photos] of Object.entries(photosByProduct)) {
          for (const photo of photos) {
            const fd = new FormData();
            fd.set("file", photo.file);
            fd.set("folder", "return");
            if (photo.caption.trim()) fd.set("caption", photo.caption.trim());
            const uploaded = await uploadCheckoutImage(fd);
            if (!uploaded.success || !uploaded.data) {
              setError(uploaded.error ?? "Bild-Upload fehlgeschlagen.");
              setLoading(false);
              return;
            }
            images.push({
              productId,
              url: uploaded.data.url,
              caption: uploaded.data.caption,
            });
          }
        }
      }

      const result = await performCheckIn({
        bookingId: selectedBooking.id,
        notes: notes || undefined,
        cleaningCostCents: 0,
        repairCostCents: 0,
        createProtocol,
        images: createProtocol ? images : [],
        items: selectedBooking.items.map((item) => {
          const flags = checkInFlags[item.product.id];
          return {
            productId: item.product.id,
            condition: item.product.condition ?? "GUT",
            notes: flags?.serialVerified ? "Seriennummer verifiziert" : undefined,
          };
        }),
      });

      if (!result.success || !result.data) {
        setError(result.error ?? "Rücknahme fehlgeschlagen.");
        setLoading(false);
        return;
      }

      clearPhotos(photosByProduct);
      setPhotosByProduct({});
      setCheckinDialogOpen(false);
      setCheckinDialogStep("ask");
      setLastCheckInId(createProtocol ? result.data.checkInId : null);

      const shortened = result.data.planningShortened
        ? " Freie Tage in der Planung wurden freigegeben."
        : "";
      setSuccess(
        createProtocol
          ? `Rücknahme bestätigt. Rücknahmeprotokoll ist bereit.${shortened}`
          : `Rücknahme erfolgreich bestätigt.${shortened}`
      );
      setSelectedBooking(null);
      router.refresh();
    } catch {
      setError("Rücknahme fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  const list = tab === "checkout" ? checkoutReady : returnReady;

  return (
    <div>
      <PageHeader
        title="Übergabe & Rücknahme"
        description="Geräte an den Kunden übergeben und bei Rücknahme prüfen"
      />

      {success && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <p>{success}</p>
          <div className="flex flex-wrap gap-2">
            {lastCheckOutId && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/checkout/${lastCheckOutId}/pdf`} target="_blank" rel="noreferrer">
                  <FileDown className="mr-2 h-4 w-4" />
                  Übergabeprotokoll PDF
                </a>
              </Button>
            )}
            {lastCheckInId && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/checkin/${lastCheckInId}/pdf`} target="_blank" rel="noreferrer">
                  <FileDown className="mr-2 h-4 w-4" />
                  Rücknahmeprotokoll PDF
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as "checkout" | "checkin");
          setSelectedBooking(null);
          setError("");
          setSuccess("");
          setLastCheckOutId(null);
          setLastCheckInId(null);
          setCheckinDialogOpen(false);
          setCheckinDialogStep("ask");
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="checkout">
            <Package className="mr-2 h-4 w-4" />
            Übergeben ({checkoutReady.length})
          </TabsTrigger>
          <TabsTrigger value="checkin">
            <PackageCheck className="mr-2 h-4 w-4" />
            Zurücknehmen ({returnReady.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkout">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Bereit zur Übergabe</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.length === 0 ? (
                  <p className="text-sm text-gray-500">Keine Übergaben anstehend.</p>
                ) : (
                  list.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => selectBooking(b)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selectedBooking?.id === b.id
                          ? "border-flx-blue bg-flx-blue-light"
                          : "border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-medium">{b.bookingNumber}</div>
                      <div className="text-xs text-gray-500">
                        {b.customer?.companyName ?? b.contactName} · {formatDate(b.startDate)}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Übergabe-Assistent</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedBooking ? (
                  <p className="text-sm text-gray-500">Buchung aus der Liste auswählen.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link
                          href={`/buchungen/${selectedBooking.id}`}
                          className="font-medium text-flx-blue hover:underline"
                        >
                          {selectedBooking.bookingNumber}
                        </Link>
                        <Badge className="ml-2" variant="secondary">
                          {
                            bookingStatusLabels[
                              selectedBooking.status as keyof typeof bookingStatusLabels
                            ]
                          }
                        </Badge>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="recipientName">Empfänger</Label>
                        <Input
                          id="recipientName"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          placeholder="Name des Empfängers"
                        />
                      </div>
                      <label className="mt-7 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={recipientSigned}
                          onChange={(e) => setRecipientSigned(e.target.checked)}
                        />
                        Empfänger-Unterschrift bestätigt
                      </label>
                    </div>

                    <div className="space-y-3">
                      <Label>Produkte prüfen, abhaken und fotografieren</Label>
                      {selectedBooking.items.map((item) => {
                        const photos = photosByProduct[item.product.id] ?? [];
                        return (
                          <div
                            key={item.product.id}
                            className="space-y-3 rounded-md border border-gray-100 p-3"
                          >
                            <label className="flex cursor-pointer items-center gap-3 text-sm">
                              <input
                                type="checkbox"
                                checked={checkedItems[item.product.id] ?? false}
                                onChange={() => toggleItem(item.product.id)}
                              />
                              <span className="font-mono text-xs text-gray-400">
                                {item.product.inventoryNumber}
                              </span>
                              <span className="font-medium">{item.product.name}</span>
                            </label>

                            <div className="space-y-2 pl-7">
                              <div className="flex flex-wrap items-center gap-2">
                                <PhotoCaptureButtons
                                  onAdd={(files) => addPhotos(item.product.id, files)}
                                />
                                <span className="text-xs text-gray-400">
                                  {photos.length} Foto(s) – erscheinen im PDF
                                </span>
                              </div>

                              {photos.length > 0 && (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {photos.map((photo) => (
                                    <div
                                      key={photo.id}
                                      className="overflow-hidden rounded-md border border-gray-100 bg-gray-50"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={photo.previewUrl}
                                        alt="Vorschau"
                                        className="h-28 w-full object-cover"
                                      />
                                      <div className="flex items-center gap-1 p-2">
                                        <Input
                                          value={photo.caption}
                                          onChange={(e) =>
                                            updatePhotoCaption(
                                              item.product.id,
                                              photo.id,
                                              e.target.value
                                            )
                                          }
                                          placeholder="z.B. Gesamtansicht Zange"
                                          className="h-8 text-xs"
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 shrink-0"
                                          onClick={() =>
                                            removePhoto(item.product.id, photo.id)
                                          }
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkoutNotes">Notizen zur Übergabe</Label>
                      <Textarea
                        id="checkoutNotes"
                        rows={2}
                        placeholder="Zustand, Zubehör, Empfänger…"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    {error && <p className="text-sm text-status-damage">{error}</p>}

                    <Button
                      disabled={
                        loading ||
                        selectedBooking.items.some((i) => !checkedItems[i.product.id])
                      }
                      onClick={handleCheckout}
                    >
                      {loading ? "Wird gespeichert…" : "Übergabe bestätigen & Protokoll erzeugen"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="checkin">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Bereit zur Rücknahme</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {returnReady.length === 0 ? (
                  <p className="text-sm text-gray-500">Keine Rücknahmen anstehend.</p>
                ) : (
                  returnReady.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => selectBooking(b)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                        selectedBooking?.id === b.id
                          ? "border-flx-blue bg-flx-blue-light"
                          : "border-gray-100 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-medium">{b.bookingNumber}</div>
                      <div className="text-xs text-gray-500">
                        Rücknahme: {formatDate(b.plannedReturnDate)}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Rücknahme-Assistent</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedBooking ||
                !["AKTIV", "AUSGEGEBEN", "UNTERWEGS", "RUECKGABE_FAELLIG", "UEBERFAELLIG"].includes(
                  selectedBooking.status
                ) ? (
                  <p className="text-sm text-gray-500">Buchung aus der Liste auswählen.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedBooking.items.map((item) => {
                      const flags = checkInFlags[item.product.id];
                      return (
                        <div
                          key={item.product.id}
                          className="rounded-md border border-gray-100 p-3 text-sm"
                        >
                          <div className="font-medium">{item.product.name}</div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={flags?.conditionChecked ?? false}
                                onChange={(e) =>
                                  updateCheckInFlag(
                                    item.product.id,
                                    "conditionChecked",
                                    e.target.checked
                                  )
                                }
                              />
                              Zustand geprüft
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={flags?.accessoriesComplete ?? false}
                                onChange={(e) =>
                                  updateCheckInFlag(
                                    item.product.id,
                                    "accessoriesComplete",
                                    e.target.checked
                                  )
                                }
                              />
                              Zubehör vollständig
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={flags?.serialVerified ?? false}
                                onChange={(e) =>
                                  updateCheckInFlag(
                                    item.product.id,
                                    "serialVerified",
                                    e.target.checked
                                  )
                                }
                              />
                              Seriennummer verifiziert
                            </label>
                          </div>
                        </div>
                      );
                    })}
                    <div className="space-y-2">
                      <Label htmlFor="checkinNotes">Notizen zur Rücknahme</Label>
                      <Textarea
                        id="checkinNotes"
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    {error && <p className="text-sm text-status-damage">{error}</p>}
                    <Button disabled={loading} onClick={openCheckinDialog}>
                      Rücknahme bestätigen
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog
        open={checkinDialogOpen}
        onOpenChange={(open) => {
          if (loading) return;
          setCheckinDialogOpen(open);
          if (!open) setCheckinDialogStep("ask");
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          {checkinDialogStep === "ask" ? (
            <>
              <DialogHeader>
                <DialogTitle>Rücknahmeprotokoll erstellen?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-600">
                Soll für diese Rücknahme ein Bericht mit optionalen Fotos erstellt werden?
                Bei früherer Rückgabe wird die Planung automatisch verkürzt.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={() => completeCheckin(false)}
                >
                  {loading ? "Wird gespeichert…" : "Nein, nur zurücknehmen"}
                </Button>
                <Button
                  disabled={loading}
                  onClick={() => setCheckinDialogStep("protocol")}
                >
                  Ja, Protokoll erstellen
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Rücknahmeprotokoll</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-gray-600">
                Optional Fotos der zurückgenommenen Geräte hinzufügen. Danach wird das
                Protokoll als PDF verfügbar.
              </p>
              {selectedBooking && (
                <div className="space-y-3">
                  {selectedBooking.items.map((item) => {
                    const photos = photosByProduct[item.product.id] ?? [];
                    return (
                      <div
                        key={item.product.id}
                        className="space-y-2 rounded-md border border-gray-100 p-3"
                      >
                        <div className="text-sm font-medium">{item.product.name}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <PhotoCaptureButtons
                            onAdd={(files) => addPhotos(item.product.id, files)}
                          />
                          <span className="text-xs text-gray-400">{photos.length} Foto(s)</span>
                        </div>
                        {photos.length > 0 && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {photos.map((photo) => (
                              <div
                                key={photo.id}
                                className="overflow-hidden rounded-md border border-gray-100 bg-gray-50"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo.previewUrl}
                                  alt="Vorschau"
                                  className="h-24 w-full object-cover"
                                />
                                <div className="flex items-center gap-1 p-2">
                                  <Input
                                    value={photo.caption}
                                    onChange={(e) =>
                                      updatePhotoCaption(
                                        item.product.id,
                                        photo.id,
                                        e.target.value
                                      )
                                    }
                                    placeholder="z.B. Zustand nach Einsatz"
                                    className="h-8 text-xs"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0"
                                    onClick={() => removePhoto(item.product.id, photo.id)}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {error && <p className="text-sm text-status-damage">{error}</p>}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  disabled={loading}
                  onClick={() => setCheckinDialogStep("ask")}
                >
                  Zurück
                </Button>
                <Button disabled={loading} onClick={() => completeCheckin(true)}>
                  {loading ? "Wird gespeichert…" : "Mit Protokoll zurücknehmen"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
