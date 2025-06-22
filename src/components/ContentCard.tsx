import React, {useState, useCallback, useEffect, useRef, memo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {ContentItem} from './MovieList';
import {getImageUrl} from '../services/tmdb';
import {colors, spacing, borderRadius} from '../styles/theme';

interface ContentCardProps {
  item: ContentItem;
  onPress: (item: ContentItem) => void;
  v2?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = memo(
  ({item, onPress, v2 = false}) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const shimmerAnim = useRef(new Animated.Value(0)).current;

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
      setImageLoaded(true);
    }, []);

    useEffect(() => {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    }, [shimmerAnim]);

    const shimmerTranslate = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-100, 200],
    });

    return (
      <>
        <TouchableOpacity
          style={[styles.container, {width: CARD_WIDTH, height: CARD_HEIGHT}]}
          onPress={handlePress}
          activeOpacity={0.9}
          delayPressIn={0}
          delayPressOut={0}
          delayLongPress={0}>
          <FastImage
            source={{uri: imageUrl || 'https://via.placeholder.com/300x450'}}
            style={styles.image}
            resizeMode={FastImage.resizeMode.cover}
            onLoad={handleImageFinish}
            onError={handleImageFinish}
            priority={FastImage.priority.normal}
            cache={FastImage.cacheControl.immutable}
          />
          {!imageLoaded && (
            <View style={StyleSheet.absoluteFill}>
              <View style={styles.skeleton}>
                <Animated.View
                  style={[
                    styles.shimmer,
                    {
                      transform: [{translateX: shimmerTranslate}],
                    },
                  ]}
                />
              </View>
            </View>
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

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    margin: 5,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2a2a2a',
    borderRadius: borderRadius.md,
  },
  skeleton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
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
