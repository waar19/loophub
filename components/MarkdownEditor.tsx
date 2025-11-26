"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
// Lazy load MarkdownRenderer
const MarkdownRenderer = dynamic(() => import("./MarkdownRenderer"), {
  loading: () => <div className="skeleton h-40 w-full" />,
});

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
  minHeight = "120px",
  maxLength,
  required = false,
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview" | "split">("edit");

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`px-2 py-0.5 rounded transition-colors ${
              mode === "edit" ? "" : ""
            }`}
            style={{
              ...(mode === "edit"
                ? {
                    background: "var(--accent)",
                    color: "white",
                  }
                : {
                    background: "var(--card-bg)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                  }),
              fontSize: "0.6875rem",
            }}
            onMouseEnter={(e) => {
              if (mode !== "edit") {
                e.currentTarget.style.backgroundColor = "var(--border)";
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== "edit") {
                e.currentTarget.style.backgroundColor = "var(--card-bg)";
              }
            }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`px-2 py-0.5 rounded transition-colors ${
              mode === "preview" ? "" : ""
            }`}
            style={{
              ...(mode === "preview"
                ? {
                    background: "var(--accent)",
                    color: "white",
                  }
                : {
                    background: "var(--card-bg)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                  }),
              fontSize: "0.6875rem",
            }}
            onMouseEnter={(e) => {
              if (mode !== "preview") {
                e.currentTarget.style.backgroundColor = "var(--border)";
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== "preview") {
                e.currentTarget.style.backgroundColor = "var(--card-bg)";
              }
            }}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setMode("split")}
            className={`px-2 py-0.5 rounded transition-colors ${
              mode === "split" ? "" : ""
            }`}
            style={{
              ...(mode === "split"
                ? {
                    background: "var(--accent)",
                    color: "white",
                  }
                : {
                    background: "var(--card-bg)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                  }),
              fontSize: "0.6875rem",
            }}
            onMouseEnter={(e) => {
              if (mode !== "split") {
                e.currentTarget.style.backgroundColor = "var(--border)";
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== "split") {
                e.currentTarget.style.backgroundColor = "var(--card-bg)";
              }
            }}
          >
            Split
          </button>
        </div>
        {maxLength && (
          <span style={{ color: "var(--muted)", fontSize: "0.625rem" }}>
            {value.length} / {maxLength}
          </span>
        )}
      </div>

      {/* Editor/Preview */}
      <div className="flex gap-2" style={{ minHeight }}>
        {(mode === "edit" || mode === "split") && (
          <div className="flex-1">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              required={required}
              maxLength={maxLength}
              className="textarea w-full font-mono"
              style={{ minHeight, fontSize: "0.75rem" }}
            />
            <div className="mt-1" style={{ color: "var(--muted)", fontSize: "0.625rem" }}>
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
