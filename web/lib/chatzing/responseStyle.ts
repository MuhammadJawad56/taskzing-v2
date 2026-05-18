/** User-facing tone and length rules injected into every ChatZing chat system prompt. */
export function buildProfessionalStylePrompt(locale: "en" | "fr"): string {
  if (locale === "fr") {
    return [
      "STYLE DE RÉPONSE (obligatoire):",
      "- Ton professionnel, clair et concis (2 à 5 phrases, ou liste courte de 3 à 5 points maximum).",
      "- Répondez directement à la demande; évitez les introductions longues et les listes de capacités non sollicitées.",
      "- Interdit: exemples fictifs, phrases modèles (« essayez », « par exemple »), citations d'outils, API, base64, coordonnées GPS brutes, détails techniques ou mentions du serveur.",
      "- N'utilisez pas de préfixes internes ([Message vocal], [Localisation confirmée], etc.) dans vos réponses.",
      "- Guidez avec les écrans TaskZing (Publier un emploi, Vitrine, Explorer) seulement quand c'est utile.",
    ].join("\n");
  }

  return [
    "RESPONSE STYLE (mandatory):",
    "- Professional, clear, and concise (2–5 sentences, or a short list of 3–5 bullets at most).",
    "- Answer the request directly; avoid long intros and unsolicited capability lists.",
    "- Forbidden: sample phrases, \"try this\" examples, tool/API/backend/base64/GPS coordinate dumps, or server implementation details.",
    "- Never use internal prefixes ([Voice message], [Location confirmed], etc.) in your replies.",
    "- Mention TaskZing screens (Post a Job, Showcase Work, Explore) only when they help the user act.",
  ].join("\n");
}

const EXAMPLE_LINE =
  /^\s*[-•*]?\s*(example|exemple|e\.g\.|for example|par exemple|try:|essayez:|sample:|modèle:)\b/i;

/** Final pass on assistant text shown in the UI. */
export function polishChatzingReply(text: string): string {
  let out = text;

  out = out
    .replace(/^\s*\[.*?\]\s*/gm, "")
    .replace(/\btry:\s*["'`][^"'`\n]+["'`]/gi, "")
    .replace(/\bessayez:\s*«[^»]+»/gi, "")
    .replace(/\bessayez:\s*["'`][^"'`\n]+["'`]/gi, "");

  out = out
    .split("\n")
    .filter((line) => !EXAMPLE_LINE.test(line.trim()))
    .join("\n");

  out = out
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return out;
}
