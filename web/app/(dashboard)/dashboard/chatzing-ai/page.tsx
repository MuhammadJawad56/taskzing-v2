"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Clock, Info } from "lucide-react";
import { ChatZingRingIcon } from "@/components/chatzing/ChatZingRingIcon";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { generateResponse, type ChatMessage } from "@/lib/chatzing/knowledgeBase";

export default function ChatZingPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const howItWorksTitle =
    language === "french" ? "Comment fonctionne ChatZing" : "How ChatZing works";
  const howItWorksBody =
    language === "french"
      ? "ChatZing fonctionne sur votre appareil. Vos messages ne sont pas envoyés à un service d'IA tiers. Vos conversations restent privées."
      : "ChatZing runs on your device. Your messages are not sent to any third-party AI service. Your conversations stay private.";
  const howItWorksCta = language === "french" ? "Compris" : "Got it";

  // Welcome message in user's language
  const welcomeMessage = language === "french" 
    ? "Bonjour! Je suis Chat Zing, votre assistant intelligent TaskZing! Je peux vous aider avec TOUT concernant l'application TaskZing:\n\nFonctionnalités de l'application: Emplois, messagerie, profils, paiements\nNavigation: Comment utiliser chaque fonctionnalité\nParamètres: Langue, thèmes, notifications\nDépannage: Résoudre tout problème\nAstuces: Meilleures pratiques et optimisation\n\nDemandez-moi n'importe quoi sur TaskZing - j'ai une vaste base de connaissances et je peux répondre aux questions sur:\n• Comment publier ou trouver des emplois\n• Utiliser la page d'exploration et les filtres\n• Gérer votre profil et vos paramètres\n• Méthodes de paiement et sécurité\n• Paramètres de langue (Anglais/Français)\n• Mode sombre et thèmes\n• Fonctionnalités FAB personnalisées\n• Et bien plus encore!\n\nQue souhaitez-vous savoir?"
    : "Hello! I'm Chat Zing, your intelligent TaskZing assistant! I can help you with EVERYTHING about the TaskZing app:\n\nApp Features: Jobs, messaging, profiles, payments\nNavigation: How to use every feature\nSettings: Language, themes, notifications\nTroubleshooting: Fix any issues\nTips & Tricks: Best practices and optimization\n\nJust ask me anything about TaskZing - I have a huge knowledge base and can answer questions about:\n• How to post or find jobs\n• Using the explore page and filters\n• Managing your profile and settings\n• Payment methods and safety\n• Language settings (English/French)\n• Dark mode and themes\n• Custom FAB features\n• And much more!\n\nWhat would you like to know?";

  const learningNote = language === "french"
    ? "(Note: Cet assistant IA est actuellement en phase d'apprentissage. Les réponses peuvent s'améliorer avec le temps au fur et à mesure que le système continue d'apprendre et de s'adapter.)"
    : "(Note: This AI assistant is currently in its learning phase. Responses may improve over time as the system continues to learn and adapt.)";

  useEffect(() => {
    if (!showHowItWorks) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showHowItWorks]);

  useEffect(() => {
    // Add welcome message on mount
    const welcomeMsg: ChatMessage = {
      id: "welcome-1",
      role: "assistant",
      content: `${learningNote}\n\n${welcomeMessage}`,
      timestamp: new Date(),
    };
    setMessages([welcomeMsg]);
  }, [language]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate typing delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate response in user's language
    const response = generateResponse(userMessage.content, language);
    
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: response,
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages((prev) => [...prev, assistantMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return language === "french" ? "À l'instant" : "Just now";
    if (minutes < 60) return `${minutes} ${language === "french" ? "min" : "min"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${language === "french" ? "h" : "hr"} ago`;
    return date.toLocaleDateString();
  };

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

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-darkBlue-003 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700 dark:text-white" />
          </button>
          <div className="flex items-center gap-2">
            <ChatZingRingIcon className="h-10 w-10" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              Chat Zing
            </h1>
          </div>
        </div>
      </div>

      {/* Messages Container */}
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
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500 dark:bg-gray-500" style={{ animationDelay: "0ms" }}></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500 dark:bg-gray-500" style={{ animationDelay: "150ms" }}></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-500 dark:bg-gray-500" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Timestamp - Show after each message group */}
        {messages.length > 0 && !isTyping && (
          <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-2">
            <Clock className="h-3 w-3" />
            <span>{formatTime(messages[messages.length - 1].timestamp)}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-600 dark:bg-darkBlue-003">
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={language === "french" ? "Demandez n'importe quoi" : "Ask anything"}
            className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:!border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-gray-300 dark:bg-white dark:text-gray-900 dark:placeholder:text-gray-500"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
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
