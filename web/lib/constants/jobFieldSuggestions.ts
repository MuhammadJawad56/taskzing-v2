/**
 * Inline ghost-text suggestions for the Post a Job form.
 *
 * These arrays power the "Tab to accept" autocomplete that appears in the
 * job form text fields. Each list is ordered roughly from "most generic"
 * to "most specific" so that the first matching candidate (which is what
 * the inline overlay shows) tends to be the most useful one.
 */

export const JOB_DESCRIPTION_SUGGESTIONS: readonly string[] = [
  "i",
  "need",
  "professional",
  "help",
  "looking",
  "experienced",
  "reliable",
  "expert",
  "seeking",
  "skilled",
  "qualified",
  "person",
  "plumber",
  "fix",
  "leaking",
  "pipe",
  "kitchen",
  "emergency",
  "repair",
  "broken",
  "water",
  "heater",
  "install",
  "new",
  "toilet",
  "faucet",
  "unclog",
  "stubborn",
  "drain",
  "bathroom",
  "deep",
  "clean",
  "entire",
  "house",
  "cleaner",
  "moveout",
  "office",
  "space",
  "twice",
  "week",
  "thorough",
  "cleaning",
  "service",
  "licensed",
  "electrician",
  "ceiling",
  "fans",
  "two",
  "rooms",
  "faulty",
  "wiring",
  "light",
  "fixtures",
  "throughout",
  "painter",
  "paint",
  "interior",
  "walls",
  "apartment",
  "exterior",
  "bedrooms",
  "hallway",
  "provided",
  "mow",
  "lawn",
  "weekly",
  "during",
  "summer",
  "gardener",
  "maintain",
  "backyard",
  "garden",
  "hedge",
  "trimming",
  "removing",
  "weeds",
  "yard",
  "onetime",
  "cleanup",
  "including",
  "leaves",
  "branches",
  "handyman",
  "few",
  "small",
  "issues",
  "assembling",
  "ikea",
  "furniture",
  "mount",
  "tv",
  "living",
  "room",
  "general",
  "home",
  "maintenance",
  "minor",
  "repairs",
  "washing",
  "machine",
  "stopped",
  "spinning",
  "technician",
  "air",
  "conditioner",
  "refrigerator",
  "specialist",
  "soon",
  "possible",
  "moving",
  "across",
  "town",
  "pick",
  "item",
  "deliver",
  "babysitter",
  "kids",
  "weekday",
  "evenings",
  "dog",
  "walker",
  "short",
  "walks",
  "per",
  "day",
  "pet",
  "sitter",
  "away",
  "vacation",
  "virtual",
  "assistant",
  "email",
  "scheduling",
  "freelance",
  "writer",
  "create",
  "blog",
  "content",
  "data",
  "entry",
  "spreadsheet",
  "share",
  "availability",
  "pricing",
  "proposal",
  "materials",
  "bring",
  "own",
  "tools",
];

export const JOB_LOCATION_SUGGESTIONS: readonly string[] = [
  // United States
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Phoenix, AZ",
  "Philadelphia, PA",
  "San Antonio, TX",
  "San Diego, CA",
  "Dallas, TX",
  "San Jose, CA",
  "Austin, TX",
  "Jacksonville, FL",
  "Fort Worth, TX",
  "Columbus, OH",
  "Charlotte, NC",
  "San Francisco, CA",
  "Indianapolis, IN",
  "Seattle, WA",
  "Denver, CO",
  "Boston, MA",
  "Miami, FL",
  "Atlanta, GA",
  // India
  "Mumbai, Maharashtra",
  "Delhi, India",
  "Bengaluru, Karnataka",
  "Hyderabad, Telangana",
  "Ahmedabad, Gujarat",
  "Chennai, Tamil Nadu",
  "Kolkata, West Bengal",
  "Pune, Maharashtra",
  "Jaipur, Rajasthan",
  "Lucknow, Uttar Pradesh",
  // United Kingdom / Europe / Other
  "London, UK",
  "Manchester, UK",
  "Birmingham, UK",
  "Toronto, Canada",
  "Vancouver, Canada",
  "Sydney, Australia",
  "Melbourne, Australia",
  "Dubai, UAE",
  "Singapore",
];

