/**
 * Single source of truth for the family-invite share content (what gets
 * handed to the native share sheet for WhatsApp / Messages / etc.). Keep the
 * copy short and human — it's one person texting another.
 */
import { Platform } from 'react-native';

/** Human lead-in shown above the link. No URL — that's added per-platform. */
const LEAD_IN = "I've added you to my family on Bite Insight. Tap to link your account:";

/** Full text incl. the link — used where only a message string is supported. */
export function familyInviteShareMessage(link: string): string {
  return `${LEAD_IN} ${link}`;
}

/**
 * Params for `Share.share()`. On iOS we pass the link as `url` so the share
 * sheet renders a rich link preview (with the Open Graph image) instead of a
 * plain-text item — the message stays the friendly lead-in so the link isn't
 * duplicated. On Android RN's Share ignores `url`, so the link has to live in
 * the message text.
 */
export function familyInviteShareContent(link: string): { message: string; url?: string } {
  if (Platform.OS === 'ios') {
    return { message: LEAD_IN, url: link };
  }
  return { message: familyInviteShareMessage(link) };
}
