"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useImageUpload } from "@/hooks/useImageUpload";
import {
  MentionAutocomplete,
  useMentionAutocomplete,
} from "./MentionAutocomplete";
import Tooltip from "./Tooltip";

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
  showToolbar?: boolean;
}

// Formatting toolbar button component
function ToolbarButton({ 
  icon, 
  label, 
  onClick, 
  disabled = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void; 
  disabled?: boolean;
}) {
  return (
    <Tooltip content={label} position="top">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="p-1.5 rounded hover:bg-[var(--border)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ color: "var(--foreground)" }}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

// Toolbar divider
function ToolbarDivider() {
  return <div className="w-px h-5 mx-1" style={{ background: "var(--border)" }} />;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your content in Markdown...",
  minHeight = "120px",
  maxLength,
  required = false,
  showToolbar = true,
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

  // Insert text at cursor position
  const insertText = useCallback((text: string, cursorOffset = 0) => {
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
  }, [value, onChange]);

  // Wrap selected text with characters
  const wrapSelection = useCallback((before: string, after: string = before, placeholder = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToWrap = selectedText || placeholder;
    const newValue = value.substring(0, start) + before + textToWrap + after + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        // Keep selection
        textarea.setSelectionRange(start + before.length, start + before.length + textToWrap.length);
      } else {
        // Select placeholder
        textarea.setSelectionRange(start + before.length, start + before.length + placeholder.length);
      }
    }, 0);
  }, [value, onChange]);

  // Insert text at line start
  const insertAtLineStart = useCallback((prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  }, [value, onChange]);

  // Formatting actions
  const formatActions = {
    bold: () => wrapSelection("**", "**", "texto en negrita"),
    italic: () => wrapSelection("*", "*", "texto en cursiva"),
    strikethrough: () => wrapSelection("~~", "~~", "texto tachado"),
    code: () => wrapSelection("`", "`", "código"),
    codeBlock: () => wrapSelection("\n```\n", "\n```\n", "// código aquí"),
    link: () => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const selectedText = value.substring(textarea.selectionStart, textarea.selectionEnd);
      if (selectedText) {
        wrapSelection("[", "](url)", "");
      } else {
        insertText("[texto del enlace](url)", 1);
      }
    },
    image: () => insertText("![descripción](url)", 2),
    quote: () => insertAtLineStart("> "),
    bulletList: () => insertAtLineStart("- "),
    numberedList: () => insertAtLineStart("1. "),
    taskList: () => insertAtLineStart("- [ ] "),
    heading1: () => insertAtLineStart("# "),
    heading2: () => insertAtLineStart("## "),
    heading3: () => insertAtLineStart("### "),
    hr: () => insertText("\n---\n"),
    table: () => insertText("\n| Columna 1 | Columna 2 | Columna 3 |\n|---|---|---|\n| Celda | Celda | Celda |\n"),
    spoiler: () => wrapSelection("<details><summary>Spoiler</summary>\n\n", "\n\n</details>", "Contenido oculto"),
    mention: () => insertText("@", 1),
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!textareaRef.current || document.activeElement !== textareaRef.current) return;
      
      const isMod = e.ctrlKey || e.metaKey;
      
      if (isMod && e.key === 'b') {
        e.preventDefault();
        formatActions.bold();
      } else if (isMod && e.key === 'i') {
        e.preventDefault();
        formatActions.italic();
      } else if (isMod && e.key === 'k') {
        e.preventDefault();
        formatActions.link();
      } else if (isMod && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        formatActions.strikethrough();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [formatActions]);

  const handleImageUpload = async (file: File) => {
    const loadingPlaceholder = `![Uploading ${file.name}...]()`;
    insertText(loadingPlaceholder, 0);

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

  // File input for image upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      {/* Mode Toggle */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex gap-1">
          {(["edit", "preview", "split"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="px-2 py-0.5 rounded transition-colors"
              style={{
                ...(mode === m
                  ? { background: "var(--accent)", color: "white" }
                  : { background: "var(--card-bg)", color: "var(--foreground)", border: "1px solid var(--border)" }),
                fontSize: "0.6875rem",
              }}
            >
              {m === "edit" ? "Edit" : m === "preview" ? "Preview" : "Split"}
            </button>
          ))}
        </div>
        {maxLength && (
          <span style={{ color: "var(--muted)", fontSize: "0.625rem" }}>
            {value.length} / {maxLength}
          </span>
        )}
      </div>

      {/* Formatting Toolbar */}
      {showToolbar && (mode === "edit" || mode === "split") && (
        <div 
          className="flex flex-wrap items-center gap-0.5 p-1.5 mb-1 rounded border"
          style={{ background: "var(--card-bg)", borderColor: "var(--border)" }}
        >
          {/* Text Formatting */}
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 12h8m-4-4v8m6-10h2a2 2 0 012 2v12a2 2 0 01-2 2h-2" /></svg>}
            label="Negrita (Ctrl+B)"
            onClick={formatActions.bold}
          />
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
            label="Cursiva (Ctrl+I)"
            onClick={formatActions.italic}
          />
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>}
            label="Tachado (Ctrl+Shift+X)"
            onClick={formatActions.strikethrough}
          />
          
          <ToolbarDivider />
          
          {/* Headers */}
          <ToolbarButton 
            icon={<span className="font-bold text-xs">H1</span>}
            label="Título 1"
            onClick={formatActions.heading1}
          />
          <ToolbarButton 
            icon={<span className="font-bold text-xs">H2</span>}
            label="Título 2"
            onClick={formatActions.heading2}
          />
          <ToolbarButton 
            icon={<span className="font-bold text-xs">H3</span>}
            label="Título 3"
            onClick={formatActions.heading3}
          />
          
          <ToolbarDivider />
          
          {/* Lists */}
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /><circle cx="2" cy="6" r="1" fill="currentColor" /><circle cx="2" cy="12" r="1" fill="currentColor" /><circle cx="2" cy="18" r="1" fill="currentColor" /></svg>}
            label="Lista con viñetas"
            onClick={formatActions.bulletList}
          />
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>}
            label="Lista numerada"
            onClick={formatActions.numberedList}
          />
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
            label="Lista de tareas"
            onClick={formatActions.taskList}
          />
          
          <ToolbarDivider />
          
          {/* Links & Media */}
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
            label="Enlace (Ctrl+K)"
            onClick={formatActions.link}
          />
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            label="Imagen"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          />
          
          <ToolbarDivider />
          
          {/* Code */}
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
            label="Código inline"
            onClick={formatActions.code}
          />
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            label="Bloque de código"
            onClick={formatActions.codeBlock}
          />
          
          <ToolbarDivider />
          
          {/* Block Elements */}
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
            label="Cita"
            onClick={formatActions.quote}
          />
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
            label="Tabla"
            onClick={formatActions.table}
          />
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
            label="Spoiler"
            onClick={formatActions.spoiler}
          />
          <ToolbarButton 
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" /></svg>}
            label="Línea horizontal"
            onClick={formatActions.hr}
          />
          
          <ToolbarDivider />
          
          {/* Mention */}
          <ToolbarButton 
            icon={<span className="text-sm font-medium">@</span>}
            label="Mencionar usuario"
            onClick={formatActions.mention}
          />
          
          {/* Hidden file input for image upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* Editor/Preview */}
      <div className="flex gap-2" style={{ minHeight }}>
        {(mode === "edit" || mode === "split") && (
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                checkForMention(e.target.value, e.target.selectionStart);
              }}
              onKeyUp={(e) => {
                const textarea = e.currentTarget;
                checkForMention(textarea.value, textarea.selectionStart);
              }}
              onClick={(e) => {
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
                  ? { borderColor: "var(--brand)", background: "var(--brand-light)" }
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
