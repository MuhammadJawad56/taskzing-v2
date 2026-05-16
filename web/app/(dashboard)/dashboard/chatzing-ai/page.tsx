"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Clock, Info, MapPin, Loader2, X } from "lucide-react";
import { ChatZingRingIcon } from "@/components/chatzing/ChatZingRingIcon";
import { ChatzingActionBar } from "@/components/chatzing/ChatzingActionBar";
import { ChatzingLocationBanner } from "@/components/chatzing/ChatzingLocationBanner";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { useAuth } from "@/lib/api/AuthContext";
import {
  chatzingChat,
  chatzingPreload,
  chatzingTranscribe,
  extractImagesFromChatResponse,
  type ImageAnalysisResult,
} from "@/lib/chatzing/api";
import {
  analyzeImageForChat,
  buildImageChatApiMessages,
  buildImageUserChatContent,
  extractReadImageFromChatResponse,
  formatImageReplyUnavailable,
  formatVisionOnlyAssistantReply,
  isGenericCapabilitiesReply,
  isIrrelevantImageReply,
} from "@/lib/chatzing/imageAnalysis";
import { sanitizeChatzingUserFacingText } from "@/lib/chatzing/sanitizeReply";
import {
  isPosterRequest,
  parsePosterSpec,
  tryGeneratePosterFromMessage,
} from "@/lib/chatzing/posterIntent";
import {
  formatPosterGenerationFailed,
  formatTopicMismatchReply,
  isUnhelpfulChatzingReply,
} from "@/lib/chatzing/replyQuality";
import { prepareImageForChatzing } from "@/lib/chatzing/compressImage";
import {
  buildAgentContextFromSession,
  isLocationAffirmation,
  isLocationDenial,
  suggestsLocationConfirmation,
  requiresLocationBeforeAction,
  type AgentSessionState,
} from "@/lib/chatzing/agentBehavior";
import { buildChatApiMessages } from "@/lib/chatzing/dataset";
import {
  getQuickActionLabel,
  getQuickActionPrompt,
  type ChatzingQuickActionId,
} from "@/lib/chatzing/quickActions";
import type { ChatAttachment, ChatMessage, ChatMessageAction } from "@/lib/chatzing/types";
import { getUserLocation } from "@/lib/map/getPreciseUserLocation";

