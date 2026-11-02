import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ folder: string; filename: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  if (process.env.VERCEL && (process.env.STORAGE_TYPE || "local") === "local") {
    return NextResponse.json(
      { error: "Lokale Uploads sind auf Vercel nicht verfügbar" },
      { status: 503 }
    );
  }

  const { folder, filename } = await params;

  if (!/^[\w-]+$/.test(folder) || !/^[\w.-]+$/.test(filename)) {
    return NextResponse.json({ error: "Ungültiger Pfad" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), UPLOAD_DIR, folder, filename);

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
  }
}
