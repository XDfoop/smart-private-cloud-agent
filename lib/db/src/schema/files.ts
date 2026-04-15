import { pgTable, text, bigint, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const filesTable = pgTable("files", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  diskId: text("disk_id").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
  mimeType: text("mime_type"),
  category: text("category").notNull().default("other"),
  aiSuggestedPath: text("ai_suggested_path"),
  aiApproved: boolean("ai_approved").notNull().default(false),
  thumbnail: text("thumbnail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  modifiedAt: timestamp("modified_at", { withTimezone: true }).notNull().defaultNow(),
  accessedAt: timestamp("accessed_at", { withTimezone: true }),
});

export const insertFileSchema = createInsertSchema(filesTable).omit({ createdAt: true, modifiedAt: true });
export type InsertFile = z.infer<typeof insertFileSchema>;
export type FileRecord = typeof filesTable.$inferSelect;
