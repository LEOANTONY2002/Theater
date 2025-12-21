import React, {memo, useCallback} from 'react';
import {View, Text, FlatList, StyleSheet, TouchableOpacity} from 'react-native';
import {
  borderRadius,
  colors,
  spacing,
  tagGradientColors,
  typography,
} from '../styles/theme';
import {HeadingSkeleton, LanguageSkeleton} from './LoadingSkeleton';
import LinearGradient from 'react-native-linear-gradient';
import {Genre} from '../types/movie';

interface HorizontalGenreListProps {
  title: string;
  data: Genre[];
  onItemPress: (item: Genre) => void;
  isLoading?: boolean;
}

export const HorizontalGenreList: React.FC<HorizontalGenreListProps> = memo(
  ({title, data, onItemPress, isLoading}) => {
    const renderItem = useCallback(
      ({item, index}: {item: Genre; index: number}) => (
        <TouchableOpacity
          style={{...styles.tag, backgroundColor: tagGradientColors[index]}}
          activeOpacity={0.9}
          onPress={() => onItemPress(item)}>
          <Text style={styles.tagBgText}>{item?.name.slice(0, 2)}</Text>
          <Text style={styles.tagText} numberOfLines={2}>
            {item?.name}
          </Text>
        </TouchableOpacity>
      ),
      [onItemPress],
    );
    if (isLoading) {
      return (
        <View style={{marginBottom: spacing.md, marginTop: spacing.md}}>
          <HeadingSkeleton />
          <LanguageSkeleton />
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <LinearGradient
          colors={['transparent', colors.background.primary]}
          style={styles.tagGradient}
          pointerEvents="none"
        />
        <FlatList
          horizontal
          data={data}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagContent}
          maxToRenderPerBatch={8}
          windowSize={3}
          initialNumToRender={8}
          getItemLayout={undefined}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
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
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    width: 120,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: spacing.md,
  },
  tagGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 50,
    zIndex: 1,
    opacity: 0.7,
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
    fontFamily: 'Inter_28pt-ExtraBold',
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
    fontWeight: '600',
    fontFamily: 'Inter_18pt-Regular',
  },
});
