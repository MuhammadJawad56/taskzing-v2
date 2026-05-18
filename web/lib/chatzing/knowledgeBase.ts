// TaskZing knowledge dataset for ChatZing (served by API via taskzing_help; not used for live replies in the web UI).

export type { ChatMessage } from "./types";

export interface KnowledgeEntry {
  keywords: string[];
  keywordsFr?: string[]; // French keywords
  category: string;
  answer: string | (() => string); // Can be a function for dynamic answers
  answerFr?: string | (() => string); // French answer (can be dynamic)
  relatedTopics?: string[];
}

export const knowledgeBase: KnowledgeEntry[] = [
  // Greetings and General Conversation
  {
    keywords: ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening"],
    keywordsFr: ["bonjour", "salut", "bonsoir", "bon matin"],
    category: "Greetings",
    answer: "Hello. I am ChatZing, the TaskZing assistant. How can I help you today?",
    answerFr: "Bonjour. Je suis ChatZing, l'assistant TaskZing. Comment puis-je vous aider ?",
    relatedTopics: ["help", "features", "getting started"]
  },
  {
    keywords: ["how are you", "how's it going", "how do you do", "what's up"],
    keywordsFr: ["comment allez-vous", "comment ça va", "ça va"],
    category: "Greetings",
    answer: "I'm doing great, thank you for asking! I'm here and ready to help you with anything you need about TaskZing. What would you like to know?",
    answerFr: "Je vais très bien, merci de demander! Je suis là et prêt à vous aider avec tout ce dont vous avez besoin concernant TaskZing. Que souhaitez-vous savoir?",
    relatedTopics: ["help", "features"]
  },
  {
    keywords: ["what is your name", "who are you", "what's your name", "tell me about yourself"],
    keywordsFr: ["quel est votre nom", "qui êtes-vous", "comment vous appelez-vous", "parlez-moi de vous"],
    category: "Greetings",
    answer: "I am ChatZing, the official TaskZing assistant for jobs, showcases, profiles, and platform guidance.",
    answerFr: "Je suis ChatZing, l'assistant officiel TaskZing pour les emplois, vitrines, profils et l'utilisation de la plateforme.",
    relatedTopics: ["help", "features", "overview"]
  },
  {
    keywords: ["what time is it", "current time", "time now", "what's the time"],
    keywordsFr: ["quelle heure est-il", "heure actuelle", "l'heure"],
    category: "General",
    answer: () => {
      const now = new Date();
      return `The current time is ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}. Is there anything about TaskZing I can help you with?`;
    },
    answerFr: () => {
      const now = new Date();
      return `L'heure actuelle est ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })}. Y a-t-il quelque chose concernant TaskZing avec lequel je peux vous aider?`;
    }
  },
  {
    keywords: ["what day is it", "what's today", "current day", "what day"],
    keywordsFr: ["quel jour sommes-nous", "quel jour est-ce", "jour actuel"],
    category: "General",
    answer: () => {
      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Today is ${days[now.getDay()]}, ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. How can I help you with TaskZing today?`;
    },
    answerFr: () => {
      const now = new Date();
      const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      return `Aujourd'hui, nous sommes ${days[now.getDay()]}, le ${now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}. Comment puis-je vous aider avec TaskZing aujourd'hui?`;
    }
  },
  {
    keywords: ["what's the date", "current date", "today's date", "date today"],
    keywordsFr: ["quelle est la date", "date actuelle", "date d'aujourd'hui"],
    category: "General",
    answer: () => {
      const now = new Date();
      return `Today's date is ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Need help with anything on TaskZing?`;
    },
    answerFr: () => {
      const now = new Date();
      return `La date d'aujourd'hui est le ${now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}. Besoin d'aide avec quelque chose sur TaskZing?`;
    }
  },
  {
    keywords: ["thank you", "thanks", "appreciate it", "thank you so much"],
    keywordsFr: ["merci", "merci beaucoup", "je vous remercie"],
    category: "Greetings",
    answer: "You're very welcome! I'm always here to help you with TaskZing. Feel free to ask me anything else!",
    answerFr: "De rien! Je suis toujours là pour vous aider avec TaskZing. N'hésitez pas à me poser d'autres questions!",
    relatedTopics: ["help", "features"]
  },
  {
    keywords: ["goodbye", "bye", "see you", "farewell", "good night"],
    keywordsFr: ["au revoir", "à bientôt", "bonne nuit", "salut"],
    category: "Greetings",
    answer: "Goodbye! It was great helping you today. Come back anytime if you need assistance with TaskZing. Have a wonderful day!",
    answerFr: "Au revoir! C'était un plaisir de vous aider aujourd'hui. Revenez à tout moment si vous avez besoin d'aide avec TaskZing. Passez une excellente journée!",
    relatedTopics: []
  },
  {
    keywords: ["help", "need help", "can you help", "assist me"],
    keywordsFr: ["aide", "besoin d'aide", "pouvez-vous aider", "aidez-moi"],
    category: "General",
    answer: "I can help with posting or finding jobs, showcases, messaging, proposals, payments, profile settings, and general TaskZing navigation. What do you need?",
    answerFr: "Je peux vous aider pour publier ou trouver des emplois, les vitrines, la messagerie, les propositions, les paiements, le profil et la navigation TaskZing. De quoi avez-vous besoin ?",
    relatedTopics: ["overview", "features", "getting started"]
  },
  
  // App Overview
  {
    keywords: ["what is taskzing", "about taskzing", "taskzing app", "what does taskzing do"],
    keywordsFr: ["qu'est-ce que taskzing", "à propos de taskzing", "application taskzing"],
    category: "Overview",
    answer: "TaskZing is a comprehensive task and job marketplace platform connecting clients with skilled service providers. It allows clients to post jobs and providers to showcase their skills. Features include secure payments through Stripe, real-time messaging, location-based services, dual role system (client/provider), multi-language support (English/French), and an AI-powered assistant (that's me!).",
    answerFr: "TaskZing est une plateforme complète de marché de tâches et d'emplois connectant les clients avec des prestataires de services qualifiés. Il permet aux clients de publier des emplois et aux prestataires de présenter leurs compétences. Les fonctionnalités incluent des paiements sécurisés via Stripe, la messagerie en temps réel, les services basés sur la localisation, le système de double rôle (client/prestataire), le support multilingue (Anglais/Français), et un assistant alimenté par l'IA (c'est moi!).",
    relatedTopics: ["features", "how to use", "getting started"]
  },
  
  // Posting Jobs
  {
    keywords: ["post job", "create job", "how to post", "post a task", "add job"],
    keywordsFr: ["publier un emploi", "créer un emploi", "comment publier", "ajouter un emploi"],
    category: "Jobs",
    answer: "To post a job: 1) Navigate to 'Post a Job' from the navigation menu, 2) Fill in job details including title, description, budget, location, and required skills, 3) Add photos if needed, 4) Select posting type (Individual, Company, or In Store), 5) Set urgency level and estimated duration, 6) Submit your job. Once posted, providers can view and apply to your job. You can also describe the job in ChatZing and post with AI after confirming details.",
    answerFr: "Pour publier un emploi: 1) Allez à 'Publier un emploi', 2) Remplissez titre, description, budget, lieu et compétences, 3) Ajoutez des photos si besoin, 4) Choisissez le type d'annonceur, 5) Définissez l'urgence et la durée, 6) Soumettez. Vous pouvez aussi décrire l'emploi dans ChatZing et le publier avec l'IA après confirmation.",
    relatedTopics: ["job details", "proposals", "chatzing"]
  },
  
  // Finding Jobs
  {
    keywords: ["find jobs", "browse jobs", "search jobs", "explore jobs", "available jobs"],
    category: "Jobs",
    answer: "To find jobs: 1) Go to 'Explore' page (for providers) or 'All Jobs' (for clients), 2) Use the search bar to find specific jobs, 3) Apply filters by location, category, price range, posting type, and urgency level, 4) Click on any job card to view full details, 5) Apply to jobs that match your skills. You can also save jobs for later.",
    relatedTopics: ["filters", "job details", "apply to jobs"]
  },
  
  // Explore Page
  {
    keywords: ["explore page", "explore", "browse showcase", "showcase work"],
    category: "Navigation",
    answer: "The Explore page shows showcase work from providers. You can: 1) Search by keywords, 2) Filter by location, area, poster type, rating, and posting date, 3) Sort by newest, oldest, or rating, 4) Click on any showcase tile to view full details, 5) Contact providers or bookmark their work. Images auto-slide on tiles if there are multiple photos.",
    relatedTopics: ["filters", "showcase details", "contact provider"]
  },
  
  // Filters
  {
    keywords: ["filters", "filter jobs", "filter showcase", "how to filter"],
    category: "Navigation",
    answer: "Filters help you find exactly what you need. Available filters include: Location (city/address), Area (neighborhood), Poster Type (Individual/Company/In Store), Rating (2+ to 5 stars), Day Posted (Last 24 hours, 7 days, 30 days, or any time), Category, Price Range, and Urgency Level. Click 'Apply Filter' to see results. Use 'Clear All' to reset.",
    relatedTopics: ["explore page", "search", "sort"]
  },
  
  // Profile Management
  {
    keywords: ["profile", "edit profile", "my profile", "update profile", "profile settings"],
    category: "Profile",
    answer: "To manage your profile: 1) Click on 'Profile' in navigation, 2) Click 'Edit Profile' button, 3) Update your information (name and email are read-only), 4) Add or change your photo, bio, location, and skills, 5) Save changes. Your profile shows your jobs (All/Active/Complete), reviews, and saved profiles. Others can view your profile, chat with you, or bookmark you.",
    relatedTopics: ["profile visibility", "reviews", "saved profiles"]
  },
  
  // Settings
  {
    keywords: ["settings", "preferences", "configure", "app settings"],
    category: "Settings",
    answer: "Access Settings from the navigation menu. You can: 1) Toggle Dark/Light mode, 2) Manage payment methods (add/delete cards via Stripe), 3) Control notifications, 4) Submit suggestions or complaints, 5) View terms and conditions, 6) Change language (English/French), 7) Deactivate account, 8) Log out. All changes are saved automatically.",
    relatedTopics: ["language", "theme", "payment", "notifications"]
  },
  
  // Language Settings
  {
    keywords: ["language", "french", "english", "change language", "language settings"],
    category: "Settings",
    answer: "To change language: 1) Go to Settings, 2) Find the 'Language' section, 3) Click 'English' or 'French' button, 4) The entire app will switch to your selected language immediately. Your preference is saved and persists across sessions. All navigation, buttons, labels, and messages will be translated.",
    relatedTopics: ["settings", "preferences"]
  },
  
  // Dark Mode
  {
    keywords: ["dark mode", "light mode", "theme", "dark theme", "blue theme"],
    category: "Settings",
    answer: "To toggle dark/light mode: 1) Go to Settings, 2) Find 'Dark/Light Mode' section, 3) Toggle the switch. Dark mode uses a blue theme for better visibility. Light mode uses standard colors. Your preference is saved automatically. The theme applies to all pages including navigation, cards, and modals.",
    relatedTopics: ["settings", "appearance"]
  },
  
  // Payment Methods
  {
    keywords: ["payment", "payment method", "add card", "credit card", "stripe", "payment settings"],
    category: "Payments",
    answer: "To manage payment methods: 1) Go to Settings > Payment Method, 2) Click 'Add New Card', 3) Enter cardholder name and card details (securely processed by Stripe), 4) Save. Your cards are encrypted and secure. You can view all saved cards with their last 4 digits and expiry dates. Delete cards anytime. Stripe handles all payment security.",
    relatedTopics: ["settings", "security", "stripe"]
  },
  
  // Messaging
  {
    keywords: ["message", "chat", "messaging", "send message", "contact", "inbox"],
    category: "Communication",
    answer: "To message someone: 1) Click 'Chat' or 'Contact' button on their profile/job/showcase, 2) Or go to 'Messages' from navigation, 3) Select a conversation or start a new one, 4) Type your message and send. Messages are real-time. You can see message history, send attachments, and manage conversations. Both clients and providers can message each other.",
    relatedTopics: ["profile", "job details", "showcase"]
  },
  
  // Proposals
  {
    keywords: ["proposal", "apply", "submit proposal", "job application"],
    category: "Jobs",
    answer: "To submit a proposal: 1) Find a job you're interested in, 2) Click on the job to view details, 3) Click 'Apply' or 'Submit Proposal', 4) Fill in your proposal including your approach, timeline, and price, 5) Submit. The client will review your proposal and can accept, reject, or message you for more details. You can track all your proposals in 'My Tasks'.",
    relatedTopics: ["jobs", "my tasks", "proposals"]
  },
  
  // Showcase Work
  {
    keywords: ["showcase", "portfolio", "showcase work", "add showcase", "create showcase"],
    category: "Profile",
    answer: "To create showcase work: 1) Go to 'Showcase Work' from navigation (providers), 2) Click 'Add New Showcase', 3) Upload multiple photos/images, 4) Add title, description, location, and skills, 5) Select posting type, 6) Save. Your showcase appears on Explore pages. Others can view, contact you, or bookmark your work. Images auto-slide on tiles.",
    relatedTopics: ["profile", "explore", "portfolio"]
  },
  
  // Saved Items
  {
    keywords: ["saved", "bookmark", "save job", "save profile", "bookmarked"],
    category: "Navigation",
    answer: "To save items: Click the bookmark icon on jobs, profiles, or showcase work. Saved items appear in: 1) 'Saved' tab on your profile (for bookmarked profiles), 2) 'Show Saved' filter on explore pages. You can unsave anytime. Saved items help you keep track of interesting providers, jobs, or work you want to revisit later.",
    relatedTopics: ["profile", "explore", "bookmark"]
  },
  
  // QR Code
  {
    keywords: ["qr code", "qr", "share profile", "share link"],
    category: "Sharing",
    answer: "To share your profile via QR code: 1) Click the QR code button in the header, 2) A modal opens showing your profile QR code, 3) Others can scan it to view your profile directly. You can also share profile links, job links, or showcase links using the share button. QR codes make it easy to share your profile in person.",
    relatedTopics: ["profile", "sharing"]
  },
  
  // Troubleshooting - General
  {
    keywords: ["problem", "issue", "not working", "error", "bug", "help"],
    category: "Troubleshooting",
    answer: "If you're experiencing issues: 1) Check your internet connection, 2) Refresh the page, 3) Clear browser cache, 4) Try logging out and back in, 5) Check if the issue persists in different browsers, 6) Submit feedback via Settings > Suggestions & Complaints. For payment issues, contact support. Most issues resolve with a refresh.",
    relatedTopics: ["support", "feedback"]
  },
  
  // Navigation Tips
  {
    keywords: ["navigate", "how to use", "getting started", "tutorial", "guide"],
    category: "Navigation",
    answer: "TaskZing navigation: Use the sidebar (desktop) or menu (mobile) to access: Dashboard (overview), Explore (browse showcase/jobs), Post a Job (clients), Showcase Work (providers), My Tasks, Messages, Profile, Settings, and Chat Zing (me!). The header has search, filters, QR code, and notifications. Switch between client and provider roles if you have both.",
    relatedTopics: ["dashboard", "explore", "profile"]
  },
  
  // Role Switching
  {
    keywords: ["switch role", "client", "provider", "change role", "dual role"],
    category: "Navigation",
    answer: "TaskZing supports dual roles. If you're registered as both client and provider, you can switch roles. The interface adapts: Clients see 'Post a Job', 'All Jobs', and client-specific features. Providers see 'Explore', 'Showcase Work', 'My Tasks', and provider features. Switch roles from the dashboard or profile settings to access different features.",
    relatedTopics: ["dashboard", "profile", "navigation"]
  },
  
  // Job Status
  {
    keywords: ["job status", "active jobs", "complete jobs", "in progress", "open jobs"],
    category: "Jobs",
    answer: "Job statuses: Open (accepting proposals), In Progress (work has started), Complete (finished). View all your jobs in 'My Tasks' or on your profile. Filter by 'All Jobs', 'Active Jobs', or 'Complete Jobs'. Clients can manage job status, and providers can see which jobs they've applied to or are working on.",
    relatedTopics: ["my tasks", "profile", "jobs"]
  },
  
  // Reviews and Ratings
  {
    keywords: ["review", "rating", "rate", "feedback", "stars"],
    category: "Profile",
    answer: "Reviews and ratings help build trust. After completing a job, you can rate and review the other party. Ratings appear on profiles. You can filter by rating (2+ to 5 stars) when browsing. High ratings improve visibility. Reviews are public and help others make informed decisions. Both clients and providers can receive reviews.",
    relatedTopics: ["profile", "jobs", "trust"]
  },
  
  // Security
  {
    keywords: ["security", "safe", "secure", "privacy", "data protection"],
    keywordsFr: ["sécurité", "sûr", "sécurisé", "confidentialité", "protection des données"],
    category: "Security",
    answer: "TaskZing prioritizes security: 1) Payments are processed securely through Stripe (we never store full card details), 2) All data is encrypted, 3) Real-time messaging is private, 4) Profile information is controlled by you, 5) You can deactivate your account anytime. Never share passwords. Report suspicious activity via Settings > Suggestions & Complaints.",
    answerFr: "TaskZing priorise la sécurité: 1) Les paiements sont traités de manière sécurisée via Stripe, 2) Toutes les données sont chiffrées, 3) La messagerie en temps réel est privée, 4) Vous contrôlez les informations de votre profil, 5) Vous pouvez désactiver votre compte à tout moment.",
    relatedTopics: ["payment", "privacy", "account"]
  },

  // ChatZing AI
  {
    keywords: ["chatzing", "chat zing", "ai assistant", "ai help", "ask ai"],
    keywordsFr: ["chatzing", "chat zing", "assistant ia", "aide ia"],
    category: "ChatZing",
    answer: "ChatZing helps you use TaskZing: post or find jobs, review showcases, assess local demand, draft descriptions from a short brief, and send voice or photo messages. Sign in and confirm location when you need local results.",
    answerFr: "ChatZing vous aide sur TaskZing : publier ou trouver des emplois, consulter les vitrines, la demande locale, rédiger une description à partir d'un bref texte, et envoyer des messages vocaux ou des photos. Connectez-vous et confirmez la position pour les résultats locaux.",
    relatedTopics: ["local demand", "post job", "voice"]
  },
  {
    keywords: ["poster", "generate poster", "create poster", "marketing poster", "flyer"],
    keywordsFr: ["affiche", "générer une affiche", "créer une affiche", "flyer"],
    category: "ChatZing",
    answer: "AI poster generation is temporarily unavailable in ChatZing. Use showcases and job posts to promote your services on TaskZing.",
    answerFr: "La génération d'affiches par IA est temporairement indisponible dans ChatZing. Utilisez les vitrines et les emplois pour promouvoir vos services.",
    relatedTopics: ["showcase", "chatzing"]
  },
  {
    keywords: ["voice", "speech to text", "microphone", "dictate", "voice input"],
    keywordsFr: ["voix", "parole en texte", "microphone", "dicter"],
    category: "ChatZing",
    answer: "Tap the microphone in the message field to dictate your request. Speech is converted to text and handled like a normal message.",
    answerFr: "Appuyez sur le microphone dans le champ de message pour dicter votre demande. La parole est convertie en texte comme un message ordinaire.",
    relatedTopics: ["chatzing", "post job"]
  },
  {
    keywords: ["image", "photo", "picture", "image to text", "scan image", "upload photo"],
    keywordsFr: ["image", "photo", "télécharger une photo", "analyser une image"],
    category: "ChatZing",
    answer: "Attach or drop a photo in ChatZing to ask questions about what appears on screen or in the picture.",
    answerFr: "Joignez ou déposez une photo dans ChatZing pour poser des questions sur ce qui apparaît à l'écran ou sur l'image.",
    relatedTopics: ["showcase", "chatzing"]
  },
  {
    keywords: ["local demand", "demand in my area", "trending", "saturation", "competition nearby", "how many offer"],
    keywordsFr: ["demande locale", "tendance", "saturation", "concurrence", "combien offrent"],
    category: "ChatZing",
    answer: "After you confirm location, describe what you offer or need. ChatZing summarizes nearby jobs and showcases and comments on competition in your area.",
    answerFr: "Après confirmation de la position, décrivez ce que vous offrez ou recherchez. ChatZing résume les emplois et vitrines à proximité et la concurrence dans votre zone.",
    relatedTopics: ["nearby jobs", "suggest niches"]
  },
  {
    keywords: ["post job with ai", "ai post job", "create job from description", "brief job"],
    keywordsFr: ["publier un emploi avec l'ia", "créer un emploi", "bref emploi"],
    category: "ChatZing",
    answer: "Describe the job you need. ChatZing drafts the listing and walks you through budget, location, date, and skills before you confirm posting as a signed-in client.",
    answerFr: "Décrivez l'emploi souhaité. ChatZing rédige l'annonce et vous guide sur le budget, le lieu, la date et les compétences avant publication en tant que client connecté.",
    relatedTopics: ["post job", "validate job"]
  },
  {
    keywords: ["nearby jobs", "jobs near me", "local jobs", "open jobs near"],
    keywordsFr: ["emplois à proximité", "emplois près de moi", "emplois locaux"],
    category: "ChatZing",
    answer: "With location confirmed, ask for nearby open jobs. Results include title, category, and distance where available.",
    answerFr: "Une fois la position confirmée, demandez les emplois ouverts à proximité avec titre, catégorie et distance lorsque disponible.",
    relatedTopics: ["find jobs", "local demand"]
  },
  {
    keywords: ["nearby showcase", "showcases near me", "portfolio nearby", "local providers"],
    keywordsFr: ["vitrines à proximité", "portfolio près de moi", "prestataires locaux"],
    category: "ChatZing",
    answer: "With location confirmed, ask for nearby provider showcases to discover local services.",
    answerFr: "Une fois la position confirmée, demandez les vitrines de prestataires à proximité.",
    relatedTopics: ["explore page", "showcase"]
  },
  {
    keywords: ["suggest niche", "what should i offer", "service ideas", "i am a tutor", "i sell"],
    keywordsFr: ["suggérer un créneau", "que devrais-je offrir", "idées de service", "je suis tuteur", "je vends"],
    category: "ChatZing",
    answer: "Describe your skills or products with location confirmed. ChatZing summarizes relevant local demand from nearby jobs and showcases.",
    answerFr: "Décrivez vos compétences ou produits avec la position confirmée. ChatZing résume la demande locale à partir des emplois et vitrines à proximité.",
    relatedTopics: ["local demand", "poster"]
  },
  {
    keywords: ["create showcase with ai", "ai showcase", "showcase from brief"],
    keywordsFr: ["créer une vitrine avec l'ia", "vitrine ia"],
    category: "ChatZing",
    answer: "ChatZing can help draft showcase copy. Complete publishing in Showcase Work in the app.",
    answerFr: "ChatZing peut aider à rédiger le texte de vitrine. Finalisez la publication dans Vitrine dans l'application.",
    relatedTopics: ["showcase", "poster"]
  },
  {
    keywords: ["auto description", "write description for me", "only title", "short title", "expand my title"],
    keywordsFr: ["description automatique", "rédiger la description", "titre seulement", "titre court"],
    category: "ChatZing",
    answer: "Send a short job or service title. ChatZing drafts a professional description, category, and skills for your review before posting.",
    answerFr: "Envoyez un titre court d'emploi ou de service. ChatZing rédige une description professionnelle, une catégorie et des compétences à valider avant publication.",
    relatedTopics: ["post job", "chatzing"]
  },
  {
    keywords: ["confirm location", "use my location", "share gps", "current location permission"],
    keywordsFr: ["confirmer la position", "utiliser ma position", "partager gps"],
    category: "ChatZing",
    answer: "Location is used only after you confirm in chat or tap Use my location. This keeps local job and demand results accurate while protecting privacy.",
    answerFr: "La position n'est utilisée qu'après votre confirmation dans le chat ou via Utiliser ma position, pour des résultats locaux précis tout en protégeant votre vie privée.",
    relatedTopics: ["nearby jobs", "local demand"]
  }
];

