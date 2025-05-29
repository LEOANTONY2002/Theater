import React, {useState} from 'react';
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
import {colors, typography, spacing, borderRadius} from '../styles/theme';
import {useUserContent} from '../hooks/useUserContent';
import {BannerSkeleton} from './LoadingSkeleton';
import {GradientButton} from './GradientButton';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
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
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const FeaturedBanner: React.FC<FeaturedBannerProps> = ({item, type}) => {
  const [loading, setLoading] = useState(true);
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
  const navigation = useNavigation<NavigationProp>();

  const addWatchlist = () => {
    if (checkInWatchlist(item.id)) {
      removeFromWatchlist(item.id);
    } else {
      addToWatchlist(item, type);
    }
  };

  const handlePress = () => {
    if (type === 'movie') {
      navigation.navigate('MovieDetails', {movie: item as Movie});
    } else {
      navigation.navigate('TVShowDetails', {show: item as TVShow});
    }
  };

  if (item.poster_path === null) {
    return (
      <View style={styles.skeletonContainer}>
        <BannerSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        onLoadEnd={() => setLoading(false)}
        source={{
          uri: `https://image.tmdb.org/t/p/w780${item.poster_path}`,
        }}
        style={styles.background}
        resizeMode="cover">
        {loading && (
          <View style={styles.skeletonContainer}>
            <BannerSkeleton />
          </View>
        )}
        <LinearGradient
          colors={[
            'transparent',
            'rgba(1, 1, 21, 0.62)',
            colors.background.primary,
          ]}
          style={styles.gradient}
        />
        <View style={styles.content}>
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
          <View style={styles.buttonContainer}>
            <GradientButton
              title="View Details"
              onPress={handlePress}
              style={styles.button}
            />
            <TouchableOpacity style={styles.buttonWL} onPress={addWatchlist}>
              <Ionicon
                name={checkInWatchlist(item.id) ? 'checkmark' : 'add'}
                size={25}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonContainer: {
    width: width,
    height: BANNER_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  container: {
    width: width,
    height: BANNER_HEIGHT,
    position: 'relative',
  },
  background: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 400,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  content: {
    gap: spacing.sm,
    padding: spacing.lg,
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
    borderRadius: borderRadius.round,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxl,
    alignSelf: 'flex-start',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
    marginBottom: spacing.md,
    marginHorizontal: spacing.xxl,
  },
  buttonWL: {
    marginTop: spacing.md,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.round,
    width: 40,
    height: 40,
    display: 'flex',
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
