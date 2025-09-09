import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  Button,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicon from 'react-native-vector-icons/Ionicons';
import {colors, typography, spacing, borderRadius} from '../styles/theme';
import {useUserContent} from '../hooks/useUserContent';
import {BannerHomeSkeleton, BannerSkeleton} from './LoadingSkeleton';
import {GradientButton} from './GradientButton';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {WatchlistModal} from './WatchlistModal';
import {
  useIsItemInAnyWatchlist,
  useRemoveFromWatchlist,
  useWatchlistContainingItem,
} from '../hooks/useWatchlists';
import {useNavigationState} from '../hooks/useNavigationState';
import {useResponsive} from '../hooks/useResponsive';
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

type FeaturedBannerHomePosterProps = {
  item: Movie | TVShow;
  type: 'movie' | 'tv';
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const FeaturedBannerHomePoster: React.FC<
  FeaturedBannerHomePosterProps
> = ({item, type}) => {
  const [loading, setLoading] = useState(true);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const {data: isInAnyWatchlist = false} = useIsItemInAnyWatchlist(item.id);
  const {data: watchlistContainingItem} = useWatchlistContainingItem(item.id);
  const removeFromWatchlistMutation = useRemoveFromWatchlist();
  const {navigateWithLimit} = useNavigationState();

  const handlePress = useCallback(() => {
    if (type === 'movie') {
      navigateWithLimit('MovieDetails', {movie: item as Movie});
    } else {
      navigateWithLimit('TVShowDetails', {show: item as TVShow});
    }
  }, [navigateWithLimit, item, type]);

  const handleWatchlistPress = useCallback(async () => {
    if (isInAnyWatchlist && watchlistContainingItem) {
      // If item is already in a watchlist, remove it
      try {
        await removeFromWatchlistMutation.mutateAsync({
          watchlistId: watchlistContainingItem,
          itemId: item.id,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to remove from watchlist');
      }
    } else {
      // If item is not in any watchlist, show modal to add it
      setShowWatchlistModal(true);
    }
  }, [
    isInAnyWatchlist,
    watchlistContainingItem,
    removeFromWatchlistMutation,
    item.id,
  ]);
  const isTablet = useResponsive().isTablet;

  const styles = StyleSheet.create({
    skeletonContainer: {
      width: '100%',
      height: 500,
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 0,
    },
    cardContainer: {
      width: isTablet ? 400 : 300,
      height: isTablet ? 650 : 500,
      backgroundColor: 'rgba(3, 0, 17, 0.99)',
      alignSelf: 'center',
      borderRadius: 50,
      overflow: 'hidden',
      shadowColor: '#000000',
      shadowOffset: {width: 6, height: 10},
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 30,
      borderWidth: 1,
      borderColor: 'rgba(91, 91, 91, 0.2)',
    },
    imageStyle: {
      borderRadius: 32,
    },
    gradientOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
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
    },
    genreContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      paddingHorizontal: 16,
    },
    genreWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    genre: {
      ...typography.caption,
      color: 'rgba(255, 255, 255, 0.68)',
      marginRight: spacing.xs,
    },
    genreDot: {
      ...typography.h3,
      color: 'rgba(163, 163, 163, 0.68)',
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
      paddingHorizontal: 56,
    },
    watchButton: {
      flex: 1,
      borderRadius: borderRadius.round,
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
      backgroundColor: colors.modal.header,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.18,
      shadowRadius: 6,
      elevation: 4,
    },
  });

  return (
    <View>
      <ImageBackground
        onLoadEnd={() => setLoading(false)}
        source={{
          uri: `https://image.tmdb.org/t/p/${isTablet ? 'original' : 'w500'}${
            item?.poster_path
          }`,
        }}
        style={styles.cardContainer}
        imageStyle={styles.imageStyle}>
        {/* {loading && (
          <View style={styles.skeletonContainer}>
            <BannerHomeSkeleton />
          </View>
        )} */}
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
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleWatchlistPress}>
              {isInAnyWatchlist ? (
                <Ionicon
                  name="checkmark"
                  size={24}
                  color={colors.text.primary}
                />
              ) : (
                <Ionicon name="add" size={24} color={colors.text.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      <WatchlistModal
        visible={showWatchlistModal}
        onClose={() => setShowWatchlistModal(false)}
        item={item}
        itemType={type}
      />
    </View>
  );
};
