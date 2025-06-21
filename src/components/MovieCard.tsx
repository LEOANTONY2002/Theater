import React, {useState} from 'react';
import {View, Image, TouchableOpacity, StyleSheet} from 'react-native';
import {ContentItem} from './MovieList';
import {getImageUrl} from '../services/tmdb';
import {MoivieCardSkeleton} from './LoadingSkeleton';

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

  return (
    <TouchableOpacity
      style={[styles.container, size === 'large' && styles.containerLarge]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}>
      <View>
        {!imageLoaded && <MoivieCardSkeleton />}
        <Image
          source={{
            uri: item?.poster_path
              ? getImageUrl(item?.poster_path, 'w185')
              : 'https://via.placeholder.com/300x450',
          }}
          style={[
            styles?.poster,
            size === 'large' && styles?.posterLarge,
            !imageLoaded && {position: 'absolute', width: 0, height: 0},
          ]}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
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
});
