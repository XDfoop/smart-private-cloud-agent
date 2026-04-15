import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, disksTable } from "@workspace/db";
import {
  AddDiskBody,
  UpdateDiskBody,
  UpdateDiskParams,
  GetDiskParams,
  RemoveDiskParams,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";
import { detectHardwareDisks } from "../hardware/disk-detector.js";

const router: IRouter = Router();

router.get("/storage/disks", async (_req, res): Promise<void> => {
  const disks = await db.select().from(disksTable).orderBy(disksTable.createdAt);
  res.json({ disks });
});

router.post("/storage/disks", async (req, res): Promise<void> => {
  const parsed = AddDiskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, type, path, isBackup, label } = parsed.data;
  const id = randomUUID();
  const totalBytes = Math.floor(Math.random() * 4000000000000) + 500000000000;
  const usedBytes = Math.floor(totalBytes * Math.random() * 0.7);
  const freeBytes = totalBytes - usedBytes;
  const [disk] = await db.insert(disksTable).values({
    id,
    name,
    type,
    path,
    totalBytes,
    usedBytes,
    freeBytes,
    isBackup: isBackup ?? false,
    isActive: true,
    label: label ?? null,
    mountPoint: path,
  }).returning();
  res.status(201).json(disk);
});

router.get("/storage/disks/:diskId", async (req, res): Promise<void> => {
  const params = GetDiskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [disk] = await db.select().from(disksTable).where(eq(disksTable.id, params.data.diskId));
  if (!disk) {
    res.status(404).json({ error: "Disk not found" });
    return;
  }
  res.json(disk);
});

router.patch("/storage/disks/:diskId", async (req, res): Promise<void> => {
  const params = UpdateDiskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateDiskBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.label !== undefined) updateData.label = parsed.data.label;
  if (parsed.data.isBackup !== undefined) updateData.isBackup = parsed.data.isBackup;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

  const [disk] = await db.update(disksTable).set(updateData).where(eq(disksTable.id, params.data.diskId)).returning();
  if (!disk) {
    res.status(404).json({ error: "Disk not found" });
    return;
  }
  res.json(disk);
});

router.delete("/storage/disks/:diskId", async (req, res): Promise<void> => {
  const params = RemoveDiskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [disk] = await db.delete(disksTable).where(eq(disksTable.id, params.data.diskId)).returning();
  if (!disk) {
    res.status(404).json({ error: "Disk not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/storage/summary", async (_req, res): Promise<void> => {
  const disks = await db.select().from(disksTable);
  const activeDisks = disks.filter(d => d.isActive);
  const backupDisks = disks.filter(d => d.isBackup);
  const totalBytes = disks.reduce((sum, d) => sum + d.totalBytes, 0);
  const usedBytes = disks.reduce((sum, d) => sum + d.usedBytes, 0);
  const freeBytes = totalBytes - usedBytes;
  const usagePercent = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100 * 10) / 10 : 0;
  const diskBreakdown = disks.map(d => ({
    diskId: d.id,
    name: d.name,
    usedBytes: d.usedBytes,
    totalBytes: d.totalBytes,
  }));
  res.json({
    totalDisks: disks.length,
    activeDisks: activeDisks.length,
    backupDisks: backupDisks.length,
    totalBytes,
    usedBytes,
    freeBytes,
    usagePercent,
    diskBreakdown,
  });
});

let hardwareCache: { data: Awaited<ReturnType<typeof detectHardwareDisks>>; ts: number } | null = null;
const CACHE_TTL = 30_000;

router.get("/storage/hardware", async (_req, res): Promise<void> => {
  const now = Date.now();
  if (hardwareCache && (now - hardwareCache.ts) < CACHE_TTL) {
    res.json(hardwareCache.data);
    return;
  }
  const info = await detectHardwareDisks();
  hardwareCache = { data: info, ts: now };
  res.json(info);
});

export default router;
