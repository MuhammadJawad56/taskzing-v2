import type { JobDraftFormSnapshot } from "@/lib/api/jobDrafts";
import type { ShowcaseDraftFormSnapshot } from "@/lib/api/showcaseDrafts";
import type { ToolCallRecord } from "./types";

export type ChatzingDraftKind = "job" | "showcase";

export type ChatzingContentDraft = {
  kind: ChatzingDraftKind;
  title: string;
  description: string;
  category?: string;
  skills: string[];
  price?: string;
  location?: string;
  imageDataUrls: string[];
};

const STORAGE_KEY = "taskzing_chatzing_pending_draft";

const DRAFT_BLOCK_RE = /---TASKZING_DRAFT---([\s\S]*?)---END_DRAFT---/i;

const FIELD_ALIASES: Record<string, keyof ChatzingContentDraft | "kind"> = {
  type: "kind",
  kind: "kind",
  title: "title",
  titre: "title",
  description: "description",
  description_fr: "description",
  category: "category",
  categorie: "category",
  skills: "skills",
  competences: "skills",
  price: "price",
  budget: "price",
  location: "location",
  lieu: "location",
  address: "location",
};

function parseSkills(raw: string): string[] {
  return raw
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function parseDraftFields(block: string): Partial<ChatzingContentDraft> {
  const out: Partial<ChatzingContentDraft> = { skills: [] };
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(":");
    if (colon < 1) continue;
    const key = trimmed.slice(0, colon).trim().toLowerCase();
    const value = trimmed.slice(colon + 1).trim();
    const field = FIELD_ALIASES[key];
    if (!field || !value) continue;
    if (field === "kind") {
      const k = value.toLowerCase();
      if (k === "job" || k === "showcase") out.kind = k;
    } else if (field === "skills") {
      out.skills = parseSkills(value);
    } else {
      (out as Record<string, unknown>)[field] = value;
    }
  }
  return out;
}

function parseMarkdownDraft(text: string): Partial<ChatzingContentDraft> | null {
  const title =
    text.match(/\*\*Title:\*\*\s*(.+)/i)?.[1]?.trim() ||
    text.match(/^Title:\s*(.+)$/im)?.[1]?.trim();
  const description =
    text.match(/\*\*Description:\*\*\s*([\s\S]+?)(?=\n\*\*|\n---|$)/i)?.[1]?.trim() ||
    text.match(/^Description:\s*([\s\S]+?)(?=\n(?:Category|Skills|Price|Location):|$)/im)?.[1]?.trim();
  if (!title && !description) return null;
  const category =
    text.match(/\*\*Category:\*\*\s*(.+)/i)?.[1]?.trim() ||
    text.match(/^Category:\s*(.+)$/im)?.[1]?.trim();
  const skillsRaw =
    text.match(/\*\*Skills:\*\*\s*(.+)/i)?.[1]?.trim() ||
    text.match(/^Skills:\s*(.+)$/im)?.[1]?.trim();
  const price =
    text.match(/\*\*(?:Price|Budget):\*\*\s*(.+)/i)?.[1]?.trim() ||
    text.match(/^(?:Price|Budget):\s*(.+)$/im)?.[1]?.trim();
  const location =
    text.match(/\*\*Location:\*\*\s*(.+)/i)?.[1]?.trim() ||
    text.match(/^Location:\s*(.+)$/im)?.[1]?.trim();
  return {
    title,
    description,
    category,
    skills: skillsRaw ? parseSkills(skillsRaw) : [],
    price,
    location,
  };
}

