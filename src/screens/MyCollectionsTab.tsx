import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {CollectionsManager, SavedCollection} from '../store/collections';
import {HomeStackParamList} from '../types/navigation';
import Icon from 'react-native-vector-icons/SimpleLineIcons';
import Icon2 from 'react-native-vector-icons/FontAwesome';
import {LinearGradient} from 'react-native-linear-gradient';
import {HorizontalList} from '../components/HorizontalList';
import {useResponsive} from '../hooks/useResponsive';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

// TMDB Genre ID Map
const GENRE_MAP: {[key: number]: string} = {
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

export const MyCollectionsTab = () => {
  const navigation = useNavigation<NavigationProp>();
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<'grid' | 'row'>('grid');
  const {isTablet, orientation} = useResponsive();
  const {width, height} = useWindowDimensions();

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCollections();
    });
    return unsubscribe;
  }, [navigation]);

  const loadCollections = async () => {
    setLoading(true);
    const saved = await CollectionsManager.getSavedCollections();
    setCollections(saved);
    setLoading(false);
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return '';
    return `https://image.tmdb.org/t/p/w500${path}`;
  };

  const formatVoteCount = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return count.toString();
  };

  const getCollectionMeta = (item: SavedCollection) => {
    if (!item.parts || item.parts.length === 0) {
      return {
        years: '',
        genres: '',
        avgRating: '0',
        totalVotes: '0',
      };
    }

    // Years
    const years = item.parts
      .map(p => (p.release_date ? new Date(p.release_date).getFullYear() : 0))
      .filter(y => y > 0);

    let yearDisplay = '';
    if (years.length > 0) {
      const minYear = Math.min(...years);
      const maxYear = Math.max(...years);
      yearDisplay =
        minYear === maxYear ? `${minYear}` : `${minYear} - ${maxYear}`;
    }

    // Genres
    const genreIds = new Set<number>();
    item.parts.forEach(p => {
      p.genre_ids?.forEach(id => genreIds.add(id));
    });
    const genreNames = Array.from(genreIds)
      .map(id => GENRE_MAP[id])
      .filter(Boolean)
      .slice(0, 3)
      .join('  |  ');

    // Rating
    const totalVotes = item.parts.reduce(
      (sum, p) => sum + (p.vote_count || 0),
      0,
    );
    const avgRating =
      item.parts.reduce((sum, p) => sum + (p.vote_average || 0), 0) /
      item.parts.length;

    return {
      years: yearDisplay,
      genres: genreNames,
      avgRating: avgRating.toFixed(1),
      totalVotes: formatVoteCount(totalVotes),
    };
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
      position: 'relative',
    },
    listContent: {
      paddingBottom: spacing.xxl * 2,
      paddingTop: isTablet ? 120 : 100,
      gap: spacing.lg,
    },
    card: {
      marginHorizontal: spacing.md,
      backgroundColor: colors.background.secondary,
      borderRadius: isTablet ? 50 : 40,
      overflow: 'hidden',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    imageContainer: {
      height:
        isTablet && orientation === 'landscape' ? height * 0.2 : height * 0.3,
      width: '100%',
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    content: {
      padding: spacing.lg,
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    title: {
      ...typography.h3,
      fontSize: isTablet ? 24 : 20,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
      gap: spacing.sm,
    },
    dotDivider: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.text.secondary,
    },
    genresText: {
      ...typography.caption,
      color: colors.text.secondary,
      flex: 1,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ratingText: {
      ...typography.caption,
      color: colors.text.primary,
      fontSize: isTablet ? 12 : 11,
    },
    overview: {
      ...typography.caption,
      color: colors.text.muted,
      fontSize: isTablet ? 12 : 11,
      lineHeight: isTablet ? 18 : 16,
      marginTop: spacing.xs,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
      paddingTop: 100,
    },
    emptyTitle: {
      ...typography.h3,
      color: colors.text.primary,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    emptySubtitle: {
      ...typography.body2,
      color: colors.text.muted,
      textAlign: 'center',
      maxWidth: 250,
    },
  });

  const renderGridItem = ({item}: {item: SavedCollection}) => {
    const meta = getCollectionMeta(item);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.push('Collection', {collectionId: Number(item.id)})
        }
        activeOpacity={0.9}>
        {/* Backdrop Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: getImageUrl(item.backdrop_path || item.poster_path),
            }}
            style={styles.image}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', colors.background.primary]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            useAngle={true}
            angle={90}
            colors={[colors.background.primary, 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>
              {item.name.replace(/collection/gi, '').trim()}
            </Text>

            <View style={styles.metaRow}>
              {meta.years ? (
                <>
                  <Text style={styles.ratingText}>{meta.years}</Text>
                  <View style={styles.dotDivider} />
                </>
              ) : null}
              <View style={styles.ratingContainer}>
                <Icon2 name="star" size={12} color={colors.text.primary} />
                <Text style={styles.ratingText}>
                  {meta.avgRating} ({meta.totalVotes})
                </Text>
              </View>
              <View style={styles.dotDivider} />
              <Text style={styles.ratingText}>
                {item.parts.length}{' '}
                {item.parts.length === 1 ? 'Movie' : 'Movies'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              {meta.genres ? (
                <Text style={styles.genresText} numberOfLines={1}>
                  {meta.genres}
                </Text>
              ) : null}
            </View>

            {item.overview ? (
              <Text style={styles.overview} numberOfLines={isTablet ? 3 : 2}>
                {item.overview}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRowItem = ({item}: {item: SavedCollection}) => {
    return (
      <View style={{marginBottom: spacing.xs}}>
        <HorizontalList
          title={item.name}
          // @ts-ignore - explicitly mapping type for compatibility
          data={item.parts.map(p => ({...p, type: 'movie'}))}
          onItemPress={movie =>
            navigation.push('MovieDetails', {movie: movie as any})
          }
          onSeeAllPress={() =>
            navigation.push('Collection', {collectionId: Number(item.id)})
          }
          isSeeAll={true}
          showSeeAllText={false}
        />
      </View>
    );
  };

  if (!loading && collections.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Collections Saved</Text>
        <Text style={styles.emptySubtitle}>
          Save your favorite movie collections to access them quickly.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={collections}
        renderItem={layout === 'grid' ? renderGridItem : renderRowItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: spacing.sm,
              marginRight: spacing.md,
            }}>
            <TouchableOpacity
              onPress={() => setLayout('grid')}
              style={{
                padding: spacing.md,
                backgroundColor:
                  layout === 'grid' ? colors.modal.active : colors.modal.blur,
                borderWidth: 1,
                borderBottomWidth: 0,
                borderColor:
                  layout === 'grid' ? colors.modal.active : colors.modal.blur,
                borderRadius: 16,
              }}>
              <Icon
                name="grid"
                size={isTablet ? 20 : 15}
                color={colors.text.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLayout('row')}
              style={{
                padding: spacing.md,
                backgroundColor:
                  layout === 'row' ? colors.modal.active : colors.modal.blur,
                borderWidth: 1,
                borderBottomWidth: 0,
                borderColor:
                  layout === 'row' ? colors.modal.active : colors.modal.blur,
                borderRadius: 16,
              }}>
              <Icon
                name="menu"
                size={isTablet ? 20 : 15}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};
