import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Share as NativeShare,
  ActivityIndicator,
  Image,
  Platform,
  Clipboard,
} from 'react-native';
import ShareLib from 'react-native-share';
import {BlurView} from '@react-native-community/blur';
import {Animated, Easing} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {
  useWatchlists,
  useCreateWatchlist,
  useWatchlistItems,
  useDeleteWatchlist,
  useAddToWatchlist,
  useUpdateWatchlist,
  useReorderWatchlists,
  useDeleteAllWatchlists,
} from '../hooks/useWatchlists';
import {ReorderWatchlistsDialog} from '../components/ReorderWatchlistsDialog';
import {Watchlist} from '../store/watchlists';
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
import {useResponsive} from '../hooks/useResponsive';
import {
  generateWatchlistCode,
  parseWatchlistCode,
  generateAllWatchlistsCode,
  parseAllWatchlistsCode,
} from '../utils/shareCode';
import {watchlistManager} from '../store/watchlists';
import {getMovieDetails, getTVShowDetails} from '../services/tmdbWithCache';
import {requestPosterCapture} from '../components/PosterCaptureHost';
import {BlurPreference} from '../store/blurPreference';

type WatchlistsScreenNavigationProp =
  NativeStackNavigationProp<MySpaceStackParamList>;

// 1. Move styles outside to prevent recreation
const styles = StyleSheet.create({
  container: {
    height: '100%',
    backgroundColor: colors.background.primary,
    paddingTop: spacing.xxl,
    paddingBottom: 200,
    position: 'relative',
  },
  header: {
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    marginTop: 60,
  },
  title: {
    textAlign: 'left',
    color: colors.text.primary,
    ...typography.h2,
    paddingHorizontal: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.modal.blur,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.header,
    opacity: 0.8,
    gap: 8,
  },
  actionButtonText: {
    color: colors.text.primary,
    ...typography.button,
    fontSize: 14,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: 150,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  listContainer: {
    position: 'relative',
    width: '120%',
    overflow: 'scroll',
    bottom: 10,
    left: -30,
    zIndex: 1,
  },
});

// 2. Extract WatchlistItemWithResults and Memoize it
const WatchlistItemWithResults = React.memo(
  ({
    watchlistId,
    watchlistName,
    itemCount,
    onWatchlistPress,
    onEditPress,
    onItemPress,
  }: {
    watchlistId: string;
    watchlistName: string;
    itemCount: number;
    onWatchlistPress: (watchlistId: string, watchlistName: string) => void;
    onEditPress: (id: string, name: string) => void;
    onItemPress: (item: ContentItem) => void;
  }) => {
    const {data: items = [], isLoading} = useWatchlistItems(watchlistId);
    const [isSharingStory, setIsSharingStory] = React.useState(false);
    const [showStoryModal, setShowStoryModal] = React.useState(false);
    const [storyUri, setStoryUri] = React.useState<string | null>(null);
    const [storyLoading, setStoryLoading] = React.useState(false);

    // Use hooks inside the component since it's now isolated
    const {isTablet, orientation} = useResponsive();

    const contentItems: ContentItem[] = React.useMemo(
      () =>
        items.map(item => {
          if (item.type === 'movie') {
            return {
              id: item.id,
              title: item.title || '',
              originalTitle: item.originalTitle || '',
              overview: item.overview,
              poster_path: item.poster_path,
              backdrop_path: item.backdrop_path,
              vote_average: item.vote_average,
              vote_count: 0,
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
        }),
      [items],
    );

    const shareCode = React.useMemo(
      () =>
        generateWatchlistCode(
          watchlistName,
          contentItems.map(ci => ({id: ci.id, type: ci.type})),
        ),
      [watchlistName, contentItems],
    );

    const movieCount = contentItems.filter(
      item => item.type === 'movie',
    ).length;
    const tvCount = contentItems.filter(item => item.type === 'tv').length;

    const handleOpenStoryModal = async () => {
      setShowStoryModal(true);
      setStoryLoading(true);
      setStoryUri(null);
      try {
        const uri = await requestPosterCapture(
          {
            watchlistName,
            items: contentItems.slice(0, 3) as any,
            importCode: shareCode,
            isFilter: false,
            showQR: true,
          },
          'tmpfile',
        );
        setStoryUri(uri);
      } catch (e) {
        Alert.alert('Create Story', 'Could not generate the poster.');
        setShowStoryModal(false);
      } finally {
        setStoryLoading(false);
      }
    };

    const handleStoryShare = useCallback(async () => {
      if (!storyUri) return;
      try {
        await ShareLib.open({url: storyUri, type: 'image/png'});
      } catch (e) {}
    }, [storyUri]);

    return (
      <View style={{marginBottom: spacing.xl, position: 'relative'}}>
        <View style={[styles.watchlistItem, {height: isTablet ? 400 : 300}]}>
          {isSharingStory && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 2,
                backgroundColor: 'rgba(0,0,0,0.35)',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: borderRadius.lg,
              }}>
              <ActivityIndicator size="large" color={colors.text.primary} />
              <Text
                style={{
                  marginTop: 8,
                  color: colors.text.secondary,
                  fontFamily: 'Inter_18pt-Regular',
                }}>
                Creating poster...
              </Text>
            </View>
          )}
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
              zIndex: 0,
              transform: [
                {
                  rotate:
                    isTablet && orientation == 'landscape' ? '-5deg' : '-15deg',
                },
              ],
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
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <TouchableOpacity
                  style={{alignItems: 'center', padding: 5, marginRight: 6}}
                  activeOpacity={0.9}
                  onPress={() => onEditPress(watchlistId, watchlistName)}>
                  <Ionicons
                    name="pencil-outline"
                    size={16}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{alignItems: 'center', padding: 5, marginRight: 6}}
                  activeOpacity={0.9}
                  onPress={handleOpenStoryModal}
                  disabled={isSharingStory}>
                  <Ionicons
                    name="share-social-outline"
                    size={16}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={{alignItems: 'center', padding: 5}}
                  activeOpacity={0.9}
                  onPress={() => onWatchlistPress(watchlistId, watchlistName)}>
                  <Ionicons
                    name="trash-outline"
                    size={15}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {movieCount > 0 || tvCount > 0 ? (
              <View
                style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
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
                      fontFamily: 'Inter_18pt-Regular',
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
            <View style={{width: 100, height: 100}} />
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

        <Modal
          visible={showStoryModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowStoryModal(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.9)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: spacing.md,
            }}>
            <View
              style={{
                width: '92%',
                borderRadius: borderRadius.lg,
                overflow: 'hidden',
                alignItems: 'center',
                padding: spacing.md,
              }}>
              {storyLoading ? (
                <View style={{padding: spacing.xl, alignItems: 'center'}}>
                  <ActivityIndicator size="large" color={colors.text.primary} />
                  <Text
                    style={{
                      marginTop: spacing.sm,
                      color: colors.text.secondary,
                      fontFamily: 'Inter_18pt-Regular',
                    }}>
                    Creating poster...
                  </Text>
                </View>
              ) : storyUri ? (
                <>
                  <Image
                    source={{uri: storyUri}}
                    style={{
                      width: 270,
                      height: 480,
                      borderRadius: borderRadius.md,
                      backgroundColor: '#000',
                    }}
                    resizeMode="cover"
                  />
                  <View
                    style={{
                      marginTop: spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.lg,
                    }}>
                    <TouchableOpacity
                      onPress={handleStoryShare}
                      style={{alignItems: 'center'}}>
                      <Ionicons
                        name="share-social-outline"
                        size={22}
                        color={colors.text.primary}
                      />
                      <Text
                        style={{
                          color: colors.text.secondary,
                          marginTop: 4,
                          fontFamily: 'Inter_18pt-Regular',
                        }}>
                        Share
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          await Clipboard.setString(shareCode);
                        } catch {}
                      }}
                      style={{alignItems: 'center'}}>
                      <Ionicons
                        name="copy-outline"
                        size={22}
                        color={colors.text.primary}
                      />
                      <Text
                        style={{
                          color: colors.text.secondary,
                          marginTop: 4,
                          fontFamily: 'Inter_18pt-Regular',
                        }}>
                        Copy code
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowStoryModal(false)}
                      style={{alignItems: 'center'}}>
                      <Ionicons
                        name="close-circle-outline"
                        size={22}
                        color={colors.text.primary}
                      />
                      <Text
                        style={{
                          color: colors.text.secondary,
                          marginTop: 4,
                          fontFamily: 'Inter_18pt-Regular',
                        }}>
                        Close
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={{padding: spacing.lg}}>
                  <Text
                    style={{
                      color: colors.text.secondary,
                      fontFamily: 'Inter_18pt-Regular',
                    }}>
                    Failed to create poster.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  },
);

