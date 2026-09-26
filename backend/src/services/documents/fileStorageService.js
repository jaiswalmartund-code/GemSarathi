// File storage driver (Canonical implementation under Document Services).
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../../config/index.js";

const BUCKET = process.env.SUPABASE_BUCKET || "bids";

export function storageMode() {
  const dbMode = (process.env.DB_MODE || "file").toLowerCase();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  return dbMode === "supabase" && process.env.SUPABASE_URL && key
    ? "supabase"
    : "local";
}

async function supabaseAdmin() {
  const { createClient } = await import("@supabase/supabase-js");
  const rawUrl = (process.env.SUPABASE_URL || "").replace(/\/rest\/v1\/?$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  return createClient(rawUrl, key, {
    auth: { persistSession: false },
  });
}

function safeName(name) {
  return path.basename(name || "upload.bin").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export async function saveUpload(file) {
  if (storageMode() === "supabase") {
    const supabase = await supabaseAdmin();
    const buffer = await fs.readFile(file.path);
    const key = `${Date.now()}_${safeName(file.originalname)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
      contentType: file.mimetype || "application/octet-stream",
      upsert: false,
    });
    await fs.unlink(file.path).catch(() => {});
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    return { storagePath: `supabase://${BUCKET}/${key}`, fileSize: buffer.length };
  }
  await fs.mkdir(config.uploadDir, { recursive: true });
  const target = path.join(config.uploadDir, `${file.filename}_${safeName(file.originalname)}`);
  await fs.rename(file.path, target);
  return { storagePath: target, fileSize: file.size };
}

export async function saveBuffer(filename, buffer, mimeType = "application/octet-stream") {
  if (storageMode() === "supabase") {
    const supabase = await supabaseAdmin();
    const key = `${Date.now()}_${safeName(filename)}`;
    const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) throw new Error(`Supabase upload failed: ${error.message}`);
    return { storagePath: `supabase://${BUCKET}/${key}`, fileSize: buffer.length };
  }
  await fs.mkdir(config.uploadDir, { recursive: true });
  const target = path.join(config.uploadDir, safeName(filename));
  await fs.writeFile(target, buffer);
  return { storagePath: target, fileSize: buffer.length };
}

export async function fileExists(storagePath) {
  if (!storagePath) return false;
  if (storagePath.startsWith("supabase://")) return true;
  try {
    await fs.access(storagePath);
    return true;
  } catch {
    return false;
  }
}

export async function readFile(storagePath) {
  if (storagePath.startsWith("supabase://")) {
    const supabase = await supabaseAdmin();
    const [, rest] = storagePath.split("supabase://");
    const slash = rest.indexOf("/");
    const bucket = rest.slice(0, slash);
    const key = rest.slice(slash + 1);
    const { data, error } = await supabase.storage.from(bucket).download(key);
    if (error) throw new Error(`Supabase download failed: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
  return fs.readFile(storagePath);
}
