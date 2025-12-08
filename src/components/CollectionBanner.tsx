import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import {LinearGradient} from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {getImageUrl} from '../services/tmdb';
import {Collection} from '../types/movie';

interface CollectionBannerProps {
  collection: Collection | null | undefined;
  onPress?: (collectionId: number) => void;
}

export const CollectionBanner: React.FC<CollectionBannerProps> = ({
  collection,
  onPress,
}) => {
  if (!collection) return null;

  const backdropUrl = collection.backdrop_path
    ? getImageUrl(collection.backdrop_path, 'w500')
    : collection.poster_path
    ? getImageUrl(collection.poster_path, 'w500')
    : null;

  if (!backdropUrl) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(collection.id)}
      activeOpacity={0.9}
      disabled={!onPress}>
      <ImageBackground
        source={{uri: backdropUrl}}
        style={styles.background}
        imageStyle={styles.backgroundImage}>
        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.8)']}
          style={styles.gradient}>
          <View style={styles.content}>
            <View style={styles.badge}>
              <Icon name="film" size={16} color={colors.accent} />
              <Text style={styles.badgeText}>Collection</Text>
            </View>
            <Text style={styles.title}>{collection.name}</Text>
            {onPress && (
              <View style={styles.actionButton}>
                <Text style={styles.actionText}>View All Movies</Text>
                <Icon name="arrow-forward" size={16} color={colors.accent} />
              </View>
            )}
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.content,
  },
  background: {
    width: '100%',
    height: 180,
  },
  backgroundImage: {
    borderRadius: borderRadius.lg,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    padding: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    marginBottom: spacing.sm,
  },
  badgeText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    ...typography.body2,
    color: colors.accent,
    fontWeight: '600',
  },
});
