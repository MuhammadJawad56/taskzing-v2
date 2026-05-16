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
  ToolInvokeResponse,
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
    if (typeof o.error === "string") return o.error;
  }
  if (res.status === 401) {
    return "Please sign in to use ChatZing.";
  }
  if (res.ok) {
    return "The server responded OK but returned no usable image data.";
  }
  return `ChatZing request failed (${res.status})`;
}

/** True when string is a non-empty image URL or data URL with real payload. */
export function isValidImageDataUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith("http://") || t.startsWith("https://")) return true;
  if (!t.startsWith("data:image/")) return false;
  const comma = t.indexOf(",");
  if (comma < 0) return false;
  const payload = t.slice(comma + 1).replace(/\s/g, "");
  return payload.length >= 200;
}

/** Normalize poster / tool JSON into a consistent shape. */
export function normalizePosterResponse(data: unknown): PosterResponse | null {
  if (!data || typeof data !== "object") return null;

  const visit = (obj: Record<string, unknown>): PosterResponse | null => {
    const b64 = pickString(obj, [
      "image_base64",
      "imageBase64",
      "poster_base64",
      "posterBase64",
      "b64",
      "image",
    ]);
    if (!b64) {
      for (const key of ["result", "data", "output"]) {
        const nested = obj[key];
        if (nested && typeof nested === "object") {
          const found = visit(nested as Record<string, unknown>);
          if (found) return found;
        }
      }
      return null;
    }
    const mime = pickString(obj, ["mime", "content_type", "contentType"]) || "image/png";
    return {
      image_base64: b64,
      mime,
      template_id: pickString(obj, ["template_id", "templateId"]) || "modern",
      engine: pickString(obj, ["engine"]) || "poster",
    };
  };

  return visit(data as Record<string, unknown>);
}

export interface ChatzingHealth {
  status?: string;
  openai_configured?: boolean;
  database_configured?: boolean;
  media?: {
    whisper?: string;
    vision?: string;
    poster?: string;
  };
}

export async function chatzingGetHealth(): Promise<ChatzingHealth> {
  const res = await fetch(resolveChatzingRequestUrl("/health"), {
    headers: authHeaders(),
    cache: "no-store",
  });
  const data = await parseJson<ChatzingHealth>(res);
  if (!res.ok || !data) {
    throw new Error("ChatZing health check failed");
  }
  return data;
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

  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("image/")) {
    if (!res.ok) {
      throw new Error(`Poster image request failed (${res.status})`);
    }
    const blob = await res.blob();
    const dataUrl = await blobToBase64(blob);
    if (!isValidImageDataUrl(dataUrl)) {
      throw new Error("Poster API returned an empty image.");
    }
    return {
      image_base64: dataUrl,
      mime: contentType.split(";")[0] || "image/png",
      template_id: req.template_id ?? "modern",
      engine: "poster-binary",
    };
  }

  const rawText = await res.text();
  let data: unknown = null;
  if (rawText.trim()) {
    try {
      data = JSON.parse(rawText) as unknown;
    } catch {
      if (!res.ok) {
        throw new Error(errorMessage(res, null));
      }
      throw new Error("Poster API returned invalid JSON.");
    }
  }

  if (!res.ok) {
    throw new Error(errorMessage(res, data));
  }

  const parsed = normalizePosterResponse(data);
  if (!parsed) {
    throw new Error(errorMessage(res, data));
  }

  const dataUrl = posterResponseToDataUrl(parsed);
  if (!isValidImageDataUrl(dataUrl)) {
    throw new Error("Poster API returned an empty or invalid image.");
  }

  return parsed;
}

export async function chatzingInvokeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolInvokeResponse> {
  const res = await fetch(resolveChatzingRequestUrl("/v1/tools/invoke"), {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, arguments: args }),
  });
  const data = await parseJson<ToolInvokeResponse>(res);
  if (!res.ok) {
    throw new Error(errorMessage(res, data));
  }
  if (data?.ok === false) {
    const r = data.result;
    const msg =
      r && typeof r === "object"
        ? pickString(r as Record<string, unknown>, ["error", "message", "detail"])
        : "";
    throw new Error(msg || `Tool ${name} failed`);
  }
  return data ?? {};
}

/** Pull base64 or URL image from a tool invoke or nested result. */
export function extractImageFromToolResult(
  payload: Record<string, unknown> | null | undefined
): string | null {
  if (!payload || typeof payload !== "object") return null;

  const visit = (obj: Record<string, unknown>): string | null => {
    for (const key of ["image_base64", "poster_base64", "image_url", "url"]) {
      const v = obj[key];
      if (typeof v === "string" && v.trim()) {
        if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:")) {
          return v;
        }
        const mime =
          typeof obj.mime === "string" && obj.mime ? obj.mime : "image/png";
        return `data:${mime};base64,${v}`;
      }
    }
    for (const nested of ["result", "data", "output"]) {
      const child = obj[nested];
      if (child && typeof child === "object") {
        const found = visit(child as Record<string, unknown>);
        if (found) return found;
      }
    }
    return null;
  };

  const root = payload.result && typeof payload.result === "object"
    ? (payload.result as Record<string, unknown>)
    : payload;

  return visit(root);
}

export function posterResponseToDataUrl(res: PosterResponse): string {
  const mime = res.mime ?? "image/png";
  const b64 = res.image_base64;
  if (b64.startsWith("data:")) return b64;
  return `data:${mime};base64,${b64}`;
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
