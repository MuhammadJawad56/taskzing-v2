import {
  chatzingGeneratePoster,
  chatzingGetHealth,
  chatzingInvokeTool,
  extractImageFromToolResult,
  isValidImageDataUrl,
  posterResponseToDataUrl,
  type ChatzingHealth,
} from "./api";
import type { PosterRequest } from "./types";

let cachedHealth: ChatzingHealth | null = null;

export async function getChatzingMediaCapabilities(): Promise<{
  aiIllustrationAvailable: boolean;
  posterLayoutAvailable: boolean;
}> {
  if (!cachedHealth) {
    try {
      cachedHealth = await chatzingGetHealth();
    } catch {
      cachedHealth = {};
    }
  }
  return {
    aiIllustrationAvailable: cachedHealth.openai_configured === true,
    posterLayoutAvailable: cachedHealth.media?.poster === "ready",
  };
}

/** Poster API returned a layout PNG (title/colors), not an AI illustration. */
export function isTemplateOnlyPosterEngine(engine?: string): boolean {
  if (!engine) return true;
  const e = engine.toLowerCase();
  if (
    /diffusion|dall-?e|flux|stable|sdxl|text.to.image|t2i|replicate|openai|illustration/.test(
      e
    )
  ) {
    return false;
  }
  return true;
}

const FILLER_WORDS =
  /^(?:please|just|also|really|very|super|a|an|the|my|your|our|this|that|some)\s+/i;

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function cleanSubject(raw: string): string {
  let s = raw
    .replace(/\s+for\s+me$/i, "")
    .replace(/[.!?]+$/, "")
    .trim();
  while (FILLER_WORDS.test(s)) {
    s = s.replace(FILLER_WORDS, "").trim();
  }
  return s.replace(/\s+(?:poster|flyer|affiche)$/i, "").trim();
}

/** Extract what the user wants on the poster (e.g. "dog" from "create a dog poster"). */
export function extractVisualSubject(text: string): string | null {
  const t = text.trim();
  if (!t) return null;

  const patterns: RegExp[] = [
    // create a dog poster | make an office cleaning flyer
    /(?:create|make|generate|design|build|draw|can you create|could you create|please create)\s+(?:a\s+|an\s+|me\s+)?(.+?)\s+(?:poster|flyer|affiche)\b/i,
    // poster of a dog | flyer for tutoring
    /(?:poster|flyer|affiche)\s+(?:of|for|about)\s+(?:a\s+|an\s+)?(.+?)(?:\s+for\s+me)?[.!?]*$/i,
    // dog poster | tutoring flyer
    /^(?:a\s+|an\s+)?(.+?)\s+(?:poster|flyer|affiche)\s*$/i,
    // generate image of a dog
    /(?:generate|create|make|draw|design|render|paint)\s+(?:an?\s+)?(?:image|picture|illustration|graphic|artwork)\s+(?:of|for|about|showing)\s+(?:a\s+|an\s+)?(.+)/i,
    /(?:image|picture|illustration)\s+of\s+(?:a\s+|an\s+)?(.+)/i,
    /(?:draw|paint)\s+(?:me\s+)?(?:a\s+|an\s+)?(.+)/i,
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]) {
      const subject = cleanSubject(m[1]);
      if (subject.length >= 2 && !/^(poster|flyer|affiche)$/i.test(subject)) {
        return subject;
      }
    }
  }

  return null;
}

export type VisualSpec = {
  title: string;
  subtitle: string;
  cta: string;
  template_id: "modern" | "bold" | "fresh";
  /** Full text-to-image prompt for the poster / image engine. */
  prompt: string;
  subject: string;
};

export type VisualGenerationResult = {
  message: string;
  imageDataUrl: string;
  engine?: string;
};