export const JOB_DURATION_SUGGESTIONS: readonly string[] = [
  "30 minutes",
  "1 hour",
  "2 hours",
  "3 hours",
  "4 hours",
  "5 hours",
  "6 hours",
  "8 hours",
  "Half day",
  "Full day",
  "1 day",
  "2 days",
  "3 days",
  "4 days",
  "5 days",
  "1 week",
  "2 weeks",
  "3 weeks",
  "1 month",
  "2 months",
];

export const JOB_TIME_FLEXIBILITY_SUGGESTIONS: readonly string[] = [
  "Anytime",
  "Flexible schedule",
  "Weekdays only",
  "Weekends only",
  "Mornings preferred",
  "Afternoons preferred",
  "Evenings preferred",
  "Strictly between 9 AM and 5 PM",
  "Available after 6 PM",
  "Available before noon",
  "Anytime",
  "Flexible ",
  "Weekdays",
   "only",
  "Weekends only",
  " preferred",
  "Afternoons preferred",
  "Evenings",
  "Strictly ",
  "Available",
  " noon",
];

export const JOB_PRICE_SUGGESTIONS: readonly string[] = [
  // Fixed
  "25 USD",
  "50 USD",
  "75 USD",
  "100 USD",
  "150 USD",
  "200 USD",
  "300 USD",
  "500 USD",
  "750 USD",
  "1000 USD",
  // Hourly
  "$15/hr",
  "$20/hr",
  "$25/hr",
  "$30/hr",
  "$40/hr",
  "$50/hr",
  "$75/hr",
  "$100/hr",
];

export const JOB_LOCATION_NOTES_SUGGESTIONS: readonly string[] = [
  "please",
  "ring",
  "doorbell",
  "arrival",
  "parking",
  "available",
  "driveway",
  "use",
  "side",
  "entrance",
  "gate",
  "code",
  "provided",
  "after",
  "booking",
  "call",
  "arrive",
  "building",
  "apartment",
  "second",
  "floor",
  "elevator",
  "remove",
  "shoes",
  "before",
  "entering",
  "home",
  "friendly",
  "dog",
  "inside",
  "wear",
  "mask",
  "property",
  "located",
  "behind",
  "main",
];

function tokenizeGhostWords(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.replace(/[^a-z0-9]+/g, "").trim())
        .filter(Boolean)
    )
  );
}

/**
 * User-provided ghost vocabulary.
 * Every token is split and stored as an individual word so typing any
 * prefix can trigger inline completion.
 */
