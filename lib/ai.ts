import { createHash } from "node:crypto";
import { prisma } from "./prisma";

/**
 * The one door to Gemini, for the cataloguing assistant. Every cost rule of
 * docs/18-author-enrichment.md is enforced here, so no caller can skip one:
 *
 * - a cached answer to the same question (90 days) is returned free;
 * - otherwise a daily cap on paid requests, across all staff;
 * - the cheapest adequate model, short answers, low temperature;
 * - web grounding only when the caller asks for it;
 * - every paid request logged with its tokens.
 *
 * Plain `fetch` to the REST API: an SDK would add a dependency for one call.
 *
 * SERVER ONLY. The key never leaves the server.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const CACHE_DAYS = 90;
const TIMEOUT_MS = 25_000;

const apiKey = () => process.env.GEMINI_API_KEY?.trim() || null;
const model = () => process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";

export const dailyLimit = () => {
  const value = Number(process.env.GEMINI_DAILY_LIMIT);
  return Number.isInteger(value) && value > 0 ? value : 30;
};

/** The assistant's AI buttons only exist when this is true. */
export const aiConfigured = () => apiKey() !== null;

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Paid requests so far today (UTC); cached answers are not counted. */
export async function usageToday() {
  return prisma.aiRequest.count({ where: { createdAt: { gte: startOfTodayUtc() } } });
}

export type AiSource = { title: string; uri: string };

export type AiAnswer =
  | { ok: true; text: string; sources: AiSource[]; cached: boolean; used: number; limit: number }
  | { ok: false; reason: "NOT_CONFIGURED" | "DAILY_LIMIT" | "FAILED"; used: number; limit: number };

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    groundingMetadata?: { groundingChunks?: { web?: { uri?: string; title?: string } }[] };
  }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

export async function askGemini({
  kind,
  input,
  prompt,
  grounded,
  staffUserId,
  maxTokens = 400,
}: {
  kind: "biography" | "abstract" | "translation";
  /** What makes two questions the same, for the cache. */
  input: unknown;
  prompt: string;
  grounded: boolean;
  staffUserId: number | null;
  /** The answer's length cap; a translation must fit a whole abstract. */
  maxTokens?: number;
}): Promise<AiAnswer> {
  const limit = dailyLimit();
  const key = apiKey();
  if (!key) return { ok: false, reason: "NOT_CONFIGURED", used: 0, limit };

  const inputHash = createHash("sha256").update(`${kind}\n${JSON.stringify(input)}`).digest("hex");
  const since = new Date(Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000);
  const [cached, used] = await Promise.all([
    prisma.aiRequest.findFirst({
      where: { kind, inputHash, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    }),
    usageToday(),
  ]);
  if (cached) {
    const response = cached.response as { text: string; sources: AiSource[] };
    return { ok: true, ...response, cached: true, used, limit };
  }
  if (used >= limit) return { ok: false, reason: "DAILY_LIMIT", used, limit };

  let data: GeminiResponse;
  try {
    const res = await fetch(`${ENDPOINT}/${model()}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        ...(grounded ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("Gemini request failed:", res.status, (await res.text()).slice(0, 300));
      return { ok: false, reason: "FAILED", used, limit };
    }
    data = (await res.json()) as GeminiResponse;
  } catch (error) {
    console.error("Gemini request failed:", error);
    return { ok: false, reason: "FAILED", used, limit };
  }

  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? []).map((part) => part.text ?? "").join("").trim();
  const sources = (candidate?.groundingMetadata?.groundingChunks ?? [])
    .map((chunk) => ({ title: chunk.web?.title ?? "", uri: chunk.web?.uri ?? "" }))
    .filter((source) => source.uri.startsWith("https://"));

  // Logged even when the answer is empty: it was paid for, and counts.
  await prisma.aiRequest.create({
    data: {
      kind,
      inputHash,
      staffUserId,
      model: model(),
      grounded,
      promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      response: { text, sources },
    },
  });
  if (!text) return { ok: false, reason: "FAILED", used: used + 1, limit };
  return { ok: true, text, sources, cached: false, used: used + 1, limit };
}
