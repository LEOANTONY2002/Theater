import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {SavedFilter} from '../types/filters';
import {FiltersManager} from '../store/filters';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {MyFiltersModal} from '../components/MyFiltersModal';
import LinearGradient from 'react-native-linear-gradient';
import languageData from '../utils/language.json';
import {Genre} from '../types/movie';
import {getGenres} from '../services/tmdb';
import {HorizontalListSkeleton} from '../components/LoadingSkeleton';
import CreateButton from '../components/createButton';
import {HorizontalList} from '../components/HorizontalList';
import {useSavedFilterContent} from '../hooks/useApp';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BlurView} from '@react-native-community/blur';
import {Animated, Easing} from 'react-native';
import {useResponsive} from '../hooks/useResponsive';

export const MyFiltersScreen = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);
  const navigation = useNavigation();
  const {isTablet, orientation} = useResponsive();

  // Animated values for scroll
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const headerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const id = scrollY.addListener(({value}) => {
      Animated.timing(headerAnim, {
        toValue: value,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // must be false for margin/background
      }).start();
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, headerAnim]);

  // Interpolated styles for the animated header
  const animatedHeaderStyle = {
    // marginTop: headerAnim.interpolate({
    //   inputRange: [0, 40],
    //   outputRange: [spacing.md, spacing.xl],
    //   extrapolate: 'clamp',
    // }),
    marginHorizontal: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [spacing.md, spacing.lg],
      extrapolate: 'clamp',
    }),
    marginBottom: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [spacing.md, spacing.lg],
      extrapolate: 'clamp',
    }),
    borderRadius: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [16, 24],
      extrapolate: 'clamp',
    }),
  };
  const blurOpacity = headerAnim.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const {data: savedFilters = [], isLoading} = useQuery({
    queryKey: ['savedFilters'],
    queryFn: FiltersManager.getSavedFilters,
  });

  console.log('savedFilters', savedFilters, 'isLoading', isLoading);

  const handleSaveFilter = useCallback(
    (filter: SavedFilter) => {
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
    },
    [queryClient],
  );

  const handleDelete = useCallback(
    (id: string) => {
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
    },
    [queryClient],
  );

  const [allGenres, setAllGenres] = useState<Genre[]>([]);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const [movieGenresData, tvGenresData] = await Promise.all([
          getGenres('movie'),
          getGenres('tv'),
        ]);
        const uniqueGenres = [...movieGenresData, ...tvGenresData].filter(
          (genre, index, self) =>
            index === self.findIndex(t => t.id === genre.id),
        );
        setAllGenres(uniqueGenres);
      } catch (error) {
        console.error('Error loading genres:', error);
      }
    };

    fetchGenres();
  }, []);

  const styles = StyleSheet.create({
    container: {
      height: '100%',
      backgroundColor: colors.background.primary,
      paddingTop: spacing.xxl,
      paddingBottom: 200,
      position: 'relative',
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      overflow: 'hidden',
      marginTop: 50,
    },
    title: {
      flex: 1, // <-- Add this
      textAlign: 'center',
      color: colors.text.primary,
      ...typography.h2,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      height: 40,
      width: 40,
      zIndex: 1,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: 100, // Make sure this is at least the header height
      paddingBottom: 150,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: isTablet && orientation === 'landscape' ? '20%' : '60%',
      paddingBottom: 200,
    },
    emptyStateTitle: {
      ...typography.h3,
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    emptyStateText: {
      ...typography.body1,
      color: colors.text.secondary,
    },
    filterItem: {
      backgroundColor: colors.background.tertiary,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.border,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      position: 'relative',
      height: isTablet ? 500 : 380,
      marginBottom: 10,
      zIndex: 0,
    },
    filterHeader: {
      flexDirection: 'column',
      marginBottom: spacing.sm,
    },
    filterName: {
      color: colors.text.primary,
      ...typography.h3,
    },
    filterContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    card: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      backgroundColor: colors.background.card,
      borderWidth: 1,
      borderColor: colors.modal.content,
      borderRadius: borderRadius.md,
      width: 80,
      height: 80,
      padding: spacing.xs,
      zIndex: 1,
    },
    cardSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.background.card,
      borderRadius: borderRadius.sm,
      width: 80,
      height: 35,
      padding: spacing.xs,
    },
    cardText: {
      color: colors.text.secondary,
      ...typography.body1,
    },
    genreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    genreText: {
      color: colors.text.muted,
      ...typography.body2,
    },
    listContainer: {
      position: 'relative',
      width: '120%',
      overflow: 'scroll',
      bottom: 10,
      left: -30,
      zIndex: 1,
    },
  });

  const MyFilterItemWithResults = ({
    filter,
    allGenres,
    onEdit,
  }: {
    filter: SavedFilter;
    allGenres: Genre[];
    onEdit: (f: SavedFilter) => void;
  }) => {
    const type = filter?.type;
    const sortBy = filter?.params?.sort_by?.split('.')[0][0];
    const sortOrder = filter?.params?.sort_by?.split('.')[1];
    const rating = filter?.params?.['vote_average.gte'];
    const language = filter?.params?.with_original_language
      ? languageData.find(
          (l: any) => l.iso_639_1 === filter?.params?.with_original_language,
        )
      : null;
    const genres = filter?.params?.with_genres;
    const genreNames = genres
      ?.split(',')
      .map(id => allGenres.find(genre => genre.id === parseInt(id))?.name)
      .join(', ');
    const fromDate =
      filter?.params?.['primary_release_date.gte'] ||
      filter?.params?.['first_air_date.gte'];
    const toDate =
      filter?.params?.['primary_release_date.lte'] ||
      filter?.params?.['first_air_date.lte'];
    const fromYear = fromDate ? new Date(fromDate).getFullYear() : null;
    const toYear = toDate ? new Date(toDate).getFullYear() : null;

    // Fetch filter content for this filter
    const {
      data: filterContent,
      isLoading: isLoadingFilterContent,
      fetchNextPage: fetchNextFilterPage,
      hasNextPage: hasNextFilterPage,
      isFetchingNextPage: isFetchingNextFilterPage,
    } = useSavedFilterContent(filter);
    // Flatten all pages for infinite scrolling
    const flattenedData =
      filterContent?.pages?.flatMap(page => page?.results || []) || [];

    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const handleItemPress = (item: any) => {
      console.log('Item pressed:', item);

      if (item.type === 'movie') {
        navigation.push('MovieDetails', {movie: item});
      } else if (item.type === 'tv') {
        navigation.push('TVShowDetails', {show: item});
      }
    };

    return (
      <View
        key={filter.id}
        style={{marginBottom: spacing.xl, position: 'relative'}}>
        <View style={styles.filterItem}>
          <LinearGradient
            colors={['transparent', colors.background.primary]}
            pointerEvents="none"
            style={{
              width: isTablet ? '350%' : '250%',
              height: isTablet ? '260%' : '200%',
              position: 'absolute',
              bottom: 0,
              left: isTablet ? -150 : -120,
              paddingHorizontal: 10,
              zIndex: 0,
              transform: [{rotate: '-11deg'}],
            }}
            start={{x: 0, y: 0}}
            end={{x: 0, y: 1}}
          />
          <View style={styles.filterHeader}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text style={styles.filterName}>{filter.name}</Text>
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  padding: 5,
                }}
                activeOpacity={0.9}
                onPress={() => onEdit(filter)}>
                <Ionicons
                  name="pencil-outline"
                  size={15}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
            </View>
            {genreNames && (
              <View style={styles.genreContainer}>
                <Text style={styles.genreText} numberOfLines={1}>
                  {genreNames}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.filterContent}>
            {type && (
              <View style={styles.card}>
                <Ionicons
                  name={
                    type === 'movie'
                      ? 'film-outline'
                      : type === 'tv'
                      ? 'tv-outline'
                      : 'apps-outline'
                  }
                  size={15}
                  color={colors.text.primary}
                />
                <Text style={styles.cardText} numberOfLines={1}>
                  {type?.charAt(0).toUpperCase() + type?.slice(1)}
                </Text>
              </View>
            )}
            {sortBy && rating && language && (fromYear || toYear) ? (
              <View
                style={{
                  flexDirection: 'column',
                  gap: spacing.sm,
                  alignItems: 'flex-start',
                }}>
                {sortBy && (
                  <View style={styles.cardSmall}>
                    <Ionicons
                      name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
                      size={15}
                      color={colors.text.primary}
                    />
                    <Text style={styles.cardText} numberOfLines={1}>
                      {sortBy.toString()}
                    </Text>
                  </View>
                )}
                {rating && (
                  <View style={styles.cardSmall}>
                    <Ionicons
                      name="star"
                      size={15}
                      color={colors.text.primary}
                    />
                    <Text style={styles.cardText} numberOfLines={1}>
                      {rating.toString()}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <>
                {sortBy && (
                  <View style={styles.card}>
                    <Ionicons
                      name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
                      size={15}
                      color={colors.text.primary}
                    />
                    <Text style={styles.cardText} numberOfLines={1}>
                      {sortBy.toString()}
                    </Text>
                  </View>
                )}
                {rating && (
                  <View style={styles.card}>
                    <Ionicons
                      name="star"
                      size={15}
                      color={colors.text.primary}
                    />
                    <Text style={styles.cardText} numberOfLines={1}>
                      {rating.toString()}
                    </Text>
                  </View>
                )}
              </>
            )}
            {language && (
              <View style={styles.card}>
                <Ionicons
                  name="language"
                  size={15}
                  color={colors.text.primary}
                />
                <Text style={styles.cardText} numberOfLines={1}>
                  {language?.name || language?.english_name}
                </Text>
              </View>
            )}
            {fromYear && toYear ? (
              <View style={{flexDirection: 'column', gap: spacing.sm}}>
                <View style={styles.cardSmall}>
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={colors.text.primary}
                  />
                  <Text style={styles.cardText} numberOfLines={1}>
                    {fromYear}
                  </Text>
                </View>
                <View style={styles.cardSmall}>
                  <Text style={styles.cardText} numberOfLines={1}>
                    {toYear}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={colors.text.primary}
                  />
                </View>
              </View>
            ) : fromYear && !toYear ? (
              <View style={styles.card}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={colors.text.primary}
                />
                <Text style={styles.cardText} numberOfLines={1}>
                  {fromYear}
                </Text>
              </View>
            ) : toYear && !fromYear ? (
              <View style={styles.card}>
                <Text style={styles.cardText} numberOfLines={1}>
                  {toYear}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={colors.text.primary}
                />
              </View>
            ) : null}
          </View>
          {/* HorizontalList of filter search results */}
          <View style={styles.listContainer}>
            <HorizontalList
              title={''}
              data={flattenedData}
              isLoading={isFetchingNextFilterPage}
              onItemPress={handleItemPress}
              onEndReached={hasNextFilterPage ? fetchNextFilterPage : undefined}
              isSeeAll={false}
              isFilter={true}
              isHeadingSkeleton={false}
            />
            <LinearGradient
              colors={['transparent', colors.background.primary]}
              pointerEvents="none"
              style={{
                width: '100%',
                height: 200,
                position: 'absolute',
                bottom: 20,
                zIndex: 1,
                opacity: 0.9,
              }}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{flex: 1}}>
      <Animated.View style={[styles.header, animatedHeaderStyle]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, {opacity: blurOpacity, zIndex: 0}]}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={16}
            overlayColor={colors.modal?.blur || 'rgba(255,255,255,0.11)'}
            reducedTransparencyFallbackColor={
              colors.modal?.blur || 'rgba(255,255,255,0.11)'
            }
            pointerEvents="none"
          />
        </Animated.View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
          }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.goBack()}>
            <Ionicons
              name="chevron-back-outline"
              size={24}
              color={colors.text.primary}
            />
          </TouchableOpacity>
          <Text style={styles.title}>My Filters</Text>
          {savedFilters.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}>
              <Ionicons name="add" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
      <Animated.ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: false},
        )}>
        {isLoading ? (
          <View>
            <HorizontalListSkeleton />
          </View>
        ) : savedFilters.length > 0 ? (
          <View style={styles.content}>
            {savedFilters.map(filter => (
              <MyFilterItemWithResults
                key={filter.id}
                filter={filter}
                allGenres={allGenres}
                onEdit={setEditingFilter}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyStateTitle}>No Filters Yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first filter to apply on the search
            </Text>
            <CreateButton
              onPress={() => setShowAddModal(true)}
              title="Create Your First Filter"
              icon="add"
            />
          </View>
        )}
        <MyFiltersModal
          visible={showAddModal || !!editingFilter}
          onClose={() => {
            setShowAddModal(false);
            setEditingFilter(null);
          }}
          onSave={handleSaveFilter}
          editingFilter={editingFilter}
          onDelete={handleDelete}
        />
      </Animated.ScrollView>
    </View>
  );
};
