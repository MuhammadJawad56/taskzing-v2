/**
 * TaskZing knowledge dataset for ChatZing API.
 * Injected as a system message on each chat (API has no separate upload endpoint).
 */

import {
  knowledgeBase,
  type KnowledgeEntry,
  getKnowledgeDataset as getBaseDataset,
} from "./knowledgeBase";
import { buildAgentBehaviorPrompt, type AgentSessionState } from "./agentBehavior";
import type { ApiChatMessage } from "./types";

export const CHATZING_DATASET_VERSION = "2.1.0";

/** Additional entries beyond knowledgeBase.ts */
export const extraKnowledgeEntries: KnowledgeEntry[] = [
  {
    keywords: ["sign up", "signup", "register", "create account", "join taskzing"],
    keywordsFr: ["inscription", "s'inscrire", "créer un compte", "rejoindre"],
    category: "Account",
    answer:
      "Sign up from the login page with email or Google. Complete email verification if prompted, then finish your initial profile (role, location, skills). Clients can post jobs; providers can add showcase work and apply to jobs.",
    answerFr:
      "Inscrivez-vous depuis la page de connexion par e-mail ou Google. Complétez la vérification e-mail si demandé, puis votre profil initial (rôle, lieu, compétences).",
    relatedTopics: ["login", "initial profile", "become provider"],
  },
  {
    keywords: ["login", "sign in", "log in", "can't login"],
    keywordsFr: ["connexion", "se connecter", "impossible de se connecter"],
    category: "Account",
    answer:
      "Use Login with your email/password or Google. If you forgot your password, use Forgot Password. Stay signed in on trusted devices. If login fails, check your connection and verify your email.",
    answerFr:
      "Utilisez Connexion avec e-mail/mot de passe ou Google. Mot de passe oublié : utilisez la récupération. Vérifiez votre e-mail si la connexion échoue.",
    relatedTopics: ["signup", "forgot password"],
  },
  {
    keywords: ["become provider", "switch to provider", "provider role", "freelancer"],
    keywordsFr: ["devenir prestataire", "rôle prestataire", "freelance"],
    category: "Account",
    answer:
      "From Become Provider (or profile onboarding), submit provider details and skills. Once approved as a provider you can showcase work, explore jobs, apply with proposals, and use provider navigation (Explore, My Tasks, Showcase).",
    answerFr:
      "Via Devenir prestataire, soumettez vos informations et compétences. Ensuite vous pouvez créer une vitrine, explorer les emplois et envoyer des propositions.",
    relatedTopics: ["showcase", "explore", "proposals"],
  },
  {
    keywords: ["my tasks", "my jobs", "assigned tasks", "task list"],
    keywordsFr: ["mes tâches", "mes emplois", "liste des tâches"],
    category: "Jobs",
    answer:
      "My Tasks shows jobs you posted (client) or jobs you applied to / are working on (provider). Filter by status: open, in progress, or complete. Open a task for messages, details, and completion actions.",
    answerFr:
      "Mes tâches affiche les emplois que vous avez publiés ou auxquels vous participez. Filtrez par statut : ouvert, en cours ou terminé.",
    relatedTopics: ["job status", "proposals"],
  },
  {
    keywords: ["complete job", "mark complete", "finish task", "job done"],
    keywordsFr: ["terminer l'emploi", "marquer comme terminé", "tâche finie"],
    category: "Jobs",
    answer:
      "When work is finished, the client or provider can mark the job complete from task details. After completion, both parties can leave ratings and reviews.",
    answerFr:
      "Quand le travail est terminé, marquez l'emploi comme terminé depuis les détails. Ensuite, laissez des avis et notes.",
    relatedTopics: ["reviews", "payments"],
  },
  {
    keywords: ["notifications", "alerts", "push notification", "bell icon"],
    keywordsFr: ["notifications", "alertes", "cloche"],
    category: "Settings",
    answer:
      "Notifications alert you to new messages, proposals, and job updates. Manage notification preferences in Settings. Use the bell icon in the header to view recent activity.",
    answerFr:
      "Les notifications vous alertent pour les messages, propositions et mises à jour d'emplois. Gérez-les dans Paramètres. Utilisez l'icône cloche dans l'en-tête.",
    relatedTopics: ["messages", "settings"],
  },
  {
    keywords: ["map", "location", "google maps", "near me", "distance"],
    keywordsFr: ["carte", "localisation", "google maps", "près de moi"],
    category: "Navigation",
    answer:
      "TaskZing uses maps and geolocation to show jobs and providers near you. Allow location access for accurate nearby results on Explore, post-task, and ChatZing local insights.",
    answerFr:
      "TaskZing utilise les cartes et la géolocalisation pour les emplois et prestataires à proximité. Autorisez la localisation pour de meilleurs résultats.",
    relatedTopics: ["filters", "nearby jobs"],
  },
  {
    keywords: ["categories", "browse categories", "service types", "job category"],
    keywordsFr: ["catégories", "types de services", "catégorie d'emploi"],
    category: "Navigation",
    answer:
      "Browse categories from the home or category pages to find common service types (cleaning, tutoring, repairs, etc.). Categories help filter jobs and showcase when posting or exploring.",
    answerFr:
      "Parcourez les catégories pour trouver des types de services courants. Les catégories aident à filtrer emplois et vitrines.",
    relatedTopics: ["post job", "explore"],
  },
  {
    keywords: ["fees", "commission", "pricing", "how much does taskzing cost", "payment fee"],
    keywordsFr: ["frais", "commission", "tarifs", "coût"],
    category: "Payments",
    answer:
      "TaskZing connects clients and providers; payment processing uses Stripe. Check Terms & Conditions and in-app pricing info for current fee structure. Add a payment method in Settings before paying for services.",
    answerFr:
      "Les paiements passent par Stripe. Consultez les Conditions d'utilisation pour la structure des frais. Ajoutez un moyen de paiement dans Paramètres.",
    relatedTopics: ["payment", "stripe"],
  },
  {
    keywords: ["cancel job", "delete job", "withdraw proposal", "cancel application"],
    keywordsFr: ["annuler l'emploi", "supprimer l'emploi", "retirer la proposition"],
    category: "Jobs",
    answer:
      "Clients can manage or close open jobs from job details or My Tasks. Providers can withdraw proposals before acceptance if the app allows it from the proposal screen.",
    answerFr:
      "Les clients peuvent gérer ou fermer les emplois ouverts. Les prestataires peuvent retirer une proposition avant acceptation si l'option est disponible.",
    relatedTopics: ["my tasks", "proposals"],
  },
  {
    keywords: ["report", "complaint", "suggestion", "feedback", "support"],
    keywordsFr: ["signaler", "plainte", "suggestion", "commentaires", "support"],
    category: "Support",
    answer:
      "Submit suggestions or complaints from Settings > Suggestions & Complaints. Describe the issue clearly. For payment disputes, include job ID and dates.",
    answerFr:
      "Soumettez suggestions ou plaintes via Paramètres > Suggestions et plaintes. Pour les litiges de paiement, incluez l'ID de l'emploi.",
    relatedTopics: ["settings", "troubleshooting"],
  },
  {
    keywords: ["availability", "available for work", "schedule", "hours"],
    keywordsFr: ["disponibilité", "disponible pour travailler", "horaires"],
    category: "Profile",
    answer:
      "Update your availability from profile/edit profile so clients know when you can take jobs. Availability improves matching for local requests.",
    answerFr:
      "Mettez à jour votre disponibilité dans le profil pour que les clients sachent quand vous êtes libre.",
    relatedTopics: ["profile", "edit profile"],
  },
  {
    keywords: ["initial profile", "onboarding", "setup profile", "first time"],
    keywordsFr: ["profil initial", "intégration", "configurer le profil"],
    category: "Account",
    answer:
      "After signup, complete initial profile steps: choose client and/or provider role, add photo, bio, location, and skills. This unlocks posting jobs, showcase, and explore features.",
    answerFr:
      "Après l'inscription, complétez le profil : rôle, photo, bio, lieu et compétences pour débloquer toutes les fonctionnalités.",
    relatedTopics: ["signup", "edit profile"],
  },
  {
    keywords: ["client home", "dashboard home", "home page client"],
    keywordsFr: ["accueil client", "tableau de bord client"],
    category: "Navigation",
    answer:
      "Client home shows your overview: quick actions to post a job, browse providers, view messages, and see recent activity tailored to hiring locally.",
    answerFr:
      "L'accueil client affiche un aperçu : publier un emploi, parcourir les prestataires, messages et activité récente.",
    relatedTopics: ["post job", "explore"],
  },
  {
    keywords: ["provider explore", "find work", "gig", "side hustle"],
    keywordsFr: ["explorer prestataire", "trouver du travail", "gig"],
    category: "Navigation",
    answer:
      "Provider Explore lists open jobs and showcase inspiration near you. Use filters, save jobs, and apply with tailored proposals.",
    answerFr:
      "Explorer prestataire liste les emplois ouverts près de vous. Utilisez les filtres, enregistrez et postulez avec des propositions.",
    relatedTopics: ["find jobs", "proposals"],
  },
  {
    keywords: ["reels", "videos", "short video", "portfolio video"],
    keywordsFr: ["reels", "vidéos", "court métrage"],
    category: "Profile",
    answer:
      "Reels let providers share short videos of their work for more engaging showcase. Add reels from profile or showcase flows where supported.",
    answerFr:
      "Les Reels permettent de partager de courtes vidéos de votre travail pour une vitrine plus engageante.",
    relatedTopics: ["showcase", "profile"],
  },
  {
    keywords: ["deactivate account", "delete account", "close account"],
    keywordsFr: ["désactiver le compte", "supprimer le compte", "fermer le compte"],
    category: "Account",
    answer:
      "Deactivate your account from Settings if you need to pause or leave TaskZing. This limits access until you contact support or reactivate per policy.",
    answerFr:
      "Désactivez votre compte depuis Paramètres pour quitter ou suspendre TaskZing selon la politique en vigueur.",
    relatedTopics: ["settings", "privacy"],
  },
  {
    keywords: ["forgot password", "reset password", "password recovery"],
    keywordsFr: ["mot de passe oublié", "réinitialiser le mot de passe"],
    category: "Account",
    answer:
      "Use Forgot Password on the login page. Check email for a reset link, set a new password, then sign in again.",
    answerFr:
      "Utilisez Mot de passe oublié sur la page de connexion. Suivez le lien e-mail pour définir un nouveau mot de passe.",
    relatedTopics: ["login"],
  },
  {
    keywords: ["fab", "floating button", "quick actions", "plus menu"],
    keywordsFr: ["bouton flottant", "actions rapides", "menu plus"],
    category: "Navigation",
    answer:
      "The floating action button (FAB) or plus menu offers quick shortcuts: post a job, showcase, messages, ChatZing AI, and more depending on your role.",
    answerFr:
      "Le bouton flottant ou menu plus offre des raccourcis : publier un emploi, vitrine, messages, ChatZing IA, selon votre rôle.",
    relatedTopics: ["chatzing", "post job"],
  },
  {
    keywords: ["hire", "book provider", "accept proposal", "choose provider"],
    keywordsFr: ["embaucher", "réserver", "accepter la proposition", "choisir un prestataire"],
    category: "Jobs",
    answer:
      "Review proposals on your job, compare price and timeline, message providers, then accept the best proposal to start the job. Payment flows follow Stripe setup in Settings.",
    answerFr:
      "Examinez les propositions, comparez prix et délais, discutez avec les prestataires, puis acceptez la meilleure proposition pour démarrer.",
    relatedTopics: ["proposals", "payment"],
  },
];

