import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, historyTable } from "@workspace/db";
import { ListHistoryResponse, DeleteHistoryEntryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/history", async (_req, res): Promise<void> => {
  const rows = await db.select().from(historyTable).orderBy(desc(historyTable.createdAt)).limit(200);
  res.json(ListHistoryResponse.parse(rows));
});

router.delete("/history", async (_req, res): Promise<void> => {
  await db.delete(historyTable);
  res.sendStatus(204);
});

router.delete("/history/:id", async (req, res): Promise<void> => {
  const params = DeleteHistoryEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "History entry not found" });
    return;
  }

  const [row] = await db.delete(historyTable).where(eq(historyTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "History entry not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
