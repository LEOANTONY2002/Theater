import React, {useState, useCallback} from 'react';
import {View, TouchableOpacity, StyleSheet, Dimensions} from 'react-native';
import FastImage from 'react-native-fast-image';
import {ContentItem} from './MovieList';
import {getImageUrl} from '../services/tmdb';
import {MoivieCardSkeleton} from './LoadingSkeleton';
import {colors} from '../styles/theme';

interface MovieCardProps {
  item: ContentItem;
  onPress: (item: ContentItem) => void;
  size?: 'normal' | 'large';
}

const SCREEN_WIDTH = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH / 3 - 5,
    height: SCREEN_WIDTH / 2 - 10,
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

export const MovieCard: React.FC<MovieCardProps> = ({
  item,
  onPress,
  size = 'normal',
}) => {
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
          priority={FastImage.priority.normal}
          cache={FastImage.cacheControl.cacheOnly}
        />
      </View>
    </TouchableOpacity>
  );
};