export function getAllKnowledgeEntries(): KnowledgeEntry[] {
  return [...knowledgeBase, ...extraKnowledgeEntries];
}

export function getFullKnowledgeDataset() {
  const entries = getAllKnowledgeEntries();
  return {
    version: CHATZING_DATASET_VERSION,
    entryCount: entries.length,
    product: "TaskZing",
    description:
      "Official ChatZing knowledge base: app how-to, jobs, showcase, payments, ChatZing AI tools (voice, vision, posters, local demand).",
    entries: entries.map((e) => ({
      category: e.category,
      keywords: e.keywords,
      keywordsFr: e.keywordsFr ?? [],
      answer:
        typeof e.answer === "function" ? e.answer() : e.answer,
      answerFr:
        e.answerFr == null
          ? undefined
          : typeof e.answerFr === "function"
            ? e.answerFr()
            : e.answerFr,
      relatedTopics: e.relatedTopics ?? [],
    })),
  };
}

function resolveEntryAnswer(entry: KnowledgeEntry, locale: "en" | "fr"): string {
  if (locale === "fr" && entry.answerFr) {
    return typeof entry.answerFr === "function" ? entry.answerFr() : entry.answerFr;
  }
  return typeof entry.answer === "function" ? entry.answer() : entry.answer;
}

