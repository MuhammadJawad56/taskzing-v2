export type LocalChatIntent =
  | "greeting"
  | "thanks"
  | "farewell"
  | "time"
  | "date"
  | "datetime";

const GREETING_EN =
  /^(hi|hello|hey|howdy|yo|good\s+(morning|afternoon|evening|night)|how\s+are\s+you|how'?s\s+it\s+going)[\s!.?,]*$/i;
const GREETING_FR =
  /^(bonjour|salut|bonsoir|coucou|bonne\s+(journée|soirée|nuit)|comment\s+allez-vous|comment\s+ça\s+va|ça\s+va)[\s!.?,]*$/i;
const THANKS_EN = /^(thanks|thank\s+you|thx|ty|appreciate\s+it)[\s!.?,]*$/i;
const THANKS_FR = /^(merci|merci\s+beaucoup)[\s!.?,]*$/i;
const FAREWELL_EN = /^(bye|goodbye|see\s+you|later|good\s+night)[\s!.?,]*$/i;
const FAREWELL_FR = /^(au\s+revoir|à\s+bientôt|a\s+bientot|bonne\s+nuit)[\s!.?,]*$/i;

const TIME_EN =
  /\b(what\s+time|time\s+now|current\s+time|what'?s\s+the\s+time)\b/i;
const TIME_FR = /\b(quelle\s+heure|heure\s+actuelle|l'heure)\b/i;
const DATE_EN =
  /\b(what\s+day|what'?s\s+today|today'?s\s+date|current\s+date|what\s+date|what'?s\s+the\s+date)\b/i;
const DATE_FR =
  /\b(quel\s+jour|date\s+d'aujourd'hui|date\s+actuelle|quelle\s+date|on\s+est\s+le)\b/i;

/** Short conversational inputs handled without calling the ChatZing API. */
export function detectLocalChatIntent(text: string, locale: "en" | "fr"): LocalChatIntent | null {
  const t = text.trim();
  if (!t || t.length > 120) return null;

  const isFr = locale === "fr";

  if (isFr ? GREETING_FR.test(t) : GREETING_EN.test(t)) return "greeting";
  if (isFr ? THANKS_FR.test(t) : THANKS_EN.test(t)) return "thanks";
  if (isFr ? FAREWELL_FR.test(t) : FAREWELL_EN.test(t)) return "farewell";

  const wantsTime = isFr ? TIME_FR.test(t) : TIME_EN.test(t);
  const wantsDate = isFr ? DATE_FR.test(t) : DATE_EN.test(t);
  if (wantsTime && wantsDate) return "datetime";
  if (wantsTime) return "time";
  if (wantsDate) return "date";

  return null;
}

function formatTime(locale: "en" | "fr"): string {
  const now = new Date();
  return locale === "fr"
    ? now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })
    : now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDate(locale: "en" | "fr"): string {
  const now = new Date();
  return locale === "fr"
    ? now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function formatLocalChatReply(
  intent: LocalChatIntent,
  locale: "en" | "fr",
  userText?: string
): string {
  const isFr = locale === "fr";
  const t = (userText ?? "").toLowerCase();

  switch (intent) {
    case "greeting":
      if (/how\s+are|how'?s\s+it|comment\s+allez|comment\s+ça|ça\s+va/.test(t)) {
        return isFr
          ? "Très bien, merci. Comment puis-je vous aider sur TaskZing ?"
          : "I'm doing well, thank you. How can I help you with TaskZing?";
      }
      return isFr
        ? "Bonjour. Je suis ChatZing, votre assistant TaskZing. Comment puis-je vous aider ?"
        : "Hello. I am ChatZing, your TaskZing assistant. How can I help you today?";
    case "thanks":
      return isFr
        ? "Avec plaisir. N'hésitez pas si vous avez d'autres questions sur TaskZing."
        : "You're welcome. Let me know if you have any other TaskZing questions.";
    case "farewell":
      return isFr
        ? "Au revoir. Revenez quand vous avez besoin d'aide sur TaskZing."
        : "Goodbye. Come back anytime you need help with TaskZing.";
    case "time":
      return isFr
        ? `Il est ${formatTime(locale)}. Puis-je vous aider avec TaskZing ?`
        : `The time is ${formatTime(locale)}. How can I help you with TaskZing?`;
    case "date":
      return isFr
        ? `Nous sommes le ${formatDate(locale)}. Puis-je vous aider avec TaskZing ?`
        : `Today is ${formatDate(locale)}. How can I help you with TaskZing?`;
    case "datetime":
      return isFr
        ? `Nous sommes le ${formatDate(locale)}, ${formatTime(locale)}. Puis-je vous aider avec TaskZing ?`
        : `Today is ${formatDate(locale)}, and the time is ${formatTime(locale)}. How can I help you with TaskZing?`;
    default:
      return isFr ? "Comment puis-je vous aider ?" : "How can I help you?";
  }
}

export function isConversationalUserMessage(text: string, locale: "en" | "fr"): boolean {
  return detectLocalChatIntent(text, locale) != null;
}
