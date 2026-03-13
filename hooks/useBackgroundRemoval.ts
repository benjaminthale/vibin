'use client';

import { useCallback } from 'react';

/**
 * Runs background removal in the main thread using @imgly/background-removal.
 * We use dynamic import to load the heavy library lazily.
 * NOTE: @imgly/background-removal manages its own WASM worker internally.
 */
export function useBackgroundRemoval() {
  const removeBackground = useCallback(async (blob: Blob): Promise<Blob> => {
    const { removeBackground: removeBg } = await import('@imgly/background-removal');
    const result = await removeBg(blob);
    return result;
  }, []);

  return { removeBackground };
}
