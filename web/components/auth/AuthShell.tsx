"use client";

import Image from "next/image";
import Link from "next/link";
import type * as React from "react";
import {
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

const FLUTTER_SLIDER_REMOTE: [string, string, string] = [
  "https://images.unsplash.com/photo-1504917595217-d0023cd14c2c?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1621905251918-4844bd277693?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=80",
];

const FLUTTER_SLIDER_LOCAL = [
  "/images/auth/slider1.png",
  "/images/auth/slider2.png",
  "/images/auth/slider3.png",
];

const FLUTTER_RED = "#F21A1A";

export function TaskZingLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex min-w-0 max-w-full shrink-0 items-center justify-start border-0 ${className}`}
      aria-label="TaskZing home"
    >
      <Image
        src="/images/logos/Taskzing-Logo-light-mode_1.png"
        alt="TaskZing"
        width={200}
        height={52}
        className="h-11 w-auto max-w-[min(200px,85%)] object-contain dark:hidden"
        priority
        suppressHydrationWarning
      />
      <Image
        src="/images/logos/Taskzing-Logo-dark-mode_1.png"
        alt="TaskZing"
        width={200}
        height={52}
        className="hidden h-11 w-auto max-w-[min(200px,85%)] object-contain dark:block"
        priority
        suppressHydrationWarning
      />
    </Link>
  );
}

type AuthShellProps = {
  mode: "login" | "signup";
  subtitle?: string;
  children: ReactNode;
};

function useFlutterSlides(): string[] {
  const [slides, setSlides] = useState<string[]>([
    FLUTTER_SLIDER_REMOTE[0],
    FLUTTER_SLIDER_REMOTE[1],
    FLUTTER_SLIDER_REMOTE[2],
  ]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok: string[] = [];
      for (const src of FLUTTER_SLIDER_LOCAL) {
        try {
          const res = await fetch(src, { method: "HEAD" });
          if (res.ok) ok.push(src);
        } catch {
          /* ignore */
        }
      }
      if (!cancelled && ok.length === 3) {
        setSlides(ok);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return slides;
}

function AuthHeroCarousel({
  slides,
  slide,
  setSlide,
  broken,
  setBroken,
  className,
  imageClassName,
  clipDiagonal,
}: {
  slides: string[];
  slide: number;
  setSlide: (i: number) => void;
  broken: Record<string, boolean>;
  setBroken: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  className?: string;
  imageClassName?: string;
  /** Diagonal cut on the right edge of the hero (reference layout). */
  clipDiagonal?: boolean;
}) {
  const active = slides.filter((s) => !broken[s]);
  const safe = active.length ? slide % active.length : 0;

  const inner = (
    <>
      {active.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-500 ease-out ${i === safe ? "z-[1] opacity-100" : "z-0 opacity-0"
            }`}
        >
          <Image
            src={src}
            alt=""
            fill
            className={imageClassName ?? "object-cover object-center dark:brightness-125 dark:contrast-90"}
            sizes="(max-width: 1024px) 100vw, 55vw"
            priority={i === 0}
            onError={() => setBroken((b) => ({ ...b, [src]: true }))}
          />
        </div>
      ))}
    </>
  );

  return (
    <div
      className={`overflow-hidden bg-white dark:bg-darkBlue-013 ${className ?? "relative h-full min-h-[13rem]"}`}
      style={
        clipDiagonal
          ? { clipPath: "polygon(0 0, 100% 0, 80% 100%, 0 100%)" }
          : undefined
      }
    >
      <div className="absolute inset-0">
        {inner}
      </div>
      <div className="pointer-events-auto absolute bottom-5 left-1/2 z-[4] flex -translate-x-1/2 justify-center gap-2 lg:left-[25%]">
        {active.map((_, i) => {
          const on = i === safe;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setSlide(i)}
              className="h-2.5 w-2.5 rounded-full border-0 shadow-sm transition-all"
              style={{
                backgroundColor: on ? FLUTTER_RED : "rgba(255,255,255,0.92)",
                boxShadow: on ? "0 0 0 2px rgba(255,255,255,0.95)" : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Same marketing line as the public landing hero (mobile auth banner, no search). */
const AUTH_MOBILE_HERO_QUOTE =
  '"Task Zing is the easiest way for service professionals to receive, manage, and complete online orders, all from one app."';

function AuthMobileHero({
  slides,
  slide,
  setSlide,
  broken,
  setBroken,
}: {
  slides: string[];
  slide: number;
  setSlide: (i: number) => void;
  broken: Record<string, boolean>;
  setBroken: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const active = slides.filter((s) => !broken[s]);
  const safe = active.length ? slide % active.length : 0;

  return (
    <div
      className="relative -mx-[42px] mb-5 h-[min(34vh,280px)] min-h-[200px] w-[calc(100%+84px)] max-w-none shrink-0 overflow-hidden [clip-path:polygon(0_0,100%_0,100%_88%,50%_100%,0_88%)] lg:hidden"
      role="region"
      aria-label="TaskZing highlights"
    >
      <div className="absolute inset-0">
        {active.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-500 ease-out ${
              i === safe ? "z-[1] opacity-100" : "z-0 opacity-0"
            }`}
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover object-center dark:brightness-125 dark:contrast-90"
              sizes="100vw"
              priority={i === 0}
              onError={() => setBroken((b) => ({ ...b, [src]: true }))}
            />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 z-[2] bg-black/40" aria-hidden />
      <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center px-4 pb-14 pt-4">
        <p className="max-w-md text-center text-sm font-bold leading-snug text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)] sm:text-base">
          {AUTH_MOBILE_HERO_QUOTE}
        </p>
      </div>
      <div className="pointer-events-auto absolute bottom-4 left-1/2 z-[4] flex -translate-x-1/2 justify-center gap-2">
        {active.map((_, i) => {
          const on = i === safe;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setSlide(i)}
              className="h-2.5 w-2.5 rounded-full border-0 shadow-sm transition-all"
              style={{
                backgroundColor: on ? FLUTTER_RED : "rgba(255,255,255,0.92)",
                boxShadow: on ? "0 0 0 2px rgba(255,255,255,0.95)" : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function AuthShell({ mode, subtitle, children }: AuthShellProps) {
  const slides = useFlutterSlides();
  const [slide, setSlide] = useState(0);
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const activeSlides = slides.filter((s) => !broken[s]);

  useEffect(() => {
    setSlide(0);
  }, [activeSlides.join("|")]);

  useEffect(() => {
    if (!activeSlides.length) return;
    const id = window.setInterval(
      () => setSlide((s) => (s + 1) % activeSlides.length),
      5000
    );
    return () => window.clearInterval(id);
  }, [activeSlides.length]);

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-white px-[42px] pb-12 pt-[max(0.25rem,env(safe-area-inset-top))] text-black dark:bg-[#003d62] dark:text-white lg:flex lg:h-[100dvh] lg:max-h-[100dvh] lg:min-h-0 lg:flex-col lg:items-stretch lg:justify-start lg:overflow-hidden lg:bg-gradient-to-br lg:from-[#f6e4ea] lg:from-[8%] lg:via-[#ebe7e8] lg:via-50% lg:to-[#d6d6d6] lg:to-[92%] lg:px-8 lg:py-4 lg:pt-[max(0.75rem,env(safe-area-inset-top))] lg:dark:from-[#0c1a2e] lg:dark:via-[#0f2744] lg:dark:to-[#132c48]">
      {/* Logo at top of viewport — mobile / tablet only (desktop uses panel header below) */}
      <div className="mx-auto mb-2 flex w-full max-w-[474px] shrink-0 justify-start lg:hidden">
        <TaskZingLogo />
      </div>

      {/*
        Single container so {children} mount once:
        - Mobile: compact hero (quote + slides + dots) for login and signup.
        - lg+: split hero + form layout.
      */}
      <div className="mx-auto flex min-h-0 w-full max-w-[474px] flex-col dark:bg-[#003d62] lg:block lg:relative lg:max-h-[calc(100dvh-5.5rem)] lg:min-h-0 lg:max-w-[1040px] lg:flex-1 lg:overflow-hidden lg:rounded-[2.5rem] lg:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.18)] lg:bg-white lg:dark:bg-[#013453]">
        <AuthMobileHero
          slides={slides}
          slide={slide}
          setSlide={setSlide}
          broken={broken}
          setBroken={setBroken}
        />

        {/* Desktop slider: Absolute, fills completely */}
        <div className="hidden lg:block lg:absolute lg:inset-0 lg:z-0 dark:bg-darkBlue-013 bg-white">
          <AuthHeroCarousel
            slides={slides}
            slide={slide}
            setSlide={setSlide}
            broken={broken}
            setBroken={setBroken}
            className="h-full w-full"
            clipDiagonal={false}
          />
        </div>

        {/* Form panel container */}
        <div
          className="relative z-[2] flex min-h-0 w-full min-w-0 flex-col justify-start bg-white pt-2 dark:bg-[#003d62] lg:absolute lg:right-0 lg:top-0 lg:h-full lg:max-h-full lg:w-[50%] lg:justify-start lg:overflow-y-auto lg:overscroll-contain lg:px-10 lg:pl-[12%] lg:py-6 lg:dark:bg-[#013453] lg:[clip-path:polygon(12%_0,100%_0,100%_100%,0_100%)] auth-desktop-scrollbar-none"
          aria-label={mode === "login" ? "Sign in" : "Sign up"}
        >
          <div className="mx-auto flex w-full min-w-0 max-w-[420px] flex-col lg:ml-auto lg:mr-4 lg:max-w-[380px]">
            <div className="mb-5 hidden flex-col lg:flex">
              <div className="flex justify-center">
                <div className="lg:-translate-x-[20%]">
                  <TaskZingLogo />
                </div>
              </div>
              <h1 className="mt-4 text-center text-[40px] font-semibold leading-tight text-[#F21A1A]">
                Welcome
              </h1>
            </div>

            {subtitle ? (
              <p className="mx-auto mt-0 max-w-sm text-center text-sm leading-snug text-black dark:text-white sm:text-base lg:mt-2 lg:text-center">
                {subtitle}
              </p>
            ) : null}

            <div className="mt-6 min-w-0 sm:mt-8 lg:mt-5">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthPillInput(
  props: InputHTMLAttributes<HTMLInputElement> & { wrapperClassName?: string }
) {
  const { wrapperClassName, className, ...rest } = props;
  return (
    <div className={wrapperClassName}>
      <input
        {...rest}
        className={`w-full min-w-0 rounded-2xl border-0 bg-[#e8ecef] px-5 py-3.5 text-[15px] text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F21A1A]/25 dark:bg-[#1a3550] dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-[#F21A1A]/35 lg:rounded-full lg:bg-[#E8E8E8] ${className ?? ""}`}
      />
    </div>
  );
}

export function AuthPasswordPill({
  value,
  onChange,
  placeholder,
  autoComplete,
  show,
  onToggleShow,
  name,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
  show: boolean;
  onToggleShow: () => void;
  name?: string;
}) {
  return (
    <div className="relative min-w-0">
      <input
        name={name}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full min-w-0 rounded-2xl border-0 bg-[#e8ecef] px-5 py-3.5 pr-12 text-[15px] text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#F21A1A]/25 dark:bg-[#1a3550] dark:text-white dark:placeholder:text-gray-400 dark:focus:ring-[#F21A1A]/35 lg:rounded-full lg:bg-[#E8E8E8]"
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
            />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>
    </div>
  );
}

export function GoogleIconFlutter({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/auth/google-mark.svg"
      alt=""
      className={className ?? "h-7 w-7 shrink-0"}
    />
  );
}

export function GoogleIcon({ className }: { className?: string }) {
  return <GoogleIconFlutter className={className} />;
}

export function AppleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={`${className} shrink-0 text-gray-900 dark:text-gray-900`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export function AuthSocialButton({
  onClick,
  disabled,
  loading,
  icon,
  label,
}: {
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  loading?: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex h-12 w-full min-w-0 items-center justify-center gap-3 rounded-2xl border border-gray-200/90 bg-[#E8E8E8] px-4 text-[15px] font-medium text-black shadow-sm transition-colors hover:bg-[#dedede] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/70 dark:bg-white dark:text-black dark:hover:bg-[#f3f4f6] lg:h-[55px] lg:rounded-full lg:border-gray-200/80 lg:bg-[#E8E8E8] lg:px-5 lg:shadow-md lg:hover:bg-[#dedede] lg:dark:border-white/70 lg:dark:bg-white lg:dark:hover:bg-[#f3f4f6]"
    >
      {loading ? (
        <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-gray-400 border-t-[#F21A1A]" />
      ) : (
        icon
      )}
      <span className="text-center font-medium leading-snug">{label}</span>
    </button>
  );
}

export function AuthPrimaryButton({
  children,
  type = "submit",
  disabled,
  loading,
}: {
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className="flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-[#F21A1A] text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#d91515] disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg lg:rounded-full"
    >
      {loading ? (
        <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : null}
      {children}
    </button>
  );
}
