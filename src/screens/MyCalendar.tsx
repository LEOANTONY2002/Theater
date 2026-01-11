import React, {useEffect, useState, useMemo, useCallback} from 'react';
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
  Modal,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {MaybeBlurView} from '../components/MaybeBlurView';
import {ScheduleWatchModal} from '../components/ScheduleWatchModal';
import {useResponsive} from '../hooks/useResponsive';
import {notificationService} from '../services/NotificationService';
import {MySpaceStackParamList} from '../types/navigation';
import LinearGradient from 'react-native-linear-gradient';

const {width} = Dimensions.get('window');

export interface CalendarItem {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  releaseDate: string;
  date: string; // Effective event date
  schedulerType: 'release' | 'custom';
  notificationId?: string;
}

type ViewMode = 'agenda' | 'month';

export const MyCalendarScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MySpaceStackParamList>>();
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const {isTablet} = useResponsive();

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const loadItems = async () => {
    try {
      const stored = await AsyncStorage.getItem('calendar_items');
      if (stored) {
        let parsed: CalendarItem[] = JSON.parse(stored).map((item: any) => ({
          ...item,
          schedulerType: item.schedulerType || 'release',
          date: item.date || item.releaseDate,
        }));

        // Cleanup Logic: Filter past events
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        const validItems = parsed.filter(item => {
          const itemDate = new Date(item.date);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate.getTime() >= today.getTime();
        });

        // Identify removed items for notification cancellation
        const removedItems = parsed.filter(item => {
          const itemDate = new Date(item.date);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate.getTime() < today.getTime();
        });

        // 1. Update State immediately (User sees only valid items)
        validItems.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        setItems(validItems);

        // 2. Background Task: Persist cleanup and cancel notifications
        if (removedItems.length > 0) {
          // Save cleaned list
          await AsyncStorage.setItem(
            'calendar_items',
            JSON.stringify(validItems),
          );

          // Cancel notifications
          removedItems.forEach(item => {
            if (item.notificationId) {
              notificationService
                .cancelScheduledNotification(item.notificationId)
                .catch(err =>
                  console.warn(
                    `Failed to cancel notification for ${item.id}`,
                    err,
                  ),
                );
            }
          });
        }
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading calendar items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Reload when navigating back to this screen
  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, []),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const removeItem = async (item: CalendarItem) => {
    try {
      const stored = await AsyncStorage.getItem('calendar_items');
      if (stored) {
        let parsed: CalendarItem[] = JSON.parse(stored);

        // Find exact match - compare normalized values
        const itemIndex = parsed.findIndex(i => {
          const isSameContent = i.id === item.id && i.type === item.type;
          const itemSchedulerType = i.schedulerType || 'release';
          const targetSchedulerType = item.schedulerType || 'release';
          const isSameType = itemSchedulerType === targetSchedulerType;

          // For matching, use the effective date
          const itemDate = i.date || i.releaseDate;
          const targetDate = item.date || item.releaseDate;
          const isSameDate = itemDate === targetDate;

          return isSameContent && isSameType && isSameDate;
        });

        if (itemIndex > -1) {
          const itemToRemove = parsed[itemIndex];
          // Cancel notification
          if (itemToRemove && itemToRemove.notificationId) {
            await notificationService.cancelScheduledNotification(
              itemToRemove.notificationId,
            );
          }
          // Remove
          parsed.splice(itemIndex, 1);
          await AsyncStorage.setItem('calendar_items', JSON.stringify(parsed));

          // Normalize before setting state (same as loadItems)
          const normalized = parsed.map((i: any) => ({
            ...i,
            schedulerType: i.schedulerType || 'release',
            date: i.date || i.releaseDate,
          }));
          setItems(normalized);
        }
      }
    } catch (error) {
      console.error('Error removing calendar item:', error);
    }
  };

  // --- Helper Functions ---

  const getDaysInMonth = (month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const date = new Date(year, monthIndex, 1);
    const days = [];
    while (date.getMonth() === monthIndex) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const getDayEvents = (date: Date) => {
    const dateString = date.toDateString();
    return items.filter(i => new Date(i.date).toDateString() === dateString);
  };

  const hasEvents = (date: Date) => {
    return getDayEvents(date).length > 0;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.toDateString() === d2.toDateString();
  };

  // Group items by date for Agenda View
  const groupedItems = useMemo(() => {
    const grouped: {[key: string]: CalendarItem[]} = {};
    items.forEach(item => {
      const dateKey = new Date(item.date).toDateString(); // "Mon Dec 25 2023"
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(item);
    });
    return grouped;
  }, [items]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedItems).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );
  }, [groupedItems]);

  const getRelativeDateLabel = (date: Date) => {
    const now = new Date();
    const diffTime = date.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // --- Render Functions ---

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>My Calendar</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            viewMode === 'agenda' && styles.toggleBtnActive,
          ]}
          onPress={() => setViewMode('agenda')}>
          <Text
            style={[
              styles.toggleText,
              viewMode === 'agenda' && styles.toggleTextActive,
            ]}>
            Day
          </Text>
        </TouchableOpacity>
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
            Month
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCard = (item: CalendarItem) => {
    const isCustom = item.schedulerType === 'custom';
    const eventDate = new Date(item.date);

    return (
      <TouchableOpacity
        key={`${item.id}-${item.schedulerType}`}
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          if (item.type === 'movie') {
            navigation.navigate('MovieDetails', {
              movie: {
                id: item.id,
                title: item.title,
                poster_path: item.posterPath,
                release_date: item.releaseDate,
              } as any,
            });
          } else {
            navigation.navigate('TVShowDetails', {
              show: {
                id: item.id,
                name: item.title,
                poster_path: item.posterPath,
                next_episode_to_air: {
                  air_date: item.releaseDate,
                },
              } as any,
            });
          }
        }}>
        <Image
          source={{uri: `https://image.tmdb.org/t/p/w200${item.posterPath}`}}
          style={styles.poster}
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.badge,
                isCustom ? styles.badgeCustom : styles.badgeRelease,
              ]}>
              <Text style={styles.badgeText}>
                {isCustom ? 'SCREENING' : 'RELEASE'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (isCustom) {
                  // Open reschedule modal for custom screenings
                  setSelectedItem(item);
                  setShowRescheduleModal(true);
                } else {
                  // Direct remove for release notifications
                  removeItem(item);
                }
              }}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Icon
                name={isCustom ? 'calendar-outline' : 'trash-outline'}
                size={18}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={styles.timeRow}>
            <Icon
              name={isCustom ? 'time-outline' : 'calendar-outline'}
              size={14}
              color={colors.text.secondary}
            />
            <Text style={styles.timeText}>
              {isCustom
                ? eventDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : eventDate.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                  })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAgenda = () => {
    if (items.length === 0) return renderEmptyState();

    // Group dates by month
    const monthGroups: {[key: string]: string[]} = {};
    sortedDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const monthKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
      if (!monthGroups[monthKey]) {
        monthGroups[monthKey] = [];
      }
      monthGroups[monthKey].push(dateStr);
    });

    const sortedMonths = Object.keys(monthGroups).sort((a, b) => {
      const dateA = new Date(monthGroups[a][0]);
      const dateB = new Date(monthGroups[b][0]);
      return dateA.getTime() - dateB.getTime();
    });

    return (
      <ScrollView
        contentContainerStyle={styles.agendaContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text.primary}
          />
        }>
        {sortedMonths.map(monthKey => (
          <View key={monthKey}>
            <Text style={styles.monthHeader}>{monthKey.toUpperCase()}</Text>
            {monthGroups[monthKey].map(dateStr => {
              const date = new Date(dateStr);
              const dayItems = groupedItems[dateStr];
              return (
                <View key={dateStr} style={styles.agendaGroup}>
                  <View style={styles.stickyHeader}>
                    <View style={styles.stickyDot} />
                    <Text style={styles.stickyText}>
                      {getRelativeDateLabel(date)}
                    </Text>
                  </View>
                  <View style={styles.groupItems}>
                    {dayItems.map(renderCard)}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
        <View style={{height: 100}} />
      </ScrollView>
    );
  };

  const renderMonth = () => {
    const days = getDaysInMonth(selectedMonth);
    const startDay = days[0].getDay(); // 0 = Sun
    const displayDays = Array(startDay).fill(null).concat(days); // Pad start

    const changeMonth = (delta: number) => {
      const newDate = new Date(selectedMonth);
      newDate.setMonth(newDate.getMonth() + delta);
      setSelectedMonth(newDate);
      setSelectedDay(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
    };

    const selectedDayEvents = getDayEvents(selectedDay);

    return (
      <ScrollView
        contentContainerStyle={styles.monthContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text.primary}
          />
        }>
        <View style={styles.calendarControl}>
          <TouchableOpacity
            onPress={() => changeMonth(-1)}
            style={styles.monthNavBtn}>
            <Icon name="chevron-back" size={20} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {selectedMonth.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <TouchableOpacity
            onPress={() => changeMonth(1)}
            style={styles.monthNavBtn}>
            <Icon
              name="chevron-forward"
              size={20}
              color={colors.text.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} style={styles.weekDayText}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {displayDays.map((date, index) => {
            if (!date) return <View key={index} style={styles.dayCell} />;

            const isSelected = isSameDay(date, selectedDay);
            const isToday = isSameDay(date, new Date());
            const hasEvent = hasEvents(date);

            return (
              <TouchableOpacity
                key={index}
                style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                onPress={() => setSelectedDay(date)}>
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    isToday && !isSelected && styles.dayTextToday,
                  ]}>
                  {date.getDate()}
                </Text>
                {hasEvent && (
                  <View
                    style={[
                      styles.eventDot,
                      isSelected && {backgroundColor: colors.text.primary},
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.selectedDayEvents}>
          <Text style={styles.selectedDayTitle}>
            {getRelativeDateLabel(selectedDay)}
          </Text>
          {selectedDayEvents.length > 0 ? (
            selectedDayEvents.map(renderCard)
          ) : (
            <Text style={styles.noEventsText}>No events scheduled</Text>
          )}
        </View>
        <View style={{height: 100}} />
      </ScrollView>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image
        source={require('../assets/calendarEmpty.png')}
        style={{
          width: isTablet ? width / 3 : width / 2,
          height: isTablet ? width / 3 : width / 2,
        }}
      />
      <Text style={styles.emptyText}>Your calendar is empty</Text>
      <Text style={styles.emptySubtext}>
        Schedule movies or track upcoming releases to see them here.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          colors.background.primary,
          colors.background.primary,
          'transparent',
        ]}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 150,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      {renderHeader()}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text.primary} />
        </View>
      ) : viewMode === 'agenda' ? (
        renderAgenda()
      ) : (
        renderMonth()
      )}

      {/* Schedule Watch Modal */}
      {selectedItem && (
        <ScheduleWatchModal
          visible={showRescheduleModal}
          onClose={() => {
            setShowRescheduleModal(false);
            setSelectedItem(null);
          }}
          title={selectedItem.title}
          existingDate={new Date(selectedItem.date)}
          onSchedule={async (date: Date, type: 'release' | 'custom') => {
            // Update the existing item with new date
            try {
              const stored = await AsyncStorage.getItem('calendar_items');
              if (stored) {
                const parsed: CalendarItem[] = JSON.parse(stored);
                const itemIndex = parsed.findIndex(
                  i =>
                    i.id === selectedItem.id &&
                    i.type === selectedItem.type &&
                    i.schedulerType === 'custom',
                );

                if (itemIndex !== -1) {
                  // Update item with new date
                  parsed[itemIndex] = {
                    ...parsed[itemIndex],
                    date: date.toISOString(),
                    releaseDate: date.toISOString(),
                  };

                  await AsyncStorage.setItem(
                    'calendar_items',
                    JSON.stringify(parsed),
                  );

                  // Normalize and update state
                  const normalized = parsed.map(i => ({
                    ...i,
                    schedulerType: i.schedulerType || 'release',
                    date: i.date || i.releaseDate,
                  }));
                  setItems(normalized);
                }
              }
            } catch (error) {
              console.error('Error rescheduling:', error);
            }

            setShowRescheduleModal(false);
            setSelectedItem(null);
          }}
          onRemove={() => {
            removeItem(selectedItem);
            setShowRescheduleModal(false);
            setSelectedItem(null);
          }}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    marginTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.modal.content,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: borderRadius.round,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderColor: colors.modal.content,
    borderRadius: borderRadius.round,
  },
  toggleText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.text.primary,
  },
  // Agenda Styles
  agendaContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: 110,
  },
  agendaGroup: {
    marginBottom: spacing.xl,
  },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stickyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.modal.activeBorder,
    marginRight: spacing.sm,
  },
  monthHeader: {
    ...typography.h2,
    color: colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    paddingLeft: spacing.sm,
  },
  stickyText: {
    ...typography.h3,
    color: colors.text.primary,
    letterSpacing: 1,
    fontSize: 14,
  },
  groupItems: {
    gap: spacing.md,
    paddingLeft: 14,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
  },
  // Card Styles
  card: {
    flexDirection: 'row',
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.content,
    alignItems: 'center',
    gap: spacing.md,
  },
  poster: {
    width: 50,
    height: 75,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.secondary,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.body1,
    fontWeight: '600',
    color: colors.text.primary,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeRelease: {
    backgroundColor: 'rgba(170, 78, 255, 0.2)',
  },
  badgeCustom: {
    backgroundColor: 'rgba(77, 207, 255, 0.2)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.primary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  // Month View Styles
  monthContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: 160,
    paddingBottom: 150,
  },
  calendarControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  monthTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  monthNavBtn: {
    padding: 12,
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.content,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    borderRadius: borderRadius.md,
    paddingVertical: 6,
  },
  dayCellSelected: {
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopWidth: 0,
    borderColor: colors.modal.content,
  },
  dayText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextToday: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.modal.activeBorder,
    marginTop: 4,
  },
  selectedDayEvents: {
    gap: spacing.md,
  },
  selectedDayTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  noEventsText: {
    ...typography.body2,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.body2,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
