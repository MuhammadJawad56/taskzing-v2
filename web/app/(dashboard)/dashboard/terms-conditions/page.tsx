"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Briefcase, ShoppingCart, Plus, Settings, Scale, Image as ImageIcon, X } from "lucide-react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/lib/contexts/LanguageContext";

export default function TermsConditionsPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Handle escape key and body overflow
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (openModal) {
      document.body.style.overflow = "hidden";
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setOpenModal(null);
        }
      };
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.body.style.overflow = "unset";
        document.removeEventListener("keydown", handleEscape);
      };
    } else {
      document.body.style.overflow = "unset";
    }
  }, [openModal]);

  const categories = [
    {
      id: "general",
      title: language === "french" ? "Conditions générales" : "General Terms",
      icon: <FileText className="h-6 w-6" />,
      bgColor: "bg-blue-100",
      iconBg: "bg-blue-500",
    },
    {
      id: "provider",
      title: language === "french" ? "Conditions des prestataires" : "Provider Terms",
      icon: <Briefcase className="h-6 w-6" />,
      bgColor: "bg-green-100",
      iconBg: "bg-green-500",
    },
    {
      id: "user",
      title: language === "french" ? "Conditions des utilisateurs" : "User Terms",
      icon: <ShoppingCart className="h-6 w-6" />,
      bgColor: "bg-orange-100",
      iconBg: "bg-orange-500",
    },
    {
      id: "post-job",
      title: language === "french" ? "Conditions de publication d'emploi" : "Post Job Terms",
      icon: <Plus className="h-6 w-6" />,
      bgColor: "bg-purple-100",
      iconBg: "bg-purple-500",
    },
    {
      id: "showcase",
      title: language === "french" ? "Conditions de vitrine" : "Showcase Work Terms",
      icon: <ImageIcon className="h-6 w-6" />,
      bgColor: "bg-teal-100",
      iconBg: "bg-teal-500",
    },
    {
      id: "settings",
      title: language === "french" ? "Conditions des paramètres" : "Settings Terms",
      icon: <Settings className="h-6 w-6" />,
      bgColor: "bg-blue-100",
      iconBg: "bg-blue-500",
    },
    {
      id: "legal",
      title: language === "french" ? "Clauses légales" : "Legal Clauses",
      icon: <Scale className="h-6 w-6" />,
      bgColor: "bg-red-100",
      iconBg: "bg-red-500",
    },
  ];

  const getTermsContent = (categoryId: string) => {
    const isFrench = language === "french";
    
    switch (categoryId) {
      case "general":
        return {
          title: isFrench ? "Conditions générales" : "General Terms & Conditions",
          content: isFrench ? (
            <>
              <div className="mb-6 rounded-2xl border border-[#D94856]/35 bg-[#C43D4C] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">i</div>
                  <div>
                    <p className="mb-1 font-semibold text-white">Avis important</p>
                    <p className="text-sm text-white">Ces termes et conditions sont régis par les lois canadiennes et américaines et sont conformes aux règlements provinciaux, étatiques et fédéraux applicables dans les deux pays. En utilisant TaskZing, vous acceptez d'être lié par ces termes.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Acceptation des termes</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    En vous inscrivant sur TaskZing, vous acceptez de respecter et d'être légalement lié par ces Conditions de service, notre Politique de confidentialité et toute autre règle ou politique applicable. Ces termes constituent un accord juridiquement contraignant entre vous et TaskZing Inc., une société canadienne opérant en conformité avec les lois et règlements canadiens et américains.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Admissibilité</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Vous devez avoir au moins 18 ans pour utiliser TaskZing (ou l'âge de la majorité dans votre juridiction). En vous inscrivant, vous confirmez que toutes les informations fournies sont exactes et complètes. Vous devez être légalement capable de conclure des contrats contraignants en vertu des lois canadiennes et américaines applicables. Les utilisateurs doivent être résidents du Canada ou des États-Unis pour utiliser nos services.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Sécurité du compte</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Vous êtes responsable de maintenir la confidentialité des identifiants de votre compte et êtes entièrement responsable de toutes les activités qui se produisent sous votre compte. Vous devez immédiatement notifier TaskZing de toute utilisation non autorisée de votre compte.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Conformité aux lois</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Tous les utilisateurs acceptent de se conformer aux lois locales, provinciales/étatiques et fédérales applicables au Canada et aux États-Unis. Cela comprend, sans s'y limiter, les lois sur l'emploi, les obligations fiscales, les exigences de licence d'entreprise, les lois sur la protection des consommateurs, les lois sur la confidentialité (PIPEDA au Canada, CCPA/lois sur la confidentialité des États aux États-Unis), les lois anti-discrimination et les règlements sur la sécurité au travail. Les utilisateurs sont responsables de comprendre et de se conformer à toutes les lois applicables dans leur juridiction.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Conduite interdite</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Vous ne devez pas utiliser de fausses identités ou des informations trompeuses, transmettre des virus ou du code malveillant, tenter d'obtenir un accès non autorisé à la plateforme, abuser ou harceler d'autres utilisateurs, ou violer toute loi ou règlement applicable.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 rounded-2xl border border-[#D94856]/35 bg-[#C43D4C] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">i</div>
                  <div>
                    <p className="mb-1 font-semibold text-white">Important Notice</p>
                    <p className="text-sm text-white">These terms and conditions are governed by Canadian and United States laws and comply with applicable provincial, state, and federal regulations in both countries. By using TaskZing, you agree to be bound by these terms.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Acceptance of Terms</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    By signing up on TaskZing, you agree to comply with and be legally bound by these Terms of Service, our Privacy Policy, and any other applicable rules or policies. These terms constitute a legally binding agreement between you and TaskZing Inc., a Canadian corporation operating in compliance with both Canadian and United States laws and regulations.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Eligibility</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    You must be at least 18 years old to use TaskZing (or the age of majority in your jurisdiction). By signing up, you confirm that all the information provided is accurate and complete. You must be legally capable of entering into binding contracts under applicable Canadian and U.S. laws. Users must be residents of Canada or the United States to use our services.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Account Security</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    You are responsible for maintaining the confidentiality of your account credentials and are fully responsible for all activities that occur under your account. You must immediately notify TaskZing of any unauthorized use of your account.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Compliance with Laws</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    All users agree to comply with applicable local, provincial/state, and federal laws in Canada and the United States. This includes but is not limited to employment laws, tax obligations, business licensing requirements, consumer protection laws, privacy laws (PIPEDA in Canada, CCPA/state privacy laws in the U.S.), anti-discrimination laws, and workplace safety regulations. Users are responsible for understanding and complying with all applicable laws in their jurisdiction.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Prohibited Conduct</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    You must not use false identities or misleading information, transmit viruses or malicious code, attempt to gain unauthorized access to the platform, abuse or harass other users, or violate any applicable laws or regulations.
                  </p>
                </div>
              </div>
            </>
          ),
        };
        
      case "provider":
        return {
          title: isFrench ? "Conditions des prestataires" : "Provider Terms & Conditions",
          content: isFrench ? (
            <>
              <div className="mb-6 rounded-2xl border border-[#D94856]/35 bg-[#C43D4C] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">i</div>
                  <div>
                    <p className="mb-1 font-semibold text-white">Avis important</p>
                    <p className="text-sm text-white">Ces termes et conditions sont régis par les lois canadiennes et américaines et sont conformes aux règlements provinciaux, étatiques et fédéraux applicables dans les deux pays. En utilisant TaskZing, vous acceptez d'être lié par ces termes.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Exigence d'abonnement</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les prestataires doivent maintenir un abonnement payant actif pour accéder aux fonctionnalités principales de la plateforme, y compris la liste des services, la messagerie client et la visibilité du profil. Les frais d'abonnement ne sont pas remboursables sauf si requis par les lois canadiennes sur la protection des consommateurs.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Liste de services précise</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les prestataires doivent décrire leurs services de manière véridique et précise, y compris les prix, les qualifications, la disponibilité et toute licence ou assurance pertinente (le cas échéant). La fausse déclaration peut entraîner une suspension immédiate du compte.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Conduite professionnelle</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les prestataires doivent maintenir le professionnalisme et traiter les utilisateurs avec respect. Un comportement offensant, non professionnel ou dangereux peut entraîner une suspension de compte. Les prestataires doivent se conformer à toutes les normes professionnelles et codes de conduite applicables.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Assurance et responsabilité</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les prestataires sont uniquement responsables de détenir l'assurance et les licences appropriées pour les services qu'ils offrent. TaskZing n'est pas responsable de toute blessure, dommage ou perte résultant des services fournis. Les prestataires doivent maintenir une assurance responsabilité adéquate telle que requise par la loi canadienne.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Paiements et frais</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les prestataires acceptent les taux de commission de la plateforme (le cas échéant) et comprennent que tous les paiements sont traités par des méthodes autorisées. Toutes les transactions sont soumises aux lois fiscales canadiennes applicables et aux exigences de TPS/TVH.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">6. Annulations de service</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les prestataires doivent donner un préavis d'au moins 24 heures pour les annulations. Les absences répétées ou les annulations de dernière minute peuvent entraîner des pénalités ou une désactivation. Les annulations d'urgence doivent être communiquées immédiatement.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">7. Propriété du contenu</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les prestataires conservent la propriété de leur contenu mais accordent à TaskZing une licence pour l'afficher, le distribuer et le promouvoir sur la plateforme. Cette licence est non exclusive et révocable lors de la résiliation du compte.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 rounded-2xl border border-[#D94856]/35 bg-[#C43D4C] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">i</div>
                  <div>
                    <p className="mb-1 font-semibold text-white">Important Notice</p>
                    <p className="text-sm text-white">These terms and conditions are governed by Canadian and United States laws and comply with applicable provincial, state, and federal regulations in both countries. By using TaskZing, you agree to be bound by these terms.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Subscription Requirement</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Providers must maintain an active paid subscription to access core platform features, including listing services, client messaging, and profile visibility. Subscription fees are non-refundable except as required by Canadian consumer protection laws.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Accurate Service Listing</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Providers must describe their services truthfully and accurately, including pricing, qualifications, availability, and any relevant licenses or insurance (if applicable). Misrepresentation may result in immediate account suspension.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Professional Conduct</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Providers must maintain professionalism and treat users respectfully. Offensive, unprofessional, or unsafe behavior may result in account suspension. Providers must comply with all applicable professional standards and codes of conduct.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Insurance & Liability</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Providers are solely responsible for holding appropriate insurance and licenses for the services they offer. TaskZing is not liable for any injuries, damages, or losses resulting from services provided. Providers must maintain adequate liability insurance as required by Canadian law.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Payments & Fees</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Providers agree to the platform's commission rates (if any), and understand that all payments are processed through authorized methods. All transactions are subject to applicable Canadian tax laws and GST/HST requirements.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">6. Service Cancellations</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Providers must give at least 24 hours' notice for cancellations. Repeated no-shows or last-minute cancellations may lead to penalties or deactivation. Emergency cancellations must be communicated immediately.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">7. Content Ownership</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Providers retain ownership of their content but grant TaskZing a license to display, distribute, and promote it on the platform. This license is non-exclusive and revocable upon account termination.
                  </p>
                </div>
              </div>
            </>
          ),
        };
        
      case "user":
        return {
          title: isFrench ? "Conditions des utilisateurs" : "User Terms & Conditions",
          content: isFrench ? (
            <>
              <div className="mb-6 rounded-2xl border border-[#D94856]/35 bg-[#C43D4C] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">i</div>
                  <div>
                    <p className="mb-1 font-semibold text-white">Avis important</p>
                    <p className="text-sm text-white">Ces termes et conditions sont régis par les lois canadiennes et américaines et sont conformes aux règlements provinciaux, étatiques et fédéraux applicables dans les deux pays. En utilisant TaskZing, vous acceptez d'être lié par ces termes.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Informations précises</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les utilisateurs doivent fournir des détails précis lors de la réservation (par exemple, lieu, heure, portée du travail) et sont responsables de tout problème causé par de fausses informations. Les fausses informations peuvent entraîner l'annulation de la réservation sans remboursement.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Accord de réservation</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    En réservant un prestataire, les utilisateurs acceptent les conditions de service (prix, horaire, portée) telles que spécifiées par le prestataire. TaskZing n'est pas partie au contrat de service et agit uniquement comme facilitateur de plateforme.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Annulations et remboursements</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les utilisateurs peuvent annuler les réservations dans les 24 heures pour un remboursement complet. Les annulations au-delà de cette période peuvent être partiellement remboursées ou non remboursables, selon la politique d'annulation du prestataire. Les remboursements sont traités conformément aux lois canadiennes sur la protection des consommateurs (Loi sur la concurrence) et aux lois américaines sur la protection des consommateurs applicables. Les utilisateurs ont des droits supplémentaires en vertu des lois provinciales sur la protection des consommateurs au Canada et des lois étatiques sur la protection des consommateurs aux États-Unis.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Évaluations et avis</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les utilisateurs peuvent laisser des évaluations et des avis après l'achèvement du service, mais ceux-ci doivent être honnêtes et respectueux. Le contenu faux, diffamatoire ou abusif est interdit et peut entraîner une suspension de compte.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Obligations de paiement</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les utilisateurs sont responsables du paiement en temps opportun de tous les frais convenus. Le défaut de paiement peut entraîner une suspension du service et des efforts de recouvrement conformément aux lois canadiennes sur le recouvrement de créances (Loi sur les agences de recouvrement) et aux lois américaines fédérales et étatiques sur le recouvrement de créances (Fair Debt Collection Practices Act). Le traitement des paiements est conforme aux normes PCI DSS et aux règlements financiers applicables dans les deux pays.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 rounded-2xl border border-[#D94856]/35 bg-[#C43D4C] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">i</div>
                  <div>
                    <p className="mb-1 font-semibold text-white">Important Notice</p>
                    <p className="text-sm text-white">These terms and conditions are governed by Canadian and United States laws and comply with applicable provincial, state, and federal regulations in both countries. By using TaskZing, you agree to be bound by these terms.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Accurate Information</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Users must provide accurate details when making a booking (e.g., location, time, scope of work) and are responsible for any issues caused by misinformation. False information may result in booking cancellation without refund.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Booking Agreement</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    By booking a provider, users agree to the service terms (pricing, schedule, scope) as specified by the provider. TaskZing is not a party to the service contract and acts only as a platform facilitator.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Cancellations & Refunds</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Users may cancel bookings within 24 hours for a full refund. Cancellations beyond this window may be partially refunded or non-refundable, depending on the provider's cancellation policy. Refunds are processed according to Canadian consumer protection laws (Competition Act) and applicable U.S. state consumer protection laws. Users have additional rights under provincial consumer protection acts in Canada and state consumer protection laws in the U.S.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Ratings & Reviews</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Users can leave ratings and reviews after service completion but must be honest and respectful. False, defamatory, or abusive content is not allowed and may result in account suspension.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Payment Obligations</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Users are responsible for timely payment of all agreed-upon fees. Failure to pay may result in service suspension and collection efforts in accordance with Canadian debt collection laws (Collection Agencies Act) and applicable U.S. federal and state debt collection laws (Fair Debt Collection Practices Act). Payment processing complies with PCI DSS standards and applicable financial regulations in both countries.
                  </p>
                </div>
              </div>
            </>
          ),
        };
        
      case "post-job":
        return {
          title: isFrench ? "Conditions de publication d'emploi" : "Post Job Terms & Conditions",
          content: isFrench ? (
            <>
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Exigences de publication d'emploi</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Toutes les publications d'emploi doivent être conformes aux lois canadiennes sur l'emploi, à la législation anti-discrimination et aux règlements provinciaux/fédéraux. TaskZing se réserve le droit de rejeter ou de supprimer les publications d'emploi inappropriées.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Description d'emploi précise</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les descriptions d'emploi doivent refléter avec précision le travail, la portée, le calendrier et la rémunération. Les publications trompeuses seront supprimées et peuvent entraîner une suspension de compte. Toutes les publications doivent inclure des livrables et des attentes clairs.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Rémunération équitable</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Toutes les publications d'emploi doivent offrir une rémunération équitable qui respecte ou dépasse les lois sur le salaire minimum applicables dans la province ou le territoire canadien concerné. La rémunération doit être clairement indiquée et non discriminatoire.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Propriété intellectuelle</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les publications d'emploi doivent respecter les droits de propriété intellectuelle, et les clients conservent la propriété de leur PI sauf transfert explicite par un accord séparé. TaskZing n'est pas responsable des litiges de PI entre les parties.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Exigences de sécurité</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Pour les emplois impliquant un travail physique, il est requis de se conformer aux règlements canadiens sur la santé et la sécurité au travail. Les clients doivent fournir des conditions de travail sécuritaires et l'équipement de sécurité nécessaire.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">6. Conditions de paiement</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les conditions de paiement doivent être clairement spécifiées dans les publications d'emploi, et tous les paiements doivent être conformes aux lois fiscales canadiennes, y compris la TPS/TVH. TaskZing facilite les paiements mais n'est pas responsable des litiges de paiement.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Job Posting Requirements</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    All job postings must comply with Canadian employment laws, anti-discrimination legislation, and provincial/federal regulations. TaskZing reserves the right to reject or remove inappropriate job postings.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Accurate Job Description</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Job descriptions must accurately reflect the work, scope, timeline, and compensation. Misleading postings will be removed and may result in account suspension. All postings must include clear deliverables and expectations.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Fair Compensation</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    All job postings must offer fair compensation that meets or exceeds applicable minimum wage laws in the relevant Canadian province or territory. Compensation must be clearly stated and non-discriminatory.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Intellectual Property</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Job postings must respect intellectual property rights, and clients retain ownership of their IP unless explicitly transferred through a separate agreement. TaskZing is not responsible for IP disputes between parties.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Safety Requirements</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    For jobs involving physical work, compliance with Canadian Occupational Health and Safety regulations is required. Clients must provide safe working conditions and necessary safety equipment.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">6. Payment Terms</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Payment terms must be clearly specified in job postings, and all payments must comply with Canadian tax laws, including GST/HST. TaskZing facilitates payments but is not responsible for payment disputes.
                  </p>
                </div>
              </div>
            </>
          ),
        };
        
      case "showcase":
        return {
          title: isFrench ? "Conditions de vitrine" : "Showcase Work Terms & Conditions",
          content: isFrench ? (
            <>
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Authenticité du contenu</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Tous les travaux présentés doivent être authentiques et créés par le prestataire. Présenter faussement un travail comme le vôtre lorsqu'il a été créé par d'autres est strictement interdit et peut entraîner une résiliation immédiate du compte.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Consentement du client</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les prestataires doivent obtenir le consentement écrit explicite des clients avant de présenter leur travail. Cela comprend la permission d'afficher des échantillons de travail, des témoignages de clients et toute information d'identification. Le consentement doit être conforme aux lois canadiennes sur la confidentialité (PIPEDA).
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Droits de propriété intellectuelle</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les prestataires doivent respecter tous les droits de propriété intellectuelle lors de la présentation du travail. Cela comprend les droits d'auteur, les marques de commerce et les brevets. L'utilisation non autorisée de contenu protégé peut entraîner une action en justice et une suspension de compte.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Normes professionnelles</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les travaux présentés doivent répondre aux normes professionnelles et représenter avec précision les capacités du prestataire. Les fausses représentations ou représentations trompeuses peuvent entraîner une suspension de compte et une responsabilité légale potentielle.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Confidentialité</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les prestataires doivent maintenir la confidentialité des clients lors de la présentation du travail. Les informations sensibles ou propriétaires ne doivent pas être divulguées sans le consentement explicite du client. Les violations peuvent entraîner une résiliation de compte et une action en justice.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">6. Modération du contenu</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    TaskZing se réserve le droit d'examiner et de modérer tous les travaux présentés. Le contenu qui viole ces termes, les lois canadiennes ou les normes communautaires sera supprimé immédiatement. Les violations répétées peuvent entraîner une suspension de compte.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Content Authenticity</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    All showcased work must be authentic and created by the provider. Misrepresenting work as your own when it was created by others is strictly prohibited and may result in immediate account termination.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Client Consent</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Providers must obtain explicit written consent from clients before showcasing their work. This includes permission to display work samples, client testimonials, and any identifying information. Consent must comply with Canadian privacy laws (PIPEDA).
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Intellectual Property Rights</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Providers must respect all intellectual property rights when showcasing work. This includes copyright, trademark, and patent rights. Unauthorized use of protected content may result in legal action and account suspension.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Professional Standards</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Showcased work must meet professional standards and accurately represent the provider's capabilities. False or misleading representations may result in account suspension and potential legal liability.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Confidentiality</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Providers must maintain client confidentiality when showcasing work. Sensitive or proprietary information must not be disclosed without explicit client consent. Violations may result in account termination and legal action.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">6. Content Moderation</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    TaskZing reserves the right to review and moderate all showcased work. Content that violates these terms, Canadian laws, or community standards will be removed immediately. Repeated violations may result in account suspension.
                  </p>
                </div>
              </div>
            </>
          ),
        };
        
      case "settings":
        return {
          title: isFrench ? "Conditions des paramètres" : "Settings Terms & Conditions",
          content: isFrench ? (
            <>
              <div className="mb-6 rounded-2xl border border-[#D94856]/35 bg-[#C43D4C] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">i</div>
                  <div>
                    <p className="mb-1 font-semibold text-white">Avis important</p>
                    <p className="text-sm text-white">Ces termes et conditions sont régis par les lois canadiennes et américaines et sont conformes aux règlements provinciaux, étatiques et fédéraux applicables dans les deux pays. En utilisant TaskZing, vous acceptez d'être lié par ces termes.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Paramètres de confidentialité</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les utilisateurs peuvent contrôler les paramètres de confidentialité, mais certaines informations sont requises pour le fonctionnement de la plateforme. Les paramètres doivent être conformes aux lois canadiennes sur la confidentialité (PIPEDA) et aux lois américaines sur la confidentialité (CCPA, CPRA et autres lois étatiques). Les utilisateurs ont le droit d'accéder, de corriger et de supprimer leurs informations personnelles.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Gestion des données</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les utilisateurs ont le droit de demander l'accès, la correction ou la suppression de leurs données personnelles, conformément aux lois canadiennes (PIPEDA) et aux lois américaines (CCPA, CPRA et lois étatiques) sur la confidentialité. Les politiques de conservation des données sont conformes aux règlements, aux exigences commerciales et aux obligations légales. Les transferts transfrontaliers de données sont conformes aux lois sur la confidentialité et aux normes internationales de protection des données.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Préférences de communication</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les utilisateurs peuvent gérer leurs préférences de communication, y compris les notifications par e-mail, les alertes SMS et les communications marketing. Les utilisateurs peuvent se désabonner des communications marketing tout en maintenant les communications de service essentielles.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Désactivation du compte</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les utilisateurs peuvent désactiver leurs comptes à tout moment, ce qui supprimera les données personnelles conformément aux lois canadiennes (PIPEDA) et aux lois américaines (CCPA, CPRA et lois étatiques) sur la confidentialité. Certains enregistrements de transactions peuvent être conservés à des fins légales et commerciales, avec des périodes de conservation conformes aux lois applicables dans les deux juridictions.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Paramètres de sécurité</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Les utilisateurs sont responsables de maintenir des paramètres de compte sécurisés, y compris des mots de passe forts et l'authentification à deux facteurs lorsqu'elle est disponible. TaskZing fournit des fonctionnalités de sécurité mais ne peut garantir une sécurité absolue.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 rounded-2xl border border-[#D94856]/35 bg-[#C43D4C] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">i</div>
                  <div>
                    <p className="mb-1 font-semibold text-white">Important Notice</p>
                    <p className="text-sm text-white">These terms and conditions are governed by Canadian and United States laws and comply with applicable provincial, state, and federal regulations in both countries. By using TaskZing, you agree to be bound by these terms.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Privacy Settings</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Users can control privacy settings, but some information is required for platform functionality. Settings must comply with Canadian privacy laws (PIPEDA) and U.S. privacy laws (CCPA, CPRA, and other state privacy laws). Users have rights to access, correct, and delete personal information.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Data Management</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Users have the right to request access, correction, or deletion of personal data, adhering to Canadian (PIPEDA) and U.S. (CCPA, CPRA, and state) privacy laws. Data retention policies comply with regulations, business requirements, and legal obligations. Cross-border data transfers comply with privacy laws and international data protection standards.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Communication Preferences</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Users can manage communication preferences, including email notifications, SMS alerts, and marketing communications. Users can opt out of marketing communications while maintaining essential service communications.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Account Deactivation</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Users can deactivate their accounts at any time, which will remove personal data in accordance with Canadian (PIPEDA) and U.S. (CCPA, CPRA, and state) privacy laws. Certain transaction records may be retained for legal and business purposes, with data retention periods complying with applicable laws in both jurisdictions.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Security Settings</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Users are responsible for maintaining secure account settings, including strong passwords and two-factor authentication when available. TaskZing provides security features but cannot guarantee absolute security.
                  </p>
                </div>
              </div>
            </>
          ),
        };
        
      case "legal":
        return {
          title: isFrench ? "Clauses légales" : "Legal Terms & Conditions",
          content: isFrench ? (
            <>
              <div className="mb-6 rounded-2xl border border-[#D94856]/35 bg-[#C43D4C] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">i</div>
                  <div>
                    <p className="mb-1 font-semibold text-white">Avis important</p>
                    <p className="text-sm text-white">Ces termes et conditions sont régis par les lois canadiennes et américaines et sont conformes aux règlements provinciaux, étatiques et fédéraux applicables dans les deux pays. En utilisant TaskZing, vous acceptez d'être lié par ces termes.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Limitation de responsabilité</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    TaskZing est une plateforme de marché et n'emploie pas, ne garantit pas et ne garantit pas la qualité des services rendus par les prestataires. La plateforme n'est pas responsable des dommages directs ou indirects, sauf si requis par les lois canadiennes sur la protection des consommateurs (Loi sur la concurrence) et les lois américaines sur la protection des consommateurs applicables. Les limitations de responsabilité sont conformes aux lois applicables au Canada et aux États-Unis, y compris les lois provinciales sur la protection des consommateurs et les lois étatiques sur la protection des consommateurs.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Résiliation du compte</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Nous nous réservons le droit de suspendre ou de résilier tout compte à notre discrétion pour violations de ces termes ou conduite nuisible à la plateforme ou à d'autres utilisateurs. Les procédures de résiliation sont conformes aux exigences canadiennes sur la protection des consommateurs (Loi sur la concurrence) et aux lois américaines sur la protection des consommateurs applicables. Les utilisateurs recevront un avis approprié et des procédures d'appel conformément aux lois applicables dans les deux juridictions.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Modifications</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Nous pouvons mettre à jour ces Conditions générales à tout moment. L'utilisation continue de l'application après les mises à jour constitue une acceptation des termes révisés. Les utilisateurs seront informés des changements importants conformément aux lois canadiennes sur la protection des consommateurs (Loi sur la concurrence) et aux lois américaines sur la protection des consommateurs applicables. Les changements matériels seront communiqués avec des périodes d'avis appropriées conformément aux lois applicables dans les deux juridictions.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Loi applicable</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    Ces Conditions sont régies par les lois du Canada et des États-Unis, y compris les lois provinciales/étatiques applicables où réside l'utilisateur. Tout litige sera résolu conformément aux procédures légales canadiennes et aux lois sur la protection des consommateurs, ainsi qu'aux lois fédérales et étatiques américaines applicables. La juridiction et le lieu seront déterminés par l'emplacement de l'utilisateur et les exigences légales applicables.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Résolution des litiges</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    TaskZing fournit un support de médiation limité pour les litiges mais ne garantit pas la résolution. Les utilisateurs sont encouragés à résoudre les problèmes directement avec les prestataires. Les litiges formels peuvent être soumis aux procédures d'arbitrage ou judiciaires canadiennes, ainsi qu'aux mécanismes de résolution des litiges fédéraux et étatiques américains. Des options de résolution alternative des litiges sont disponibles.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6 rounded-2xl border border-[#D94856]/35 bg-[#C43D4C] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">i</div>
                  <div>
                    <p className="mb-1 font-semibold text-white">Important Notice</p>
                    <p className="text-sm text-white">These terms and conditions are governed by Canadian and United States laws and comply with applicable provincial, state, and federal regulations in both countries. By using TaskZing, you agree to be bound by these terms.</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">1. Limitation of Liability</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    TaskZing is a marketplace platform and does not employ, guarantee, or warrant the quality of services rendered by providers. The platform is not liable for direct or indirect damages, except as required by Canadian consumer protection laws (Competition Act) and applicable U.S. state consumer protection laws. Liability limitations comply with applicable laws in both Canada and the United States, including provincial consumer protection acts and state consumer protection statutes.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">2. Account Termination</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    We reserve the right to suspend or terminate any account at our discretion for violations of these terms or conduct harmful to the platform or other users. Termination procedures comply with Canadian consumer protection requirements (Competition Act) and applicable U.S. state consumer protection laws. Users will be provided with appropriate notice and appeal procedures as required by applicable laws in both jurisdictions.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">3. Modifications</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    We may update these Terms & Conditions at any time. Continued use of the app after updates constitutes acceptance of the revised terms. Users will be notified of significant changes in accordance with Canadian consumer protection laws (Competition Act) and applicable U.S. state consumer protection laws. Material changes will be communicated with appropriate notice periods as required by applicable laws in both jurisdictions.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">4. Governing Law</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    These Terms are governed by the laws of Canada and the United States, including applicable provincial/state laws where the user resides. Any disputes will be resolved in accordance with Canadian legal procedures and consumer protection laws, as well as applicable U.S. federal and state laws. Jurisdiction and venue will be determined by the user's location and applicable legal requirements.
                  </p>
                </div>
                
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">5. Dispute Resolution</h3>
                  <p className="leading-relaxed text-gray-900 dark:text-slate-300">
                    TaskZing provides limited mediation support for disputes but does not guarantee resolution. Users are encouraged to resolve issues directly with providers. Formal disputes may be subject to Canadian arbitration or court procedures, as well as U.S. federal and state dispute resolution mechanisms. Alternative dispute resolution options are available.
                  </p>
                </div>
              </div>
            </>
          ),
        };
        
      default:
        return { title: "", content: null };
    }
  };

  const termsContent = openModal ? getTermsContent(openModal) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-theme-primaryText dark:text-white">
          {language === "french" ? "Conditions générales" : "Terms & Conditions"}
        </h1>
      </div>

      {/* Main Info Box */}
      <Card className="mb-8 border-2 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-theme-primaryText dark:text-white">
              {language === "french" ? "Conditions générales" : "Terms & Conditions"}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md">
              {language === "french"
                ? "Ces termes et conditions régissent votre utilisation de TaskZing et sont conformes aux lois canadiennes et américaines. Veuillez les lire attentivement."
                : "These terms and conditions govern your use of TaskZing and comply with Canadian and United States laws. Please read them carefully."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Categories Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4 text-theme-primaryText dark:text-white">
          {language === "french" ? "Termes par catégorie" : "Terms by Category"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              className="cursor-pointer hover:shadow-md transition-shadow dark:bg-darkBlue-203 dark:border-gray-700"
              onClick={() => setOpenModal(category.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`${category.iconBg} p-3 rounded-lg text-white`}>
                    {category.icon}
                  </div>
                  <span className="font-medium text-theme-primaryText dark:text-white">
                    {category.title}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Legal Notice */}
      <Card className="mb-6 border border-[#D94856]/35 bg-[#C43D4C] dark:bg-[#C43D4C] dark:border-[#D94856]/35">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
              ⚠
            </div>
            <div>
              <p className="mb-1 font-semibold text-white">
                {language === "french" ? "Avis légal" : "Legal Notice"}
              </p>
              <p className="text-sm text-white">
                {language === "french"
                  ? "Ces termes sont régis par les lois canadiennes et américaines et sont conformes aux règlements provinciaux, étatiques et fédéraux applicables dans les deux pays. En utilisant TaskZing, vous acceptez d'être lié par ces termes. Pour toute question concernant ces termes, veuillez nous contacter à legal@taskzing.com"
                  : "These terms are governed by Canadian and United States laws and comply with applicable provincial, state, and federal regulations in both countries. By using TaskZing, you agree to be bound by these terms. For questions about these terms, please contact us at legal@taskzing.com"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400 mb-8">
        <p className="font-semibold">TaskZing Inc.</p>
        <p className="mt-1">
          {language === "french" ? "Une société canadienne" : "A Canadian Corporation"}
        </p>
      </div>

      {/* Modal for Terms */}
      {termsContent && isClient
        ? createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setOpenModal(null)}
            aria-hidden="true"
          />

          {/* Modal Content — light: white card; dark: deep navy per design ref */}
          <div className="relative z-[301] flex max-h-[88vh] w-full max-w-[95vw] flex-col rounded-2xl bg-white shadow-xl sm:max-w-[560px] dark:rounded-2xl dark:bg-[#243b82]">
            {/* Header */}
            <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-4 py-3 dark:border-white/10">
              <div className="min-w-0 pr-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {termsContent.title}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {language === "french"
                    ? "Version 1.0.0 • Dernière mise à jour : décembre 2024"
                    : "Version 1.0.0 • Last Updated: December 2024"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpenModal(null)}
                aria-label="Close modal"
                className="ml-auto shrink-0 text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-gray-900 dark:text-slate-300 [scrollbar-width:thin] [scrollbar-color:#d1d5db_#ffffff] dark:[scrollbar-color:#8ea0d6_#1b2f63] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-white dark:[&::-webkit-scrollbar-track]:bg-[#1b2f63] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#d1d5db] dark:[&::-webkit-scrollbar-thumb]:bg-[#8ea0d6]">
              {termsContent.content}
            </div>

            {/* Footer with Close Button - Always Visible */}
            <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#243b82]">
              <div className="mb-4 text-sm text-gray-600 dark:text-slate-400">
                <p className="font-semibold text-gray-900 dark:text-white">TaskZing Inc.</p>
                <p className="mt-1">
                  {language === "french" ? "Une société canadienne" : "A Canadian Corporation"}
                </p>
                <p className="mt-2">
                  {language === "french"
                    ? "Pour toute question concernant ces termes, veuillez nous contacter à legal@taskzing.com"
                    : "For questions about these terms, please contact us at legal@taskzing.com"}
                </p>
              </div>
              <Button
                variant="primary"
                className="w-full rounded-full bg-[#EF4444] font-semibold text-white hover:bg-red-600 dark:bg-[#EF4444] dark:hover:bg-red-600"
                onClick={() => setOpenModal(null)}
              >
                {language === "french" ? "Fermer" : "Close"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )
        : null}
    </div>
  );
}
