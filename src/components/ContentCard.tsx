import React, {useState} from 'react';
import {View, Text, Image, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, spacing, borderRadius} from '../styles/theme';
import {ContentItem} from './MovieList';
import {MoivieCardSkeleton} from './LoadingSkeleton';

interface ContentCardProps {
  item: ContentItem;
  onPress: (item: ContentItem) => void;
  v2?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  onPress,
  v2 = false,
}) => {
  const imageUrl = `https://image.tmdb.org/t/p/w500${
    v2 ? item.backdrop_path : item.poster_path
  }`;

  const title = 'title' in item ? item.title : 'name' in item ? item.name : '';

  const CARD_WIDTH = v2 ? 180 : 120; // Slightly wider cards
  const CARD_HEIGHT = v2 ? 100 : 180; // Slightly taller aspect ratio

  const [imageLoaded, setImageLoaded] = useState(false);

  const styles = StyleSheet.create({
    container: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
      borderRadius: borderRadius.md,
    },
    infoContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.sm,
    },

    title: {
      fontSize: 12,
      color: colors.text.secondary,
      fontWeight: '600',
      marginBottom: spacing.xs,
      width: 150,
    },
    skeletonContainer: {
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 1,
    },
  });

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => onPress(item)}
        activeOpacity={0.9}>
        {!imageLoaded && (
          <View style={styles.skeletonContainer}>
            <MoivieCardSkeleton />
          </View>
        )}
        <Image
          source={{uri: imageUrl}}
          style={styles.image}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
      </TouchableOpacity>
      {v2 && (
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </>
  );
};
