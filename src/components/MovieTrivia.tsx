import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {getMovieTrivia} from '../services/gemini';
import {useResponsive} from '../hooks/useResponsive';
import {TriviaListSkeleton} from './LoadingSkeleton';
import {useNavigation} from '@react-navigation/native';

type TriviaFact = {
  fact: string;
  category: 'Production' | 'Cast' | 'Behind the Scenes' | 'Fun Fact';
};

interface MovieTriviaProps {
  title: string;
  year?: string;
  type: 'movie' | 'tv';
  contentId?: number;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Production':
      return 'film-outline';
    case 'Cast':
      return 'people-outline';
    case 'Behind the Scenes':
      return 'camera-outline';
    case 'Fun Fact':
      return 'bulb-outline';
    default:
      return 'information-circle-outline';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Production':
      return '#ffffff80';
    case 'Cast':
      return '#ffffff60';
    case 'Behind the Scenes':
      return '#ffffff40';
    case 'Fun Fact':
      return '#ffffff20';
    default:
      return '#ffffff80';
  }
};

export const MovieTrivia: React.FC<MovieTriviaProps> = ({
  title,
  year,
  type,
  contentId,
}) => {
  const [trivia, setTrivia] = useState<TriviaFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [quotaError, setQuotaError] = useState(false);
  const {width} = useWindowDimensions();
  const {isTablet, orientation} = useResponsive();
  const navigation = useNavigation();

  const loadTrivia = async () => {
    // Don't check hasLoaded here - let useEffect control when to load

    setIsLoading(true);
    try {
      // Check Realm cache FIRST
      if (contentId) {
        const {getMovie, getTVShow} = await import('../database/contentCache');
        const cached =
          type === 'movie' ? getMovie(contentId) : getTVShow(contentId);

        if (cached?.ai_trivia) {
          try {
            const parsed = JSON.parse(cached.ai_trivia as string);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const triviaFacts = parsed.map((fact: string) => ({
                fact,
                category: [
                  'Production',
                  'Cast',
                  'Behind the Scenes',
                  'Fun Fact',
                ][Math.floor(Math.random() * 4)] as
                  | 'Production'
                  | 'Cast'
                  | 'Behind the Scenes'
                  | 'Fun Fact',
              }));
              setTrivia(triviaFacts);
              setHasLoaded(true);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.warn('[MovieTrivia] Failed to parse cached trivia');
          }
        }
      }

      // If not in cache, fetch from AI
      const facts = await getMovieTrivia({title, year, type, contentId});
      setTrivia(facts);
      setHasLoaded(true);
    } catch (error: any) {
      console.error('Error loading trivia:', error);

      // Check if it's a quota error - check multiple places where message might be
      const errorMessage =
        error?.message || error?.error?.message || JSON.stringify(error) || '';
      const isQuotaError =
        errorMessage.includes('You exceeded your current quota') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        error?.error?.code === 429;

      if (isQuotaError) {
        // Try to load from cache one more time as fallback
        if (contentId) {
          try {
            const {getMovie, getTVShow} = await import(
              '../database/contentCache'
            );
            const cached =
              type === 'movie' ? getMovie(contentId) : getTVShow(contentId);

            if (cached?.ai_trivia) {
              const parsed = JSON.parse(cached.ai_trivia as string);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const triviaFacts = parsed.map((fact: string) => ({
                  fact,
                  category: [
                    'Production',
                    'Cast',
                    'Behind the Scenes',
                    'Fun Fact',
                  ][Math.floor(Math.random() * 4)] as
                    | 'Production'
                    | 'Cast'
                    | 'Behind the Scenes'
                    | 'Fun Fact',
                }));
                setTrivia(triviaFacts);
                setHasLoaded(true);
                setIsLoading(false);
                return;
              }
            }
          } catch (e) {
            console.warn('[MovieTrivia] No cache available for fallback');
          }
        }

        // No cache available, show quota error
        setQuotaError(true);
        setHasLoaded(true);
      } else {
        setHasLoaded(true);
        setTrivia([]); // Set empty array to trigger hide for other errors
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Reset and load trivia when content changes
  useEffect(() => {
    setHasLoaded(false);
    setTrivia([]);
    setIsLoading(true);
    setQuotaError(false);
    loadTrivia();
  }, [title, year, type, contentId]);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background.tertiary,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.border,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      position: 'relative',
      height: 270,
      marginBottom: spacing.lg,
      overflow: 'visible',
      zIndex: 0,
    },
    backgroundGradient: {
      width: '270%',
      height: isTablet && orientation === 'portrait' ? '230%' : '180%',
      position: 'absolute',
      bottom: isTablet && orientation === 'portrait' ? -75 : -25,
      left: -50,
      zIndex: 2,
      transform: [
        {
          rotate:
            isTablet && orientation === 'landscape'
              ? '-5deg'
              : isTablet && orientation == 'portrait'
              ? '-10deg'
              : '-20deg',
        },
      ],
      pointerEvents: 'none',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    headerTitle: {
      color: colors.text.primary,
      ...typography.h3,
    },
    content: {},
    loadingContainer: {
      position: 'relative',
      width: width,
      overflow: 'visible',
      left: -30,
    },
    listContainer: {
      position: 'relative',
      width: width,
      overflow: 'visible',
      left: -30,
    },
    triviaList: {
      paddingLeft: 30,
      zIndex: 10,
    },
    horizontalContent: {
      paddingRight: spacing.xxl,
    },
    triviaCard: {
      width: 280,
      marginRight: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.background.card,
      borderWidth: 1,
      borderColor: colors.modal.content,
      borderRadius: borderRadius.md,
      minHeight: 180,
    },
    triviaItem: {
      marginBottom: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.background.primary,
    },
    triviaHeader: {
      marginBottom: spacing.sm,
    },
    categoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
      gap: spacing.xs,
    },
    categoryText: {
      fontSize: typography.caption.fontSize,
      color: '#fff',
      fontWeight: '600',
      fontFamily: 'Inter_18pt-Regular',
    },
    factText: {
      fontSize: typography.body2.fontSize,
      color: colors.text.primary,
      lineHeight: typography.body2.fontSize * 1.5,
      fontFamily: 'Inter_18pt-Regular',
    },
    fadeGradient: {
      width: '100%',
      height: 200,
      position: 'absolute',
      bottom: 20,
      zIndex: 1,
      opacity: 0.9,
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 10,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      gap: spacing.sm,
    },
    emptyText: {
      fontSize: typography.body2.fontSize,
      color: colors.text.secondary,
      textAlign: 'center',
      fontFamily: 'Inter_18pt-Regular',
    },
    quotaErrorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.md,
    },
    quotaErrorTitle: {
      ...typography.h3,
      color: colors.text.primary,
      textAlign: 'center',
    },
    quotaErrorText: {
      ...typography.body2,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    settingsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      marginTop: spacing.sm,
    },
    settingsButtonText: {
      ...typography.body2,
      fontWeight: '600',
      color: colors.background.primary,
    },
  });

  // Show quota error UI
  if (quotaError) {
    // return (
    //   <View
    //     style={[
    //       styles.container,
    //       {
    //         borderColor: colors.modal.blur,
    //         borderBottomWidth: 1,
    //       },
    //     ]}>
    //     <View style={styles.quotaErrorContainer}>
    //       <Ionicons name="alert-circle" size={48} color={colors.accent} />
    //       <Text style={styles.quotaErrorTitle}>API Quota Exceeded</Text>
    //       <Text style={styles.quotaErrorText}>
    //         Please update your Gemini API key in settings or Try again later
    //       </Text>
    //       <TouchableOpacity
    //         style={styles.settingsButton}
    //         onPress={() => {
    //           // Navigate to MySpace tab, then to AISettings
    //           (navigation as any).navigate('MySpace', {
    //             screen: 'AISettings',
    //           });
    //         }}>
    //         <Ionicons
    //           name="settings-outline"
    //           size={20}
    //           color={colors.background.primary}
    //         />
    //         <Text style={styles.settingsButtonText}>AI Settings</Text>
    //       </TouchableOpacity>
    //     </View>
    //   </View>
    // );
    return null;
  }

  // Don't render if loaded but empty
  if (hasLoaded && trivia.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          'transparent',
          colors.background.primary,
          colors.background.primary,
        ]}
        pointerEvents="none"
        style={styles.backgroundGradient}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}
      />

      <View style={styles.header}>
        <Ionicons name="bulb" size={20} color={colors.accent} />
        <Text style={styles.headerTitle}>Trivia & Facts</Text>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <TriviaListSkeleton />
          </View>
        ) : (
          <View style={styles.listContainer}>
            <ScrollView
              horizontal
              style={styles.triviaList}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalContent}>
              {trivia.map((item, index) => (
                <View key={index} style={styles.triviaCard}>
                  <View style={styles.triviaHeader}>
                    <View
                      style={[
                        styles.categoryBadge,
                        {backgroundColor: getCategoryColor(item.category)},
                      ]}>
                      <Ionicons
                        name={getCategoryIcon(item.category)}
                        size={12}
                        color="#fff"
                      />
                      <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                  </View>
                  <Text style={styles.factText}>{item.fact}</Text>
                </View>
              ))}
            </ScrollView>
            <LinearGradient
              colors={['transparent', colors.background.primary]}
              pointerEvents="none"
              style={styles.fadeGradient}
            />
          </View>
        )}
      </View>
    </View>
  );
};
