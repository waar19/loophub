"use client";

import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxLength?: number;
  required?: boolean;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your content in Markdown...",
  minHeight = "200px",
  maxLength,
  required = false,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview" | "split">("edit");

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`px-3 py-1 text-sm rounded ${
              mode === "edit"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`px-3 py-1 text-sm rounded ${
              mode === "preview"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setMode("split")}
            className={`px-3 py-1 text-sm rounded ${
              mode === "split"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            Split
          </button>
        </div>
        {maxLength && (
          <span
            className="text-xs"
            style={{ color: "var(--muted)" }}
          >
            {value.length} / {maxLength}
          </span>
        )}
      </div>

      {/* Editor/Preview */}
      <div className="flex gap-4" style={{ minHeight }}>
        {(mode === "edit" || mode === "split") && (
          <div className="flex-1">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              required={required}
              maxLength={maxLength}
              className="textarea w-full font-mono text-sm"
              style={{ minHeight }}
            />
            <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
              <p>Markdown supported. Use **bold**, *italic*, `code`, etc.</p>
            </div>
          </div>
        )}
        {(mode === "preview" || mode === "split") && (
          <div className="flex-1">
            <div
              className="card"
              style={{ minHeight, maxHeight: "600px", overflowY: "auto" }}
            >
              {value ? (
                <MarkdownRenderer content={value} />
              ) : (
                <p style={{ color: "var(--muted)" }} className="italic">
                  Preview will appear here...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

