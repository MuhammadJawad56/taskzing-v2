import { polishChatzingReply } from "./responseStyle";

/** Internal ChatZing tool / context identifiers — must not appear in user-facing text. */
const INTERNAL_IDENTIFIERS = [
  "list_nearby_jobs",
  "list_nearby_showcases",
  "suggest_local_niches",
  "validate_job_draft",
  "create_job",
  "generate_poster",
  "read_image",
  "transcribe_voice_note",
  "taskzing_help",
  "location_confirmed",
  "device_location_available",
  "auto_expand_descriptions",
  "auto_generate_poster_on_elaboration",
  "image_question",
  "context.attachments",
  "CHATZING_DATASET_VERSION",
] as const;

const INTERNAL_PHRASE_PATTERNS: RegExp[] = [
  /\buse\s+[a-z][a-z0-9_]*\s+to\b/gi,
  /\bcall\s+[a-z][a-z0-9_]*(?:\s*\([^)]*\))?\b/gi,
  /\bappelez\s+[a-z][a-z0-9_]*\b/gi,
  /\butilisez\s+[a-z][a-z0-9_]*\s+pour\b/gi,
  /\bcontext\.[a-z_]+\b/gi,
  /\blat\/lng\b/gi,
  /\bPOST\s+\/v1\/\S+/gi,
  /\bset\s+openai_api_key\b/gi,
  /\bOPENAI_API_KEY\b/g,
  /\bfor smarter multi-step agent mode\b/gi,
  /\bpour un mode agent multi-étapes\b/gi,
  /\bvia the API\b/gi,
  /\bvia l'API\b/gi,
  /\bthrough the API\b/gi,
  /\bpar l'API\b/gi,
  /\busing the API\b/gi,
  /\bI'll create it via\b/gi,
  /\bI will create it via\b/gi,
  /\bje (?:vais )?le créer via\b/gi,
  /\bURLs or base64\b/gi,
  /\bURL(?:s)? ou base64\b/gi,
  /\bbase64\b/gi,
  /\btool_calls?\b/gi,
  /\binvoke\s+tool\b/gi,
  /\bPOST\s+\/v1\/chat\b/gi,
  /\bPOST\s+\/v1\/tools\b/gi,
  /\bvision\s+unavailable\b/gi,
  /\bvision\s+indisponible\b/gi,
  /\bon\s+the\s+server\b/gi,
  /\bsur\s+le\s+serveur\b/gi,
  /\blat:\s*[-\d.]+/gi,
  /\blng:\s*[-\d.]+/gi,
  /\b\d+\.\d{4,}\s*,\s*[-]?\d+\.\d{4,}\b/g,
  /\b(read_image|transcribe_voice_note|taskzing_help|list_nearby_jobs|suggest_local_niches)\b/gi,
  /\b\[Voice message\]/gi,
  /\b\[Message vocal\]/gi,
  /\b\[Location confirmed\]/gi,
  /\b\[Localisation confirmée\]/gi,
  /\b\[Location declined\]/gi,
  /\b\[Localisation refusée\]/gi,
  /\b\[Capture TaskZing jointe\]/gi,
  /\b\[TaskZing screenshot attached\]/gi,
  /\b\[Vision analysis complete[^\]]*\]/gi,
  /\b\[Analyse vision déjà effectuée[^\]]*\]/gi,
  /\b\(that's me!\)/gi,
  /\b\(c'est moi!\)/gi,
];

function replaceIdentifier(text: string, id: string): string {
  const re = new RegExp(`\\b${id.replace(/\./g, "\\.")}\\b`, "gi");
  return text.replace(re, "");
}

/** Remove leaked backend tool names and implementation details from chat text. */
export function sanitizeChatzingUserFacingText(text: string): string {
  let out = text;
  for (const id of INTERNAL_IDENTIFIERS) {
    out = replaceIdentifier(out, id);
  }
  for (const re of INTERNAL_PHRASE_PATTERNS) {
    out = out.replace(re, "");
  }
  out = out
    .replace(/\s*[—–-]\s*I(?:'ll| will) create it\.?/gi, ".")
    .replace(/\s*[—–-]\s*je (?:vais )?le créer\.?/gi, ".")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*[,;:]\s*/gm, "")
    .replace(/\s+\./g, ".")
    .trim();

  if (/share photos\s*[.—]?\s*$/i.test(out)) {
    out = out.replace(/share photos\s*[.—]?\s*$/i, "upload photos in the TaskZing app.");
  }

  out = polishChatzingReply(out);
  return out || text.trim();
}

export function replyMentionsBackendLeak(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\bbase64\b/.test(t) ||
    /via the api|via l'api|through the api|par l'api/.test(t) ||
    /create_it_via|create it via/.test(t.replace(/\s/g, "_")) ||
    /\btool_calls?\b/.test(t) ||
    /\b(read_image|generate_poster|taskzing_help)\b/.test(t) ||
    /\bpost\s+\/v1\//.test(t) ||
    /\bvision unavailable\b/.test(t) ||
    /\bvision indisponible\b/.test(t)
  );
}
