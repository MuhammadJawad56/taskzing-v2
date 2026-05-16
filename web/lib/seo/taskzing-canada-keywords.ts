/**
 * Canadian-market organic SEO keywords; every phrase includes "TaskZing".
 * Used by root layout metadata (meta keywords). Regenerate by changing TARGET_COUNT or data arrays.
 */

const TARGET_COUNT = 1000;

const PROVINCES = [
  "Ontario",
  "Quebec",
  "British Columbia",
  "Alberta",
  "Manitoba",
  "Saskatchewan",
  "Nova Scotia",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Prince Edward Island",
  "Yukon",
  "Northwest Territories",
  "Nunavut",
] as const;

const CITIES = [
  "Toronto",
  "Montreal",
  "Vancouver",
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
  "Windsor",
  "Saskatoon",
  "Regina",
  "Sherbrooke",
  "St. John's",
  "Barrie",
  "Kelowna",
  "Abbotsford",
  "Greater Sudbury",
  "Kingston",
  "Guelph",
  "Moncton",
  "Trois-Rivieres",
  "Brantford",
  "Saint John NB",
  "Thunder Bay",
  "Nanaimo",
  "Red Deer",
  "Lethbridge",
  "Kamloops",
  "Prince George",
  "Chilliwack",
  "Sarnia",
  "Drummondville",
  "Belleville",
  "Fort McMurray",
  "Medicine Hat",
  "Grande Prairie",
  "Fredericton",
  "Charlottetown",
  "Whitehorse",
  "Yellowknife",
  "Iqaluit",
  "Courtenay",
  "Penticton",
  "Moose Jaw",
  "Brandon",
  "Corner Brook",
] as const;

const SERVICES = [
  "handyman",
  "home cleaning",
  "deep cleaning",
  "moving help",
  "furniture assembly",
  "yard work",
  "snow removal",
  "eavestrough cleaning",
  "junk removal",
  "painting",
  "drywall repair",
  "plumbing help",
  "electrical help",
  "TV mounting",
  "IKEA assembly",
  "delivery",
  "errand running",
  "grocery pickup",
  "pet sitting",
  "dog walking",
  "lawn care",
  "gardening",
  "pressure washing",
  "window cleaning",
  "carpet cleaning",
  "organizing",
  "decluttering",
  "tutoring",
  "math tutoring",
  "French tutoring",
  "English tutoring",
  "computer help",
  "tech support",
  "photography",
  "event help",
  "catering help",
  "bartending",
  "DJ services",
  "personal assistant",
  "bookkeeping",
  "data entry",
  "virtual assistant",
  "graphic design",
  "web design",
  "logo design",
  "content writing",
  "translation",
  "French translation",
  "proofreading",
  "social media help",
  "SEO help",
  "car detailing",
  "bike repair",
  "fitness training",
  "yoga instruction",
  "music lessons",
  "babysitting",
  "senior care",
  "meal prep",
  "cooking lessons",
  "renovation help",
  "flooring install help",
  "deck staining",
  "fence repair",
  "seasonal cleanup",
  "holiday decorating",
  "small business help",
  "warehouse help",
  "event setup",
  "moving boxes",
  "storage unit help",
  "appliance install",
  "light fixture install",
  "caulking",
  "weatherstripping",
  "insulation help",
  "basement finishing help",
  "attic cleanout",
  "garage organization",
  "smart home setup",
  "WiFi setup",
  "furniture moving",
  "piano moving",
  "office relocation",
  "commercial cleaning",
  "post-construction cleaning",
  "airbnb turnover cleaning",
  "snow shovelling",
  "salting walkways",
  "leaf removal",
  "hedge trimming",
  "tree planting help",
  "mulching",
  "power raking",
  "spring cleanup",
  "fall cleanup",
] as const;

const MODIFIERS = [
  "local",
  "trusted",
  "affordable",
  "professional",
  "licensed",
  "insured",
  "same day",
  "flexible",
  "near me",
  "online",
  "remote",
  "in-person",
  "book today",
  "fast quotes",
  "verified pros",
  "skilled",
  "experienced",
  "residential",
  "commercial",
  "eco-friendly",
  "bilingual",
  "Francophone",
  "Anglophone",
] as const;

const CANADA_MARKET = [
  "Canada",
  "Canadian",
  "nationwide Canada",
  "across Canada",
  "GTA",
  "Greater Toronto Area",
  "Metro Vancouver",
  "Greater Montreal",
  "National Capital Region",
  "Calgary region",
  "Edmonton region",
  "Prairies",
  "Atlantic Canada",
  "Western Canada",
  "Central Canada",
  "Northern Canada",
  "urban Canada",
  "suburban Canada",
  "rural Canada",
  "Canadian gig economy",
  "Canadian freelance marketplace",
  "Canadian task marketplace",
  "Canadian home services",
  "Canadian small business",
  "GST friendly invoicing",
  "Canadian dollars",
  "local Canadian pros",
] as const;

