import React, {useState} from 'react';
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
import LinearGradient from 'react-native-linear-gradient';
import {ContentItem} from './MovieList';
import {MoivieCardSkeleton} from './LoadingSkeleton';

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

  const CARD_WIDTH = v2 ? 180 : 120; // Slightly wider cards
  const CARD_HEIGHT = v2 ? 100 : 180; // Slightly taller aspect ratio

  const [imageLoaded, setImageLoaded] = useState(false);

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: spacing.xs,
      marginVertical: spacing.md,
      width: CARD_WIDTH,
      height: v2 ? 150 : CARD_HEIGHT,
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
    },
    image: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      resizeMode: 'cover',
      borderRadius: borderRadius.md,
    },
    infoContainer: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      padding: spacing.sm,
    },

    title: {
      fontSize: 12,
      color: colors.text.secondary,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    skeletonContainer: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      position: 'absolute',
      top: 0,
      left: -5,
      zIndex: 5,
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(item)}
      activeOpacity={0.9}>
      {!imageLoaded && (
        <View style={styles.skeletonContainer}>
          <MoivieCardSkeleton v2={v2} />
        </View>
      )}
      <Image
        source={{uri: imageUrl}}
        style={styles.image}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(true)}
      />
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
