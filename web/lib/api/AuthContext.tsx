"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthChange, getUserData, signOut, AuthUser, UserData } from "./auth";
import { isPublicRoute } from "@/lib/auth/routeAccess";

interface AuthContextType {
  user: AuthUser | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
  /** Re-fetch profile from Firestore (e.g. after updating availability). */
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  logout: async () => {},
  refreshUserData: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);
  const previousRoleRef = useRef<string | null>(null);
  
  // Use router hooks - must be called unconditionally
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = onAuthChange(async (authUser) => {
        if (!isMounted) return;
        
        try {
          setUser(authUser);
          
          if (authUser) {
            // Fetch additional user data from backend
            try {
              const data = await getUserData(authUser.uid);
              if (isMounted) {
                setUserData(data);
              }
            } catch (error) {
              console.error("Error fetching user data:", error);
              if (isMounted) {
                setUserData(null);
              }
            }
          } else {
            if (isMounted) {
              setUserData(null);
            }
          }
        } catch (error) {
          console.error("Auth state change error:", error);
        } finally {
          if (isMounted) {
            setLoading(false);
            initializedRef.current = true;
          }
        }
      });
    } catch (error) {
      console.error("Error setting up auth listener:", error);
      if (isMounted) {
        setLoading(false);
        initializedRef.current = true;
      }
    }

    // Set a timeout to ensure loading doesn't get stuck
    const timeout = setTimeout(() => {
      if (isMounted && !initializedRef.current) {
        console.warn("Auth initialization timeout - setting loading to false");
        setLoading(false);
        initializedRef.current = true;
      }
    }, 2000); // 2 second timeout

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
      clearTimeout(timeout);
    };
  }, []);

  // Client fallback: Firebase says signed out (e.g. cookie lag, expired session)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loading) return;
    if (!pathname) return;
    if (isPublicRoute(pathname)) return;
    if (user) return;

    const q = window.location.search || "";
    router.replace(`/login?redirect=${encodeURIComponent(pathname + q)}`);
  }, [loading, user, pathname, router]);

  // Redirect to client-home when role switches to client
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === "undefined") return;
    if (loading || !user || !userData) return;
    if (!router) return; // Skip if router not available

    const currentRole = userData?.currentRole || userData?.role || "provider";
    const previousRole = previousRoleRef.current;

    // Check if role just switched to client (from provider or other role)
    if (currentRole === "client" && previousRole !== "client" && previousRole !== null) {
      // Always redirect to client-home when role switches to client
      // This ensures the first page after role switch is always the homepage
      router.push("/client-home");
    }

    // Update previous role
    previousRoleRef.current = currentRole;
  }, [user, userData, loading, pathname, router]);

  const refreshUserData = useCallback(async () => {
    const uid = user?.uid;
    if (!uid) return;
    try {
      const data = await getUserData(uid);
      setUserData(data);
    } catch (e) {
      console.error("refreshUserData:", e);
    }
  }, [user?.uid]);

  const logout = async () => {
    try {
      // Clear backend auth state
      await signOut();
      
      // Clear local state
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error("Logout error in AuthContext:", error);
      // Still clear local state even if backend signOut fails
      setUser(null);
      setUserData(null);
      throw error; // Re-throw to let the caller handle it
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, userData, loading, logout, refreshUserData }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
