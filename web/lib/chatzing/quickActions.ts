import type { LucideIcon } from "lucide-react";
import {
  ImagePlus,
  Mic,
  Briefcase,
  Grid3X3,
  TrendingUp,
  PlusCircle,
  HelpCircle,
} from "lucide-react";

export type ChatzingQuickActionId =
  | "image"
  | "voice"
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
  { id: "nearby_jobs", icon: Briefcase, usesChat: true },
  { id: "nearby_showcases", icon: Grid3X3, usesChat: true },
  { id: "local_demand", icon: TrendingUp, usesChat: true },
  { id: "post_job", icon: PlusCircle, usesChat: true },
  { id: "help", icon: HelpCircle, usesChat: true },
];

/** Natural-language prompts sent to the API (no internal tool names). */
const PROMPTS = {
  en: {
    nearby_jobs:
      "Show me open jobs near my current location with titles, categories, and distance.",
    nearby_showcases:
      "Show me provider showcases near my current location.",
    local_demand:
      "Ask what service or product I offer, then explain local demand and competition near my location.",
    post_job:
      "Help me post a new job on TaskZing. If I only give a title or short phrase, draft a full professional description for me to review, then help with budget, address, date, and skills before posting.",
    help:
      "Summarize what ChatZing can do on TaskZing: help, jobs, showcases, voice, photo analysis, and local insights.",
  },
  fr: {
    nearby_jobs:
      "Montrez-moi les emplois ouverts près de ma position avec titres, catégories et distance.",
    nearby_showcases:
      "Montrez-moi les vitrines de prestataires près de ma position.",
    local_demand:
      "Demandez ce que j'offre, puis expliquez la demande locale et la concurrence près de chez moi.",
    post_job:
      "Aidez-moi à publier un emploi sur TaskZing. Si je ne donne qu'un titre ou une phrase courte, rédigez une description complète pour validation, puis budget, adresse, date et compétences avant publication.",
    help:
      "Résumez ce que ChatZing peut faire sur TaskZing : aide, emplois, vitrines, voix, analyse de photos et insights locaux.",
  },
} as const;

const LABELS = {
  en: {
    image: "Photo",
    voice: "Voice",
    nearby_jobs: "Jobs nearby",
    nearby_showcases: "Showcases",
    local_demand: "Local demand",
    post_job: "Post job",
    help: "Help",
  },
  fr: {
    image: "Photo",
    voice: "Voix",
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
