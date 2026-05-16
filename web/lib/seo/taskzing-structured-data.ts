/** JSON-LD emitted in root layout for brand + site discovery (supplements metadata). */

const SITE = "https://taskzing.com";

/** Exact Organization markup requested for SERP / brand clarity. */
export const taskzingOrganizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TaskZing",
  url: SITE,
} as const;

/** WebSite + publisher link to the same organization (common pattern with the block above). */
export const taskzingWebsiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "TaskZing",
  url: SITE,
  publisher: {
    "@type": "Organization",
    name: "TaskZing",
    url: SITE,
  },
} as const;
