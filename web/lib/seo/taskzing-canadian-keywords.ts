/**
 * 1000 unique, TaskZing-led phrases for Canadian local SEO metadata.
 * Each entry includes the TaskZing brand and a Canadian city or nationwide angle.
 */

const CANADIAN_CITIES = [
  "Toronto",
  "Vancouver",
  "Montreal",
  "Calgary",
  "Edmonton",
  "Ottawa",
  "Winnipeg",
  "Quebec City",
  "Hamilton",
  "Kitchener",
  "London Ontario",
  "Victoria BC",
  "Halifax",
  "Oshawa",
  "Windsor Ontario",
  "Saskatoon",
  "Regina",
  "Sherbrooke",
  "Kelowna",
  "Kingston Ontario",
  "Milton Ontario",
  "Brampton",
  "Surrey BC",
  "Burnaby",
  "Richmond BC",
  "Markham",
  "Vaughan",
  "Mississauga",
  "Gatineau",
  "Laval",
  "Longueuil",
  "Oakville",
  "Burlington Ontario",
  "Niagara Falls Ontario",
  "Barrie",
  "Abbotsford",
  "Coquitlam",
  "Saanich",
  "Langley BC",
  "Delta BC",
] as const;

const LOCAL_SERVICES = [
  "handyman services",
  "house cleaning",
  "office cleaning",
  "moving help",
  "furniture assembly",
  "junk removal",
  "lawn care",
  "snow removal",
  "interior painting",
  "drywall repair",
  "plumbing services",
  "electrical services",
  "HVAC repair",
  "appliance repair",
  "mobile car detailing",
  "pet sitting",
  "dog walking",
  "private tutoring",
  "event photography",
  "graphic design",
  "website development",
  "IT tech support",
  "small business bookkeeping",
  "personal errands",
  "courier delivery",
] as const;

const PATTERNS = [
  (city: string, service: string) => `TaskZing ${service} ${city}`,
  (city: string, service: string) => `TaskZing in ${city} for ${service}`,
  (city: string, service: string) => `hire TaskZing for ${service} in ${city} Canada`,
] as const;

function buildKeywords(): string[] {
  const list: string[] = [];
  let n = 0;
  for (const city of CANADIAN_CITIES) {
    for (const service of LOCAL_SERVICES) {
      list.push(PATTERNS[n % PATTERNS.length](city, service));
      n++;
    }
  }
  return list;
}

export const TASKZING_CANADIAN_SEO_KEYWORDS: string[] = buildKeywords();

if (TASKZING_CANADIAN_SEO_KEYWORDS.length !== 1000) {
  throw new Error(
    `TASKZING_CANADIAN_SEO_KEYWORDS must have length 1000 (40×25), got ${TASKZING_CANADIAN_SEO_KEYWORDS.length}`,
  );
}
