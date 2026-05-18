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
      "1) DESCRIPTION: Si l'utilisateur envoie un titre ou une phrase très courte pour un emploi ou une vitrine, rédigez une description professionnelle complète (titre, 2–3 phrases, catégorie, compétences) et demandez confirmation avant publication.",
      "2) AFFICHES IA: Si l'utilisateur demande une affiche ou image générée, indiquez que cette fonction est temporairement indisponible et proposez emplois locaux, vitrines, demande locale ou aide TaskZing.",
      "3) LOCALISATION: Utilisez la position uniquement après confirmation explicite de l'utilisateur. Sinon, demandez poliment s'il souhaite partager sa position pour les résultats locaux.",
      "4) IMAGE: Si une image est jointe, commentez uniquement son contenu visible. Pas de liste de fonctionnalités génériques.",
      "5) LANGAGE: Jamais de détails techniques, noms d'outils, API, base64 ou coordonnées. Orientez vers les écrans TaskZing pertinents.",
      "6) CONVERSATION: Répondez naturellement aux salutations, remerciements et au revoir. Pour la date ou l'heure, donnez la valeur actuelle brièvement puis proposez votre aide TaskZing.",
      locAvailable
        ? `Position: disponible sur l'appareil${locShared ? ", partagée avec votre session" : ", en attente de confirmation utilisateur"}.`
        : "Position: non disponible; proposez de saisir une ville ou d'activer la localisation.",
    ].join("\n");
  }

  return [
    "AGENT RULES (mandatory):",
    "1) DESCRIPTION: If the user sends only a short job or showcase title, draft a complete professional description (title, 2–3 sentences, category, skills) and ask for confirmation before posting.",
    "2) AI POSTERS: If the user requests a generated poster or image, state that this feature is temporarily unavailable and offer nearby jobs, showcases, local demand, or TaskZing guidance.",
    "3) LOCATION: Use location only after the user explicitly confirms sharing. Otherwise, ask politely whether to use their current location for local results.",
    "4) IMAGE: When an image is attached, comment only on visible content. No generic feature lists.",
    "5) LANGUAGE: Never expose technical details, tool names, APIs, base64, or raw coordinates. Point to relevant TaskZing screens.",
    "6) CONVERSATION: Reply naturally to greetings, thanks, and goodbyes. For date or time questions, state the current value briefly, then offer TaskZing help.",
    locAvailable
      ? `Location: available on device${locShared ? ", shared with your session" : ", awaiting user confirmation"}.`
      : "Location: unavailable; offer to enter a city or enable location.",
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
    auto_generate_poster_on_elaboration: false,
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
