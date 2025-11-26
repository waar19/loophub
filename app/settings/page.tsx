"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    website: "",
    location: "",
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    // Load current profile data
    const loadProfile = async () => {
      try {
        const res = await fetch(`/api/profile/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setFormData({
            username: data.username || "",
            bio: data.bio || "",
            website: data.website || "",
            location: data.location || "",
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        showToast("Error al cargar el perfil", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, router, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast("Perfil actualizado exitosamente", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Error al actualizar el perfil", "error");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Error al actualizar el perfil", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <div className="card">
          <div className="skeleton h-8 w-48 mb-6" />
          <div className="space-y-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-32 w-full" />
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <div className="card">
        <h1
          className="text-2xl font-bold mb-6"
          style={{ color: "var(--foreground)" }}
        >
          Configuración del Perfil
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username (Read-only) */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Nombre de usuario
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              disabled
              className="input w-full opacity-60 cursor-not-allowed"
              style={{
                background: "var(--card-background)",
                borderColor: "var(--border)",
                color: "var(--muted)",
              }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              El nombre de usuario no se puede cambiar
            </p>
          </div>

          {/* Bio */}
          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Biografía
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              maxLength={500}
              placeholder="Cuéntanos sobre ti..."
              className="input w-full"
              style={{
                background: "var(--card-background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {formData.bio.length}/500 caracteres
            </p>
          </div>

          {/* Website */}
          <div>
            <label
              htmlFor="website"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Sitio web
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://ejemplo.com"
              className="input w-full"
              style={{
                background: "var(--card-background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground)" }}
            >
              Ubicación
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Ciudad, País"
              maxLength={100}
              className="input w-full"
              style={{
                background: "var(--card-background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary flex-1"
              style={{
                background: isSaving ? "var(--muted)" : "var(--brand)",
                color: "white",
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="btn"
              style={{
                background: "var(--card-background)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            >
              Cancelar
            </button>
          </div>
        </form>

        {/* Additional Info */}
        <div
          className="mt-8 pt-6 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <h2
            className="text-lg font-semibold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            Información adicional
          </h2>
          <div className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
            <p>
              • Tu reputación (Karma) se gana automáticamente cuando otros
              usuarios dan me gusta a tus threads y comentarios.
            </p>
            <p>
              • Tu perfil público es visible en{" "}
              <code
                className="px-1 py-0.5 rounded text-xs"
                style={{
                  background: "var(--brand-light)",
                  color: "var(--brand-dark)",
                }}
              >
                /u/{formData.username}
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