const SYSTEM_PROMPT_MAX = 14_000;

/** System prompt injected into POST /v1/chat so the API has full TaskZing context. */
export function buildKnowledgeSystemPrompt(locale: "en" | "fr"): string {
  const intro =
    locale === "fr"
      ? `Tu es ChatZing, l'assistant officiel TaskZing. Réponds dans la langue de l'utilisateur. Pour « comment utiliser TaskZing », utilise la base ci-dessous. Pour emplois, vitrines, affiches et demande locale en direct, utilise les outils internes disponibles — sans jamais citer leurs noms techniques à l'utilisateur.`
      : `You are ChatZing, the official TaskZing assistant. Reply in the user's language. For "how to use TaskZing" questions, use the knowledge base below. For live jobs, showcases, posters, and local demand, use the internal tools available — never quote their technical names to the user.`;

  const lines: string[] = [intro, "", "TASKZING_KNOWLEDGE_BASE:"];
  for (const entry of getAllKnowledgeEntries()) {
    const kw = [...entry.keywords, ...(entry.keywordsFr ?? [])].slice(0, 10).join(", ");
    const ans = resolveEntryAnswer(entry, locale).replace(/\s+/g, " ").trim();
    lines.push(`[${entry.category}] keywords: ${kw}`);
    lines.push(`answer: ${ans.slice(0, 380)}`);
    lines.push("");
  }

  let text = lines.join("\n");
  if (text.length > SYSTEM_PROMPT_MAX) {
    text = `${text.slice(0, SYSTEM_PROMPT_MAX)}\n...[dataset truncated]`;
  }
  return text;
}

