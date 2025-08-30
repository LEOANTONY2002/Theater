import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {getMovieTrivia} from '../services/gemini';
import {GradientSpinner} from './GradientSpinner';
import {useResponsive} from '../hooks/useResponsive';

type TriviaFact = {
  fact: string;
  category: 'Production' | 'Cast' | 'Behind the Scenes' | 'Fun Fact';
};

interface MovieTriviaProps {
  title: string;
  year?: string;
  type: 'movie' | 'tv';
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
}) => {
  const [trivia, setTrivia] = useState<TriviaFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const {width} = useWindowDimensions();
  const {isTablet} = useResponsive();

  const loadTrivia = async () => {
    if (hasLoaded) return;

    setIsLoading(true);
    try {
      const facts = await getMovieTrivia({title, year, type});
      setTrivia(facts);
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading trivia:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load trivia immediately when component mounts
  useEffect(() => {
    loadTrivia();
  }, [title, year, type]);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background.tertiary,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.border,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      position: 'relative',
      height: 300,
      marginBottom: spacing.lg,
      overflow: 'visible',
    },
    backgroundGradient: {
      width: '270%',
      height: '200%',
      position: 'absolute',
      bottom: isTablet ? -55 : -75,
      left: -50,
      zIndex: 2,
      transform: [{rotate: isTablet ? '-10deg' : '-30deg'}],
      pointerEvents: 'none',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    headerTitle: {
      color: colors.text.primary,
      ...typography.h3,
    },
    content: {},
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 200,
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
    },
    factText: {
      fontSize: typography.body2.fontSize,
      color: colors.text.primary,
      lineHeight: typography.body2.fontSize * 1.5,
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
    },
  });

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
        <Text style={styles.headerTitle}>Trivia & Facts</Text>
        <Ionicons name="bulb" size={20} color={colors.accent} />
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <GradientSpinner
              colors={[
                colors.primary,
                colors.secondary,
                'transparent',
                'transparent',
              ]}
              size={30}
              thickness={2}
              style={{zIndex: 2}}
            />
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
