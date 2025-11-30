'use client';

import { useEffect } from 'react';
import { initErrorTracking } from '@/lib/error-tracking';

/**
 * Client component to initialize error tracking
 */
export function ErrorTrackingInit() {
  useEffect(() => {
    initErrorTracking();
  }, []);

  return null;
}
