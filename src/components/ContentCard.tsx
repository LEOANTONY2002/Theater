import React, {useState, useEffect, useCallback, memo} from 'react';
import {View, Text, Image, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, spacing, borderRadius} from '../styles/theme';
import {ContentItem} from './MovieList';
import {MoivieCardSkeleton} from './LoadingSkeleton';
import {getImageUrl} from '../services/tmdb';

interface ContentCardProps {
  item: ContentItem;
  onPress: (item: ContentItem) => void;
  v2?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = memo(
  ({item, onPress, v2 = false}) => {
    // Progressive image loading like Netflix
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [shouldLoadImage, setShouldLoadImage] = useState(false);
    const [currentImageUrl, setCurrentImageUrl] = useState('');

    const CARD_WIDTH = v2 ? 180 : 120;
    const CARD_HEIGHT = v2 ? 100 : 180;

    // Netflix-style progressive loading
    const lowQualityUrl = getImageUrl(
      v2 ? item.backdrop_path : item?.poster_path,
      'w185', // Low quality placeholder (smallest supported)
    );

    const highQualityUrl = getImageUrl(
      v2 ? item.backdrop_path : item?.poster_path,
      'w185', // High quality final image
    );

    const title =
      'title' in item ? item.title : 'name' in item ? item.name : '';

    // Aggressive image loading optimization
    useEffect(() => {
      // Start with low quality immediately
      setCurrentImageUrl(lowQualityUrl);

      // Load high quality after a short delay
      const timer = setTimeout(() => {
        setShouldLoadImage(true);
        setCurrentImageUrl(highQualityUrl);
      }, 50); // Very short delay for smooth experience

      return () => clearTimeout(timer);
    }, [lowQualityUrl, highQualityUrl]);

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
          // Netflix-style touch optimization
          delayPressIn={0}
          delayPressOut={0}
          delayLongPress={0}>
          {(!imageLoaded || imageError) && (
            <View style={styles.skeletonContainer}>
              <MoivieCardSkeleton v2={v2} />
            </View>
          )}

          {!imageError && (
            <Image
              source={{uri: currentImageUrl}}
              style={styles.image}
              onLoad={handleImageLoad}
              onError={handleImageError}
              fadeDuration={0} // No fade for instant loading
              resizeMethod="resize"
              // Netflix-style image optimizations
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
