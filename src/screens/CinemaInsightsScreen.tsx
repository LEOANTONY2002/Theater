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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [dna, explorationStats, genrePrefs, langDiversity, collectionProgress] =
      await Promise.all([
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cinema Insights</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top Person Profile Section */}
        <View style={styles.profileSection}>
          {/* Background Gradient */}
          <LinearGradient
            colors={[colors.background.secondary, colors.background.primary]}
            style={styles.profileBackground}
          />

          {/* Profile Image */}
          <View style={styles.profileImageContainer}>
            {topPerson.profile_path ? (
              <Image
                source={{
                  uri: `https://image.tmdb.org/t/p/w500${topPerson.profile_path}`,
                }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                <Text style={styles.profileImageInitial}>
                  {topPerson.name.slice(0, 1)}
                </Text>
              </View>
            )}
          </View>

          {/* Top Person Info */}
          <View style={styles.profileInfo}>
            <Text style={styles.topInterestLabel}>Your Top Interest</Text>
            <Text style={styles.topPersonName}>{topPerson.name}</Text>
            <View style={styles.topPersonMeta}>
              <Text style={styles.topPersonType}>
                {getTypeEmoji(topPerson.type)}{' '}
                {topPerson.type.charAt(0).toUpperCase() + topPerson.type.slice(1)}
              </Text>
              <Text style={styles.topPersonDot}>•</Text>
              <Text style={styles.topPersonCount}>
                {topPerson.count} films explored
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{cinemaDNA.totalFilms}</Text>
            <Text style={styles.statLabel}>Films</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{cinemaDNA.counts.directors}</Text>
            <Text style={styles.statLabel}>Directors</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{cinemaDNA.counts.actors}</Text>
            <Text style={styles.statLabel}>Actors</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{cinemaDNA.counts.composers}</Text>
            <Text style={styles.statLabel}>Composers</Text>
          </View>
        </View>

        {/* Top Directors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎬 Top Directors</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}>
            {cinemaDNA.otherTop
              .filter(p => p.type === 'director')
              .slice(0, 10)
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
                    <View style={[styles.personImage, styles.personImagePlaceholder]}>
                      <Text style={styles.personImageInitial}>
                        {person.name.slice(0, 1)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.personName} numberOfLines={2}>
                    {person.name}
                  </Text>
                  <Text style={styles.personCount}>{person.count} films</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>

        {/* Top Actors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎭 Top Actors</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}>
            {cinemaDNA.otherTop
              .filter(p => p.type === 'actor')
              .slice(0, 10)
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
                    <View style={[styles.personImage, styles.personImagePlaceholder]}>
                      <Text style={styles.personImageInitial}>
                        {person.name.slice(0, 1)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.personName} numberOfLines={2}>
                    {person.name}
                  </Text>
                  <Text style={styles.personCount}>{person.count} films</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>

        {/* Top Composers Section */}
        {cinemaDNA.counts.composers > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎵 Favorite Composers</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}>
              {cinemaDNA.otherTop
                .filter(p => p.type === 'composer')
                .slice(0, 10)
                .map((person, index) => (
                  <TouchableOpacity
                    key={person.id}
                    style={styles.personCard}
                    activeOpacity={0.8}>
                    {person.profile_path ? (
                      <Image
                        source={{
                          uri: `https://image.tmdb.org/t/p/w185${person.profile_path}`,
                        }}
                        style={styles.personImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.personImage, styles.personImagePlaceholder]}>
                        <Text style={styles.personImageInitial}>
                          {person.name.slice(0, 1)}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.personName} numberOfLines={2}>
                      {person.name}
                    </Text>
                    <Text style={styles.personCount}>{person.count} scores</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        )}

        {/* Cinematographers Section */}
        {cinemaDNA.counts.cinematographers > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Cinematographers</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}>
              {cinemaDNA.otherTop
                .filter(p => p.type === 'cinematographer')
                .slice(0, 10)
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
                      <View style={[styles.personImage, styles.personImagePlaceholder]}>
                        <Text style={styles.personImageInitial}>
                          {person.name.slice(0, 1)}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.personName} numberOfLines={2}>
                      {person.name}
                    </Text>
                    <Text style={styles.personCount}>{person.count} films</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        )}

        {/* Genre Preferences Section */}
        {genres.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎭 Your Genre DNA</Text>
            <View style={styles.genreContainer}>
              {genres.map((genre, index) => (
                <View key={genre.id} style={styles.genreItem}>
                  <View style={styles.genreHeader}>
                    <Text style={styles.genreName}>{genre.name}</Text>
                    <Text style={styles.genrePercentage}>
                      {genre.percentage.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {width: `${genre.percentage}%`},
                      ]}
                    />
                  </View>
                  <Text style={styles.genreCount}>{genre.count} films</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Collection Progress Section */}
        {collections.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Collections</Text>
            <View style={styles.collectionsContainer}>
              {collections.map((collection, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.collectionCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (collection.directorId && collection.directorName) {
                      navigateToPerson(collection.directorId, collection.directorName);
                    }
                  }}>
                  <View style={styles.collectionHeader}>
                    <Text style={styles.collectionName} numberOfLines={1}>
                      {collection.name}
                    </Text>
                    <Text style={styles.collectionProgress}>
                      {collection.completed}/{collection.total}
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {width: `${collection.percentage}%`},
                      ]}
                    />
                  </View>
                  <Text style={styles.collectionPercentage}>
                    {collection.percentage.toFixed(0)}% complete
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Language Diversity Section */}
        {diversity && diversity.totalLanguages > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌍 Language Diversity</Text>
            <View style={styles.diversityContainer}>
              <View style={styles.diversityCard}>
                <Text style={styles.diversityLabel}>Languages Explored</Text>
                <Text style={styles.diversityValue}>
                  {diversity.totalLanguages}
                </Text>
                {diversity.topLanguages.length > 0 && (
                  <View style={styles.diversityList}>
                    {diversity.topLanguages.map((lang, index) => (
                      <Text key={lang.code} style={styles.diversityItem}>
                        {lang.name} ({lang.percentage.toFixed(0)}%)
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Exploration Stats Section */}
        {stats && (
          <View style={[styles.section, {marginBottom: spacing.xl}]}>
            <Text style={styles.sectionTitle}>📈 Exploration Stats</Text>
            <View style={styles.statsGrid}>
              {stats.mostExploredYear && (
                <View style={styles.statItem}>
                  <Text style={styles.statItemLabel}>Most Explored Year</Text>
                  <Text style={styles.statItemValue}>
                    {stats.mostExploredYear}
                  </Text>
                </View>
              )}
              {stats.favoriteDecade && (
                <View style={styles.statItem}>
                  <Text style={styles.statItemLabel}>Favorite Decade</Text>
                  <Text style={styles.statItemValue}>
                    {stats.favoriteDecade}
                  </Text>
                </View>
              )}
              {stats.averageRating > 0 && (
                <View style={styles.statItem}>
                  <Text style={styles.statItemLabel}>Average Rating</Text>
                  <Text style={styles.statItemValue}>
                    ⭐ {stats.averageRating.toFixed(1)}/10
                  </Text>
                </View>
              )}
              {stats.totalRuntime > 0 && (
                <View style={styles.statItem}>
                  <Text style={styles.statItemLabel}>Total Watch Time</Text>
                  <Text style={styles.statItemValue}>
                    {Math.floor(stats.totalRuntime / 60)}h{' '}
                    {stats.totalRuntime % 60}m
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
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
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
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
  profileSection: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    position: 'relative',
  },
  profileBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  profileImageContainer: {
    marginBottom: spacing.md,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.background.primary,
  },
  profileImagePlaceholder: {
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageInitial: {
    ...typography.h1,
    color: colors.text.primary,
    opacity: 0.5,
  },
  profileInfo: {
    alignItems: 'center',
  },
  topInterestLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  topPersonName: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  topPersonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  topPersonType: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  topPersonDot: {
    ...typography.body2,
    color: colors.text.tertiary,
  },
  topPersonCount: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.background.border,
  },
  statValue: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  horizontalScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  personCard: {
    width: 100,
    alignItems: 'center',
  },
  personImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.background.border,
  },
  personImagePlaceholder: {
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personImageInitial: {
    ...typography.h3,
    color: colors.text.primary,
    opacity: 0.5,
  },
  personName: {
    ...typography.caption,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  personCount: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  // Exploration stats styles
  statsGrid: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  statItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.background.border,
  },
  statItemLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  statItemValue: {
    ...typography.h3,
    color: colors.text.primary,
  },
  // Genre styles
  genreContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  genreItem: {
    marginBottom: spacing.sm,
  },
  genreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  genreName: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  genrePercentage: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.background.secondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  genreCount: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 10,
  },
  // Collection styles
  collectionsContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  collectionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.background.border,
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  collectionName: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  collectionProgress: {
    ...typography.body2,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  collectionPercentage: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  // Diversity styles
  diversityContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  diversityCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.background.border,
    marginBottom: spacing.sm,
  },
  diversityLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  diversityValue: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  diversityList: {
    gap: spacing.xs,
  },
  diversityItem: {
    ...typography.body2,
    color: colors.text.secondary,
  },
});