export function isPosterRequest(text: string): boolean {
  const t = text.toLowerCase();
  const hasPoster =
    /\b(poster|flyer|affiche)\b/.test(t) ||
    /\bmarketing\s+(image|graphic)\b/.test(t);
  const hasIntent =
    /\b(create|make|generate|design|build|draw|want|need|can you|could you|please)\b/.test(
      t
    ) ||
    /\b(for me|pour moi)\b/.test(t) ||
    /^[a-z0-9\s'-]+\s+(?:poster|flyer|affiche)\s*$/i.test(t);
  return hasPoster && hasIntent;
}

/** General text-to-image / illustration requests (not photo analysis). */
export function isTextToImageRequest(text: string): boolean {
  if (isPosterRequest(text)) return true;
  const t = text.toLowerCase();
  if (
    /\b(analyze|analyse|describe|what is in|read this)\b/.test(t) &&
    /\b(image|photo)\b/.test(t)
  ) {
    return false;
  }
  return (
    (/\b(generate|create|make|draw|design|render|paint|illustrate)\b/.test(t) &&
      /\b(image|picture|illustration|artwork|graphic|drawing|scene)\b/.test(t)) ||
    /\b(image|picture|illustration)\s+of\s+/i.test(text) ||
    /\b(draw|paint)\s+(me\s+)?(a\s+)?/i.test(text)
  );
}

export function isVisualGenerationRequest(text: string): boolean {
  return isTextToImageRequest(text);
}

function buildImagePrompt(subject: string, locale: "en" | "fr"): string {
  const s = subject.trim();
  if (locale === "fr") {
    return [
      `Affiche promotionnelle avec ${s} en élément principal et héros visuel.`,
      `Illustration claire et attrayante de ${s}, couleurs vives, composition moderne,`,
      `pas de fond vide ni de bloc uni, haute qualité, style marketing professionnel.`,
    ].join(" ");
  }
  return [
    `Promotional poster featuring ${s} as the main hero visual.`,
    `Clear, attractive illustration of ${s}, vibrant colors, modern layout,`,
    `no blank or solid empty background, professional marketing quality.`,
  ].join(" ");
}

export function parseVisualSpec(text: string, locale: "en" | "fr"): VisualSpec {
  const subject = extractVisualSubject(text);

  if (subject) {
    const title = titleCase(subject);
    return {
      subject,
      title,
      subtitle:
        locale === "fr"
          ? `Promotion ${title} — ${subject}`
          : `${title} promo — featuring ${subject}`,
      cta: locale === "fr" ? "En savoir plus" : "Learn more",
      template_id: "bold",
      prompt: buildImagePrompt(subject, locale),
    };
  }

  const fallbackSubject = locale === "fr" ? "votre service" : "your service";
  return {
    subject: fallbackSubject,
    title: locale === "fr" ? "Mon service" : "My Service",
    subtitle:
      locale === "fr"
        ? "Promouvez votre activité sur TaskZing"
        : "Promote your work on TaskZing",
    cta: locale === "fr" ? "En savoir plus" : "Learn more",
    template_id: "modern",
    prompt: buildImagePrompt(fallbackSubject, locale),
  };
}

function toPosterRequest(spec: VisualSpec): PosterRequest {
  return {
    title: spec.title,
    subtitle: spec.subtitle,
    cta: spec.cta,
    template_id: spec.template_id,
    prompt: spec.prompt,
    image_prompt: spec.prompt,
  };
}

function resultFromDataUrl(
  imageDataUrl: string,
  engine: string
): VisualGenerationResult | null {
  if (!isValidImageDataUrl(imageDataUrl)) return null;
  return { message: "", imageDataUrl, engine };
}

async function generateViaTextToImageTools(
  spec: VisualSpec
): Promise<VisualGenerationResult | null> {
  const toolNames = ["text_to_image", "generate_image", "create_image"];
  const args = {
    prompt: spec.prompt,
    image_prompt: spec.prompt,
    title: spec.title,
    subtitle: spec.subtitle,
    subject: spec.subject,
  };

  for (const name of toolNames) {
    try {
      const data = await chatzingInvokeTool(name, args);
      const imageDataUrl = extractImageFromToolResult(
        data as unknown as Record<string, unknown>
      );
      if (imageDataUrl) {
        return resultFromDataUrl(imageDataUrl, name);
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function generateViaPosterEndpoint(
  spec: VisualSpec
): Promise<VisualGenerationResult | null> {
  try {
    const res = await chatzingGeneratePoster(toPosterRequest(spec));
    return resultFromDataUrl(posterResponseToDataUrl(res), res.engine);
  } catch {
    return null;
  }
}

async function generateViaPosterTool(
  spec: VisualSpec
): Promise<VisualGenerationResult | null> {
  try {
    const data = await chatzingInvokeTool(
      "generate_poster",
      toPosterRequest(spec) as unknown as Record<string, unknown>
    );
    const imageDataUrl = extractImageFromToolResult(
      data as unknown as Record<string, unknown>
    );
    if (!imageDataUrl) return null;
    const engine =
      data.result && typeof data.result === "object"
        ? String((data.result as Record<string, unknown>).engine ?? "generate_poster")
        : "generate_poster";
    return resultFromDataUrl(imageDataUrl, engine);
  } catch {
    return null;
  }
}

export function formatVisualSuccessMessage(
  spec: VisualSpec,
  locale: "en" | "fr",
  isPoster: boolean,
  options?: { engine?: string; aiIllustrationAvailable?: boolean }
): string {
  const templateOnly =
    options?.aiIllustrationAvailable === false ||
    isTemplateOnlyPosterEngine(options?.engine);

  if (templateOnly) {
    if (locale === "fr") {
      return [
        `J'ai généré une **affiche modèle** « ${spec.title} » (mise en page + texte).`,
        `Ce n'est pas encore une **illustration IA** de ${spec.subject} — le serveur ChatZing n'a pas le modèle texte→image activé (voir \`OPENAI_API_KEY\` sur Railway).`,
        "Vous pouvez quand même enregistrer ce brouillon ou reformuler votre demande une fois l'IA image activée.",
      ].join("\n\n");
    }
    return [
      `I generated a **layout poster** titled "**${spec.title}**" (colors + text only).`,
      `This is **not an AI illustration** of ${spec.subject} yet — the ChatZing server does not have text-to-image enabled (set \`OPENAI_API_KEY\` on Railway).`,
      "You can still save this draft, or try again after AI images are enabled on the API.",
    ].join("\n\n");
  }

  if (locale === "fr") {
    return isPoster
      ? `Voici votre affiche **${spec.title}** avec illustration. Enregistrez-la et partagez-la.`
      : `Voici votre image **${spec.title}**. Enregistrez-la et partagez-la.`;
  }
  return isPoster
    ? `Here's your **${spec.title}** poster with illustration. Save and share when you're ready.`
    : `Here's your **${spec.title}** image. Save and share when you're ready.`;
}

/**
 * Generate poster / text-to-image: T2I tools first, then poster API with rich prompt.
 */
export async function generateVisualFromText(
  text: string,
  locale: "en" | "fr"
): Promise<VisualGenerationResult> {
  const spec = parseVisualSpec(text, locale);
  const isPoster = isPosterRequest(text);
  const caps = await getChatzingMediaCapabilities();
  const errors: string[] = [];

  const msgOpts = (engine?: string) => ({
    engine,
    aiIllustrationAvailable: caps.aiIllustrationAvailable,
  });

  const fromT2i = await generateViaTextToImageTools(spec);
  if (fromT2i) {
    return {
      ...fromT2i,
      message: formatVisualSuccessMessage(spec, locale, isPoster, msgOpts(fromT2i.engine)),
    };
  }
  errors.push("text-to-image tools returned no image");

  const fromEndpoint = await generateViaPosterEndpoint(spec);
  if (fromEndpoint) {
    return {
      ...fromEndpoint,
      message: formatVisualSuccessMessage(
        spec,
        locale,
        isPoster,
        msgOpts(fromEndpoint.engine)
      ),
    };
  }
  errors.push("poster endpoint returned no valid image");

  const fromTool = await generateViaPosterTool(spec);
  if (fromTool) {
    return {
      ...fromTool,
      message: formatVisualSuccessMessage(spec, locale, isPoster, msgOpts(fromTool.engine)),
    };
  }
  errors.push("poster tool returned no valid image");

  throw new Error(
    locale === "fr"
      ? "Impossible de générer l'image. Le serveur ChatZing doit activer le modèle texte→image (OPENAI_API_KEY sur Railway)."
      : "Could not generate an image. Enable text-to-image on the ChatZing server (OPENAI_API_KEY on Railway)."
  );
}

export async function tryGenerateVisualFromMessage(
  text: string,
  locale: "en" | "fr"
): Promise<VisualGenerationResult | null> {
  if (!isVisualGenerationRequest(text)) return null;
  try {
    return await generateVisualFromText(text, locale);
  } catch {
    return null;
  }
}
