import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {Video} from '../types/movie';
import YoutubePlayer from 'react-native-youtube-iframe';

interface VideosGalleryProps {
  videos?: {
    results: Video[];
  };
  onVideoPress?: (videoKey: string) => void;
}

export const VideosGallery: React.FC<VideosGalleryProps> = ({
  videos,
  onVideoPress,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const categorizedVideos = useMemo(() => {
    if (!videos?.results) return {};

    const categories: Record<string, Video[]> = {};

    videos.results.forEach(video => {
      if (video.site !== 'YouTube') return;

      const type = video.type || 'Other';
      if (!categories[type]) {
        categories[type] = [];
      }
      categories[type].push(video);
    });

    return categories;
  }, [videos]);

  const categoryOrder = [
    'Trailer',
    'Teaser',
    'Clip',
    'Featurette',
    'Behind the Scenes',
    'Bloopers',
  ];
  const sortedCategories = Object.keys(categorizedVideos).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Set initial category when data loads
  React.useEffect(() => {
    if (sortedCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(sortedCategories[0]);
    }
  }, [sortedCategories, selectedCategory]);

  if (!videos?.results || videos.results.length === 0) {
    return null;
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'Trailer':
        return 'film';
      case 'Teaser':
        return 'eye';
      case 'Clip':
        return 'cut';
      case 'Featurette':
        return 'camera';
      case 'Behind the Scenes':
        return 'videocam';
      case 'Bloopers':
        return 'happy';
      default:
        return 'play-circle';
    }
  };

  const renderVideoItem = (video: Video) => (
    <TouchableOpacity
      key={video.id}
      style={styles.videoItem}
      onPress={() => onVideoPress?.(video.key)}
      activeOpacity={0.8}>
      <View style={styles.thumbnailContainer}>
        <YoutubePlayer
          height={120}
          videoId={video.key}
          play={false}
          webViewProps={{
            androidLayerType: 'hardware',
          }}
        />
        <View style={styles.playOverlay}>
          <Icon name="play-circle" size={48} color="rgba(255, 255, 255, 0.9)" />
        </View>
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoName} numberOfLines={2}>
          {video.name}
        </Text>
        <Text style={styles.videoType}>{video.type}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Horizontal Category Tabs */}
      <ScrollView
        style={styles.tabContainer}
        horizontal={true}
        showsHorizontalScrollIndicator={false}>
        {sortedCategories.map(category => {
          const count = categorizedVideos[category]?.length || 0;
          if (count === 0) return null;

          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.tabButton,
                selectedCategory === category && styles.activeTabButton,
              ]}
              onPress={() => setSelectedCategory(category)}>
              <Text
                style={[
                  styles.tabText,
                  selectedCategory === category && styles.activeTabText,
                ]}>
                {category} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Tab Content */}
      {selectedCategory && categorizedVideos[selectedCategory] && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.videosList}>
          {categorizedVideos[selectedCategory].map(renderVideoItem)}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  tabButton: {
    padding: spacing.sm,
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
  videosList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  videoItem: {
    width: 200,
    marginRight: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.background.secondary,
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    backgroundColor: '#000',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  videoInfo: {
    padding: spacing.sm,
  },
  videoName: {
    ...typography.body2,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  videoType: {
    ...typography.caption,
    color: colors.text.muted,
  },
});
