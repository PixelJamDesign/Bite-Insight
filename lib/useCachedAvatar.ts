import { useState, useEffect } from 'react';
import { getCachedAvatar } from './avatarCache';

/**
 * Hook that resolves a remote avatar URL to a locally cached URI.
 * Returns null while loading or if no URL is provided.
 * The image is downloaded once and served from disk on subsequent renders.
 */
export function useCachedAvatar(remoteUrl: string | null | undefined): string | null {
  const [localUri, setLocalUri] = useState<string | null>(null);

  useEffect(() => {
    if (!remoteUrl) {
      setLocalUri(null);
      return;
    }

    let cancelled = false;

    getCachedAvatar(remoteUrl).then((uri) => {
      if (!cancelled) setLocalUri(uri);
    }).catch(() => {
      // Fallback to remote URL if caching fails
      if (!cancelled) setLocalUri(remoteUrl);
    });

    return () => { cancelled = true; };
  }, [remoteUrl]);

  return localUri;
}
