import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  activeModelId: text("active_model_id"),
  defaultDiskId: text("default_disk_id"),
  autoOrganize: boolean("auto_organize").notNull().default(false),
  requireApproval: boolean("require_approval").notNull().default(true),
  darkMode: boolean("dark_mode").notNull().default(true),
  language: text("language").notNull().default("th"),
  localLlmEndpoint: text("local_llm_endpoint"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ createdAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
