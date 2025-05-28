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

type FeaturedBannerHomeProps = {
  item: Movie | TVShow;
  type: 'movie' | 'tv';
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const FeaturedBannerHome: React.FC<FeaturedBannerHomeProps> = ({
  item,
  type,
}) => {
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
    <View style={styles.cardContainer}>
      <ImageBackground
        onLoadEnd={() => setLoading(false)}
        source={{
          uri: `https://image.tmdb.org/t/p/w780${item.poster_path}`,
        }}
        style={styles.image}
        imageStyle={styles.imageStyle}>
        {/* Stronger bottom gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.64)', 'rgb(0, 0, 0)']}
          style={styles.gradientOverlay}
        />
        <View style={styles.absoluteContent}>
          {/* Genres */}
          <View style={styles.genreContainer}>
            {item.genre_ids?.slice(0, 3).map((genreId, index) => (
              <View key={genreId} style={styles.genreWrapper}>
                <Text style={styles.genre}>
                  {type === 'movie' ? movieGenres[genreId] : tvGenres[genreId]}
                </Text>
                {index < Math.min(item.genre_ids.length - 1, 2) && (
                  <Text style={styles.genreDot}>•</Text>
                )}
              </View>
            ))}
          </View>
          {/* Buttons */}
          <View style={styles.buttonRow}>
            <GradientButton
              title="Watch Now"
              onPress={handlePress}
              style={styles.watchButton}
              textStyle={styles.watchButtonText}
            />
            <TouchableOpacity style={styles.addButton} onPress={addWatchlist}>
              {checkInWatchlist(item.id) ? (
                <Ionicon name="checkmark" size={24} color="#fff" />
              ) : (
                <Ionicon name="add" size={24} color="#fff" />
              )}
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
    zIndex: 5,
  },
  cardContainer: {
    width: width - 80,
    height: 520,
    alignSelf: 'center',
    borderRadius: 32,
    overflow: 'hidden',
    margin: 40,
    marginTop: 70,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(91, 91, 91, 0.35)',
  },
  image: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderRadius: 32,
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 1,
    height: '65%',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  absoluteContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 48,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  genreWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genre: {
    ...typography.caption,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  genreDot: {
    ...typography.caption,
    color: colors.text.secondary,
    marginHorizontal: spacing.xs,
  },
  buttonRow: {
    display: 'flex',
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  watchButton: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 36,
    paddingVertical: 14,
    marginRight: 12,
  },
  watchButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
});
