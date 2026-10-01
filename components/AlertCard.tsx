/**
 * AlertCard — the Figma alert (3190:5985): a tinted card with a 2px
 * border, a label pill (icon + Warning / Caution / Info) and a short
 * bold message.
 *
 *   warning — red, for things to avoid (an allergy, a poor fit)
 *   caution — orange, worth a second look
 *   info    — teal, neutral notes
 */
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '@/constants/theme';
import WarningIcon from '@/assets/icons/alert/warning.svg';
import CautionIcon from '@/assets/icons/alert/caution.svg';
import InfoIcon from '@/assets/icons/alert/info.svg';

export type AlertTone = 'warning' | 'caution' | 'info';

const TONES = {
  warning: { label: 'Warning', colour: Colors.status.negative, tint: 'rgba(255,63,66,0.1)', Icon: WarningIcon, w: 16, h: 14 },
  caution: { label: 'Caution', colour: '#ff8736', tint: 'rgba(255,165,105,0.1)', Icon: CautionIcon, w: 16, h: 14 },
  info: { label: 'Info', colour: Colors.secondary, tint: 'rgba(59,149,134,0.1)', Icon: InfoIcon, w: 14, h: 14 },
} as const;

export function AlertCard({ tone, message, label }: { tone: AlertTone; message: string; label?: string }) {
  const t = TONES[tone];
  return (
    <View
      style={[styles.card, { backgroundColor: t.tint, borderColor: t.colour }]}
      accessibilityRole="alert"
      accessibilityLabel={`${label ?? t.label}. ${message}`}
    >
      <View style={[styles.pill, { backgroundColor: t.colour }]}>
        <t.Icon width={t.w} height={t.h} />
        <Text style={styles.pillText}>{label ?? t.label}</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: Radius.l,
    padding: 16,
    gap: 8,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 25,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
  },
  message: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
  },
});
