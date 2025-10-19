import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Switch,
  ImageBackground,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MySpaceStackParamList} from '../types/navigation';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {modalStyles} from '../styles/styles';
import {LanguageSettings} from '../components/LanguageSettings';
import {SettingsManager} from '../store/settings';
import {useQueryClient, useQuery} from '@tanstack/react-query';
import {BlurView} from '@react-native-community/blur';
import {MaybeBlurView} from '../components/MaybeBlurView';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Chip} from '../components/Chip';
import {LanguageSkeleton} from '../components/LoadingSkeleton';
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
import {BlurPreference} from '../store/blurPreference';

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
  // Footer-related modals moved to About & Legal screen

  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showAINotEnabledModal, setShowAINotEnabledModal] = useState(false);
  const [moodAnswers, setMoodAnswers] = useState<{[key: string]: string}>({});
  const [lastMoodUpdate, setLastMoodUpdate] = useState<string>('');
  const {isTablet, orientation} = useResponsive();
  // Blur preference toggle state
  const [forceBlurAll, setForceBlurAll] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  // My Language & My OTTs state
  const [showMyLanguageModal, setShowMyLanguageModal] = useState(false);
  const [showOTTsModal, setShowOTTsModal] = useState(false);

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

  const {data: aiSettings} = useQuery({
    queryKey: ['aiSettings'],
    queryFn: AISettingsManager.getSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  // My Language & My OTTs
  const {data: myLanguage} = useQuery({
    queryKey: ['my_language'],
    queryFn: SettingsManager.getMyLanguage,
  });
  const {data: myOTTs = []} = useQuery({
    queryKey: ['my_otts'],
    queryFn: SettingsManager.getMyOTTs,
  });
  const {data: availableProviders = []} = useQuery({
    queryKey: ['available_watch_providers', 'movie'],
    queryFn: () =>
      import('../services/tmdbWithCache').then(m =>
        m.getAvailableWatchProviders(),
      ),
    staleTime: 1000 * 60 * 60,
  });

  // Load mood answers on component mount
  useEffect(() => {
    loadMoodAnswers();
  }, []);

  // Initialize and subscribe to blur preference changes
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    (async () => {
      await BlurPreference.init();
      setForceBlurAll(BlurPreference.get());
      unsubscribe = BlurPreference.subscribe(() =>
        setForceBlurAll(BlurPreference.get()),
      );
    })();
    return () => {
      if (unsubscribe) unsubscribe();
    };
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
      fontFamily: 'Inter_18pt-Regular',
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
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalContent: {
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      overflow: 'hidden',
      paddingBottom: spacing.xl,
      backgroundColor: colors.modal.blurDark,
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
      fontFamily: 'Inter_18pt-Regular',
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
    // Tile grid styles
    tile: {
      backgroundColor: forceBlurAll
        ? colors.background.tertiaryGlass
        : colors.background.tertiarySolid,
      borderRadius: isTablet ? 40 : borderRadius.lg,
      padding: isTablet ? spacing.md : spacing.sm,
      borderWidth: 1,
      borderColor: forceBlurAll ? colors.modal.blur : colors.background.border,
      minHeight: isTablet ? 180 : 120,
    },
    tileTitle: {
      // color: '#E8E9FC55',
      color: colors.text.secondary,
      fontFamily: 'Inter_18pt-Regular',
      fontWeight: '400',
      fontSize: isTablet ? 14 : 12,
    },
    chipsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
      overflow: 'hidden',
      marginRight: isTablet ? -spacing.md : -spacing.sm,
      position: 'relative',
      width: '100%',
    },
    // Ask AI tile
    aiBorder: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: isTablet ? 40 : borderRadius.xl,
    },
    aiTile: {
      backgroundColor: forceBlurAll
        ? colors.background.tertiaryGlass
        : colors.background.tertiarySolid,
      borderRadius: isTablet ? 40 : borderRadius.xl,
      padding: isTablet ? spacing.lg : spacing.sm,
      borderWidth: 3,
      borderColor: colors.modal.blur,
      alignItems: 'center',
      justifyContent: 'center',
    },
    aiTitleSmall: {
      color: colors.text.secondary,
      ...typography.caption,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    aiTitle: {
      color: colors.accent,
      ...typography.h3,
      fontWeight: '800',
    },
    // Tile header with icon
    tileHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      margin: isTablet ? spacing.sm : spacing.xs,
    },
    tileHeaderColumn: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: isTablet ? spacing.xl : spacing.lg,
      marginTop: isTablet ? spacing.xl : spacing.md,
    },
    icon: {
      width: isTablet ? 22 : 18,
      height: isTablet ? 22 : 18,
      objectFit: 'contain',
      borderRadius: 4,
      opacity: 0.8,
    },
    iconLarge: {
      width: isTablet ? 80 : 50,
      height: isTablet ? 80 : 50,
      objectFit: 'contain',
    },
    smallTile: {
      width: '50%',
      minHeight: isTablet ? 220 : 120,
    },
    themeTall: {
      minHeight: isTablet ? 300 : 180,
      flex: 1,
      justifyContent: 'space-between',
    },
    aiTall: {
      minHeight: isTablet ? 300 : 180,
    },
    // Theme option cards
    themeOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: isTablet ? spacing.md : spacing.xs,
      paddingHorizontal: isTablet ? spacing.md : spacing.xs,
      borderRadius: isTablet ? borderRadius.xl : borderRadius.md,
      backgroundColor: forceBlurAll
        ? colors.modal.blurDark
        : colors.modal.blurDark,
      borderWidth: 0.7,
      borderColor: colors.modal.blur,
    },
    themeOptionActive: {
      borderColor: forceBlurAll ? colors.modal.active : colors.modal.active,
      backgroundColor: forceBlurAll
        ? colors.modal.content
        : colors.modal.header,
    },
    themeOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    themeSwatch: {
      width: isTablet ? 35 : 25,
      height: isTablet ? 35 : 25,
      borderRadius: isTablet ? 12 : 8,
      overflow: 'hidden',
    },
    themeSwatchGlass: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.09)',
    },
    themeSwatchSolid: {
      flex: 1,
      backgroundColor: '#000',
    },
    themeOptionText: {
      ...typography.body2,
      color: colors.text.secondary,
      fontSize: isTablet ? 14 : 12,
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
    chip: {
      backgroundColor: forceBlurAll
        ? colors.modal.blurDark
        : colors.modal.blurDark,
      borderColor: colors.modal.background,
      borderWidth: 1,
      borderRadius: isTablet ? borderRadius.xl : borderRadius.lg,
      width: isTablet ? 100 : 80,
      height: isTablet ? 90 : 70,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: spacing.md,
    },
    label: {
      color: colors.text.secondary,
      ...typography.body2,
      textAlign: 'center',
      zIndex: 1,
      opacity: 0.5,
    },
    labelBG: {
      position: 'absolute',
      zIndex: 1,
      color: colors.text.primary,
      opacity: 0.05,
      fontSize: isTablet ? 60 : 55,
      fontWeight: '900',
      fontFamily: 'Inter_28pt-ExtraBold',
    },
    region: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: spacing.md,
    },
    regionLabelBG: {
      position: 'absolute',
      color: colors.text.primary,
      opacity: 0.05,
      fontSize: isTablet ? 90 : 55,
      fontWeight: '900',
      fontFamily: 'Inter_28pt-ExtraBold',
    },
    regionLabel: {
      color: colors.text.secondary,
      ...typography.body2,
      fontSize: isTablet ? 14 : 12,
      textAlign: 'center',
      zIndex: 1,
      opacity: 0.5,
    },
    emptyTextContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
    },
    emptyText: {
      color: colors.text.tertiary,
      ...typography.caption,
      opacity: 0.6,
    },
  });

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
      <View style={{padding: spacing.md}}>
        <Text
          style={{
            color: colors.text.primary,
            ...typography.h2,
            marginBottom: spacing.md,
          }}>
          My Space
        </Text>
        {/* Two-column layout */}
        <View
          style={{
            flexDirection: 'row',
            gap: isTablet ? spacing.md : spacing.sm,
          }}>
          {/* Left Column */}
          <View
            style={{
              flex: 1.7,
              gap: isTablet ? spacing.md : spacing.sm,
            }}>
            {/* My Filters */}
            <TouchableOpacity
              style={styles.tile}
              activeOpacity={0.9}
              onPress={() => navigateWithLimit('MyFiltersScreen')}
              testID="myFiltersButton">
              <View style={styles.tileHeaderRow}>
                <Image
                  source={require('../assets/myfilters.png')}
                  style={styles.icon}
                />
                <Text style={styles.tileTitle}>My Filters</Text>
              </View>

              <View style={styles.chipsRow}>
                <LinearGradient
                  colors={[
                    'transparent',
                    'transparent',
                    forceBlurAll
                      ? colors.background.tertiaryGlass
                      : colors.background.tertiarySolid,
                  ]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 100,
                    zIndex: 1,
                  }}
                />
                {isLoadingFilters ? (
                  <LanguageSkeleton />
                ) : savedFilters.length > 0 ? (
                  savedFilters.slice(0, isTablet ? 6 : 4).map(filter => (
                    <View key={filter.id} style={styles.chip}>
                      <Text style={styles.labelBG}>
                        {filter.name?.slice(0, 1).toString()}
                      </Text>
                      <Text numberOfLines={1} style={styles.label}>
                        {filter.name}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyTextContainer}>
                    <Text style={styles.emptyText}>No filters yet</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* My Watchlists */}
            <TouchableOpacity
              style={styles.tile}
              activeOpacity={0.9}
              onPress={() => navigateWithLimit('WatchlistsScreen')}
              testID="watchlistsHeader">
              <View style={styles.tileHeaderRow}>
                <Image
                  source={require('../assets/mywatchlists.png')}
                  style={styles.icon}
                />
                <Text style={styles.tileTitle}>My Watchlists</Text>
              </View>
              <View style={styles.chipsRow}>
                <LinearGradient
                  colors={[
                    'transparent',
                    'transparent',
                    forceBlurAll
                      ? colors.background.tertiaryGlass
                      : colors.background.tertiarySolid,
                  ]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: 100,
                    zIndex: 1,
                  }}
                />
                {isLoadingWatchlists ? (
                  <LanguageSkeleton />
                ) : watchlists.length > 0 ? (
                  watchlists.slice(0, isTablet ? 6 : 4).map(w => (
                    <View key={w.id} style={styles.chip}>
                      <Text style={styles.labelBG}>
                        {w.name?.slice(0, 1).toString()}
                      </Text>
                      <Text numberOfLines={1} style={styles.label}>
                        {w.name}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyTextContainer}>
                    <Text style={styles.emptyText}>No watchlists yet</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Region + AI Settings small tiles */}
            <View
              style={{
                flexDirection: 'row',
                gap: isTablet ? spacing.md : spacing.sm,
                width: '100%',
                paddingRight: isTablet ? spacing.md : spacing.sm,
              }}>
              <TouchableOpacity
                style={[styles.tile, styles.smallTile]}
                activeOpacity={0.9}
                onPress={() => setShowRegionModal(true)}>
                <View style={styles.tileHeaderRow}>
                  <Image
                    source={require('../assets/region.png')}
                    style={styles.icon}
                  />
                  <Text numberOfLines={1} style={styles.tileTitle}>
                    Region
                  </Text>
                </View>
                <View style={styles.region}>
                  <Text style={styles.regionLabelBG}>
                    {currentRegion?.english_name?.slice(0, 1).toString()}
                  </Text>
                  <Text numberOfLines={1} style={styles.regionLabel}>
                    {currentRegion?.english_name || 'Select Region'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tile, styles.smallTile]}
                activeOpacity={0.9}
                onPress={() => navigateWithLimit('AISettingsScreen')}
                testID="aiSettingsButton">
                <View style={styles.tileHeaderRow}>
                  <Image
                    source={require('../assets/aisettings.png')}
                    style={styles.icon}
                  />
                  <Text numberOfLines={1} style={styles.tileTitle}>
                    AI Settings
                  </Text>
                </View>
                {aiSettings?.model ? (
                  <View style={styles.region}>
                    <Text style={styles.regionLabelBG}>
                      {aiSettings?.model?.slice(0, 1).toString().toUpperCase()}
                    </Text>
                    <Text numberOfLines={1} style={styles.regionLabel}>
                      {aiSettings?.model || 'Select Model'}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>

          {/* Right Column */}
          <View style={{flex: 0.9, gap: spacing.md}}>
            {/* Theme - tall */}
            <View style={[styles.tile, styles.themeTall]}>
              <View style={styles.tileHeaderColumn}>
                <Image
                  source={require('../assets/theme.png')}
                  style={styles.icon}
                />
                <Text numberOfLines={1} style={styles.tileTitle}>
                  Theme
                </Text>
              </View>
              <View style={{gap: isTablet ? spacing.md : spacing.sm}}>
                {/* Glass option */}
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.9}
                  style={[
                    styles.themeOption,
                    forceBlurAll && styles.themeOptionActive,
                  ]}
                  onPress={async () => {
                    if (!forceBlurAll) {
                      setForceBlurAll(true);
                      await BlurPreference.set(true);
                    }
                  }}>
                  <View style={styles.themeOptionLeft}>
                    <View style={styles.themeSwatch}>
                      <LinearGradient
                        colors={[colors.modal.active, colors.modal.blurDark]}
                        start={{x: 0, y: 0}}
                        end={{x: 0.5, y: 0.7}}
                        style={styles.themeSwatchGlass}
                      />
                    </View>
                    <Text numberOfLines={1} style={styles.themeOptionText}>
                      Glass
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Solid option */}
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.9}
                  style={[
                    styles.themeOption,
                    !forceBlurAll && styles.themeOptionActive,
                  ]}
                  onPress={async () => {
                    if (forceBlurAll) {
                      setForceBlurAll(false);
                      await BlurPreference.set(false);
                    }
                  }}>
                  <View style={styles.themeOptionLeft}>
                    <View style={styles.themeSwatch}>
                      <View style={styles.themeSwatchSolid} />
                    </View>
                    <Text numberOfLines={1} style={styles.themeOptionText}>
                      Solid
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Ask Theater AI - tall */}
            <View style={{position: 'relative'}}>
              <LinearGradient
                colors={['rgb(122, 9, 88)', 'rgb(99, 14, 133)']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={[styles.aiBorder, styles.aiTall]}
              />
              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.aiTile, styles.aiTall]}
                onPress={() => {
                  if (isAIEnabled) {
                    navigateWithLimit('OnlineAIScreen');
                  } else {
                    setShowAINotEnabledModal(true);
                  }
                }}
                testID="askAIHeader">
                <Image
                  source={require('../assets/theater.webp')}
                  style={[
                    styles.iconLarge,
                    {opacity: 0.9, marginBottom: spacing.sm},
                  ]}
                />
                <View>
                  <Text numberOfLines={1} style={styles.aiTitleSmall}>
                    Ask
                  </Text>
                  <Text numberOfLines={1} style={styles.aiTitle}>
                    Theater AI
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Row: My Language + My OTTs */}
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: isTablet ? spacing.md : spacing.sm,
            marginTop: spacing.sm,
          }}>
          {/* My Language */}
          <TouchableOpacity
            style={[
              styles.tile,
              styles.smallTile,
              {width: isTablet ? '35%' : 'auto'},
            ]}
            activeOpacity={0.9}
            onPress={() => setShowMyLanguageModal(true)}>
            <View style={styles.tileHeaderRow}>
              <Image
                source={require('../assets/mylanguage.png')}
                style={styles.icon}
              />
              <Text numberOfLines={1} style={styles.tileTitle}>
                My Language
              </Text>
            </View>
            <View style={styles.region}>
              <Text style={styles.regionLabelBG}>
                {(myLanguage?.english_name || 'L').slice(0, 1)}
              </Text>
              <Text numberOfLines={1} style={styles.regionLabel}>
                {myLanguage?.english_name || 'Select Language'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* My OTTs */}
          <TouchableOpacity
            style={[styles.tile, styles.smallTile, {width: 'auto', flex: 1}]}
            activeOpacity={0.9}
            onPress={() => setShowOTTsModal(true)}>
            <View style={styles.tileHeaderRow}>
              <Image
                source={require('../assets/myott.png')}
                style={styles.icon}
              />
              <Text numberOfLines={1} style={styles.tileTitle}>
                My OTTs
              </Text>
            </View>
            <View
              style={[
                styles.chipsRow,
                {
                  marginTop: isTablet ? spacing.xl : spacing.md,
                },
              ]}>
              <LinearGradient
                colors={[
                  'transparent',
                  forceBlurAll
                    ? colors.background.tertiaryGlass
                    : colors.background.primary,
                ]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: isTablet ? 150 : 100,
                  zIndex: 1,
                }}
              />
              {myOTTs && myOTTs.length > 0 ? (
                myOTTs.map((p: any) => (
                  <Image
                    key={p.id}
                    source={{
                      uri: p.logo_path
                        ? `https://image.tmdb.org/t/p/${
                            isTablet ? 'w185' : 'w92'
                          }${p.logo_path}`
                        : undefined,
                    }}
                    style={{
                      width: isTablet ? 70 : 35,
                      height: isTablet ? 70 : 35,
                      borderRadius: borderRadius.lg,
                      backgroundColor: '#151525',
                    }}
                    resizeMode="contain"
                  />
                ))
              ) : (
                <View
                  style={[
                    styles.emptyTextContainer,
                    {paddingVertical: spacing.sm},
                  ]}>
                  <Text style={styles.emptyText}>Select providers</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* About & Legal full width */}
        <View style={{marginTop: isTablet ? spacing.md : spacing.sm}}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigateWithLimit('AboutLegalScreen')}
            style={[styles.tile, {paddingVertical: spacing.md, minHeight: 60}]}
            testID="aboutLegalButton">
            <View style={styles.tileHeaderRow}>
              <Image
                source={require('../assets/theaterai.webp')}
                style={styles.icon}
              />
              <Text numberOfLines={1} style={styles.tileTitle}>
                About & Legal
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        <View
          style={{height: isTablet && orientation === 'landscape' ? 200 : 100}}
        />
      </View>
      {/* My Language Modal - single select using LanguageSettings in local mode */}
      <Modal
        visible={showMyLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMyLanguageModal(false)}>
        <View style={modalStyles.modalContainer}>
          <MaybeBlurView
            style={modalStyles.modalContent}
            modal
            blurType="dark"
            blurAmount={20}>
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  {width: '80%', fontSize: isTablet ? 16 : 12},
                ]}>
                Select your language to show personalized content
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowMyLanguageModal(false)}>
                <Ionicons name="close" size={22} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={{flex: 1}}>
              <LanguageSettings
                isTitle={false}
                singleSelect
                disablePersistence
                initialSelectedIso={
                  myLanguage?.iso_639_1 ? [myLanguage.iso_639_1] : []
                }
                onChangeSelected={langs => {
                  SettingsManager.setMyLanguage(langs?.[0] || null);
                  setShowMyLanguageModal(false);
                }}
              />
            </View>
          </MaybeBlurView>
        </View>
      </Modal>

      {/* My OTTs Modal - multi select providers (grid UI like All Watch Providers) */}
      <Modal
        visible={showOTTsModal}
        animationType="slide"
        statusBarTranslucent={true}
        backdropColor={colors.modal.blurDark}
        onRequestClose={() => setShowOTTsModal(false)}>
        <View style={modalStyles.modalContainer}>
          <MaybeBlurView
            blurType="dark"
            blurAmount={10}
            style={modalStyles.modalContent}
            modal>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>All Watch Providers</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {!!(myOTTs && myOTTs.length) && (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={async () => {
                      await SettingsManager.setMyOTTs([]);
                    }}
                    style={{marginRight: spacing.md}}>
                    <Text
                      style={{
                        ...typography.body2,
                        color: colors.text.muted,
                        backgroundColor: colors.background.card,
                        padding: spacing.sm,
                        paddingHorizontal: spacing.md,
                        borderRadius: borderRadius.md,
                      }}>
                      clear
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setShowOTTsModal(false)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {availableProviders?.length ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                key={availableProviders.length}
                style={modalStyles.scrollContent}>
                <View style={modalStyles.allProvidersGrid}>
                  {availableProviders.map((p: any, index: number) => (
                    <TouchableOpacity
                      activeOpacity={1}
                      key={`myspace-provider-${p.provider_id}-${index}`}
                      onPress={async () => {
                        let next = Array.isArray(myOTTs) ? [...myOTTs] : [];
                        if (myOTTs?.some((s: any) => s.id === p.provider_id)) {
                          next = next.filter(
                            (x: any) => x.id !== p.provider_id,
                          );
                        } else {
                          next.push({
                            id: p.provider_id,
                            provider_name: p.provider_name,
                            logo_path: p.logo_path,
                          });
                        }
                        await SettingsManager.setMyOTTs(next);
                      }}
                      style={{
                        borderRadius: 16,
                        margin: 3,
                        opacity: myOTTs?.some(
                          (s: any) => s.id === p.provider_id,
                        )
                          ? 1
                          : 0.7,
                        backgroundColor: myOTTs?.some(
                          (s: any) => s.id === p.provider_id,
                        )
                          ? colors.modal.active
                          : colors.modal.blur,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: myOTTs?.some(
                          (s: any) => s.id === p.provider_id,
                        )
                          ? 2
                          : 0,
                        borderColor: myOTTs?.some(
                          (s: any) => s.id === p.provider_id,
                        )
                          ? colors.modal.activeBorder
                          : 'transparent',
                      }}>
                      <Image
                        source={{
                          uri: p.logo_path
                            ? `https://image.tmdb.org/t/p/w154${p.logo_path}`
                            : undefined,
                        }}
                        style={{width: 70, height: 70, borderRadius: 16}}
                        resizeMode="contain"
                      />
                      {myOTTs?.some((s: any) => s.id === p.provider_id) && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            borderRadius: 10,
                            padding: 2,
                          }}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{height: 100}} />
              </ScrollView>
            ) : (
              <View style={{padding: spacing.lg, alignItems: 'center'}}>
                <Text style={{color: colors.text.secondary}}>
                  Loading watch providers...
                </Text>
              </View>
            )}
          </MaybeBlurView>
        </View>
      </Modal>

      <RegionModal
        visible={showRegionModal}
        onClose={() => setShowRegionModal(false)}
        regions={regionData}
        selectedRegion={currentRegion?.iso_3166_1}
        onSelectRegion={handleRegionSelect}
      />

      {/* Theme Modal */}
      <Modal
        visible={showThemeModal}
        animationType="slide"
        statusBarTranslucent={true}
        backdropColor={colors.modal.blurDark}
        onRequestClose={() => setShowThemeModal(false)}>
        <View style={styles.modalContainer}>
          <MaybeBlurView
            style={{
              flex: 1,
              marginTop: '50%',
              borderTopLeftRadius: borderRadius.xl,
              borderTopRightRadius: borderRadius.xl,
            }}
            blurType="dark"
            blurAmount={10}
            overlayColor={colors.modal.blur}
            modal
            radius={borderRadius.xl}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Theme</Text>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setShowThemeModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={{padding: spacing.md}}>
              {/* Glass Option */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={async () => {
                  setForceBlurAll(true);
                  await BlurPreference.set(true);
                  setShowThemeModal(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.modal.content,
                  borderWidth: 1,
                  borderColor: forceBlurAll
                    ? colors.accent
                    : colors.modal.border,
                  marginBottom: spacing.md,
                }}>
                <View>
                  <Text style={{color: colors.text.primary, ...typography.h3}}>
                    Glass
                  </Text>
                  <Text
                    style={{
                      color: colors.text.secondary,
                      ...typography.body2,
                    }}>
                    Beautiful blur effects throughout the app
                  </Text>
                </View>
                {forceBlurAll && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.accent}
                  />
                )}
              </TouchableOpacity>

              {/* Normal Option */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={async () => {
                  setForceBlurAll(false);
                  await BlurPreference.set(false);
                  setShowThemeModal(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.modal.content,
                  borderWidth: 1,
                  borderColor: !forceBlurAll
                    ? colors.accent
                    : colors.modal.border,
                }}>
                <View>
                  <Text style={{color: colors.text.primary, ...typography.h3}}>
                    Solid
                  </Text>
                  <Text
                    style={{
                      color: colors.text.secondary,
                      ...typography.body2,
                    }}>
                    Fallback theme (use if you notice performance issues)
                  </Text>
                </View>
                {!forceBlurAll && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.accent}
                  />
                )}
              </TouchableOpacity>
            </View>
          </MaybeBlurView>
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
            <MaybeBlurView
              blurAmount={10}
              blurType="light"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 50,
              }}
              gradientColors={[colors.modal.blur, colors.modal.blur]}
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
