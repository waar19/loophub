"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { useTranslations } from "@/components/TranslationsProvider";
import { useToast } from "@/contexts/ToastContext";
import MetaHead from "@/components/MetaHead";

export default function LoginPage() {
  const { t } = useTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { showSuccess, showError } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if it's an email confirmation error
        if (
          error.message.includes("Email not confirmed") ||
          error.message.includes("email_not_confirmed")
        ) {
          setError(t("auth.emailNotConfirmed"));
        } else {
          throw error;
        }
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError("Por favor ingresa tu dirección de email primero");
      return;
    }

    setResendingEmail(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) throw error;

      setError(null);
      showSuccess(
        "¡Email de confirmación enviado! Por favor revisa tu bandeja de entrada."
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error al reenviar el email de confirmación";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setResendingEmail(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "OAuth failed");
    }
  };

  return (
    <>
      <MetaHead title={t("auth.login")} description="Login page for Loophub" />
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div
              className="mx-auto flex items-center justify-center h-12 w-12 rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%)",
                color: "var(--on-brand)",
              }}
            >
              🔐
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
              {t("auth.login")}
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
              />
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
                <div className="mb-2">{error}</div>
                {(error.includes("Email not confirmed") ||
                  error.includes("email_not_confirmed")) && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendingEmail}
                    className="text-sm underline hover:no-underline"
                    style={{ color: "#ef4444" }}
                  >
                    {resendingEmail
                      ? t("common.loading")
                      : t("auth.resendConfirmation")}
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? t("common.loading") : t("auth.login")}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div
                  className="w-full border-t"
                  style={{ borderColor: "var(--border)" }}
                />
              </div>
              <div className="relative flex justify-center text-sm">
                <span
                  className="px-2"
                  style={{
                    background: "var(--card-bg)",
                    color: "var(--muted)",
                  }}
                >
                  {t("common.or")}
                </span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="btn w-full mt-4"
              style={{
                background: "var(--card-bg)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t("auth.loginWithGoogle")}
            </button>
          </div>

          <p
            className="mt-6 text-center text-sm"
            style={{ color: "var(--muted)" }}
          >
            {t("auth.noAccount")}{" "}
            <Link href="/signup" style={{ color: "var(--accent)" }}>
              {t("auth.register")}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
