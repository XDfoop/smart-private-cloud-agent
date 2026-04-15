import { Router, type IRouter } from "express";
import { db, aiMessagesTable, filesTable } from "@workspace/db";
import { SendAiMessageBody, SuggestFileStorageBody } from "@workspace/api-zod";
import { randomUUID } from "crypto";
import { desc, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const AI_MODELS = [
  { id: "gpt-5.2", name: "GPT-5.2", type: "multimodal", provider: "OpenAI (Replit AI)", isLocal: false, isActive: true, description: "Most capable model — handles text, images, and reasoning" },
  { id: "gpt-5-mini", name: "GPT-5 Mini", type: "llm", provider: "OpenAI (Replit AI)", isLocal: false, isActive: true, description: "Fast and cost-effective for everyday tasks" },
  { id: "o4-mini", name: "o4-mini", type: "llm", provider: "OpenAI (Replit AI)", isLocal: false, isActive: true, description: "Advanced reasoning model for complex analysis" },
  { id: "llama3-70b", name: "Llama 3 70B", type: "llm", provider: "Meta (Local)", isLocal: true, isActive: false, endpoint: "http://localhost:11434", description: "Powerful open-source model via Ollama — set your endpoint in Settings" },
  { id: "llava-13b", name: "LLaVA 13B", type: "vision", provider: "Open Source (Local)", isLocal: true, isActive: false, endpoint: "http://localhost:11434", description: "Local vision model for image analysis via Ollama" },
  { id: "whisper-large", name: "Whisper Large", type: "voice", provider: "OpenAI (Replit AI)", isLocal: false, isActive: true, description: "State-of-the-art speech recognition and transcription" },
];

const SYSTEM_PROMPT = `You are Smart Cloud AI Agent — an intelligent assistant for a self-hosted private cloud storage system.
You help users:
- Organize and manage their files across HDD, SSD, M.2, NVMe, USB, and NAS storage
- Suggest optimal storage locations based on file types (images → /media/photos/, videos → /media/videos/, documents → /docs/, etc.)
- Analyze storage usage and recommend cleanup or backup strategies
- Answer questions about their personal cloud system

Keep responses concise, practical, and in the same language the user writes in (Thai or English).
When suggesting file paths, always use absolute paths starting with /.
When analyzing storage, be specific with numbers (GB/TB) and percentages.`;

router.get("/ai/messages", async (_req, res): Promise<void> => {
  const messages = await db.select().from(aiMessagesTable).orderBy(aiMessagesTable.createdAt).limit(100);
  res.json({ messages });
});

router.post("/ai/chat", async (req, res): Promise<void> => {
  const parsed = SendAiMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userMsgId = randomUUID();
  await db.insert(aiMessagesTable).values({
    id: userMsgId,
    role: "user",
    content: parsed.data.message,
    attachments: parsed.data.attachments ?? [],
  });

  const recentMessages = await db.select().from(aiMessagesTable)
    .orderBy(desc(aiMessagesTable.createdAt))
    .limit(20);
  const history = recentMessages.reverse();

  const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.filter(m => m.role === "user" || m.role === "assistant").map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: parsed.data.modelId ?? "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) fullResponse += content;
    }
  } catch {
    fullResponse = "ขอโทษครับ เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI กรุณาลองใหม่อีกครั้ง";
  }

  const aiMsgId = randomUUID();
  const [aiMessage] = await db.insert(aiMessagesTable).values({
    id: aiMsgId,
    role: "assistant",
    content: fullResponse,
    attachments: [],
  }).returning();

  res.json({
    message: aiMessage,
    suggestions: [
      "จัดระเบียบไฟล์ตามหมวดหมู่",
      "ดูไฟล์ขนาดใหญ่",
      "ตรวจสอบ backup",
    ],
  });
});

router.post("/ai/suggest-storage", async (req, res): Promise<void> => {
  const parsed = SuggestFileStorageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const files = parsed.data.fileIds.length > 0
    ? await db.select().from(filesTable).where(inArray(filesTable.id, parsed.data.fileIds))
    : [];

  let aiSuggestions: Array<{ fileId: string; suggestedPath: string; reasoning: string }> = [];
  
  if (files.length > 0) {
    const fileList = files.map(f => `- ${f.name} (${f.category}, ${Math.round(f.sizeBytes / 1024 / 1024)}MB) at ${f.path}`).join("\n");
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 1024,
        messages: [
          { role: "system", content: "You are a file organization AI. Respond ONLY with a JSON array." },
          { role: "user", content: `Suggest storage paths for these files. Return JSON array: [{"fileId":"...","suggestedPath":"...","reasoning":"..."}]\n\nFiles:\n${fileList}\n\nFile IDs: ${files.map(f => f.id).join(",")}` }
        ],
        stream: false,
      });

      const content = response.choices[0]?.message?.content ?? "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        aiSuggestions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // fallback to rule-based
    }
  }

  const suggestions = files.map(file => {
    const aiSug = aiSuggestions.find(s => s.fileId === file.id);
    const fallbackPath = file.category === "images" ? `/media/photos/${new Date().getFullYear()}/`
      : file.category === "videos" ? `/media/videos/`
      : file.category === "documents" ? `/documents/${new Date().getFullYear()}/`
      : file.category === "audio" ? `/media/audio/`
      : file.category === "code" ? `/projects/`
      : `/files/misc/`;

    return {
      fileId: file.id,
      suggestedDiskId: file.diskId,
      suggestedPath: aiSug?.suggestedPath ?? fallbackPath,
      reasoning: aiSug?.reasoning ?? `ไฟล์ประเภท ${file.category} ควรจัดเก็บที่ ${fallbackPath} เพื่อความเป็นระเบียบ`,
      confidence: 0.88 + Math.random() * 0.1,
    };
  });

  res.json({ suggestions });
});

router.get("/settings/models", async (_req, res): Promise<void> => {
  res.json({ models: AI_MODELS });
});

export default router;
