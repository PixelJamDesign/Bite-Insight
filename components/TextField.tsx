/**
 * TextField — the canonical app-wide text input (Figma 18:615).
 *
 * One source of truth for input styling so every screen matches. Supports:
 *   - label (field title)
 *   - leading icon
 *   - "Required" hint (shown on the right while empty)
 *   - clear ✕ (shown while filled)
 *   - focused state (3px #00776f border) and error state (2px #ff3f42)
 *   - a supporting link under the field (e.g. "Forgotten password?")
 *   - an error box (red chip + message)
 *   - a password-criteria list (✓ met / ✗ unmet)
 *
 * Migrate ad-hoc TextInputs to this over time.
 */
import { forwardRef, useState, type ReactNode, type ComponentProps } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export interface PasswordRule {
  /** Plain lead-in, e.g. "At least " */
  prefix: string;
  /** Bold portion, e.g. "one letter" */
  bold: string;
  /** Whether the rule is currently satisfied. */
  met: boolean;
}

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Leading icon — an Ionicons name, or a custom node. */
  icon?: IoniconName;
  iconNode?: ReactNode;
  /** Show the "Required" hint on the right while the field is empty. */
  required?: boolean;
  /** Show a clear ✕ while the field has a value. */
  clearable?: boolean;
  /** Custom clear handler — runs instead of onChangeText('') when the ✕ is
   *  tapped (for search fields that also reset results, etc.). */
  onClear?: () => void;
  /** Error message — turns the border red and shows the error box. */
  error?: string | null;
  /** Small link/help under the field (right-aligned). */
  supportingText?: string;
  onSupportingPress?: () => void;
  /** Password-criteria checklist rendered under the field. */
  rules?: PasswordRule[];
  /** Password field — renders an eye toggle (instead of the clear ✕) and
   *  masks the value by default. */
  secureToggle?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({
  label,
  value,
  onChangeText,
  icon,
  iconNode,
  required,
  clearable = true,
  onClear,
  error,
  supportingText,
  onSupportingPress,
  rules,
  secureToggle,
  ...inputProps
}: TextFieldProps, ref) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hasError = !!error;
  const showRequired = required && value.length === 0;
  const showClear = !secureToggle && clearable && value.length > 0;

  const boxStyle = [
    styles.box,
    hasError ? styles.boxError : focused ? styles.boxFocused : styles.boxDefault,
  ];

  return (
    <View style={styles.root}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={boxStyle}>
        {iconNode ?? (icon ? <Ionicons name={icon} size={22} color={Colors.primary} /> : null)}

        <TextInput
          ref={ref}
          style={[styles.input, value.length === 0 && styles.inputEmpty]}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={`${Colors.primary}80`}
          {...inputProps}
          secureTextEntry={secureToggle ? !revealed : inputProps.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
        />

        {showRequired && <Text style={styles.required}>Required</Text>}
        {showClear && (
          <TouchableOpacity
            onPress={() => (onClear ? onClear() : onChangeText(''))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Clear"
          >
            <Ionicons name="close" size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {secureToggle && (
          <TouchableOpacity
            onPress={() => setRevealed((r) => !r)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {supportingText ? (
        <Text style={styles.supporting} onPress={onSupportingPress} suppressHighlighting>
          {supportingText}
        </Text>
      ) : null}

      {hasError ? (
        <View style={styles.errorBox}>
          <View style={styles.errorChip}>
            <Ionicons name="warning" size={13} color="#fff" />
            <Text style={styles.errorChipText}>Error</Text>
          </View>
          <Text style={styles.errorMsg}>{error}</Text>
        </View>
      ) : null}

      {rules && rules.length > 0 ? (
        <View style={styles.rules}>
          {rules.map((r, i) => (
            <View key={i} style={styles.ruleRow}>
              <Ionicons
                name={r.met ? 'checkmark' : 'close'}
                size={18}
                color={r.met ? Colors.status.positive : Colors.status.negative}
              />
              <Text style={[styles.ruleText, { color: r.met ? Colors.secondary : Colors.status.negative }]}>
                {r.prefix}
                <Text style={styles.ruleBold}>{r.bold}</Text>
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { gap: 8, width: '100%' },
  label: {
    fontSize: 16,
    lineHeight: 18,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface.secondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    // Vertical padding tuned so the 1/2/3px borders don't shift height.
    minHeight: 56,
    overflow: 'hidden',
  },
  // The box footprint is pinned (width 100% + minHeight 56), so the outer size
  // never changes. RN uses border-box sizing, so a thicker border would eat
  // inward and shove the icon/text in. We cancel that by shrinking the
  // horizontal padding by the same amount the border grows (border + padding
  // = 17px on each side in every state), so the content never shifts.
  boxDefault: { borderWidth: 1, borderColor: '#aad4cd', paddingHorizontal: 16 },
  boxFocused: { borderWidth: 3, borderColor: Colors.secondary, paddingHorizontal: 14 },
  boxError: { borderWidth: 2, borderColor: Colors.status.negative, paddingHorizontal: 15 },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
    paddingVertical: 0,
  },
  // Empty field → light font so the placeholder reads as a placeholder.
  // Typed text uses the bold style above.
  inputEmpty: {
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
  },
  required: {
    fontSize: 13,
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
  },
  supporting: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    textAlign: 'right',
    width: '100%',
  },
  // ── Error box ──
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(255,63,66,0.1)',
    borderWidth: 2,
    borderColor: Colors.status.negative,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  errorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.status.negative,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  errorChipText: {
    fontSize: 14,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
  },
  errorMsg: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
  },
  // ── Password criteria ──
  rules: { width: '100%' },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  ruleText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Figtree_300Light',
    letterSpacing: -0.14,
  },
  ruleBold: { fontFamily: 'Figtree_700Bold' },
});
