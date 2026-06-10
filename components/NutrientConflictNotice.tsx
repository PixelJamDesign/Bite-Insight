/**
 * NutrientConflictNotice — the "Attention" card shown at the top of the
 * nutrient watchlist step when two of the profile's conditions pull a nutrient
 * in opposite directions (e.g. CF wants more salt, hypertension wants less).
 *
 * It lists each disputed nutrient with a line per condition, then explains that
 * we've left it neutral and to follow their care team. Pinned at the top so it
 * can't be missed. Design: Figma node 4549-9602 / 5463-15085.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeartPlusIcon } from '@/components/MenuIcons';
import { Radius } from '@/constants/theme';

const ORANGE = '#ff8736';

export interface ConflictNoticeSide {
  /** Display label for the condition / diet, e.g. "Cystic Fibrosis". */
  label: string;
  direction: 'limit' | 'boost';
  /** Lowercase nutrient word for the line, e.g. "salt". */
  nutrientLabel: string;
}

export interface ConflictNoticeItem {
  nutrientName: string;
  sides: ConflictNoticeSide[];
}

interface Props {
  items: ConflictNoticeItem[];
  /** Label of the neutral dropdown option, e.g. "Balance". */
  neutralLabel: string;
  /** Whose conditions — second person for self, third for a family member. */
  subject?: 'you' | 'they';
}

export function NutrientConflictNotice({ items, neutralLabel, subject = 'you' }: Props) {
  if (items.length === 0) return null;
  const titlePoss = subject === 'you' ? 'Your' : 'Their';
  const footerPoss = subject === 'you' ? 'your' : 'their';

  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <HeartPlusIcon size={15} color="#fff" />
        <Text style={styles.badgeText}>Attention</Text>
      </View>

      <Text style={styles.title}>{titlePoss} conditions currently don't agree on:</Text>

      {items.map((item, i) => (
        <View key={item.nutrientName} style={styles.itemBlock}>
          <View style={styles.divider} />
          <Text style={styles.nutrientName}>{item.nutrientName}</Text>
          {item.sides.map((side) => (
            <View key={`${side.label}-${side.direction}`} style={styles.bulletRow}>
              <View style={styles.marker}>
                <Ionicons
                  name={side.direction === 'boost' ? 'arrow-up' : 'arrow-down'}
                  size={11}
                  color="#fff"
                />
              </View>
              <Text style={styles.bulletText}>
                <Text style={styles.bulletLabel}>{side.label}:</Text> wants{' '}
                {side.direction === 'boost' ? 'more' : 'less'} {side.nutrientLabel}.
              </Text>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.divider} />
      <Text style={styles.footer}>
        We've left it set to '{neutralLabel}'. Only change it if {footerPoss} GP or healthcare
        provider has told you which way to go.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,135,54,0.1)',
    borderWidth: 2,
    borderColor: ORANGE,
    borderRadius: Radius.l,
    padding: 16,
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ff7824',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.26,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#023432',
    letterSpacing: -0.26,
    lineHeight: 16,
  },
  itemBlock: { gap: 4 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(185,74,0,0.25)',
  },
  nutrientName: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#023432',
    lineHeight: 20,
    marginTop: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  marker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: '#b94a00',
    letterSpacing: -0.14,
    lineHeight: 21,
  },
  bulletLabel: {
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
  },
  footer: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: '#023432',
    letterSpacing: -0.14,
    lineHeight: 21,
  },
});
