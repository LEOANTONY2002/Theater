import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {Animated, Easing} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {
  useWatchlists,
  useCreateWatchlist,
  useWatchlistItems,
  useDeleteWatchlist,
} from '../hooks/useWatchlists';
import {HorizontalList} from '../components/HorizontalList';
import {ContentItem} from '../components/MovieList';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MySpaceStackParamList} from '../types/navigation';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import CreateButton from '../components/createButton';
import {modalStyles} from '../styles/styles';
import {useNavigationState} from '../hooks/useNavigationState';

type WatchlistsScreenNavigationProp =
  NativeStackNavigationProp<MySpaceStackParamList>;

const WatchlistSection: React.FC<{
  watchlistId: string;
  watchlistName: string;
  itemCount: number;
  onWatchlistPress: (watchlistId: string, watchlistName: string) => void;
  onItemPress: (item: ContentItem) => void;
}> = ({
  watchlistId,
  watchlistName,
  itemCount,
  onWatchlistPress,
  onItemPress,
}) => {
  const {data: items = [], isLoading} = useWatchlistItems(watchlistId);

  // Convert watchlist items to ContentItem format
  const contentItems: ContentItem[] = items.map(item => {
    if (item.type === 'movie') {
      return {
        id: item.id,
        title: item.title || '',
        originalTitle: item.originalTitle || '',
        overview: item.overview,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        vote_average: item.vote_average,
        release_date: item.release_date || '',
        genre_ids: item.genre_ids,
        popularity: item.popularity,
        original_language: item.original_language,
        type: 'movie' as const,
      };
    } else {
      return {
        id: item.id,
        name: item.name || '',
        overview: item.overview,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        vote_average: item.vote_average,
        first_air_date: item.first_air_date || '',
        genre_ids: item.genre_ids,
        origin_country: item.origin_country || [],
        popularity: item.popularity,
        original_language: item.original_language,
        type: 'tv' as const,
      };
    }
  });

  return (
    <View style={styles.watchlistSection}>
      <View style={styles.watchlistHeader}>
        <View style={styles.watchlistInfo}>
          <Text style={styles.watchlistName}>{watchlistName}</Text>
          {/* <Text style={styles.watchlistCount}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text> */}
        </View>
        <TouchableOpacity
          onPress={() => {
            onWatchlistPress(watchlistId, watchlistName);
          }}>
          <Ionicons name="close" size={20} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      {contentItems.length > 0 ? (
        <View style={styles.watchlistContent}>
          <HorizontalList
            title=""
            data={contentItems}
            onItemPress={onItemPress}
            isLoading={isLoading}
            isSeeAll={false}
          />
        </View>
      ) : (
        <View style={styles.emptyWatchlist}>
          <Text style={styles.emptyWatchlistTitle}>
            No items in this watchlist
          </Text>
        </View>
      )}
    </View>
  );
};

