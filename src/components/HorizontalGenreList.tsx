import React from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity} from 'react-native';
import {ContentItem} from './MovieList';
import {ContentCard} from './ContentCard';
import {
  borderRadius,
  colors,
  spacing,
  tagGradientColors,
  typography,
} from '../styles/theme';
import {
  HeadingSkeleton,
  HorizontalListSkeleton,
  LanguageSkeleton,
} from './LoadingSkeleton';
import Ionicon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {Genre} from '../types/movie';
import {BlurView} from '@react-native-community/blur';

interface HorizontalGenreListProps {
  title: string;
  data: Genre[];
  onItemPress: (item: Genre) => void;
  isLoading?: boolean;
}

export const HorizontalGenreList: React.FC<HorizontalGenreListProps> = ({
  title,
  data,
  onItemPress,
  isLoading,
}) => {
  const renderItem = ({item, index}: {item: Genre; index: number}) => (
    <TouchableOpacity style={styles.tag} onPress={() => onItemPress(item)}>
      <LinearGradient
        colors={[
          tagGradientColors[index],
          'transparent',
          tagGradientColors[index],
        ]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.tagGradient}
      />
      <BlurView
        style={styles.blurView}
        blurType="light"
        blurAmount={10}
        blurRadius={20}
        overlayColor={colors.modal.header}
      />
      <Text style={styles.tagBgText}>{item?.name.slice(0, 2)}</Text>
      <Text style={styles.tagText} numberOfLines={2}>
        {item?.name}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={{marginBottom: spacing.md, marginTop: -spacing.lg}}>
        <HeadingSkeleton />
        <LanguageSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        horizontal
        data={data}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        windowSize={3}
        initialNumToRender={8}
        getItemLayout={undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    flex: 1,
    marginLeft: spacing.md,
  },
  tagContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  tag: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    width: 120,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  tagGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
    zIndex: 0,
    borderRadius: borderRadius.lg,
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  tagBgText: {
    position: 'absolute',
    zIndex: 1,
    color: colors.text.tertiary,
    opacity: 0.2,
    fontSize: 60,
    fontWeight: '900',
  },
  tagText: {
    color: colors.text.primary,
    opacity: 0.7,
    fontSize: 13,
    textAlign: 'center',
    zIndex: 2,
    width: '100%',
    height: '100%',
    textAlignVertical: 'center',
  },
});
