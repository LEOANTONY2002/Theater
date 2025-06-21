import React, {useState, useCallback, memo, useEffect} from 'react';
import {View, Text, Image, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, spacing, borderRadius} from '../styles/theme';
import {ContentItem} from './MovieList';
import {MoivieCardSkeleton} from './LoadingSkeleton';
import {getOptimizedImageUrl} from '../services/tmdb';

interface ContentCardProps {
  item: ContentItem;
  onPress: (item: ContentItem) => void;
  v2?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = memo(
  ({item, onPress, v2 = false}) => {
    // Use better quality for V2 (recent searches), small size for performance elsewhere
    const imageUrl = getOptimizedImageUrl(
      v2 ? item.backdrop_path : item?.poster_path,
      v2 ? 'medium' : 'small', // Better quality for V2, small for performance
    );

    const title =
      'title' in item ? item.title : 'name' in item ? item.name : '';

    const CARD_WIDTH = v2 ? 180 : 120;
    const CARD_HEIGHT = v2 ? 100 : 180;

    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [shouldLoadImage, setShouldLoadImage] = useState(false);

    // Ultra-aggressive image loading delay to prevent FPS drops
    useEffect(() => {
      const timer = setTimeout(
        () => {
          setShouldLoadImage(true);
        },
        v2 ? 100 : 300,
      ); // Shorter delay for V2 (recent searches)
      return () => clearTimeout(timer);
    }, [v2]);

    const handlePress = useCallback(() => {
      onPress(item);
    }, [onPress, item]);

    const handleImageLoad = useCallback(() => {
      setImageLoaded(true);
    }, []);

    const handleImageError = useCallback(() => {
      setImageLoaded(true);
      setImageError(true);
    }, []);

    const styles = StyleSheet.create({
      container: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
      },
      skeletonContainer: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1,
      },
      image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: borderRadius.md,
      },
      infoContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
      },
      title: {
        fontSize: 12,
        color: colors.text.secondary,
        fontWeight: '600',
        marginBottom: spacing.xs,
        width: 150,
      },
    });

    return (
      <>
        <TouchableOpacity
          style={styles.container}
          onPress={handlePress}
          activeOpacity={0.9}
          // Disable all delays for maximum performance
          delayPressIn={0}
          delayPressOut={0}
          delayLongPress={0}>
          {(!imageLoaded || imageError) && (
            <View style={styles.skeletonContainer}>
              <MoivieCardSkeleton v2={v2} />
            </View>
          )}
          {!imageError && shouldLoadImage && (
            <Image
              source={{uri: imageUrl}}
              style={styles.image}
              onLoad={handleImageLoad}
              onError={handleImageError}
              fadeDuration={0}
              resizeMethod="resize"
              // Disable all image optimizations that cause FPS drops
              blurRadius={0}
            />
          )}
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
