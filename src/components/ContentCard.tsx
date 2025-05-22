import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {ContentItem} from './MovieList';

interface ContentCardProps {
  item: ContentItem;
  onPress: (item: ContentItem) => void;
  index?: number; // For staggered animation
  v2?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  onPress,
  index = 0,
  v2 = false,
}) => {
  const imageUrl = `https://image.tmdb.org/t/p/w500${
    v2 ? item.backdrop_path : item.poster_path
  }`;
  const rating = item.vote_average?.toFixed(1);

  // Safely extract date - handling both movie and TV show types
  const date =
    'release_date' in item
      ? item.release_date
      : 'first_air_date' in item
      ? item.first_air_date
      : '';

  const releaseYear = date ? new Date(date).getFullYear() : '';

  // Safely get title - handling both movie and TV show types
  const title = 'title' in item ? item.title : 'name' in item ? item.name : '';

  const {width} = Dimensions.get('window');
  const CARD_WIDTH = width * 0.42; // Slightly wider cards
  const CARD_HEIGHT = v2 ? CARD_WIDTH * 0.55 : CARD_WIDTH * 1.55; // Slightly taller aspect ratio

  const styles = StyleSheet.create({
    container: {
      width: CARD_WIDTH,
      marginHorizontal: spacing.sm,
      marginVertical: spacing.md,
    },
    cardInner: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.card.border,
      ...shadows.medium,
      // Glass morphism effect (limited on Android)
      ...(Platform.OS === 'ios'
        ? {
            backgroundColor: colors.background.card,
            backdropFilter: 'blur(12px)',
          }
        : {
            backgroundColor: colors.card.background,
          }),
      position: 'relative',
    },
    imageContainer: {
      position: 'relative',
      width: '100%',
      height: CARD_HEIGHT,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    gradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '35%', // Gradient covers bottom third
    },
    ratingContainer: {
      position: 'absolute',
      top: spacing.sm,
      right: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.round,
      borderWidth: 1,
    },
    rating: {
      marginLeft: spacing.xs,
      ...typography.caption,
      fontWeight: '600',
    },
    typeContainer: {
      position: 'absolute',
      top: spacing.sm + 32, // Position below rating
      right: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.round,
      borderWidth: 1,
    },
    typeText: {
      ...typography.caption,
      fontWeight: '600',
    },
    infoContainer: {
      padding: spacing.md,
    },
    title: {
      color: colors.text.primary,
      ...typography.body2,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    metaContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    year: {
      color: colors.text.secondary,
      ...typography.caption,
    },
    dotSeparator: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.text.secondary,
      marginHorizontal: spacing.xs,
      opacity: 0.6,
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(item)}
      activeOpacity={0.9}>
      <View style={styles.cardInner}>
        <View style={styles.imageContainer}>
          <Image source={{uri: imageUrl}} style={styles.image} />

          {/* Overlay gradient for better text visibility */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          />
        </View>
      </View>
      {v2 && (
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
