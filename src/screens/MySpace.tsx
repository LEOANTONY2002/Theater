import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {TabParamList, MySpaceStackParamList} from '../types/navigation';
import {ContentItem} from '../components/MovieList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {LanguageSettings} from '../components/LanguageSettings';
import {SettingsManager, Language} from '../store/settings';
import {useQueryClient, useQuery} from '@tanstack/react-query';
import {BlurView} from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  HorizontalListSkeleton,
  LanguageSkeleton,
} from '../components/LoadingSkeleton';
import {ContentCard} from '../components/ContentCard';
import {SavedFilter} from '../types/filters';
import {FiltersManager} from '../store/filters';
import {RegionModal} from '../components/RegionModal';
import regionData from '../utils/region.json';
import LinearGradient from 'react-native-linear-gradient';
import {useSelectedLanguages} from '../hooks/useApp';
import {useWatchlists} from '../hooks/useWatchlists';
import {Watchlist} from '../store/watchlists';
import {useNavigationState} from '../hooks/useNavigationState';

type MySpaceScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'MySpace'>,
  NativeStackNavigationProp<MySpaceStackParamList>
>;

interface Region {
  iso_3166_1: string;
  english_name: string;
  native_name?: string;
}

export const MySpaceScreen = () => {
  const navigation = useNavigation<MySpaceScreenNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const queryClient = useQueryClient();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);

  const {data: watchlists = [], isLoading: isLoadingWatchlists} =
    useWatchlists();
  const {data: selectedLanguages, isLoading: isLoadingLanguages} =
    useSelectedLanguages();

  const {data: savedFilters = [], isLoading: isLoadingFilters} = useQuery({
    queryKey: ['savedFilters'],
    queryFn: FiltersManager.getSavedFilters,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const {data: currentRegion} = useQuery<Region>({
    queryKey: ['region'],
    queryFn: SettingsManager.getRegion,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Add focus effect to refresh filters
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
      queryClient.invalidateQueries({queryKey: ['watchlists']});
    });

    return unsubscribe;
  }, [navigation, queryClient]);

  useEffect(() => {
    // Listen for both language and region changes
    const handleSettingsChange = () => {
      // Only invalidate specific queries that depend on settings
      queryClient.invalidateQueries({queryKey: ['selectedLanguages']});
      queryClient.invalidateQueries({queryKey: ['region']});
      queryClient.invalidateQueries({
        queryKey: ['top_10_movies_today_by_region'],
      });
      queryClient.invalidateQueries({
        queryKey: ['top_10_shows_today_by_region'],
      });
    };

    SettingsManager.addChangeListener(handleSettingsChange);

    return () => {
      SettingsManager.removeChangeListener(handleSettingsChange);
    };
  }, [queryClient]);

  const handleWatchlistPress = useCallback(
    (watchlist: Watchlist) => {
      navigateWithLimit('WatchlistDetails', {watchlistId: watchlist.id});
    },
    [navigateWithLimit],
  );

  const handleFilterPress = useCallback(
    (filter: SavedFilter) => {
      navigateWithLimit('SearchScreen', {filter});
    },
    [navigateWithLimit],
  );

  const handleRegionSelect = async (region: Region) => {
    try {
      setShowRegionModal(false);
      await SettingsManager.setRegion(region);

      // Force an immediate refetch of the region-dependent queries
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: ['top_10_movies_today_by_region'],
        }),
        queryClient.refetchQueries({
          queryKey: ['top_10_shows_today_by_region'],
        }),
        queryClient.refetchQueries({queryKey: ['watchProviders']}),
      ]);
    } catch (error) {
      console.error('Error setting region:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{padding: spacing.md, marginBottom: -30}}>
        <Text style={{color: colors.text.primary, flex: 1}}>My Space</Text>
      </View>
      <TouchableOpacity
        style={styles.headerContainer}
        onPress={() => navigateWithLimit('WatchlistsScreen')}
        testID="watchlistsHeader">
        <Text style={styles.sectionTitle}>Watchlists</Text>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={colors.text.primary}
        />
      </TouchableOpacity>

      {isLoadingWatchlists ? (
        <View style={{paddingBottom: spacing.md}}>
          <LanguageSkeleton />
        </View>
      ) : watchlists.length > 0 ? (
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagContainer}
            contentContainerStyle={styles.tagContent}>
            {watchlists.map(watchlist => (
              <TouchableOpacity
                key={watchlist.id}
                style={styles.tag}
                onPress={() => handleWatchlistPress(watchlist)}>
                <LinearGradient
                  colors={colors.gradient.primary}
                  style={styles.tagGradient}
                />
                <Text style={styles.tagText} numberOfLines={1}>
                  {watchlist.name}
                </Text>
                <Text style={styles.tagSubText} numberOfLines={1}>
                  {watchlist.itemCount}{' '}
                  {watchlist.itemCount === 1 ? 'item' : 'items'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.headerContainer}
        onPress={() => setShowRegionModal(true)}>
        <Text style={styles.sectionTitle}>Region</Text>
        <View style={styles.regionInfo}>
          <Text style={styles.regionText}>
            {currentRegion?.english_name || 'Select Region'}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.text.primary}
          />
        </View>
      </TouchableOpacity>

      <View>
        <TouchableOpacity
          style={styles.headerContainer}
          onPress={() => setShowLanguageModal(true)}>
          <Text style={styles.sectionTitle}>Languages</Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.text.primary}
          />
        </TouchableOpacity>

        {isLoadingLanguages ? (
          <LanguageSkeleton />
        ) : selectedLanguages && selectedLanguages.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagContainer}
            contentContainerStyle={styles.tagContent}>
            {selectedLanguages.map(lang => (
              <View key={lang.iso_639_1} style={styles.tag}>
                <LinearGradient
                  colors={colors.gradient.primary}
                  style={styles.tagGradient}
                />
                <Text style={styles.tagText} numberOfLines={1}>
                  {lang.english_name}
                </Text>
                {lang.name && (
                  <Text style={styles.tagSubText} numberOfLines={1}>
                    {lang.name}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.headerContainer}
        onPress={() => navigateWithLimit('MyFiltersScreen')}
        testID="myFiltersButton">
        <Text style={styles.sectionTitle}>My Filters</Text>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={colors.text.primary}
        />
      </TouchableOpacity>

      {isLoadingFilters ? (
        <LanguageSkeleton />
      ) : savedFilters.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagContainer}
          contentContainerStyle={styles.tagContent}>
          {savedFilters.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={styles.tag}
              onPress={() => handleFilterPress(filter)}>
              <LinearGradient
                colors={colors.gradient.primary}
                style={styles.tagGradient}
              />
              <Text style={styles.tagText} numberOfLines={1}>
                {filter.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addTag}
            onPress={() => navigateWithLimit('MyFiltersScreen')}>
            <Ionicons name="add" size={30} color={'rgba(255, 255, 255, 0.3)'} />
          </TouchableOpacity>
        </ScrollView>
      ) : null}

      <Modal
        visible={showLanguageModal}
        animationType="slide"
        statusBarTranslucent={true}
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={10}
              overlayColor={colors.modal.blur}
            />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Language Settings</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <LanguageSettings />
            </View>
          </View>
        </View>
      </Modal>

      <RegionModal
        visible={showRegionModal}
        onClose={() => setShowRegionModal(false)}
        regions={regionData}
        selectedRegion={currentRegion?.iso_3166_1}
        onSelectRegion={handleRegionSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingVertical: spacing.xxl,
    height: '100%',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.background.secondary,
  },
  sectionTitle: {
    color: colors.text.secondary,
    flex: 1,
    fontWeight: 100,
  },
  watchlistContainer: {
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 1, 3, 0.28)',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    height: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  modalTitle: {
    color: colors.text.primary,
    ...typography.h3,
    paddingVertical: spacing.sm,
  },
  modalBody: {
    flex: 1,
  },
  tagContainer: {
    marginTop: -spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  tagContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  tag: {
    backgroundColor: colors.background.tag,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.lg,
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 75,
    marginTop: 25,
    zIndex: 1,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  tagText: {
    color: colors.text.primary,
    ...typography.h2,
    fontWeight: '900',
    opacity: 0.3,
    textAlign: 'center',
  },
  tagSubText: {
    color: colors.text.secondary,
    ...typography.body2,
    opacity: 0.3,
    textAlign: 'center',
  },
  addTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.lg,
    width: 100,
    height: 100,
    alignItems: 'center',
  },
  addFirstTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addFirstTagText: {
    color: colors.text.primary,
    ...typography.body2,
  },
  section: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  regionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  regionText: {
    color: colors.text.muted,
    ...typography.body2,
    marginBottom: 2,
  },
});
