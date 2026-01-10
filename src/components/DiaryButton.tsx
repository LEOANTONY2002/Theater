import React, {useState, useEffect} from 'react';
import {TouchableOpacity, View, StyleSheet, Text} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography} from '../styles/theme';
import {diaryManager} from '../store/diary';
import {DiaryModal} from './modals/DiaryModal';
import {Notebook as NotebookBold} from '@solar-icons/react-native/dist/icons/notes/Bold/Notebook.mjs';
import {Notebook as NotebookLinear} from '@solar-icons/react-native/dist/icons/notes/Linear/Notebook.mjs';

interface DiaryButtonProps {
  contentId: number;
  type: 'movie' | 'tv';
  title: string;
  posterPath?: string;
  backdropPath?: string;
  totalSeasons?: number; // Only for TV
  seasonData?: {season_number: number; episode_count: number}[];
  // Optional style override
  style?: any;
  showLabel?: boolean;
}

export const DiaryButton: React.FC<DiaryButtonProps> = ({
  contentId,
  type,
  title,
  posterPath,
  backdropPath,
  totalSeasons,
  seasonData,
  style,
  showLabel = true,
}) => {
  const [entry, setEntry] = useState(diaryManager.getEntry(contentId));
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    // Initial fetch
    setEntry(diaryManager.getEntry(contentId));

    // Listen for changes
    const handleChange = () => {
      setEntry(diaryManager.getEntry(contentId));
    };

    diaryManager.addChangeListener(handleChange);
    return () => {
      diaryManager.removeChangeListener(handleChange);
    };
  }, [contentId]);

  const isWatched =
    entry?.status === 'completed' || entry?.status === 'watching';
  const isCompleted = entry?.status === 'completed';

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[styles.container, style]}
        activeOpacity={0.7}
        testID="diary-button">
        <View style={styles.iconContainer}>
          {isWatched ? (
            <NotebookBold size={24} color={colors.text.primary} />
          ) : (
            <NotebookLinear size={24} color={colors.text.primary} />
          )}
        </View>

        {showLabel && (
          <Text
            style={[
              styles.label,
              isWatched && {color: colors.primary, fontWeight: '600'},
            ]}>
            {isWatched ? (isCompleted ? 'Watched' : 'Watching') : 'Watch'}
          </Text>
        )}
      </TouchableOpacity>

      <DiaryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        contentId={contentId}
        type={type}
        title={title}
        posterPath={posterPath}
        backdropPath={backdropPath}
        totalSeasons={totalSeasons}
        seasonData={seasonData}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
    borderWidth: 1.5,
    borderColor: '#000',
  },
  label: {
    ...typography.caption,
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
});
