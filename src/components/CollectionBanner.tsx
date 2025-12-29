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
import {useResponsive} from '../hooks/useResponsive';

interface CollectionBannerProps {
  collection: Collection | null | undefined;
  onPress?: (collectionId: number) => void;
  isCollected?: boolean;
  onToggleCollect?: () => void;
}

export const CollectionBanner: React.FC<CollectionBannerProps> = ({
  collection,
  onPress,
  isCollected = false,
  onToggleCollect,
}) => {
  const {isTablet} = useResponsive();

  if (!collection) return null;

  const backdropUrl = collection.backdrop_path
    ? getImageUrl(collection.backdrop_path, isTablet ? 'original' : 'w500')
    : collection.poster_path
    ? getImageUrl(collection.poster_path, isTablet ? 'original' : 'w500')
    : null;

  if (!backdropUrl) return null;

  const styles = StyleSheet.create({
    container: {
      marginBottom: 50,
      marginHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.header,
    },
    background: {
      width: '100%',
      height: isTablet ? 250 : 180,
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
    title: {
      ...typography.h2,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    actionButton: {
      backgroundColor: colors.modal.blur,
      paddingHorizontal: spacing.lg,
      paddingVertical: 13,
      borderRadius: 30,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.content,
      gap: spacing.xs,
    },
    actionText: {
      ...typography.body2,
      color: colors.accent,
      fontSize: 12,
      fontWeight: '600',
    },
    iconButton: {
      backgroundColor: colors.modal.blur,
      padding: 13,
      borderRadius: 30,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.content,
    },
  });

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
          colors={['transparent', colors.background.primary]}
          style={styles.gradient}>
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2}>
              {collection.name}
            </Text>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: spacing.sm,
              }}>
              {onPress && (
                <View style={styles.actionButton}>
                  <Text style={styles.actionText}>View Collection</Text>
                </View>
              )}
              {onToggleCollect && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={e => {
                    e.stopPropagation(); // Prevent triggering the banner onPress
                    onToggleCollect();
                  }}
                  activeOpacity={0.7}>
                  <Icon
                    name={isCollected ? 'checkmark' : 'add'}
                    size={20}
                    color={colors.accent}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
};
