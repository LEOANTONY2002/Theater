import React from 'react';
import {View, Text, StyleSheet, useWindowDimensions} from 'react-native';
import {colors, spacing, typography} from '../styles/theme';
import {useAiringTodayTVShows, useTVShowDetails} from '../hooks/useTVShows';
import {TVShow} from '../types/tvshow';
import {ContentItem} from './MovieList';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {HomeStackParamList} from '../types/navigation';
import {useResponsive} from '../hooks/useResponsive';
import LinearGradient from 'react-native-linear-gradient';
import Carousel from 'react-native-reanimated-carousel';
import {Pressable} from 'react-native';
import FastImage from 'react-native-fast-image';

interface AiringTodayTVReleasesProps {
  onItemPress?: (item: ContentItem) => void;
}

interface ReleaseItemProps {
  item: TVShow;
  onPress: (item: TVShow) => void;
  width: number;
  height: number;
}

export const AiringTodayTVReleases: React.FC<AiringTodayTVReleasesProps> = ({
  onItemPress,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const {isTablet} = useResponsive();
  const {width: SCREEN_WIDTH} = useWindowDimensions();

  const {data, isLoading} = useAiringTodayTVShows();

  const shows = React.useMemo(
    () => data?.pages?.[0]?.results?.slice(0, 10) || [],
    [data],
  );

  const CARD_DIMENSIONS = React.useMemo(
    () => ({
      width: SCREEN_WIDTH,
      height: isTablet ? 380 : 270,
    }),
    [isTablet, SCREEN_WIDTH],
  );

  const handlePress = React.useCallback(
    (item: TVShow) => {
      if (onItemPress) {
        onItemPress({...item, type: 'tv'});
      } else {
        navigation.push('TVShowDetails', {show: item as any});
      }
    },
    [onItemPress, navigation],
  );

  if (isLoading || shows.length === 0) {
    return null;
  }

  const ReleaseItem = React.memo(
    ({item, onPress, width, height}: ReleaseItemProps) => {
      const {data: details} = useTVShowDetails(item.id);

      const episodeInfo = React.useMemo(() => {
        if (!details) return null;
        const today = new Date().toISOString().split('T')[0];

        // Try to find the exact episode airing today
        let ep = null;
        if (details.next_episode_to_air?.air_date === today) {
          ep = details.next_episode_to_air;
        } else if (details.last_episode_to_air?.air_date === today) {
          ep = details.last_episode_to_air;
        } else {
          // Fallback to next or last if date doesn't strictly match today
          ep = details.next_episode_to_air || details.last_episode_to_air;
        }

        if (!ep) return null;

        return {
          seasonNum: ep.season_number,
          episodeNum: ep.episode_number,
          name: ep.name,
        };
      }, [details]);

      return (
        <Pressable onPress={() => onPress(item)} style={styles.itemContainer}>
          <View style={[styles.card, {width, height}]}>
            <FastImage
              source={{
                uri: `https://image.tmdb.org/t/p/w780${item.backdrop_path}`,
                priority: FastImage.priority.normal,
              }}
              style={styles.poster}
              resizeMode={FastImage.resizeMode.cover}
            />

            <LinearGradient
              colors={[
                'transparent',
                'rgba(0,0,0,0.1)',
                'rgba(0,0,0,0.8)',
                'rgba(0,0,0,0.95)',
              ]}
              locations={[0, 0.4, 0.8, 1]}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.contentOverlay}>
              {episodeInfo && (
                <View style={styles.episodeLargeContainer}>
                  <Text style={styles.seasonLargeText}>
                    S{episodeInfo.seasonNum}
                  </Text>
                  <Text
                    style={[
                      styles.episodeLargeText,
                      {
                        fontSize: isTablet
                          ? 48
                          : episodeInfo.episodeNum.toString().length > 3
                          ? 40
                          : 32,
                      },
                    ]}>
                    E{episodeInfo.episodeNum}
                  </Text>
                </View>
              )}

              <View style={styles.infoContainer}>
                <Text style={styles.movieTitle} numberOfLines={1}>
                  {item.name}
                </Text>

                {item.first_air_date && (
                  <Text style={styles.episodeNameText} numberOfLines={1}>
                    From{' '}
                    {new Date(item.first_air_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                )}

                <Text style={styles.overview} numberOfLines={2}>
                  {item.overview}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      );
    },
    (prev, next) =>
      prev.item.id === next.item.id &&
      prev.width === next.width &&
      prev.height === next.height,
  );

  const styles = StyleSheet.create({
    container: {
      marginBottom: spacing.xl,
      marginTop: spacing.sm,
    },
    title: {
      ...typography.h3,
      color: colors.text.primary,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    itemContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.modal.blur,
      backgroundColor: '#1a1a1a',
      elevation: 50,
      shadowColor: '#000',
      shadowOffset: {
        width: 20,
        height: 20,
      },
      shadowOpacity: 0.6,
      shadowRadius: 20,
    },
    poster: {
      width: '100%',
      height: '100%',
    },
    contentOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    infoContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    episodeLargeContainer: {
      marginRight: 16,
      justifyContent: 'flex-end',
      marginBottom: 4,
      alignItems: 'flex-start',
    },
    seasonLargeText: {
      ...typography.h1,
      fontSize: isTablet ? 48 : 40,
      fontWeight: '900',
      color: colors.text.primary,
      includeFontPadding: false,
    },
    episodeLargeText: {
      ...typography.h1,
      fontSize: isTablet ? 48 : 40,
      fontWeight: '900',
      color: colors.text.primary,
      includeFontPadding: false,
      marginTop: -8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    airingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 0, 0, 0.2)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 0, 0, 0.4)',
    },
    pulseDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#ff4444',
      marginRight: 6,
    },
    airingText: {
      color: '#ff4444',
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1,
    },
    movieTitle: {
      ...typography.h2,
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 2,
      lineHeight: 26,
    },
    episodeNameText: {
      ...typography.body2,
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.7)',
      fontWeight: '700',
      marginBottom: 6,
    },
    overview: {
      ...typography.body2,
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.5)',
      marginBottom: 10,
      lineHeight: 18,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Airing Today</Text>

      <View style={{height: CARD_DIMENSIONS.height, width: SCREEN_WIDTH}}>
        <Carousel
          width={SCREEN_WIDTH}
          height={CARD_DIMENSIONS.height}
          data={shows}
          loop={shows?.length > 3 ? true : false}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.8,
            parallaxScrollingOffset: isTablet ? 300 : 150,
          }}
          snapEnabled={false}
          windowSize={3}
          scrollAnimationDuration={500}
          renderItem={({item}: {item: TVShow}) => (
            <ReleaseItem
              item={item}
              onPress={handlePress}
              width={CARD_DIMENSIONS.width}
              height={CARD_DIMENSIONS.height}
            />
          )}
        />
      </View>
    </View>
  );
};
