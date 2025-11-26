"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useTranslations } from "@/components/TranslationsProvider";
import MetaHead from "@/components/MetaHead";
import type { User } from "@supabase/supabase-js";

// Debounce utility
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useTranslations();
  const [username, setUsername] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  
  const debouncedUsername = useDebounce(username, 500);

  // Check if user is authenticated and needs onboarding
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Check if user already has a username
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (profile?.username) {
        // User already has username, redirect to home
        router.push("/");
      }
    }

    checkAuth();
  }, [router]);

  // Check username availability when user types
  useEffect(() => {
    if (!debouncedUsername || debouncedUsername.length < 3) {
      setIsAvailable(null);
      setError(null);
      return;
    }

    async function checkUsername() {
      setIsChecking(true);
      setError(null);

      try {
        const res = await fetch("/api/username/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: debouncedUsername }),
        });

        const data = await res.json();

        if (data.available) {
          setIsAvailable(true);
          setError(null);
        } else {
          setIsAvailable(false);
          setError(data.error || "Username is not available");
        }
      } catch (err) {
        console.error("Error checking username:", err);
        setError("Error checking username availability");
        setIsAvailable(false);
      } finally {
        setIsChecking(false);
      }
    }

    checkUsername();
  }, [debouncedUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !isAvailable) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/username/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Username set successfully, redirect to home
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Error setting username");
      }
    } catch (err) {
      console.error("Error setting username:", err);
      setError("Error setting username. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null; // Loading or redirecting
  }

  return (
    <>
      <MetaHead
        title="Welcome to LoopHub - Choose Your Username"
        description="Complete your profile by choosing a unique username"
      />
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="card" style={{ borderLeft: "4px solid var(--brand)" }}>
            {/* Header */}
            <div className="text-center mb-8">
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl mb-4"
                style={{ background: "var(--brand)", color: "white" }}
              >
                👋
              </div>
              <h1
                className="text-3xl font-extrabold mb-2"
                style={{
                  background: "linear-gradient(135deg, var(--foreground) 0%, var(--brand) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t("onboarding.welcome")}
              </h1>
              <p style={{ color: "var(--muted)" }}>
                {t("onboarding.chooseUsername")}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  {t("onboarding.username")} <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input w-full"
                  placeholder={t("onboarding.usernamePlaceholder")}
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]+"
                  required
                  autoFocus
                />
                
                {/* Validation feedback */}
                <div className="mt-2 min-h-[20px]">
                  {isChecking && (
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                      {t("onboarding.checking")}...
                    </p>
                  )}
                  {!isChecking && username.length >= 3 && isAvailable === true && (
                    <p className="text-sm flex items-center gap-1" style={{ color: "var(--success)" }}>
                      ✓ {t("onboarding.usernameAvailable")}
                    </p>
                  )}
                  {!isChecking && isAvailable === false && error && (
                    <p className="text-sm flex items-center gap-1" style={{ color: "var(--error)" }}>
                      ✗ {error}
                    </p>
                  )}
                  {username.length > 0 && username.length < 3 && (
                    <p className="text-sm" style={{ color: "var(--muted)" }}>
                      {t("onboarding.usernameMinLength")}
                    </p>
                  )}
                </div>
              </div>

              {/* Requirements */}
              <div className="p-3 rounded" style={{ background: "var(--accent-light)", border: "1px solid var(--border)" }}>
                <p className="text-sm font-medium mb-2" style={{ color: "var(--foreground)" }}>
                  {t("onboarding.requirements")}:
                </p>
                <ul className="text-sm space-y-1" style={{ color: "var(--muted)" }}>
                  <li className={username.length >= 3 && username.length <= 30 ? "text-green-600" : ""}>
                    • 3-30 {t("onboarding.characters")}
                  </li>
                  <li className={/^[a-zA-Z0-9_]*$/.test(username) && username.length > 0 ? "text-green-600" : ""}>
                    • {t("onboarding.onlyAlphanumeric")}
                  </li>
                  <li className={isAvailable === true ? "text-green-600" : ""}>
                    • {t("onboarding.mustBeUnique")}
                  </li>
                </ul>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={isSubmitting || isChecking || !isAvailable}
              >
                {isSubmitting ? t("onboarding.creating") : t("onboarding.continue")}
              </button>
            </form>

            {/* Info footer */}
            <div className="mt-6 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-sm text-center" style={{ color: "var(--muted)" }}>
                💡 {t("onboarding.cannotChange")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
