import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {ContentItem} from './MovieList';
import {getImageUrl} from '../services/tmdb';
import {colors} from '../styles/theme';
import {useResponsive} from '../hooks/useResponsive';

interface MovieCardProps {
  item: ContentItem;
  onPress: (item: ContentItem) => void;
  size?: 'normal' | 'large';
  cardWidth?: number; // optional external width to allow perfect grid fit
}

const baseStyles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    margin: 3,
  },
  containerLarge: {
    width: 120,
  },
  poster: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.card,
  },
  posterLarge: {
    height: 240,
  },
  skeleton: {
    flex: 1,
    overflow: 'hidden',
  },
});

const MovieCardComponent: React.FC<MovieCardProps> = ({
  item,
  onPress,
  size = 'normal',
  cardWidth,
}) => {
  const {isTablet} = useResponsive();
  const {width: currentWidth} = useWindowDimensions();
  // If external width not provided, fall back to previous heuristic
  const internalColumns = isTablet ? 5 : 3;
  const effectiveWidth = cardWidth ?? currentWidth / internalColumns - 8; // margin compensation
  const cardHeight = effectiveWidth * 1.5;
  return (
    <TouchableOpacity
      style={[
        {width: effectiveWidth, height: cardHeight},
        baseStyles.container,
        size === 'large' && baseStyles.containerLarge,
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}>
      <View>
        <FastImage
          source={{
            uri: item?.poster_path
              ? getImageUrl(item.poster_path, isTablet ? 'w500' : 'w342')
              : 'https://via.placeholder.com/300x450',
            priority: FastImage.priority.normal,
            // Use immutable to keep posters cached across visits regardless of headers
            cache: FastImage.cacheControl.immutable,
          }}
          style={[
            baseStyles.poster,
            size === 'large' && baseStyles.posterLarge,
          ]}
          resizeMode={FastImage.resizeMode.cover}
        />
      </View>
    </TouchableOpacity>
  );
};

// Memoize to avoid re-renders when props are unchanged
export const MovieCard = React.memo(MovieCardComponent, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.poster_path === next.item.poster_path &&
    prev.size === next.size &&
    prev.cardWidth === next.cardWidth &&
    prev.onPress === next.onPress
  );
});
