import React, {useEffect, useState, useMemo, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {useResponsive} from '../hooks/useResponsive';
import {MySpaceStackParamList} from '../types/navigation';
import LinearGradient from 'react-native-linear-gradient';
import {diaryManager, IDiaryEntry} from '../store/diary';
import {DiaryModal} from '../components/modals/DiaryModal';
import {MaybeBlurView} from '../components/MaybeBlurView';
import {Modal} from 'react-native';
import {Notebook as NotebookBold} from '@solar-icons/react-native/dist/icons/notes/Bold/Notebook.mjs';
import {Notebook as NotebookLinear} from '@solar-icons/react-native/dist/icons/notes/Linear/Notebook.mjs';
import {ActivityHeatMap} from '../components/ActivityHeatMap';

const {width, height} = Dimensions.get('window');

type ViewMode = 'month' | 'year';

export const MyDiaryScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MySpaceStackParamList>>();
  const [entries, setEntries] = useState<IDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Header State
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [displayType, setDisplayType] = useState<'timeline' | 'scrapbook'>(
    'timeline',
  );

  // Initialize with current date
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [yearModalVisible, setYearModalVisible] = useState(false);
  const {isTablet} = useResponsive();

  // Edit Modal State
  const [selectedEntry, setSelectedEntry] = useState<IDiaryEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // View Modal State
  const [viewingEntry, setViewingEntry] = useState<IDiaryEntry | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  const dayScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const yearScaleAnim = useRef(new Animated.Value(0)).current;
  const yearFadeAnim = useRef(new Animated.Value(0)).current;
  const viewScaleAnim = useRef(new Animated.Value(0)).current;
  const viewFadeAnim = useRef(new Animated.Value(0)).current;

  const toggleYearModal = (visible: boolean) => {
    if (visible) {
      setYearModalVisible(true);
      Animated.parallel([
        Animated.spring(yearScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(yearFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(yearScaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(yearFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setYearModalVisible(false));
    }
  };

  const toggleViewModal = (visible: boolean, entry?: IDiaryEntry) => {
    if (visible && entry) {
      setViewingEntry(entry);
      setViewModalVisible(true);
      Animated.parallel([
        Animated.spring(viewScaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(viewFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(viewScaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(viewFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setViewModalVisible(false);
        setViewingEntry(null);
      });
    }
  };

  const loadEntries = useCallback(() => {
    const all = diaryManager.getAllEntries();
    setEntries(all);

    // Initialize scrapbook date to most recent entry if not set
    const historyEntries = all.filter(e => e.status !== 'watching');
    if (historyEntries.length > 0) {
      const mostRecent = historyEntries.sort(
        (a, b) =>
          new Date(b.last_updated_at).getTime() -
          new Date(a.last_updated_at).getTime(),
      )[0];
      const recentDate = new Date(mostRecent.last_updated_at);
      setSelectedDate(
        new Date(
          recentDate.getFullYear(),
          recentDate.getMonth(),
          recentDate.getDate(),
        ),
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadEntries();
    diaryManager.addChangeListener(loadEntries);
    return () => diaryManager.removeChangeListener(loadEntries);
  }, [loadEntries]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    loadEntries();
    setRefreshing(false);
  };

  const watchingEntries = useMemo(() => {
    return entries.filter(e => e.status === 'watching');
  }, [entries]);

  const historyEntries = useMemo(() => {
    if (viewMode === 'month') {
      // Monthly view: Filter by selected year, month, and day
      return entries.filter(e => {
        if (e.status === 'watching') return false;
        const d = new Date(e.last_updated_at);
        return (
          d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate()
        );
      });
    } else {
      // Yearly view: Filter by selected year and month
      return entries.filter(e => {
        if (e.status === 'watching') return false;
        const d = new Date(e.last_updated_at);
        return (
          d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth()
        );
      });
    }
  }, [entries, viewMode, selectedDate]);

  const monthsWithData = useMemo(() => {
    const year = selectedDate.getFullYear();
    const activeMonths = new Set<number>();
    entries.forEach(e => {
      if (e.status === 'watching') return;
      const d = new Date(e.last_updated_at);
      if (d.getFullYear() === year) {
        activeMonths.add(d.getMonth());
      }
    });
    return activeMonths;
  }, [entries, selectedDate]);

  const daysWithData = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const activeDays = new Set<number>();
    entries.forEach(e => {
      if (e.status === 'watching') return;
      const d = new Date(e.last_updated_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        activeDays.add(d.getDate());
      }
    });
    return activeDays;
  }, [entries, selectedDate]);

  // Auto-select nearest date with data if current is empty
  useEffect(() => {
    const currentYear = selectedDate.getFullYear();
    const currentMonth = selectedDate.getMonth();
    const currentDay = selectedDate.getDate();

    // 1. Check if current date has data
    const hasDataToday = daysWithData.has(currentDay);
    if (hasDataToday) return;

    // 2. Try to find nearest day in current month
    if (daysWithData.size > 0) {
      const availableDays = Array.from(daysWithData).sort((a, b) => a - b);
      const closestDay = availableDays.reduce((prev, curr) => {
        return Math.abs(curr - currentDay) < Math.abs(prev - currentDay)
          ? curr
          : prev;
      });

      const newDate = new Date(selectedDate);
      newDate.setDate(closestDay);
      setSelectedDate(newDate);
      return;
    }

    // 3. Try to find nearest month in current year
    if (monthsWithData.size > 0) {
      const availableMonths = Array.from(monthsWithData).sort((a, b) => a - b);
      const closestMonth = availableMonths.reduce((prev, curr) => {
        return Math.abs(curr - currentMonth) < Math.abs(prev - currentMonth)
          ? curr
          : prev;
      });

      // Find best day in that month
      const daysInTargetMonth = new Set<number>();
      entries.forEach(e => {
        if (e.status === 'watching') return;
        const d = new Date(e.last_updated_at);
        if (d.getFullYear() === currentYear && d.getMonth() === closestMonth) {
          daysInTargetMonth.add(d.getDate());
        }
      });

      if (daysInTargetMonth.size > 0) {
        const availableDays = Array.from(daysInTargetMonth).sort(
          (a, b) => a - b,
        );
        const closestDay = availableDays.reduce((prev, curr) => {
          return Math.abs(curr - currentDay) < Math.abs(prev - currentDay)
            ? curr
            : prev;
        });

        const newDate = new Date(selectedDate);
        newDate.setMonth(closestMonth);
        newDate.setDate(closestDay);
        setSelectedDate(newDate);
      }
    }
  }, [selectedDate, daysWithData, monthsWithData, entries]);

  // Center active date/month
  useEffect(() => {
    const timer = setTimeout(() => {
      // Timeline Mode Auto-Scroll
      if (displayType === 'timeline') {
        if (viewMode === 'month' && dayScrollRef.current) {
          const index = selectedDate.getDate() - 1;
          const itemWidth = 55 + 8; // width + marginRight
          const offset = index * itemWidth - (width - 150) / 2 + itemWidth / 2;
          dayScrollRef.current.scrollTo({
            x: Math.max(0, offset),
            animated: true,
          });
        } else if (viewMode === 'year' && monthScrollRef.current) {
          const index = selectedDate.getMonth();
          const itemWidth = 70 + 8; // width + marginRight
          const offset = index * itemWidth - (width - 150) / 2 + itemWidth / 2;
          monthScrollRef.current.scrollTo({
            x: Math.max(0, offset),
            animated: true,
          });
        }
      }
      // Scrapbook Mode Auto-Scroll
      else if (displayType === 'scrapbook') {
        // 1. Scroll Month (Header)
        if (monthScrollRef.current) {
          const index = selectedDate.getMonth();
          const itemWidth = 60 + 8; // styles.selectorPillMonth (85) + margin (8)
          const offset = index * itemWidth - (width - 32) / 2 + itemWidth / 2; // Approximation: width-32 is roughly safe area
          monthScrollRef.current.scrollTo({
            x: Math.max(0, offset),
            animated: true,
          });
        }
        // 2. Scroll Day (Footer)
        if (dayScrollRef.current) {
          const index = selectedDate.getDate() - 1;
          const itemWidth = 40 + 12; // Fixed width (40) + margin (24)
          const offset = index * itemWidth - width / 2 + itemWidth / 2;
          dayScrollRef.current.scrollTo({
            x: Math.max(0, offset),
            animated: true,
          });
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [viewMode, displayType, selectedDate]);

  const daysInMonth = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [selectedDate]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    entries.forEach(entry => {
      const year = new Date(entry.last_updated_at).getFullYear();
      yearsSet.add(year);
    });
    // Always include current year or selected year to ensure something is clickable/visible
    yearsSet.add(selectedDate.getFullYear());
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [entries, selectedDate]);

  const monthsOfYear = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push(new Date(selectedDate.getFullYear(), i, 1));
    }
    return months;
  }, [selectedDate]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      marginTop: 30,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    topGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 100,
      zIndex: 1,
      pointerEvents: 'none',
    },
    headerTitle: {
      ...typography.h2,
      color: '#fff',
    },
    scrapbookToggle: {
      padding: spacing.md,
      borderRadius: borderRadius.round,
      backgroundColor: colors.modal.blur,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderTopWidth: 0,
      borderColor: colors.modal.content,
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleRowContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: spacing.lg,
    },
    toggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.modal.blur,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.content,
      borderRadius: 20,
      padding: 4,
    },
    toggleBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 18,
    },
    toggleBtnActive: {
      backgroundColor: colors.modal.blur,
      borderColor: colors.modal.header,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderTopWidth: 0,
    },
    toggleText: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    toggleTextActive: {
      color: colors.text.primary,
    },
    watchingSection: {
      marginBottom: spacing.xl,
    },
    sectionTitleCap: {
      ...typography.h3,
      color: '#fff',
      marginLeft: spacing.lg,
      marginBottom: spacing.md,
    },
    watchingCard: {
      width: 250,
      backgroundColor: colors.modal.blur,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.modal.header,
      flexDirection: 'row',
      padding: 12,
      marginRight: spacing.md,
      alignItems: 'center',
    },
    watchingPoster: {
      width: 65,
      height: 85,
      borderRadius: 16,
    },
    watchingInfo: {
      flex: 1,
      marginLeft: 12,
    },
    watchingTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 2,
    },
    watchingSubtitle: {
      fontSize: 11,
      color: '#8E8E93',
      marginBottom: 10,
    },
    watchingProgressBarContainer: {
      height: 6,
      backgroundColor: colors.modal.content,
      borderRadius: 3,
      width: '100%',
      overflow: 'hidden',
    },
    watchingProgressFill: {
      height: '100%',
      backgroundColor: '#fff',
      borderRadius: 3,
    },
    timelineContainer: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xl,
      marginTop: spacing.md,
    },
    timelineBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: -spacing.xs,
    },
    timelineLabelGroup: {
      alignItems: 'center',
      marginRight: spacing.sm,
      minWidth: isTablet ? 50 : 20,
    },
    timelineYear: {
      ...typography.body2,
      fontSize: isTablet ? 16 : 12,
      color: colors.text.primary,
      fontWeight: '500',
      marginBottom: 2,
    },
    timelineMonth: {
      ...typography.h2,
      fontSize: isTablet ? 32 : 24,
      color: colors.text.primary,
      fontWeight: '900',
    },
    timelineDivider: {
      width: 1,
      height: 50,
      backgroundColor: colors.modal.header,
    },
    edgeGradientLeft: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 60,
      zIndex: 10,
    },
    edgeGradientRight: {
      position: 'absolute',
      right: -10,
      top: 0,
      bottom: 0,
      width: 60,
      zIndex: 10,
    },
    selectorContent: {
      paddingHorizontal: spacing.md,
    },
    selectorPill: {
      width: 75,
      height: 90,
      borderRadius: 24,
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderTopWidth: 0,
    },
    selectorPillMonth: {
      height: 60,
      paddingHorizontal: 16,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectorPillActive: {},
    selectorDayName: {
      fontSize: 11,
      color: colors.text.secondary,
      fontWeight: '500',
      marginBottom: 8,
    },
    selectorDayActive: {
      color: '#F2F2F7',
    },
    selectorDayNum: {
      fontSize: 26,
      color: '#8E8E93',
      fontWeight: '900',
    },
    selectorDayNumActive: {
      color: '#fff',
    },
    selectorMonthName: {
      fontSize: 18,
      color: '#8E8E93',
      fontWeight: 'bold',
    },
    selectorMonthActive: {
      color: '#fff',
    },
    yearListItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xl,
      borderRadius: 16,
      marginHorizontal: spacing.md,
      marginBottom: 4,
    },
    yearListItemActive: {
      backgroundColor: colors.modal.blur,
      borderColor: colors.modal.header,
      borderWidth: 1,
      borderBottomWidth: 0,
    },
    yearListItemText: {
      ...typography.h3,
      color: colors.text.secondary,
      letterSpacing: 0.5,
    },
    yearListItemTextActive: {
      color: colors.text.primary,
      fontWeight: '900',
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.modal.blur,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderTopWidth: 0,
      borderBottomWidth: 0,
      borderColor: colors.modal.header,
    },
    historyContainer: {
      paddingHorizontal: spacing.lg,
    },
    historyCardOuter: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 30,
      overflow: 'visible',
    },
    entryEmoji: {
      fontSize: 48,
      marginRight: -20,
      marginTop: 15,
      textAlign: 'center',
    },
    entryDayNum: {
      fontSize: 48,
      letterSpacing: -1,
      color: '#fff',
      fontWeight: '900',
      marginRight: -6,
      textAlign: 'center',
    },
    historyCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.tertiaryGlass,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.modal.content,
      padding: 10,
      overflow: 'visible',
    },
    historyPosterContainer: {
      marginTop: -30,
    },
    historyPoster: {
      width: 65,
      height: 110,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.modal.content,
    },
    historyContent: {
      flex: 1,
      marginLeft: spacing.sm,
    },
    historyTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#fff',
      marginBottom: 4,
    },
    historyNote: {
      fontSize: 11,
      color: '#8E8E93',
      lineHeight: 14,
      marginBottom: 8,
      fontFamily: 'Inter_18pt-Light',
    },
    historyFooter: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    footerEmoji: {
      fontSize: 14,
      marginRight: 6,
    },
    footerRating: {
      fontSize: 11,
      fontWeight: 'bold',
      color: '#8E8E93',
    },
    emptyState: {
      alignItems: 'center',
      padding: 60,
    },
    emptyStateText: {
      color: '#48484A',
      fontSize: 14,
    },
    statsSection: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xl,
    },
    wrapupCard: {
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: '#2C2C2E',
    },
    wrapupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    wrapupTitle: {
      ...typography.h3,
      color: '#fff',
      fontWeight: 'bold',
    },
    wrapupSubtitle: {
      fontSize: 12,
      color: '#8E8E93',
      marginTop: 2,
    },
    wrapupMood: {
      fontSize: 40,
    },
    heatmapRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 12,
    },
    heatmapItem: {
      alignItems: 'center',
      gap: 6,
    },
    heatmapEmoji: {
      fontSize: 16,
      marginTop: 4,
    },
    heatmapCount: {
      fontSize: 10,
      color: '#8E8E93',
      marginBottom: 4,
      fontWeight: '600',
    },
    barTrack: {
      width: 24,
      height: 60,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderRadius: 12,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
    barFill: {
      width: '100%',
      borderRadius: 8,
    },
    topTenSection: {
      marginBottom: spacing.xl,
    },
    topTenCard: {
      width: 100,
      height: 150,
      marginRight: 12,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#121214',
      borderWidth: 1,
      borderColor: '#2C2C2E',
    },
    topTenPoster: {
      width: '100%',
      height: '100%',
    },
    topTenRank: {
      position: 'absolute',
      top: 0,
      left: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderBottomRightRadius: 12,
    },
    topTenRankText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '900',
    },
    topTenRating: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0,0,0,0.8)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    topTenRatingText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
    },
    scrapbookGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: spacing.lg,
      gap: 12,
    },
    scrapbookItem: {
      width: (width - spacing.lg * 2 - 12) / 2,
      height: 240,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: '#121214',
      borderWidth: 1,
      borderColor: '#2C2C2E',
    },
    scrapbookPoster: {
      width: '100%',
      height: '100%',
    },
    scrapbookOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      padding: 16,
      height: '50%',
      justifyContent: 'flex-end',
    },
    scrapbookMood: {
      fontSize: 32,
      marginBottom: 4,
    },
    scrapbookNote: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 16,
    },
  });

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>My Diary</Text>
      <View style={{flex: 1}} />
      {entries.length > 0 && (
        <TouchableOpacity
          style={styles.scrapbookToggle}
          onPress={() =>
            setDisplayType(
              displayType === 'timeline' ? 'scrapbook' : 'timeline',
            )
          }>
          {displayType === 'timeline' ? (
            <NotebookLinear size={20} color="#fff" />
          ) : (
            <NotebookBold size={20} color="#fff" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderWatchingCard = ({item}: {item: IDiaryEntry}) => {
    const dateLabel = new Date(item.started_at).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
    return (
      <TouchableOpacity
        style={styles.watchingCard}
        activeOpacity={0.8}
        onPress={() => {
          setSelectedEntry(item);
          setModalVisible(true);
        }}>
        <Image
          source={{uri: `https://image.tmdb.org/t/p/w200${item.poster_path}`}}
          style={styles.watchingPoster}
        />
        <View style={styles.watchingInfo}>
          <Text style={styles.watchingTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.watchingSubtitle}>started at {dateLabel}</Text>
          <View style={styles.watchingProgressBarContainer}>
            <View
              style={[
                styles.watchingProgressFill,
                {width: `${item.progress}%`},
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHistoryCard = (entry: IDiaryEntry) => {
    const isTV = entry.type === 'tv';
    const hasNote = !!entry.note;
    const dayNum = new Date(entry.last_updated_at).getDate();
    const moodEmoji = entry.mood || '';
    const ratingLabel = entry.rating ? entry.rating.toFixed(1) : '';

    return (
      <View key={entry.id} style={styles.historyCardOuter}>
        {viewMode === 'month' ? (
          <View style={{position: 'relative'}}>
            <Text style={styles.entryEmoji}>{moodEmoji}</Text>
            <LinearGradient
              colors={['transparent', colors.background.primary]}
              useAngle
              angle={90}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: -10,
                bottom: 0,
              }}
            />
          </View>
        ) : (
          <View style={{position: 'relative'}}>
            <Text style={styles.entryDayNum}>{dayNum}</Text>
            <LinearGradient
              colors={['transparent', colors.background.primary]}
              useAngle
              angle={90}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: -5,
                bottom: 0,
              }}
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.historyCard}
          activeOpacity={0.9}
          onPress={() => toggleViewModal(true, entry)}
          onLongPress={() => {
            setSelectedEntry(entry);
            setModalVisible(true);
          }}>
          <View style={styles.historyPosterContainer}>
            <Image
              source={{
                uri: `https://image.tmdb.org/t/p/w200${entry.poster_path}`,
              }}
              style={styles.historyPoster}
            />
          </View>
          <View style={styles.historyContent}>
            <Text style={styles.historyTitle} numberOfLines={1}>
              {entry.title}
            </Text>
            {entry.note && (
              <Text style={styles.historyNote} numberOfLines={2}>
                {entry.note}
              </Text>
            )}
            <View style={styles.historyFooter}>
              {viewMode === 'year' && (
                <Text style={styles.footerEmoji}>{moodEmoji}</Text>
              )}
              <Text style={styles.footerRating}>{ratingLabel}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTimelineSelector = () => (
    <View style={styles.timelineContainer}>
      {/* Top right toggle */}
      <View style={styles.toggleRowContainer}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'month' && styles.toggleBtnActive,
            ]}
            onPress={() => setViewMode('month')}>
            <Text
              style={[
                styles.toggleText,
                viewMode === 'month' && styles.toggleTextActive,
              ]}>
              This month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              viewMode === 'year' && styles.toggleBtnActive,
            ]}
            onPress={() => setViewMode('year')}>
            <Text
              style={[
                styles.toggleText,
                viewMode === 'year' && styles.toggleTextActive,
              ]}>
              This year
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.timelineBottomRow}>
        <View style={styles.timelineLabelGroup}>
          {viewMode === 'month' ? (
            <>
              <Text style={styles.timelineYear}>
                {selectedDate.getFullYear()}
              </Text>
              <Text style={styles.timelineMonth}>
                {selectedDate.toLocaleDateString('en-US', {month: 'short'})}
              </Text>
            </>
          ) : (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleYearModal(true)}
              style={{alignItems: 'center'}}>
              <Text
                style={[
                  styles.timelineYear,
                  {
                    opacity: 0.2,
                    marginBottom: isTablet ? -38 : -28,
                    marginRight: isTablet ? 28 : 18,
                    fontSize: isTablet ? 42 : 32,
                    fontWeight: '900',
                  },
                ]}>
                {Math.floor(selectedDate.getFullYear() / 100)}
              </Text>
              <Text
                style={[
                  styles.timelineMonth,
                  {
                    fontSize: isTablet ? 42 : 32,
                    fontWeight: '900',
                  },
                ]}>
                {selectedDate.getFullYear() % 100}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.timelineDivider} />

        <View
          style={{
            flex: 1,
            position: 'relative',
          }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectorContent}
            ref={viewMode === 'month' ? dayScrollRef : monthScrollRef}>
            {viewMode === 'month'
              ? daysInMonth.map((d, i) => {
                  const isActive = d.getDate() === selectedDate.getDate();
                  const hasData = daysWithData.has(d.getDate());

                  return (
                    <TouchableOpacity
                      key={i}
                      disabled={!hasData}
                      style={[
                        {
                          padding: 16,
                          minWidth: 60,
                          borderRadius: 24,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: colors.modal.blur,
                          borderWidth: 1,
                          borderColor: colors.modal.content,
                          marginRight: 6,
                        },
                        isActive && {
                          backgroundColor: colors.modal.blur,
                          borderColor: colors.modal.header,
                          borderWidth: 1,
                          borderBottomWidth: 1,
                          borderTopWidth: 1,
                        },
                        !hasData && {opacity: 0.2},
                      ]}
                      onPress={() => setSelectedDate(new Date(d))}>
                      <Text
                        style={[
                          styles.selectorDayName,
                          isActive && styles.selectorDayActive,
                          !hasData && {color: '#8E8E93'},
                        ]}>
                        {d.toLocaleDateString('en-US', {weekday: 'short'})}
                      </Text>
                      <Text
                        style={[
                          styles.selectorDayNum,
                          isActive && styles.selectorDayNumActive,
                          !hasData && {color: '#8E8E93'},
                        ]}>
                        {d.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              : monthsOfYear.map((m, i) => {
                  const isActive = m.getMonth() === selectedDate.getMonth();
                  const hasData = monthsWithData.has(m.getMonth());

                  return (
                    <TouchableOpacity
                      key={i}
                      disabled={!hasData}
                      style={[
                        {
                          height: 60,
                          paddingHorizontal: 16,
                          borderRadius: 24,
                          justifyContent: 'center',
                          alignItems: 'center',
                        },
                        isActive && {
                          backgroundColor: colors.modal.blur,
                          borderColor: colors.modal.header,
                          borderWidth: 1,
                        },
                        !hasData && {opacity: 0.2},
                      ]}
                      onPress={() => setSelectedDate(new Date(m))}>
                      <Text
                        style={[
                          styles.selectorMonthName,
                          isActive && styles.selectorMonthActive,
                          !hasData && {color: '#8E8E93'},
                        ]}>
                        {m.toLocaleDateString('en-US', {month: 'short'})}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
          </ScrollView>

          {/* Left Edge Gradient */}
          <LinearGradient
            colors={[colors.background.primary, 'transparent']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.edgeGradientLeft}
            pointerEvents="none"
          />
          {/* Right Edge Gradient */}
          <LinearGradient
            colors={['transparent', colors.background.primary]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.edgeGradientRight}
            pointerEvents="none"
          />
        </View>
      </View>
    </View>
  );

  const renderScrapbookYearSelector = () => (
    <View
      style={{position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100}}>
      {/* Top Gradient */}
      <LinearGradient
        colors={[
          colors.background.primary,
          colors.background.primary,
          'transparent',
        ]}
        style={{...StyleSheet.absoluteFillObject, height: 250}}
        pointerEvents="none"
      />

      {/* Header Title Row */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Diary</Text>
        <View style={{flex: 1}} />
        <TouchableOpacity
          style={styles.scrapbookToggle}
          onPress={() =>
            setDisplayType(
              displayType === 'timeline' ? 'scrapbook' : 'timeline',
            )
          }>
          {displayType === 'timeline' ? (
            <NotebookLinear size={20} color="#fff" />
          ) : (
            <NotebookBold size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Year/Month Selector Row */}
      <View
        style={[
          styles.timelineContainer,
          {marginTop: 80, paddingHorizontal: spacing.lg},
        ]}>
        <View style={styles.timelineBottomRow}>
          <View style={styles.timelineLabelGroup}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleYearModal(true)}
              style={{alignItems: 'center'}}>
              <Text
                style={[
                  styles.timelineYear,
                  {
                    opacity: 0.2,
                    marginBottom: isTablet ? -38 : -28,
                    marginRight: isTablet ? 28 : 18,
                    fontSize: isTablet ? 42 : 32,
                    fontWeight: '900',
                  },
                ]}>
                {Math.floor(selectedDate.getFullYear() / 100)}
              </Text>
              <Text
                style={[
                  styles.timelineMonth,
                  {
                    fontSize: isTablet ? 42 : 32,
                    fontWeight: '900',
                  },
                ]}>
                {selectedDate.getFullYear() % 100}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.timelineDivider} />

          <View
            style={{
              flex: 1,
              position: 'relative',
            }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectorContent}
              ref={monthScrollRef}>
              {monthsOfYear.map((m, i) => {
                const isActive = m.getMonth() === selectedDate.getMonth();
                const hasData = monthsWithData.has(m.getMonth());
                return (
                  <TouchableOpacity
                    key={i}
                    disabled={!hasData}
                    style={[
                      styles.selectorPillMonth,
                      isActive && styles.selectorPillActive,
                      !hasData && {opacity: 0.2, borderColor: 'transparent'},
                    ]}
                    onPress={() => setSelectedDate(new Date(m))}>
                    <Text
                      style={[
                        styles.selectorMonthName,
                        isActive && styles.selectorMonthActive,
                        !hasData && {color: '#8E8E93'},
                      ]}>
                      {m.toLocaleDateString('en-US', {month: 'short'})}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Left Edge Gradient */}
            <LinearGradient
              colors={[colors.background.primary, 'transparent']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.edgeGradientLeft}
              pointerEvents="none"
            />
            {/* Right Edge Gradient */}
            <LinearGradient
              colors={['transparent', colors.background.primary]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={styles.edgeGradientRight}
              pointerEvents="none"
            />
          </View>
        </View>
      </View>
    </View>
  );

  const renderStatsSection = () => {
    const monthLogs = entries.filter(e => {
      const d = new Date(e.last_updated_at);
      return (
        d.getFullYear() === selectedDate.getFullYear() &&
        d.getMonth() === selectedDate.getMonth()
      );
    });

    if (monthLogs.length === 0) return null;

    const moodCounts: {[key: string]: number} = {};
    monthLogs.forEach(e => {
      if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    });

    const dominantMood = Object.keys(moodCounts).reduce(
      (a, b) => (moodCounts[a] > moodCounts[b] ? a : b),
      '🤩',
    );

    return (
      <View style={styles.statsSection}>
        <LinearGradient
          colors={['#1C1C1E', '#121214']}
          style={styles.wrapupCard}>
          <View style={styles.wrapupHeader}>
            <View>
              <Text style={styles.wrapupTitle}>
                {selectedDate.toLocaleDateString('en-US', {month: 'long'})}{' '}
                Recap
              </Text>
              <Text style={styles.wrapupSubtitle}>
                {monthLogs.length} titles logged this month
              </Text>
            </View>
            <Text style={styles.wrapupMood}>{dominantMood}</Text>
          </View>

          <View style={styles.heatmapRow}>
            {Object.entries(moodCounts).map(([m, count]) => (
              <View key={m} style={styles.heatmapItem}>
                <Text style={styles.heatmapCount}>{count}</Text>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.1)']}
                    style={[
                      styles.barFill,
                      {height: `${(count / monthLogs.length) * 100}%`},
                    ]}
                  />
                </View>
                <Text style={styles.heatmapEmoji}>{m}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderTopTen = () => {
    const topTen = entries
      .filter(e => e.rating && e.status !== 'watching')
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10);

    if (topTen.length === 0) return null;

    return (
      <View style={styles.topTenSection}>
        <Text style={styles.sectionTitleCap}>Personal Hall of Fame</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal: spacing.lg}}>
          {topTen.map((entry, index) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.topTenCard}
              onPress={() => toggleViewModal(true, entry)}>
              <Image
                source={{
                  uri: `https://image.tmdb.org/t/p/w200${entry.poster_path}`,
                }}
                style={styles.topTenPoster}
              />
              <View style={styles.topTenRank}>
                <Text style={styles.topTenRankText}>{index + 1}</Text>
              </View>
              <View style={styles.topTenRating}>
                <Ionicons name="star" size={10} color="#F5C518" />
                <Text style={styles.topTenRatingText}>
                  {(entry.rating! / 2).toFixed(1)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderEntryViewModal = () => {
    if (!viewingEntry) return null;

    const isTV = viewingEntry.type === 'tv';

    // Calculate duration string
    let durationString = '';
    if (viewingEntry.started_at) {
      if (viewingEntry.finished_at) {
        const start = new Date(viewingEntry.started_at);
        const end = new Date(viewingEntry.finished_at);
        // Normalized difference
        const timeDiff = Math.abs(end.getTime() - start.getTime());
        const days = Math.floor(timeDiff / (1000 * 3600 * 24));
        const displayDays = days < 1 ? 1 : days;
        durationString = isTV
          ? `Watched in ${displayDays} ${displayDays === 1 ? 'day' : 'days'}`
          : '';
      } else {
        durationString = `Started ${new Date(
          viewingEntry.started_at,
        ).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}`;
      }
    }

    // Prepare Timeline Data
    const timelineData: {
      type: 'season' | 'episode';
      title: string;
      note?: string;
    }[] = [];

    const sNotes = viewingEntry.season_notes || {};
    const eNotes = viewingEntry.episode_notes || {};

    const seasonNums = new Set<number>();
    Object.keys(sNotes).forEach(k => seasonNums.add(parseInt(k, 10)));
    Object.keys(eNotes).forEach(k => {
      // Regex to match "S1E1", "S01E01", "s1e1", etc.
      const match = k.match(/S(\d+)E/i);
      if (match) seasonNums.add(parseInt(match[1], 10));
    });

    const sortedSeasons = Array.from(seasonNums).sort((a, b) => a - b);

    sortedSeasons.forEach(sNum => {
      // Season header
      const seasonNote = sNotes[sNum.toString()] || sNotes[`${sNum}`];
      timelineData.push({
        type: 'season',
        title: sNum === 0 ? 'Specials' : `Season ${sNum}`,
        note: seasonNote,
      });

      // Episodes for this season
      const episodes = Object.entries(eNotes)
        .filter(([key]) => {
          const match = key.match(/S(\d+)E/i);
          return match && parseInt(match[1], 10) === sNum;
        })
        .sort((a, b) => {
          const matchA = a[0].match(/E(\d+)/i);
          const matchB = b[0].match(/E(\d+)/i);
          const epA = matchA ? parseInt(matchA[1], 10) : 0;
          const epB = matchB ? parseInt(matchB[1], 10) : 0;
          return epA - epB;
        });

      episodes.forEach(([key, noteStr]) => {
        const match = key.match(/E(\d+)/i);
        const epNum = match ? parseInt(match[1], 10) : 0;
        const epNumStr = epNum < 10 ? `0${epNum}` : `${epNum}`;

        let displayNote = noteStr;
        let displayTitle = `${epNumStr} Episode`;

        try {
          if (noteStr && noteStr.trim().startsWith('{')) {
            const parsed = JSON.parse(noteStr);
            if (parsed.text) displayNote = parsed.text;
            if (parsed.title) {
              displayTitle = `${epNumStr} ${parsed.title}`;
            }
          }
        } catch (e) {}

        timelineData.push({
          type: 'episode',
          title: displayTitle,
          note: displayNote as string,
        });
      });
    });

    return (
      <Modal
        visible={viewModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => toggleViewModal(false)}>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          {/* Full Screen Blur Backdrop */}
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={10}
            overlayColor={colors.modal.blurDark}
          />

          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              opacity: viewFadeAnim,
            }}>
            <TouchableOpacity
              activeOpacity={1}
              style={StyleSheet.absoluteFillObject}
              onPress={() => toggleViewModal(false)}
            />
          </Animated.View>

          <Animated.View
            style={{
              width: isTablet ? '45%' : width * 0.85,
              maxHeight: height * 0.8,
              opacity: viewFadeAnim,
              transform: [{scale: viewScaleAnim}],
            }}>
            <View
              style={{
                borderRadius: 24,
                overflow: 'hidden',
                backgroundColor: colors.modal.blur,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
              }}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingVertical: 32,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                }}>
                {/* Header Cluster */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    marginBottom: 20,
                    width: '100%',
                    paddingHorizontal: 20,
                  }}>
                  {viewingEntry.rating ? (
                    <Text
                      style={{
                        fontSize: 72,
                        fontWeight: '900',
                        color: '#fff',
                        marginRight: -24,
                        zIndex: 2,
                        marginBottom: -10,
                        textShadowColor: 'rgba(0,0,0,0.5)',
                        textShadowOffset: {width: 0, height: 2},
                        textShadowRadius: 4,
                      }}>
                      {Math.round(viewingEntry.rating)}
                    </Text>
                  ) : null}

                  <View
                    style={{
                      width: 100,
                      height: 150,
                      borderRadius: 16,
                      backgroundColor: '#222',
                      zIndex: 1,
                      borderWidth: 2,
                      borderColor: 'rgba(255,255,255,0.1)',
                      shadowColor: colors.background.primary,
                      shadowOffset: {width: 0, height: 4},
                      shadowOpacity: 0.5,
                      shadowRadius: 8,
                      elevation: 10,
                    }}>
                    <Image
                      source={{
                        uri: `https://image.tmdb.org/t/p/w300${viewingEntry.poster_path}`,
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 14,
                      }}
                      resizeMode="cover"
                    />
                  </View>

                  {viewingEntry.mood ? (
                    <Text
                      style={{
                        fontSize: 48,
                        marginLeft: -20,
                        marginBottom: -4,
                        zIndex: 3,
                      }}>
                      {viewingEntry.mood}
                    </Text>
                  ) : null}
                </View>

                {/* Title */}
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: '#fff',
                    textAlign: 'center',
                    marginBottom: 4,
                  }}>
                  {viewingEntry.title}
                </Text>

                {/* Duration */}
                <Text
                  style={{
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.7)',
                    marginBottom: 24,
                    fontWeight: '500',
                  }}>
                  {durationString}
                </Text>

                {/* Main Note */}
                {viewingEntry.note ? (
                  <Text
                    style={{
                      fontSize: 15,
                      color: 'rgba(255,255,255,0.9)',
                      textAlign: 'center',
                      marginBottom: 32,
                      lineHeight: 22,
                    }}>
                    {viewingEntry.note}
                  </Text>
                ) : null}

                {/* Timeline */}
                {sortedSeasons.map(sNum => {
                  // Get season note
                  const seasonNote =
                    sNotes[sNum.toString()] || sNotes[`${sNum}`];

                  // Get episodes for this season
                  const episodes = Object.entries(eNotes)
                    .filter(([key]) => {
                      const match = key.match(/S(\d+)E/i);
                      return match && parseInt(match[1], 10) === sNum;
                    })
                    .sort((a, b) => {
                      const matchA = a[0].match(/E(\d+)/i);
                      const matchB = b[0].match(/E(\d+)/i);
                      const epA = matchA ? parseInt(matchA[1], 10) : 0;
                      const epB = matchB ? parseInt(matchB[1], 10) : 0;
                      return epA - epB;
                    });

                  return (
                    <View key={sNum} style={{width: '100%'}}>
                      {/* Vertical Line for this Season Block */}
                      <View
                        style={{
                          position: 'absolute',
                          left: 9,
                          top: 14,
                          bottom: episodes.length > 0 ? 10 : 14,
                          width: 1,
                          backgroundColor: 'rgba(255,255,255,0.2)',
                        }}
                      />

                      {/* Secondary Vertical Line for Episodes */}
                      {episodes.length > 0 && (
                        <View
                          style={{
                            position: 'absolute',
                            left: 29, // Align with episode dots (26 + 3.5)
                            top: 60,
                            bottom: 12,
                            width: 1,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                          }}
                        />
                      )}

                      {/* Season Header */}
                      <View
                        style={{
                          flexDirection: 'row',
                          marginBottom: episodes.length > 0 ? 20 : 0,
                        }}>
                        <View
                          style={{
                            width: 20,
                            alignItems: 'center',
                            marginRight: 12,
                            paddingTop: 6,
                          }}>
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: '#cacacaff',
                            }}
                          />
                        </View>
                        <View style={{flex: 1}}>
                          <Text
                            style={{
                              color: '#a5a5a5ff',
                              fontSize: 13,
                              fontWeight: '700',
                              marginBottom: 4,
                            }}>
                            {sNum === 0 ? 'Specials' : `Season ${sNum}`}
                          </Text>
                          {seasonNote ? (
                            <Text
                              style={{
                                color: colors.text.primary,
                                fontSize: 13,
                                lineHeight: 18,
                              }}>
                              {seasonNote}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {/* Episodes */}
                      {episodes.map(([key, noteStr]) => {
                        const match = key.match(/E(\d+)/i);
                        const epNum = match ? parseInt(match[1], 10) : 0;
                        const epNumStr = epNum < 10 ? `0${epNum}` : `${epNum}`;

                        let displayNote = noteStr;
                        let displayNumber = 'E' + epNum;
                        let displayTitle = `Episode ${epNum}`;

                        try {
                          if (noteStr && noteStr.trim().startsWith('{')) {
                            const parsed = JSON.parse(noteStr);
                            if (parsed.text) displayNote = parsed.text;
                            if (parsed.title) displayTitle = parsed.title;
                          }
                        } catch (e) {}

                        return (
                          <View
                            key={key}
                            style={{
                              flexDirection: 'row',
                              marginBottom: 12,
                              marginLeft: 26, // Indent for episode row
                            }}>
                            <View
                              style={{
                                width: 7,
                                height: 7,
                                alignItems: 'center',
                                marginRight: 12,
                                paddingTop: 4,
                              }}>
                              {/* Episode Dot */}
                              <View
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: 3.5,
                                  backgroundColor: '#7e7e7eff',
                                  marginTop: 4,
                                }}
                              />
                            </View>
                            <View style={{flex: 1}}>
                              <View style={{flexDirection: 'row', gap: 4}}>
                                <Text
                                  style={{
                                    color: '#a5a5a5ff',
                                    fontSize: 12,
                                    fontWeight: '700',
                                  }}>
                                  {displayNumber}
                                </Text>
                                <Text
                                  style={{
                                    color: colors.text.primary,
                                    fontSize: 12,
                                    fontWeight: '700',
                                    marginBottom: 2,
                                  }}>
                                  {displayTitle}
                                </Text>
                              </View>
                              <Text
                                style={{
                                  color: colors.text.primary,
                                  fontSize: 13,
                                  lineHeight: 18,
                                }}>
                                {typeof displayNote === 'string'
                                  ? displayNote
                                  : ''}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
              </ScrollView>

              {/* Action Buttons (Close Only) */}
              <TouchableOpacity
                onPress={() => toggleViewModal(false)}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: colors.modal.blur,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderBottomWidth: 0,
                  borderTopWidth: 0,
                  borderColor: colors.modal.content,
                }}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const renderYearSelectorModal = () => (
    <Modal
      visible={yearModalVisible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={() => toggleYearModal(false)}>
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Animated.View
          style={{
            ...StyleSheet.absoluteFillObject,
            opacity: yearFadeAnim,
          }}>
          <BlurView
            blurType="dark"
            overlayColor={colors.modal.blurDark}
            blurAmount={15}
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={() => toggleYearModal(false)}
          />
        </Animated.View>

        <Animated.View
          style={{
            width: isTablet ? '45%' : width * 0.85,
            maxHeight: height * 0.6,
            opacity: yearFadeAnim,
            transform: [{scale: yearScaleAnim}],
          }}>
          <View
            style={{
              backgroundColor: colors.modal.blur,
              borderRadius: 32,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
              overflow: 'hidden',
              paddingBottom: spacing.lg,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.xl,
                paddingVertical: spacing.xl,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                }}>
                <View>
                  <Text style={{color: '#fff', ...typography.h3}}>
                    Select Year
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => toggleYearModal(false)}
                style={styles.closeButton}>
                <Ionicons name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: spacing.md,
              }}>
              {availableYears.map(year => {
                const isActive = year === selectedDate.getFullYear();
                return (
                  <TouchableOpacity
                    key={year}
                    activeOpacity={0.7}
                    onPress={() => {
                      const newDate = new Date(selectedDate);
                      newDate.setFullYear(year);
                      setSelectedDate(newDate);
                      toggleYearModal(false);
                    }}
                    style={[
                      styles.yearListItem,
                      isActive && styles.yearListItemActive,
                    ]}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.md,
                      }}>
                      <Text
                        style={[
                          styles.yearListItemText,
                          isActive && styles.yearListItemTextActive,
                        ]}>
                        {year}
                      </Text>
                    </View>
                    {isActive && (
                      <Ionicons
                        name="checkmark"
                        size={24}
                        color={colors.accent}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  // Fixed Footer (Day Selector)
  const renderFixedFooter = () => {
    // Generate days for current month
    const days = daysInMonth;

    return (
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}>
        {/* Bottom Gradient */}
        <LinearGradient
          colors={[
            'transparent',
            colors.background.primary,
            colors.background.primary,
          ]}
          style={{...StyleSheet.absoluteFillObject, height: 200, top: -60}}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[colors.background.primary, 'transparent']}
          useAngle
          angle={90}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            width: '30%',
            height: 70,
            zIndex: 1,
          }}
          pointerEvents="none"
        />
        <LinearGradient
          colors={[colors.background.primary, 'transparent']}
          useAngle
          angle={-90}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: '30%',
            height: 70,
            zIndex: 1,
          }}
          pointerEvents="none"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: 20,
            paddingTop: 10,
            alignItems: 'center',
          }}
          ref={dayScrollRef}>
          {days.map((d, i) => {
            const isActive = d.getDate() === selectedDate.getDate();
            const isToday = new Date().toDateString() === d.toDateString();
            const hasData = daysWithData.has(d.getDate());

            return (
              <TouchableOpacity
                key={i}
                disabled={!hasData}
                onPress={() => setSelectedDate(d)}
                style={{
                  alignItems: 'center',
                  marginRight: 10,
                  width: 40,
                  opacity: isActive ? 1 : hasData ? 0.5 : 0.2,
                  transform: [{scale: isActive ? 1.1 : 1}],
                }}>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 24,
                    fontWeight: '900',
                  }}>
                  {d.getDate()}
                </Text>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 10,
                    marginBottom: 4,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                  }}>
                  {d.toLocaleDateString('en-US', {weekday: 'short'})}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // 3. Main Content (Daily List)
  const renderDailyContent = () => {
    const dayEntries = entries
      .filter(e => {
        if (e.status === 'watching') return false;
        const d = new Date(e.last_updated_at);
        return (
          d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate()
        );
      })
      .sort(
        (a, b) =>
          new Date(b.last_updated_at).getTime() -
          new Date(a.last_updated_at).getTime(),
      );

    return (
      <View
        style={{
          paddingTop: 180,
          paddingBottom: 150,
          paddingHorizontal: spacing.lg,
        }}>
        {dayEntries.length === 0 ? (
          <View style={{alignItems: 'center', marginTop: 100, opacity: 0.5}}>
            <Text style={{color: '#fff', fontSize: 16}}>
              No logs for this day
            </Text>
          </View>
        ) : (
          dayEntries.map(entry => {
            const isTV = entry.type === 'tv';
            const sNotes = entry.season_notes || {};
            const eNotes = entry.episode_notes || {};
            const hasTimeline =
              isTV &&
              (Object.keys(sNotes).length > 0 ||
                Object.keys(eNotes).length > 0);

            return (
              <View
                key={entry.id}
                style={{
                  flexDirection: 'row',
                  marginBottom: 24,
                  alignItems: 'flex-start',
                }}>
                {/* Left Emoji */}
                <View
                  style={{
                    width: 50,
                    alignItems: 'center',
                    paddingTop: 10,
                    zIndex: 2,
                  }}>
                  <Text style={{fontSize: 32}}>{entry.mood || '😐'}</Text>
                </View>

                {/* Card */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => toggleViewModal(true, entry)}
                  style={{
                    flex: 1,
                    backgroundColor: '#1C1C1E',
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    padding: 16,
                    paddingLeft: 24, // Space for poster overlap
                    marginLeft: -10, // Pull closer to emoji
                    minHeight: 120,
                  }}>
                  <View style={{flexDirection: 'row'}}>
                    {/* Floating Poster (Negative Margin) */}
                    <View
                      style={{
                        width: 70,
                        height: 105,
                        borderRadius: 12,
                        position: 'absolute',
                        left: -45,
                        top: 0,
                        backgroundColor: colors.background.primary,
                        shadowColor: colors.background.primary,
                        shadowOpacity: 0.5,
                        shadowRadius: 10,
                        elevation: 5,
                      }}>
                      <Image
                        source={{
                          uri: `https://image.tmdb.org/t/p/w200${entry.poster_path}`,
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: 12,
                        }}
                      />
                    </View>

                    {/* Content Text */}
                    <View style={{paddingLeft: 35, flex: 1}}>
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 'bold',
                          marginBottom: 4,
                        }}>
                        {entry.title}
                      </Text>
                      <Text
                        style={{
                          color: colors.text.muted,
                          fontSize: 11,
                          lineHeight: 15,
                          marginBottom: 8,
                        }}
                        numberOfLines={3}>
                        {entry.note || 'No notes added...'}
                      </Text>

                      {entry.rating && (
                        <Text
                          style={{
                            color: '#8E8E93',
                            fontSize: 11,
                            fontWeight: '700',
                          }}>
                          {(entry.rating / 2).toFixed(1)}
                        </Text>
                      )}

                      {/* TV Timeline Preview */}
                      {hasTimeline && (
                        <View
                          style={{
                            marginTop: 12,
                            borderLeftWidth: 1,
                            borderLeftColor: 'rgba(255,255,255,0.2)',
                            paddingLeft: 12,
                          }}>
                          {Object.keys(sNotes)
                            .slice(0, 1)
                            .map(s => (
                              <View key={`s-${s}`}>
                                <Text
                                  style={{
                                    color: '#fff',
                                    fontSize: 10,
                                    fontWeight: 'bold',
                                    marginBottom: 2,
                                  }}>
                                  Season {s}
                                </Text>
                                <Text
                                  style={{
                                    color: colors.text.muted,
                                    fontSize: 10,
                                  }}
                                  numberOfLines={1}>
                                  {sNotes[s]}
                                </Text>
                              </View>
                            ))}
                          {Object.keys(eNotes)
                            .slice(0, 2)
                            .map(k => (
                              <View key={`e-${k}`} style={{marginTop: 6}}>
                                <Text
                                  style={{
                                    color: '#fff',
                                    fontSize: 10,
                                    fontWeight: 'bold',
                                    marginBottom: 1,
                                  }}>
                                  {k.replace(/S\d+/, '')}
                                </Text>
                                <Text
                                  style={{
                                    color: colors.text.muted,
                                    fontSize: 10,
                                  }}
                                  numberOfLines={1}>
                                  {eNotes[k]}
                                </Text>
                              </View>
                            ))}
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    );
  };

  // 3. Main Content (Daily List)
  const renderScrapbookBody = () => {
    const dayEntries = entries
      .filter(e => {
        if (e.status === 'watching') return false;
        const d = new Date(e.last_updated_at);
        return (
          d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate()
        );
      })
      .sort(
        (a, b) =>
          new Date(b.last_updated_at).getTime() -
          new Date(a.last_updated_at).getTime(),
      );

    return (
      <View style={{flex: 1}}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 200, // Header height + extra space
            paddingBottom: 160, // Footer height
            paddingHorizontal: spacing.lg,
          }}>
          {dayEntries.length === 0 ? (
            <View style={{alignItems: 'center', marginTop: 50, opacity: 0.5}}>
              <Text style={{color: '#fff', fontSize: 16}}>
                No logs for this day
              </Text>
            </View>
          ) : (
            dayEntries.map(entry => {
              const moodEmoji = entry.mood || '🤩';
              const ratingLabel = entry.rating
                ? entry.rating.toFixed(1)
                : '8.5';

              return (
                <View key={entry.id} style={styles.historyCardOuter}>
                  <View style={{position: 'relative'}}>
                    <Text style={styles.entryEmoji}>{moodEmoji}</Text>
                    <LinearGradient
                      colors={['transparent', colors.background.primary]}
                      useAngle
                      angle={90}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: -10,
                        bottom: 0,
                      }}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.historyCard,
                      {flexDirection: 'column', alignItems: 'stretch'},
                    ]}
                    activeOpacity={0.9}
                    onPress={() => toggleViewModal(true, entry)}
                    onLongPress={() => {
                      setSelectedEntry(entry);
                      setModalVisible(true);
                    }}>
                    {/* Top Row: Poster + Info */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: '100%',
                      }}>
                      <View style={styles.historyPosterContainer}>
                        <Image
                          source={{
                            uri: `https://image.tmdb.org/t/p/w200${entry.poster_path}`,
                          }}
                          style={styles.historyPoster}
                        />
                      </View>
                      <View style={styles.historyContent}>
                        <Text style={styles.historyTitle} numberOfLines={1}>
                          {entry.title}
                        </Text>
                        {entry.note && (
                          <Text style={styles.historyNote} numberOfLines={5}>
                            {entry.note}
                          </Text>
                        )}
                        <View style={styles.historyFooter}>
                          <Text style={styles.footerRating}>{ratingLabel}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Bottom Row: TV Show Structured Notes */}
                    {entry.type === 'tv' &&
                      (Object.keys(entry.season_notes || {}).length > 0 ||
                        Object.keys(entry.episode_notes || {}).length > 0) && (
                        <View
                          style={{
                            marginTop: 12,
                            opacity: 0.9,
                          }}>
                          {(() => {
                            const sNotes = entry.season_notes || {};
                            const eNotes = entry.episode_notes || {};
                            const seasonNums = new Set<number>();

                            Object.keys(sNotes).forEach(k =>
                              seasonNums.add(parseInt(k, 10)),
                            );
                            Object.keys(eNotes).forEach(k => {
                              const match = k.match(/S(\d+)E/i);
                              if (match) seasonNums.add(parseInt(match[1], 10));
                            });

                            const sortedSeasons = Array.from(seasonNums).sort(
                              (a, b) => a - b,
                            );

                            return sortedSeasons.map(sNum => {
                              const episodes = Object.entries(eNotes)
                                .filter(([key]) => {
                                  const match = key.match(/S(\d+)E/i);
                                  return (
                                    match && parseInt(match[1], 10) === sNum
                                  );
                                })
                                .sort((a, b) => {
                                  const matchA = a[0].match(/E(\d+)/i);
                                  const matchB = b[0].match(/E(\d+)/i);
                                  return (
                                    (matchA ? parseInt(matchA[1], 10) : 0) -
                                    (matchB ? parseInt(matchB[1], 10) : 0)
                                  );
                                });

                              return (
                                <View key={`s-block-${sNum}`}>
                                  {/* Main Vertical Line for Season */}
                                  <View
                                    style={{
                                      position: 'absolute',
                                      left: 3,
                                      top: 8,
                                      bottom: 0,
                                      width: 1,
                                      backgroundColor: 'rgba(255,255,255,0.2)',
                                    }}
                                  />

                                  {/* Secondary Vertical Line for Episodes */}
                                  {episodes.length > 0 && (
                                    <View
                                      style={{
                                        position: 'absolute',
                                        left: 23, // 20px indent + 3px for center
                                        top: 40, // Start roughly at first episode dot
                                        bottom: 12,
                                        width: 1,
                                        backgroundColor:
                                          'rgba(255,255,255,0.1)',
                                      }}
                                    />
                                  )}

                                  {/* Season Header */}
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'flex-start',
                                      marginBottom:
                                        episodes.length > 0 ? 12 : 12,
                                    }}>
                                    <View
                                      style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: 3.5,
                                        backgroundColor: '#cacacaff',
                                        marginTop: 6,
                                        marginRight: 12,
                                        zIndex: 2,
                                      }}
                                    />
                                    <View style={{flex: 1}}>
                                      <Text
                                        style={{
                                          color: colors.text.secondary,
                                          fontSize: 12,
                                          fontWeight: '700',
                                          marginBottom: 2,
                                        }}>
                                        {sNum === 0
                                          ? 'Specials'
                                          : `Season ${sNum}`}
                                      </Text>
                                      {sNotes[sNum] && (
                                        <Text
                                          style={{
                                            color: colors.text.primary,
                                            fontSize: 11,
                                            lineHeight: 14,
                                          }}>
                                          {sNotes[sNum]}
                                        </Text>
                                      )}
                                    </View>
                                  </View>

                                  {/* Episodes */}
                                  {episodes.map(([key, noteStr]) => {
                                    const match = key.match(/E(\d+)/i);
                                    const epNum = match
                                      ? parseInt(match[1], 10)
                                      : 0;
                                    let displayNote = noteStr;
                                    let displayNumber = 'E' + epNum;
                                    let displayTitle = `Episode ${epNum}`;

                                    try {
                                      if (
                                        noteStr &&
                                        noteStr.trim().startsWith('{')
                                      ) {
                                        const parsed = JSON.parse(noteStr);
                                        if (parsed.text)
                                          displayNote = parsed.text;
                                        if (parsed.title)
                                          displayTitle = `${parsed.title}`;
                                      }
                                    } catch (e) {}

                                    return (
                                      <View
                                        key={key}
                                        style={{
                                          flexDirection: 'row',
                                          alignItems: 'flex-start',
                                          marginBottom: 12,
                                          marginLeft: 20, // Indent for episode row
                                        }}>
                                        {/* Episode Dot */}
                                        <View
                                          style={{
                                            width: 7,
                                            height: 7,
                                            borderRadius: 3.5,
                                            backgroundColor: '#7e7e7eff',
                                            marginTop: 4,
                                            marginRight: 12,
                                            zIndex: 2,
                                          }}
                                        />
                                        <View style={{flex: 1}}>
                                          <View
                                            style={{
                                              flexDirection: 'row',
                                              gap: 4,
                                            }}>
                                            <Text
                                              style={{
                                                color: colors.text.secondary,
                                                fontSize: 12,
                                                fontWeight: '700',
                                              }}>
                                              {displayNumber}
                                            </Text>
                                            <Text
                                              style={{
                                                color: colors.text.primary,
                                                fontSize: 12,
                                                fontWeight: '700',
                                                marginBottom: 2,
                                              }}>
                                              {displayTitle}
                                            </Text>
                                          </View>
                                          <Text
                                            style={{
                                              color: colors.text.primary,
                                              fontSize: 11,
                                              lineHeight: 14,
                                            }}>
                                            {typeof displayNote === 'string'
                                              ? displayNote
                                              : ''}
                                          </Text>
                                        </View>
                                      </View>
                                    );
                                  })}
                                </View>
                              );
                            });
                          })()}
                        </View>
                      )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {displayType === 'scrapbook' ? (
        <>
          {renderScrapbookYearSelector()}
          {renderScrapbookBody()}
          {renderFixedFooter()}
        </>
      ) : (
        // TIMELINE (DASHBOARD) MODE
        <View style={{flex: 1}}>
          <LinearGradient
            colors={[
              colors.background.primary,
              colors.background.primary,
              'transparent',
            ]}
            style={styles.topGradient}
          />
          {renderHeader()}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingTop: 100, paddingBottom: 100}}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#fff"
              />
            }>
            {watchingEntries.length > 0 && (
              <View style={styles.watchingSection}>
                <Text style={styles.sectionTitleCap}>Continue watching</Text>
                <FlatList
                  horizontal
                  data={watchingEntries}
                  renderItem={renderWatchingCard}
                  keyExtractor={item => item.id.toString()}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{paddingHorizontal: spacing.lg}}
                />
              </View>
            )}
            {renderTopTen()}
            {renderTimelineSelector()}
            <View style={styles.historyContainer}>
              {historyEntries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No entries found</Text>
                </View>
              ) : (
                historyEntries.map(renderHistoryCard)
              )}
            </View>

            {entries.length > 0 && (
              <View
                style={{
                  paddingHorizontal: spacing.lg,
                  marginTop: spacing.xl,
                }}>
                <ActivityHeatMap
                  dates={entries.map(e => e.last_updated_at)}
                  weeks={20}
                  title="Viewing Activity"
                />
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {renderYearSelectorModal()}
      {renderEntryViewModal()}
    </View>
  );
};
