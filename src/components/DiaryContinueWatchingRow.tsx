import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {diaryManager, IDiaryEntry} from '../store/diary';
import {DiaryModal} from './modals/DiaryModal';
import {colors, spacing, typography} from '../styles/theme';
import {HomeStackParamList} from '../types/navigation';

interface DiaryContinueWatchingRowProps {
  onRefresh?: () => void;
}

export const DiaryContinueWatchingRow: React.FC<
  DiaryContinueWatchingRowProps
> = ({onRefresh}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [entries, setEntries] = useState<IDiaryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<IDiaryEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadEntries = useCallback(() => {
    const all = diaryManager.getAllEntries();
    const watching = all.filter(e => e.status === 'watching');
    setEntries(watching);
  }, []);

  useEffect(() => {
    loadEntries();
    diaryManager.addChangeListener(loadEntries);
    return () => diaryManager.removeChangeListener(loadEntries);
  }, [loadEntries]);

  if (entries.length === 0) return null;

  const renderWatchingCard = ({item}: {item: IDiaryEntry}) => {
    const dateLabel = new Date(item.started_at).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });

    return (
      <TouchableOpacity
        style={styles.watchingCard}
        activeOpacity={0.8}
        onPress={() => {
          if (item.type === 'tv') {
            navigation.navigate('TVShowDetails', {
              show: {
                id: item.id,
                name: item.title,
                poster_path: item.poster_path,
              } as any,
            });
          } else {
            navigation.navigate('MovieDetails', {
              movie: {
                id: item.id,
                title: item.title,
                poster_path: item.poster_path,
              } as any,
            });
          }
        }}
        onLongPress={() => {
          setSelectedEntry(item);
          setModalVisible(true);
        }}>
        <Image
          source={{uri: `https://image.tmdb.org/t/p/w200${item.poster_path}`}}
          style={styles.watchingPoster}
        />
        <View style={styles.watchingInfo}>
          <Text style={styles.watchingTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.watchingSubtitle}>started at {dateLabel}</Text>
          <View style={styles.watchingProgressBarContainer}>
            <View
              style={[
                styles.watchingProgressFill,
                {width: `${item.progress}%`},
              ]}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>Continue watching</Text>
      </View>
      <FlatList
        horizontal
        data={entries}
        renderItem={renderWatchingCard}
        keyExtractor={item => item.id.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal: spacing.md}}
      />
      {selectedEntry && (
        <DiaryModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedEntry(null);
            loadEntries();
            onRefresh?.();
          }}
          contentId={selectedEntry.id}
          type={selectedEntry.type}
          title={selectedEntry.title}
          posterPath={selectedEntry.poster_path}
          totalSeasons={selectedEntry.total_seasons}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  watchingCard: {
    width: 250,
    backgroundColor: colors.modal.blur,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.modal.header,
    flexDirection: 'row',
    padding: 8,
    marginRight: spacing.md,
    alignItems: 'center',
  },
  watchingPoster: {
    width: 65,
    height: 85,
    borderRadius: 16,
  },
  watchingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  watchingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  watchingSubtitle: {
    fontSize: 11,
    color: colors.text.muted,
    marginBottom: 10,
  },
  watchingProgressBarContainer: {
    height: 6,
    backgroundColor: '#2C2C2E',
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  watchingProgressFill: {
    height: '100%',
    backgroundColor: colors.text.primary,
    borderRadius: 3,
  },
});