const INDUSTRIES = [
  "home services",
  "skilled trades",
  "creative services",
  "tech services",
  "personal services",
  "business support",
  "events and hospitality",
  "education and tutoring",
  "health and wellness",
  "automotive help",
  "real estate prep",
  "seasonal services",
  "snow and winter services",
  "moving and logistics",
  "cleaning and maintenance",
  "assembly and installs",
  "errands and delivery",
  "pet and childcare",
  "senior support",
  "office and admin",
] as const;

function buildKeywords(): string[] {
  const set = new Set<string>();

  const add = (s: string) => {
    const t = s.replace(/\s+/g, " ").trim();
    if (t.length > 0 && t.length < 200) set.add(t);
  };

  // Core — TaskZing first
  add("TaskZing");
  add("TaskZing Canada");
  add("TaskZing Canadian marketplace");
  add("TaskZing hire local pros Canada");
  add("TaskZing post a task Canada");
  add("TaskZing find skilled professionals Canada");
  add("TaskZing gig work Canada");
  add("TaskZing freelance Canada");
  add("TaskZing odd jobs Canada");
  add("TaskZing home tasks Canada");
  add("TaskZing TaskZing app Canada");
  add("TaskZing marketplace Ontario");
  add("TaskZing marketplace Quebec");
  add("TaskZing marketplace British Columbia");
  add("TaskZing marketplace Alberta");

  for (const p of PROVINCES) {
    add(`TaskZing ${p}`);
    add(`TaskZing services ${p}`);
    add(`TaskZing hire help ${p}`);
    add(`TaskZing local tasks ${p}`);
    add(`TaskZing professionals ${p}`);
    add(`TaskZing marketplace ${p}`);
  }

  for (const c of CITIES) {
    add(`TaskZing ${c}`);
    add(`TaskZing hire in ${c}`);
    add(`TaskZing tasks ${c}`);
    add(`TaskZing pros ${c}`);
    add(`TaskZing local ${c}`);
  }

  for (const s of SERVICES) {
    add(`TaskZing ${s} Canada`);
    add(`TaskZing hire ${s} Canada`);
    add(`TaskZing book ${s} Canada`);
    add(`TaskZing ${s} near me Canada`);
  }

  for (const m of MODIFIERS) {
    add(`TaskZing ${m} Canada`);
    add(`TaskZing ${m} professionals Canada`);
    add(`TaskZing ${m} task help Canada`);
  }

  for (const cm of CANADA_MARKET) {
    add(`TaskZing ${cm}`);
    add(`TaskZing marketplace ${cm}`);
    add(`TaskZing find pros ${cm}`);
  }

  for (const ind of INDUSTRIES) {
    add(`TaskZing ${ind} Canada`);
    add(`TaskZing hire for ${ind} Canada`);
  }

  // City + service (TaskZing prominent)
  for (const c of CITIES) {
    for (const s of SERVICES) {
      add(`TaskZing ${s} ${c}`);
      add(`TaskZing hire ${s} ${c}`);
    }
  }

  for (const p of PROVINCES) {
    for (const s of SERVICES.slice(0, 40)) {
      add(`TaskZing ${s} ${p}`);
    }
  }

  for (const c of CITIES) {
    for (const m of MODIFIERS) {
      add(`TaskZing ${m} ${c}`);
    }
  }

  for (const s of SERVICES) {
    for (const m of MODIFIERS.slice(0, 12)) {
      add(`TaskZing ${m} ${s}`);
    }
  }

  // Province + modifier
  for (const p of PROVINCES) {
    for (const m of MODIFIERS) {
      add(`TaskZing ${m} ${p}`);
    }
  }

  // Industry + province
  for (const ind of INDUSTRIES) {
    for (const p of PROVINCES) {
      add(`TaskZing ${ind} ${p}`);
    }
  }

  const arr = [...set];
  if (arr.length < TARGET_COUNT) {
    let n = 0;
    while (arr.length < TARGET_COUNT) {
      const c = CITIES[n % CITIES.length];
      const s = SERVICES[n % SERVICES.length];
      const m = MODIFIERS[n % MODIFIERS.length];
      add(`TaskZing ${m} ${s} ${c}`);
      add(`TaskZing Canada ${s} ${c} ${m}`);
      n++;
      if (n > 5000) break;
    }
  }

  const deduped = [...new Set(arr)];
  deduped.sort((a, b) => {
    const ac = a.startsWith("TaskZing TaskZing") ? 1 : 0;
    const bc = b.startsWith("TaskZing TaskZing") ? 1 : 0;
    if (ac !== bc) return ac - bc;
    return a.localeCompare(b);
  });

  // Remove accidental double TaskZing typo pattern
  const cleaned = deduped.map((k) => k.replace(/TaskZing TaskZing/g, "TaskZing"));

  return [...new Set(cleaned)].slice(0, TARGET_COUNT);
}

export const TASKZING_CANADA_KEYWORDS: readonly string[] = buildKeywords();

export function assertKeywordCount(): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    if (TASKZING_CANADA_KEYWORDS.length !== TARGET_COUNT) {
      console.warn(
        `[seo] Expected ${TARGET_COUNT} keywords, got ${TASKZING_CANADA_KEYWORDS.length}. Adjust generators in taskzing-canada-keywords.ts.`,
      );
    }
  }
}
