import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

export async function saveFile(
  file: File,
  subfolder: string
): Promise<{ url: string; filename: string }> {
  const storageType = (process.env.STORAGE_TYPE || "local").toLowerCase();

  if (storageType === "supabase") {
    return saveToSupabase(file, subfolder);
  }

  if (storageType === "s3") {
    throw new StorageError(
      "S3-Upload ist in dieser Demo deaktiviert. Bitte STORAGE_TYPE=supabase oder local konfigurieren."
    );
  }

  if (process.env.VERCEL) {
    throw new StorageError(
      "Lokaler Dateispeicher ist auf Vercel nicht dauerhaft. Bitte STORAGE_TYPE=supabase und Bucket konfigurieren."
    );
  }

  return saveLocally(file, subfolder);
}

async function saveLocally(
  file: File,
  subfolder: string
): Promise<{ url: string; filename: string }> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name) || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const dir = path.join(process.cwd(), UPLOAD_DIR, subfolder);

  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  return {
    url: `/api/uploads/${subfolder}/${filename}`,
    filename,
  };
}

async function saveToSupabase(
  file: File,
  subfolder: string
): Promise<{ url: string; filename: string }> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "flx-rent-uploads";

  if (!supabaseUrl || !serviceKey) {
    throw new StorageError(
      "Supabase Storage ist nicht konfiguriert (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen)."
    );
  }

  const ext = path.extname(file.name) || ".jpg";
  const filename = `${subfolder}/${uuidv4()}${ext}`;
  const bytes = await file.arrayBuffer();

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.storage.from(bucket).upload(filename, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw new StorageError(`Upload fehlgeschlagen: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
  if (!data?.publicUrl) {
    throw new StorageError("Öffentliche Datei-URL konnte nicht erzeugt werden.");
  }

  return { url: data.publicUrl, filename };
}

export function getPublicUrl(relativePath: string): string {
  if (relativePath.startsWith("http")) return relativePath;
  return relativePath;
}
