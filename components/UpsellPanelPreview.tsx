/**
 * UpsellPanelPreview — debug-only modal that renders <UpsellPanel /> in a
 * scrollable wrapper so you can inspect the new dashboard card without
 * leaving your current screen, and even when isPlus is true.
 *
 * Triggered from the debug menu → "Show Upsell Panel (preview)".
 */
import { useSyncExternalStore } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';
import { UpsellPanel } from './UpsellPanel';

// Tiny standalone store so the debug menu can toggle this without
// plumbing context through the app. Mirrors the pattern we used for
// the update-toast debug trigger.
let _visible = false;
const _listeners = new Set<() => void>();
function _notify() { for (const l of _listeners) l(); }
function _subscribe(l: () => void) {
  _listeners.add(l);
  return () => { _listeners.delete(l); };
}
function _getSnapshot() { return _visible; }
export function showUpsellPanelPreview() { _visible = true; _notify(); }
export function hideUpsellPanelPreview() { _visible = false; _notify(); }

export function UpsellPanelPreview() {
  const visible = useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={hideUpsellPanelPreview}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingTop: insets.top + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Upsell Panel preview</Text>
            <TouchableOpacity onPress={hideUpsellPanelPreview} hitSlop={10}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator
          >
            {/* forceShow bypasses the isPlus hide so Plus users can
                see the panel during QA. */}
            <UpsellPanel forceShow />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  sheet: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s,
    paddingBottom: Spacing.xs,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  closeText: {
    fontSize: 18,
    color: Colors.primary,
    fontFamily: 'Figtree_700Bold',
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: Spacing.s,
    paddingTop: Spacing.xs,
  },
});
