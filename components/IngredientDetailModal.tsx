import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '@/constants/theme';
import { MenuFlaggedIcon, TickIcon } from './MenuIcons';
import { getIngredientImageUrl } from '@/lib/supabase';
import type { Ingredient, UserIngredientPreference } from '@/lib/types';

interface Props {
  ingredient: Ingredient | null;
  preference?: UserIngredientPreference['preference'];
  onClose: () => void;
  onLike: () => void;
  onDislike: () => void;
  onFlag: () => void;
  showFlag?: boolean;
}

export function IngredientDetailModal({
  ingredient,
  preference,
  onClose,
  onLike,
  onDislike,
  onFlag,
  showFlag = false,
}: Props) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const hasShownRef = useRef(false);
  // Keep a snapshot of the last ingredient so the card stays rendered
  // during the exit animation after ingredient becomes null.
  const lastIngredientRef = useRef<Ingredient | null>(null);
  if (ingredient) lastIngredientRef.current = ingredient;
  const displayIngredient = ingredient ?? lastIngredientRef.current;

  useEffect(() => {
    if (ingredient) {
      hasShownRef.current = true;
      setMounted(true);
      translateY.setValue(-80);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (hasShownRef.current) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -40,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [ingredient]);

  if (!mounted || !displayIngredient) return null;

  const imageUrl = displayIngredient.image_url
    ? (getIngredientImageUrl(displayIngredient.image_url) ?? displayIngredient.image_url)
    : null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onClose}
        activeOpacity={1}
      />

      {/* Centered card */}
      <View style={styles.centeredWrapper} pointerEvents="box-none">
        <Animated.View
          style={[styles.cardStack, { opacity, transform: [{ translateY }] }]}
        >
          {/* Floating image — overlaps top of card */}
          {/* Outer view carries the shadow; inner view clips to circle */}
          <View style={styles.imageShadow}>
            <View style={styles.imageClip}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Text style={styles.imagePlaceholderText}>
                    {displayIngredient.name[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* White card body */}
          <View style={styles.card}>
            {/* Back arrow */}
            <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            </TouchableOpacity>

            {/* Name */}
            <View style={styles.nameSection}>
              <Text style={styles.doYouLike}>Do you like</Text>
              <Text style={styles.ingredientName}>{displayIngredient.name}?</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.dislikeBtn} onPress={onDislike} activeOpacity={0.85}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.likeBtn} onPress={onLike} activeOpacity={0.85}>
                <TickIcon size={16} color="#fff" strokeWidth={2} />
              </TouchableOpacity>
              {showFlag && (
                <TouchableOpacity style={styles.flagBtnWrap} onPress={onFlag} activeOpacity={0.8}>
                  <MenuFlaggedIcon
                    size={24}
                    color={preference === 'flagged' ? Colors.status.negative : Colors.secondary}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Did you know? */}
            {displayIngredient.fact && (
              <View style={styles.factBox}>
                <Text style={styles.factTitle}>Did you know?</Text>
                <Text style={styles.factText}>{displayIngredient.fact}</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(226, 241, 238, 0.88)',
  },
  centeredWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  cardStack: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  // ── Ingredient image ──
  imageShadow: {
    width: 160,
    height: 160,
    borderRadius: 80,
    zIndex: 2,
    marginBottom: -80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
  imageClip: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
  },
  image: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  imagePlaceholder: {
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 52,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  // ── Card ──
  card: {
    width: '100%',
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    paddingTop: 104,
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 24,
    ...Shadows.level3,
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Name ──
  nameSection: {
    width: '100%',
    alignItems: 'center',
    gap: 2,
  },
  doYouLike: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    lineHeight: 24,
  },
  ingredientName: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    lineHeight: 30,
    textAlign: 'center',
  },
  // ── Action buttons ──
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dislikeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff555a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18a68f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagBtnWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Did you know? ──
  factBox: {
    width: '100%',
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  factTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    lineHeight: 20,
  },
  factText: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    lineHeight: 24,
  },
});
