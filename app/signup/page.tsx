"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { useTranslations } from "@/components/TranslationsProvider";
import MetaHead from "@/components/MetaHead";

export default function SignupPage() {
  const { t } = useTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate username
      if (username.length < 3) {
        throw new Error(
          "El nombre de usuario debe tener al menos 3 caracteres"
        );
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error(
          "El nombre de usuario solo puede contener letras, números y guiones bajos"
        );
      }

      // Sign up with metadata
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (signUpError) throw signUpError;

      // Redirect to login with success message
      router.push("/login?message=Revisa tu email para confirmar tu cuenta");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <MetaHead
        title="Loophub - Sign Up"
        description="Create an account on Loophub"
      />
      <div className="max-w-md mx-auto mt-16 px-4">
        <div className="card p-6 sm:p-8" style={{ borderLeft: "4px solid var(--brand)" }}>
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
              style={{ background: "var(--brand)", color: "white" }}
            >
              ✨
            </div>
            <h1
              className="text-4xl font-extrabold"
              style={{
                background:
                  "linear-gradient(135deg, var(--foreground) 0%, var(--brand) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("auth.signup")}
            </h1>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium mb-2"
              >
                {t("auth.username")}
              </label>
              <input
                id="username"
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                placeholder="johndoe"
              />
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Solo letras, números y guiones bajos
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                {t("auth.email")}
              </label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
              >
                {t("auth.password")}
              </label>
              <input
                id="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                Mínimo 6 caracteres
              </p>
            </div>

            {error && (
              <div
                className="p-3 rounded border"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "#ef4444",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? t("common.loading") : t("auth.signup")}
            </button>
          </form>

          <p
            className="mt-6 text-center text-sm"
            style={{ color: "var(--muted)" }}
          >
            {t("auth.haveAccount")}{" "}
            <Link href="/login" style={{ color: "var(--accent)" }}>
              {t("auth.loginHere")}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
