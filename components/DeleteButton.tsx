"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Tooltip from "./Tooltip";

interface DeleteButtonProps {
  id: string;
  type: "thread" | "comment";
}

export default function DeleteButton({ id, type }: DeleteButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${type}/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      router.refresh();
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip
      content="Eliminar permanentemente"
      position="top"
      disabled={loading}
    >
      <button
        onClick={handleDelete}
        disabled={loading}
        aria-label="Eliminar elemento"
        className="text-xs font-medium disabled:opacity-50 transition-colors"
        style={{ color: "#ef4444" }}
        onMouseEnter={(e) =>
          !loading && (e.currentTarget.style.color = "#dc2626")
        }
        onMouseLeave={(e) =>
          !loading && (e.currentTarget.style.color = "#ef4444")
        }
      >
        {loading ? "Deleting..." : "Delete"}
      </button>
    </Tooltip>
  );
}