export type ChatApiSessionOptions = Pick<
  AgentSessionState,
  "locationConfirmed" | "pendingLocation"
>;

function buildFullSystemPrompt(
  locale: "en" | "fr",
  session?: ChatApiSessionOptions
): string {
  const knowledge = buildKnowledgeSystemPrompt(locale);
  const behavior = buildAgentBehaviorPrompt(locale, {
    locationConfirmed: session?.locationConfirmed ?? false,
    pendingLocation: session?.pendingLocation ?? null,
  });
  return `${knowledge}\n\n${behavior}`;
}

/** Build API messages with dataset + agent behavior + conversation history. */
export function buildChatApiMessages(
  history: { role: "user" | "assistant"; content: string }[],
  nextUserText: string,
  locale: "en" | "fr",
  session?: ChatApiSessionOptions
): ApiChatMessage[] {
  return [
    { role: "system", content: buildFullSystemPrompt(locale, session) },
    ...history.map((m) => ({
      role: m.role as ApiChatMessage["role"],
      content: m.content,
    })),
    { role: "user", content: nextUserText },
  ];
}

/**
 * Image requests use a short vision-only system prompt (no full KB — avoids irrelevant taskzing_help answers).
 */
export function buildImageFocusedChatMessages(
  history: { role: "user" | "assistant"; content: string }[],
  agentUserText: string,
  locale: "en" | "fr",
  userQuestion: string
): ApiChatMessage[] {
  const q = userQuestion.trim();
  const system =
    locale === "fr"
      ? `Tu es ChatZing, assistant TaskZing. L'utilisateur a joint une IMAGE (context.attachments).

RÈGLES STRICTES:
1) Analyse l'image jointe avant de répondre.
2) Décris ce qui est VISIBLE: titres, boutons, menus, textes à l'écran (ex. « Nearest Jobs », « See more »).
3) Réponds UNIQUEMENT à la question sur CETTE image.
INTERDIT: messagerie générique, paiements, paramètres, noms d'outils API, ou listes de capacités non liées à l'image.`
      : `You are ChatZing, the TaskZing assistant. The user attached an IMAGE.

STRICT RULES:
1) Analyze the attached image before answering.
2) Describe what is VISIBLE: headings, buttons, menus, on-screen text (e.g. "Nearest Jobs", "See more").
3) Answer ONLY the user's question about THIS image.
FORBIDDEN: generic messaging, payments, settings, API tool names, or capability lists unrelated to the image.`;

  const slimHistory = history
    .filter((m) => !m.content.startsWith("[Photo") && !m.content.startsWith("[Image"))
    .slice(-4);

  return [
    { role: "system", content: system },
    ...slimHistory.map((m) => ({
      role: m.role as ApiChatMessage["role"],
      content: m.content,
    })),
    { role: "user", content: agentUserText },
  ];
}

/** @deprecated use getFullKnowledgeDataset */
export function getKnowledgeDataset() {
  return getBaseDataset();
}