/** Structured dataset for tooling, docs, or server sync (live answers come from the ChatZing API). */
export function getKnowledgeDataset(): {
  version: string;
  entryCount: number;
  entries: KnowledgeEntry[];
} {
  return {
    version: "2.0.0",
    entryCount: knowledgeBase.length,
    entries: knowledgeBase,
  };
}

// Function to find relevant answers based on user query
export function findAnswer(query: string, language: "english" | "french" = "english"): KnowledgeEntry[] {
  const lowerQuery = query.toLowerCase().trim();
  
  // Check both English and French keywords
  const checkKeywords = (entry: KnowledgeEntry) => {
    const keywords = language === "french" && entry.keywordsFr 
      ? [...entry.keywords, ...entry.keywordsFr]
      : entry.keywords;
    return keywords.some(keyword => lowerQuery.includes(keyword.toLowerCase()));
  };
  
  // Exact keyword matches (highest priority)
  const exactMatches = knowledgeBase.filter(checkKeywords);
  
  if (exactMatches.length > 0) {
    return exactMatches;
  }
  
  // Partial matches
  const partialMatches = knowledgeBase.filter(entry => {
    const keywords = language === "french" && entry.keywordsFr 
      ? [...entry.keywords, ...entry.keywordsFr]
      : entry.keywords;
    return keywords.some(keyword => {
      const keywordLower = keyword.toLowerCase();
      return keywordLower.includes(lowerQuery) || lowerQuery.includes(keywordLower);
    });
  });
  
  if (partialMatches.length > 0) {
    return partialMatches;
  }
  
  // Category matches
  const categoryMatches = knowledgeBase.filter(entry =>
    entry.category.toLowerCase().includes(lowerQuery) ||
    lowerQuery.includes(entry.category.toLowerCase())
  );
  
  return categoryMatches.length > 0 ? categoryMatches : [];
}

