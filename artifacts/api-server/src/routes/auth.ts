import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, oauthConnectionsTable, settingsTable } from "@workspace/db";
import { randomUUID } from "crypto";

const router: IRouter = Router();
const DEFAULT_USER_ID = "default-user-1";
const PROVIDERS = ["google", "discord", "telegram", "line", "facebook", "instagram", "github"];

const PROVIDER_USERNAMES: Record<string, string> = {
  google: "admin@gmail.com",
  discord: "SmartCloudAdmin#1234",
  telegram: "@smartcloud_admin",
  line: "smartcloud_user",
  facebook: "Smart Cloud User",
  instagram: "@smartcloud.storage",
  github: "smartcloud-admin",
};

async function ensureDefaultUser() {
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, DEFAULT_USER_ID));
  if (!existing) {
    await db.insert(usersTable).values({
      id: DEFAULT_USER_ID,
      email: "admin@smartcloud.local",
      name: "Admin User",
      avatar: null,
    });
    await db.insert(settingsTable).values({
      id: randomUUID(),
      userId: DEFAULT_USER_ID,
      activeModelId: "gpt-5.2",
      autoOrganize: false,
      requireApproval: true,
      darkMode: true,
      language: "th",
    });
    for (const provider of PROVIDERS) {
      await db.insert(oauthConnectionsTable).values({
        id: randomUUID(),
        userId: DEFAULT_USER_ID,
        provider,
        connected: "false",
        username: null,
        avatar: null,
      });
    }
  }
}

router.get("/auth/user", async (_req, res): Promise<void> => {
  await ensureDefaultUser();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, DEFAULT_USER_ID));
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(user);
});

router.get("/auth/connections", async (_req, res): Promise<void> => {
  await ensureDefaultUser();
  const connections = await db.select().from(oauthConnectionsTable).where(eq(oauthConnectionsTable.userId, DEFAULT_USER_ID));
  const parsed = connections.map(c => ({ ...c, connected: c.connected === "true" }));
  res.json({ connections: parsed });
});

router.post("/auth/connections/:provider/toggle", async (req, res): Promise<void> => {
  const provider = String(req.params.provider);
  await ensureDefaultUser();

  const existing = await db.select().from(oauthConnectionsTable)
    .where(and(eq(oauthConnectionsTable.userId, DEFAULT_USER_ID), eq(oauthConnectionsTable.provider, provider)));

  if (existing.length === 0) {
    await db.insert(oauthConnectionsTable).values({
      id: randomUUID(),
      userId: DEFAULT_USER_ID,
      provider,
      connected: "false",
      username: null,
      avatar: null,
    });
  }

  const [conn] = await db.select().from(oauthConnectionsTable)
    .where(and(eq(oauthConnectionsTable.userId, DEFAULT_USER_ID), eq(oauthConnectionsTable.provider, provider)));

  const nowConnected = conn.connected !== "true";
  const [updated] = await db.update(oauthConnectionsTable)
    .set({
      connected: nowConnected ? "true" : "false",
      username: nowConnected ? (PROVIDER_USERNAMES[provider] ?? null) : null,
      connectedAt: nowConnected ? new Date() : null,
    })
    .where(and(eq(oauthConnectionsTable.userId, DEFAULT_USER_ID), eq(oauthConnectionsTable.provider, provider)))
    .returning();

  res.json({ ...updated, connected: updated.connected === "true" });
});

export default router;
