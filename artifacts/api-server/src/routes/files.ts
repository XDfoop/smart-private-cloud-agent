import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, filesTable } from "@workspace/db";
import {
  GetFileParams,
  MoveFileParams,
  MoveFileBody,
  DeleteFileParams,
  ListFilesQueryParams,
  GetRecentFilesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/files/recent", async (req, res): Promise<void> => {
  const params = GetRecentFilesQueryParams.safeParse(req.query);
  const limit = params.success && params.data.limit ? params.data.limit : 10;
  const files = await db.select().from(filesTable)
    .orderBy(desc(filesTable.accessedAt))
    .limit(limit);
  res.json({ files });
});

router.get("/files/categories", async (_req, res): Promise<void> => {
  const rows = await db.select({
    category: filesTable.category,
    count: sql<number>`cast(count(*) as int)`,
    totalBytes: sql<number>`cast(sum(${filesTable.sizeBytes}) as bigint)`,
  }).from(filesTable).groupBy(filesTable.category);

  const colorMap: Record<string, string> = {
    images: "#06b6d4",
    videos: "#8b5cf6",
    documents: "#f59e0b",
    audio: "#10b981",
    archives: "#ef4444",
    code: "#3b82f6",
    other: "#6b7280",
  };

  const categories = rows.map(r => ({
    category: r.category,
    count: r.count,
    totalBytes: r.totalBytes,
    color: colorMap[r.category] ?? "#6b7280",
  }));
  res.json({ categories });
});

router.get("/files", async (req, res): Promise<void> => {
  const params = ListFilesQueryParams.safeParse(req.query);
  let query = db.select().from(filesTable);
  const conditions = [];

  if (params.success) {
    if (params.data.diskId) {
      conditions.push(eq(filesTable.diskId, params.data.diskId));
    }
    if (params.data.category) {
      conditions.push(eq(filesTable.category, params.data.category));
    }
  }

  let files;
  if (conditions.length > 0) {
    files = await (query as ReturnType<typeof db.select>).where(conditions[0]).orderBy(desc(filesTable.modifiedAt));
  } else {
    files = await query.orderBy(desc(filesTable.modifiedAt));
  }

  res.json({ files, total: files.length });
});

router.get("/files/:fileId", async (req, res): Promise<void> => {
  const params = GetFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [file] = await db.select().from(filesTable).where(eq(filesTable.id, params.data.fileId));
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.json(file);
});

router.patch("/files/:fileId", async (req, res): Promise<void> => {
  const params = MoveFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = MoveFileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { modifiedAt: new Date() };
  if (parsed.data.newPath !== undefined) updateData.path = parsed.data.newPath;
  if (parsed.data.diskId !== undefined) updateData.diskId = parsed.data.diskId;
  if (parsed.data.aiApproved !== undefined) updateData.aiApproved = parsed.data.aiApproved;

  const [file] = await db.update(filesTable).set(updateData).where(eq(filesTable.id, params.data.fileId)).returning();
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.json(file);
});

router.delete("/files/:fileId", async (req, res): Promise<void> => {
  const params = DeleteFileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [file] = await db.delete(filesTable).where(eq(filesTable.id, params.data.fileId)).returning();
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
