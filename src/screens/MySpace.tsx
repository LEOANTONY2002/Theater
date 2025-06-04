import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {TabParamList, MySpaceStackParamList} from '../types/navigation';
import {useUserContent} from '../hooks/useUserContent';
import {MovieList, ContentItem} from '../components/MovieList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {LanguageSettings} from '../components/LanguageSettings';
import {SettingsManager, Language} from '../store/settings';
import {useQueryClient, useQuery} from '@tanstack/react-query';
import {BlurView} from '@react-native-community/blur';
import {MovieCard} from '../components/MovieCard';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {HorizontalListSkeleton} from '../components/LoadingSkeleton';
import {ContentCard} from '../components/ContentCard';
import {SavedFilter} from '../types/filters';
import {FiltersManager} from '../store/filters';
import {RegionModal} from '../components/RegionModal';
import regionData from '../utils/region.json';
import {FilterParams} from '../types/filters';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

type MySpaceScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'MySpace'>,
  NativeStackNavigationProp<MySpaceStackParamList>
>;

interface Region {
  iso_3166_1: string;
  english_name: string;
}

export const MySpaceScreen = () => {
  const navigation = useNavigation<MySpaceScreenNavigationProp>();
  const queryClient = useQueryClient();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [filters, setFilters] = useState<FilterParams>({});
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {content: watchlist, isLoading} = useUserContent('WATCHLIST');
  const {data: selectedLanguages = [], isLoading: isLoadingLanguages} =
    useQuery<Language[]>({
      queryKey: ['selectedLanguages'],
      queryFn: SettingsManager.getContentLanguages,
      initialData: [],
    });

  const {data: savedFilters = [], isLoading: isLoadingFilters} = useQuery({
    queryKey: ['savedFilters'],
    queryFn: FiltersManager.getSavedFilters,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const {data: currentRegion} = useQuery<Region>({
    queryKey: ['region'],
    queryFn: SettingsManager.getRegion,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Add focus effect to refresh filters
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
    });

    return unsubscribe;
  }, [navigation, queryClient]);

  useEffect(() => {
    // Listen for both language and region changes
    const handleSettingsChange = () => {
      // Invalidate all queries to refetch with new settings
      queryClient.invalidateQueries();
    };

    SettingsManager.addChangeListener(handleSettingsChange);

    return () => {
      SettingsManager.removeChangeListener(handleSettingsChange);
    };
  }, [queryClient]);

  const handleMoviePress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigation.navigate('MovieDetails', {
          movie: item as Movie,
        });
      } else {
        navigation.navigate('TVShowDetails', {
          show: item as TVShow,
        });
      }
    },
    [navigation],
  );

  const handleFilterPress = useCallback(
    (filter: SavedFilter) => {
      navigation.navigate('SearchScreen', {filter});
    },
    [navigation],
  );

  const handleSortChange = (value: string) => {
    setFilters((prev: FilterParams) => ({
      ...prev,
      sort_by: `${value}.${sortOrder}`,
    }));
  };

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
      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>Watchlist</Text>
        <Ionicons
          name="chevron-forward"
          size={24}
          color={colors.text.primary}
        />
      </View>

      {isLoading ? (
        <View style={{paddingBottom: spacing.md}}>
          <HorizontalListSkeleton />
        </View>
      ) : (
        watchlist.length > 0 && (
          <View style={styles.watchlistContainer}>
            <FlatList
              data={watchlist}
              renderItem={({item}) => (
                <ContentCard item={item} onPress={handleMoviePress} />
              )}
              keyExtractor={item => `${item.id}-${item.type}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              horizontal={true}
            />
          </View>
        )
      )}

      <View>
        <TouchableOpacity
          style={styles.headerContainer}
          onPress={() => setShowLanguageModal(true)}>
          <Text style={styles.sectionTitle}>Language</Text>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.text.primary}
          />
        </TouchableOpacity>

        {isLoadingLanguages ? (
          <View style={styles.languagesContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : selectedLanguages.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.languagesContainer}
            contentContainerStyle={styles.languagesContent}>
            {selectedLanguages.map(lang => (
              <View key={lang.iso_639_1} style={styles.languageTag}>
                <Text style={styles.languageText}>{lang.english_name}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setShowRegionModal(true)}>
          <Text style={styles.sectionTitle}>Region</Text>
          <View style={styles.regionInfo}>
            <Text style={styles.regionText}>
              {currentRegion?.english_name || 'Select Region'}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.text.secondary}
            />
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.headerContainer}
        onPress={() => navigation.navigate('MyFiltersScreen')}
        testID="myFiltersButton">
        <Text style={styles.sectionTitle}>My Filters</Text>
        <Ionicons
          name="chevron-forward"
          size={24}
          color={colors.text.primary}
        />
      </TouchableOpacity>

      {isLoadingFilters ? (
        <View style={styles.filtersContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : savedFilters.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}>
          {savedFilters.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={styles.filterTag}
              onPress={() => handleFilterPress(filter)}>
              <Text style={styles.filterText}>{filter.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.filterTag, styles.addFilterTag]}
            onPress={() => navigation.navigate('MyFiltersScreen')}>
            <Ionicons name="add" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <TouchableOpacity
          style={styles.addFirstFilterButton}
          onPress={() => navigation.navigate('MyFiltersScreen')}>
          <Ionicons name="add" size={24} color={colors.text.primary} />
          <Text style={styles.addFirstFilterText}>Add your first filter</Text>
        </TouchableOpacity>
      )}

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
              overlayColor="rgba(23, 17, 42, 0.87)"
              reducedTransparencyFallbackColor="rgba(0, 0, 0, 0.5)"
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
  },
  sectionTitle: {
    color: colors.text.primary,
    ...typography.h3,
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
  },
  modalBody: {
    flex: 1,
  },
  languagesContainer: {
    marginTop: -spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  languagesContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  languageTag: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  languageText: {
    color: colors.text.primary,
    ...typography.body2,
  },
  filtersContainer: {
    marginTop: -spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  filtersContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  filterTag: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.text.primary,
    ...typography.body2,
  },
  addFilterTag: {
    paddingHorizontal: spacing.md,
  },
  addFirstFilterButton: {
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
  addFirstFilterText: {
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
    color: colors.text.secondary,
    ...typography.body1,
  },
});
