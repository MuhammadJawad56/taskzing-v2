import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/api/http";
import { resolveChatzingRequestUrl } from "./config";
import type {
  AgentContext,
  ApiChatMessage,
  ChatRequest,
  ChatResponse,
  PosterRequest,
  PosterResponse,
  ToolCallRecord,
  TranscribeResponse,
  VisionResponse,
} from "./types";

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json", ...extra };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function parseJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function errorMessage(res: Response, body: unknown): string {
  const o = body as Record<string, unknown> | null;
  if (o && typeof o === "object") {
    const detail = o.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object") {
      const first = detail[0] as { msg?: string };
      if (first.msg) return first.msg;
    }
    if (typeof o.message === "string") return o.message;
  }
  if (res.status === 401) {
    return "Please sign in to use ChatZing.";
  }
  return `ChatZing request failed (${res.status})`;
}

/** Warm up whisper / poster models on the ChatZing service. */
export async function chatzingPreload(): Promise<void> {
  try {
    await fetch(resolveChatzingRequestUrl("/health/preload"), {
      method: "POST",
      headers: authHeaders(),
    });
  } catch {
    // Non-blocking; chat still works if preload fails
  }
}

export async function chatzingChat(params: {
  messages: ApiChatMessage[];
  context?: AgentContext | null;
}): Promise<ChatResponse> {
  const body: ChatRequest = {
    messages: params.messages,
    context: params.context ?? undefined,
  };
  const res = await fetch(resolveChatzingRequestUrl("/v1/chat"), {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await parseJson<ChatResponse & { detail?: unknown }>(res);
  if (!res.ok) {
    throw new Error(errorMessage(res, data));
  }
  if (!data?.message) {
    throw new Error("ChatZing returned an empty response.");
  }
  return data;
}

export async function chatzingTranscribe(
  file: Blob,
  language = "en"
): Promise<TranscribeResponse> {
  const form = new FormData();
  form.append("file", file, "recording.webm");
  const res = await fetch(
    resolveChatzingRequestUrl(`/v1/transcribe?language=${encodeURIComponent(language)}`),
    {
      method: "POST",
      headers: authHeaders(),
      body: form,
    }
  );
  const data = await parseJson<TranscribeResponse>(res);
  if (!res.ok || !data?.text) {
    throw new Error(errorMessage(res, data));
  }
  return data;
}

export async function chatzingVision(
  file: Blob,
  question?: string
): Promise<VisionResponse> {
  const form = new FormData();
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  form.append("file", file, `upload.${ext}`);
  const q = question?.trim();
  const path = q
    ? `/v1/vision?question=${encodeURIComponent(q)}`
    : "/v1/vision";
  const res = await fetch(resolveChatzingRequestUrl(path), {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  const data = await parseJson<VisionResponse>(res);
  if (!res.ok || !data) {
    throw new Error(errorMessage(res, data));
  }
  if (!data.answer && !data.caption) {
    throw new Error("Vision returned no analysis.");
  }
  return data;
}

export interface ImageAnalysisResult {
  source: "vision" | "read_image";
  caption: string;
  answer: string;
  engine?: string;
  question: string;
}

export function normalizeImageBase64ForApi(data: string): string {
  const t = data.trim();
  const comma = t.indexOf(",");
  if (t.startsWith("data:") && comma >= 0) {
    return t.slice(comma + 1);
  }
  return t;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function parseReadImageResult(result: Record<string, unknown>): {
  caption: string;
  answer: string;
  engine?: string;
} {
  const nested =
    result.result && typeof result.result === "object"
      ? (result.result as Record<string, unknown>)
      : result.data && typeof result.data === "object"
        ? (result.data as Record<string, unknown>)
        : null;

  const sources = nested ? [result, nested] : [result];

  let caption = "";
  let answer = "";
  let engine: string | undefined;

  for (const src of sources) {
    caption ||= pickString(src, ["caption", "title", "summary"]);
    answer ||= pickString(src, [
      "answer",
      "text",
      "description",
      "message",
      "content",
      "output",
      "analysis",
    ]);
    engine ||= pickString(src, ["engine"]) || undefined;
  }

  if (!answer && caption) answer = caption;

  return { caption, answer, engine };
}

/** Agent tool: read_image (base64). Tries raw base64 then full data URL. */
export async function chatzingReadImage(params: {
  imageBase64: string;
  question?: string;
}): Promise<{
  caption?: string;
  answer?: string;
  text?: string;
  engine?: string;
}> {
  const question = params.question?.trim() || undefined;
  const raw = normalizeImageBase64ForApi(params.imageBase64);
  const withPrefix = params.imageBase64.trim().startsWith("data:")
    ? params.imageBase64.trim()
    : `data:image/jpeg;base64,${raw}`;

  const payloads = [raw, withPrefix];
  const errors: string[] = [];

  for (const image_base64 of payloads) {
    try {
      const res = await fetch(resolveChatzingRequestUrl("/v1/tools/invoke"), {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "read_image",
          arguments: { image_base64, question },
        }),
      });
      const data = await parseJson<{
        ok?: boolean;
        result?: Record<string, unknown>;
        detail?: unknown;
      }>(res);

      if (!res.ok) {
        errors.push(errorMessage(res, data));
        continue;
      }

      if (data?.ok === false) {
        const r = data.result;
        const err =
          r && typeof r === "object"
            ? pickString(r as Record<string, unknown>, ["error", "message", "detail"])
            : "";
        errors.push(err || "read_image tool returned ok:false");
        continue;
      }

      const result = data?.result;
      if (!result || typeof result !== "object") {
        errors.push("read_image returned no result object");
        continue;
      }

      const parsed = parseReadImageResult(result);
      if (!parsed.answer && !parsed.caption) {
        errors.push("read_image returned empty analysis");
        continue;
      }

      return {
        caption: parsed.caption,
        answer: parsed.answer,
        text: parsed.answer,
        engine: parsed.engine ?? "read_image",
      };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "read_image request failed");
    }
  }

  throw new Error(errors[errors.length - 1] || "read_image failed");
}

export async function chatzingGeneratePoster(
  req: PosterRequest
): Promise<PosterResponse> {
  const res = await fetch(resolveChatzingRequestUrl("/v1/poster/generate"), {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });
  const data = await parseJson<PosterResponse>(res);
  if (!res.ok || !data?.image_base64) {
    throw new Error(errorMessage(res, data));
  }
  return data;
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(blob);
  });
}

