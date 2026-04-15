import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { UpdateSettingsBody } from "@workspace/api-zod";

const DEFAULT_USER_ID = "default-user-1";

const router: IRouter = Router();

router.get("/settings", async (_req, res): Promise<void> => {
  const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, DEFAULT_USER_ID));
  if (!settings) {
    res.status(404).json({ error: "Settings not found" });
    return;
  }
  res.json(settings);
});

router.patch("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.activeModelId !== undefined) updateData.activeModelId = parsed.data.activeModelId;
  if (parsed.data.defaultDiskId !== undefined) updateData.defaultDiskId = parsed.data.defaultDiskId;
  if (parsed.data.autoOrganize !== undefined) updateData.autoOrganize = parsed.data.autoOrganize;
  if (parsed.data.requireApproval !== undefined) updateData.requireApproval = parsed.data.requireApproval;
  if (parsed.data.darkMode !== undefined) updateData.darkMode = parsed.data.darkMode;
  if (parsed.data.language !== undefined) updateData.language = parsed.data.language;
  if (parsed.data.localLlmEndpoint !== undefined) updateData.localLlmEndpoint = parsed.data.localLlmEndpoint;

  const [settings] = await db.update(settingsTable).set(updateData).where(eq(settingsTable.userId, DEFAULT_USER_ID)).returning();
  if (!settings) {
    res.status(404).json({ error: "Settings not found" });
    return;
  }
  res.json(settings);
});

export default router;
