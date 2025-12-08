import React, {useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
  useWindowDimensions,
  Linking,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {Video} from '../types/movie';
import YoutubePlayer from 'react-native-youtube-iframe';
import {MaybeBlurView} from './MaybeBlurView';
import {BlurView} from '@react-native-community/blur';
import {BlurPreference} from '../store/blurPreference';
import {useResponsive} from '../hooks/useResponsive';
import {GradientSpinner} from './GradientSpinner';

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
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const {width, height} = useWindowDimensions();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';
  const {isTablet} = useResponsive();

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

  const renderVideoItem = (video: Video) => (
    <TouchableOpacity
      key={video.id}
      style={styles.videoItem}
      onPress={() => {
        setSelectedVideo(video);
        setIsVideoLoading(true);
        onVideoPress?.(video.key);
      }}
      activeOpacity={0.8}>
      <View style={styles.thumbnailContainer}>
        <FastImage
          source={{
            uri: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`,
          }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoName} numberOfLines={2}>
          {video.name}
        </Text>
        <View
          style={{
            padding: 8,
            borderRadius: borderRadius.round,
            backgroundColor: colors.modal.blur,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: colors.modal.content,
          }}>
          <Icon name="play" size={15} color={colors.text.primary} />
        </View>
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

      {/* Full Screen Video Modal */}
      <Modal
        visible={selectedVideo !== null}
        backdropColor={colors.modal.blurDark}
        statusBarTranslucent
        onRequestClose={() => setSelectedVideo(null)}
        animationType="fade">
        <View style={styles.modalContainer}>
          {!isSolid && (
            <BlurView
              blurType="dark"
              blurAmount={10}
              overlayColor={colors.modal.blurDark}
              style={{
                flex: 1,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          )}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                selectedVideo &&
                Linking.openURL(
                  `https://www.youtube.com/watch?v=${selectedVideo.key}`,
                )
              }
              activeOpacity={0.8}>
              <Icon name="logo-youtube" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedVideo(null)}
              activeOpacity={0.8}>
              <Icon name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </View>

          <MaybeBlurView
            body
            style={{
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            {selectedVideo && (
              <View style={styles.fullVideoContainer}>
                {isVideoLoading && (
                  <View style={styles.videoLoader}>
                    <GradientSpinner size={24} />
                  </View>
                )}
                <YoutubePlayer
                  width={width - 64}
                  height={((width - 64) * 9) / 16}
                  videoId={selectedVideo.key}
                  play={true}
                  onReady={() => setIsVideoLoading(false)}
                  webViewProps={{
                    androidLayerType: 'hardware',
                  }}
                />
              </View>
            )}
          </MaybeBlurView>
        </View>
      </Modal>
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
    marginTop: spacing.sm,
  },
  videoItem: {
    width: 200,
    marginRight: spacing.md,
    borderRadius: borderRadius.md,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: 110,
    borderRadius: borderRadius.lg,
    objectFit: 'cover',
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderColor: colors.modal.content,
    borderBottomWidth: 0,
  },
  videoInfo: {
    padding: spacing.sm,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  videoName: {
    ...typography.body2,
    fontSize: 10,
    color: colors.text.primary,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    zIndex: 10,
    gap: spacing.sm,
    margin: spacing.md,
    alignSelf: 'flex-end',
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.header,
    backgroundColor: colors.modal.blur,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.header,
    backgroundColor: colors.modal.blur,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullVideoContainer: {
    width: '100%',
    alignItems: 'center',
    padding: spacing.md,
    position: 'relative',
  },
  videoLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  fullVideoTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  fullVideoType: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
});
