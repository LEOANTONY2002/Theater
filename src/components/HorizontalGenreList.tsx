import React from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity} from 'react-native';
import {ContentItem} from './MovieList';
import {ContentCard} from './ContentCard';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {
  HeadingSkeleton,
  HorizontalListSkeleton,
  LanguageSkeleton,
} from './LoadingSkeleton';
import Ionicon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {Genre} from '../types/movie';

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
      <Text style={styles.tagText}>{item?.name}</Text>
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
    backgroundColor: colors.background.tag,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 75,
    marginTop: 25,
    zIndex: 1,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  tagText: {
    color: colors.text.primary,
    ...typography.h2,
    fontWeight: '900',
    opacity: 0.3,
    textAlign: 'center',
  },
});
