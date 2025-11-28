"use client";

import type { CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import LinkPreview from "./LinkPreview";

const syntaxHighlighterTheme = vscDarkPlus as Record<string, CSSProperties>;

// Extended sanitize schema to allow details/summary for spoilers
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'details', 'summary'],
  attributes: {
    ...defaultSchema.attributes,
    details: ['open'],
    summary: [],
  },
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Process @mentions into links
function processMentions(content: string): string {
  // Match @username where username is 3-20 alphanumeric chars or underscores
  // Only match if @ is at start of string or after whitespace/newline
  return content.replace(
    /(^|[\s\n])@([a-zA-Z0-9_]{3,20})\b/g,
    '$1[@$2](/u/$2)'
  );
}

export default function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  // Pre-process content to convert @mentions to links
  const processedContent = processMentions(content);

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={{
          // Customize heading styles
          h1: ({ ...props }) => (
            <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-2xl font-bold mt-5 mb-3" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />
          ),
          h4: ({ ...props }) => (
            <h4 className="text-lg font-semibold mt-3 mb-2" {...props} />
          ),
          // Customize paragraph
          p: ({ ...props }) => (
            <p className="mb-4 leading-relaxed" {...props} />
          ),
          // Customize links
          a: ({ href, children, ...props }) => {
            // Check if it's a mention link
            const childText = Array.isArray(children)
              ? children.join("")
              : String(children);
            const isMention = href?.startsWith("/u/") && childText.startsWith("@");
            
            if (isMention) {
              return (
                <a
                  href={href}
                  className="font-medium hover:underline"
                  style={{ color: "var(--brand)" }}
                  {...props}
                >
                  {children}
                </a>
              );
            }
            
            // Check if it's a standalone link (text matches href)
            const isStandalone =
              href && (childText === href || childText === href + "/");

            if (isStandalone) {
              return <LinkPreview url={href} />;
            }

            return (
              <a
                href={href}
                className="hover:underline"
                style={{ color: "var(--accent)" }}
                target="_blank"
                rel="noopener noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
          // Customize lists
          ul: ({ ...props }) => (
            <ul className="list-disc list-inside mb-4 space-y-1" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol
              className="list-decimal list-inside mb-4 space-y-1"
              {...props}
            />
          ),
          // Task list items (GFM)
          li: ({ className, children, ...props }) => {
            // Check if this is a task list item
            const isTask = className?.includes('task-list-item');
            return (
              <li 
                className={isTask ? "list-none flex items-start gap-2" : ""} 
                {...props}
              >
                {children}
              </li>
            );
          },
          // Task list checkboxes
          input: ({ type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mt-1 rounded"
                  style={{ accentColor: "var(--brand)" }}
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },
          // Tables
          table: ({ ...props }) => (
            <div className="overflow-x-auto mb-4">
              <table 
                className="min-w-full border-collapse"
                style={{ borderColor: "var(--border)" }}
                {...props} 
              />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead style={{ background: "var(--card-bg)" }} {...props} />
          ),
          th: ({ ...props }) => (
            <th 
              className="px-4 py-2 text-left font-semibold border"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              {...props} 
            />
          ),
          td: ({ ...props }) => (
            <td 
              className="px-4 py-2 border"
              style={{ borderColor: "var(--border)" }}
              {...props} 
            />
          ),
          tr: ({ ...props }) => (
            <tr 
              className="hover:bg-[var(--border)]/20"
              {...props} 
            />
          ),
          // Spoiler/Details
          details: ({ ...props }) => (
            <details 
              className="mb-4 border rounded-lg overflow-hidden"
              style={{ borderColor: "var(--border)" }}
              {...props} 
            />
          ),
          summary: ({ ...props }) => (
            <summary 
              className="px-4 py-2 cursor-pointer font-medium select-none"
              style={{ background: "var(--card-bg)", color: "var(--foreground)" }}
              {...props} 
            />
          ),
          // Customize code blocks
          code: ({
            className,
            children,
            ...props
          }: React.HTMLAttributes<HTMLElement>) => {
            const { style: _ignoredStyle, ...rest } = props;
            // Drop upstream inline styles so we can enforce a consistent Prism theme.
            void _ignoredStyle;
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match;

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded text-sm font-mono"
                  style={{
                    background: "var(--border)",
                    color: "var(--foreground)",
                  }}
                  {...rest}
                >
                  {children}
                </code>
              );
            }

            const language = match ? match[1] : "text";
            const codeString = String(children).replace(/\n$/, "");

            return (
              <div className="mb-4 relative group">
                {/* Language badge */}
                <div 
                  className="absolute top-0 right-0 px-2 py-1 text-xs rounded-bl opacity-75"
                  style={{ background: "var(--border)", color: "var(--muted)" }}
                >
                  {language}
                </div>
                <SyntaxHighlighter
                  language={language}
                  style={syntaxHighlighterTheme}
                  customStyle={{
                    margin: 0,
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                  }}
                  {...rest}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            );
          },
          // Customize blockquotes
          blockquote: ({ ...props }) => (
            <blockquote
              className="border-l-4 pl-4 italic my-4"
              style={{
                borderColor: "var(--brand)",
                color: "var(--muted)",
                background: "var(--brand-light)",
                padding: "0.75rem 1rem",
                borderRadius: "0 0.5rem 0.5rem 0",
              }}
              {...props}
            />
          ),
          // Customize horizontal rule
          hr: ({ ...props }) => (
            <hr
              className="my-6"
              style={{ borderColor: "var(--border)" }}
              {...props}
            />
          ),
          // Images with better styling
          img: ({ src, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt || ""}
              className="max-w-full h-auto rounded-lg my-4"
              loading="lazy"
              {...props}
            />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
