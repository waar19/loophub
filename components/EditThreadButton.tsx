"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import SimpleForm from "./SimpleForm";
import Tooltip from "./Tooltip";

interface EditThreadButtonProps {
  threadId: string;
  currentTitle: string;
  currentContent: string;
  onSuccess?: () => void;
}

export default function EditThreadButton({
  threadId,
  currentTitle,
  currentContent,
  onSuccess,
}: EditThreadButtonProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const handleEdit = async (formData: Record<string, string>) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/threads/${threadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al actualizar el hilo");
      }

      showSuccess("¡Hilo actualizado exitosamente!");
      setIsEditing(false);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar el hilo";
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="card mb-8" style={{
        borderLeft: "4px solid var(--brand)",
      }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
            Editar Hilo
          </h3>
          <button
            onClick={() => setIsEditing(false)}
            className="text-sm"
            style={{ color: "var(--muted)" }}
            disabled={isLoading}
          >
            Cancelar
          </button>
        </div>
        <SimpleForm
          fields={[
            {
              name: "title",
              label: "Título",
              type: "text",
              placeholder: "Título del hilo",
              required: true,
              maxLength: 200,
              defaultValue: currentTitle,
            },
            {
              name: "content",
              label: "Contenido",
              type: "markdown",
              placeholder: "Contenido del hilo...",
              required: true,
              maxLength: 10000,
              defaultValue: currentContent,
            },
          ]}
          onSubmit={handleEdit}
          submitText={isLoading ? "Guardando..." : "Guardar Cambios"}
        />
      </div>
    );
  }

  return (
    <Tooltip content="Editar hilo" position="top">
      <button
        onClick={() => setIsEditing(true)}
        className="text-xs transition-colors"
        style={{ color: "var(--muted)" }}
        onMouseEnter={(e) => e.currentTarget.style.color = "var(--brand)"}
        onMouseLeave={(e) => e.currentTarget.style.color = "var(--muted)"}
      >
        Editar
      </button>
    </Tooltip>
  );
}

