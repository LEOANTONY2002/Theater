import React, {useState, useCallback} from 'react';
import {View, TouchableOpacity, StyleSheet, Dimensions} from 'react-native';
import FastImage from 'react-native-fast-image';
import {ContentItem} from './MovieList';
import {getImageUrl} from '../services/tmdb';
import {MoivieCardSkeleton} from './LoadingSkeleton';
import {colors} from '../styles/theme';
import {useResponsive} from '../hooks/useResponsive';

interface MovieCardProps {
  item: ContentItem;
  onPress: (item: ContentItem) => void;
  size?: 'normal' | 'large';
}

const SCREEN_WIDTH = Dimensions.get('window').width;

const baseStyles = StyleSheet.create({
  container: {
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
  const {isTablet} = useResponsive();
  const columns = isTablet ? 5 : 3;
  const cardWidth = SCREEN_WIDTH / columns - 8; // margin compensation
  const cardHeight = cardWidth * 1.5;
  return (
    <TouchableOpacity
      style={[
        {width: cardWidth, height: cardHeight},
        baseStyles.container,
        size === 'large' && baseStyles.containerLarge,
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}>
      <View>
        <FastImage
          source={{
            uri: item?.poster_path
              ? getImageUrl(item.poster_path, isTablet ? 'w342' : 'w154')
              : 'https://via.placeholder.com/300x450',
            priority: FastImage.priority.normal,
            cache: FastImage.cacheControl.web,
          }}
          style={[
            baseStyles.poster,
            size === 'large' && baseStyles.posterLarge,
          ]}
          resizeMode={FastImage.resizeMode.cover}
        />
      </View>
    </TouchableOpacity>
  );
};
