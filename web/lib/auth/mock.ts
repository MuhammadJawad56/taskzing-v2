/**
 * Mock authentication utilities
 * Replace with real auth implementation later
 */

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role?: "client" | "provider";
}

// Mock session storage (in production, use cookies or proper session management)
let mockSession: AuthUser | null = null;

export function setMockSession(user: AuthUser | null) {
  mockSession = user;
}

export function getMockSession(): AuthUser | null {
  return mockSession;
}

export function clearMockSession() {
  mockSession = null;
}

// Mock login function
export async function mockLogin(email: string, password: string): Promise<AuthUser | null> {
  // In a real app, this would validate credentials
  // For mock, accept any email/password
  if (email && password) {
    const user: AuthUser = {
      id: "user-5", // Default to client user
      email,
      fullName: email.split("@")[0],
      role: "client",
    };
    setMockSession(user);
    return user;
  }
  return null;
}

// Mock signup function
export async function mockSignup(
  email: string,
  password: string,
  fullName: string,
  role: "client" | "provider"
): Promise<AuthUser | null> {
  if (email && password && fullName) {
    const user: AuthUser = {
      id: `user-${Date.now()}`,
      email,
      fullName,
      role,
    };
    setMockSession(user);
    return user;
  }
  return null;
}

