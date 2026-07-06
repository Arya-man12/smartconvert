import { nanoid } from "nanoid";
import { db, historyTable } from "@workspace/db";
import type { HistoryEntryType } from "@workspace/api-zod";

export async function recordHistory(
  type: HistoryEntryType,
  summary: string,
  detail: string | null = null,
): Promise<void> {
  await db.insert(historyTable).values({
    id: nanoid(),
    type,
    summary,
    detail,
  });
}
