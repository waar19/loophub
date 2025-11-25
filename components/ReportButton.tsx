"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

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
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setReason("");
      }, 2000);
    } catch (error) {
      console.error("Error reporting:", error);
      alert("Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
      >
        Report
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-lg font-bold mb-4">Report Content</h3>

        {success ? (
          <div className="text-green-600 text-center py-4">
            Report submitted successfully!
          </div>
        ) : (
          <form onSubmit={handleReport}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Reason</label>
              <textarea
                className="w-full border rounded p-2 text-sm"
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
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
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
