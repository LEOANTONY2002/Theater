import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {ContentItem} from './MovieList';
import {getImageUrl} from '../services/tmdb';

interface MovieCardProps {
  item: ContentItem;
  onPress: (item: ContentItem) => void;
  size?: 'normal' | 'large';
}

export const MovieCard: React.FC<MovieCardProps> = ({
  item,
  onPress,
  size = 'normal',
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

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
    <TouchableOpacity
      style={[styles.container, size === 'large' && styles.containerLarge]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}>
      <View>
        <FastImage
          source={{
            uri: item?.poster_path
              ? getImageUrl(item.poster_path, 'w154')
              : 'https://via.placeholder.com/300x450',
          }}
          style={[styles.poster, size === 'large' && styles.posterLarge]}
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
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 120,
    borderRadius: 8,
    overflow: 'hidden',
    margin: 5,
  },
  containerLarge: {
    width: 120,
  },
  poster: {
    width: '100%',
    height: 180,
    backgroundColor: '#2a2a2a',
  },
  posterLarge: {
    height: 240,
  },
  skeleton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    overflow: 'hidden',
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
});
