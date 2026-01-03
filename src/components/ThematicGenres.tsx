import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {useThematicGenres} from '../hooks/useThematicGenres';
import {getImageUrl} from '../services/tmdb';
import LinearGradient from 'react-native-linear-gradient';
import Ionicon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useResponsive} from '../hooks/useResponsive';
import {useNavigationState} from '../hooks/useNavigationState';

export const ThematicGenres: React.FC = () => {
  const {data: thematicData, isLoading} = useThematicGenres();
  const {navigateWithLimit} = useNavigationState();
  const {isTablet} = useResponsive();

  if (isLoading || !thematicData?.thematicTags?.length) {
    return null;
  }

  const handleTagPress = (tag: string, description: string) => {
    // Navigate to AI-powered thematic genre results screen
    navigateWithLimit('ThematicGenreResults', {
      tag,
      description,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicon
          name="sparkles"
          size={20}
          color={colors.text.primary}
          style={styles.icon}
        />
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Thematic Genres by AI</Text>
          <Text style={styles.subtitle}>Based on your watching patterns</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {thematicData.thematicTags.map((item, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleTagPress(item.tag, item.description)}
            activeOpacity={1}>
            <View style={[styles.tagCard, isTablet && styles.tagCardTablet]}>
              {item.poster_path && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: '60%',
                    overflow: 'hidden',
                    borderTopRightRadius: borderRadius.lg,
                    borderBottomRightRadius: borderRadius.lg,
                  }}>
                  <Image
                    source={{uri: getImageUrl(item.poster_path, 'w185')}}
                    style={{width: '100%', height: '100%', opacity: 0.1}}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['rgb(10, 0, 18)', 'transparent']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgb(10, 0, 18)']}
                    start={{x: 0, y: 0}}
                    end={{x: 0, y: 1}}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              )}
              <View style={styles.tagHeader}>
                <Text style={styles.tagText}>{item.tag}</Text>
              </View>
              <Text style={styles.confidenceText}>
                {Math.round(item.confidence * 100)}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  headerTitle: {
    flexDirection: 'column',
  },
  icon: {
    marginRight: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.text.muted,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  tagCard: {
    width: 180,
    height: 100,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.modal.blur,
    marginRight: spacing.sm,
    justifyContent: 'center',
    backgroundColor: 'rgb(10, 0, 18)',
  },
  tagCardTablet: {
    width: 200,
    padding: spacing.lg,
  },
  tagHeader: {
    flexDirection: 'row',
    alignContent: 'flex-start',
  },
  tagText: {
    ...typography.body1,
    fontWeight: '700',
    color: colors.text.secondary,
    textAlign: 'left',
  },
  confidenceText: {
    ...typography.caption,
    fontSize: 25,
    color: colors.text.muted,
    fontWeight: '900',
    position: 'absolute',
    bottom: 0,
    right: 10,
    opacity: 0.2,
  },
});
