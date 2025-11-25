"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useToast } from "@/contexts/ToastContext";

interface ReportButtonProps {
  contentType: "thread" | "comment";
  contentId: string;
}

export default function ReportButton({
  contentType,
  contentId,
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();
  const { showSuccess, showError } = useToast();

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("reports").insert({
        content_type: contentType,
        content_id: contentId,
        reason,
      });

      if (error) throw error;

      setSuccess(true);
      showSuccess("Reporte enviado correctamente. Gracias por tu contribución.");
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setReason("");
      }, 2000);
    } catch (error) {
      console.error("Error reporting:", error);
      showError("Error al enviar el reporte. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs transition-colors"
        style={{ color: "var(--muted)" }}
        onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
        onMouseLeave={(e) => e.currentTarget.style.color = "var(--muted)"}
      >
        Report
      </button>
    );
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div 
        className="rounded-lg p-6 max-w-sm w-full shadow-xl"
        style={{ 
          background: "var(--card-bg)",
          border: "1px solid var(--border)"
        }}
      >
        <h3 
          className="text-lg font-bold mb-4"
          style={{ color: "var(--foreground)" }}
        >
          Report Content
        </h3>

        {success ? (
          <div 
            className="text-center py-4"
            style={{ color: "#22c55e" }}
          >
            Report submitted successfully!
          </div>
        ) : (
          <form onSubmit={handleReport}>
            <div className="mb-4">
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--foreground)" }}
              >
                Reason
              </label>
              <textarea
                className="w-full border rounded p-2 text-sm"
                style={{
                  background: "var(--card-bg)",
                  color: "var(--foreground)",
                  borderColor: "var(--border)"
                }}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                placeholder="Why are you reporting this?"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-sm border rounded transition-colors"
                style={{
                  background: "var(--card-bg)",
                  color: "var(--foreground)",
                  borderColor: "var(--border)"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--border)"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--card-bg)"}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
