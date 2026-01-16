import React, {useState, useCallback, useEffect, useMemo} from 'react';
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
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import {
  UserPreferencesManager,
  RealmSettingsManager,
} from '../database/managers';
import {MoodQuestionnaire} from '../components/MoodQuestionnaire';
import {useAIEnabled} from '../hooks/useAIEnabled';
import {BlurPreference} from '../store/blurPreference';
import {getCinemaDNA, CinemaDNA, getTypeEmoji} from '../utils/cinemaDNA';
import Icon from 'react-native-vector-icons/FontAwesome';
import {CollectionsManager} from '../store/collections';
import {diaryManager, IDiaryEntry} from '../store/diary';

import {notificationService} from '../services/NotificationService';

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
  // My Language & My OTTs state
  const [showMyLanguageModal, setShowMyLanguageModal] = useState(false);
  const [showOTTsModal, setShowOTTsModal] = useState(false);
  const [localOTTs, setLocalOTTs] = useState<any[]>([]);
  const [cinemaDNA, setCinemaDNA] = useState<CinemaDNA | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [upcomingEvent, setUpcomingEvent] = useState<any | null>(null);
  const [diaryEntries, setDiaryEntries] = useState<IDiaryEntry[]>([]);
  const {width, height} = useWindowDimensions();
  const today = new Date();

  // Load Diary Entries
  useEffect(() => {
    const loadEntries = async () => {
      const entries = await diaryManager.getAllEntries();
      setDiaryEntries(entries);
    };
    loadEntries();
    diaryManager.addChangeListener(loadEntries);
    return () => diaryManager.removeChangeListener(loadEntries);
  }, []);

  const weekData = useMemo(() => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    return Array.from({length: 7}).map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);

      const dayEntries = diaryEntries.filter(e => {
        const entryDate = new Date(e.last_updated_at);
        return (
          entryDate.getDate() === d.getDate() &&
          entryDate.getMonth() === d.getMonth() &&
          entryDate.getFullYear() === d.getFullYear()
        );
      });

      // Sort by last updated desc to get latest
      dayEntries.sort(
        (a, b) =>
          new Date(b.last_updated_at).getTime() -
          new Date(a.last_updated_at).getTime(),
      );

      const latestEntry = dayEntries.length > 0 ? dayEntries[0] : null;
      const emoji = latestEntry ? latestEntry.mood : null;

      return {
        name: d.toLocaleDateString('en-US', {weekday: 'short'}),
        num: d.getDate(),
        isToday: d.toDateString() === today.toDateString(),
        emoji: emoji,
      };
    });
  }, [diaryEntries]);

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

  const {data: savedCollections = [], isLoading: isLoadingCollections} =
    useQuery({
      queryKey: ['savedCollections'],
      queryFn: CollectionsManager.getSavedCollections,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnMount: true,
      refetchOnWindowFocus: true, // Refresh when coming back from deleting a collection
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

  // Remove duplicate OTTs on load
  useEffect(() => {
    if (myOTTs && myOTTs.length > 0) {
      const uniqueOTTs = myOTTs.filter(
        (item: any, index: number, self: any[]) =>
          index === self.findIndex((t: any) => t.id === item.id),
      );
      if (uniqueOTTs.length !== myOTTs.length) {
        // Duplicates found, save cleaned version
        SettingsManager.setMyOTTs(uniqueOTTs);
      }
    }
  }, [myOTTs]);
  const {data: availableProviders = []} = useQuery({
    queryKey: [
      'available_watch_providers',
      'movie',
      currentRegion?.iso_3166_1 || 'US',
    ],
    queryFn: async () => {
      const region = currentRegion?.iso_3166_1 || 'US';
      const m = await import('../services/tmdbWithCache');
      let result = await m.getAvailableWatchProviders(region);

      // Fallback to US if current region has no providers
      if (!result || result.length === 0) {
        result = await m.getAvailableWatchProviders('US');
      }
      return result;
    },
    staleTime: 1000 * 60 * 60,
  });

  // Load mood answers and cinema DNA on component mount
  useEffect(() => {
    loadMoodAnswers();
    loadCinemaDNA();
    loadUpcomingEvent();
  }, []);

  const loadCinemaDNA = async () => {
    const dna = await getCinemaDNA();
    setCinemaDNA(dna);
  };

  const loadUpcomingEvent = async () => {
    try {
      const stored = await AsyncStorage.getItem('calendar_items');
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Normalize dates
        const normalized = parsed.map((item: any) => ({
          ...item,
          schedulerType: item.schedulerType || 'release',
          date: item.date || item.releaseDate,
          eventDate: new Date(item.date || item.releaseDate),
        }));

        // Filter valid items (Upcoming)
        const validItems = normalized.filter((item: any) => {
          const itemDate = new Date(item.eventDate);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate.getTime() >= now.getTime();
        });

        // Current Upcoming Event (for UI)
        if (validItems.length > 0) {
          const sorted = [...validItems].sort(
            (a: any, b: any) => a.eventDate.getTime() - b.eventDate.getTime(),
          );
          setUpcomingEvent(sorted[0]);
        } else {
          setUpcomingEvent(null);
        }

        // Cleanup Logic (Same as MyCalendar)
        const removedItems = normalized.filter((item: any) => {
          const itemDate = new Date(item.eventDate);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate.getTime() < now.getTime();
        });

        if (removedItems.length > 0) {
          // Persist cleanup
          // Strip eventDate property before saving to match schema
          const toSave = validItems.map(({eventDate, ...rest}: any) => rest);
          await AsyncStorage.setItem('calendar_items', JSON.stringify(toSave));

          // Cancel notifications
          removedItems.forEach((item: any) => {
            if (item.notificationId) {
              notificationService
                .cancelScheduledNotification(item.notificationId)
                .catch(err => console.warn('Failed to cancel notif', err));
            }
          });
        }
      } else {
        setUpcomingEvent(null);
      }
    } catch (error) {
      console.error('Error loading upcoming event:', error);
      setUpcomingEvent(null);
    }
  };

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
    const checkUnread = async () => {
      const unread = await notificationService.hasUnreadNotifications();
      setHasUnread(unread);
    };

    const unsubscribe = navigation.addListener('focus', () => {
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      queryClient.invalidateQueries({queryKey: ['savedCollections']});
      loadMoodAnswers(); // Refresh mood answers when screen comes into focus
      loadCinemaDNA(); // Refresh cinema DNA when screen comes into focus
      loadUpcomingEvent(); // Refresh upcoming calendar event
      checkUnread(); // Check for unread notifications
    });

    // Check on mount
    checkUnread();

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
    } catch (error) {}
  };

  const loadMoodAnswers = async () => {
    try {
      const preferences = await UserPreferencesManager.getPreferences();
      if (preferences && preferences.moodAnswers) {
        setMoodAnswers(preferences.moodAnswers);
        if (preferences.timestamp) {
          const date = new Date(preferences.timestamp);
          setLastMoodUpdate(date.toLocaleDateString());
        }
      }
    } catch (error) {}
  };

  const getMoodSummary = () => {
    const answers = Object.values(moodAnswers);
    if (answers.length === 0) return 'Not set';
    return answers.join(' • ');
  };

  // Initialize local OTTs when modal opens
  useEffect(() => {
    if (showOTTsModal) {
      setLocalOTTs(myOTTs || []);
    }
  }, [showOTTsModal, myOTTs]);

  // Save local OTTs when Save button clicked
  const handleCloseOTTsModal = useCallback(async () => {
    // Save to persistent storage
    await SettingsManager.setMyOTTs(localOTTs);

    // Invalidate queries immediately
    await Promise.all([
      queryClient.invalidateQueries({queryKey: ['my_otts']}),
      queryClient.invalidateQueries({queryKey: ['my_otts_movies']}),
      queryClient.invalidateQueries({queryKey: ['my_otts_tv']}),
      queryClient.invalidateQueries({queryKey: ['my_language_otts_movies']}),
      queryClient.invalidateQueries({queryKey: ['my_language_otts_tv']}),
    ]);

    // Close modal
    setShowOTTsModal(false);
  }, [localOTTs, queryClient]);

  const handleUpdateMood = () => {
    setShowMoodModal(true);
  };

  const handleMoodComplete = async (newMoodAnswers: {
    [key: string]: string;
  }) => {
    try {
      // Save fresh mood data to Realm
      await UserPreferencesManager.setPreferences([], newMoodAnswers);
      await RealmSettingsManager.setSetting('next_watch_onboarding', 'true');

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

      // Store a flag to indicate mood was updated (using Realm)
      await RealmSettingsManager.setSetting('mood_updated', 'true');
    } catch (error) {}
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
      minHeight: isTablet ? 180 : 120,
      borderTopWidth: 0,
      borderLeftWidth: forceBlurAll ? 1 : 0,
      borderRightWidth: forceBlurAll ? 1 : 0,
      borderBottomWidth: 0,
      borderColor: forceBlurAll
        ? colors.modal.content
        : colors.background.border,
    },
    tileTitle: {
      // color: '#E8E9FC55',
      color: colors.text.secondary,
      fontFamily: 'Inter_18pt-Regular',
      fontWeight: '400',
      fontSize: isTablet ? 14 : 12,
      textAlign: 'center',
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
      flex: 1,
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
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isTablet ? spacing.md : spacing.sm,
          }}>
          <Text
            style={{
              color: colors.text.primary,
              ...typography.h2,
            }}>
            My Space
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}>
            {cinemaDNA && (
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => navigateWithLimit('CinemaInsightsScreen')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: forceBlurAll
                    ? colors.background.tertiaryGlass
                    : colors.background.tertiarySolid,
                  borderRadius: 50,
                  paddingVertical: spacing.xs,
                  paddingLeft: isTablet ? spacing.lg : spacing.md,
                  paddingRight: spacing.xs,
                  gap: spacing.sm,
                  borderTopWidth: 1,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: forceBlurAll
                    ? colors.modal.content
                    : colors.background.border,
                  width: width * 0.32,
                  minWidth: isTablet ? 160 : 120,
                  height: 50,
                  marginBottom: 0,
                  overflow: 'hidden',
                }}>
                <Image
                  source={require('../assets/dna.png')}
                  style={styles.icon}
                />
                <Text
                  style={[
                    styles.tileTitle,
                    {
                      zIndex: 1,
                      fontSize: isTablet ? 14 : 10,
                    },
                  ]}>
                  Cinema DNA
                </Text>
                {/* Profile Image with Gradient */}
                <View
                  style={{
                    width: isTablet ? 80 : 60,
                    borderTopRightRadius: 50,
                    borderBottomRightRadius: 50,
                    overflow: 'hidden',
                    backgroundColor: colors.background.secondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                  }}>
                  <>
                    {cinemaDNA.topPerson.profile_path ? (
                      <Image
                        source={{
                          uri: `https://image.tmdb.org/t/p/w185${cinemaDNA.topPerson.profile_path}`,
                        }}
                        style={{width: '100%', height: '100%'}}
                        resizeMode="cover"
                      />
                    ) : (
                      <Icon
                        name="user-secret"
                        size={isTablet ? 40 : 30}
                        color={colors.text.primary}
                        style={{
                          marginRight: isTablet ? 0 : -spacing.md,
                        }}
                      />
                    )}
                    <LinearGradient
                      colors={[
                        forceBlurAll
                          ? colors.background.tertiaryGlass
                          : colors.background.tertiarySolid,
                        'transparent',
                      ]}
                      useAngle
                      angle={90}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: -50,
                        bottom: 0,
                        zIndex: 1,
                      }}
                    />
                  </>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => navigateWithLimit('NotificationSettings')}
              style={[
                styles.tile,
                {
                  padding: isTablet ? 14 : 12,
                  borderRadius: borderRadius.round,
                  position: 'relative',
                  minHeight: 44,
                  width: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              ]}
              activeOpacity={0.7}>
              <Image
                source={require('../assets/notification.png')}
                style={{width: 20, height: 20}}
              />
              {hasUnread && (
                <View
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#FF3B30',
                  }}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
        {/* My Diary - Full Width */}
        <TouchableOpacity
          style={[
            styles.tile,
            {
              minHeight: isTablet ? 130 : 90,
              marginBottom: isTablet ? spacing.md : spacing.sm,
            },
          ]}
          activeOpacity={0.9}
          onPress={() => navigateWithLimit('MyDiaryScreen')}>
          <View
            style={[
              styles.tileHeaderRow,
              {
                marginBottom: 6,
                paddingBottom: 0,
              },
            ]}>
            <Image
              source={require('../assets/mydiary.png')}
              style={{width: isTablet ? 20 : 16, height: isTablet ? 20 : 16}}
            />
            <Text style={styles.tileTitle}>My Diary</Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: isTablet ? spacing.md : spacing.sm,
            }}>
            <Text
              style={{
                color: colors.text.primary,
                ...typography.h3,
                fontWeight: 'bold',
                opacity: 0.8,
              }}>
              {today.toLocaleDateString('en-US', {month: 'short'})}
            </Text>
            <View
              style={{
                width: 1,
                height: 25,
                backgroundColor: colors.text.muted,
                marginHorizontal: spacing.sm,
                opacity: 0.5,
              }}
            />
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  position: 'relative',
                }}>
                {weekData.map((d: any, i: number) => (
                  <View
                    key={i}
                    style={{
                      alignItems: 'center',
                      width: (width - spacing.md * 4 - 60) / 7,
                      borderWidth: d.isToday ? 1 : 0,
                      borderColor: colors.text.muted,
                      borderRadius: isTablet ? 25 : 14,
                      paddingVertical: isTablet ? 16 : 8,
                    }}>
                    <Text
                      style={{
                        fontSize: isTablet ? 14 : 10,
                        color: colors.text.muted,
                        opacity: 0.6,
                        marginBottom: 4,
                      }}>
                      {d.name}
                    </Text>
                    <View
                      style={{
                        width: 'auto',
                        height: 'auto',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text
                        style={{
                          color: d.isToday
                            ? colors.text.secondary
                            : colors.text.muted,
                          ...typography.h3,
                          fontWeight: 'bold',
                          fontSize: d.emoji
                            ? isTablet
                              ? 22
                              : 18
                            : isTablet
                            ? 24
                            : 14, // Smaller font for emoji if needed
                        }}>
                        {d.emoji ? d.emoji : d.num}
                      </Text>
                    </View>
                  </View>
                ))}
                <LinearGradient
                  colors={[
                    forceBlurAll
                      ? colors.background.tertiaryGlass
                      : colors.background.tertiarySolid,
                    'transparent',
                    'transparent',
                  ]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: isTablet ? 0 : -10,
                    bottom: 0,
                    width: 150,
                    zIndex: 1,
                  }}
                />
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
                    right: -20,
                    bottom: 0,
                    width: 150,
                    zIndex: 1,
                  }}
                />
              </View>
            </View>
          </View>
        </TouchableOpacity>

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
                    <Text style={styles.emptyText}>No filters</Text>
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
                    <Text style={styles.emptyText}>No watchlists</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* My Collections - NEW TILE */}
            <TouchableOpacity
              style={styles.tile}
              activeOpacity={0.9}
              onPress={() => navigateWithLimit('MyCollectionsScreen')}>
              <View style={styles.tileHeaderRow}>
                <Image
                  source={require('../assets/mycollections.png')} // Reusing watchlist icon as requested
                  style={styles.icon}
                />
                <Text style={styles.tileTitle}>My Collections</Text>
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
                {isLoadingCollections ? (
                  <LanguageSkeleton />
                ) : savedCollections.length > 0 ? (
                  savedCollections.slice(0, isTablet ? 6 : 4).map(c => (
                    <View key={c.id} style={styles.chip}>
                      <Text style={styles.labelBG}>
                        {c.name?.slice(0, 1).toString()}
                      </Text>
                      <Text numberOfLines={1} style={styles.label}>
                        {c.name}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyTextContainer}>
                    <Text style={styles.emptyText}>No collections</Text>
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
          <View style={{flex: 0.9, gap: isTablet ? spacing.md : spacing.sm}}>
            {/* My Calendar */}
            <TouchableOpacity
              style={[
                styles.tile,
                {minHeight: isTablet ? 210 : 140, overflow: 'hidden'},
              ]}
              activeOpacity={0.9}
              onPress={() => navigateWithLimit('MyCalendarScreen')}>
              <View
                style={[
                  styles.tileHeaderRow,
                  {
                    flexDirection: isTablet ? 'row' : 'column',
                    gap: isTablet ? spacing.sm : spacing.xs,
                  },
                ]}>
                <Image
                  source={require('../assets/calendar.png')}
                  style={{
                    width: isTablet ? 20 : 16,
                    height: isTablet ? 20 : 16,
                  }}
                />
                <Text style={styles.tileTitle}>My Calendar</Text>
              </View>

              <View style={{marginTop: spacing.sm, flex: 1}}>
                {upcomingEvent ? (
                  <View style={{flex: 1, flexDirection: 'row'}}>
                    <View
                      style={{
                        flex: 1,
                        zIndex: 2,
                        paddingRight: spacing.sm,
                        alignItems: 'center',
                        marginTop: spacing.xs,
                      }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: colors.text.primary,
                          marginHorizontal: 2,
                          textAlign: 'center',
                          ...typography.body2,
                          fontWeight: '700',
                          lineHeight: 20,
                        }}>
                        {upcomingEvent.title}
                      </Text>
                      <Text
                        style={{
                          ...typography.body2,
                          color: colors.text.secondary,
                          fontSize: 10,
                          marginTop: 4,
                          fontWeight: '500',
                        }}>
                        {upcomingEvent.eventDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          weekday: 'short',
                        })}
                      </Text>
                    </View>

                    {upcomingEvent.posterPath && (
                      <View
                        style={{
                          width: '120%',
                          height: '120%',
                          backgroundColor: colors.background.secondary,
                          position: 'absolute',
                          top: 0,
                          left: -10,
                          right: 0,
                          bottom: 0,
                          zIndex: 1,
                          borderRadius: isTablet
                            ? borderRadius.lg
                            : borderRadius.md,
                          overflow: 'hidden',
                        }}>
                        <Image
                          source={{
                            uri: `https://image.tmdb.org/t/p/w342${upcomingEvent?.posterPath}`,
                          }}
                          style={{width: '100%', height: '100%'}}
                          resizeMode="cover"
                        />
                        <LinearGradient
                          colors={[
                            forceBlurAll
                              ? colors.background.tertiaryGlass
                              : colors.background.tertiarySolid,
                            'transparent',
                          ]}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                          }}
                        />
                        <LinearGradient
                          colors={[
                            forceBlurAll
                              ? colors.background.tertiaryGlass
                              : colors.background.tertiarySolid,
                            'transparent',
                          ]}
                          useAngle={true}
                          angle={90}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            opacity: 0.85,
                          }}
                        />
                        <LinearGradient
                          colors={[
                            forceBlurAll
                              ? colors.background.tertiaryGlass
                              : colors.background.tertiarySolid,
                            'transparent',
                          ]}
                          useAngle={true}
                          angle={-90}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            opacity: 0.85,
                          }}
                        />
                      </View>
                    )}
                  </View>
                ) : (
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                      opacity: 0.5,
                    }}>
                    <Text
                      style={{color: colors.text.muted, ...typography.caption}}>
                      No schedule
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            {/* Theme - tall */}
            <View
              style={[
                styles.tile,
                styles.themeTall,
                {minHeight: isTablet ? 240 : 150},
              ]}>
              <View style={styles.tileHeaderColumn}>
                <Image
                  source={require('../assets/theme.png')}
                  style={styles.icon}
                />
                <Text numberOfLines={1} style={styles.tileTitle}>
                  Theme
                </Text>
              </View>
              <View
                style={{
                  gap: isTablet ? spacing.md : spacing.sm,
                  paddingBottom: isTablet ? 5 : 3,
                }}>
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

            {/* Ask Theater AI - Now more square */}
            <View
              style={{
                position: 'relative',
                marginBottom: isTablet ? 5 : 0,
                flex: 1,
              }}>
              <LinearGradient
                colors={['rgb(122, 9, 88)', 'rgb(99, 14, 133)']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={[
                  styles.aiBorder,
                  {borderRadius: isTablet ? 40 : borderRadius.xl},
                ]}
              />
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.aiTile,
                  {borderRadius: isTablet ? 40 : borderRadius.xl, flex: 1},
                ]}
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
            marginTop: isTablet ? spacing.md : spacing.sm,
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
                {(myLanguage?.name || myLanguage?.english_name || '').slice(
                  0,
                  1,
                )}
              </Text>
              <Text numberOfLines={1} style={styles.regionLabel}>
                {myLanguage?.name ||
                  myLanguage?.english_name ||
                  'Select Language'}
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
                  <Text style={styles.emptyText}>Select OTTs</Text>
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
            style={[
              styles.tile,
              {
                paddingVertical: spacing.md,
                minHeight: 60,
                alignItems: 'center',
                justifyContent: 'center',
              },
            ]}
            testID="aboutLegalButton">
            <View
              style={[
                styles.tileHeaderRow,
                {margin: 0, justifyContent: 'center'},
              ]}>
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
        <View style={{height: 150}} />
      </View>

      {/* My Language Modal - single select using LanguageSettings in local mode */}
      <Modal
        visible={showMyLanguageModal}
        animationType="slide"
        statusBarTranslucent={true}
        backdropColor={colors.modal.blurDark}
        onRequestClose={() => setShowMyLanguageModal(false)}>
        {forceBlurAll && (
          <BlurView
            blurType="dark"
            blurAmount={10}
            overlayColor={colors.modal.blurDark}
            style={{
              flex: 1,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}

        <View
          style={{
            flex: 1,
            margin: isTablet ? spacing.xl : spacing.md,
            borderRadius: borderRadius.xl,
            backgroundColor: 'transparent',
          }}>
          <MaybeBlurView
            header
            style={[
              {
                marginTop: 20,
              },
            ]}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              }}>
              <Ionicons name="language" size={20} color={colors.text.muted} />
              <Text
                style={{
                  color: colors.text.primary,
                  ...typography.h3,
                }}>
                My Language
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowMyLanguageModal(false)}
              style={{
                padding: spacing.sm,
                backgroundColor: colors.modal.blur,
                borderRadius: borderRadius.round,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: colors.modal.content,
              }}>
              <Ionicons name="close" size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </MaybeBlurView>
          <View
            style={{
              flex: 1,
              overflow: 'hidden',
              borderRadius: borderRadius.xl,
            }}>
            <MaybeBlurView body style={{flex: 1}}>
              <LanguageSettings
                isTitle={false}
                singleSelect
                disablePersistence
                initialSelectedIso={
                  (myLanguage?.iso_639_1
                    ? [myLanguage.iso_639_1!]
                    : []) as any[]
                }
                onChangeSelected={(langs: any[]) => {
                  SettingsManager.setMyLanguage(langs?.[0] || null);
                  setShowMyLanguageModal(false);
                }}
              />
            </MaybeBlurView>
          </View>
        </View>
      </Modal>

      {/* My OTTs Modal - multi select providers (grid UI like All Watch Providers) */}
      <Modal
        visible={showOTTsModal}
        animationType="slide"
        statusBarTranslucent={true}
        backdropColor={colors.modal.blurDark}
        onRequestClose={() => setShowOTTsModal(false)}>
        {forceBlurAll && (
          <BlurView
            blurType="dark"
            blurAmount={10}
            overlayColor={colors.modal.blurDark}
            style={{
              flex: 1,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}

        <View
          style={{
            flex: 1,
            margin: isTablet ? spacing.xl : spacing.md,
            borderRadius: borderRadius.xl,
            backgroundColor: 'transparent',
          }}>
          <MaybeBlurView
            header
            style={[
              {
                marginTop: 20,
              },
            ]}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              }}>
              <Ionicons name="tv" size={20} color={colors.text.muted} />
              <Text
                style={{
                  color: colors.text.primary,
                  ...typography.h3,
                }}>
                My OTTs
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowOTTsModal(false)}
              style={{
                padding: spacing.sm,
                backgroundColor: colors.modal.blur,
                borderRadius: borderRadius.round,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: colors.modal.content,
              }}>
              <Ionicons name="close" size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </MaybeBlurView>
          <View
            style={{
              flex: 1,
              overflow: 'hidden',
              borderRadius: borderRadius.xl,
            }}>
            <MaybeBlurView body style={{flex: 1}}>
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
                        onPress={() => {
                          setLocalOTTs(prev => {
                            let next = Array.isArray(prev) ? [...prev] : [];
                            if (
                              prev?.some((s: any) => s.id === p.provider_id)
                            ) {
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
                            // Remove duplicates by ID
                            return next.filter(
                              (item, index, self) =>
                                index === self.findIndex(t => t.id === item.id),
                            );
                          });
                        }}
                        style={{
                          borderRadius: 16,
                          margin: 3,
                          opacity: localOTTs?.some(
                            (s: any) => s.id === p.provider_id,
                          )
                            ? 1
                            : 0.7,
                          backgroundColor: localOTTs?.some(
                            (s: any) => s.id === p.provider_id,
                          )
                            ? colors.modal.active
                            : colors.modal.blur,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: localOTTs?.some(
                            (s: any) => s.id === p.provider_id,
                          )
                            ? 2
                            : 0,
                          borderColor: localOTTs?.some(
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
                        {localOTTs?.some(
                          (s: any) => s.id === p.provider_id,
                        ) && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
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
                  <View style={{height: 150}} />
                </ScrollView>
              ) : (
                <View
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <ActivityIndicator size="large" color={colors.text.primary} />
                </View>
              )}

              {/* Fixed Bottom Buttons - Exact FilterModal style */}
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.md,
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: colors.modal.blur,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                  marginHorizontal: isTablet ? '30%' : spacing.xl,
                  marginBottom: spacing.xl,
                  borderRadius: borderRadius.round,
                }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: spacing.md,
                    borderRadius: borderRadius.round,
                    alignItems: 'center',
                    backgroundColor: colors.button.reset,
                  }}
                  onPress={() => setLocalOTTs([])}>
                  <Text
                    style={{
                      color: colors.text.primary,
                      ...typography.button,
                    }}>
                    Clear All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: spacing.md,
                    borderRadius: borderRadius.round,
                    alignItems: 'center',
                    backgroundColor: colors.accent,
                  }}
                  onPress={handleCloseOTTsModal}>
                  <Text
                    style={{
                      color: colors.background.primary,
                      ...typography.button,
                    }}>
                    Save & Close
                  </Text>
                </TouchableOpacity>
              </View>
            </MaybeBlurView>
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
