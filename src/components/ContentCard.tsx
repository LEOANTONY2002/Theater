import React, {useState, useCallback, memo, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import FastImage from 'react-native-fast-image';
import {ContentItem} from './MovieList';
import {getImageUrl} from '../services/tmdb';
import {colors, spacing, borderRadius} from '../styles/theme';
import {useResponsive} from '../hooks/useResponsive';
import {checkInternet} from '../services/connectivity';

interface ContentCardProps {
  item: ContentItem;
  onPress: (item: ContentItem) => void;
  v2?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = memo(
  ({item, onPress, v2 = false}) => {
    const {isTablet} = useResponsive();
    const [imageError, setImageError] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
      const checkConnectivity = async () => {
        const offline = await checkInternet();
        setIsOffline(!offline);
      };
      checkConnectivity();
    }, []);

    const imgPath = v2 ? item.backdrop_path : item.poster_path;
    const imageUrl = imgPath
      ? getImageUrl(imgPath, isTablet ? 'w342' : 'w185')
      : '';

    const title =
      'title' in item ? item.title : 'name' in item ? item.name : '';

    const handlePress = useCallback(() => {
      onPress(item);
    }, [onPress, item]);

    // Dynamic size based on device type
    const cardDynamicStyle = v2
      ? isTablet
        ? styles.cardV2Tablet
        : styles.cardV2
      : isTablet
      ? styles.cardDefaultTablet
      : styles.cardDefault;

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
            source={
              imageError && isOffline
                ? require('../assets/theater.webp')
                : {
                    uri: imageUrl || 'https://via.placeholder.com/300x450',
                    priority: FastImage.priority.normal,
                    cache: FastImage.cacheControl.immutable,
                  }
            }
            style={styles.image}
            resizeMode={FastImage.resizeMode.cover}
            onError={() => setImageError(true)}
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
    width: 130,
    height: 195,
  },
  cardDefaultTablet: {
    width: 170,
    height: 255,
  },
  cardV2: {
    width: 190,
    height: 110,
  },
  cardV2Tablet: {
    width: 270,
    height: 155,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.card,
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
    fontFamily: 'Inter_18pt-Regular',
  },
});
