import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  Button,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import Ionicon from 'react-native-vector-icons/Ionicons';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {colors, typography, spacing, borderRadius} from '../styles/theme';
import {useUserContent} from '../hooks/useUserContent';

const {width} = Dimensions.get('window');
const BANNER_HEIGHT = 680;

// Genre mappings
const movieGenres: {[key: number]: string} = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

const tvGenres: {[key: number]: string} = {
  10759: 'Action & Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Western',
};

type FeaturedBannerProps = {
  item: Movie | TVShow;
  type: 'movie' | 'tv';
  onPress: () => void;
};

export const FeaturedBanner = ({item, type, onPress}: FeaturedBannerProps) => {
  const title =
    type === 'movie' ? (item as Movie).title : (item as TVShow).name;
  const releaseDate =
    type === 'movie'
      ? (item as Movie).release_date
      : (item as TVShow).first_air_date;
  const {
    isItemInContent: checkInWatchlist,
    addItem: addToWatchlist,
    removeItem: removeFromWatchlist,
  } = useUserContent('watchlist');

  const addWatchlist = () => {
    if (checkInWatchlist(item.id)) {
      removeFromWatchlist(item.id);
    } else {
      addToWatchlist(item, type);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{
          uri: `https://image.tmdb.org/t/p/w780${item.poster_path}`,
        }}
        style={styles.background}
        resizeMode="cover">
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)', colors.background.primary]}
          style={styles.gradient}>
          <View style={styles.content}>
            <View style={styles.typeContainer}>
              <Icon
                name={type === 'movie' ? 'film' : 'tv'}
                size={16}
                color={colors.primary}
              />
              <Text style={styles.type}>
                {type === 'movie' ? 'Movie' : 'TV Show'}
              </Text>
            </View>
            <View>
              <View style={styles.genreContainer}>
                {item.genre_ids?.slice(0, 3).map((genreId, index) => (
                  <View key={genreId} style={styles.genreWrapper}>
                    <Text style={styles.genre}>
                      {type === 'movie'
                        ? movieGenres[genreId]
                        : tvGenres[genreId]}
                    </Text>
                    {index < Math.min(item.genre_ids.length - 1, 2) && (
                      <Text style={styles.genreDot}>•</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.infoContainer}>
              <View style={styles.ratingContainer}>
                <Icon name="star" size={16} color={colors.primary} />
                <Text style={styles.rating}>
                  {item.vote_average.toFixed(1)}
                </Text>
              </View>
              <Text style={styles.date}>
                {new Date(releaseDate).getFullYear()}
              </Text>
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.button} onPress={onPress}>
                <Text style={styles.buttonText}>Watch Now</Text>
              </TouchableOpacity>
              {/* {!checkInWatchlist(item.id) && ( */}
              <TouchableOpacity style={styles.buttonWL} onPress={addWatchlist}>
                <Ionicon
                  name={
                    checkInWatchlist(item.id) ? 'bookmark' : 'bookmark-outline'
                  }
                  size={24}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
              {/* )} */}
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width,
    height: BANNER_HEIGHT,
  },
  background: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  content: {
    gap: spacing.sm,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
  },
  type: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rating: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  date: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    alignSelf: 'flex-start',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWL: {
    marginTop: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTextWL: {
    ...typography.body2,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genre: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  genreDot: {
    ...typography.caption,
    color: colors.text.secondary,
    marginHorizontal: spacing.xs,
  },
});
