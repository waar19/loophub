"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface InfiniteScrollProps {
  children: ReactNode;
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  loader?: ReactNode;
  endMessage?: ReactNode;
}

export default function InfiniteScroll({
  children,
  hasMore,
  isLoading,
  onLoadMore,
  loader,
  endMessage,
}: InfiniteScrollProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <>
      {children}
      {isLoading && loader}
      {!hasMore && !isLoading && endMessage && (
        <div className="text-center py-8">
          {endMessage}
        </div>
      )}
      <div ref={observerTarget} className="h-4" />
    </>
  );
}

