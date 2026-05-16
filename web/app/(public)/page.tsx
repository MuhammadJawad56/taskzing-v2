"use client";

import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Share2,
  MapPin,
  Mail,
  Star,
  QrCode,
  Facebook,
  Instagram,
  MessageCircle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getOpenJobs } from "@/lib/api/jobs";
import { useAuth } from "@/lib/api/AuthContext";
import type { Task } from "@/lib/types/task";
import { ExploreJobCard } from "@/components/task/ExploreJobCard";
import { JobProposalApplyModal } from "@/components/task/JobProposalApplyModal";
import { GuestAuthPromptModal } from "@/components/auth/GuestAuthPromptModal";

const TOP_CATEGORIES = [
  "Construction & Repair",
  "Home Improvement",
  "Lifestyle",
  "Professional",
  "Property Maintenance",
  "Specialty",
] as const;

const SITE_URL = "https://taskzing.com";

const heroQuote =
  '"Task Zing is the easiest way for service professionals to receive, manage, and complete online orders, all from one app."';
const HERO_SLIDES = [
  "/images/Vector 7.svg",
  "https://picsum.photos/seed/628/1600/900",
  "https://picsum.photos/seed/684/1600/900",
] as const;

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const gateGuests = !authLoading && !user;
  const [searchQuery, setSearchQuery] = useState("");
  const [nearestJobs, setNearestJobs] = useState<Task[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<"failed" | null>(null);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [selectedJobForProposal, setSelectedJobForProposal] = useState<Task | null>(null);
  const [showGuestAuthModal, setShowGuestAuthModal] = useState(false);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const open = await getOpenJobs();
        if (!cancelled) {
          setNearestJobs(open.slice(0, 6));
          setJobsError(null);
        }
      } catch {
        if (!cancelled) {
          setNearestJobs([]);
          setJobsError("failed");
        }
      } finally {
        if (!cancelled) setJobsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4800);

    return () => window.clearInterval(timer);
  }, []);

  const onSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchQuery.trim();
      if (q) {
        router.push(`/categories?q=${encodeURIComponent(q)}`);
      } else {
        router.push("/categories");
      }
    },
    [router, searchQuery]
  );

  const onNearMeClick = useCallback(() => {
    router.push("/login");
  }, [router]);

  const openProposalModal = (job: Task) => {
    setSelectedJobForProposal(job);
    setIsProposalModalOpen(true);
  };

  const closeProposalModal = () => {
    setIsProposalModalOpen(false);
    setSelectedJobForProposal(null);
  };

  const handleShare = async () => {
    const payload = {
      title: "TaskZing",
      text: "Learn more about TaskZing",
      url: SITE_URL,
    };
    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else {
        await navigator.clipboard.writeText(SITE_URL);
      }
    } catch {
      /* user cancelled or clipboard denied */
    }
  };

  return (
    <div className="bg-white text-gray-900 dark:bg-darkBlue-013 dark:text-gray-100">
      <GuestAuthPromptModal
        isOpen={showGuestAuthModal}
        onClose={() => setShowGuestAuthModal(false)}
        loginRedirectPath="/"
      />
      <JobProposalApplyModal
        job={selectedJobForProposal}
        open={isProposalModalOpen}
        onClose={closeProposalModal}
        loginRedirectPath="/explore"
      />
      {/* Top category pills */}
      <section className="border-b border-gray-100 bg-[#E8EAF6] dark:border-gray-600/35 dark:bg-darkBlue-013">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin [scrollbar-width:thin]">
            {TOP_CATEGORIES.map((label) => (
              <Link
                key={label}
                href="/categories"
                className="flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium text-[#203B7E] dark:text-blue-100 bg-white/80 dark:bg-darkBlue-013/80 hover:bg-white dark:hover:bg-darkBlue-013 transition-colors shadow-sm"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Split hero + overlapping search (search pill: md+ only — cleaner on small phones) */}
      <section className="relative">
        <div className="relative min-h-[320px] md:min-h-[500px]">
          <div className="absolute inset-0 overflow-hidden [clip-path:polygon(0_0,100%_0,100%_86%,50%_100%,0_86%)]">
            {HERO_SLIDES.map((src, index) => (
              <img
                key={src}
                src={src}
                alt="TaskZing landing visual"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                  index === heroSlideIndex ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
            <div className="absolute inset-0 bg-black/35 dark:bg-darkBlue-013/50" aria-hidden />
          </div>
          <div className="absolute inset-0 z-[1] flex items-center justify-center px-4 pb-10 pointer-events-none md:pb-0">
            <p className="max-w-4xl text-center text-lg sm:text-xl md:text-4xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] leading-tight">
              {heroQuote}
            </p>
          </div>
          <div className="absolute left-1/2 top-[68%] z-[2] hidden w-full max-w-3xl -translate-x-1/2 px-4 sm:px-6 md:block">
            <form
              onSubmit={onSearchSubmit}
              className="mx-auto flex items-center gap-2 rounded-full border border-gray-200 bg-white py-2 pl-2 pr-2 shadow-lg dark:border-gray-600 dark:bg-darkBlue-003"
            >
              <button
                type="button"
                onClick={onNearMeClick}
                className="flex-shrink-0 rounded-full bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
              >
                Near me
              </button>
              <Search className="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for services"
                className="min-w-0 flex-1 bg-transparent text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white dark:placeholder:text-gray-500"
                aria-label="Search for services"
              />
            </form>
          </div>

          <div className="absolute bottom-12 left-1/2 z-[2] flex -translate-x-1/2 items-center gap-2">
            {HERO_SLIDES.map((_, index) => {
              const active = index === heroSlideIndex;
              return (
                <button
                  key={`hero-dot-${index}`}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => setHeroSlideIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    active ? "w-4 bg-primary-500" : "w-2 bg-white/75"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Nearest jobs — above value prop */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Nearest Jobs</h2>
          <Link
            href="/explore"
            className="text-primary-500 font-medium underline underline-offset-4 hover:text-primary-600"
          >
            See more
          </Link>
        </div>
        {jobsLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : jobsError === "failed" ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10 text-sm">
            Could not load jobs. Please try again later or open{" "}
            <Link href="/explore" className="text-primary-500 underline">
              Explore
            </Link>
            .
          </p>
        ) : nearestJobs.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10">
            No open jobs right now. Check back soon or{" "}
            <Link href="/explore" className="text-primary-500 font-medium underline">
              explore all listings
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {nearestJobs.map((task) => (
              <ExploreJobCard
                key={task.jobId}
                job={task}
                hideLikeBadge
                onApply={(job) => {
                  if (gateGuests) {
                    setShowGuestAuthModal(true);
                    return;
                  }
                  openProposalModal(job);
                }}
                onCardNavigate={gateGuests ? () => setShowGuestAuthModal(true) : undefined}
                onSave={gateGuests ? () => setShowGuestAuthModal(true) : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <hr className="border-gray-200 dark:border-gray-600/40" />

      {/* How our service works */}
      <section className="bg-gray-50 py-16 md:py-20 dark:bg-darkBlue-013">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#003366] dark:text-blue-200 mb-4">
            How our service works
          </h2>
          <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-600 dark:text-gray-400 md:mb-14 md:text-lg">
            TaskZing connects people who need work done with skilled providers, all in one simple app.
            Post tasks, get hired, complete jobs, and get paid fast, easy, and reliable.
          </p>
          <div className="mx-auto grid max-w-5xl grid-cols-3 gap-2 sm:gap-4 md:gap-8">
            {[
              {
                image: "/images/landingpage/browse.svg",
                title: "Browse",
                sub: "Find the service you need",
              },
              {
                image: "/images/landingpage/book.svg",
                title: "Book",
                sub: "Schedule a time",
              },
              {
                image: "/images/landingpage/getitdone.svg",
                title: "Get it done",
                sub: "Rest while we handle it",
              },
            ].map(({ image, title, sub }) => (
              <div key={title} className="flex min-w-0 flex-col items-center">
                <div
                  className="mb-2 flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#003366]/30 p-1.5 dark:border-transparent sm:mb-3 sm:h-28 sm:w-28 sm:p-2 md:mb-5 md:h-44 md:w-44 md:p-3"
                  aria-hidden
                >
                  <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-[#003D62] sm:h-[5.25rem] sm:w-[5.25rem] md:h-32 md:w-32">
                    <img
                      src={image}
                      alt=""
                      className="h-[3.2rem] w-[3.2rem] object-contain sm:h-[3.8rem] sm:w-[3.8rem] md:h-[5.25rem] md:w-[5.25rem]"
                    />
                  </div>
                </div>
                <h3 className="mb-0.5 text-center text-xs font-bold leading-tight text-[#003366] dark:text-blue-200 sm:text-sm md:mb-2 md:text-xl">
                  {title}
                </h3>
                <p className="text-center text-[10px] leading-snug text-gray-500 dark:text-gray-400 sm:text-xs md:text-sm">
                  {sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value prop + circular image */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <h2 className="text-center text-3xl md:text-4xl lg:text-5xl font-semibold text-[#003366] dark:text-blue-200 leading-tight mb-6">
              Get Tasks done. Find Work.
              <br />
              All in one App
            </h2>
            <p className="text-base md:text-lg text-gray-800 dark:text-gray-300 leading-relaxed mb-8">
              TaskZing is your all-in-one platform to get things done or earn by doing them. Whether you
              need help at home or want to offer your skills, TaskZing connects people with purpose. Hire
              trusted professionals or become one, simple, secure, and convenient.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/signup?role=client"
                className="inline-flex items-center justify-center rounded-xl bg-primary-500 px-8 py-3.5 text-base font-semibold text-white hover:bg-primary-600 transition-colors shadow-sm"
              >
                Become a Client
              </Link>
              <Link
                href="/become-provider"
                className="inline-flex items-center justify-center rounded-xl border-2 border-primary-500 bg-white px-8 py-3.5 text-base font-semibold text-primary-500 transition-colors hover:bg-red-50 dark:bg-transparent dark:hover:bg-darkBlue-203"
              >
                Become a Provider
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="relative h-56 w-56 sm:h-64 sm:w-64 md:h-80 md:w-80 rounded-full overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80"
                alt="Team collaboration"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 256px, 320px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">
        <div className="mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            What Our Users Say
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Real reviews from real users</p>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 md:gap-8">
          {[
            {
              name: "Sarah Johnson",
              role: "Client - Business Owner",
              location: "Toronto, ON",
              rating: 5,
              text: "TaskZing made it so easy to post my web development job. I received quality proposals quickly, and the secure payment system gave me peace of mind.",
            },
            {
              name: "Michael Chen",
              role: "Provider - Plumber",
              location: "Vancouver, BC",
              rating: 5,
              text: "As a service provider, TaskZing has transformed my business. Location-based job discovery helps me find clients in my area.",
            },
            {
              name: "Emily Rodriguez",
              role: "Client - Homeowner",
              location: "Montreal, QC",
              rating: 5,
              text: "I needed help with home repairs and found multiple qualified professionals. The real-time messaging made coordination easy.",
            },
          ].map((item, i) => (
            <article
              key={i}
              className="flex min-w-0 flex-col rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-600/40 dark:bg-darkBlue-003 sm:rounded-2xl sm:p-4 md:p-6"
            >
              <div className="mb-1.5 flex flex-nowrap gap-px sm:mb-3 sm:gap-0.5 md:mb-4">
                {Array.from({ length: item.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-2.5 w-2.5 fill-amber-400 text-amber-400 sm:h-3.5 sm:w-3.5 md:h-5 md:w-5"
                  />
                ))}
              </div>
              <p className="mb-2 line-clamp-5 flex-grow text-[10px] leading-snug text-gray-800 dark:text-gray-200 sm:mb-4 sm:text-xs sm:line-clamp-6 md:mb-6 md:text-base md:leading-normal md:line-clamp-none">
                &ldquo;{item.text}&rdquo;
              </p>
              <div className="mt-auto border-t border-gray-100 pt-1.5 dark:border-gray-600/40 sm:pt-3 md:pt-4">
                <p className="truncate text-[10px] font-semibold text-gray-900 dark:text-white sm:text-xs md:text-base">
                  {item.name}
                </p>
                <p className="line-clamp-2 text-[9px] text-gray-500 sm:text-[10px] md:text-sm">{item.role}</p>
                <p className="mt-0.5 truncate text-[8px] text-gray-400 sm:text-xs">{item.location}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* QR + marketing footer */}
      <section className="border-t border-gray-200 bg-gray-100 py-16 dark:border-gray-600/40 dark:bg-darkBlue-013">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Scan to Learn More About TaskZing
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto text-sm md:text-base">
              Get instant access to app information, features, and download links
            </p>
          </div>

          <div className="relative max-w-md mx-auto mb-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-600/40 dark:bg-darkBlue-003">
              <button
                type="button"
                onClick={handleShare}
                className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-md"
                aria-label="Share"
              >
                <Share2 className="h-5 w-5" />
              </button>
              <div className="flex justify-center pt-2">
                <div className="bg-white p-2 rounded-lg inline-block">
                  <QRCodeSVG value={SITE_URL} size={200} level="M" includeMargin={false} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-primary-500">
                <QrCode className="h-5 w-5" />
                <span className="font-semibold text-gray-900 dark:text-white">TaskZing Info</span>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-16">
            Scan with any QR code scanner app
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto pt-4">
            <div>
              <p className="text-2xl font-bold mb-1">
                <span className="text-primary-500">Task</span>
                <span className="text-[#003366] dark:text-white">Zing</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Download the app by clicking the link below:
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href="https://play.google.com/store/apps/details?id=com.zingte.taskzing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-fit max-w-full rounded-md transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-darkBlue-013"
                >
                  <Image
                    src="/images/store-badges/google-play.png"
                    alt="Get it on Google Play"
                    width={1020}
                    height={303}
                    quality={100}
                    sizes="(max-width: 640px) 90vw, 320px"
                    className="h-14 w-auto max-w-[min(100%,320px)] object-contain object-left sm:h-16 dark:hidden"
                    priority={false}
                  />
                  <Image
                    src="/images/store-badges/google-play-dark.png"
                    alt="Get it on Google Play"
                    width={1020}
                    height={303}
                    quality={100}
                    sizes="(max-width: 640px) 90vw, 320px"
                    className="hidden h-14 w-auto max-w-[min(100%,320px)] object-contain object-left sm:h-16 dark:block"
                    priority={false}
                  />
                </a>
                <a
                  href="https://apps.apple.com/us/app/taskzing/id6757539344"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-fit max-w-full rounded-md transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-darkBlue-013"
                >
                  <Image
                    src="/images/store-badges/app-store.png"
                    alt="Download on the App Store"
                    width={931}
                    height={277}
                    quality={100}
                    sizes="(max-width: 640px) 90vw, 320px"
                    className="h-14 w-auto max-w-[min(100%,320px)] object-contain object-left sm:h-16 dark:hidden"
                    priority={false}
                  />
                  <Image
                    src="/images/store-badges/app-store-dark.png"
                    alt="Download on the App Store"
                    width={931}
                    height={277}
                    quality={100}
                    sizes="(max-width: 640px) 90vw, 320px"
                    className="hidden h-14 w-auto max-w-[min(100%,320px)] object-contain object-left sm:h-16 dark:block"
                    priority={false}
                  />
                </a>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Contact Us</h3>
              <a
                href="mailto:customercare@taskzing.com"
                className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary-500 mb-3"
              >
                <Mail className="h-5 w-5 flex-shrink-0 text-primary-500" />
                customercare@taskzing.com
              </a>
              <p className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <MapPin className="h-5 w-5 flex-shrink-0 text-primary-500 mt-0.5" />
                99 Cedarline Boulevard, Toronto, Ontario M0X 1A0 Canada
              </p>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Social Medias</h3>
              <div className="flex gap-3 mb-8">
                {(
                  [
                    {
                      label: "Facebook",
                      href: "https://www.facebook.com/profile.php?id=61584677643126",
                      Icon: Facebook,
                    },
                    {
                      label: "Instagram",
                      href: "https://www.instagram.com/taskzing.official?igsh=MXQ4cjBpMmZzOGU0aA==",
                      Icon: Instagram,
                    },
                    {
                      label: "WhatsApp",
                      href: "https://wa.me/16472948542",
                      Icon: MessageCircle,
                    },
                  ] as const
                ).map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 w-11 items-center justify-center rounded-full border-0 bg-gray-200 text-gray-700 transition-colors hover:bg-primary-500 hover:text-white dark:bg-darkBlue-203 dark:text-white"
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-600/40 dark:bg-darkBlue-003">
                  <QRCodeSVG value={SITE_URL} size={56} level="L" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">Scan QR</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">for more information</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-gray-400 mt-14">
            © {new Date().getFullYear()} TaskZing. All rights reserved.
          </p>
        </div>
      </section>
    </div>
  );
}