function draftFromToolCalls(toolCalls?: ToolCallRecord[]): Partial<ChatzingContentDraft> | null {
  for (const tc of toolCalls ?? []) {
    const name = String(tc.name ?? "").toLowerCase();
    if (!name.includes("job") && !name.includes("showcase") && !name.includes("draft")) continue;
    const result = tc.result;
    if (!result || typeof result !== "object") continue;
    const r = result as Record<string, unknown>;
    const nested =
      r.draft && typeof r.draft === "object"
        ? (r.draft as Record<string, unknown>)
        : r.validated && typeof r.validated === "object"
          ? (r.validated as Record<string, unknown>)
          : r;
    const title = String(nested.title ?? nested.job_title ?? "").trim();
    const description = String(nested.description ?? "").trim();
    if (!title && !description) continue;
    const skillsRaw = nested.skills ?? nested.tags;
    return {
      kind: name.includes("showcase") ? "showcase" : "job",
      title,
      description,
      category: String(nested.category ?? "").trim() || undefined,
      skills: Array.isArray(skillsRaw)
        ? skillsRaw.map((s) => String(s).trim()).filter(Boolean)
        : typeof skillsRaw === "string"
          ? parseSkills(skillsRaw)
          : [],
      price: String(nested.price ?? nested.budget ?? nested.fixedPrice ?? "").trim() || undefined,
      location: String(nested.location ?? nested.address ?? "").trim() || undefined,
    };
  }
  return null;
}

export function splitAssistantDraftBlock(text: string): {
  displayText: string;
  fields: Partial<ChatzingContentDraft> | null;
} {
  const match = text.match(DRAFT_BLOCK_RE);
  if (!match) {
    const md = parseMarkdownDraft(text);
    return { displayText: text, fields: md };
  }
  const displayText = text.replace(DRAFT_BLOCK_RE, "").trim();
  return { displayText, fields: parseDraftFields(match[1]) };
}

export function detectPostingIntent(text: string): ChatzingDraftKind | null {
  const t = text.toLowerCase();
  if (/\b(showcase|portfolio|vitrine|vitrines)\b/.test(t)) return "showcase";
  if (/\b(post|publish|create|add|hire|need)\b/.test(t) && /\b(job|task|emploi)\b/.test(t)) {
    return "job";
  }
  if (/\b(job|task)\b/.test(t) && /\b(description|help me write)\b/.test(t)) return "job";
  return null;
}

/** Short user line that is likely only a title (e.g. "Kitchen renovation"). */
export function looksLikeTitleOnly(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 100) return false;
  if (t.split(/\s+/).length > 14) return false;
  if (/[.!?].*[.!?]/.test(t)) return false;
  if (detectPostingIntent(t)) return false;
  return true;
}

export function mergeDraftParts(
  parts: Partial<ChatzingContentDraft>[],
  defaults: { kind: ChatzingDraftKind; imageDataUrls?: string[] }
): ChatzingContentDraft | null {
  const merged: ChatzingContentDraft = {
    kind: defaults.kind,
    title: "",
    description: "",
    skills: [],
    imageDataUrls: defaults.imageDataUrls ?? [],
  };

  for (const p of parts) {
    if (p.kind) merged.kind = p.kind;
    if (p.title) merged.title = p.title;
    if (p.description) merged.description = p.description;
    if (p.category) merged.category = p.category;
    if (p.skills?.length) merged.skills = p.skills;
    if (p.price) merged.price = p.price;
    if (p.location) merged.location = p.location;
  }

  if (!merged.title.trim() && !merged.description.trim()) return null;
  if (merged.description.trim().length < 40 && merged.title.trim()) {
    merged.description = buildFallbackDescription(merged.title, merged.kind, merged.skills);
  }
  if (!merged.title.trim() && merged.description.trim()) {
    merged.title = merged.description.split(/[.!?]/)[0]?.trim().slice(0, 80) || "Untitled";
  }
  return merged;
}

function buildFallbackDescription(
  title: string,
  kind: ChatzingDraftKind,
  skills: string[]
): string {
  const skillLine = skills.length ? ` Required skills: ${skills.join(", ")}.` : "";
  if (kind === "showcase") {
    return `Professional ${title} services with quality workmanship and clear communication.${skillLine} Contact me to discuss your project and timeline.`;
  }
  return `Looking for a reliable provider for: ${title}. The work should be completed professionally, on schedule, and with clear updates.${skillLine} Please share your experience and availability when applying.`;
}

