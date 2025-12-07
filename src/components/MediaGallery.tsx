import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {getImageUrl} from '../services/tmdb';
import {ImageData} from '../types/movie';
import {MaybeBlurView} from './MaybeBlurView';

interface MediaGalleryProps {
  images?: {
    backdrops: ImageData[];
    posters: ImageData[];
    logos: ImageData[];
  };
}

type MediaType = 'backdrops' | 'posters' | 'logos';

export const MediaGallery: React.FC<MediaGalleryProps> = ({images}) => {
  const [selectedType, setSelectedType] = useState<MediaType>('backdrops');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const {width, height} = Dimensions.get('window');

  const imageData = useMemo(() => {
    if (!images) return [];
    return images[selectedType] || [];
  }, [images, selectedType]);

  const tabs: {key: MediaType; label: string; icon: string}[] = [
    {key: 'backdrops', label: 'Backdrops', icon: 'image'},
    {key: 'posters', label: 'Posters', icon: 'images'},
    {key: 'logos', label: 'Logos', icon: 'sparkles'},
  ];

  if (
    !images ||
    (images.backdrops.length === 0 &&
      images.posters.length === 0 &&
      images.logos.length === 0)
  ) {
    return null;
  }

  const renderImageItem = ({item}: {item: ImageData}) => {
    const isLogo = selectedType === 'logos';
    const imageUrl = getImageUrl(item.file_path, 'w300');
    const aspectRatio = item.aspect_ratio;

    return (
      <TouchableOpacity
        style={[styles.imageItem, isLogo && styles.logoItem]}
        onPress={() =>
          setSelectedImage(getImageUrl(item.file_path, 'original'))
        }
        activeOpacity={0.8}>
        <FastImage
          source={{uri: imageUrl}}
          style={[
            styles.image,
            {
              aspectRatio:
                aspectRatio || (selectedType === 'posters' ? 2 / 3 : 16 / 9),
            },
            isLogo && styles.logoImage,
          ]}
          resizeMode={isLogo ? 'contain' : 'cover'}
        />
        {item.vote_count > 0 && (
          <View style={styles.voteContainer}>
            <Icon name="heart" size={12} color={colors.accent} />
            <Text style={styles.voteText}>{item.vote_count}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Horizontal Category Tabs */}
      <ScrollView
        style={styles.tabContainer}
        horizontal={true}
        showsHorizontalScrollIndicator={false}>
        {tabs.map(tab => {
          const count = images[tab.key]?.length || 0;
          if (count === 0) return null;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                selectedType === tab.key && styles.activeTabButton,
              ]}
              onPress={() => setSelectedType(tab.key)}>
              <Text
                style={[
                  styles.tabText,
                  selectedType === tab.key && styles.activeTabText,
                ]}>
                {tab.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Image Grid */}
      <FlatList
        data={imageData}
        renderItem={renderImageItem}
        keyExtractor={(item, index) => `${selectedType}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imageList}
        removeClippedSubviews
      />

      {/* Full Screen Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent
        statusBarTranslucent
        onRequestClose={() => setSelectedImage(null)}
        animationType="fade">
        <View style={styles.modalContainer}>
          <MaybeBlurView body style={styles.modalBlur}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedImage(null)}
              activeOpacity={0.8}>
              <Icon name="close" size={30} color="#fff" />
            </TouchableOpacity>
            {selectedImage && (
              <FastImage
                source={{uri: selectedImage}}
                style={{width: width - 32, height: height * 0.7}}
                resizeMode="contain"
              />
            )}
          </MaybeBlurView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
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
  imageList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  imageItem: {
    marginRight: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.background.secondary,
  },
  logoItem: {
    backgroundColor: colors.modal.header,
    padding: spacing.md,
  },
  image: {
    width: 200,
    borderRadius: borderRadius.md,
  },
  logoImage: {
    width: 200,
    height: 80,
  },
  voteContainer: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  voteText: {
    ...typography.caption,
    color: colors.text.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
