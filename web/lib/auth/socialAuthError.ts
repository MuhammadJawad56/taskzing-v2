/** Lightweight error for social sign-in helpers (avoids circular imports with auth.ts). */
export class SocialAuthError extends Error {
  code: string;

  constructor(message: string, code: string = "auth/unknown") {
    super(message);
    this.name = "SocialAuthError";
    this.code = code;
  }
}