export function extractDraftFromAssistantReply(
  rawText: string,
  toolCalls: ToolCallRecord[] | undefined,
  options: {
    defaultKind: ChatzingDraftKind;
    userText?: string;
    imageDataUrls?: string[];
  }
): { displayText: string; draft: ChatzingContentDraft | null } {
  const { displayText, fields: blockFields } = splitAssistantDraftBlock(rawText);
  const mdFields = parseMarkdownDraft(displayText);
  const toolFields = draftFromToolCalls(toolCalls);

  const draft = mergeDraftParts(
    [toolFields ?? {}, blockFields ?? {}, mdFields ?? {}],
    { kind: blockFields?.kind ?? toolFields?.kind ?? options.defaultKind, imageDataUrls: options.imageDataUrls }
  );

  return { displayText, draft };
}

export type StoredChatzingDraft = ChatzingContentDraft & {
  id: string;
  createdAt: number;
};

export function saveChatzingPendingDraft(draft: ChatzingContentDraft): string {
  const id = `cz-${Date.now()}`;
  const stored: StoredChatzingDraft = { ...draft, id, createdAt: Date.now() };
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }
  return id;
}

export function peekChatzingPendingDraft(): StoredChatzingDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredChatzingDraft;
  } catch {
    return null;
  }
}

export function consumeChatzingPendingDraft(): StoredChatzingDraft | null {
  const draft = peekChatzingPendingDraft();
  if (draft && typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  return draft;
}

export async function dataUrlToFile(dataUrl: string, index: number): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `chatzing-photo-${index + 1}.${ext}`, { type: blob.type || "image/jpeg" });
}

export async function dataUrlsToFiles(urls: string[]): Promise<File[]> {
  const files: File[] = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      files.push(await dataUrlToFile(urls[i], i));
    } catch {
      // skip invalid
    }
  }
  return files;
}

export function chatzingDraftToJobFormSnapshot(draft: ChatzingContentDraft): JobDraftFormSnapshot {
  return {
    title: draft.title,
    companyName: "",
    individualName: "",
    storeName: "",
    category: draft.category ?? "Other",
    description: draft.description,
    price: draft.price ?? "",
    estimatedDuration: "",
    location: draft.location ?? "",
    additionalLocationNotes: "",
    date: "",
    urgency: "normal",
    skills: draft.skills,
    timeFlexibility: "",
    startTime: "",
    endTime: "",
  };
}

export function chatzingDraftToShowcaseFormSnapshot(
  draft: ChatzingContentDraft
): ShowcaseDraftFormSnapshot {
  return {
    postingAs: "individual",
    companyName: "",
    storeName: "",
    title: draft.title,
    skills: draft.skills.join(", "),
    description: draft.description,
    location: draft.location ?? "",
  };
}

export function buildTitleExpansionUserPrompt(
  title: string,
  kind: ChatzingDraftKind,
  locale: "en" | "fr"
): string {
  if (locale === "fr") {
    return kind === "showcase"
      ? `Je veux publier une vitrine TaskZing. Titre seulement : "${title}". Rédige une description professionnelle complète (au moins 50 caractères), une catégorie et des compétences. Termine par le bloc ---TASKZING_DRAFT--- avec type: showcase, title, description, category, skills.`
      : `Je veux publier un emploi TaskZing. Titre seulement : "${title}". Rédige une description professionnelle complète, une catégorie, des compétences et un budget indicatif. Termine par le bloc ---TASKZING_DRAFT--- avec type: job, title, description, category, skills, price.`;
  }
  return kind === "showcase"
    ? `I want to post a TaskZing showcase. Title only: "${title}". Write a full professional description (at least 50 characters), category, and skills. End with ---TASKZING_DRAFT--- block: type: showcase, title, description, category, skills.`
    : `I want to post a TaskZing job. Title only: "${title}". Write a full professional description, category, skills, and a suggested budget. End with ---TASKZING_DRAFT--- block: type: job, title, description, category, skills, price.`;
}
