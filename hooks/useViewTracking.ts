'use client';

import { useEffect, useRef } from 'react';

export function useViewTracking(threadId: string | null) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!threadId || tracked.current) return;

    // Track view after a short delay to ensure it's a real view
    const timer = setTimeout(async () => {
      try {
        await fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threadId }),
        });
        tracked.current = true;
      } catch (error) {
        console.error('Failed to track view:', error);
      }
    }, 2000); // Wait 2 seconds before counting as a view

    return () => clearTimeout(timer);
  }, [threadId]);
}
