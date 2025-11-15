import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {useNavigation} from '@react-navigation/native';
import {getCinemaDNA, CinemaDNA, getTypeEmoji} from '../utils/cinemaDNA';
import {
  getExplorationStats,
  ExplorationStats,
  getGenrePreferences,
  GenrePreference,
  getLanguageDiversity,
  LanguageDiversity,
  getCollectionProgress,
  CollectionProgress,
} from '../utils/cinemaCollaborations';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {useResponsive} from '../hooks/useResponsive';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MySpaceStackParamList} from '../types/navigation';
import {
  getImageUrl,
  getPersonMovieCredits,
  getPersonTVCredits,
} from '../services/tmdb';
import FastImage from 'react-native-fast-image';

export const CinemaInsightsScreen = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MySpaceStackParamList>>();
  const {width} = useWindowDimensions();
  const {isTablet} = useResponsive();
  const [cinemaDNA, setCinemaDNA] = useState<CinemaDNA | null>(null);
  const [stats, setStats] = useState<ExplorationStats | null>(null);
  const [genres, setGenres] = useState<GenrePreference[]>([]);
  const [diversity, setDiversity] = useState<LanguageDiversity | null>(null);
  const [collections, setCollections] = useState<CollectionProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [topPersonWork, setTopPersonWork] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [
      dna,
      explorationStats,
      genrePrefs,
      langDiversity,
      collectionProgress,
    ] = await Promise.all([
      getCinemaDNA(),
      getExplorationStats(),
      getGenrePreferences(),
      getLanguageDiversity(),
      getCollectionProgress(),
    ]);

    console.log('[CinemaInsights] Genre Preferences:', genrePrefs);
    console.log('[CinemaInsights] Language Diversity:', langDiversity);
    console.log('[CinemaInsights] Collections:', collectionProgress);

    setCinemaDNA(dna);
    setStats(explorationStats);
    setGenres(genrePrefs);
    setDiversity(langDiversity);
    setCollections(collectionProgress);

    // Load top person's work
    if (dna?.topPerson) {
      try {
        const movieCredits = await getPersonMovieCredits(dna.topPerson.id);
        const tvCredits = await getPersonTVCredits(dna.topPerson.id);
        const allWork = [
          ...(movieCredits.results || []).map((m: any) => ({
            ...m,
            media_type: 'movie',
          })),
          ...(tvCredits.results || []).map((t: any) => ({
            ...t,
            media_type: 'tv',
          })),
        ].slice(0, 12);
        setTopPersonWork(allWork);
      } catch (e) {
        setTopPersonWork([]);
      }
    }

    setLoading(false);
  };

  const navigateToPerson = (personId: number, personName: string) => {
    navigation.navigate('PersonCredits', {
      personId,
      personName,
      contentType: 'movie',
    });
  };

  if (loading || !cinemaDNA) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cinema Insights</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your cinema DNA...</Text>
        </View>
      </View>
    );
  }

  const topPerson = cinemaDNA.topPerson;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.profileContainer,
            {
              height: isTablet ? 600 : 400,
            },
          ]}>
          <FastImage
            source={{
              uri: getImageUrl(
                topPerson.profile_path || '',
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

        <Text
          style={{
            position: 'absolute',
            top: spacing.xl,
            right: spacing.lg,
            fontSize: 32,
            fontWeight: '900',
            color: colors.modal.blur,
          }}>
          Your Top Interest
        </Text>

        {/* Top Person Profile */}
        <View style={styles.section}>
          <View style={styles.topPersonCard}>
            <View style={styles.topPersonInfo}>
              <Text style={styles.topPersonName}>{topPerson.name}</Text>
              <Text style={styles.topPersonRole}>
                {topPerson.type.charAt(0).toUpperCase() +
                  topPerson.type.slice(1)}
              </Text>
            </View>
          </View>

          {/* Top Person's Work */}
          {topPersonWork.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.worksScroll}>
              {topPersonWork.map((item, idx) => (
                <TouchableOpacity
                  key={`${item.id}-${idx}`}
                  style={styles.workPosterCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (item.media_type === 'movie') {
                      navigation.navigate('MovieDetails', {movie: item});
                    } else {
                      navigation.navigate('TVShowDetails', {show: item});
                    }
                  }}>
                  <Image
                    source={{
                      uri: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
                    }}
                    style={styles.workPoster}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Top Directors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Directors</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.peopleScroll}>
            {cinemaDNA.otherTop
              .filter(p => p.type === 'director')
              .slice(0, 6)
              .map((person, index) => (
                <TouchableOpacity
                  key={person.id}
                  style={styles.personCard}
                  activeOpacity={0.8}
                  onPress={() => navigateToPerson(person.id, person.name)}>
                  {person.profile_path ? (
                    <Image
                      source={{
                        uri: `https://image.tmdb.org/t/p/w185${person.profile_path}`,
                      }}
                      style={styles.personImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.personImage, styles.imagePlaceholder]}>
                      <Text style={styles.placeholderTextSmall}>
                        {person.name.slice(0, 1)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.personName} numberOfLines={2}>
                    {person.name}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>

        {/* Top Actors */}
        <View style={[styles.section, {marginBottom: spacing.xl * 2}]}>
          <Text style={styles.sectionTitle}>Top Actors</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.peopleScroll}>
            {cinemaDNA.otherTop
              .filter(p => p.type === 'actor')
              .slice(0, 6)
              .map((person, index) => (
                <TouchableOpacity
                  key={person.id}
                  style={styles.personCard}
                  activeOpacity={0.8}
                  onPress={() => navigateToPerson(person.id, person.name)}>
                  {person.profile_path ? (
                    <Image
                      source={{
                        uri: `https://image.tmdb.org/t/p/w185${person.profile_path}`,
                      }}
                      style={styles.personImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.personImage, styles.imagePlaceholder]}>
                      <Text style={styles.placeholderTextSmall}>
                        {person.name.slice(0, 1)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.personName} numberOfLines={2}>
                    {person.name}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>

        {/* Genre Distribution */}
        {genres.length > 0 && (
          <View
            style={[
              styles.section,
              {
                marginTop: spacing.xl,
              },
            ]}>
            <Text style={styles.sectionTitle}>Genre Distribution</Text>
            <View>
              {genres.slice(0, 8).map((genre, index) => (
                <View key={genre.id} style={styles.genreItem}>
                  <View style={styles.genreRow}>
                    <Text style={styles.genreName}>{genre.name}</Text>
                    <Text style={styles.genrePercentage}>
                      {genre.percentage.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.genreBar}>
                    <View
                      style={[
                        styles.genreBarFill,
                        {width: `${genre.percentage}%`},
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Time Exploration */}
        {stats && (stats.mostExploredYear || stats.favoriteDecade) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time Exploration</Text>
            <View style={styles.timeCards}>
              {stats.mostExploredYear && (
                <View style={styles.timeCard}>
                  <Icon
                    name="calendar-outline"
                    size={24}
                    color={colors.text.secondary}
                  />
                  <Text style={styles.timeValue}>{stats.mostExploredYear}</Text>
                  <Text style={styles.timeLabel}>Most Explored Year</Text>
                </View>
              )}
              {stats.favoriteDecade && (
                <View style={styles.timeCard}>
                  <Icon
                    name="calendar"
                    size={24}
                    color={colors.text.secondary}
                  />
                  <Text style={styles.timeValue}>{stats.favoriteDecade}</Text>
                  <Text style={styles.timeLabel}>Favorite Decade</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Language Diversity */}
        {diversity && diversity.totalLanguages > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Language Diversity</Text>
            <View style={styles.diversityCard}>
              {diversity.topLanguages.length > 0 && (
                <View style={styles.languageList}>
                  {diversity.topLanguages.slice(0, 5).map((lang, index) => (
                    <View key={lang.code} style={styles.languageItem}>
                      <Text style={styles.languageName}>{lang.name}</Text>
                      <Text style={styles.languagePercentage}>
                        {lang.percentage.toFixed(0)}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Director Collections */}
        {collections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Director Collections</Text>
            {collections.slice(0, 4).map((collection, index) => (
              <TouchableOpacity
                key={index}
                style={styles.collectionCard}
                activeOpacity={0.8}
                onPress={() => {
                  if (collection.directorId && collection.directorName) {
                    navigateToPerson(
                      collection.directorId,
                      collection.directorName,
                    );
                  }
                }}>
                <View style={styles.collectionHeader}>
                  <View style={styles.collectionIconWrapper}>
                    <Icon
                      name="film-outline"
                      size={20}
                      color={colors.text.primary}
                    />
                  </View>
                  <View style={styles.collectionInfo}>
                    <Text style={styles.collectionName} numberOfLines={1}>
                      {collection.name}
                    </Text>
                    <Text style={styles.collectionProgress}>
                      {collection.completed} of {collection.total} films
                    </Text>
                  </View>
                  <Text style={styles.collectionPercentage}>
                    {collection.percentage.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.collectionProgressBar}>
                  <View
                    style={[
                      styles.collectionProgressFill,
                      {width: `${collection.percentage}%`},
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{height: 200}} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.round,
    backgroundColor: colors.modal.blurDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.modal.blur,
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  profileContainer: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body1,
    color: colors.text.secondary,
  },
  // Overview Section
  overviewSection: {
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  statCardLarge: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.background.border,
  },
  statNumber: {
    ...typography.h1,
    fontSize: 56,
    color: colors.text.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCardSmall: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.background.border,
  },
  statNumberSmall: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
  },
  statLabelSmall: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statCardMedium: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.background.border,
  },
  statTextMedium: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  statDivider: {
    ...typography.body2,
    color: colors.text.tertiary,
    marginHorizontal: spacing.sm,
  },
  // Sections
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
  },
  // Top Person
  topPersonCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  topPersonImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  topPersonInfo: {
    flex: 1,
  },
  topPersonName: {
    ...typography.h2,
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: '600',
  },
  topPersonRole: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  topPersonCount: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  imagePlaceholder: {
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...typography.h2,
    color: colors.text.tertiary,
  },
  placeholderTextSmall: {
    ...typography.h3,
    color: colors.text.tertiary,
  },
  // Works
  worksScroll: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  workPosterCard: {
    marginRight: spacing.sm,
  },
  workPoster: {
    width: 100,
    height: 150,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  genreItem: {
    padding: spacing.md,
  },
  genreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  genreName: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  genrePercentage: {
    ...typography.body1,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  genreBar: {
    height: 6,
    backgroundColor: colors.background.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  genreBarFill: {
    height: '100%',
    backgroundColor: colors.text.primary,
    borderRadius: 3,
  },
  genreCount: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  // Time Cards
  timeCards: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  timeCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.background.border,
  },
  timeValue: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  timeLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  // Diversity
  diversityCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.background.border,
    marginHorizontal: spacing.md,
  },
  diversityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  diversityHeaderText: {
    flex: 1,
  },
  diversityNumber: {
    ...typography.h1,
    fontSize: 48,
    color: colors.text.primary,
    fontWeight: '700',
  },
  diversityLabel: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  languageList: {
    gap: spacing.sm,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.border,
  },
  languageName: {
    ...typography.body2,
    color: colors.text.primary,
  },
  languagePercentage: {
    ...typography.body2,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  // Collections
  collectionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.background.border,
    marginBottom: spacing.md,
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  collectionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  collectionProgress: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  collectionPercentage: {
    ...typography.body1,
    color: colors.text.secondary,
    fontWeight: '700',
  },
  collectionProgressBar: {
    height: 6,
    backgroundColor: colors.background.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  collectionProgressFill: {
    height: '100%',
    backgroundColor: colors.text.primary,
    borderRadius: 3,
  },
  // People Grid
  peopleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  peopleScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  personCard: {
    alignItems: 'center',
  },
  personImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.modal.blur,
  },
  personName: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    width: 80,
  },
});
