import { isGenericCapabilitiesReply } from "./imageAnalysis";
import { isConversationalUserMessage } from "./localIntents";

/** Backend stub when the agent is not fully configured — not user-appropriate. */
export function isUnhelpfulChatzingReply(
  text: string,
  userText?: string,
  locale: "en" | "fr" = "en"
): boolean {
  if (userText && isConversationalUserMessage(userText, locale)) {
    return false;
  }
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
    return "La génération d'affiches par IA n'est pas disponible pour le moment. Je peux vous aider à publier un emploi, consulter la demande locale ou explorer les vitrines et emplois à proximité.";
  }
  return "AI poster generation is not available at the moment. I can help you post a job, review local demand, or explore nearby showcases and jobs.";
}

export function formatShowcaseGuidanceReply(locale: "en" | "fr"): string {
  if (locale === "fr") {
    return "Pour créer une vitrine, ouvrez **Vitrine** dans l'application, puis ajoutez un titre, une description (50 caractères minimum), un lieu, au moins trois photos et vos compétences. Indiquez votre offre ici si vous souhaitez de l'aide pour le texte.";
  }
  return "To create a showcase, open **Showcase Work** in the app and add a title, description (at least 50 characters), location, at least three photos, and your skills. Share what you offer here if you would like help drafting the copy.";
}

export function formatTopicMismatchReply(
  _userText: string,
  locale: "en" | "fr"
): string {
  if (locale === "fr") {
    return "Je ne peux pas répondre précisément à cette demande. Reformulez votre besoin lié à TaskZing (emploi, vitrine, demande locale ou utilisation de l'application) et je vous guiderai.";
  }
  return "I cannot answer that request precisely. Rephrase your TaskZing-related need (job, showcase, local demand, or how to use the app) and I will guide you.";
}
