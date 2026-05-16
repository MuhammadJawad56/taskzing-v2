/** UI chat message (persisted in component state). */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  /** Poster or other images returned by the agent */
  images?: string[];
  /** Inline actions (e.g. confirm GPS for local tools) */
  actions?: ChatMessageAction[];
}

/** Payload for POST /v1/chat */
export interface ApiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatAttachment {
  type: "audio" | "image";
  data: string;
  language?: string;
  question?: string;
}

export interface AgentContext {
  lat?: number | null;
  lng?: number | null;
  locale?: string | null;
  allow_web?: boolean;
  attachments?: ChatAttachment[];
  image_question?: string | null;
  /** Coordinates sent only after user confirms in the app */
  location_confirmed?: boolean;
  /** Device has GPS fix available but user may not have confirmed yet */
  device_location_available?: boolean;
  /** Agent should expand title-only job/showcase input into full descriptions */
  auto_expand_descriptions?: boolean;
  /** Agent should call generate_poster when user elaborates on their offer */
  auto_generate_poster_on_elaboration?: boolean;
}

export interface ChatMessageAction {
  type: "confirm_location" | "deny_location";
  label: string;
}

export interface ChatRequest {
  messages: ApiChatMessage[];
  context?: AgentContext | null;
}

export interface ToolCallRecord {
  name?: string | null;
  args?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
}

export interface ChatResponse {
  message: string;
  tool_calls?: ToolCallRecord[];
  media_trace?: Record<string, unknown>[];
  mode?: string;
  user_id?: string | null;
}

export interface PosterRequest {
  title: string;
  subtitle?: string;
  cta?: string;
  template_id?: string;
  /** Text-to-image prompt (supported by ChatZing poster engine when configured). */
  prompt?: string;
  image_prompt?: string;
}

export interface ToolInvokeResponse {
  ok?: boolean;
  result?: Record<string, unknown>;
  detail?: unknown;
}

export interface PosterResponse {
  image_base64: string;
  mime?: string;
  template_id: string;
  engine: string;
}

export interface TranscribeResponse {
  text: string;
  language?: string | null;
  duration?: number | null;
}

export interface VisionResponse {
  caption: string;
  answer: string;
  engine: string;
}
