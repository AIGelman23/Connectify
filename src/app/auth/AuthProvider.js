"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Function to check if current route should skip auth redirect
  const shouldSkipAuthRedirect = () => {
    // FIRST: Always check pathname
    if (pathname?.includes("/auth/reset-password")) {
      console.log("AuthProvider: Detected reset password page via pathname");
      return true;
    }

    // SECOND: Check all possible flags
    if (typeof window !== "undefined") {
      const flags = [
        sessionStorage.getItem("reset_password_in_progress") === "true",
        sessionStorage.getItem("skip_auth_redirect") === "true",
        sessionStorage.getItem("emergency_reset_bypass") === "true",
        localStorage.getItem("password_reset_active") === "true",
        localStorage.getItem("emergency_reset_bypass") === "true",
        window.passwordResetActive === true,
        window.RESET_PASSWORD_BYPASS === true,
      ];

      if (flags.some((flag) => flag)) {
        console.log("AuthProvider: Bypass flags detected");
        return true;
      }
    }

    return false;
  };

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        // Skip auth check if on reset password page
        if (shouldSkipAuthRedirect()) {
          console.log(
            "AuthProvider: Skipping auth check for reset password page"
          );
          setLoading(false);
          return;
        }

        // Your existing auth check logic here
        // For example, check session/token
        // const response = await fetch('/api/auth/session');
        // const data = await response.json();
        // setUser(data.user);

        setLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname]);

  // Don't redirect if on reset password page or if bypass flags are set
  useEffect(() => {
    if (loading) return;

    // CRITICAL: Check FIRST before any redirect logic
    if (shouldSkipAuthRedirect()) {
      console.log(
        "AuthProvider: Skipping redirect - reset password page detected"
      );
      return; // STOP HERE - don't execute any redirect logic
    }

    // Only check for redirects if NOT on reset password page
    if (!user) {
      // Only redirect to login if not on a public page
      const publicPaths = [
        "/auth/login",
        "/auth/signup",
        "/auth/forgot-password",
      ];
      if (!publicPaths.some((path) => pathname?.startsWith(path))) {
        console.log("AuthProvider: Redirecting to login from", pathname);
        router.push("/auth/login");
      }
    }
  }, [user, loading, pathname, router]);

  const value = {
    user,
    setUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
