import React, {useMemo, useCallback, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import {useRoute, RouteProp, useIsFocused} from '@react-navigation/native';
import {HomeStackParamList} from '../types/navigation';
import {ContentItem} from '../components/MovieList';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {
  usePersonMovieCredits,
  usePersonTVCredits,
  usePersonDetails,
} from '../hooks/usePersonCredits';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {MovieCard} from '../components/MovieCard';
import {getImageUrl} from '../services/tmdb';
import {LinearGradient} from 'react-native-linear-gradient';
import {useNavigationState} from '../hooks/useNavigationState';
import {GridListSkeleton, HeadingSkeleton} from '../components/LoadingSkeleton';
import {GradientSpinner} from '../components/GradientSpinner';
import {useResponsive} from '../hooks/useResponsive';
import {PersonAIChatModal} from '../components/PersonAIChatModal';
import {FlatList} from 'react-native';

type PersonCreditsScreenRouteProp = RouteProp<
  HomeStackParamList,
  'PersonCredits'
>;

export const PersonCreditsScreen = () => {
  const route = useRoute<PersonCreditsScreenRouteProp>();
  const {personId, personName} = route.params;
  const {navigateWithLimit} = useNavigationState();
  const {isTablet} = useResponsive();
  const isFocused = useIsFocused();
  const columns = isTablet ? 5 : 3;
  const [isAIChatModalOpen, setIsAIChatModalOpen] = useState(false);
  const {width: screenWidth} = useWindowDimensions();
  const cardWidth = useMemo(
    () => screenWidth / columns - 8,
    [screenWidth, columns],
  );
  const cardHeight = useMemo(() => cardWidth * 1.5, [cardWidth]);

  // Get person details
  const {data: personDetails, isLoading: isLoadingDetails} =
    usePersonDetails(personId);

  // Use both hooks to get all credits
  const movieCredits = usePersonMovieCredits(personId);
  const tvCredits = usePersonTVCredits(personId);

  const isLoading =
    isLoadingDetails ||
    movieCredits.isLoading ||
    tvCredits.isLoading ||
    movieCredits.isRefetching ||
    tvCredits.isRefetching ||
    movieCredits.isFetchingNextPage ||
    tvCredits.isFetchingNextPage;

  // Transform and combine data from both sources
  const transformedData = useMemo(() => {
    const movies =
      movieCredits.data?.pages.flatMap(page =>
        page.results.map((item: Movie) => ({
          ...item,
          type: 'movie' as const,
          release_date: item.release_date || '',
        })),
      ) || [];

    const tvShows =
      tvCredits.data?.pages.flatMap(page =>
        page.results.map((item: TVShow) => ({
          ...item,
          type: 'tv' as const,
          release_date: item.first_air_date || '',
        })),
      ) || [];

    // Combine and sort by release date
    return [...movies, ...tvShows].sort((a, b) => {
      if (!a.release_date) return 1;
      if (!b.release_date) return -1;
      return (
        new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
      );
    });
  }, [movieCredits.data, tvCredits.data]);

  // Define internal item press handler
  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigateWithLimit],
  );

  const renderItem = useCallback(
    ({item}: {item: ContentItem}) => (
      <View style={styles.cardContainer}>
        <MovieCard
          item={item}
          onPress={handleItemPress}
          cardWidth={cardWidth}
        />
      </View>
    ),
    [handleItemPress, cardWidth],
  );

  const handleEndReached = () => {
    if (movieCredits.hasNextPage && !movieCredits.isFetchingNextPage) {
      movieCredits.fetchNextPage();
    }
    if (tvCredits.hasNextPage && !tvCredits.isFetchingNextPage) {
      tvCredits.fetchNextPage();
    }
  };

  // Avoid console logs in render path to reduce jank

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: isTablet ? 200 : 120,
      paddingBottom: spacing.xxl,
      zIndex: 1,
    },
    titleContainer: {
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    title: {
      ...typography.h1,
      color: colors.text.primary,
    },
    subtitle: {
      ...typography.body1,
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },
    listContent: {
      paddingBottom: 120,
    },
    cardContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      // Avoid forcing fractional flex that creates space-between gaps
      flexGrow: 0,
    },
    columnWrapper: {
      justifyContent: 'center',
    },
    footerLoader: {
      paddingVertical: spacing.xl,
      alignItems: 'center',
    },
    footerSpace: {
      height: 100,
    },
    loadingIndicatorContainer: {
      height: 50,
      alignItems: 'center',
      width: '100%',
    },
    loadingText: {
      color: colors.text.primary,
      marginTop: spacing.md,
      ...typography.body1,
    },
    emptyContainer: {
      padding: spacing.xxl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      ...typography.body1,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    fullScreenLoader: {
      flex: 1,
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(10, 10, 26, 0.85)',
    },
    loadingTitle: {
      ...typography.h3,
      color: colors.text.primary,
      marginTop: spacing.md,
    },
    loadingSubtitle: {
      ...typography.body2,
      color: colors.text.secondary,
      marginTop: spacing.xs,
    },
    profileContainer: {
      height: isTablet ? 700 : 400,
      width: '70%',
      position: 'absolute',
      top: 0,
      right: 0,
      zIndex: 0,
    },
    profileImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    profileGradient: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      width: '100%',
      height: '100%',
    },
    profileGradientHorizontal: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
  });

  // If not focused, avoid rendering heavy content
  if (!isFocused) {
    return <View style={styles.container} />;
  }

  // Only render content after renderPhase allows it
  if (movieCredits.isLoading || tvCredits.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{personName}</Text>
            {personDetails?.place_of_birth ? (
              <Text style={styles.subtitle}>
                {personDetails.place_of_birth}
              </Text>
            ) : (
              <View style={{marginLeft: -spacing.md, marginTop: spacing.xs}}>
                <HeadingSkeleton />
              </View>
            )}
          </View>
        </View>
        <GridListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PersonAIChatModal
        visible={isAIChatModalOpen}
        onClose={() => setIsAIChatModalOpen(false)}
        personName={personName}
        biography={personDetails?.biography}
        knownForDepartment={(personDetails as any)?.known_for_department}
        birthDate={(personDetails as any)?.birthday}
        birthPlace={(personDetails as any)?.place_of_birth}
        alsoKnownAs={(personDetails as any)?.also_known_as}
      />
      <LinearGradient
        colors={['rgba(142, 4, 255, 0.46)', 'rgba(255, 4, 125, 0.65)']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={{
          position: 'absolute',
          bottom: isTablet ? 60 : 100,
          right: 36,
          width: 60,
          height: 60,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: borderRadius.round,
          overflow: 'hidden',
          elevation: 5,
          shadowColor: 'rgba(46, 1, 39, 0.48)',
          shadowOffset: {width: 0, height: 0},
          shadowRadius: 10,
        }}>
        <TouchableOpacity
          onPress={() => setIsAIChatModalOpen(true)}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: borderRadius.round,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 15, 15, 0.84)',
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.13)',
          }}
          activeOpacity={0.7}>
          <Image
            source={require('../assets/theaterai.webp')}
            style={{width: 30, height: 20}}
          />
        </TouchableOpacity>
      </LinearGradient>
      <View style={styles.profileContainer}>
        <FastImage
          source={{
            uri: getImageUrl(
              personDetails?.profile_path || '',
              isTablet ? 'original' : 'w185',
            ),
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.immutable,
          }}
          style={styles.profileImage}
          resizeMode={FastImage.resizeMode.cover}
        />
        <LinearGradient
          colors={['transparent', colors.background.primary]}
          style={styles.profileGradient}
        />
        <LinearGradient
          colors={['transparent', colors.background.primary]}
          style={styles.profileGradient}
        />
        <LinearGradient
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          colors={[colors.background.primary, 'transparent']}
          style={styles.profileGradientHorizontal}
        />
        <LinearGradient
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          colors={[colors.background.primary, 'transparent']}
          style={styles.profileGradientHorizontal}
        />
      </View>

      <FlatList
        key={`credits-grid-${columns}`}
        data={transformedData}
        renderItem={renderItem}
        keyExtractor={item => `${item.type}-${item.id}`}
        numColumns={columns}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{personName}</Text>
              <Text style={styles.subtitle}>
                {personDetails?.place_of_birth}
              </Text>
            </View>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footerLoader}>
            {(movieCredits.isFetchingNextPage ||
              tvCredits.isFetchingNextPage) && (
              <View style={styles.loadingIndicatorContainer}>
                <GradientSpinner
                  size={30}
                  style={{
                    marginVertical: 50,
                    alignItems: 'center',
                    alignSelf: 'center',
                  }}
                  color={colors.modal.activeBorder}
                />
              </View>
            )}
            <View style={styles.footerSpace} />
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No items found</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};
