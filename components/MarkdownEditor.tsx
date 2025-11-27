"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useImageUpload } from "@/hooks/useImageUpload";
import {
  MentionAutocomplete,
  useMentionAutocomplete,
} from "./MentionAutocomplete";

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
  const [isDragging, setIsDragging] = useState(false);
  const { uploadImage, isUploading } = useImageUpload();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Mention autocomplete
  const {
    isOpen: isMentionOpen,
    query: mentionQuery,
    position: mentionPosition,
    checkForMention,
    insertMention,
    close: closeMention,
  } = useMentionAutocomplete(textareaRef);

  // Track latest value to avoid stale closures in async handlers
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const insertText = (text: string, cursorOffset = 0) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);

    onChange(newValue);

    // Restore cursor position after React render
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 0);
  };

  const handleImageUpload = async (file: File) => {
    const loadingPlaceholder = `![Uploading ${file.name}...]()`;
    insertText(loadingPlaceholder);

    const url = await uploadImage(file);

    if (url) {
      const finalMarkdown = `![${file.name}](${url})`;
      const currentValue = valueRef.current;
      onChange(currentValue.replace(loadingPlaceholder, finalMarkdown));
    } else {
      // Remove placeholder on error
      const currentValue = valueRef.current;
      onChange(currentValue.replace(loadingPlaceholder, ""));
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await handleImageUpload(file);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    for (const file of imageFiles) {
      await handleImageUpload(file);
    }
  };

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
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                // Check for mention trigger
                checkForMention(e.target.value, e.target.selectionStart);
              }}
              onKeyUp={(e) => {
                // Also check on cursor movement
                const textarea = e.currentTarget;
                checkForMention(textarea.value, textarea.selectionStart);
              }}
              onClick={(e) => {
                // Check when clicking inside textarea
                const textarea = e.currentTarget;
                checkForMention(textarea.value, textarea.selectionStart);
              }}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              placeholder={placeholder}
              required={required}
              maxLength={maxLength}
              className="textarea w-full font-mono"
              style={{
                minHeight,
                fontSize: "0.75rem",
                ...(isDragging
                  ? {
                      borderColor: "var(--brand)",
                      background: "var(--brand-light)",
                    }
                  : {}),
              }}
            />
            {/* Mention Autocomplete */}
            {isMentionOpen && (
              <MentionAutocomplete
                query={mentionQuery}
                position={mentionPosition}
                onSelect={(username) => insertMention(username, value, onChange)}
                onClose={closeMention}
              />
            )}
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none rounded">
                <div className="bg-white dark:bg-gray-800 p-2 rounded shadow text-sm font-bold text-brand">
                  Drop image to upload
                </div>
              </div>
            )}
            <div
              className="mt-1 flex justify-between items-center"
              style={{ color: "var(--muted)", fontSize: "0.625rem" }}
            >
              <p>Markdown supported. Drag & drop or paste images. Type @ to mention users.</p>
              {isUploading && (
                <span className="text-brand animate-pulse">Uploading...</span>
              )}
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