/** Collect poster data URLs from agent tool calls. */
export function extractImagesFromChatResponse(res: ChatResponse): string[] {
  const urls: string[] = [];
  const add = (b64: unknown, mime?: unknown) => {
    if (typeof b64 !== "string" || !b64) return;
    if (b64.startsWith("http://") || b64.startsWith("https://")) {
      urls.push(b64);
      return;
    }
    const m = typeof mime === "string" && mime ? mime : "image/png";
    urls.push(b64.startsWith("data:") ? b64 : `data:${m};base64,${b64}`);
  };

  for (const tc of res.tool_calls ?? []) {
    collectFromToolCall(tc, add);
  }
  for (const trace of res.media_trace ?? []) {
    if (trace && typeof trace === "object") {
      const t = trace as Record<string, unknown>;
      add(t.image_base64 ?? t.poster_base64, t.mime);
    }
  }
  return urls;
}

function collectFromToolCall(
  tc: ToolCallRecord,
  add: (b64: unknown, mime?: unknown) => void
): void {
  const result = tc.result;
  if (!result || typeof result !== "object") return;
  if (tc.name === "generate_poster" || result.image_base64) {
    add(result.image_base64, result.mime);
  }
  const items = result.items ?? result.jobs ?? result.showcases;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const photos = o.photos ?? o.images;
        if (Array.isArray(photos)) {
          for (const p of photos) {
            if (typeof p === "string" && (p.startsWith("http") || p.startsWith("data:"))) {
              add(p);
            }
          }
        }
      }
    }
  }
}
