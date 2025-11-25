"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
import Tooltip from "./Tooltip";

interface DeleteCommentButtonProps {
  commentId: string;
  onSuccess?: () => void;
}

export default function DeleteCommentButton({
  commentId,
  onSuccess,
}: DeleteCommentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar este comentario?")) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al eliminar el comentario");
      }

      showSuccess("¡Comentario eliminado exitosamente!");
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar el comentario";
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tooltip content="Eliminar comentario" position="top" disabled={isLoading}>
      <button
        onClick={handleDelete}
        disabled={isLoading}
        className="text-xs font-medium disabled:opacity-50 transition-colors"
        style={{ color: "#ef4444" }}
        onMouseEnter={(e) => !isLoading && (e.currentTarget.style.color = "#dc2626")}
        onMouseLeave={(e) => !isLoading && (e.currentTarget.style.color = "#ef4444")}
      >
        {isLoading ? "Eliminando..." : "Eliminar"}
      </button>
    </Tooltip>
  );
}

