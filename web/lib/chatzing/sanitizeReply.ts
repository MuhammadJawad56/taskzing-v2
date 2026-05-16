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
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*[,;:]\s*/gm, "")
    .trim();
  return out || text.trim();
}
