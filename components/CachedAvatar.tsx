import { Image, Text, View, StyleSheet } from 'react-native';
import { useCachedAvatar } from '@/lib/useCachedAvatar';
import { getAvatarUrl } from '@/lib/supabase';

interface CachedAvatarProps {
  /** Raw avatar_url from the database (relative path or full URL). */
  avatarUrl: string | null | undefined;
  /** Fallback initials when no avatar exists. */
  initials: string;
  /** Size of the image — should match the parent container's content area. */
  size: number | '100%';
  /** Style for the initials text. */
  initialsStyle?: object;
}

/**
 * Displays an avatar image that is cached locally after the first download.
 * Falls back to initials text when no avatar URL is provided.
 */
export function CachedAvatar({ avatarUrl, initials, size, initialsStyle }: CachedAvatarProps) {
  const resolvedUrl = getAvatarUrl(avatarUrl);
  const cachedUri = useCachedAvatar(resolvedUrl);

  if (cachedUri) {
    return (
      <Image
        source={{ uri: cachedUri }}
        style={typeof size === 'number' ? { width: size, height: size } : styles.fill}
      />
    );
  }

  if (resolvedUrl) {
    // Still loading from cache — show initials as placeholder
    return <Text style={initialsStyle}>{initials}</Text>;
  }

  return <Text style={initialsStyle}>{initials}</Text>;
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
});
