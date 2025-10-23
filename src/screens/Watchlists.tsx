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
import {useResponsive} from '../hooks/useResponsive';
import {generateWatchlistCode, parseWatchlistCode} from '../utils/shareCode';
import {getMovieDetails, getTVShowDetails} from '../services/tmdbWithCache';
import {requestPosterCapture} from '../components/PosterCaptureHost';
import {MaybeBlurView} from '../components/MaybeBlurView';
import {BlurPreference} from '../store/blurPreference';

type WatchlistsScreenNavigationProp =
  NativeStackNavigationProp<MySpaceStackParamList>;

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

  const {data: watchlists = [], isLoading} = useWatchlists();
  const createWatchlistMutation = useCreateWatchlist();
  const deleteWatchlistMutation = useDeleteWatchlist();
  const addToWatchlistMutation = useAddToWatchlist();
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
    setPendingDeleteWatchlist({id: watchlistId, name: watchlistName});
    setShowDeleteConfirm(true);
  };

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

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setNewWatchlistName('');
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
      borderRadius: borderRadius.round,
      marginHorizontal: spacing.md,
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
      marginTop: isTablet && orientation === 'landscape' ? '20%' : '60%',
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
      height: isTablet ? 400 : 300,
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
      backgroundColor: colors.modal.active,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      position: 'relative',
    },
    importModalContent: {
      width: '92%',
      backgroundColor: colors.modal.active,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      paddingBottom: spacing.md,
    },
  });

  const handleImportSubmit = useCallback(async () => {
    if (!importCode.trim()) {
      Alert.alert('Import', 'Please paste a valid code.');
      return;
    }
    const parsed = parseWatchlistCode(importCode.trim());
    if (!parsed || parsed.items.length === 0) {
      Alert.alert('Import', 'Invalid or empty code.');
      return;
    }
    try {
      setIsImporting(true);
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
        } catch (e) {
          console.warn('Failed to import item', it, e);
        }
      }
      setShowImportModal(false);
      setImportCode('');
      Alert.alert('Import Complete', 'Watchlist imported successfully.');
    } catch (e) {
      Alert.alert('Import Failed', 'Could not import this code.');
    } finally {
      setIsImporting(false);
    }
  }, [importCode, createWatchlistMutation]);

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
    const [isSharingStory, setIsSharingStory] = React.useState(false);
    const [showStoryModal, setShowStoryModal] = React.useState(false);
    const [storyUri, setStoryUri] = React.useState<string | null>(null);
    const [storyLoading, setStoryLoading] = React.useState(false);
    const [posterReady] = React.useState(false);

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

    // Generate import/share code for THIS watchlist (do NOT use the top-level importCode state)
    const shareCode = React.useMemo(
      () =>
        generateWatchlistCode(
          watchlistName,
          contentItems.map(ci => ({id: ci.id, type: ci.type})),
        ),
      [watchlistName, contentItems],
    );

    // Calculate content type distribution
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
        console.warn('Create story failed', e);
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
      } catch (e) {
        console.warn('Share sheet error', e);
      }
    }, [storyUri]);

    return (
      <View style={{marginBottom: spacing.xl, position: 'relative'}}>
        <View style={styles.watchlistItem}>
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
              // paddingHorizontal: 10,
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
                  onPress={handleOpenStoryModal}
                  disabled={isSharingStory}>
                  <Ionicons
                    name="share-social-outline"
                    size={16}
                    color={colors.text.muted}
                  />
                </TouchableOpacity>
                {/* <TouchableOpacity
                  style={{alignItems: 'center', padding: 5, marginRight: 6}}
                  activeOpacity={0.9}
                  onPress={handleShare}>
                  <Ionicons
                    name="share-outline"
                    size={16}
                    color={colors.text.muted}
                  />
                </TouchableOpacity> */}
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
          {/* No inline ViewShot; capture handled by PosterCaptureHost */}
        </View>

        {/* Story Preview Modal */}
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
  };

  return (
    <View style={{flex: 1}}>
      <LinearGradient
        colors={[colors.background.primary, 'transparent']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 150,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <View style={styles.header}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
          }}>
          <TouchableOpacity
            style={{
              backgroundColor: isSolid
                ? colors.modal.blur
                : 'rgba(122, 122, 122, 0.25)',
              padding: isTablet ? 12 : 10,
              borderRadius: borderRadius.round,
              borderColor: colors.modal.blur,
              borderWidth: 1,
            }}
            onPress={() => navigation.goBack()}>
            <Ionicons
              name="chevron-back-outline"
              size={isTablet ? 20 : 16}
              color={colors.text.primary}
            />
          </TouchableOpacity>
          <Text style={styles.title}>Watchlists</Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity
              style={{
                backgroundColor: isSolid
                  ? colors.modal.blur
                  : 'rgba(122, 122, 122, 0.25)',
                padding: isTablet ? 12 : 10,
                borderRadius: borderRadius.round,
                borderColor: colors.modal.blur,
                borderWidth: 1,
              }}
              onPress={() => setShowImportModal(true)}>
              <Ionicons
                name="download-outline"
                size={isTablet ? 20 : 16}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
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
          </View>
        )}

        {/* Import Watchlist Modal */}
        <Modal
          visible={showImportModal}
          animationType="slide"
          statusBarTranslucent={true}
          backdropColor={colors.modal.blurDark}
          onRequestClose={() => setShowImportModal(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.importModalContent}>
              <MaybeBlurView
                style={StyleSheet.absoluteFill}
                blurType="dark"
                blurAmount={10}
                overlayColor={colors.modal.blurDark}
                radius={20}
                dialog
              />
              <View style={modalStyles.modalHeader}>
                <Text style={modalStyles.modalTitle}>Import Watchlist</Text>
                <TouchableOpacity onPress={() => setShowImportModal(false)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </View>
              <View style={{padding: spacing.md}}>
                <Text style={modalStyles.sectionTitle}>Paste Code</Text>
                <TextInput
                  style={[
                    modalStyles.input,
                    {height: 100, marginTop: spacing.sm},
                  ]}
                  value={importCode}
                  onChangeText={setImportCode}
                  placeholder="THTR1:..."
                  placeholderTextColor={colors.text.muted}
                  multiline
                />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginTop: spacing.md,
                    gap: spacing.md,
                    width: isTablet ? '50%' : '100%',
                  }}>
                  <TouchableOpacity
                    style={[modalStyles.footerButton, modalStyles.resetButton]}
                    onPress={() => setShowImportModal(false)}>
                    <Text style={modalStyles.resetButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[modalStyles.footerButton, modalStyles.applyButton]}
                    onPress={handleImportSubmit}
                    disabled={isImporting}>
                    <Text style={modalStyles.applyButtonText}>
                      {isImporting ? 'Importing...' : 'Import'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          visible={showDeleteConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteConfirm(false)}>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
            }}>
            <View
              style={{
                width: isTablet ? '40%' : '85%',
                borderRadius: borderRadius.xl,
                overflow: 'hidden',
              }}>
              {isSolid ? (
                <View
                  style={{
                    padding: spacing.xl,
                    backgroundColor: colors.modal.blur,
                    borderRadius: borderRadius.xl,
                  }}>
                  <View style={{alignItems: 'center'}}>
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
                </View>
              ) : (
                <MaybeBlurView
                  dialog
                  radius={borderRadius.xl}
                  style={{
                    padding: spacing.xl,
                    borderRadius: borderRadius.xl,
                  }}>
                  <View style={{alignItems: 'center'}}>
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
                </MaybeBlurView>
              )}
            </View>
          </View>
        </Modal>
      </Animated.ScrollView>
    </View>
  );
};
