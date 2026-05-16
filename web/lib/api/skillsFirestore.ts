const DEFAULT_SKILLS = [
  "plumbing",
  "electrical",
  "cleaning",
  "carpentry",
  "painting",
  "gardening",
  "moving",
  "delivery",
  "web development",
  "design",
];

/** Skill suggestions for job/post forms (static; replace with API if available). */
export async function fetchSkillNamesFromFirestore(): Promise<string[]> {
  return [...DEFAULT_SKILLS].sort((a, b) => a.localeCompare(b));
}
