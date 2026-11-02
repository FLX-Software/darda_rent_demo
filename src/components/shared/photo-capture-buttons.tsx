"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, ImagePlus, SwitchCamera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FacingMode = "environment" | "user";

interface PhotoCaptureButtonsProps {
  onAdd: (files: File[]) => void;
  disabled?: boolean;
  cameraLabel?: string;
  libraryLabel?: string;
}

export function PhotoCaptureButtons({
  onAdd,
  disabled = false,
  cameraLabel = "Kamera",
  libraryLabel = "Bibliothek",
}: PhotoCaptureButtonsProps) {
  const id = useId();
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [open, setOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function startCamera(mode: FacingMode) {
    setStarting(true);
    setError("");
    stopStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      setFacingMode(mode);

      for (let attempt = 0; attempt < 10; attempt++) {
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          break;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 40));
      }
    } catch {
      setError(
        "Kamera konnte nicht gestartet werden. Bitte Berechtigung erlauben oder die native Kamera nutzen."
      );
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    if (!open) {
      stopStream();
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void startCamera(facingMode);
    }, 50);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopStream();
    };
    // Nur beim Öffnen/Schließen neu starten – Facing-Wechsel über Button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function openCamera() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      nativeCameraInputRef.current?.click();
      return;
    }
    setOpen(true);
  }

  async function switchCamera() {
    const next: FacingMode = facingMode === "environment" ? "user" : "environment";
    await startCamera(next);
  }

  async function takePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92)
      );
      if (!blob) return;

      const file = new File(
        [blob],
        `kamera-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`,
        { type: "image/jpeg" }
      );
      onAdd([file]);
      setOpen(false);
    } finally {
      setCapturing(false);
    }
  }

  function handleFileChange(files: FileList | null) {
    if (!files?.length) return;
    onAdd(Array.from(files));
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 border-dashed"
          onClick={() => void openCamera()}
        >
          <Camera className="h-3.5 w-3.5" />
          {cameraLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-8 border-dashed"
          onClick={() => libraryInputRef.current?.click()}
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {libraryLabel}
        </Button>

        <input
          ref={libraryInputRef}
          id={`${id}-library`}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFileChange(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={nativeCameraInputRef}
          id={`${id}-native-camera`}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFileChange(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) stopStream();
          setOpen(next);
          if (!next) setError("");
        }}
      >
        <DialogContent className="z-[60] max-w-xl gap-3 p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Foto aufnehmen</DialogTitle>
          </DialogHeader>

          <div className="relative overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="aspect-[4/3] w-full object-cover"
            />
            {(starting || error) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center text-sm text-white">
                {starting ? "Kamera wird gestartet…" : error}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={starting || !!error}
              onClick={() => void switchCamera()}
            >
              <SwitchCamera className="h-4 w-4" />
              Kamera wechseln
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  stopStream();
                  setOpen(false);
                  nativeCameraInputRef.current?.click();
                }}
              >
                Geräte-Kamera
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  stopStream();
                  setOpen(false);
                }}
              >
                <X className="h-4 w-4" />
                Abbrechen
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={starting || capturing || !!error}
                onClick={() => void takePhoto()}
              >
                <Camera className="h-4 w-4" />
                {capturing ? "Speichern…" : "Aufnehmen"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
