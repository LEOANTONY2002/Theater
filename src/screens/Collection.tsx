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
import {colors, spacing, typography} from '../styles/theme';
import {tmdbApi} from '../services/api';
import {Movie} from '../types/movie';
import {HomeStackParamList} from '../types/navigation';

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

  useEffect(() => {
    fetchCollectionDetails();
  }, [collectionId]);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
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
                colors={[
                  'rgba(0,0,0,0.1)',
                  'rgba(0,0,0,0.3)',
                  colors.background.expected || '#000000',
                ]}
                style={StyleSheet.absoluteFill}
                locations={[0, 0.6, 1]}
              />

              <View style={styles.bannerContent}>
                <Text style={styles.title}>{collection.name}</Text>

                {genres.length > 0 && (
                  <View style={styles.metaRow}>
                    {genres.map((genre, index) => (
                      <React.Fragment key={index}>
                        <Text style={styles.metaText}>{genre}</Text>
                        {index < genres.length - 1 && (
                          <Text style={styles.metaSeparator}>•</Text>
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
                  <Icon name="add" size={20} color={colors.text.primary} />
                  <Text style={styles.addButtonText}>
                    Add to My Collections
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
                activeOpacity={0.9}>
                <Image
                  source={{uri: getImageUrl(item.poster_path, 'w500')}}
                  style={styles.cardPoster}
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']}
                  style={StyleSheet.absoluteFill}
                />

                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardMeta}>
                      {getLanguageName(item.original_language)} •{' '}
                      {new Date(item.release_date).getFullYear()}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {movieGenres?.join(' | ')}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardOverview} numberOfLines={2}>
                      {item.overview}
                    </Text>

                    <View style={styles.ratingRow}>
                      <Icon name="star" size={16} color="#FFD700" />
                      <Text style={styles.ratingText}>
                        {item.vote_average.toFixed(1)}{' '}
                        <Text style={styles.voteCount}>
                          ({formatVoteCount(item.vote_count)})
                        </Text>
                      </Text>
                    </View>
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
    paddingBottom: spacing.xl,
    zIndex: 1,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
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
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  metaSeparator: {
    marginHorizontal: spacing.sm,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  addButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    marginLeft: spacing.xs,
    fontSize: 14,
  },
  overview: {
    ...typography.body2,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 24,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.lg,
    // We remove paddingLeft to let the number hug the edge or be positioned uniquely
  },
  rankContainer: {
    width: 60, // Fixed width for the ranking number
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  rankNumber: {
    fontSize: 80,
    fontWeight: '900',
    color: '#FFFFFF',
    fontStyle: 'italic', // Gives it that dynamic speed look
    // Emulating the "cut off" number look if desired, or just big bold text
  },
  movieCard: {
    flex: 1,
    height: 180,
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardPoster: {
    width: 120,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 20, 20, 0.6)', // Slight overlay on right side
  },
  cardHeader: {
    marginBottom: spacing.xs,
  },
  cardMeta: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  cardOverview: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    justifyContent: 'flex-end',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  voteCount: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '400',
    fontSize: 12,
  },
});
