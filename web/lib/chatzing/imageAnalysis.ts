import type { ApiChatMessage } from "./types";
import { buildImageFocusedChatMessages } from "./dataset";
import { chatzingReadImage, chatzingVision, type ImageAnalysisResult } from "./api";
import type { ChatResponse, ToolCallRecord } from "./types";

export type { ImageAnalysisResult } from "./api";

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = header?.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
  const binary = atob(data ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Clear user-facing text sent to the API (not the short label shown in UI). */
export function buildImageUserChatContent(
  question: string,
  locale: "en" | "fr"
): string {
  const q =
    question.trim() ||
    (locale === "fr"
      ? "Qu'est-ce que je vois et comment cela aide sur TaskZing ?"
      : "What do I see and how does this help on TaskZing?");

  if (locale === "fr") {
    return [
      "[Capture TaskZing jointe]",
      "Décris exactement tout texte et élément d'interface visible (titres, liens, boutons, sections).",
      `Puis réponds à ma question: ${q}`,
    ].join(" ");
  }

  return [
    "[TaskZing screenshot attached]",
    "Describe exactly every visible UI element (headings, links, buttons, sections).",
    `Then answer my question: ${q}`,
  ].join(" ");
}

export function buildImageChatApiMessages(
  history: { role: "user" | "assistant"; content: string }[],
  agentUserText: string,
  locale: "en" | "fr",
  userQuestion: string
): ApiChatMessage[] {
  return buildImageFocusedChatMessages(history, agentUserText, locale, userQuestion);
}

export function buildImageChatAttachmentPrompt(
  question: string,
  locale: "en" | "fr"
): string {
  return buildImageUserChatContent(question, locale);
}

/** Run vision → read_image; returns null if both fail (caller uses chat attachment fallback). */
export async function analyzeImageForChat(params: {
  file?: Blob | null;
  imageBase64: string;
  question: string;
  locale: "en" | "fr";
}): Promise<ImageAnalysisResult | null> {
  const question =
    params.question.trim() ||
    (params.locale === "fr"
      ? "Décris cette image et comment elle peut aider sur TaskZing."
      : "Describe this image and how it can help on TaskZing.");

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
    } catch {
      // fall through to read_image
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
  } catch {
    return null;
  }
}

export function buildImageEnrichedChatPrompt(
  analysis: ImageAnalysisResult,
  userQuestion: string,
  locale: "en" | "fr"
): string {
  const q = userQuestion.trim() || analysis.question;
  if (locale === "fr") {
    return [
      "[Analyse vision déjà effectuée — ne pas donner de réponse générique]",
      analysis.caption ? `Visible: ${analysis.caption}` : "",
      `Détails: ${analysis.answer}`,
      `Question: ${q}`,
      "Réponds en te basant UNIQUEMENT sur cette analyse et la question.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "[Vision analysis complete — do not give a generic reply]",
    analysis.caption ? `Visible: ${analysis.caption}` : "",
    `Details: ${analysis.answer}`,
    `Question: ${q}`,
    "Reply based ONLY on this analysis and the question.",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseToolReadImage(tc: ToolCallRecord): ImageAnalysisResult | null {
  if (tc.name !== "read_image" || !tc.result || typeof tc.result !== "object") {
    return null;
  }
  const r = tc.result as Record<string, unknown>;
  const caption = typeof r.caption === "string" ? r.caption : "";
  const answer =
    typeof r.answer === "string"
      ? r.answer
      : typeof r.text === "string"
        ? r.text
        : typeof r.description === "string"
          ? r.description
          : "";
  if (!answer && !caption) return null;
  return {
    source: "read_image",
    caption,
    answer: answer || caption,
    engine: typeof r.engine === "string" ? r.engine : "read_image",
    question: "",
  };
}

/** If the agent called read_image, use that result instead of a generic message. */
export function extractReadImageFromChatResponse(
  res: ChatResponse
): ImageAnalysisResult | null {
  for (const tc of res.tool_calls ?? []) {
    const parsed = parseToolReadImage(tc);
    if (parsed) return parsed;
  }
  return null;
}

export function isGenericCapabilitiesReply(text: string): boolean {
  const t = text.toLowerCase();
  return (
    (t.includes("i can help you") && t.includes("post a job")) ||
    (t.includes("je peux vous aider") && t.includes("publier")) ||
    /\btry:\s/i.test(text) ||
    /\bessayez:\s/i.test(text) ||
    /\bfor example\b/i.test(text) ||
    /\bpar exemple\b/i.test(text) ||
    (t.includes("in-app messaging") && t.includes("discuss")) ||
    (t.includes("messagerie") && t.includes("discuter"))
  );
}

/** Reply ignores the image and gives unrelated TaskZing tips. */
export function isIrrelevantImageReply(text: string): boolean {
  if (isGenericCapabilitiesReply(text)) return true;

  const t = text.toLowerCase();
  const genericSnippets = [
    "in-app messaging",
    "discuss jobs with clients",
    "payment method",
    "dark mode",
    "go to settings",
    "navigate to the",
    "from the navigation menu",
    "stripe handles",
    "language settings",
    "saved items",
    "qr code",
  ];

  const mentionsVisual =
    /\b(screenshot|image|photo|screen|visible|shows|showing|see more|nearest|button|section|heading|capture|interface|ui|page|jobs|see more)\b/i.test(
      text
    );

  const hitsGeneric = genericSnippets.some((s) => t.includes(s));
  if (hitsGeneric && !mentionsVisual) return true;
  if (hitsGeneric && t.length < 280) return true;

  return false;
}

export function formatVisionOnlyAssistantReply(
  analysis: ImageAnalysisResult,
  locale: "en" | "fr"
): string {
  const detail = [analysis.caption, analysis.answer].filter(Boolean).join(" ").trim();
  if (locale === "fr") {
    return detail
      ? `D'après l'image : ${detail}`
      : "Je n'ai pas pu extraire de détail utile de cette image. Décrivez ce que vous souhaitez savoir.";
  }
  return detail
    ? `From the image: ${detail}`
    : "I could not extract useful detail from this image. Tell me what you would like to know.";
}

export function formatImageReplyUnavailable(
  userQuestion: string,
  locale: "en" | "fr"
): string {
  const q = userQuestion.trim();
  if (locale === "fr") {
    return q
      ? `Je n'ai pas pu analyser cette image. Pour « ${q} », indiquez brièvement ce qui apparaît à l'écran (titres ou boutons visibles).`
      : "Je n'ai pas pu analyser cette image. Décrivez brièvement ce qui apparaît à l'écran.";
  }
  return q
    ? `I could not analyze this image. For "${q}", briefly describe what appears on screen (visible headings or buttons).`
    : "I could not analyze this image. Briefly describe what appears on screen.";
}