export default function ChatZingPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const isFr = language === "french";
  const locale = isFr ? "fr" : "en";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [locationBannerDismissed, setLocationBannerDismissed] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "available" | "denied">("idle");
  const [pendingLocalAction, setPendingLocalAction] = useState<{
    apiPrompt: string;
    display: string;
  } | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<ChatAttachment | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pendingImageFileRef = useRef<File | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /** Keep attachment question in sync while user types below the preview. */
  useEffect(() => {
    if (pendingAttachment?.type !== "image") return;
    const q = inputValue.trim();
    setPendingAttachment((prev) =>
      prev?.type === "image" ? { ...prev, question: q } : prev
    );
  }, [inputValue, pendingAttachment?.type]);

  const howItWorksTitle = isFr ? "Comment fonctionne ChatZing" : "How ChatZing works";
  const howItWorksBody = isFr
    ? "Donnez seulement un titre ou une phrase courte — ChatZing rédige la description. Développez votre offre pour obtenir une affiche. La position GPS n'est utilisée qu'après votre confirmation pour les emplois et la demande locale."
    : "Give only a title or short phrase — ChatZing writes the full description. Elaborate on your offer to get a poster image. GPS is only used after you confirm, for local jobs and demand.";
  const howItWorksCta = isFr ? "Compris" : "Got it";

  const welcomeMessage = isFr
    ? "Bonjour! Je suis Chat Zing.\n\n• Titre seul → je rédige la description complète\n• Vous développez votre offre → j'affiche une affiche (generate_poster)\n• Emplois / vitrines / demande locale → après confirmation de votre position\n• Voix et photos supportées\n\nExemple: « Plombier urgence » ou « Je vends des bougies artisanales avec livraison locale »"
    : "Hello! I'm Chat Zing.\n\n• Title only → I draft the full description\n• You elaborate on your offer → I generate a poster image\n• Nearby jobs / showcases / demand → after you confirm location\n• Voice and photos supported\n\nTry: \"Emergency plumber\" or \"I sell handmade candles with local delivery\"";

  const learningNote = isFr
    ? "(Les réponses sont générées par ChatZing à partir de vos données TaskZing et de notre base de connaissances.)"
    : "(Responses are generated by ChatZing using your TaskZing data and our knowledge base.)";

  const fetchPendingLocation = useCallback(async () => {
    setLocationStatus("loading");
    try {
      const point = await getUserLocation({ mode: "fast" });
      setPendingLocation({ lat: point.lat, lng: point.lng });
      setLocationStatus("available");
    } catch {
      setPendingLocation(null);
      setLocationStatus("denied");
    }
  }, []);

  const agentSession = useCallback(
    (): AgentSessionState => ({
      locale,
      locationConfirmed,
      pendingLocation,
    }),
    [locale, locationConfirmed, pendingLocation]
  );

  const confirmLocationShare = useCallback(() => {
    if (!pendingLocation) return;
    setLocationConfirmed(true);
    setLocationBannerDismissed(true);
    setErrorBanner(null);
  }, [pendingLocation]);

  const denyLocationShare = useCallback(() => {
    setLocationBannerDismissed(true);
  }, []);

  useEffect(() => {
    if (!showHowItWorks) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showHowItWorks]);

  useEffect(() => {
    fetchPendingLocation();
    if (user) chatzingPreload();
  }, [fetchPendingLocation, user]);

  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: "welcome-1",
      role: "assistant",
      content: `${learningNote}\n\n${welcomeMessage}`,
      timestamp: new Date(),
    };
    setMessages([welcomeMsg]);
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendToChatZing = async (
    userText: string,
    attachment?: ChatAttachment | null,
    sessionOverride?: Partial<AgentSessionState>,
    options?: {
      userDisplayContent?: string;
      visionAnalysis?: ImageAnalysisResult;
      /** Use vision-only system prompt (no full knowledge base). */
      imageOnlyMode?: boolean;
      userQuestion?: string;
    }
  ) => {
    if (!user) {
      setErrorBanner(isFr ? "Connectez-vous pour utiliser ChatZing." : "Please sign in to use ChatZing.");
      return;
    }

    setErrorBanner(null);

    const session: AgentSessionState = {
      ...agentSession(),
      ...sessionOverride,
    };

    let textToSend = userText.trim();
    if (!sessionOverride && pendingLocation && !session.locationConfirmed) {
      if (isLocationAffirmation(textToSend, locale)) {
        session.locationConfirmed = true;
        setLocationConfirmed(true);
        setLocationBannerDismissed(true);
        textToSend = isFr
          ? "[Localisation confirmée] Oui, utilisez ma position actuelle."
          : "[Location confirmed] Yes, use my current location.";
      } else if (isLocationDenial(textToSend, locale)) {
        setLocationBannerDismissed(true);
        textToSend = isFr
          ? "[Localisation refusée] Non, n'utilisez pas ma position pour l'instant."
          : "[Location declined] No, do not use my location for now.";
      }
    }

    setIsTyping(true);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: options?.userDisplayContent ?? textToSend,
      timestamp: new Date(),
      images:
        attachment?.type === "image" && imagePreview
          ? [imagePreview]
          : undefined,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      if (!options?.imageOnlyMode && isPosterRequest(textToSend)) {
        const poster = await tryGeneratePosterFromMessage(textToSend, locale);
        if (poster) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: sanitizeChatzingUserFacingText(poster.message),
              timestamp: new Date(),
              images: [poster.imageDataUrl],
            },
          ]);
          return;
        }
      }

      const prior = messagesRef.current
        .filter((m) => m.id !== "welcome-1")
        .map((m) => ({ role: m.role, content: m.content }));

      const apiMessages = options?.imageOnlyMode
        ? buildImageChatApiMessages(
            prior,
            textToSend,
            locale,
            options.userQuestion ?? options.userDisplayContent ?? textToSend
          )
        : buildChatApiMessages(prior, textToSend, locale, {
            locationConfirmed: session.locationConfirmed,
            pendingLocation: session.pendingLocation,
          });
      const res = await chatzingChat({
        messages: apiMessages,
        context: buildAgentContextFromSession(session, attachment ?? pendingAttachment),
      });

      let images = extractImagesFromChatResponse(res);
      const actions: ChatMessageAction[] | undefined =
        !session.locationConfirmed &&
        pendingLocation &&
        suggestsLocationConfirmation(res.message)
          ? [
              {
                type: "confirm_location",
                label: isFr ? "Utiliser ma position" : "Use my location",
              },
              {
                type: "deny_location",
                label: isFr ? "Pas maintenant" : "Not now",
              },
            ]
          : undefined;

      let replyText = res.message;
      const badImageReply =
        options?.imageOnlyMode &&
        (isGenericCapabilitiesReply(replyText) || isIrrelevantImageReply(replyText));

      const toolImage = options?.imageOnlyMode
        ? extractReadImageFromChatResponse(res)
        : null;

      if (badImageReply && toolImage) {
        replyText = formatVisionOnlyAssistantReply(
          { ...toolImage, question: options.userQuestion ?? "" },
          locale
        );
      } else if (badImageReply && options?.visionAnalysis) {
        replyText = formatVisionOnlyAssistantReply(options.visionAnalysis, locale);
      } else if (badImageReply) {
        replyText = formatImageReplyUnavailable(
          options.userQuestion ?? options.userDisplayContent ?? "",
          locale
        );
      }

      if (!options?.imageOnlyMode && isUnhelpfulChatzingReply(replyText)) {
        if (isPosterRequest(textToSend)) {
          const poster = await tryGeneratePosterFromMessage(textToSend, locale);
          if (poster) {
            replyText = poster.message;
            images = [poster.imageDataUrl, ...images];
          } else {
            const spec = parsePosterSpec(textToSend, locale);
            replyText = formatPosterGenerationFailed(locale, spec.title);
          }
        } else {
          replyText = formatTopicMismatchReply(textToSend, locale);
        }
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: sanitizeChatzingUserFacingText(replyText),
        timestamp: new Date(),
        images: images.length ? images : undefined,
        actions,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ChatZing unavailable";
      setErrorBanner(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          role: "assistant",
          content: isFr
            ? `Désolé, une erreur s'est produite: ${msg}`
            : `Sorry, something went wrong: ${msg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsTyping(false);
      setPendingAttachment(null);
      setImagePreview(null);
      pendingImageFileRef.current = null;
    }
  };

  useEffect(() => {
    if (!locationConfirmed || !pendingLocalAction) return;
    const action = pendingLocalAction;
    setPendingLocalAction(null);
    void sendToChatZing(action.apiPrompt, null, { locationConfirmed: true, pendingLocation }, {
      userDisplayContent: action.display,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when location is confirmed for a queued local action
  }, [locationConfirmed, pendingLocalAction, pendingLocation]);

  const handleSend = async () => {
    if (isTyping) return;
    if (pendingAttachment?.type === "image") {
      await sendImageMessage();
      return;
    }
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    await sendToChatZing(text, pendingAttachment);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    try {
      const prepared = await prepareImageForChatzing(file);
      pendingImageFileRef.current = prepared.file;
      setImagePreview(prepared.dataUrl);
      const existingQuestion = inputValue.trim();
      setPendingAttachment({
        type: "image",
        data: prepared.dataUrl,
        question: existingQuestion,
      });
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch {
      setErrorBanner(isFr ? "Impossible de lire l'image." : "Could not read the image.");
    }
  };

  const sendImageMessage = async () => {
    if (!pendingAttachment || pendingAttachment.type !== "image" || !imagePreview) {
      return;
    }
    if (!user) {
      setErrorBanner(isFr ? "Connectez-vous pour utiliser ChatZing." : "Please sign in to use ChatZing.");
      return;
    }

    const question =
      inputValue.trim() ||
      pendingAttachment.question ||
      (isFr
        ? "Décris cette image et comment elle peut m'aider sur TaskZing."
        : "Describe this image and how it can help me on TaskZing.");
    setInputValue("");
    setErrorBanner(null);
    setIsTyping(true);

    const userLabel =
      question.trim() ||
      (isFr ? "Photo envoyée — analyse cette image." : "Photo sent — analyze this image.");

    const attachment = { ...pendingAttachment, question };
    const file = pendingImageFileRef.current;

    try {
      const analysis = await analyzeImageForChat({
        file: file ?? null,
        imageBase64: attachment.data,
        question,
        locale,
      });

      const agentText = buildImageUserChatContent(question, locale);

      if (analysis && (analysis.answer.trim() || analysis.caption?.trim())) {
        setMessages((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            role: "user",
            content: userLabel,
            timestamp: new Date(),
            images: imagePreview ? [imagePreview] : undefined,
          },
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: sanitizeChatzingUserFacingText(
              formatVisionOnlyAssistantReply({ ...analysis, question }, locale)
            ),
            timestamp: new Date(),
          },
        ]);
        setIsTyping(false);
        setPendingAttachment(null);
        setImagePreview(null);
        pendingImageFileRef.current = null;
        return;
      }

      // Vision/read_image unavailable — chat with image-only prompt (no full KB)
      await sendToChatZing(agentText, attachment, undefined, {
        userDisplayContent: userLabel,
        imageOnlyMode: true,
        userQuestion: question,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Image send failed";
      setErrorBanner(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `user-img-${Date.now()}`,
          role: "user",
          content: userLabel,
          timestamp: new Date(),
          images: [imagePreview],
        },
        {
          id: `assistant-img-err-${Date.now()}`,
          role: "assistant",
          content: isFr
            ? `Impossible d'envoyer l'image: ${msg}. Réessayez avec une photo plus petite (JPG/PNG).`
            : `Could not send the image: ${msg}. Try again with a smaller JPG/PNG photo.`,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
      setPendingAttachment(null);
      setImagePreview(null);
      pendingImageFileRef.current = null;
    }
  };

  const clearImageAttachment = () => {
    setPendingAttachment(null);
    setImagePreview(null);
    pendingImageFileRef.current = null;
  };

  const handleQuickAction = async (id: ChatzingQuickActionId) => {
    if (!user) {
      setErrorBanner(isFr ? "Connectez-vous pour utiliser ChatZing." : "Please sign in to use ChatZing.");
      return;
    }
    if (id === "image") {
      fileInputRef.current?.click();
      return;
    }
    if (id === "voice") {
      if (isRecording) stopRecording();
      else startRecording();
      return;
    }
    const prompt = getQuickActionPrompt(id, locale);
    if (!prompt) return;

    const displayLabel = getQuickActionLabel(id, locale);

    if (requiresLocationBeforeAction(id) && !locationConfirmed) {
      if (pendingLocation) {
        setPendingLocalAction({ apiPrompt: prompt, display: displayLabel });
        setLocationBannerDismissed(false);
        return;
      }
      setErrorBanner(
        isFr
          ? "Activez la localisation du navigateur pour cette action."
          : "Enable browser location for this action."
      );
      void fetchPendingLocation();
      return;
    }

    await sendToChatZing(prompt, null, undefined, { userDisplayContent: displayLabel });
  };

  const handleMessageAction = async (
    action: ChatMessageAction,
    followUpPrompt?: string | null
  ) => {
    if (action.type === "confirm_location") {
      confirmLocationShare();
      if (followUpPrompt) {
        const display =
          sanitizeChatzingUserFacingText(followUpPrompt) ||
          (isFr ? "Continuer" : "Continue");
        setPendingLocalAction({ apiPrompt: followUpPrompt, display });
      } else {
        await sendToChatZing(
          isFr
            ? "[Localisation confirmée] Utilisez ma position pour continuer."
            : "[Location confirmed] Use my location to continue.",
          null,
          { locationConfirmed: true, pendingLocation }
        );
      }
      return;
    }
    if (action.type === "deny_location") {
      denyLocationShare();
    }
  };

  const startRecording = async () => {
    if (isRecording || isTyping) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 100) return;
        try {
          const { text } = await chatzingTranscribe(blob, locale);
          const spoken = text.trim();
          if (spoken) {
            await sendToChatZing(
              isFr ? `[Message vocal] ${spoken}` : `[Voice message] ${spoken}`,
              null
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Transcription failed";
          setErrorBanner(msg);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      setErrorBanner(
        isFr ? "Microphone non disponible." : "Microphone permission denied or unavailable."
      );
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
    setIsRecording(false);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return isFr ? "À l'instant" : "Just now";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}${isFr ? " h" : " hr"}`;
    return date.toLocaleDateString();
  };

  const locationLabel =
    locationStatus === "loading"
      ? isFr
        ? "Localisation…"
        : "Locating…"
      : locationConfirmed
        ? isFr
          ? "Position partagée"
          : "Location shared"
        : locationStatus === "available"
          ? isFr
            ? "Confirmer position"
            : "Confirm location"
          : isFr
            ? "Sans position"
            : "No location";

  return (
    <div className="flex flex-col h-[calc(100vh-128px)] lg:h-[calc(100vh-64px)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-8 -mb-28 lg:-mb-8 bg-white dark:bg-darkBlue-003">
      {showHowItWorks && (
        <div
          className="fixed inset-0 z-[270] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chatzing-how-it-works-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-darkBlue-003 p-6 shadow-xl border border-gray-100 dark:border-darkBlue-203">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-red-500 dark:bg-darkBlue-203"
                aria-hidden
              >
                <Info className="h-6 w-6 text-white stroke-[2.5]" />
              </div>
              <h2
                id="chatzing-how-it-works-title"
                className="text-lg font-bold text-gray-900 dark:text-white pt-1"
              >
                {howItWorksTitle}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 mb-6">
              {howItWorksBody}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-600 dark:bg-darkBlue-203 dark:hover:bg-darkBlue-343 transition-colors"
              >
                {howItWorksCta}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-darkBlue-003 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-white" />
          </button>
          <div className="flex items-center gap-2">
            <ChatZingRingIcon className="h-10 w-10" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Chat Zing</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (locationConfirmed) void fetchPendingLocation();
            else if (pendingLocation) confirmLocationShare();
            else void fetchPendingLocation();
          }}
          disabled={locationStatus === "loading"}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          title={locationLabel}
        >
          {locationStatus === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MapPin
              className={`h-3.5 w-3.5 ${locationConfirmed ? "text-green-600" : pendingLocation ? "text-amber-500" : "text-gray-400"}`}
            />
          )}
          <span className="hidden sm:inline">{locationLabel}</span>
        </button>
      </div>

      {errorBanner && (
        <div className="mx-4 mt-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {errorBanner}
        </div>
      )}

      {user && !locationBannerDismissed && (
        <ChatzingLocationBanner
          locale={locale}
          status={locationStatus}
          locationConfirmed={locationConfirmed}
          onConfirm={confirmLocationShare}
          onDeny={denyLocationShare}
          onRefresh={fetchPendingLocation}
        />
      )}

      {!authLoading && !user && (
        <div className="mx-4 mt-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {isFr
            ? "Connectez-vous pour envoyer des messages à ChatZing."
            : "Sign in to send messages to ChatZing."}{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => router.push("/login?redirect=/dashboard/chatzing-ai")}
          >
            {isFr ? "Connexion" : "Sign in"}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                <ChatZingRingIcon className="h-10 w-10" />
              </div>
            )}

            <div
              className={`max-w-[75%] sm:max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "assistant"
                  ? "bg-gray-100 text-gray-900 dark:bg-white dark:text-gray-900"
                  : "bg-red-500 text-white"
              }`}
            >
              <p className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>
              {message.images && message.images.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {message.images.map((src, i) => (
                    <img
                      key={`${message.id}-img-${i}`}
                      src={src}
                      alt={isFr ? "Affiche générée" : "Generated poster"}
                      className="rounded-lg max-w-full border border-gray-200"
                    />
                  ))}
                </div>
              )}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.actions.map((action) => (
                    <button
                      key={`${message.id}-${action.type}`}
                      type="button"
                      onClick={() => handleMessageAction(action)}
                      className={
                        action.type === "confirm_location"
                          ? "rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                          : "rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-500"
                      }
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {message.role === "user" && (
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-sm font-semibold">U</span>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-start gap-3 justify-start">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
              <ChatZingRingIcon className="h-10 w-10" />
            </div>
            <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-white">
              <div className="flex gap-1.5">
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-500"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-500"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-gray-500"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        {messages.length > 0 && !isTyping && (
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
            <Clock className="h-3 w-3" />
            <span>{formatTime(messages[messages.length - 1].timestamp)}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-600 dark:bg-darkBlue-003">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImagePick}
        />
        <ChatzingActionBar
          locale={locale}
          disabled={isTyping || !user}
          isRecording={isRecording}
          onAction={handleQuickAction}
          className="mb-3"
        />
        {imagePreview && (
          <div className="mb-3 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-darkBlue-203/30">
            <img
              src={imagePreview}
              alt=""
              className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 dark:text-gray-100 mb-0.5">
                {isFr ? "Photo jointe" : "Photo attached"}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {isFr
                  ? "Écrivez votre question ci-dessous, puis appuyez sur Envoyer (➤)."
                  : "Type your question below, then press Send (➤)."}
              </p>
              {inputValue.trim() ? (
                <p className="mt-2 text-xs text-gray-700 dark:text-gray-200 italic line-clamp-2">
                  « {inputValue.trim()} »
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={clearImageAttachment}
              className="flex-shrink-0 rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-100 dark:border-gray-500 dark:text-gray-300 dark:hover:bg-darkBlue-203"
              aria-label={isFr ? "Retirer la photo" : "Remove photo"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              imagePreview
                ? isFr
                  ? "Votre question sur cette photo…"
                  : "Your question about this photo…"
                : isFr
                  ? "Titre court, offre détaillée, ou question…"
                  : "Short title, detailed offer, or question…"
            }
            className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:!border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-300 dark:bg-white dark:text-gray-900 dark:placeholder:text-gray-500"
            disabled={isTyping || !user}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={
              (!inputValue.trim() && !pendingAttachment) ||
              isTyping ||
              !user
            }
            title={
              imagePreview
                ? isFr
                  ? "Envoyer la photo avec votre question"
                  : "Send photo with your question"
                : undefined
            }
            className="w-12 h-12 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-colors shadow-sm"
            aria-label="Send message"
          >
            <Send className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
