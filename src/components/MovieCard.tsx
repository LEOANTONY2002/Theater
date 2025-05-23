import React, {useState} from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import {ContentItem} from './MovieList';
import {getImageUrl} from '../services/tmdb';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

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

  const title = 'title' in item ? item.title : item.name;
  const releaseDate =
    'release_date' in item ? item.release_date : item.first_air_date;
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
  const year = releaseDate ? new Date(releaseDate).getFullYear() : '';

  return (
    <TouchableOpacity
      style={[styles.container, size === 'large' && styles.containerLarge]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}>
      <View>
        {!imageLoaded && (
          <SkeletonPlaceholder
            highlightColor="rgba(0,0,0,0.8)"
            backgroundColor="rgba(26, 0, 78, 0.19)"
            borderRadius={8}>
            <SkeletonPlaceholder.Item
              width={120}
              height={size === 'large' ? 240 : 180}
            />
          </SkeletonPlaceholder>
        )}
        <Image
          source={{
            uri: item.poster_path
              ? getImageUrl(item.poster_path)
              : 'https://via.placeholder.com/300x450',
          }}
          style={[
            styles.poster,
            size === 'large' && styles.posterLarge,
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
    // elevation: 5,
    // shadowColor: '#000',
    // shadowOffset: {width: 0, height: 2},
    // shadowOpacity: 0.25,
    // shadowRadius: 3.84,
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
