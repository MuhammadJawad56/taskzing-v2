/**
 * Two-factor authentication — matches Flutter `BackendAuthRemoteDataSource` 2FA endpoints.
 */

import { AuthError } from "./auth";
import { apiFetchJson } from "./http";

export type TwoFaSetupData = {
  otpauthUrl: string;
  secret: string;
};

function mapTwoFaError(status: number, message: string, code?: string): AuthError {
  if (status === 401) {
    return new AuthError(message || "Unauthorized.", "auth/invalid-credential");
  }
  if (status === 400) {
    return new AuthError(message || "Invalid request.", "auth/invalid-credential");
  }
  return new AuthError(message, code || "auth/unknown");
}

function recordFromResponse(data: unknown): Record<string, unknown> {
  if (data && typeof data === "object") {
    const root = data as Record<string, unknown>;
    if (root.data && typeof root.data === "object") {
      return root.data as Record<string, unknown>;
    }
    return root;
  }
  return {};
}

/** POST /auth/2fa/setup */
export async function twoFaSetup(): Promise<TwoFaSetupData> {
  const res = await apiFetchJson<Record<string, unknown>>("/auth/2fa/setup", {
    method: "POST",
    auth: true,
  });
  if (!res.ok) {
    throw mapTwoFaError(res.status, res.message, res.code);
  }
  const data = recordFromResponse(res.data);
  const otpauthUrl = String(data.otpauthUrl ?? data.otpauth_url ?? "").trim();
  const secret = String(data.secret ?? "").trim();
  if (!otpauthUrl) {
    throw new AuthError("2FA setup response missing QR data.", "auth/unknown");
  }
  return { otpauthUrl, secret };
}

/** POST /auth/2fa/enable/request-code */
export async function requestTwoFaEnableCode(): Promise<void> {
  const res = await apiFetchJson<unknown>("/auth/2fa/enable/request-code", {
    method: "POST",
    auth: true,
  });
  if (!res.ok) {
    throw mapTwoFaError(res.status, res.message, res.code);
  }
}

/** POST /auth/2fa/enable — body `{ code }` */
export async function twoFaEnable(code: string): Promise<string[]> {
  const res = await apiFetchJson<Record<string, unknown>>("/auth/2fa/enable", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ code: code.trim() }),
  });
  if (!res.ok) {
    throw mapTwoFaError(res.status, res.message, res.code);
  }
  const data = recordFromResponse(res.data);
  const raw = data.backupCodes ?? data.backup_codes;
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => String(e));
}

/** POST /auth/2fa/disable/request-code */
export async function requestTwoFaDisableCode(): Promise<void> {
  const res = await apiFetchJson<unknown>("/auth/2fa/disable/request-code", {
    method: "POST",
    auth: true,
  });
  if (!res.ok) {
    throw mapTwoFaError(res.status, res.message, res.code);
  }
}

/** POST /auth/2fa/disable */
export async function twoFaDisable(params: {
  password: string;
  code?: string | null;
  backupCode?: string | null;
}): Promise<void> {
  const body: Record<string, string> = { password: params.password };
  const code = params.code?.trim();
  const backupCode = params.backupCode?.trim();
  if (code) body.code = code;
  if (backupCode) body.backupCode = backupCode;

  const res = await apiFetchJson<unknown>("/auth/2fa/disable", {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw mapTwoFaError(res.status, res.message, res.code);
  }
}
