import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  useWindowDimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {LinearGradient} from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {CollectionScreenSkeleton} from '../components/LoadingSkeleton';
import {tmdbApi} from '../services/api';
import {Movie} from '../types/movie';
import {CollectionsManager} from '../store/collections';
import {HomeStackParamList} from '../types/navigation';
import {useResponsive} from '../hooks/useResponsive';

type CollectionScreenNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'Collection'
>;

interface CollectionDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: Movie[];
}

export const CollectionScreen: React.FC<{route: any}> = ({route}) => {
  const {collectionId} = route.params;
  const navigation = useNavigation<CollectionScreenNavigationProp>();
  const {width, height} = useWindowDimensions();

  const [collection, setCollection] = useState<CollectionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCollected, setIsCollected] = useState(false);
  const [saving, setSaving] = useState(false);
  const {isTablet} = useResponsive();

  useEffect(() => {
    fetchCollectionDetails();
    checkIfCollected();
  }, [collectionId]);

  const checkIfCollected = async () => {
    const collected = await CollectionsManager.isCollected(
      collectionId.toString(),
    );
    setIsCollected(collected);
  };

  const handleToggleCollection = async () => {
    if (!collection) return;

    try {
      setSaving(true);
      if (isCollected) {
        await CollectionsManager.deleteCollection(collectionId.toString());
        setIsCollected(false);
      } else {
        await CollectionsManager.saveCollection({
          id: collection.id,
          name: collection.name,
          overview: collection.overview,
          poster_path: collection.poster_path,
          backdrop_path: collection.backdrop_path,
          parts: collection.parts,
        });
        setIsCollected(true);
      }
    } catch (error) {
      console.error('Error toggling collection:', error);
    } finally {
      setSaving(false);
    }
  };

  const fetchCollectionDetails = async () => {
    try {
      setLoading(true);
      const response = await tmdbApi.get(`/collection/${collectionId}`);
      setCollection(response.data);
    } catch (error) {
      console.error('Error fetching collection details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (path: string | null, size: string = 'original') => {
    if (!path) return '';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  };

  const handleMoviePress = (movie: Movie) => {
    navigation.push('MovieDetails', {movie});
  };

  const formatVoteCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const getLanguageName = (code: string) => {
    const languageNames: {[key: string]: string} = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese',
      hi: 'Hindi',
    };
    return languageNames[code] || code.toUpperCase();
  };

  // Get unique genres from all movies
  const getGenres = () => {
    if (!collection?.parts) return [];
    const genreMap = new Map();
    collection.parts.forEach(movie => {
      movie.genre_ids?.forEach(id => {
        const genreNames: {[key: number]: string} = {
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
        if (genreNames[id]) {
          genreMap.set(id, genreNames[id]);
        }
      });
    });
    return Array.from(genreMap.values()).slice(0, 3); // Take top 3 for cleaner UI
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#050505', // Deep black background
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: '#050505',
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      ...typography.body1,
      color: colors.text.muted,
    },
    headerContainer: {
      paddingBottom: spacing.xxl,
    },
    banner: {
      width: '100%',
      justifyContent: 'flex-end',
      marginBottom: spacing.lg,
    },
    bannerContent: {
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      zIndex: 1,
    },
    title: {
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      fontSize: isTablet ? 32 : 20,
      fontWeight: '800',
      color: colors.text.primary,
      marginBottom: spacing.sm,
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: {width: 0, height: 2},
      textShadowRadius: 4,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      flexWrap: 'wrap',
    },
    metaText: {
      fontSize: isTablet ? 14 : 12,
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '500',
    },
    metaSeparator: {
      marginHorizontal: spacing.sm,
      color: 'rgba(255, 255, 255, 0.4)',
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 12,
      padding: spacing.sm,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statItem: {
      alignItems: 'center',
      paddingHorizontal: spacing.md,
    },
    statLabel: {
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.5)',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.modal.blur,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: 30,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.content,
      gap: spacing.xs,
    },
    addButtonText: {
      ...typography.button,
      color: '#FFFFFF',
      marginLeft: spacing.xs,
      fontSize: isTablet ? 14 : 12,
    },
    addedButton: {
      backgroundColor: 'rgba(52, 199, 89, 0.2)', // Standard green accent with low opacity
      borderColor: 'rgba(52, 199, 89, 0.5)',
    },
    overview: {
      ...typography.body2,
      color: colors.text.muted,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
      fontSize: isTablet ? 14 : 12,
      lineHeight: isTablet ? 24 : 16,
    },
    contentContainer: {
      paddingBottom: 100,
    },
    rankRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingLeft: 40,
    },
    rankContainer: {
      width: 60,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: spacing.xs,
      position: 'absolute',
    },
    rankNumber: {
      fontSize: 80,
      fontWeight: '900',
      color: colors.text.primary,
    },
    movieCard: {
      flex: 1,
      height: 180,
      flexDirection: 'row',
      backgroundColor: colors.modal.blur,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.content,
    },
    cardPoster: {
      width: 110,
      height: 160,
      borderRadius: borderRadius.lg,
    },
    cardContent: {
      flex: 1,
      padding: spacing.md,
      paddingLeft: spacing.xs,
      justifyContent: 'flex-end',
    },
    cardMeta: {
      fontSize: 11,
      color: colors.text.secondary,
      marginBottom: 2,
      letterSpacing: 0.5,
    },
    cardTitle: {
      fontSize: isTablet ? 18 : 14,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: spacing.xs,
    },
    cardOverview: {
      fontSize: 12,
      color: colors.text.muted,
      lineHeight: 16,
      marginBottom: spacing.sm,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ratingText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 12,
    },
    voteCount: {
      color: colors.text.secondary,
      fontWeight: '400',
      fontSize: 12,
    },
  });

  if (loading) {
    return <CollectionScreenSkeleton />;
  }

  if (!collection) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Collection not found</Text>
      </View>
    );
  }

  const genres = getGenres();
  const sortedMovies = collection.parts.sort(
    (a, b) =>
      new Date(a.release_date || '').getTime() -
      new Date(b.release_date || '').getTime(),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedMovies}
        showsVerticalScrollIndicator={false}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* Immersive Hero Banner */}
            <View style={[styles.banner, {height: height * 0.55}]}>
              <Image
                source={{
                  uri: getImageUrl(
                    collection.backdrop_path || collection.poster_path,
                    'original',
                  ),
                }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', colors.background.primary]}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.bannerContent}>
                <Text style={styles.title}>{collection.name}</Text>

                {genres.length > 0 && (
                  <View style={[styles.metaRow, {marginBottom: spacing.xs}]}>
                    {genres.map((genre, index) => (
                      <React.Fragment key={index}>
                        <Text style={styles.metaText}>{genre}</Text>
                        {index < genres.length - 1 && (
                          <Text style={styles.metaSeparator}>|</Text>
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                )}

                <View style={styles.metaRow}>
                  <Icon
                    name="star"
                    size={14}
                    color={colors.text.primary}
                    style={{marginRight: 4}}
                  />
                  <Text
                    style={[
                      styles.metaText,
                      {color: colors.text.primary, fontWeight: '700'},
                    ]}>
                    {(() => {
                      const ratedParts = collection.parts.filter(
                        part => part.vote_count > 0,
                      );
                      return ratedParts.length > 0
                        ? (
                            ratedParts.reduce(
                              (acc, part) => acc + part.vote_average,
                              0,
                            ) / ratedParts.length
                          ).toFixed(1)
                        : '0.0';
                    })()}
                  </Text>
                  <Text
                    style={[styles.metaText, {marginLeft: 4, opacity: 0.7}]}>
                    (
                    {formatVoteCount(
                      collection.parts.reduce(
                        (acc, part) => acc + part.vote_count,
                        0,
                      ),
                    )}
                    )
                  </Text>

                  <Text style={styles.metaSeparator}>•</Text>

                  <Text style={styles.metaText}>
                    {collection.parts.length} Movies
                  </Text>

                  <Text style={styles.metaSeparator}>•</Text>

                  <Text style={styles.metaText}>
                    {new Date(
                      [...collection.parts].sort(
                        (a, b) =>
                          new Date(a.release_date).getTime() -
                          new Date(b.release_date).getTime(),
                      )[0].release_date,
                    ).getFullYear()}{' '}
                    -{' '}
                    {new Date(
                      [...collection.parts].sort(
                        (a, b) =>
                          new Date(b.release_date).getTime() -
                          new Date(a.release_date).getTime(),
                      )[0].release_date,
                    ).getFullYear()}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.addButton]}
                  onPress={handleToggleCollection}
                  disabled={saving}
                  activeOpacity={0.8}>
                  <Icon
                    name={isCollected ? 'checkmark' : 'add'}
                    size={20}
                    color={colors.text.primary}
                  />
                  <Text style={styles.addButtonText}>
                    {saving
                      ? 'Updating...'
                      : isCollected
                      ? 'Saved to My Collections'
                      : 'Add to My Collections'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Overview Text */}
            {collection.overview && (
              <Text style={styles.overview}>{collection.overview}</Text>
            )}
          </View>
        }
        renderItem={({item, index}) => {
          const movieGenres = item.genre_ids
            ?.map(id => {
              const genreNames: {[key: number]: string} = {
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
                878: 'Sci-Fi',
                10770: 'TV Movie',
                53: 'Thriller',
                10752: 'War',
                37: 'Western',
              };
              return genreNames[id];
            })
            .filter(Boolean)
            .slice(0, 3); // Limit to top 3 for clean card

          return (
            <View style={styles.rankRow}>
              {/* Huge Rank Number */}
              <View style={styles.rankContainer}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>

              {/* Movie Card */}
              <TouchableOpacity
                style={styles.movieCard}
                onPress={() => handleMoviePress(item)}
                activeOpacity={1}>
                <Image
                  source={{uri: getImageUrl(item.backdrop_path, 'w500')}}
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                />
                <LinearGradient
                  colors={['transparent', colors.background.primary]}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  useAngle
                  angle={90}
                  colors={[colors.background.primary, 'transparent']}
                  style={StyleSheet.absoluteFill}
                />
                <View
                  style={{
                    borderRadius: borderRadius.lg,
                    borderWidth: 1,
                    borderBottomWidth: 0,
                    borderColor: colors.modal.content,
                    margin: spacing.sm,
                  }}>
                  <Image
                    source={{uri: getImageUrl(item.poster_path, 'w500')}}
                    style={styles.cardPoster}
                  />
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <Text style={styles.cardMeta}>
                    {getLanguageName(item.original_language)} •{' '}
                    {new Date(item.release_date).getFullYear()}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {movieGenres?.join(' | ')}
                  </Text>
                  <Text style={styles.cardOverview} numberOfLines={2}>
                    {item.overview}
                  </Text>

                  <View style={styles.ratingRow}>
                    <Icon name="star" size={15} color={colors.text.primary} />
                    <Text style={styles.ratingText}>
                      {item.vote_average.toFixed(1)}{' '}
                      <Text style={styles.voteCount}>
                        ({formatVoteCount(item.vote_count)})
                      </Text>
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{height: spacing.xl}} />}
      />
    </View>
  );
};