export const WatchlistsScreen: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');

  const {data: watchlists = [], isLoading} = useWatchlists();
  const createWatchlistMutation = useCreateWatchlist();
  const deleteWatchlistMutation = useDeleteWatchlist();
  const navigation = useNavigation<WatchlistsScreenNavigationProp>();
  const {navigateWithLimit} = useNavigationState();

  // Animated values for scroll
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const headerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const id = scrollY.addListener(({value}) => {
      Animated.timing(headerAnim, {
        toValue: value,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // must be false for margin/background
      }).start();
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, headerAnim]);

  // Interpolated styles for the animated header
  const animatedHeaderStyle = {
    marginHorizontal: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [spacing.lg, spacing.xl],
      extrapolate: 'clamp',
    }),
    marginBottom: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [spacing.md, spacing.lg],
      extrapolate: 'clamp',
    }),
    borderRadius: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [16, 24],
      extrapolate: 'clamp',
    }),
  };
  const blurOpacity = headerAnim.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) {
      Alert.alert('Error', 'Please enter a watchlist name');
      return;
    }

    try {
      await createWatchlistMutation.mutateAsync(newWatchlistName);
      setNewWatchlistName('');
      setShowCreateModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create watchlist');
    }
  };

  const handleWatchlistPress = (watchlistId: string, watchlistName: string) => {
    deleteWatchlistMutation.mutate(watchlistId);
  };

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigateWithLimit],
  );

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setNewWatchlistName('');
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, animatedHeaderStyle]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, {opacity: blurOpacity, zIndex: 0}]}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={16}
            overlayColor={colors.modal?.blur || 'rgba(255,255,255,0.11)'}
            reducedTransparencyFallbackColor={
              colors.modal?.blur || 'rgba(255,255,255,0.11)'
            }
            pointerEvents="none"
          />
        </Animated.View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons
            name="chevron-back-outline"
            size={24}
            color={colors.text.primary}
          />
        </TouchableOpacity>
        <Text style={styles.title}>Watchlists</Text>
        {watchlists.length > 0 && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              setShowCreateModal(true);
            }}>
            <Ionicons name="add" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        )}
      </Animated.View>
      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: false},
        )}>
        {watchlists.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Watchlists Yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first watchlist to start organizing your favorite
              movies and shows
            </Text>
            <CreateButton
              onPress={() => {
                setShowCreateModal(true);
              }}
              title="Create Your First Watchlist"
              icon="add"
            />
          </View>
        ) : (
          <>
            <View style={{height: 120}} />

            {watchlists.map(watchlist => (
              <WatchlistSection
                key={watchlist.id}
                watchlistId={watchlist.id}
                watchlistName={watchlist.name}
                itemCount={watchlist.itemCount}
                onWatchlistPress={handleWatchlistPress}
                onItemPress={handleItemPress}
              />
            ))}
            <View style={{height: 100}} />
          </>
        )}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          statusBarTranslucent={true}
          transparent={true}
          onRequestClose={handleCloseModal}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="dark"
                blurAmount={10}
                overlayColor={colors.modal.blur}
                reducedTransparencyFallbackColor={colors.modal.blur}
              />

              <View style={modalStyle.modalHeader}>
                <Text style={modalStyle.modalTitle}>Create New Watchlist</Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </View>

              <View style={modalStyle.scrollContent}>
                <Text style={modalStyle.sectionTitle}>Watchlist Name</Text>
                <TextInput
                  style={[
                    modalStyle.input,
                    {
                      marginBottom: spacing.lg,
                      height: 50,
                      marginTop: spacing.sm,
                    },
                  ]}
                  value={newWatchlistName}
                  onChangeText={setNewWatchlistName}
                  placeholder="Enter watchlist name"
                  placeholderTextColor={colors.text.muted}
                  autoFocus
                />
                <View style={modalStyle.footer}>
                  <TouchableOpacity
                    style={[modalStyle.footerButton, modalStyle.resetButton]}
                    onPress={handleCloseModal}>
                    <Text style={modalStyle.resetButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modalStyle.footerButton, modalStyle.applyButton]}
                    onPress={handleCreateWatchlist}
                    disabled={createWatchlistMutation.isPending}>
                    <Text style={modalStyle.applyButtonText}>
                      {createWatchlistMutation.isPending
                        ? 'Creating...'
                        : 'Create'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    backgroundColor: colors.background.primary,
    position: 'relative',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    overflow: 'hidden',
    marginTop: 50,
  },
  title: {
    flex: 1, // <-- Add this
    textAlign: 'center',
    color: colors.text.primary,
    ...typography.h2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    height: 40,
    width: 40,
    zIndex: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    height: 40,
    // backgroundColor: colors.modal.blur,
  },
  createButtonText: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  content: {},
  watchlistSection: {},
  watchlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    zIndex: 10,
    position: 'relative',
  },
  watchlistInfo: {
    flex: 1,
  },
  watchlistName: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  watchlistCount: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  watchlistContent: {
    marginTop: -40,
    zIndex: 1,
  },
  emptyState: {
    flex: 1,
    height: 600,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  emptyStateButtonText: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  emptyWatchlist: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyWatchlistTitle: {
    ...typography.body2,
    color: colors.text.muted,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xl,
  },
  modalContent: {
    marginTop: 60,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    width: '90%',
    height: 300,
    borderRadius: borderRadius.xl,
  },
});

const modalStyle: any = modalStyles;
