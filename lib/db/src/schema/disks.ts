import { pgTable, text, bigint, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const disksTable = pgTable("disks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  path: text("path").notNull(),
  totalBytes: bigint("total_bytes", { mode: "number" }).notNull().default(0),
  usedBytes: bigint("used_bytes", { mode: "number" }).notNull().default(0),
  freeBytes: bigint("free_bytes", { mode: "number" }).notNull().default(0),
  isBackup: boolean("is_backup").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  label: text("label"),
  mountPoint: text("mount_point"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDiskSchema = createInsertSchema(disksTable).omit({ createdAt: true });
export type InsertDisk = z.infer<typeof insertDiskSchema>;
export type Disk = typeof disksTable.$inferSelect;
