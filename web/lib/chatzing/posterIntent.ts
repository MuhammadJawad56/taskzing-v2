import { chatzingGeneratePoster } from "./api";
import type { PosterResponse } from "./types";

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function isPosterRequest(text: string): boolean {
  const t = text.toLowerCase();
  const hasPoster =
    /\b(poster|flyer|affiche)\b/.test(t) ||
    /\bmarketing\s+(image|graphic)\b/.test(t);
  const hasIntent =
    /\b(create|make|generate|design|build|draw|want|need|can you|could you|please)\b/.test(
      t
    ) || /\b(for me|pour moi)\b/.test(t);
  return hasPoster && hasIntent;
}

export function parsePosterSpec(text: string, locale: "en" | "fr"): {
  title: string;
  subtitle: string;
  cta: string;
} {
  const patterns = [
    /(?:create|make|generate|design|build)\s+(?:a\s+)?(?:poster|flyer|affiche)\s+(?:of|for|about)\s+(.+?)(?:\s+for\s+me)?[.!?]*$/i,
    /(?:poster|flyer|affiche)\s+(?:of|for|about)\s+(.+?)(?:\s+for\s+me)?[.!?]*$/i,
    /(?:want|need)\s+(?:a\s+)?(?:poster|flyer|affiche)\s+(?:of|for|about)\s+(.+)/i,
    /(?:can you|could you)\s+(?:create|make|generate)\s+(?:a\s+)?(?:poster|flyer|affiche)\s+(?:of|for|about)\s+(.+)/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const raw = m[1].replace(/\s+for\s+me$/i, "").replace(/[.!?]+$/, "").trim();
      const title = titleCase(raw);
      const subtitle =
        locale === "fr"
          ? `Affiche ${title} — créée avec ChatZing`
          : `${title} — created with ChatZing`;
      return {
        title,
        subtitle,
        cta: locale === "fr" ? "En savoir plus" : "Learn more",
      };
    }
  }

  const fallbackTitle = locale === "fr" ? "Mon affiche TaskZing" : "My TaskZing Poster";
  return {
    title: fallbackTitle,
    subtitle: text.trim().slice(0, 72) || fallbackTitle,
    cta: locale === "fr" ? "En savoir plus" : "Learn more",
  };
}

export function posterResponseToDataUrl(res: PosterResponse): string {
  const mime = res.mime ?? "image/png";
  const b64 = res.image_base64;
  if (b64.startsWith("data:")) return b64;
  return `data:${mime};base64,${b64}`;
}

export type PosterGenerationResult = {
  message: string;
  imageDataUrl: string;
};

export async function tryGeneratePosterFromMessage(
  text: string,
  locale: "en" | "fr"
): Promise<PosterGenerationResult | null> {
  if (!isPosterRequest(text)) return null;

  const spec = parsePosterSpec(text, locale);
  try {
    const res = await chatzingGeneratePoster({
      title: spec.title,
      subtitle: spec.subtitle,
      cta: spec.cta,
      template_id: "modern",
    });
    const imageDataUrl = posterResponseToDataUrl(res);
    const message =
      locale === "fr"
        ? `Voici votre affiche **${spec.title}**. Vous pouvez l'enregistrer et la partager.`
        : `Here's your **${spec.title}** poster. You can save and share it.`;
    return { message, imageDataUrl };
  } catch {
    return null;
  }
}
