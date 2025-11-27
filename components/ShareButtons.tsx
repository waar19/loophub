"use client";

import { useState } from "react";
import { getFullUrl } from "@/lib/url-helpers";

interface ShareButtonsProps {
  title: string;
  url: string;
  description?: string;
  className?: string;
}

export default function ShareButtons({
  title,
  url,
  description = "",
  className = "",
}: ShareButtonsProps) {
  // Compute the current URL directly during render
  // This is more efficient than useState + useEffect and avoids cascading renders
  const getCurrentUrl = () => {
    // If URL doesn't start with http, use the helper function
    if (!url.startsWith("http")) {
      const fullUrl = getFullUrl(url);

      // Check if we're in production but got a localhost URL
      if (typeof window !== "undefined") {
        const isLocalhost =
          fullUrl.includes("localhost") || fullUrl.includes("127.0.0.1");
        const isProduction =
          window.location.hostname !== "localhost" &&
          window.location.hostname !== "127.0.0.1" &&
          !window.location.hostname.startsWith("192.168.");

        if (isLocalhost && isProduction) {
          // We're in production but got localhost URL - use current origin
          return `${window.location.origin}${url}`;
        }
      }

      return fullUrl;
    }

    // Already a full URL, but verify it's not localhost in production
    if (typeof window !== "undefined") {
      const isLocalhost =
        url.includes("localhost") || url.includes("127.0.0.1");
      const isProduction =
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1" &&
        !window.location.hostname.startsWith("192.168.");

      if (isLocalhost && isProduction) {
        // Replace localhost with production URL
        return url.replace(/^https?:\/\/[^/]+/, window.location.origin);
      }
    }

    return url;
  };

  const currentUrl = getCurrentUrl();
  const [copied, setCopied] = useState(false);

  const shareText = description
    ? `${title} - ${description.substring(0, 100)}...`
    : title;

  const shareData = {
    title,
    text: shareText,
    url: currentUrl,
  };

  const handleShare = async (platform: string) => {
    const encodedUrl = encodeURIComponent(currentUrl);
    const encodedTitle = encodeURIComponent(title);
    const encodedText = encodeURIComponent(shareText);

    switch (platform) {
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
          "_blank",
          "noopener,noreferrer"
        );
        break;

      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          "_blank",
          "noopener,noreferrer"
        );
        break;

      case "linkedin":
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
          "_blank",
          "noopener,noreferrer"
        );
        break;

      case "whatsapp":
        window.open(
          `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
          "_blank",
          "noopener,noreferrer"
        );
        break;

      case "telegram":
        window.open(
          `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
          "_blank",
          "noopener,noreferrer"
        );
        break;

      case "reddit":
        window.open(
          `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
          "_blank",
          "noopener,noreferrer"
        );
        break;

      case "native":
        if (navigator.share) {
          navigator.share(shareData).catch(() => {
            // User cancelled or error
          });
        } else {
          // Fallback to copy
          handleCopy();
        }
        break;

      default:
        break;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const buttonClass =
    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-md";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="font-bold text-xs" style={{ color: "var(--muted)" }}>
        Compartir:
      </span>

      {/* Twitter */}
      <button
        onClick={() => handleShare("twitter")}
        className={buttonClass}
        style={{
          background: "var(--card-bg)",
          border: "2px solid var(--border)",
          color: "var(--foreground)",
        }}
        aria-label="Compartir en Twitter"
        title="Compartir en Twitter"
      >
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <span className="hidden sm:inline">Twitter</span>
      </button>

      {/* Facebook */}
      <button
        onClick={() => handleShare("facebook")}
        className={buttonClass}
        style={{
          background: "var(--card-bg)",
          border: "2px solid var(--border)",
          color: "var(--foreground)",
        }}
        aria-label="Compartir en Facebook"
        title="Compartir en Facebook"
      >
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
            clipRule="evenodd"
          />
        </svg>
        <span className="hidden sm:inline">Facebook</span>
      </button>

      {/* LinkedIn */}
      <button
        onClick={() => handleShare("linkedin")}
        className={buttonClass}
        style={{
          background: "var(--card-bg)",
          border: "2px solid var(--border)",
          color: "var(--foreground)",
        }}
        aria-label="Compartir en LinkedIn"
        title="Compartir en LinkedIn"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        <span className="hidden sm:inline">LinkedIn</span>
      </button>

      {/* WhatsApp */}
      <button
        onClick={() => handleShare("whatsapp")}
        className={buttonClass}
        style={{
          background: "var(--card-bg)",
          border: "2px solid var(--border)",
          color: "var(--foreground)",
        }}
        aria-label="Compartir en WhatsApp"
        title="Compartir en WhatsApp"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
        <span className="hidden sm:inline">WhatsApp</span>
      </button>

      {/* Telegram */}
      <button
        onClick={() => handleShare("telegram")}
        className={buttonClass}
        style={{
          background: "var(--card-bg)",
          border: "2px solid var(--border)",
          color: "var(--foreground)",
        }}
        aria-label="Compartir en Telegram"
        title="Compartir en Telegram"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.559z" />
        </svg>
        <span className="hidden sm:inline">Telegram</span>
      </button>

      {/* Reddit */}
      <button
        onClick={() => handleShare("reddit")}
        className={buttonClass}
        style={{
          background: "var(--card-bg)",
          border: "2px solid var(--border)",
          color: "var(--foreground)",
        }}
        aria-label="Compartir en Reddit"
        title="Compartir en Reddit"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-1.03a1.25 1.25 0 0 1-.635-.26l-.76-.722a1.25 1.25 0 0 1 1.7-1.838l.66.627a1.25 1.25 0 0 1 .182-.599l2.73-1.08a1.25 1.25 0 0 1 1.249.001zm-4.026 8.5a1.624 1.624 0 1 1-1.627 1.624 1.624 1.624 0 0 1 1.627-1.624zm-4.872 0a1.624 1.624 0 1 1-1.624 1.624 1.624 1.624 0 0 1 1.624-1.624zm4.872 0a1.624 1.624 0 1 1-1.627 1.624 1.624 1.624 0 0 1 1.627-1.624z" />
        </svg>
        <span className="hidden sm:inline">Reddit</span>
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopy}
        className={buttonClass}
        style={{
          background: copied ? "var(--brand)" : "var(--card-bg)",
          border: `2px solid ${copied ? "var(--brand)" : "var(--border)"}`,
          color: copied ? "white" : "var(--foreground)",
        }}
        aria-label="Copiar enlace"
        title="Copiar enlace"
      >
        {copied ? (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="hidden sm:inline">¡Copiado!</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span className="hidden sm:inline">Copiar</span>
          </>
        )}
      </button>

      {/* Native Share (mobile) */}
      {typeof navigator !== "undefined" &&
        typeof navigator.share !== "undefined" && (
          <button
            onClick={() => handleShare("native")}
            className={buttonClass}
            style={{
              background: "var(--card-bg)",
              border: "2px solid var(--border)",
              color: "var(--foreground)",
            }}
            aria-label="Compartir"
            title="Compartir"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342c-.399 0-.79-.04-1.17-.11l-1.17.11c-.399 0-.79-.04-1.17-.11m5.34 0c.399 0 .79.04 1.17.11l1.17-.11c.399 0 .79.04 1.17.11m-5.34 0c-.399 0-.79-.04-1.17-.11l-1.17.11c-.399 0-.79-.04-1.17-.11m5.34 0c.399 0 .79.04 1.17.11l1.17-.11c.399 0 .79.04 1.17.11m-5.34 0c-.399 0-.79-.04-1.17-.11l-1.17.11c-.399 0-.79-.04-1.17-.11m5.34 0c.399 0 .79.04 1.17.11l1.17-.11c.399 0 .79.04 1.17.11m-5.34 0c-.399 0-.79-.04-1.17-.11l-1.17.11c-.399 0-.79-.04-1.17-.11"
              />
            </svg>
            <span className="hidden sm:inline">Más</span>
          </button>
        )}
    </div>
  );
}
