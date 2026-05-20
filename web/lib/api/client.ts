/**
 * API Client for Backend Integration (same default base as Flutter `BackendConfig`).
 */

import { API_BASE_URL } from "./http";

const CLIENT_DEFAULT_BASE = API_BASE_URL;

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthResponse {
  token: string;
  accessToken?: string;
  user: UserData;
  refreshToken?: string;
}

export interface UserData {
  id: string;
  uid?: string;
  email: string;
  username?: string;
  fullName?: string;
  name?: string;
  role?: "client" | "provider" | "both" | "client+provider";
  currentRole?: "client" | "provider" | "both";
  profileCompleted?: boolean;
  providerProfileCompleted?: boolean;
  /** Flutter parity — true once user has completed provider onboarding (incl. Become-a-Provider). */
  hasBeenProvider?: boolean;
  /** Flutter parity — Flutter's name for `providerProfileCompleted`; written alongside it. */
  providerOnboardingCompleted?: boolean;
  onboardingStepsCompleted?: boolean;
  /** Backend onboarding progress (Flutter `BackendUserDto.onboardingStep`). */
  onboardingStep?: number;
  /** ISO — set when onboarding flow is finished on the server. */
  onboardingCompletedAt?: string;
  /** Flutter `ProfileOnboardingMeta` from `/auth/me`. */
  onboarding?: {
    profileComplete?: boolean;
    missingFields?: string[];
    lockedFields?: string[];
    editableFields?: string[];
  };
  isAvailableForWork?: boolean;
  /** Flutter provider dashboard availability key */
  availableFW?: boolean;
  location?: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  photos?: string[];
  totalRating?: number;
  totalReviews?: number;
  skills?: string[];
  bio?: string;
  about?: string;
  photoUrl?: string;
  profilePicture?: string;
  isVerified?: boolean;
  /** Flutter `BackendUserDto.totpEnabled` — account 2FA is active */
  totpEnabled?: boolean;
  /** Firestore / API: explicit online flag when using presence */
  isOnline?: boolean;
  /** ISO timestamp of last activity (used with PRESENCE_RECENT_MS when isOnline is absent) */
  lastSeen?: string;
  createdAt?: string;
  updatedAt?: string;
  /** ISO — last time username was changed (6‑month cooldown) */
  lastUsernameChangeDate?: string;
  /** ISO — full name can only be changed once */
  lastFullNameChangeDate?: string;
  /** Provider legal name change awaiting admin (see `updateUserProfile`) */
  pendingFullName?: string;
  pendingFullNameRequestedAt?: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = CLIENT_DEFAULT_BASE) {
    this.baseURL = baseURL;
  }

  /**
   * Get the stored auth token
   */
  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("auth_token");
  }

  /**
   * Store the auth token
   */
  private setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("auth_token", token);
  }

  /**
   * Remove the auth token
   */
  private removeToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("auth_token");
  }

  private normalizeRoleValue(
    value: unknown
  ): "client" | "provider" | "both" | "client+provider" | undefined {
    if (typeof value !== "string") return undefined;

    const normalized = value.trim().toLowerCase().replace(/\s+/g, "");

    if (normalized === "client" || normalized === "provider" || normalized === "both") {
      return normalized;
    }

    if (normalized === "client+provider" || normalized === "clientprovider") {
      return "client+provider";
    }

    return undefined;
  }

  private normalizeUserData(raw: any): UserData | null {
    if (!raw || typeof raw !== "object") return null;

    const user = raw.user && typeof raw.user === "object" ? raw.user : raw;
    const id = user.id || user.uid || user.userId;

    if (!id || !user.email) {
      return null;
    }

    return {
      ...user,
      id,
      uid: user.uid || id,
      fullName: user.fullName || user.name,
      name: user.name || user.fullName,
      role: this.normalizeRoleValue(user.role),
      currentRole: this.normalizeRoleValue(user.currentRole) as
        | "client"
        | "provider"
        | "both"
        | undefined,
      description: user.description || user.bio || user.about,
      bio: user.bio || user.about || user.description,
      about: user.about || user.bio || user.description,
      photoUrl: user.photoUrl || user.profilePicture,
      profilePicture: user.profilePicture || user.photoUrl,
    } as UserData;
  }

  private sanitizeUserUpdatePayload(data: Partial<UserData>): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    const assignIfDefined = (key: string, value: unknown) => {
      if (value !== undefined) {
        payload[key] = value;
      }
    };

    assignIfDefined("fullName", data.fullName || data.name);
    assignIfDefined("username", data.username);
    assignIfDefined("photoUrl", data.photoUrl || data.profilePicture);
    assignIfDefined("phoneNumber", data.phoneNumber);
    assignIfDefined("location", data.location);
    assignIfDefined("latitude", data.latitude);
    assignIfDefined("longitude", data.longitude);
    assignIfDefined("description", data.description || data.bio || data.about);
    assignIfDefined("photos", data.photos);
    assignIfDefined("role", data.role);
    assignIfDefined("currentRole", data.currentRole);
    assignIfDefined("isAvailableForWork", data.isAvailableForWork);
    assignIfDefined("availableFW", data.availableFW ?? data.isAvailableForWork);

    return payload;
  }

  private async normalizeAuthResponse(raw: any): Promise<ApiResponse<AuthResponse>> {
    const accessToken =
      raw?.accessToken || raw?.token || raw?.data?.accessToken || raw?.data?.token;
    const refreshToken = raw?.refreshToken || raw?.data?.refreshToken;

    if (!accessToken) {
      return { error: "Authentication token missing from response" };
    }

    this.setToken(accessToken);

    let user =
      this.normalizeUserData(raw?.user) ||
      this.normalizeUserData(raw?.data?.user) ||
      this.normalizeUserData(raw);

    if (!user) {
      const currentUserResponse = await this.getCurrentUser();
      if (currentUserResponse.error || !currentUserResponse.data) {
        return {
          error: currentUserResponse.error || "Authenticated user data missing from response",
        };
      }
      user = currentUserResponse.data;
    }

    return {
      data: {
        token: accessToken,
        accessToken,
        refreshToken,
        user,
      },
    };
  }

  /**
   * Make an API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const baseUrlCleaned = this.baseURL === '/' ? '' : this.baseURL;
      const fullUrl = `${baseUrlCleaned}${endpoint}`;
      
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      // Handle 204 No Content (like logout)
      if (response.status === 204) {
        return { data: {} as T };
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          error: data.message || data.error || `HTTP ${response.status}`,
        };
      }

      return { data };
    } catch (error: any) {
      return {
        error: error.message || "Network error occurred",
      };
    }
  }

  /**
   * Auth: Sign up
   */
  async signUp(
    email: string,
    password: string,
    fullName: string,
    role: "client" | "provider" | "client+provider" = "client"
  ): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    let normalized: ApiResponse<AuthResponse>;

    if (response.error || !response.data) {
      normalized = { error: response.error || "Sign up failed" };
    } else {
      normalized = await this.normalizeAuthResponse(response.data);

      if (!normalized.error && normalized.data?.user) {
        normalized.data.user = {
          ...normalized.data.user,
          fullName: normalized.data.user.fullName || fullName,
          name: normalized.data.user.name || fullName,
          role: normalized.data.user.role || role,
          currentRole: normalized.data.user.currentRole || (role === "provider" ? "provider" : "client"),
        };
      }
    }

    return normalized;
  }

  /**
   * Auth: Sign in
   */
  async signIn(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    let result: ApiResponse<AuthResponse>;

    if (response.error || !response.data) {
      result = { error: response.error || "Sign in failed" };
    } else {
      result = await this.normalizeAuthResponse(response.data);
    }

    return result;
  }

  /**
   * Auth: Sign in with Google
   */
  async signInWithGoogle(
    idToken: string,
    accessToken?: string
  ): Promise<ApiResponse<AuthResponse>> {
    const access = (accessToken || idToken).trim();
    const id = idToken.trim();
    const response = await this.request<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({
        idToken: id,
        accessToken: access,
        id_token: id,
        access_token: access,
      }),
    });

    if (response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  /**
   * Auth: Sign in with Apple
   */
  async signInWithApple(
    identityToken: string,
    authorizationCode: string,
    extras?: {
      user?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      rawNonce?: string;
    }
  ): Promise<ApiResponse<AuthResponse>> {
    const body: Record<string, unknown> = {
      identityToken,
      authorizationCode,
      identity_token: identityToken,
      authorization_code: authorizationCode,
    };
    if (extras?.user) body.user = extras.user;
    if (extras?.email) body.email = extras.email;
    if (extras?.firstName) {
      body.firstName = extras.firstName;
      body.first_name = extras.firstName;
    }
    if (extras?.lastName) {
      body.lastName = extras.lastName;
      body.last_name = extras.lastName;
    }
    if (extras?.rawNonce) {
      body.nonce = extras.rawNonce;
      body.rawNonce = extras.rawNonce;
      body.raw_nonce = extras.rawNonce;
    }

    const response = await this.request<AuthResponse>("/auth/apple", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  /**
   * Auth: Logout
   */
  async logout(): Promise<ApiResponse> {
    const response = await this.request("/auth/logout", {
      method: "POST",
    });

    this.removeToken();
    return response;
  }

  /**
   * Auth: Get current user
   */
  async getCurrentUser(): Promise<ApiResponse<UserData>> {
    const meResponse = await this.request<any>("/users/me");

    if (!meResponse.error && meResponse.data) {
      const normalizedUser = this.normalizeUserData(meResponse.data);
      if (normalizedUser) {
        return { data: normalizedUser };
      }
    }

    const authMeResponse = await this.request<any>("/auth/me");
    if (authMeResponse.error || !authMeResponse.data) {
      return { error: authMeResponse.error || meResponse.error || "Unable to fetch current user" };
    }

    const normalizedUser = this.normalizeUserData(authMeResponse.data);
    if (!normalizedUser) {
      return { error: "Unable to normalize current user" };
    }

    return { data: normalizedUser };
  }

  /**
   * Auth: Refresh token
   */
  async refreshToken(): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>("/auth/refresh", {
      method: "POST",
    });

    if (response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  /**
   * User: Get user data by ID
   */
  async getUserData(userId: string): Promise<ApiResponse<UserData>> {
    const currentUserResponse = await this.getCurrentUser();
    if (
      !currentUserResponse.error &&
      currentUserResponse.data &&
      (currentUserResponse.data.id === userId || currentUserResponse.data.uid === userId)
    ) {
      return currentUserResponse;
    }

    const response = await this.request<any>(`/users/${userId}`);
    if (response.error || !response.data) {
      return { error: response.error || "Unable to fetch user" };
    }

    const normalizedUser = this.normalizeUserData(response.data);
    if (!normalizedUser) {
      return { error: "Unable to normalize user data" };
    }

    return { data: normalizedUser };
  }

  /**
   * User: Update user profile
   */
  async updateUser(userId: string, data: Partial<UserData>): Promise<ApiResponse<UserData>> {
    const sanitizedData = this.sanitizeUserUpdatePayload(data);
    const response = await this.request<any>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(sanitizedData),
    });

    if (response.error || !response.data) {
      return { error: response.error || "Failed to update profile" };
    }

    const normalizedUser = this.normalizeUserData(response.data);
    if (!normalizedUser) {
      return { error: "Unable to normalize updated user data" };
    }

    return { data: normalizedUser };
  }

  /**
   * Password: Reset password request
   */
  async resetPassword(email: string): Promise<ApiResponse> {
    return this.request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Password: Change password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse> {
    return this.request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
  }

  /**
   * Auth: List active sessions
   */
  async getSessions(): Promise<ApiResponse<Array<{
    id: string;
    deviceName?: string;
    userAgent?: string;
    createdAt?: string;
    lastUsedAt?: string;
  }>>> {
    return this.request("/auth/sessions");
  }

  /**
   * Auth: Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<ApiResponse> {
    return this.request(`/auth/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  /**
   * Auth: Revoke all other sessions (keep current)
   */
  async revokeAllOtherSessions(): Promise<ApiResponse> {
    return this.request("/auth/sessions", {
      method: "DELETE",
    });
  }

  /**
   * Auth: Accept terms
   */
  async acceptTerms(): Promise<ApiResponse<UserData>> {
    const response = await this.request<any>("/auth/accept-terms", {
      method: "POST",
    });

    if (response.error || !response.data) {
      return { error: response.error || "Failed to accept terms" };
    }

    const normalizedUser = this.normalizeUserData(response.data);
    if (!normalizedUser) {
      return { error: "Unable to normalize user data after accepting terms" };
    }

    return { data: normalizedUser };
  }

  /**
   * User: Update onboarding step
   */
  async updateOnboarding(data: {
    step?: number;
    completed?: boolean;
  }): Promise<ApiResponse<UserData>> {
    const response = await this.request<any>("/users/me/onboarding", {
      method: "PATCH",
      body: JSON.stringify(data),
    });

    if (response.error || !response.data) {
      return { error: response.error || "Failed to update onboarding" };
    }

    const normalizedUser = this.normalizeUserData(response.data);
    if (!normalizedUser) {
      return { error: "Unable to normalize user data after updating onboarding" };
    }

    return { data: normalizedUser };
  }

  /**
   * Jobs: Get all jobs
   */
  async getJobs(): Promise<ApiResponse<Array<any>>> {
    return this.request("/jobs");
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
