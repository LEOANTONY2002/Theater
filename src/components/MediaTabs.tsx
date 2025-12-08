import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {MediaGallery} from './MediaGallery';
import {VideosGallery} from './VideosGallery';
import {ImageData, Video} from '../types/movie';

interface MediaTabsProps {
  images?: {
    backdrops: ImageData[];
    posters: ImageData[];
    logos: ImageData[];
  };
  videos?: {
    results: Video[];
  };
}

export const MediaTabs: React.FC<MediaTabsProps> = ({images, videos}) => {
  const hasImages =
    images &&
    (images.backdrops.length > 0 ||
      images.posters.length > 0 ||
      images.logos.length > 0);
  const hasVideos = videos && videos.results && videos.results.length > 0;

  // Determine initial tab based on data availability
  const getInitialTab = (): 'images' | 'videos' => {
    if (hasImages) return 'images';
    if (hasVideos) return 'videos';
    return 'images'; // Default fallback
  };

  const [activeTab, setActiveTab] = useState<'images' | 'videos'>(
    getInitialTab(),
  );

  // Update active tab when data changes
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [hasImages, hasVideos]);

  // Hide entire section if no data at all
  if (!hasImages && !hasVideos) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Media</Text>

      {/* Horizontal Tabs */}
      <ScrollView
        style={styles.tabContainer}
        horizontal={true}
        showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          key="images"
          style={[
            styles.tabButton,
            activeTab === 'images' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('images')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'images' && styles.activeTabText,
            ]}>
            Images
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          key="videos"
          style={[
            styles.tabButton,
            activeTab === 'videos' && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab('videos')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'videos' && styles.activeTabText,
            ]}>
            Videos
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Tab Content */}
      <View style={styles.tabContent} key={activeTab}>
        {activeTab === 'images' &&
          (hasImages ? (
            <MediaGallery images={images} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No images available</Text>
            </View>
          ))}
        {activeTab === 'videos' &&
          (hasVideos ? (
            <VideosGallery videos={videos} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No videos available</Text>
            </View>
          ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  tabButton: {
    padding: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderColor: colors.modal.content,
  },
  activeTabButton: {
    backgroundColor: colors.modal.border,
    borderWidth: 1,
    borderColor: colors.modal.active,
  },
  tabText: {
    color: colors.text.secondary,
    ...typography.body2,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.text.primary,
  },
  tabContent: {
    // Content will have its own padding from nested components
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  emptyText: {
    color: colors.text.secondary,
    ...typography.body2,
    textAlign: 'center',
  },
});
