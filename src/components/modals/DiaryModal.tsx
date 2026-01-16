import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  MOODS,
} from '../../styles/theme';
import {diaryManager} from '../../store/diary';
import {useResponsive} from '../../hooks/useResponsive';
import {GradientButton} from '../GradientButton';
import {GradientProgressBar} from '../GradientProgressBar';

interface DiaryModalProps {
  visible: boolean;
  onClose: () => void;
  contentId: number;
  type: 'movie' | 'tv';
  title: string;
  posterPath?: string;
  backdropPath?: string;
  totalSeasons?: number;
  seasonData?: {season_number: number; episode_count: number}[];
  initialSeason?: number;
  initialEpisode?: number;
  initialProgress?: number;
}

export const DiaryModal: React.FC<DiaryModalProps> = ({
  visible,
  onClose,
  contentId,
  type,
  title,
  posterPath,
  backdropPath,
  totalSeasons = 1,
  seasonData = [],
  initialProgress,
}) => {
  const {isTablet} = useResponsive();
  const [progress, setProgress] = useState(0); // 0-100%
  const [rating, setRating] = useState(0); // 0-10
  const [note, setNote] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [watchDate, setWatchDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // TV Specifics
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [maxEpisodes, setMaxEpisodes] = useState(10);

  // State to track if we found an existing entry
  const [isExisting, setIsExisting] = useState(false);

  const [selectionMode, setSelectionMode] = useState<
    'none' | 'season' | 'episode'
  >('none');

  // Hard Override for Colors (No Purple)
  const ACTIVE_COLOR = '#FFFFFF'; // White for active elements
  const PROGRESS_COLOR = '#E5E5E5'; // Light Grey for progress bar
  const STAR_COLOR = '#F5C518'; // Gold for stars

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, contentId]);

  // Update max episodes when season changes
  useEffect(() => {
    if (type === 'tv') {
      const seasonInfo = seasonData.find(
        s => s.season_number === currentSeason,
      );
      if (seasonInfo) {
        setMaxEpisodes(seasonInfo.episode_count);
      } else {
        // Fallback if data missing
        setMaxEpisodes(24);
      }
    }
  }, [currentSeason, seasonData, type]);

  // Ensure current episode is valid when max changes (e.g. going S1:20 -> S2:10)
  useEffect(() => {
    if (currentEpisode > maxEpisodes) {
      setCurrentEpisode(maxEpisodes);
    }
  }, [maxEpisodes]);

  const loadData = () => {
    const entry = diaryManager.getEntry(contentId);
    if (entry) {
      setIsExisting(true);
      setProgress(entry.progress);
      setRating(entry.rating || 0);
      setNote(entry.note || '');
      setMood(entry.mood || null);
      setWatchDate(new Date(entry.last_updated_at));

      if (type === 'tv') {
        setCurrentSeason(entry.last_season || 1);
        setCurrentEpisode(entry.last_episode || 1);
      }
    } else {
      setIsExisting(false);
      setProgress(initialProgress ?? 100);
      setRating(0);
      setNote('');
      setMood(null);
      setWatchDate(new Date());

      if (type === 'tv') {
        if (seasonData && seasonData.length > 0) {
          if (initialProgress === 0) {
            // Default to first season, first episode for "Watching"
            const firstSeason =
              seasonData.find(s => s.season_number > 0) || seasonData[0];
            setCurrentSeason(firstSeason.season_number);
            setCurrentEpisode(1);
            setMaxEpisodes(firstSeason.episode_count);
          } else {
            // Start with latest season (Completed)
            const lastSeason = seasonData[seasonData.length - 1];
            setCurrentSeason(lastSeason.season_number);
            setCurrentEpisode(lastSeason.episode_count);
            setMaxEpisodes(lastSeason.episode_count);
          }
        } else {
          setCurrentSeason(1);
          setCurrentEpisode(1);
        }
      } else {
        setCurrentSeason(1);
        setCurrentEpisode(1);
      }
    }
  };

  /**
   * Correct Progress Calculation:
   * ( Episodes in Previous Seasons + Current Episodes Watch ) / Total Episodes in Show
   */
  const calculateTVProgress = () => {
    if (!seasonData || seasonData.length === 0) return 0;

    // 1. Calculate Total Episodes in Show
    let totalShowEpisodes = 0;
    seasonData.forEach(s => {
      if (s.season_number > 0) totalShowEpisodes += s.episode_count;
    });
    if (totalShowEpisodes === 0) return 0;

    // 2. Calculate Watched from Previous Seasons
    let watchedEpisodes = 0;
    seasonData.forEach(s => {
      if (s.season_number < currentSeason && s.season_number > 0) {
        watchedEpisodes += s.episode_count;
      }
    });

    // 3. Add Current Season Progress
    watchedEpisodes += currentEpisode;

    // 4. Calculate Percentage
    const percentage = (watchedEpisodes / totalShowEpisodes) * 100;
    return Math.min(100, percentage);
  };

  const currentDisplayProgress =
    type === 'tv' ? calculateTVProgress() : progress;

  const handleSave = async () => {
    let finalStatus = 'watching';
    const computedProgress = type === 'tv' ? calculateTVProgress() : progress;

    if (computedProgress >= 100) finalStatus = 'completed';

    await diaryManager.updateEntry({
      id: contentId,
      type,
      title,
      poster_path: posterPath,
      backdrop_path: backdropPath,
      status: finalStatus as any,
      progress: computedProgress,
      rating,
      note,
      mood: mood || undefined,
      last_updated_at: watchDate.toISOString(),
      last_season: currentSeason,
      last_episode: currentEpisode,
      total_seasons: totalSeasons,
      total_episodes: (seasonData || []).reduce(
        (acc, s) => acc + (s.season_number > 0 ? s.episode_count : 0),
        0,
      ),
    });
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove from Diary',
      'Are you sure you want to remove this log?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await diaryManager.deleteEntry(contentId);
            onClose();
          },
        },
      ],
    );
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const value = i * 2;
      const isSelected = rating >= value;
      const isHalf = rating === value - 1;

      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(value)}
          style={{padding: spacing.xs}}>
          <Ionicons
            name={isSelected ? 'star' : isHalf ? 'star-half' : 'star-outline'}
            size={32}
            color={STAR_COLOR}
          />
        </TouchableOpacity>,
      );
    }
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {stars}
        <Text
          style={{
            marginLeft: spacing.sm,
            color: colors.text.secondary,
            ...typography.caption,
          }}>
          {rating > 0 ? `${rating}/10` : 'Rate'}
        </Text>
      </View>
    );
  };

  const renderMoodSelector = () => (
    <View style={styles.section}>
      <Text style={styles.label}>How did it make you feel?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{gap: spacing.sm, paddingVertical: spacing.xs}}>
        {MOODS.map(m => (
          <TouchableOpacity
            key={m}
            onPress={() => setMood(mood === m ? null : m)}
            style={[styles.moodBtn, mood === m && styles.moodBtnActive]}>
            <Text style={{fontSize: 24}}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTVSelectors = () => {
    if (selectionMode !== 'none') {
      const isSeason = selectionMode === 'season';

      // Filter out Season 0 (Specials) if preferred, or include them
      // Let's rely on seasonData if it exists, otherwise fallback to simple counts
      let items: number[] = [];

      if (isSeason) {
        // Use seasonData to populate seasons, else fallback to 1..totalSeasons
        if (seasonData.length > 0) {
          items = seasonData
            .filter(s => s.season_number > 0)
            .map(s => s.season_number);
        } else {
          items = Array.from({length: totalSeasons}, (_, i) => i + 1);
        }
      } else {
        // Episodes for current season
        items = Array.from({length: maxEpisodes}, (_, i) => i + 1);
      }

      return (
        <View style={styles.selectorOverlay}>
          <View style={styles.selectorHeader}>
            <Text style={styles.selectorTitle}>
              {isSeason ? 'Select Season' : 'Select Episode'}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectionMode('none')}
              style={{padding: 8}}>
              <Ionicons name="close" size={24} color={ACTIVE_COLOR} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{maxHeight: 300, width: '100%'}}>
            {items.map(num => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.selectorItem,
                  (isSeason ? currentSeason : currentEpisode) === num &&
                    styles.selectorItemActive,
                ]}
                onPress={() => {
                  if (isSeason) {
                    setCurrentSeason(num);
                    setCurrentEpisode(1); // Reset to ep 1
                  } else setCurrentEpisode(num);
                  setSelectionMode('none');
                }}>
                <Text
                  style={[
                    styles.selectorItemText,
                    (isSeason ? currentSeason : currentEpisode) === num && {
                      color: ACTIVE_COLOR,
                      fontWeight: 'bold',
                    },
                  ]}>
                  {isSeason ? `Season ${num}` : `Episode ${num}`}
                </Text>
                {(isSeason ? currentSeason : currentEpisode) === num && (
                  <Ionicons name="checkmark" size={20} color={ACTIVE_COLOR} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={{gap: spacing.lg}}>
        <View style={{flexDirection: 'row', gap: spacing.md}}>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setSelectionMode('season')}>
            <Text style={styles.dropdownLabel}>Season</Text>
            <View style={styles.dropdownValueRow}>
              <Text style={styles.dropdownValue}>{currentSeason}</Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={colors.text.tertiary}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setSelectionMode('episode')}>
            <Text style={styles.dropdownLabel}>Episode</Text>
            <View style={styles.dropdownValueRow}>
              <Text style={styles.dropdownValue}>{currentEpisode}</Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={colors.text.tertiary}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 6,
            }}>
            <Text
              style={{
                ...typography.caption,
                color: colors.text.tertiary,
              }}></Text>
            <Text
              style={{
                ...typography.caption,
                color: ACTIVE_COLOR,
                fontWeight: 'bold',
              }}>
              {Math.round(currentDisplayProgress)}%
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${currentDisplayProgress}%`,
                  backgroundColor: PROGRESS_COLOR,
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  const shouldShowRating = currentDisplayProgress >= 100;

  return (
    <Modal
      visible={visible}
      statusBarTranslucent={true}
      transparent
      animationType="fade"
      backdropColor={colors.modal.blurDark}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={10}
          overlayColor={colors.modal.blurDark}
        />
        <View
          style={[
            styles.contentContainer,
            {
              padding: isTablet ? spacing.xl : spacing.md,
              margin: isTablet ? spacing.xl : spacing.xl,
            },
          ]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft} />
            <Text style={styles.headerTitle}>
              {isExisting ? 'Update Diary Entry' : 'Create Diary Entry'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              style={styles.backButton}>
              <Ionicons name="close" size={15} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{paddingVertical: spacing.md}}>
            {type === 'movie' ? (
              <View style={styles.section}>
                <GradientProgressBar
                  label="Progress"
                  value={progress}
                  minValue={0}
                  maxValue={100}
                  step={1}
                  onValueChange={setProgress}
                  showValue={true}
                  height={15}
                  valueSuffix="%"
                />
              </View>
            ) : (
              <View style={styles.section}>{renderTVSelectors()}</View>
            )}

            {shouldShowRating && (
              <>
                <View style={styles.section}>
                  <GradientProgressBar
                    label="Your Rating"
                    value={rating}
                    minValue={0}
                    maxValue={10}
                    step={0.5}
                    onValueChange={setRating}
                    showValue={true}
                    height={15}
                  />
                </View>

                {renderMoodSelector()}

                <View style={styles.section}>
                  <Text style={styles.label}>Log Date</Text>
                  <TouchableOpacity
                    style={styles.dateSelector}
                    onPress={() => setShowDatePicker(true)}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={colors.text.secondary}
                    />
                    <Text style={styles.dateValue}>
                      {watchDate.toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={watchDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      maximumDate={new Date()}
                      onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) setWatchDate(date);
                      }}
                    />
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.label}>Diary Note</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder={
                      type === 'movie'
                        ? 'Thoughts on the movie...'
                        : 'Add notes to your diary...'
                    }
                    placeholderTextColor={colors.text.muted}
                    multiline
                    numberOfLines={4}
                    value={note}
                    onChangeText={setNote}
                  />
                </View>
              </>
            )}
          </ScrollView>

          <View style={{gap: spacing.md}}>
            <GradientButton
              title="Save Entry"
              onPress={handleSave}
              style={{width: '100%', borderRadius: borderRadius.round}}
              isIcon={false}
              disabled={currentDisplayProgress === 0}
            />

            {isExisting && (
              <TouchableOpacity
                style={[styles.removeBtn]}
                onPress={handleDelete}>
                <Text style={{...typography.body2, color: colors.text.muted}}>
                  Remove from Diary
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  contentContainer: {
    width: '95%',
    maxWidth: 400,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.header,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    width: '100%',
  },
  headerLeft: {width: 40},
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 32,
    height: 32,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    opacity: 0.9,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  textArea: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    color: colors.text.primary,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dateValue: {
    ...typography.body2,
    color: colors.text.primary,
  },
  moodBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  moodBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: colors.text.primary,
  },
  removeBtn: {
    alignItems: 'center',
    padding: spacing.sm,
  },

  // TV Selectors
  dropdownBtn: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dropdownLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: 4,
  },
  dropdownValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownValue: {
    ...typography.h3,
    color: colors.text.primary,
  },
  selectorOverlay: {
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.lg,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  selectorTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  selectorItem: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  selectorItemActive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  selectorItemText: {
    color: colors.text.secondary,
    ...typography.body1,
  },
  // Progress Bar
  track: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
