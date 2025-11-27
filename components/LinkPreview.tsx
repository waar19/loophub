"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface LinkPreviewProps {
  url: string;
}

interface PreviewData {
  title: string;
  description: string;
  image: string;
  url: string;
  siteName: string;
}

export default function LinkPreview({ url }: LinkPreviewProps) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error("Failed to fetch preview");
        const previewData = await res.json();

        if (
          !previewData.title &&
          !previewData.description &&
          !previewData.image
        ) {
          // If no meaningful data, treat as error to show fallback
          throw new Error("No preview data found");
        }

        setData(previewData);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (loading) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block my-2 no-underline"
      >
        <div className="card p-3 animate-pulse flex gap-3 h-24">
          <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </a>
    );
  }

  if (error || !data) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand hover:underline break-all"
      >
        {url}
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block my-4 no-underline group"
    >
      <div className="card overflow-hidden hover:border-brand transition-colors p-0 flex flex-col sm:flex-row max-w-2xl">
        {data.image && (
          <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-gray-100 dark:bg-gray-800">
            <Image
              src={data.image}
              alt={data.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="p-4 flex flex-col justify-center min-w-0">
          <div className="text-xs text-muted mb-1 uppercase tracking-wider font-semibold">
            {data.siteName}
          </div>
          <h3 className="font-bold text-foreground text-lg leading-tight mb-2 group-hover:text-brand transition-colors line-clamp-2">
            {data.title}
          </h3>
          {data.description && (
            <p className="text-sm text-muted line-clamp-2">
              {data.description}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}
