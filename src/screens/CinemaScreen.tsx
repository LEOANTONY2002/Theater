import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ImageBackground,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import Cinema from '../components/Cinema';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {MaybeBlurView} from '../components/MaybeBlurView';
import {CINEMA_SERVERS} from '../config/servers';
import {useTVShowDetails, useSeasonDetails} from '../hooks/useTVShows';
import {Episode} from '../types/tvshow';

type CinemaScreenParams = {
  CinemaScreen: {
    id: string;
    type: 'movie' | 'tv';
    title: string;
    season?: number;
    episode?: number;
  };
};

type CinemaScreenRouteProp = RouteProp<CinemaScreenParams, 'CinemaScreen'>;

export const CinemaScreen: React.FC = () => {
  const route = useRoute<CinemaScreenRouteProp>();
  const navigation = useNavigation();
  const {
    id,
    type,
    title,
    season: initialSeason,
    episode: initialEpisode,
  } = route.params;
  const [currentServer, setCurrentServer] = useState(1);
  const [selectedSeason, setSelectedSeason] = useState(initialSeason || 1);
  const [selectedEpisode, setSelectedEpisode] = useState(initialEpisode || 1);
  const [activeTab, setActiveTab] = useState<
    'servers' | 'seasons' | 'episodes'
  >('servers');

  // Fetch TV show details to get seasons list (only for TV shows)
  const {data: tvShowDetails} = useTVShowDetails(
    type === 'tv' ? parseInt(id) : 0,
  );

  // Fetch episodes for selected season (only for TV shows)
  const {data: seasonDetails} = useSeasonDetails(
    type === 'tv' ? parseInt(id) : 0,
    type === 'tv' ? selectedSeason : undefined,
  );

  const handleServerChange = useCallback((server: number) => {
    setCurrentServer(server);
  }, []);

  const handleSeasonChange = useCallback((season: number) => {
    setSelectedSeason(season);
    setSelectedEpisode(1); // Reset to first episode when season changes
  }, []);

  const handleEpisodeChange = useCallback((episode: number) => {
    setSelectedEpisode(episode);
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar hidden translucent={false} backgroundColor="#000000" />
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.8}>
          <Icon name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {type === 'tv' && (
          <Text style={styles.episodeInfo}>
            S{selectedSeason} E{selectedEpisode}
          </Text>
        )}
      </LinearGradient>
      <MaybeBlurView style={styles.leftContainer}>
        {/* Cinema Component */}
        <Cinema
          id={id}
          type={type}
          season={selectedSeason}
          episode={selectedEpisode}
          currentServer={currentServer}
        />
      </MaybeBlurView>

      {/* Right Side Container */}
      <View style={styles.rightSideContainer}>
        {/* Tabs - Outside the content */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'servers' && styles.tabActive]}
            onPress={() => setActiveTab('servers')}
            activeOpacity={0.7}>
            <Icon
              name="server-outline"
              size={18}
              color={
                activeTab === 'servers'
                  ? colors.text.primary
                  : colors.text.tertiary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'servers' && styles.tabTextActive,
              ]}>
              Servers
            </Text>
          </TouchableOpacity>

          {type === 'tv' && (
            <>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'seasons' && styles.tabActive,
                ]}
                onPress={() => setActiveTab('seasons')}
                activeOpacity={0.7}>
                <Icon
                  name="film-outline"
                  size={18}
                  color={
                    activeTab === 'seasons'
                      ? colors.text.primary
                      : colors.text.tertiary
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'seasons' && styles.tabTextActive,
                  ]}>
                  Seasons
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'episodes' && styles.tabActive,
                ]}
                onPress={() => setActiveTab('episodes')}
                activeOpacity={0.7}>
                <Icon
                  name="list-outline"
                  size={18}
                  color={
                    activeTab === 'episodes'
                      ? colors.text.primary
                      : colors.text.tertiary
                  }
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'episodes' && styles.tabTextActive,
                  ]}>
                  Episodes
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Tab Content - Inside MaybeBlurView */}
        <MaybeBlurView style={styles.contentContainer}>
          <ScrollView
            style={styles.tabContent}
            showsVerticalScrollIndicator={false}>
            {/* Servers Tab */}
            {activeTab === 'servers' &&
              CINEMA_SERVERS.map(server => (
                <TouchableOpacity
                  key={server.id}
                  style={[
                    styles.serverButton,
                    currentServer === server.id && styles.serverButtonActive,
                  ]}
                  onPress={() => handleServerChange(server.id)}
                  activeOpacity={0.7}>
                  <View style={styles.serverButtonContent}>
                    <Icon
                      name="play-circle-outline"
                      size={20}
                      color={
                        currentServer === server.id
                          ? colors.text.primary
                          : colors.text.secondary
                      }
                    />
                    <View>
                      <Text
                        style={[
                          styles.serverButtonText,
                          currentServer === server.id &&
                            styles.serverButtonTextActive,
                        ]}>
                        Server {server.id}
                      </Text>
                      <Text
                        style={{
                          ...typography.body2,
                          color:
                            currentServer === server.id
                              ? colors.modal.active
                              : colors.modal.content,
                        }}>
                        {server.title}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

            {/* Seasons Tab */}
            {activeTab === 'seasons' &&
              type === 'tv' &&
              tvShowDetails?.seasons &&
              tvShowDetails.seasons
                .filter((s: any) => s.season_number > 0)
                .map((season: any) => (
                  <TouchableOpacity
                    key={season.id}
                    style={[
                      styles.serverButton,
                      selectedSeason === season.season_number &&
                        styles.serverButtonActive,
                    ]}
                    onPress={() => {
                      handleSeasonChange(season.season_number);
                      setActiveTab('episodes');
                    }}
                    activeOpacity={0.7}>
                    <View style={styles.serverButtonContent}>
                      <Icon
                        name="film-outline"
                        size={20}
                        color={
                          selectedSeason === season.season_number
                            ? colors.text.primary
                            : colors.text.secondary
                        }
                      />
                      <View>
                        <Text
                          style={[
                            styles.serverButtonText,
                            selectedSeason === season.season_number &&
                              styles.serverButtonTextActive,
                          ]}>
                          Season {season.season_number}
                        </Text>
                        <Text
                          style={{
                            ...typography.body2,
                            color:
                              selectedSeason === season.season_number
                                ? colors.modal.active
                                : colors.modal.content,
                          }}>
                          {season.episode_count} episodes
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}

            {/* Episodes Tab */}
            {activeTab === 'episodes' &&
              type === 'tv' &&
              seasonDetails?.episodes &&
              seasonDetails.episodes.map((ep: Episode) => (
                <TouchableOpacity
                  key={ep.id}
                  style={[
                    styles.episodeButton,
                    selectedEpisode === ep.episode_number &&
                      styles.serverButtonActive,
                  ]}
                  onPress={() => handleEpisodeChange(ep.episode_number)}
                  activeOpacity={0.7}>
                  <View style={styles.episodeContent}>
                    <View style={styles.episodeNumber}>
                      <Text style={styles.episodeNumberText}>
                        {ep.episode_number}
                      </Text>
                    </View>
                    <View style={styles.episodeDetails}>
                      <Text
                        style={[
                          styles.episodeTitle,
                          selectedEpisode === ep.episode_number &&
                            styles.serverButtonTextActive,
                        ]}
                        numberOfLines={1}>
                        {ep.name}
                      </Text>
                      {ep.runtime && (
                        <Text style={styles.episodeRuntime}>
                          {ep.runtime} min
                        </Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </MaybeBlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#000000',
    padding: spacing.xxl,
  },
  leftContainer: {
    flex: 1,
    backgroundColor: '#000000',
    margin: spacing.xxl,
    borderRadius: 70,
    overflow: 'hidden',
    padding: 2,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
  title: {
    flex: 1,
    ...typography.h3,
    color: colors.text.primary,
    fontFamily: 'Inter_18pt-Bold',
  },
  episodeInfo: {
    ...typography.body1,
    color: colors.text.secondary,
    fontFamily: 'Inter_18pt-SemiBold',
    backgroundColor: colors.modal.blur,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
  rightContainer: {
    width: 250,
    backgroundColor: colors.background.secondary,
    borderLeftWidth: 1,
    borderLeftColor: colors.background.border,
    paddingVertical: spacing.lg,
    marginVertical: spacing.xxl,
    borderRadius: borderRadius.xl,
  },
  rightSideContainer: {
    width: 230,
    marginVertical: spacing.xxl,
    gap: spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  contentContainer: {
    flex: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.modal.blur,
  },
  tabActive: {
    backgroundColor: colors.modal.border,
    borderWidth: 1,
    borderColor: colors.modal.active,
  },
  tabText: {
    ...typography.body2,
    color: colors.text.tertiary,
    fontFamily: 'Inter_18pt-Medium',
    fontSize: 10,
  },
  tabTextActive: {
    color: colors.text.primary,
    fontFamily: 'Inter_18pt-Bold',
  },
  tabContent: {
    flex: 1,
    padding: spacing.md,
  },
  serverTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontFamily: 'Inter_18pt-Bold',
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  serverList: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  serverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.modal.content,
    marginBottom: spacing.sm,
  },
  serverButtonActive: {
    backgroundColor: colors.modal.border,
    borderColor: colors.modal.active,
    borderWidth: 2,
  },
  serverButtonContent: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  serverButtonText: {
    ...typography.body1,
    color: colors.text.secondary,
    fontFamily: 'Inter_18pt-Medium',
  },
  serverButtonTextActive: {
    color: colors.text.primary,
    fontFamily: 'Inter_18pt-Bold',
  },
  episodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.modal.content,
    marginBottom: spacing.sm,
  },
  episodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  episodeNumber: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.modal.content,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeNumberText: {
    ...typography.body1,
    color: colors.text.primary,
    fontFamily: 'Inter_18pt-Bold',
  },
  episodeDetails: {
    flex: 1,
    gap: spacing.xs,
  },
  episodeTitle: {
    ...typography.body1,
    color: colors.text.secondary,
    fontFamily: 'Inter_18pt-Medium',
  },
  episodeRuntime: {
    ...typography.body2,
    color: colors.text.tertiary,
  },
});
