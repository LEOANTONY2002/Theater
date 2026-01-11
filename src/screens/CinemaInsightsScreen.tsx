import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
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
  getMoviesByDirector,
  getMoviesByActor,
} from '../services/tmdb';
import FastImage from 'react-native-fast-image';
import {RadarChart} from '../components/RadarChart';
import {ActivityHeatMap} from '../components/ActivityHeatMap';

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
      Promise.resolve([]),
    ]);

    setCinemaDNA(dna);
    setStats(explorationStats);
    setGenres(genrePrefs);
    setDiversity(langDiversity);
    setCollections(collectionProgress);

    // Load top person's work (Single API call, Movies focused)
    if (dna?.topPerson) {
      try {
        let works: any[] = [];

        if (dna.topPerson.type === 'director') {
          works = await getMoviesByDirector(dna.topPerson.id);
        } else if (dna.topPerson.type === 'actor') {
          works = await getMoviesByActor(dna.topPerson.id);
        } else {
          // Fallback (e.g. Composer) - just fetch movie credits
          const m = await getPersonMovieCredits(dna.topPerson.id);
          works = m.results || [];
        }

        const allWork = works
          .map((m: any) => ({
            ...m,
            media_type: 'movie',
            date: m.release_date,
          }))
          .sort((a, b) => {
            const da = new Date(a.date || 0).getTime();
            const db = new Date(b.date || 0).getTime();
            return db - da;
          })
          .slice(0, 30);

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
      color: colors.text.muted,
      marginTop: spacing.md,
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
      width: isTablet ? 200 : 100,
      height: isTablet ? 250 : 150,
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

  if (loading || !cinemaDNA) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.text.primary} />
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
        {/* <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View> */}
        <View style={styles.header}></View>

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
            fontSize: isTablet ? 32 : 24,
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

        {/* Genre Distribution - Radar Chart Style */}
        {genres.length > 0 && (
          <View style={[styles.section, {marginTop: spacing.xl}]}>
            <Text style={styles.sectionTitle}>Genre Flavor</Text>
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: spacing.md,
              }}>
              <RadarChart
                data={genres.slice(0, 6).map(g => ({
                  label: g.name,
                  value: g.percentage,
                }))}
                maxVal={
                  Math.max(...genres.slice(0, 6).map(g => g.percentage)) + 5
                }
                size={isTablet ? 400 : 300}
                fillColor="rgba(232, 232, 232, 0.18)" // Soft Red
                strokeColor="#9c9c9cff"
              />
            </View>
          </View>
        )}

        {/* Time Exploration - Modern Cards */}
        {stats && (stats.mostExploredYear || stats.favoriteDecade) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time Travel</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: spacing.md,
                paddingHorizontal: spacing.md,
              }}>
              {stats.mostExploredYear && (
                <View
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: 24,
                    padding: 20,
                    justifyContent: 'space-between',
                    backgroundColor: colors.background.secondary,
                    borderWidth: 1,
                    borderColor: colors.background.border,
                    overflow: 'hidden',
                  }}>
                  <Icon
                    name="calendar-number-outline"
                    size={28}
                    color={colors.primary}
                  />
                  <View>
                    <Text
                      style={{
                        fontSize: 32,
                        fontWeight: '800',
                        color: colors.text.primary,
                        letterSpacing: -1,
                      }}>
                      {stats.mostExploredYear}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.text.secondary,
                        marginTop: 4,
                      }}>
                      Most Explored Year
                    </Text>
                  </View>
                  <LinearGradient
                    colors={[colors.primary, 'transparent']}
                    start={{x: 0, y: 1}}
                    end={{x: 1, y: 0}}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      opacity: 0.1,
                      zIndex: -1,
                    }}
                  />
                </View>
              )}
              {stats.favoriteDecade && (
                <View
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: 24,
                    padding: 20,
                    justifyContent: 'space-between',
                    backgroundColor: colors.background.secondary,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                  }}>
                  <Icon name="time-outline" size={28} color="#FFD700" />
                  <View>
                    <Text
                      style={{
                        fontSize: 32,
                        fontWeight: '800',
                        color: colors.text.primary,
                        letterSpacing: -1,
                      }}>
                      {stats.favoriteDecade}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.text.secondary,
                        marginTop: 4,
                      }}>
                      Golden Era
                    </Text>
                  </View>
                  <LinearGradient
                    colors={['#FFD700', 'transparent']}
                    start={{x: 0, y: 1}}
                    end={{x: 1, y: 0}}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      opacity: 0.1,
                      zIndex: -1,
                    }}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Language Diversity - Radar Chart Style */}
        {diversity && diversity.totalLanguages > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Global Footprint</Text>
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: spacing.md,
              }}>
              <RadarChart
                data={diversity.topLanguages.slice(0, 6).map(l => ({
                  label: l.name,
                  value: l.percentage,
                }))}
                maxVal={
                  Math.max(
                    ...diversity.topLanguages
                      .slice(0, 6)
                      .map(l => l.percentage),
                  ) + 5
                }
                size={isTablet ? 400 : 300}
                fillColor="rgba(205, 78, 199, 0.4)" // Soft Teal
                strokeColor="#af19caff"
              />
            </View>
          </View>
        )}

        {/* Cinema Rhythm - Heat Map */}
        {cinemaDNA?.viewingDates && cinemaDNA.viewingDates.length > 0 && (
          <View style={styles.section}>
            <View style={{paddingHorizontal: spacing.md}}>
              <ActivityHeatMap
                dates={cinemaDNA.viewingDates}
                title="Cinema Rhythm"
              />
            </View>
          </View>
        )}

        {/* Director Collections - Premium Card Style */}
        {collections.length > 0 && (
          <View style={[styles.section, {marginBottom: spacing.xl * 2}]}>
            <Text style={styles.sectionTitle}>Master Builders</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: spacing.md,
                paddingHorizontal: spacing.md,
              }}>
              {collections.slice(0, 5).map((collection, index) => {
                const percent = Math.round(collection.percentage);
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.9}
                    onPress={() => {
                      if (collection.directorId && collection.directorName) {
                        navigateToPerson(
                          collection.directorId,
                          collection.directorName,
                        );
                      }
                    }}
                    style={{
                      width: 280,
                      backgroundColor: colors.background.secondary,
                      borderRadius: 24,
                      padding: 20,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.08)',
                      justifyContent: 'space-between',
                      height: 160,
                      overflow: 'hidden',
                    }}>
                    {/* Background decoration */}
                    <Icon
                      name="videocam-outline"
                      size={120}
                      color="rgba(255,255,255,0.03)"
                      style={{position: 'absolute', bottom: -20, right: -20}}
                    />

                    <View>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 8,
                        }}>
                        <View
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            borderRadius: 100,
                            alignSelf: 'flex-start',
                          }}>
                          <Text
                            style={{
                              color: colors.text.secondary,
                              fontSize: 10,
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: 1,
                            }}>
                            DIRECTOR
                          </Text>
                        </View>
                        <Icon
                          name="chevron-forward"
                          size={16}
                          color={colors.text.tertiary}
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: '800',
                          color: colors.text.primary,
                          lineHeight: 28,
                        }}
                        numberOfLines={2}>
                        {collection.name.replace(' Collection', '')}
                      </Text>
                    </View>

                    <View>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'flex-end',
                          marginBottom: 6,
                        }}>
                        <Text
                          style={{
                            color: colors.text.secondary,
                            fontSize: 13,
                            fontWeight: '500',
                          }}>
                          <Text
                            style={{
                              color: colors.text.primary,
                              fontWeight: '700',
                            }}>
                            {collection.completed}
                          </Text>{' '}
                          <Text style={{fontSize: 11}}>of</Text>{' '}
                          {collection.total}{' '}
                          <Text style={{fontSize: 11}}>films</Text>
                        </Text>
                        <Text
                          style={{
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: '800',
                          }}>
                          {percent}%
                        </Text>
                      </View>
                      {/* Progress Bar */}
                      <View
                        style={{
                          height: 6,
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}>
                        <View
                          style={{
                            width: `${percent}%`,
                            height: '100%',
                            backgroundColor: '#fff',
                            borderRadius: 3,
                          }}
                        />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={{height: 200}} />
      </ScrollView>
    </View>
  );
};
