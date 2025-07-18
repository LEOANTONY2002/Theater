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
import LinearGradient from 'react-native-linear-gradient';

type WatchlistsScreenNavigationProp =
  NativeStackNavigationProp<MySpaceStackParamList>;

// Child component to render a watchlist and its results
const WatchlistItemWithResults = ({
  watchlistId,
  watchlistName,
  itemCount,
  onWatchlistPress,
  onItemPress,
}: {
  watchlistId: string;
  watchlistName: string;
  itemCount: number;
  onWatchlistPress: (watchlistId: string, watchlistName: string) => void;
  onItemPress: (item: ContentItem) => void;
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

  // Calculate content type distribution
  const movieCount = contentItems.filter(item => item.type === 'movie').length;
  const tvCount = contentItems.filter(item => item.type === 'tv').length;

  return (
    <View style={{marginBottom: spacing.xl, position: 'relative'}}>
      <View style={styles.watchlistItem}>
        <LinearGradient
          colors={[
            'transparent',
            colors.background.primary,
            colors.background.primary,
          ]}
          pointerEvents="none"
          style={{
            width: '180%',
            height: '130%',
            position: 'absolute',
            bottom: -25,
            left: -50,
            // paddingHorizontal: 10,
            zIndex: 0,
            transform: [{rotate: '-15deg'}],
          }}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
        />
        <View style={styles.watchlistHeader}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text style={styles.watchlistName}>{watchlistName}</Text>
            <TouchableOpacity
              style={{
                alignItems: 'center',
                padding: 5,
              }}
              activeOpacity={0.9}
              onPress={() => onWatchlistPress(watchlistId, watchlistName)}>
              <Ionicons
                name="trash-outline"
                size={15}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>
          {movieCount > 0 || tvCount > 0 ? (
            <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
              {movieCount > 0 && (
                <Text style={styles.watchlistCount}>
                  {movieCount} {movieCount === 1 ? 'movie' : 'movies'}
                </Text>
              )}
              {movieCount > 0 && tvCount > 0 && (
                <Text
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: 5,
                    marginTop: 2,
                    backgroundColor: colors.text.muted,
                  }}>
                  {' '}
                </Text>
              )}
              {tvCount > 0 && (
                <Text style={styles.watchlistCount}>
                  {tvCount} {tvCount === 1 ? 'tv show' : 'tv shows'}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.watchlistCount}>No content</Text>
          )}
        </View>

        {/* HorizontalList of watchlist items */}
        <View style={styles.listContainer}>
          <HorizontalList
            title={''}
            data={contentItems}
            isLoading={isLoading}
            onItemPress={onItemPress}
            isSeeAll={false}
            isFilter={true}
            isHeadingSkeleton={false}
          />
          <LinearGradient
            colors={['transparent', colors.background.primary]}
            pointerEvents="none"
            style={{
              width: '100%',
              height: 200,
              position: 'absolute',
              bottom: 20,
              zIndex: 1,
              opacity: 0.9,
              borderBottomLeftRadius: 10,
              borderBottomRightRadius: 10,
            }}
          />
        </View>
      </View>
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
      outputRange: [spacing.md, spacing.lg],
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
    <View style={{flex: 1}}>
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
          }}>
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
              style={styles.addButton}
              onPress={() => setShowCreateModal(true)}>
              <Ionicons name="add" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
      <Animated.ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: false},
        )}>
        {isLoading ? (
          <View>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading watchlists...</Text>
            </View>
          </View>
        ) : watchlists.length > 0 ? (
          <View style={styles.content}>
            {watchlists.map(watchlist => (
              <WatchlistItemWithResults
                key={watchlist.id}
                watchlistId={watchlist.id}
                watchlistName={watchlist.name}
                itemCount={watchlist.itemCount}
                onWatchlistPress={handleWatchlistPress}
                onItemPress={handleItemPress}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyStateTitle}>No Watchlists Yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first watchlist to start organizing your favorite
              movies and shows
            </Text>
            <CreateButton
              onPress={() => setShowCreateModal(true)}
              title="Create Your First Watchlist"
              icon="add"
            />
          </View>
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

              <View style={modalStyles.modalHeader}>
                <Text style={modalStyles.modalTitle}>Create New Watchlist</Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </View>

              <View style={modalStyles.scrollContent}>
                <Text style={modalStyles.sectionTitle}>Watchlist Name</Text>
                <TextInput
                  style={[
                    modalStyles.input,
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
                <View style={modalStyles.footer}>
                  <TouchableOpacity
                    style={[modalStyles.footerButton, modalStyles.resetButton]}
                    onPress={handleCloseModal}>
                    <Text style={modalStyles.resetButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modalStyles.footerButton, modalStyles.applyButton]}
                    onPress={handleCreateWatchlist}
                    disabled={createWatchlistMutation.isPending}>
                    <Text style={modalStyles.applyButtonText}>
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
    paddingTop: spacing.xxl,
    paddingBottom: 200,
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
    flex: 1,
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
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: 100,
    paddingBottom: 150,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '60%',
    paddingBottom: 200,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    width: '80%',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body1,
    color: colors.text.secondary,
  },
  watchlistItem: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    position: 'relative',
    height: 300,
    marginBottom: 10,
    zIndex: 0,
  },
  watchlistHeader: {
    flexDirection: 'column',
    marginBottom: spacing.sm,
  },
  watchlistName: {
    color: colors.text.primary,
    ...typography.h3,
  },
  watchlistCount: {
    color: colors.text.muted,
    ...typography.body2,
  },
  watchlistContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.modal.content,
    borderRadius: borderRadius.md,
    width: 80,
    height: 80,
    padding: spacing.xs,
    zIndex: 1,
  },
  cardText: {
    color: colors.text.secondary,
    ...typography.body1,
  },
  listContainer: {
    position: 'relative',
    width: '120%',
    overflow: 'scroll',
    bottom: 10,
    left: -30,
    zIndex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    height: 310,
    backgroundColor: colors.modal.active,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
});
