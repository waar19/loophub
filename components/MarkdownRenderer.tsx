"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import LinkPreview from "./LinkPreview";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
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
          // Customize paragraph
          p: ({ ...props }) => (
            <p className="mb-4 leading-relaxed" {...props} />
          ),
          // Customize links
          a: ({ href, children, ...props }) => {
            // Check if it's a standalone link (text matches href)
            const childText = Array.isArray(children)
              ? children.join("")
              : String(children);
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
          // Customize code blocks
          code: ({
            className,
            children,
            ...props
          }: React.HTMLAttributes<HTMLElement>) => {
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
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const language = match ? match[1] : "text";
            const codeString = String(children).replace(/\n$/, "");

            return (
              <div className="mb-4">
                <SyntaxHighlighter
                  language={language}
                  style={
                    vscDarkPlus as unknown as {
                      [key: string]: React.CSSProperties;
                    }
                  }
                  customStyle={{
                    margin: 0,
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                  }}
                  {...props}
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
                borderColor: "var(--border)",
                color: "var(--muted)",
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