const RAW_GHOST_WORDS = `
task work job service client provider platform digital system mobile desktop application firebase database cloud server network user login signup dashboard settings profile notification message chat payment stripe security encryption storage file upload download analytics report growth marketing outreach campaign email whatsapp automation ai machine learning data processing algorithm performance optimization testing debugging deployment version control github git api integration backend frontend flutter dart react node python java cplusplus design ui ux experience responsive layout theme dark light toggle navigation routing state provider riverpod bloc architecture scalable reliable efficient fast secure authentication authorization token session cache memory disk input output keyboard typing dataset words random sample training testing evaluation model accuracy precision recall validation iteration experiment research development innovation startup business marketplace freelance gig economy contractor student university college education learning skill training support help assistance communication collaboration remote onsite hybrid project management planning execution delivery deadline timeline milestone resource allocation monitoring tracking improvement feedback review rating quality assurance control system integration continuous deployment ci cd pipeline container docker kubernetes cloud aws azure google performance scaling load balancing redundancy failover backup recovery logging monitoring alerting visualization dashboard insights metrics growth revenue profit customer acquisition retention engagement conversion funnel strategy branding advertising social media seo sem content creation writing editing proofreading translation localization internationalization globalization compliance policy terms privacy security standards encryption hashing firewall protection vulnerability patch update maintenance upgrade support troubleshooting resolution customer service helpdesk ticket system workflow automation productivity efficiency tools software hardware device printer scanner network connectivity wifi ethernet bluetooth mobile ios android windows mac linux cross platform compatibility version update release notes changelog documentation guide tutorial onboarding training support faq knowledge base community forum discussion collaboration teamwork leadership management organization communication strategy planning execution review feedback iteration improvement success failure learning adaptation flexibility resilience innovation creativity problem solving critical thinking analysis decision making leadership teamwork collaboration communication negotiation presentation reporting documentation research analysis design implementation testing deployment monitoring maintenance support scaling optimization automation integration security compliance reliability availability performance efficiency usability accessibility compatibility portability maintainability extensibility modularity reusability abstraction encapsulation inheritance polymorphism patterns principles best practices standards guidelines conventions naming structure formatting readability clarity simplicity consistency quality reliability efficiency performance scalability security usability maintainability flexibility adaptability innovation creativity growth improvement learning development success achievement goal objective mission vision strategy execution results impact value benefit outcome the you and to of a in is it that for on with as at by from this be or are was were can will would should could has have had do does did not but if they we he she them his her our their my your me us who what when where why how which all any some many few more most other one two three first second new old good bad big small high low early late right left long short same different important possible able best better strong weak hard easy fast slow light dark open close start end create build make take give find use work call try ask need feel become leave put keep let begin seem help talk turn start show hear play run move live believe bring happen write provide sit stand lose pay meet include continue set learn change lead understand watch follow stop create speak read allow add spend grow open walk win offer remember love consider appear buy wait serve die send expect build stay fall cut reach kill remain suggest raise pass sell require report decide pull return explain hope develop carry break receive agree support hit produce eat cover catch draw choose cause point listen expect prepare discover explain respond maintain identify protect control manage increase reduce improve test train evaluate measure analyze design implement deploy monitor secure connect integrate store retrieve process calculate compare classify predict cluster optimize simulate automate communicate collaborate coordinate negotiate present document record update review approve reject schedule assign track manage plan organize execute deliver complete finalize close reopen escalate resolve fix debug patch upgrade install configure run stop restart backup restore recover log audit notify alert warn inform confirm verify validate authorize authenticate encrypt decrypt compress expand translate convert format parse compile execute render display print save load export import share publish subscribe search browse navigate select filter sort group merge split copy paste cut delete insert update replace append prepend join separate map reduce fold iterate loop condition branch switch break continue return call invoke trigger handle catch throw error exception warning info debug trace log monitor observe inspect examine check verify validate test confirm approve reject accept decline choose decide plan organize schedule arrange coordinate manage lead follow support assist help guide direct control operate run execute perform act react respond adapt adjust modify change transform improve optimize refine enhance develop grow expand increase decrease reduce minimize maximize balance maintain sustain preserve protect secure defend attack challenge solve resolve fix repair restore recover rebuild replace upgrade downgrade install uninstall configure setup initialize start stop pause resume restart continue finish complete end close open create destroy generate produce build construct design develop implement test deploy release maintain support manage control monitor observe track measure evaluate analyze report document record log audit review inspect check verify validate confirm approve reject accept decline decide choose select pick prefer prioritize rank rate score grade classify categorize label tag organize arrange sort filter group cluster segment divide split merge combine join connect link associate relate map transform convert translate interpret understand learn teach train practice exercise repeat remember recall recognize identify detect discover find locate search explore investigate examine inspect observe monitor track follow pursue chase capture catch hold keep maintain preserve protect secure defend attack challenge solve resolve fix repair restore recover rebuild replace upgrade downgrade install configure setup initialize start stop pause resume restart continue finish complete end close open add them in input ghost words data set use all words seperately as one word as a data
`;

