import {
  chatzingReadImage,
  chatzingVision,
  type ImageAnalysisResult,
} from "./api";

export type { ImageAnalysisResult } from "./api";

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header?.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
  const binary = atob(data ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Run vision model first, then read_image tool as fallback. */
export async function analyzeImageForChat(params: {
  file?: Blob | null;
  imageBase64: string;
  question: string;
  locale: "en" | "fr";
}): Promise<ImageAnalysisResult> {
  const question =
    params.question.trim() ||
    (params.locale === "fr"
      ? "Décris cette image et comment elle peut aider sur TaskZing."
      : "Describe this image and how it can help on TaskZing.");

  const errors: string[] = [];

  if (params.file && params.file.size > 0) {
    try {
      const vision = await chatzingVision(params.file, question);
      return {
        source: "vision",
        caption: vision.caption,
        answer: vision.answer,
        engine: vision.engine,
        question,
      };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Vision API failed");
    }
  }

  try {
    const tool = await chatzingReadImage({
      imageBase64: params.imageBase64,
      question,
    });
    return {
      source: "read_image",
      caption: tool.caption ?? "",
      answer: tool.answer ?? tool.text ?? "",
      engine: tool.engine ?? "read_image",
      question,
    };
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "read_image failed");
  }

  throw new Error(errors.join(" · ") || "Image analysis unavailable");
}

export function buildImageEnrichedChatPrompt(
  analysis: ImageAnalysisResult,
  userQuestion: string,
  locale: "en" | "fr"
): string {
  const q = userQuestion.trim() || analysis.question;
  if (locale === "fr") {
    return [
      "L'utilisateur a joint une image. Analyse déjà effectuée par le modèle vision (NE PAS répondre par une liste générique de capacités).",
      `Source: ${analysis.source}`,
      analysis.caption ? `Légende: ${analysis.caption}` : "",
      `Analyse: ${analysis.answer}`,
      `Question utilisateur: ${q}`,
      "Donne une réponse personnalisée pour TaskZing (emploi, vitrine, affiche, demande locale) basée UNIQUEMENT sur cette image et cette question.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "The user attached an image. Vision analysis is already complete (do NOT reply with a generic capabilities list).",
    `Source: ${analysis.source}`,
    analysis.caption ? `Caption: ${analysis.caption}` : "",
    `Analysis: ${analysis.answer}`,
    `User question: ${q}`,
    "Give a personalized TaskZing reply (job, showcase, poster, local demand) based ONLY on this image and question.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Detect canned fallback when the agent ignored the image. */
export function isGenericCapabilitiesReply(text: string): boolean {
  const t = text.toLowerCase();
  return (
    (t.includes("i can help you") && t.includes("post a job")) ||
    (t.includes("je peux vous aider") && t.includes("publier")) ||
    /try:\s*['"]post a tutoring job/i.test(text) ||
    /essayez:\s*['"]publier un emploi/i.test(text)
  );
}

export function formatVisionOnlyAssistantReply(
  analysis: ImageAnalysisResult,
  locale: "en" | "fr"
): string {
  if (locale === "fr") {
    return [
      "Voici l'analyse de votre image :",
      "",
      analysis.caption ? `**Aperçu:** ${analysis.caption}` : "",
      `**Détails:** ${analysis.answer}`,
      "",
      "_Dites-moi si vous voulez en faire un emploi, une vitrine ou une affiche sur TaskZing._",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Here's what I see in your image:",
    "",
    analysis.caption ? `**Overview:** ${analysis.caption}` : "",
    `**Details:** ${analysis.answer}`,
    "",
    "_Tell me if you'd like to turn this into a job, showcase, or poster on TaskZing._",
  ]
    .filter(Boolean)
    .join("\n");
}
