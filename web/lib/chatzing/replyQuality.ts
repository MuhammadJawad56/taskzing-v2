import { isGenericCapabilitiesReply } from "./imageAnalysis";

/** Backend stub when the agent is not fully configured — not user-appropriate. */
export function isUnhelpfulChatzingReply(text: string): boolean {
  if (isGenericCapabilitiesReply(text)) return true;

  const t = text.toLowerCase();
  if (/\b(openai|anthropic|gemini)_api_key\b/i.test(text)) return true;
  if (/set\s+[a-z0-9_]*api[_-]?key/i.test(text)) return true;
  if (
    (t.includes("post jobs") || t.includes("publier des emplois")) &&
    (t.includes("showcases") || t.includes("vitrines") || t.includes("local demand"))
  ) {
    return true;
  }
  if (t.includes("multi-step agent") || t.includes("agent multi-étapes")) return true;
  if (
    (t.includes("tell me what you want to do") || t.includes("dites-moi ce que vous voulez")) &&
    text.length < 320
  ) {
    return true;
  }
  if (t.includes("check local demand") && !t.includes("poster") && text.length < 320) {
    return true;
  }
  return false;
}

/** User asked to create a poster / generated image (feature disabled in web UI). */
export function isPosterCreationRequest(text: string): boolean {
  const t = text.toLowerCase();
  if (
    /\b(poster|flyer|affiche)\b/.test(t) &&
    /\b(create|make|generate|design|draw|want|need)\b/.test(t)
  ) {
    return true;
  }
  if (
    /\b(generate|create|make|draw|design)\b/.test(t) &&
    /\b(image|picture|illustration|artwork|graphic)\b/.test(t)
  ) {
    return true;
  }
  return /\b(image|picture|illustration)\s+of\s+/i.test(text);
}

export function formatImageGenerationDisabledReply(locale: "en" | "fr"): string {
  if (locale === "fr") {
    return [
      "La création d'affiches et d'images par IA est temporairement désactivée.",
      "Je peux vous aider avec les **emplois à proximité**, les **vitrines**, la **demande locale**, publier un emploi, ou répondre à vos questions sur TaskZing.",
    ].join("\n\n");
  }
  return [
    "AI poster and image creation is temporarily disabled.",
    "I can help with **nearby jobs**, **showcases**, **local demand**, posting a job, or answering TaskZing questions.",
  ].join("\n\n");
}

export function formatShowcaseGuidanceReply(locale: "en" | "fr"): string {
  if (locale === "fr") {
    return [
      "Une vitrine met en valeur votre travail sur TaskZing.",
      "Dans l'application : **Showcase Work** → **Add New Showcase**, puis ajoutez un titre, une description (50 caractères minimum), un lieu, au moins **3 photos**, et vos compétences.",
      "Décrivez ce que vous offrez ici — je peux vous aider à rédiger le texte avant de publier.",
    ].join("\n\n");
  }
  return [
    "A showcase highlights your work on TaskZing.",
    "In the app: open **Showcase Work** → **Add New Showcase**, then add a title, description (at least 50 characters), location, at least **3 photos**, and your skills.",
    "Tell me what you offer — I can help you draft the wording before you publish.",
  ].join("\n\n");
}

export function formatTopicMismatchReply(
  userText: string,
  locale: "en" | "fr"
): string {
  const q = userText.trim().slice(0, 120);
  if (locale === "fr") {
    return [
      "Je n'ai pas une bonne réponse pour cela tout de suite.",
      q ? `Vous avez demandé : « ${q} ».` : "",
      "Essayez **Emplois** pour les offres près de vous, **Vitrines**, ou décrivez votre besoin en une phrase.",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    "I don't have a good answer for that right now.",
    q ? `You asked: "${q}"` : "",
    "Try **Jobs nearby** for local listings, **Showcases**, or describe what you need in one sentence.",
  ]
    .filter(Boolean)
    .join("\n");
}