const RAW_GHOST_WORDS_ADDITIONAL = `
the you and to of a in is it that for on with as at by from this be or are was were can will would should could has have had do does did not but if they we he she them his her our their my your me us who what when where why how which all any some many few more most other one two three first second new old good bad big small high low early late right left long short same different important possible able best better strong weak hard easy fast slow light dark open close start end create build make take give find use work call try ask need feel become leave put keep let begin seem help talk turn start show hear play run move live believe bring happen write provide sit stand lose pay meet include continue set learn change lead understand watch follow stop create speak read allow add spend grow open walk win offer remember love consider appear buy wait serve die send expect build stay fall cut reach kill remain suggest raise pass sell require report decide pull return explain hope develop carry break receive agree support hit produce eat cover catch draw choose cause point listen expect prepare discover explain respond maintain identify protect control manage increase reduce improve test train evaluate measure analyze design implement deploy monitor secure connect integrate store retrieve process calculate compare classify predict cluster optimize simulate automate communicate collaborate coordinate negotiate present document record update review approve reject schedule assign track manage plan organize execute deliver complete finalize close reopen escalate resolve fix debug patch upgrade install configure run stop restart backup restore recover log audit notify alert warn inform confirm verify validate authorize authenticate encrypt decrypt compress expand translate convert format parse compile execute render display print save load export import share publish subscribe search browse navigate select filter sort group merge split copy paste cut delete insert update replace append prepend join separate map reduce fold iterate loop condition branch switch break continue return call invoke trigger handle catch throw error exception warning info debug trace log monitor observe inspect examine check verify validate test confirm approve reject accept decline choose decide plan organize schedule arrange coordinate manage lead follow support assist help guide direct control operate run execute perform act react respond adapt adjust modify change transform improve optimize refine enhance develop grow expand increase decrease reduce minimize maximize balance maintain sustain preserve protect secure defend attack challenge solve resolve fix repair restore recover rebuild replace upgrade downgrade install uninstall configure setup initialize start stop pause resume restart continue finish complete end close open create destroy generate produce build construct design develop implement test deploy release maintain support manage control monitor observe track measure evaluate analyze report document record log audit review inspect check verify validate confirm approve reject accept decline decide choose select pick prefer prioritize rank rate score grade classify categorize label tag organize arrange sort filter group cluster segment divide split merge combine join connect link associate relate map transform convert translate interpret understand learn teach train practice exercise repeat remember recall recognize identify detect discover find locate search explore investigate examine inspect observe monitor track follow pursue chase capture catch hold keep maintain preserve protect secure defend attack challenge solve resolve fix repair restore recover rebuild replace upgrade downgrade install uninstall configure setup initialize start stop pause resume restart continue finish complete end close open create destroy generate produce build construct design develop implement test deploy release maintain support manage control monitor observe track measure evaluate analyze report document record log audit review inspect check verify validate confirm approve reject accept decline decide choose select pick prefer prioritize rank rate score grade classify categorize label tag organize arrange sort filter group cluster segment divide split merge combine join connect link associate relate map transform convert translate interpret understand learn teach train practice exercise repeat remember recall recognize identify detect discover find locate search explore investigate examine inspect observe monitor track follow pursue chase capture catch hold keep maintain preserve protect secure defend attack challenge solve resolve fix repair restore recover rebuild replace upgrade downgrade install configure setup initialize start stop pause resume restart continue finish complete end close open
`;

/** One hundred extra trade / property / finishing tokens for ghost autocomplete (deduped with existing pools). */
const RAW_GHOST_WORDS_PLUS_100 = `
toolkit ladder blueprint tenant landlord invoice warranty seasonal weekday holiday rush portfolio cabling breaker joist rafter shingle flashing downspout sump erosion grading sprinkler mulch compost aeration overseeding stump chainsaw leafblower pressurewasher degreaser sanitizer disinfectant mildew allergen steamer upholstery drapery weatherstrip deadbolt hinge latch striker spackle skimcoat varnish grout caulk weatherproof thermostat humidifier subfloor mudding dropcloth tarp scaffold harness respirator lockbox concierge strata easement setback survey reinspect touchup recoat colormatch wainscoting casement jamb soffit fascia batten lath stucco tuckpoint repoint repave reseal retrofit roughin knockdown repiping descale deliming anode ignitor recirculating aquastat tempering backflow hydrojet auger cleanout crimping brazing escutcheon baluster
`;

export const JOB_EXTRA_WORD_SUGGESTIONS: readonly string[] = Array.from(
  tokenizeGhostWords(`${RAW_GHOST_WORDS} ${RAW_GHOST_WORDS_ADDITIONAL} ${RAW_GHOST_WORDS_PLUS_100}`)
);

const RAW_GHOST_WORDS_FRENCH = `
bonjour salut besoin aide professionnel prestataire client service tache travail urgence aujourdhui demain disponible rapide fiabilite qualite devis prix budget horaire fixe flexible maison appartement bureau nettoyage plomberie electricite peinture jardin demenagement reparation installation entretien livraison collecte equipement materiel outils communication message details adresse emplacement ville quartier code entree sonnette etage ascenseur parking confirmation rendezvous debut fin matinee apresmidi soiree weekend semaine mois proposition experience competences securite satisfaction merci
`;

export const JOB_EXTRA_WORD_SUGGESTIONS_FRENCH: readonly string[] = Array.from(
  tokenizeGhostWords(RAW_GHOST_WORDS_FRENCH)
);
