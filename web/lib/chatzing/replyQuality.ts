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

export function formatPosterGenerationFailed(locale: "en" | "fr", subject: string): string {
  if (locale === "fr") {
    return [
      `Je n'ai pas pu générer l'affiche pour « ${subject} » pour le moment.`,
      "Réessayez dans un instant, ou précisez le titre et le sous-titre souhaités.",
    ].join("\n");
  }
  return [
    `I couldn't generate the "${subject}" poster right now.`,
    "Please try again in a moment, or tell me the title and subtitle you'd like on it.",
  ].join("\n");
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
      "Essayez le bouton **Affiche** pour une image promo, **Emplois** pour les offres près de vous, ou décrivez votre besoin en une phrase.",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    "I don't have a good answer for that right now.",
    q ? `You asked: "${q}"` : "",
    "Try the **Poster** button for a promo image, **Jobs nearby** for local listings, or describe what you need in one sentence.",
  ]
    .filter(Boolean)
    .join("\n");
}
