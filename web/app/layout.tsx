import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { AuthProvider } from "@/lib/api/AuthContext";
import { DraftSavedSnackbar } from "@/components/ui/DraftSavedSnackbar";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";
import { TASKZING_CANADIAN_SEO_KEYWORDS } from "@/lib/seo/taskzing-canadian-keywords";
import { taskzingOrganizationJsonLd, taskzingWebsiteJsonLd } from "@/lib/seo/taskzing-structured-data";

const siteUrl = new URL("https://taskzing.com");

/** Runtime Google Fonts (avoids `next/font` build-time downloads that fail on Vercel). */
const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@400;600&display=swap";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "TaskZing",
  title: {
    default: "TaskZing Canada — Hire Local Pros for Tasks & Home Services",
    template: "%s | TaskZing",
  },
  description:
    "TaskZing is Canada’s trusted marketplace to book skilled TaskZing professionals for home services, errands, gigs, and local tasks from coast to coast. Hire on TaskZing in Toronto, Vancouver, Montreal, Calgary, Ottawa, and cities nationwide.",
  keywords: TASKZING_CANADIAN_SEO_KEYWORDS,
  authors: [{ name: "TaskZing", url: "https://taskzing.com" }],
  creator: "TaskZing",
  publisher: "TaskZing",
  openGraph: {
    type: "website",
    locale: "en_CA",
    alternateLocale: ["fr_CA", "en_US"],
    url: siteUrl,
    siteName: "TaskZing",
    title: "TaskZing Canada — Hire Local Pros for Tasks & Home Services",
    description:
      "Book TaskZing pros for cleaning, handyman, moving, tutoring, and more across Canada. TaskZing connects Canadians with vetted local talent.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TaskZing Canada — Hire Local Pros for Tasks & Home Services",
    description:
      "TaskZing helps Canadians hire trusted local professionals for tasks and home services nationwide.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-CA" className="overflow-x-hidden" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={GOOGLE_FONTS_HREF} rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col overflow-x-hidden bg-[var(--app-bg)] text-[var(--app-text)]">
        <Script
          id="taskzing-organization-ld-json"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(taskzingOrganizationJsonLd),
          }}
        />
        <Script
          id="taskzing-website-ld-json"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(taskzingWebsiteJsonLd),
          }}
        />
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var pref = localStorage.getItem('theme') || 'system';
                  if (pref !== 'light' && pref !== 'dark' && pref !== 'system') pref = 'system';
                  var resolved = pref === 'system'
                    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : pref;
                  document.documentElement.dataset.theme = resolved;
                  if (resolved === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <ThemeProvider>
          <LanguageProvider>
          <AuthProvider>
            <Header />
            <main className="min-h-0 flex-1">{children}</main>
            <DraftSavedSnackbar />
          </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}





