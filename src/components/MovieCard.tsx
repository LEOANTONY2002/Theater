import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
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
      <Image
        source={{
          uri: item.poster_path
            ? getImageUrl(item.poster_path)
            : 'https://via.placeholder.com/300x450',
        }}
        style={[styles.poster, size === 'large' && styles.posterLarge]}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 120,
    backgroundColor: '#1f1f1f',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
