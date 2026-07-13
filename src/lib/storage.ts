import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function saveFile(
  file: File,
  subfolder: string
): Promise<{ url: string; filename: string }> {
  const storageType = process.env.STORAGE_TYPE || "local";

  if (storageType === "s3") {
    return saveToS3(file, subfolder);
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

async function saveToS3(
  file: File,
  subfolder: string
): Promise<{ url: string; filename: string }> {
  const ext = path.extname(file.name) || ".jpg";
  const filename = `${subfolder}/${uuidv4()}${ext}`;
  const bytes = await file.arrayBuffer();

  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKey = process.env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY;

  if (!endpoint || !bucket || !accessKey || !secretKey) {
    return saveLocally(file, subfolder);
  }

  const url = `${endpoint}/${bucket}/${filename}`;

  await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `AWS ${accessKey}:${secretKey}`,
      "Content-Type": file.type,
    },
    body: bytes,
  });

  const publicUrl = process.env.S3_PUBLIC_URL
    ? `${process.env.S3_PUBLIC_URL}/${filename}`
    : url;

  return { url: publicUrl, filename };
}

export function getPublicUrl(relativePath: string): string {
  if (relativePath.startsWith("http")) return relativePath;
  return relativePath;
}
