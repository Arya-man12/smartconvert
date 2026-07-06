import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const historyTable = pgTable("history", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["convert", "compress", "adaptive", "benchmark"] }).notNull(),
  summary: text("summary").notNull(),
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHistorySchema = createInsertSchema(historyTable).omit({ createdAt: true });
export type InsertHistory = z.infer<typeof insertHistorySchema>;
export type HistoryRow = typeof historyTable.$inferSelect;
