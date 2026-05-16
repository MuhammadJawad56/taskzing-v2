import type { AgentContext } from "./types";

export type AgentSessionState = {
  locale: "en" | "fr";
  locationConfirmed: boolean;
  pendingLocation: { lat: number; lng: number } | null;
};

/** Rules sent to ChatZing API so the agent handles short input, posters, and location correctly. */
export function buildAgentBehaviorPrompt(
  locale: "en" | "fr",
  session: Pick<AgentSessionState, "locationConfirmed" | "pendingLocation">
): string {
  const locAvailable = session.pendingLocation != null;
  const locShared = session.locationConfirmed && locAvailable;

  if (locale === "fr") {
    return [
      "RÈGLES AGENT (obligatoires):",
      "1) DESCRIPTION AUTO: Si l'utilisateur donne seulement un titre ou une phrase très courte pour un emploi/vitrine (ex. « plombier », « nettoyage bureau »), rédige immédiatement une description professionnelle complète (titre affiné, description 2–4 phrases, catégorie suggérée, compétences) et demande confirmation avant publication.",
      "2) AFFICHE / IMAGE: Si l'utilisateur développe son offre (bénéfices, public, style) ou demande une promo/affiche/poster, appelle generate_poster avec titre et sous-titre tirés de son message. Montre le résultat; ne redemande le titre que s'il manque.",
      "3) LOCALISATION: N'utilise JAMAIS lat/lng pour list_nearby_jobs, list_nearby_showcases ou suggest_local_niches tant que context.location_confirmed n'est pas true. Si l'outil local est nécessaire et location_confirmed est false, demande explicitement: « Puis-je utiliser votre position actuelle pour les résultats locaux ? » et attends la confirmation.",
      "4) IMAGE JOINTE: Si context.attachments contient une image OU le message inclut une analyse vision, réponds UNIQUEMENT sur le contenu de l'image. Interdit: listes génériques du type « je peux vous aider à publier un emploi ». Appelle read_image si besoin.",
      locAvailable
        ? `État appareil: position GPS disponible côté client, pas encore partagée (${locShared ? "partagée maintenant" : "en attente de confirmation"}).`
        : "État appareil: position GPS non disponible; propose de saisir une ville ou d'activer la localisation.",
    ].join("\n");
  }

  return [
    "AGENT RULES (mandatory):",
    "1) AUTO DESCRIPTION: If the user gives only a job/showcase title or very short phrase (e.g. \"math tutor\", \"office cleaning\"), immediately draft a full professional description (refined title, 2–4 sentence description, suggested category, skills) and ask for confirmation before posting.",
    "2) POSTER / IMAGE: When the user elaborates on their offer (benefits, audience, style) or asks for promo/poster/flyer/marketing image, call generate_poster using title and subtitle from their message. Return the image in the reply; only ask for a missing title.",
    "3) LOCATION: NEVER use lat/lng for list_nearby_jobs, list_nearby_showcases, or suggest_local_niches unless context.location_confirmed is true. If a local tool is needed and location_confirmed is false, explicitly ask: \"Can I use your current location for local results?\" and wait for confirmation.",
    "4) ATTACHED IMAGE: If context.attachments includes an image OR the message contains vision analysis, reply ONLY about the image content. Forbidden: generic capability lists like \"I can help you post a job\". Call read_image if needed.",
    locAvailable
      ? `Device state: GPS available on client, not shared yet (${locShared ? "shared now" : "awaiting user confirmation"}).`
      : "Device state: GPS unavailable; offer to type a city or enable location.",
  ].join("\n");
}

export function buildAgentContextFromSession(
  session: AgentSessionState,
  attachment?: import("./types").ChatAttachment | null
): AgentContext {
  const ctx: AgentContext = {
    locale: session.locale,
    location_confirmed: session.locationConfirmed,
    device_location_available: session.pendingLocation != null,
    auto_expand_descriptions: true,
    auto_generate_poster_on_elaboration: true,
  };

  if (session.locationConfirmed && session.pendingLocation) {
    ctx.lat = session.pendingLocation.lat;
    ctx.lng = session.pendingLocation.lng;
  }

  if (attachment) {
    ctx.attachments = [attachment];
    if (attachment.type === "image" && attachment.question) {
      ctx.image_question = attachment.question;
    }
  }

  return ctx;
}

const LOCATION_AFFIRM_EN =
  /\b(yes|yeah|yep|sure|ok|okay|confirm|use my location|share location|go ahead|that's fine|sounds good)\b/i;
const LOCATION_AFFIRM_FR =
  /\b(oui|ouais|d'accord|ok|confirme|utilise ma position|partage ma position|vas-y|c'est bon)\b/i;

export function isLocationAffirmation(text: string, locale: "en" | "fr"): boolean {
  const t = text.trim();
  if (t.length > 120) return false;
  return locale === "fr" ? LOCATION_AFFIRM_FR.test(t) : LOCATION_AFFIRM_EN.test(t);
}

export function isLocationDenial(text: string, locale: "en" | "fr"): boolean {
  const t = text.trim().toLowerCase();
  if (t.length > 80) return false;
  if (locale === "fr") {
    return /\b(non|pas maintenant|plus tard|refuse|ne pas utiliser)\b/.test(t);
  }
  return /\b(no|not now|later|don't|do not use)\b/.test(t);
}

/** Assistant asked for location consent — show confirm buttons in UI. */
export function suggestsLocationConfirmation(assistantText: string): boolean {
  const t = assistantText.toLowerCase();
  return (
    /current location|your location|use your (gps )?position|share your location/.test(t) ||
    /position actuelle|votre position|utiliser votre (gps )?position|partager votre position/.test(t) ||
    /can i use your location|puis-je utiliser votre position/.test(t)
  );
}

export function requiresLocationBeforeAction(actionId: string): boolean {
  return ["nearby_jobs", "nearby_showcases", "local_demand"].includes(actionId);
}
