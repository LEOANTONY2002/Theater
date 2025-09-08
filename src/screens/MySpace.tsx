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
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MySpaceStackParamList} from '../types/navigation';
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
import packageJson from '../../package.json';
import {AISettingsManager} from '../store/aiSettings';
import {useResponsive} from '../hooks/useResponsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MoodQuestionnaire} from '../components/MoodQuestionnaire';
import {useAIEnabled} from '../hooks/useAIEnabled';

type MySpaceScreenNavigationProp =
  NativeStackNavigationProp<MySpaceStackParamList>;

interface Region {
  iso_3166_1: string;
  english_name: string;
  native_name?: string;
}

export const MySpaceScreen = React.memo(() => {
  const navigation = useNavigation<MySpaceScreenNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const {isAIEnabled} = useAIEnabled();
  const queryClient = useQueryClient();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showAINotEnabledModal, setShowAINotEnabledModal] = useState(false);
  const [moodAnswers, setMoodAnswers] = useState<{[key: string]: string}>({});
  const [lastMoodUpdate, setLastMoodUpdate] = useState<string>('');
  const {isTablet} = useResponsive();

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

  console.log('savedFilters', savedFilters);

  const {data: currentRegion} = useQuery<Region>({
    queryKey: ['region'],
    queryFn: SettingsManager.getRegion,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const {data: aiSettings} = useQuery({
    queryKey: ['aiSettings'],
    queryFn: AISettingsManager.getSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // Load mood answers on component mount
  useEffect(() => {
    loadMoodAnswers();
  }, []);

  // Add focus effect to refresh filters
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      loadMoodAnswers(); // Refresh mood answers when screen comes into focus
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

  const loadMoodAnswers = async () => {
    try {
      const preferences = await AsyncStorage.getItem(
        '@theater_user_preferences',
      );
      if (preferences) {
        const parsed = JSON.parse(preferences);
        if (parsed.moodAnswers) {
          setMoodAnswers(parsed.moodAnswers);
          if (parsed.timestamp) {
            const date = new Date(parsed.timestamp);
            setLastMoodUpdate(date.toLocaleDateString());
          }
        }
      }
    } catch (error) {
      console.error('Error loading mood answers:', error);
    }
  };

  const getMoodSummary = () => {
    const answers = Object.values(moodAnswers);
    if (answers.length === 0) return 'Not set';
    return answers.join(' • ');
  };

  const handleUpdateMood = () => {
    setShowMoodModal(true);
  };

  const handleMoodComplete = async (newMoodAnswers: {
    [key: string]: string;
  }) => {
    try {
      // Clear old data first
      await AsyncStorage.multiRemove([
        '@theater_user_preferences',
        '@theater_user_feedback',
        '@theater_next_watch_onboarding',
      ]);

      // Save fresh mood data
      const preferences = {
        moodAnswers: newMoodAnswers,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        '@theater_user_preferences',
        JSON.stringify(preferences),
      );
      await AsyncStorage.setItem('@theater_next_watch_onboarding', 'true');

      // Update local state
      setMoodAnswers(newMoodAnswers);
      const date = new Date();
      setLastMoodUpdate(date.toLocaleDateString());

      // Invalidate all mood-related queries to force fresh data
      queryClient.invalidateQueries({queryKey: ['mood']});
      queryClient.invalidateQueries({queryKey: ['recommendations']});
      queryClient.invalidateQueries({queryKey: ['userPreferences']});

      // Force refresh of all screens that depend on mood data
      queryClient.refetchQueries({queryKey: ['mood']});
      queryClient.refetchQueries({queryKey: ['recommendations']});
      queryClient.refetchQueries({queryKey: ['userPreferences']});

      setShowMoodModal(false);

      // Store a flag to indicate mood was updated
      await AsyncStorage.setItem('@theater_mood_updated', 'true');
    } catch (error) {
      console.error('Error updating mood preferences:', error);
    }
  };

  const handleMoodCancel = () => {
    setShowMoodModal(false);
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
      padding: isTablet ? spacing.lg : spacing.md,
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
      fontWeight: 400,
      fontFamily: 'Inter',
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
    footerContainer: {
      marginTop: 100,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      borderTopWidth: 1,
      alignItems: 'center',
      marginBottom: 150,
      gap: spacing.xs,
    },
    footerText: {
      color: colors.text.tertiary || '#aaa',
      fontSize: 12,
      flex: 1,
      textAlign: 'center',
      marginRight: 8,
      fontFamily: 'Inter',
    },
    tmdbLogoWrapper: {
      padding: 2,
      borderRadius: 4,
    },
    tmdbLogo: {
      width: 30,
      height: 30,
    },
    privacyLink: {
      marginTop: 2,
    },
    privacyText: {
      color: colors.text.secondary,
      fontSize: 13,
      textAlign: 'center',
      fontFamily: 'Inter',
    },
    privacyContent: {
      padding: spacing.md,
      color: colors.text.primary,
      ...typography.body1,
    },
    privacySectionTitle: {
      color: colors.text.primary,
      ...typography.h3,
      marginBottom: spacing.sm,
    },
    versionText: {
      color: colors.text.tertiary,
      fontSize: 12,
      textAlign: 'center',
      marginTop: spacing.xs,
      fontFamily: 'Inter',
    },
    closeButton: {
      padding: spacing.xs,
    },
    modalText: {
      color: colors.text.primary,
      ...typography.body1,
      textAlign: 'center',
      lineHeight: 22,
    },
    button: {
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    gradientButton: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: colors.text.primary,
      ...typography.button,
      fontWeight: '600',
    },
    // Dialog styles matching onboarding AI setup
    dialogOverlay: {
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      marginHorizontal: spacing.md,
    },
    dialogCard: {
      width: '100%',
      borderRadius: borderRadius.lg,
      backgroundColor: colors.modal.content,
      borderWidth: 1,
      borderColor: colors.modal.border,
      padding: spacing.lg,
    },
    dialogHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    dialogTitle: {
      ...typography.h3,
      color: colors.text.primary,
      marginBottom: spacing.xs,
    },
    dialogMessage: {
      ...typography.body1,
      color: colors.text.secondary,
      marginBottom: spacing.lg,
    },
    dialogButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    dialogSecondaryButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dialogSecondaryButtonText: {
      ...typography.button,
      color: colors.text.secondary,
      fontWeight: '500',
    },
    dialogPrimaryButtonText: {
      ...typography.button,
      fontWeight: '600',
      color: colors.text.primary,
    },
  });

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <View style={{padding: spacing.md}}>
        <Text
          style={{
            color: colors.text.primary,
            ...typography.h2,
            marginBottom: 10,
          }}>
          My Space
        </Text>
      </View>
      <TouchableOpacity
        style={styles.headerContainer}
        activeOpacity={0.9}
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
              <View key={watchlist.id} style={styles.tag}>
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
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.headerContainer}
        activeOpacity={0.9}
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
        <View style={{paddingBottom: spacing.md}}>
          <LanguageSkeleton />
        </View>
      ) : savedFilters.length > 0 ? (
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 10,
            flexWrap: 'nowrap',
            overflow: 'scroll',
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.md,
          }}>
          {savedFilters.map(filter => (
            <View key={filter.id} style={styles.tag}>
              <LinearGradient
                colors={colors.gradient.primary}
                style={styles.tagGradient}
              />
              <Text style={styles.tagText} numberOfLines={1}>
                {filter.name}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* AI Settings Section */}
      <TouchableOpacity
        style={styles.headerContainer}
        activeOpacity={0.9}
        onPress={() => navigateWithLimit('AISettingsScreen')}
        testID="aiSettingsButton">
        <Text style={styles.sectionTitle}>AI Settings</Text>
        <View style={styles.regionInfo}>
          {aiSettings && (
            <Text style={styles.regionText} numberOfLines={1}>
              {aiSettings.model}
            </Text>
          )}
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.text.primary}
          />
        </View>
      </TouchableOpacity>

      {/* Mood Settings Section */}
      {/* <TouchableOpacity
        style={styles.headerContainer}
        activeOpacity={0.9}
        onPress={handleUpdateMood}
        testID="moodSettingsButton">
        <View style={{flex: 1}}>
          <Text style={styles.sectionTitle}>My Mood & Preferences</Text>
          <Text style={[styles.regionText, {marginTop: 2}]} numberOfLines={2}>
            {getMoodSummary()}
          </Text>
          {lastMoodUpdate && (
            <Text style={[styles.regionText, {fontSize: 11, opacity: 0.7}]}>
              Updated {lastMoodUpdate}
            </Text>
          )}
        </View>
        <Ionicons name="refresh" size={16} color={colors.accent} />
      </TouchableOpacity> */}

      {/* Ask AI Section */}
      <View style={{position: 'relative', overflow: 'hidden'}}>
        <LinearGradient
          colors={['rgb(122, 9, 88)', 'rgb(99, 14, 133)']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={{
            position: 'absolute',
            top: 0,
            left: spacing.md,
            right: spacing.md,
            bottom: 15,
            borderRadius: 12,
            zIndex: -1,
          }}
        />
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.headerContainer,
            {
              backgroundColor: 'rgba(19, 19, 25, 0.7)',
              borderRadius: borderRadius.md,
              padding: spacing.md,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              borderWidth: 3,
              borderColor: colors.modal.blur,
            },
          ]}
          onPress={() => {
            if (isAIEnabled) {
              navigateWithLimit('OnlineAIScreen');
            } else {
              setShowAINotEnabledModal(true);
            }
          }}
          testID="askAIHeader">
          <Text style={[styles.sectionTitle, {color: colors.accent}]}>
            Theater AI
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.headerContainer}
        activeOpacity={0.9}
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
          activeOpacity={0.9}
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
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setShowLanguageModal(false)}>
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

      {/* Footer: TMDB Attribution & Privacy Policy */}
      <View style={styles.footerContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            // Open TMDB website
            const url = 'https://www.themoviedb.org/';
            const Linking = require('react-native').Linking;
            Linking.openURL(url);
          }}
          accessibilityLabel="Visit TMDB website"
          style={styles.tmdbLogoWrapper}>
          <Image
            source={require('../assets/tmdb.webp')}
            style={styles.tmdbLogo}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.footerText}>
          This app uses the TMDB API but is not endorsed or certified by TMDB.
        </Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            setShowPrivacyModal(true);
          }}
          style={styles.privacyLink}>
          <Text style={styles.privacyText}>Privacy Policy</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>
          App Version {packageJson.version}
        </Text>
      </View>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        statusBarTranslucent={true}
        transparent={true}
        onRequestClose={() => setShowPrivacyModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={10}
              overlayColor={colors.modal.blurDark}
            />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy Policy</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setShowPrivacyModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.privacyContent}>
                <Text style={styles.privacySectionTitle}>
                  Privacy Policy for Theater App{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>
                  Information We Collect{'\n'}
                </Text>
                <Text style={styles.privacyText}>
                  Theater does not collect, store, or transmit any personal
                  information from users. We do not track your browsing history,
                  personal preferences, or any other identifiable data.{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>Data Usage{'\n'}</Text>
                <Text style={styles.privacyText}>
                  The app displays movie and TV show information sourced from
                  The Movie Database (TMDB) API. All content is provided by TMDB
                  and we do not store or cache any user-specific data.{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>
                  Third-Party Services{'\n'}
                </Text>
                <Text style={styles.privacyText}>
                  This app uses the TMDB API to provide movie and TV show
                  information. Please refer to TMDB's privacy policy for
                  information about how they handle data.{'\n\n'}
                </Text>

                <Text style={styles.privacySectionTitle}>Contact{'\n'}</Text>
                <Text style={styles.privacyText}>
                  If you have any questions about this privacy policy, please
                  contact us through the app store.{'\n\n'}
                </Text>

                <Text style={styles.privacyText}>
                  Last updated: {new Date().toLocaleDateString()}
                </Text>
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Mood Settings Modal */}
      <Modal
        visible={showMoodModal}
        animationType="slide"
        statusBarTranslucent={true}
        transparent={true}
        onRequestClose={handleMoodCancel}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={10}
              overlayColor={colors.modal.blur}
            />
            <MoodQuestionnaire
              onComplete={handleMoodComplete}
              onCancel={handleMoodCancel}
              initialAnswers={moodAnswers}
            />
          </View>
        </View>
      </Modal>

      {/* AI Not Enabled Dialog */}
      <Modal
        visible={showAINotEnabledModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAINotEnabledModal(false)}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.14)',
          }}>
          <View style={styles.dialogOverlay}>
            <BlurView
              blurAmount={10}
              blurRadius={5}
              blurType="light"
              overlayColor={colors.modal.blur}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 50,
              }}
            />
            <View style={styles.dialogCard}>
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>
                  Add API Key to enable AI Features
                </Text>
              </View>
              <Text style={styles.dialogMessage}>
                Set your API key to enjoy:
                {'\n'}• Cinema chat assistant
                {'\n'}• Movie/Show level chat assistant
                {'\n'}• AI-powered movie recommendations
                {'\n'}• My Next Watch - Personalized content discovery
                {'\n'}• Trivia & Facts
              </Text>
              <View style={styles.dialogButtons}>
                <TouchableOpacity
                  style={styles.dialogSecondaryButton}
                  activeOpacity={0.9}
                  onPress={() => setShowAINotEnabledModal(false)}>
                  <Text style={styles.dialogSecondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{flex: 1}}
                  onPress={() => {
                    setShowAINotEnabledModal(false);
                    navigation.navigate('AISettingsScreen');
                  }}>
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={{
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.lg,
                      borderRadius: borderRadius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text style={styles.dialogPrimaryButtonText}>
                      Set API Key
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
});
