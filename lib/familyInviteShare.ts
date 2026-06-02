/**
 * Single source of truth for the family-invite share-link message (the
 * text pre-filled into the native share sheet for WhatsApp / Messages /
 * etc.). Keep it short and human — it's one person texting another.
 */
export function familyInviteShareMessage(link: string): string {
  return `I've added you to my family on Bite Insight. Tap to link your account: ${link}`;
}