export const WatchlistsScreen: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteWatchlist, setPendingDeleteWatchlist] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWatchlist, setEditingWatchlist] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [exportCode, setExportCode] = useState<string | null>(null);
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({visible: false, title: '', message: ''});
  const [editName, setEditName] = useState('');

  const {data: watchlists = [], isLoading} = useWatchlists();
  const createWatchlistMutation = useCreateWatchlist();
  const updateWatchlistMutation = useUpdateWatchlist();
  const deleteWatchlistMutation = useDeleteWatchlist();
  const addToWatchlistMutation = useAddToWatchlist();
  const reorderWatchlistsMutation = useReorderWatchlists();
  const deleteAllWatchlistsMutation = useDeleteAllWatchlists();
  const navigation = useNavigation<WatchlistsScreenNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const {isTablet, orientation} = useResponsive();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  // Animated values for scroll
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const headerAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const id = scrollY.addListener(({value}) => {
      Animated.timing(headerAnim, {
        toValue: value,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, headerAnim]);

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

  // Memoize handlers to prevent passing new functions to React.memo child
  const handleEditPress = useCallback((id: string, name: string) => {
    setEditingWatchlist({id, name});
    setEditName(name);
    setShowEditModal(true);
  }, []);

  const handleUpdateWatchlist = async () => {
    if (!editName.trim() || !editingWatchlist) {
      Alert.alert('Error', 'Please enter a watchlist name');
      return;
    }

    try {
      await updateWatchlistMutation.mutateAsync({
        id: editingWatchlist.id,
        name: editName.trim(),
      });
      setShowEditModal(false);
      setEditingWatchlist(null);
      setEditName('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update watchlist');
    }
  };

  const handleWatchlistPress = useCallback(
    (watchlistId: string, watchlistName: string) => {
      setPendingDeleteWatchlist({id: watchlistId, name: watchlistName});
      setShowDeleteConfirm(true);
    },
    [],
  );

  const confirmDelete = async () => {
    if (!pendingDeleteWatchlist) return;
    try {
      deleteWatchlistMutation.mutate(pendingDeleteWatchlist.id);
      setShowDeleteConfirm(false);
      setPendingDeleteWatchlist(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete watchlist');
      setShowDeleteConfirm(false);
      setPendingDeleteWatchlist(null);
    }
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

  const handleExportAll = useCallback(async () => {
    try {
      const data = await watchlistManager.getAllWatchlistsExportData();
      if (data.length === 0) {
        setCustomAlert({
          visible: true,
          title: 'Export',
          message: 'No watchlists to export.',
        });
        return;
      }
      const code = generateAllWatchlistsCode(data);
      setExportCode(code);
    } catch (e) {
      setCustomAlert({
        visible: true,
        title: 'Export Failed',
        message: 'Could not export watchlists.',
      });
    }
  }, []);

  const handleImportSubmit = useCallback(async () => {
    const code = importCode.trim();
    if (!code) {
      setCustomAlert({
        visible: true,
        title: 'Import',
        message: 'Please paste a valid code.',
      });
      return;
    }

    try {
      setIsImporting(true);

      // Try bulk parsing first
      const bulkParsed = parseAllWatchlistsCode(code);
      if (bulkParsed && bulkParsed.length > 0) {
        let importedCount = 0;
        for (const wl of bulkParsed) {
          try {
            const newList = await createWatchlistMutation.mutateAsync(wl.name);
            for (const it of wl.items) {
              try {
                if (it.type === 'movie') {
                  const movie = await getMovieDetails(it.id);
                  await addToWatchlistMutation.mutateAsync({
                    watchlistId: newList.id,
                    item: movie,
                    itemType: 'movie',
                  });
                } else {
                  const show = await getTVShowDetails(it.id);
                  await addToWatchlistMutation.mutateAsync({
                    watchlistId: newList.id,
                    item: show,
                    itemType: 'tv',
                  });
                }
              } catch (e) {}
            }
            importedCount++;
          } catch (e) {}
        }
        setShowImportModal(false);
        setImportCode('');
        setCustomAlert({
          visible: true,
          title: 'Import Complete',
          message: `${importedCount} watchlists imported successfully.`,
        });
        return;
      }

      // Fallback to single watchlist parsing
      const parsed = parseWatchlistCode(code);
      if (!parsed || parsed.items.length === 0) {
        setCustomAlert({
          visible: true,
          title: 'Import',
          message: 'Invalid or empty code.',
        });
        return;
      }

      const newList = await createWatchlistMutation.mutateAsync(
        `${parsed.name}`,
      );
      for (const it of parsed.items) {
        try {
          if (it.type === 'movie') {
            const movie = await getMovieDetails(it.id);
            await addToWatchlistMutation.mutateAsync({
              watchlistId: newList.id,
              item: movie,
              itemType: 'movie',
            });
          } else {
            const show = await getTVShowDetails(it.id);
            await addToWatchlistMutation.mutateAsync({
              watchlistId: newList.id,
              item: show,
              itemType: 'tv',
            });
          }
        } catch (e) {}
      }
      setShowImportModal(false);
      setImportCode('');
      setCustomAlert({
        visible: true,
        title: 'Import Complete',
        message: 'Watchlist imported successfully.',
      });
    } catch (e) {
      setCustomAlert({
        visible: true,
        title: 'Import Failed',
        message: 'Could not import this code.',
      });
    } finally {
      setIsImporting(false);
    }
  }, [importCode, createWatchlistMutation, addToWatchlistMutation, watchlists]);

  const handleReorder = useCallback(
    async (reordered: Watchlist[]) => {
      try {
        await reorderWatchlistsMutation.mutateAsync(reordered.map(w => w.id));
      } catch (e) {
        Alert.alert('Error', 'Failed to reorder watchlists');
      }
    },
    [reorderWatchlistsMutation],
  );

  const handleDeleteAll = useCallback(() => {
    setShowDeleteAllConfirm(true);
  }, []);

  return (
    <View style={{flex: 1}}>
      <LinearGradient
        colors={[
          colors.background.primary,
          colors.background.primary,
          'transparent',
        ]}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 250,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <View style={styles.header}>
        <Text style={styles.title}>My Watchlists</Text>

        <Animated.ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{gap: 8, paddingHorizontal: spacing.md}}
          style={{marginTop: 12}}>
          {watchlists.length > 1 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowReorderModal(true)}>
              <Ionicons
                name="swap-vertical"
                size={16}
                color={colors.text.primary}
              />
              <Text style={styles.actionButtonText}>Reorder</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleExportAll}>
            <Ionicons
              name="share-social-outline"
              size={16}
              color={colors.text.primary}
            />
            <Text style={styles.actionButtonText}>Export All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowImportModal(true)}>
            <Ionicons
              name="download-outline"
              size={16}
              color={colors.text.primary}
            />
            <Text style={styles.actionButtonText}>Import</Text>
          </TouchableOpacity>
        </Animated.ScrollView>
      </View>
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
                onEditPress={handleEditPress}
                onItemPress={handleItemPress}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <View
              style={{
                marginTop:
                  isTablet && orientation === 'landscape' ? '20%' : '60%',
                alignItems: 'center',
              }}>
              <Text style={styles.emptyStateTitle}>No Watchlists Yet</Text>
              <Text style={styles.emptyStateText}>
                Create your first watchlist to start organizing your favorite
                movies and shows
              </Text>
            </View>
          </View>
        )}

        {/* Placeholder to ensure content isn't hidden by FAB */}
        <View style={{height: 100}} />

        {/* Import Watchlist Modal */}
        <Modal
          visible={showImportModal}
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          backdropColor={isSolid ? 'rgba(0, 0, 0, 0.8)' : colors.modal.blurDark}
          onRequestClose={() => setShowImportModal(false)}>
          {!isSolid && (
            <BlurView
              blurType="dark"
              blurAmount={10}
              overlayColor="rgba(0, 0, 0, 0.5)"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          )}
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <View
              style={{
                width: isTablet ? '40%' : '85%',
                borderRadius: borderRadius.xl,
                overflow: 'hidden',
              }}>
              {isSolid ? (
                <LinearGradient
                  colors={[
                    'rgba(111, 111, 111, 0.42)',
                    'rgba(20, 20, 20, 0.7)',
                  ]}
                  start={{x: 1, y: 0}}
                  end={{x: 1, y: 1}}
                  style={{
                    borderRadius: borderRadius.xl,
                  }}>
                  <View
                    style={{
                      padding: spacing.xl,
                      backgroundColor: 'black',
                      borderWidth: 1.5,
                      borderColor: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: borderRadius.xl,
                    }}>
                    <Text
                      style={{
                        ...typography.h2,
                        color: colors.text.primary,
                        marginBottom: spacing.sm,
                        textAlign: 'center',
                      }}>
                      Import Watchlist
                    </Text>
                    <Text
                      style={{
                        ...typography.body2,
                        color: colors.text.secondary,
                        marginBottom: spacing.md,
                      }}>
                      Paste Code
                    </Text>
                    <TextInput
                      style={{
                        ...typography.body1,
                        backgroundColor: colors.modal.content,
                        borderWidth: 1,
                        borderColor: colors.modal.border,
                        borderRadius: borderRadius.md,
                        padding: spacing.md,
                        color: colors.text.primary,
                        height: 100,
                        textAlignVertical: 'top',
                        marginBottom: spacing.xl,
                      }}
                      value={importCode}
                      onChangeText={setImportCode}
                      placeholder="THTR1:..."
                      placeholderTextColor={colors.text.muted}
                      multiline
                    />
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: spacing.md,
                        width: '100%',
                      }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: spacing.md,
                          borderRadius: borderRadius.round,
                          alignItems: 'center',
                          backgroundColor: colors.modal.content,
                        }}
                        onPress={() => setShowImportModal(false)}>
                        <Text
                          style={{
                            color: colors.text.primary,
                            ...typography.button,
                          }}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{flex: 1}}
                        onPress={handleImportSubmit}
                        disabled={isImporting}
                        activeOpacity={0.8}>
                        <LinearGradient
                          colors={[colors.primary, colors.secondary]}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 0}}
                          style={{
                            padding: spacing.md,
                            borderRadius: borderRadius.round,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          {isImporting ? (
                            <ActivityIndicator
                              size="small"
                              color={colors.text.primary}
                            />
                          ) : (
                            <Text
                              style={{
                                color: colors.text.primary,
                                ...typography.button,
                              }}>
                              Import
                            </Text>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <LinearGradient
                    colors={['transparent', 'rgba(0, 0, 0, 0.5)']}
                    style={{
                      position: 'absolute',
                      right: 0,
                      height: isTablet ? '150%' : '100%',
                      width: '180%',
                      transform: [{rotate: isTablet ? '-10deg' : '-20deg'}],
                      left: isTablet ? '-30%' : '-50%',
                      bottom: isTablet ? '-20%' : '-30%',
                      pointerEvents: 'none',
                    }}
                  />
                </LinearGradient>
              ) : (
                <View
                  style={{
                    padding: spacing.xl,
                    backgroundColor: colors.modal.blur,
                    borderRadius: borderRadius.xl,
                    borderTopWidth: 1,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderColor: colors.modal.content,
                  }}>
                  <Text
                    style={{
                      ...typography.h2,
                      color: colors.text.primary,
                      marginBottom: spacing.sm,
                      textAlign: 'center',
                    }}>
                    Import Watchlist
                  </Text>
                  <Text
                    style={{
                      ...typography.body2,
                      color: colors.text.secondary,
                      marginBottom: spacing.md,
                    }}>
                    Paste Code
                  </Text>
                  <TextInput
                    style={{
                      ...typography.body1,
                      backgroundColor: colors.modal.content,
                      borderWidth: 1,
                      borderColor: colors.modal.border,
                      borderRadius: borderRadius.md,
                      padding: spacing.md,
                      color: colors.text.primary,
                      height: 100,
                      textAlignVertical: 'top',
                      marginBottom: spacing.xl,
                    }}
                    value={importCode}
                    onChangeText={setImportCode}
                    placeholder="THTR1:..."
                    placeholderTextColor={colors.text.muted}
                    multiline
                  />
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: spacing.md,
                      width: '100%',
                    }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: spacing.md,
                        borderRadius: borderRadius.round,
                        alignItems: 'center',
                        backgroundColor: colors.modal.content,
                      }}
                      onPress={() => setShowImportModal(false)}>
                      <Text
                        style={{
                          color: colors.text.primary,
                          ...typography.button,
                        }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{flex: 1}}
                      onPress={handleImportSubmit}
                      disabled={isImporting}
                      activeOpacity={0.8}>
                      <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={{
                          padding: spacing.md,
                          borderRadius: borderRadius.round,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        {isImporting ? (
                          <ActivityIndicator
                            size="small"
                            color={colors.text.primary}
                          />
                        ) : (
                          <Text
                            style={{
                              color: colors.text.primary,
                              ...typography.button,
                            }}>
                            Import
                          </Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteConfirm}
          backdropColor={isSolid ? 'rgba(0, 0, 0, 0.8)' : colors.modal.blurDark}
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={() => setShowDeleteConfirm(false)}>
          {!isSolid && (
            <BlurView
              blurType="dark"
              blurAmount={10}
              overlayColor="rgba(0, 0, 0, 0.5)"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          )}
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <View
              style={{
                width: isTablet ? '40%' : '85%',
                borderRadius: borderRadius.xl,
                overflow: 'hidden',
              }}>
              {isSolid ? (
                <LinearGradient
                  colors={[
                    'rgba(111, 111, 111, 0.42)',
                    'rgba(20, 20, 20, 0.7)',
                  ]}
                  start={{x: 1, y: 0}}
                  end={{x: 1, y: 1}}
                  style={{
                    borderRadius: borderRadius.xl,
                  }}>
                  <View
                    style={{
                      padding: spacing.xl,
                      backgroundColor: 'black',
                      borderWidth: 1.5,
                      borderColor: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: borderRadius.xl,
                    }}>
                    <Text
                      style={{
                        ...typography.h2,
                        color: colors.text.primary,
                        marginBottom: spacing.sm,
                        textAlign: 'center',
                      }}>
                      Delete Watchlist?
                    </Text>
                    <Text
                      style={{
                        ...typography.body2,
                        color: colors.text.secondary,
                        textAlign: 'center',
                        marginBottom: spacing.xl,
                      }}>
                      Are you sure you want to delete "
                      {pendingDeleteWatchlist?.name}"? This action cannot be
                      undone.
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: spacing.md,
                        width: '100%',
                      }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          padding: spacing.md,
                          borderRadius: borderRadius.round,
                          alignItems: 'center',
                          backgroundColor: colors.modal.content,
                        }}
                        onPress={() => {
                          setShowDeleteConfirm(false);
                          setPendingDeleteWatchlist(null);
                        }}>
                        <Text
                          style={{
                            color: colors.text.primary,
                            ...typography.button,
                          }}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          padding: spacing.md,
                          borderRadius: borderRadius.round,
                          alignItems: 'center',
                          backgroundColor: '#ef4444',
                        }}
                        onPress={confirmDelete}>
                        <Text
                          style={{
                            color: colors.text.primary,
                            ...typography.button,
                          }}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <LinearGradient
                    colors={['transparent', 'rgba(0, 0, 0, 0.5)']}
                    style={{
                      position: 'absolute',
                      right: 0,
                      height: isTablet ? '150%' : '100%',
                      width: '180%',
                      transform: [{rotate: isTablet ? '-10deg' : '-20deg'}],
                      left: isTablet ? '-30%' : '-50%',
                      bottom: isTablet ? '-20%' : '-30%',
                      pointerEvents: 'none',
                    }}
                  />
                </LinearGradient>
              ) : (
                <View
                  style={{
                    padding: spacing.xl,
                    backgroundColor: colors.modal.blur,
                    borderRadius: borderRadius.xl,
                    borderTopWidth: 1,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderColor: colors.modal.content,
                  }}>
                  <Text
                    style={{
                      ...typography.h2,
                      color: colors.text.primary,
                      marginBottom: spacing.sm,
                    }}>
                    Delete Watchlist?
                  </Text>
                  <Text
                    style={{
                      ...typography.body2,
                      color: colors.text.secondary,
                      textAlign: 'center',
                      marginBottom: spacing.xl,
                    }}>
                    Are you sure you want to delete "
                    {pendingDeleteWatchlist?.name}"? This action cannot be
                    undone.
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: spacing.md,
                      width: '100%',
                    }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        padding: spacing.md,
                        borderRadius: borderRadius.round,
                        alignItems: 'center',
                        backgroundColor: colors.modal.content,
                      }}
                      onPress={() => {
                        setShowDeleteConfirm(false);
                        setPendingDeleteWatchlist(null);
                      }}>
                      <Text
                        style={{
                          color: colors.text.primary,
                          ...typography.button,
                        }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        padding: spacing.md,
                        borderRadius: borderRadius.round,
                        alignItems: 'center',
                        backgroundColor: '#ef4444',
                      }}
                      onPress={confirmDelete}>
                      <Text
                        style={{
                          color: colors.text.primary,
                          ...typography.button,
                        }}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Edit Watchlist Modal */}
        <Modal
          visible={showEditModal}
          backdropColor={isSolid ? 'rgba(0, 0, 0, 0.8)' : colors.modal.blurDark}
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={() => setShowEditModal(false)}>
          {!isSolid && (
            <BlurView
              blurType="dark"
              blurAmount={10}
              overlayColor="rgba(0, 0, 0, 0.5)"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          )}
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <View
              style={{
                width: isTablet ? '40%' : '85%',
                borderRadius: borderRadius.xl,
                overflow: 'hidden',
              }}>
              {isSolid ? (
                <LinearGradient
                  colors={[
                    'rgba(111, 111, 111, 0.42)',
                    'rgba(20, 20, 20, 0.7)',
                  ]}
                  start={{x: 1, y: 0}}
                  end={{x: 1, y: 1}}
                  style={{
                    borderRadius: borderRadius.xl,
                  }}>
                  <View
                    style={{
                      padding: spacing.xl,
                      backgroundColor: 'black',
                      borderWidth: 1.5,
                      borderColor: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: borderRadius.xl,
                    }}>
                    <Text
                      style={{
                        ...typography.h2,
                        color: colors.text.primary,
                        marginBottom: spacing.md,
                        textAlign: 'center',
                      }}>
                      Edit Watchlist
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: colors.background.tertiary,
                        color: colors.text.primary,
                        padding: spacing.md,
                        borderRadius: borderRadius.md,
                        marginBottom: spacing.md,
                        borderWidth: 1,
                        borderColor: colors.modal.border,
                        ...typography.body1,
                      }}
                      placeholder="Watchlist Name"
                      placeholderTextColor={colors.text.muted}
                      value={editName}
                      onChangeText={setEditName}
                      autoFocus
                    />
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-end',
                        gap: spacing.md,
                      }}>
                      <TouchableOpacity onPress={() => setShowEditModal(false)}>
                        <Text
                          style={{
                            ...typography.button,
                            color: colors.text.secondary,
                          }}>
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleUpdateWatchlist}>
                        <Text
                          style={{...typography.button, color: colors.primary}}>
                          Save
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <LinearGradient
                    colors={['transparent', 'rgba(0, 0, 0, 0.5)']}
                    style={{
                      position: 'absolute',
                      right: 0,
                      height: isTablet ? '150%' : '100%',
                      width: '180%',
                      transform: [{rotate: isTablet ? '-10deg' : '-20deg'}],
                      left: isTablet ? '-30%' : '-50%',
                      bottom: isTablet ? '-20%' : '-30%',
                      pointerEvents: 'none',
                    }}
                  />
                </LinearGradient>
              ) : (
                <View
                  style={{
                    padding: spacing.xl,
                    backgroundColor: colors.modal.blur,
                    borderRadius: borderRadius.xl,
                    borderTopWidth: 1,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderColor: colors.modal.content,
                  }}>
                  <Text
                    style={{
                      ...typography.h2,
                      color: colors.text.primary,
                      marginBottom: spacing.md,
                    }}>
                    Edit Watchlist
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: colors.background.tertiary,
                      color: colors.text.primary,
                      padding: spacing.md,
                      borderRadius: borderRadius.md,
                      marginBottom: spacing.md,
                      borderWidth: 1,
                      borderColor: colors.modal.border,
                      ...typography.body1,
                    }}
                    placeholder="Watchlist Name"
                    placeholderTextColor={colors.text.muted}
                    value={editName}
                    onChangeText={setEditName}
                    autoFocus
                  />
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'flex-end',
                      gap: spacing.md,
                    }}>
                    <TouchableOpacity onPress={() => setShowEditModal(false)}>
                      <Text
                        style={{
                          ...typography.button,
                          color: colors.text.secondary,
                        }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleUpdateWatchlist}>
                      <Text
                        style={{
                          ...typography.button,
                          color: colors.text.primary,
                        }}>
                        Save
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </Animated.ScrollView>
      {/* Delete All Confirm Modal */}
      <Modal
        visible={showDeleteAllConfirm}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowDeleteAllConfirm(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: isSolid ? 'rgba(0,0,0,0.5)' : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {!isSolid && (
            <BlurView
              blurType="dark"
              blurAmount={10}
              overlayColor={colors.modal.blurDark}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View
            style={{
              width: isTablet ? '40%' : '85%',
              padding: spacing.xl,
              backgroundColor: colors.modal.blur,
              borderRadius: borderRadius.xl,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: colors.modal.content,
            }}>
            <Text
              style={{
                ...typography.h2,
                color: colors.text.primary,
                marginBottom: spacing.sm,
                textAlign: 'center',
              }}>
              Delete All Watchlists?
            </Text>
            <Text
              style={{
                ...typography.body2,
                color: colors.text.secondary,
                textAlign: 'center',
                marginBottom: spacing.xl,
              }}>
              Are you sure you want to delete ALL watchlists? This action cannot
              be undone.
            </Text>
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.md,
                width: '100%',
              }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: spacing.md,
                  borderRadius: borderRadius.round,
                  alignItems: 'center',
                  backgroundColor: colors.modal.content,
                }}
                onPress={() => setShowDeleteAllConfirm(false)}>
                <Text
                  style={{
                    color: colors.text.primary,
                    ...typography.button,
                  }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: spacing.md,
                  borderRadius: borderRadius.round,
                  alignItems: 'center',
                  backgroundColor: '#ef4444',
                }}
                onPress={async () => {
                  try {
                    await deleteAllWatchlistsMutation.mutateAsync();
                    setShowDeleteAllConfirm(false);
                  } catch (e) {
                    setCustomAlert({
                      visible: true,
                      title: 'Error',
                      message: 'Failed to delete watchlists',
                    });
                  }
                }}>
                <Text
                  style={{
                    color: colors.text.primary,
                    ...typography.button,
                  }}>
                  Delete All
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Modal */}
      <Modal
        visible={!!exportCode}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setExportCode(null)}>
        <View
          style={{
            flex: 1,
            backgroundColor: isSolid ? 'rgba(0,0,0,0.5)' : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {!isSolid && (
            <BlurView
              blurType="dark"
              blurAmount={10}
              overlayColor={colors.modal.blurDark}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View
            style={{
              width: isTablet ? '40%' : '85%',
              padding: spacing.xl,
              backgroundColor: colors.modal.blur,
              borderRadius: borderRadius.xl,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: colors.modal.content,
            }}>
            <Text
              style={{
                ...typography.h2,
                color: colors.text.primary,
                marginBottom: spacing.sm,
                textAlign: 'center',
              }}>
              Export All Watchlists
            </Text>
            <Text
              style={{
                ...typography.body2,
                color: colors.text.secondary,
                textAlign: 'center',
                marginBottom: spacing.xl,
              }}>
              Choose an action for your export code.
            </Text>
            <View style={{gap: spacing.md}}>
              <TouchableOpacity
                style={{
                  width: '100%',
                  padding: spacing.md,
                  borderRadius: borderRadius.round,
                  alignItems: 'center',
                  backgroundColor: colors.modal.content,
                }}
                onPress={() => {
                  if (exportCode) {
                    Clipboard.setString(exportCode);
                    setExportCode(null);
                    setCustomAlert({
                      visible: true,
                      title: 'Copied',
                      message: 'Export code copied to clipboard.',
                    });
                  }
                }}>
                <Text
                  style={{
                    color: colors.text.primary,
                    ...typography.button,
                  }}>
                  Copy Code
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  width: '100%',
                  padding: spacing.md,
                  borderRadius: borderRadius.round,
                  alignItems: 'center',
                  backgroundColor: colors.text.primary,
                }}
                onPress={async () => {
                  if (exportCode) {
                    try {
                      await ShareLib.open({
                        title: 'My Watchlists',
                        message: exportCode,
                      });
                      setExportCode(null);
                    } catch (e) {
                      // Ignore
                    }
                  }
                }}>
                <Text
                  style={{
                    color: colors.background.primary,
                    ...typography.button,
                  }}>
                  Share
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  width: '100%',
                  padding: spacing.md,
                  borderRadius: borderRadius.round,
                  alignItems: 'center',
                }}
                onPress={() => setExportCode(null)}>
                <Text
                  style={{
                    color: colors.text.secondary,
                    ...typography.button,
                  }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        visible={customAlert.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() =>
          setCustomAlert(prev => ({...prev, visible: false}))
        }>
        <View
          style={{
            flex: 1,
            backgroundColor: isSolid ? 'rgba(0,0,0,0.5)' : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {!isSolid && (
            <BlurView
              blurType="dark"
              blurAmount={10}
              overlayColor={colors.modal.blurDark}
              style={StyleSheet.absoluteFill}
            />
          )}
          <View
            style={{
              width: isTablet ? '40%' : '85%',
              padding: spacing.xl,
              backgroundColor: colors.modal.blur,
              borderRadius: borderRadius.xl,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: colors.modal.content,
            }}>
            <Text
              style={{
                ...typography.h2,
                color: colors.text.primary,
                marginBottom: spacing.sm,
                textAlign: 'center',
              }}>
              {customAlert.title}
            </Text>
            <Text
              style={{
                ...typography.body2,
                color: colors.text.secondary,
                textAlign: 'center',
                marginBottom: spacing.xl,
              }}>
              {customAlert.message}
            </Text>
            <TouchableOpacity
              style={{
                width: '100%',
                padding: spacing.md,
                borderRadius: borderRadius.round,
                alignItems: 'center',
                backgroundColor: colors.modal.content,
              }}
              onPress={() =>
                setCustomAlert(prev => ({...prev, visible: false}))
              }>
              <Text
                style={{
                  color: colors.text.primary,
                  ...typography.button,
                }}>
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reorder Modal */}
      {showReorderModal && (
        <ReorderWatchlistsDialog
          visible={showReorderModal}
          onClose={() => setShowReorderModal(false)}
          watchlists={watchlists}
          onReorder={handleReorder}
        />
      )}
    </View>
  );
};
