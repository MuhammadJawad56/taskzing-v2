import type { LucideIcon } from "lucide-react";
import {
  ImagePlus,
  Mic,
  LayoutTemplate,
  Briefcase,
  Grid3X3,
  TrendingUp,
  PlusCircle,
  HelpCircle,
} from "lucide-react";

export type ChatzingQuickActionId =
  | "image"
  | "voice"
  | "poster"
  | "nearby_jobs"
  | "nearby_showcases"
  | "local_demand"
  | "post_job"
  | "help";

export type ChatzingQuickAction = {
  id: ChatzingQuickActionId;
  icon: LucideIcon;
  /** Uses chat API with a guided prompt */
  usesChat: boolean;
};

export const CHATZING_QUICK_ACTIONS: ChatzingQuickAction[] = [
  { id: "image", icon: ImagePlus, usesChat: false },
  { id: "voice", icon: Mic, usesChat: false },
  { id: "poster", icon: LayoutTemplate, usesChat: true },
  { id: "nearby_jobs", icon: Briefcase, usesChat: true },
  { id: "nearby_showcases", icon: Grid3X3, usesChat: true },
  { id: "local_demand", icon: TrendingUp, usesChat: true },
  { id: "post_job", icon: PlusCircle, usesChat: true },
  { id: "help", icon: HelpCircle, usesChat: true },
];

const PROMPTS = {
  en: {
    poster:
      "I want a marketing poster for my TaskZing service. If I only give a short title, expand it into subtitle and copy, then call generate_poster (modern template).",
    nearby_jobs:
      "After my location is confirmed in context, use list_nearby_jobs to show open jobs near me with titles, categories, and distance.",
    nearby_showcases:
      "After my location is confirmed in context, use list_nearby_showcases to show provider showcases near me.",
    local_demand:
      "Ask what service or product I offer. After my location is confirmed in context, use suggest_local_niches to explain local demand and competition.",
    post_job:
      "Help me post a new job on TaskZing. If I only give a title or short phrase, auto-write a full professional description for me to review. Then collect budget, address, date, skills, validate_job_draft, and create_job when I confirm.",
    help:
      "Summarize what ChatZing can do on TaskZing: help, jobs, showcases, posters, voice, images, and local insights.",
  },
  fr: {
    poster:
      "Je veux une affiche pour mon service TaskZing. Si je donne seulement un titre court, développez sous-titre et texte puis appelez generate_poster (modèle modern).",
    nearby_jobs:
      "Une fois ma position confirmée dans le contexte, utilisez list_nearby_jobs pour les emplois ouverts près de moi.",
    nearby_showcases:
      "Une fois ma position confirmée dans le contexte, utilisez list_nearby_showcases pour les vitrines près de moi.",
    local_demand:
      "Demandez ce que j'offre. Une fois ma position confirmée, utilisez suggest_local_niches pour la demande locale.",
    post_job:
      "Aidez-moi à publier un emploi sur TaskZing. Si je ne donne qu'un titre ou une phrase courte, rédigez une description complète pour validation. Puis budget, adresse, date, validate_job_draft et create_job après confirmation.",
    help:
      "Résumez ce que ChatZing peut faire sur TaskZing : aide, emplois, vitrines, affiches, voix, images et insights locaux.",
  },
} as const;

const LABELS = {
  en: {
    image: "Photo",
    voice: "Voice",
    poster: "Poster",
    nearby_jobs: "Jobs nearby",
    nearby_showcases: "Showcases",
    local_demand: "Local demand",
    post_job: "Post job",
    help: "Help",
  },
  fr: {
    image: "Photo",
    voice: "Voix",
    poster: "Affiche",
    nearby_jobs: "Emplois",
    nearby_showcases: "Vitrines",
    local_demand: "Demande locale",
    post_job: "Publier",
    help: "Aide",
  },
} as const;

export function getQuickActionLabel(
  id: ChatzingQuickActionId,
  locale: "en" | "fr"
): string {
  return LABELS[locale][id];
}

export function getQuickActionPrompt(
  id: ChatzingQuickActionId,
  locale: "en" | "fr"
): string | null {
  if (id === "image" || id === "voice") return null;
  return PROMPTS[locale][id];
}