// Generate a helpful response
export function generateResponse(query: string, language: "english" | "french" = "english"): string {
  const matches = findAnswer(query, language);
  
  if (matches.length === 0) {
    if (language === "french") {
      return "Je suis là pour vous aider avec TaskZing! Je peux répondre aux questions sur: publier/trouver des emplois, utiliser les filtres, gérer votre profil, méthodes de paiement, paramètres de langue, mode sombre, messagerie, propositions, vitrine, éléments enregistrés, codes QR, dépannage, et plus encore. Pourriez-vous être plus précis sur ce que vous aimeriez savoir?";
    }
    return "I'm here to help with TaskZing! I can answer questions about: posting/finding jobs, using filters, managing your profile, payment methods, language settings, dark mode, messaging, proposals, showcase work, saved items, QR codes, troubleshooting, and more. Could you be more specific about what you'd like to know?";
  }
  
  // Return the most relevant answer in the correct language
  let primaryAnswer: string;
  if (language === "french" && matches[0].answerFr) {
    primaryAnswer = typeof matches[0].answerFr === "function" 
      ? matches[0].answerFr() 
      : matches[0].answerFr;
  } else {
    primaryAnswer = typeof matches[0].answer === "function" 
      ? matches[0].answer() 
      : matches[0].answer;
  }
  
  // Add related topics if available
  if (matches[0].relatedTopics && matches[0].relatedTopics.length > 0) {
    const related = matches[0].relatedTopics.join(", ");
    const relatedText = language === "french" 
      ? `\n\nSujets connexes qui pourraient vous être utiles: ${related}.`
      : `\n\nRelated topics you might find helpful: ${related}.`;
    return `${primaryAnswer}${relatedText}`;
  }
  
  return primaryAnswer;
}
