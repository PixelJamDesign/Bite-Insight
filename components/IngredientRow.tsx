import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { MenuFlaggedIcon } from './MenuIcons';
import { getIngredientImageUrl } from '@/lib/supabase';
import type { Ingredient, UserIngredientPreference } from '@/lib/types';

interface IngredientRowProps {
  ingredient: Ingredient;
  preference?: UserIngredientPreference['preference'];
  onLike: () => void;
  onDislike: () => void;
  onFlag: () => void;
  onTap?: () => void;
  showFlag?: boolean;
}

export function IngredientRow({
  ingredient,
  preference,
  onLike,
  onDislike,
  onFlag,
  onTap,
  showFlag = false,
}: IngredientRowProps) {
  return (
    <View style={styles.row}>
      {/* Image + Name (tappable to open detail modal) */}
      <TouchableOpacity
        style={styles.nameImageRow}
        onPress={onTap}
        activeOpacity={onTap ? 0.7 : 1}
        disabled={!onTap}
      >
        {/* Food image circle */}
        <View style={styles.imageContainer}>
          {ingredient.image_url ? (
            <Image source={{ uri: getIngredientImageUrl(ingredient.image_url) ?? ingredient.image_url }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderText}>
                {ingredient.name[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Name */}
        <Text style={styles.name} numberOfLines={1}>
          {ingredient.name}
        </Text>
      </TouchableOpacity>

      {/* Like / Dislike / Flag actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.dislikeBtn, preference === 'disliked' && styles.activeDislke]}
          onPress={onDislike}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={ 20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.likeBtn, preference === 'liked' && styles.activeLike]}
          onPress={onLike}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
        </TouchableOpacity>

        {showFlag && (
          <TouchableOpacity
            style={[styles.flagBtn, preference === 'flagged' && styles.activeFlag]}
            onPress={onFlag}
            activeOpacity={0.8}
          >
            <MenuFlaggedIcon
              size={18}
              color={preference === 'flagged' ? Colors.status.negative : Colors.secondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nameImageRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 27,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 999,
  },
  imagePlaceholder: {
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dislikeBtn: {
    backgroundColor: Colors.status.negative,
  },
  likeBtn: {
    backgroundColor: Colors.accent,
  },
  activeDislke: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  activeLike: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  flagBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFlag: {},
});
