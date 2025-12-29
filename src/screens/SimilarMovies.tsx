import React, {useMemo} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import {RouteProp, useNavigation} from '@react-navigation/native';
import {HomeStackParamList} from '../types/navigation';
import {useSimilarMovies} from '../hooks/useMovies';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {Movie} from '../types/movie';
import Icon from 'react-native-vector-icons/Ionicons';
import {MovieCard} from '../components/MovieCard';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ContentItem} from '../components/MovieList';
import {GridListSkeleton} from '../components/LoadingSkeleton';
import {useResponsive} from '../hooks/useResponsive';
import {GradientSpinner} from '../components/GradientSpinner';
import LinearGradient from 'react-native-linear-gradient';
import {BlurPreference} from '../store/blurPreference';

type SimilarMoviesNavigationProp =
  NativeStackNavigationProp<HomeStackParamList>;
type SimilarMoviesRouteProp = RouteProp<HomeStackParamList, 'SimilarMovies'>;

export const SimilarMoviesScreen: React.FC = () => {
  const navigation = useNavigation<SimilarMoviesNavigationProp>();
  const {route} = navigation
    .getState()
    .routes.find(r => r.name === 'SimilarMovies') as any; // Fallback if regular access is hard
  // Better use useRoute
  return <SimilarMoviesContent />;
};

const SimilarMoviesContent = () => {
  const navigation = useNavigation<SimilarMoviesNavigationProp>();
  const route = React.useRef(
    navigation.getState().routes[navigation.getState().index],
  ).current;
  const {movieId, title} = (route?.params as any) || {};

  const {isTablet, orientation} = useResponsive();
  const {width} = useWindowDimensions();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  const {columns, cardWidth} = useMemo(() => {
    const horizontalPadding = (spacing?.sm ?? 8) * 2;
    const perCardGap = 6;
    const minCardWidth = isTablet ? 150 : 110;
    const available = Math.max(0, width - horizontalPadding);
    const perCardTotal = minCardWidth + perCardGap;
    const rawCols = Math.max(1, Math.floor(available / perCardTotal));
    const cols =
      !isTablet && orientation === 'portrait' ? Math.max(3, rawCols) : rawCols;
    const availableWidth = Math.max(
      0,
      width - horizontalPadding - cols * perCardGap,
    );
    return {
      columns: cols,
      cardWidth: cols > 0 ? availableWidth / cols : availableWidth,
    };
  }, [width, isTablet, orientation]);

  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} =
    useSimilarMovies(movieId);

  const allItems = useMemo(
    () =>
      data?.pages.flatMap(page =>
        (page?.results || []).map((m: Movie) => ({
          ...m,
          type: 'movie' as const,
        })),
      ) || [],
    [data],
  );

  const renderItem = ({item}: {item: ContentItem}) => (
    <MovieCard
      item={item}
      onPress={movie =>
        navigation.push('MovieDetails', {movie: movie as Movie})
      }
      cardWidth={cardWidth}
    />
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, 'transparent']}
        style={styles.topGradient}
      />
      <View style={styles.header}>
        <View
          style={[
            styles.headerContent,
            isSolid && {backgroundColor: colors.background.primary},
          ]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Similar to {title}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <GridListSkeleton />
        </View>
      ) : (
        <FlatList
          data={allItems}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          numColumns={columns}
          contentContainerStyle={styles.listContent}
          onEndReached={() => hasNextPage && fetchNextPage()}
          ListFooterComponent={
            isFetchingNextPage ? (
              <GradientSpinner
                size={30}
                style={styles.footerLoader}
                color={colors.modal.activeBorder}
              />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="alert-circle" size={48} color={colors.text.muted} />
              <Text style={styles.emptyText}>No similar movies found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 1,
    pointerEvents: 'none',
  },
  header: {
    marginTop: spacing.xl,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(122, 122, 122, 0.31)',
    paddingHorizontal: spacing.md,
  },
  backButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginRight: 30,
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 120,
  },
  listContent: {
    paddingTop: 120,
    paddingHorizontal: spacing.sm,
    paddingBottom: 100,
  },
  footerLoader: {
    marginVertical: 40,
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
});
