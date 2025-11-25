"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function SignupPage() {
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
        throw new Error("El nombre de usuario debe tener al menos 3 caracteres");
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
    <div className="max-w-md mx-auto mt-16">
      <div className="card">
        <h1 className="text-3xl font-bold mb-6">Únete a LoopHub</h1>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium mb-2"
            >
              Username
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
              Email
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
              Contraseña
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
                borderColor: "rgba(239, 68, 68, 0.3)"
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
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </form>

        <p
          className="mt-6 text-center text-sm"
          style={{ color: "var(--muted)" }}
        >
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" style={{ color: "var(--accent)" }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
