import React, {useState, useCallback, memo} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {ContentItem} from './MovieList';
import {getImageUrl} from '../services/tmdb';
import {colors, spacing, borderRadius} from '../styles/theme';
import {ContentCardSkeleton} from './LoadingSkeleton';

interface ContentCardProps {
  item: ContentItem;
  onPress: (item: ContentItem) => void;
  v2?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = memo(
  ({item, onPress, v2 = false}) => {
    // REMOVE: const [imageLoaded, setImageLoaded] = useState(false);

    const CARD_WIDTH = v2 ? 180 : 120;
    const CARD_HEIGHT = v2 ? 100 : 180;

    const imageUrl = getImageUrl(
      v2 ? item.backdrop_path : item.poster_path,
      'w185',
    );

    const title =
      'title' in item ? item.title : 'name' in item ? item.name : '';

    const handlePress = useCallback(() => {
      onPress(item);
    }, [onPress, item]);

    const handleImageFinish = useCallback(() => {
      // setImageLoaded(true); // REMOVE: This line was removed
    }, []);

    // Move dynamic style to StyleSheet
    const cardDynamicStyle = v2 ? styles.cardV2 : styles.cardDefault;

    return (
      <>
        <TouchableOpacity
          style={[styles.container, cardDynamicStyle]}
          onPress={handlePress}
          activeOpacity={0.9}
          delayPressIn={0}
          delayPressOut={0}
          delayLongPress={0}>
          <FastImage
            source={{uri: imageUrl || 'https://via.placeholder.com/300x450'}}
            style={styles.image}
            resizeMode={FastImage.resizeMode.cover}
            // REMOVE: onLoad, onError
          />
        </TouchableOpacity>

        {v2 && (
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
        )}
      </>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    // margin: 5,
  },
  cardDefault: {
    width: 120,
    height: 180,
  },
  cardV2: {
    width: 180,
    height: 100,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2a',
    borderRadius: borderRadius.md,
  },
  skeleton: {
    flex: 1,
    backgroundColor: 'rgb(21, 21, 32)',
    overflow: 'hidden',
    borderRadius: borderRadius.md,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    opacity: 0.7,
  },
  infoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
    width: 150,
  },
});
