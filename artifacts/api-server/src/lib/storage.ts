import path from "node:path";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import { db, filesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

export const dataDir = path.resolve(workspaceRoot, "artifacts/api-server/data/files");

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
}

export interface StoredFile {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  downloadUrl: string;
}

export async function saveFile(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): Promise<StoredFile> {
  await ensureDataDir();
  const id = nanoid();
  const storagePath = path.join(dataDir, id);
  await fs.writeFile(storagePath, buffer);

  await db.insert(filesTable).values({
    id,
    fileName,
    mimeType,
    fileSize: buffer.length,
    storagePath,
  });

  return {
    id,
    fileName,
    mimeType,
    fileSize: buffer.length,
    downloadUrl: `/api/files/${id}`,
  };
}

export async function getFile(
  id: string,
): Promise<{ buffer: Buffer; fileName: string; mimeType: string } | null> {
  const [row] = await db.select().from(filesTable).where(eq(filesTable.id, id));
  if (!row) {
    return null;
  }
  try {
    const buffer = await fs.readFile(row.storagePath);
    return { buffer, fileName: row.fileName, mimeType: row.mimeType };
  } catch {
    return null;
  }
}
