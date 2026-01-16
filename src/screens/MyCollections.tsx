import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Clipboard,
  Animated,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import ShareLib from 'react-native-share';
import {BlurView} from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {CollectionsManager, SavedCollection} from '../store/collections';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {HomeStackParamList} from '../types/navigation';
import {modalStyles} from '../styles/styles';
import {useNavigationState} from '../hooks/useNavigationState';
import LinearGradient from 'react-native-linear-gradient';
import {useResponsive} from '../hooks/useResponsive';
import {
  generateAllCollectionsCode,
  parseAllCollectionsCode,
  parseCollectionCode,
} from '../utils/shareCode';
import {getCollectionDetails} from '../services/tmdb';
import {BlurPreference} from '../store/blurPreference';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';

type MyCollectionsScreenNavigationProp =
  NativeStackNavigationProp<HomeStackParamList>;

export const MyCollectionsScreen = () => {
  const navigation = useNavigation<MyCollectionsScreenNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const queryClient = useQueryClient();
  const {isTablet} = useResponsive();
  const {width} = useWindowDimensions();

  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  const [scrollY] = useState(new Animated.Value(0));
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Custom dialog states
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [exportCode, setExportCode] = useState<string | null>(null);
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({visible: false, title: '', message: ''});

  const {data: collections = [], isLoading} = useQuery({
    queryKey: ['savedCollections'],
    queryFn: CollectionsManager.getSavedCollections,
  });

  const createCollectionMutation = useMutation({
    mutationFn: CollectionsManager.saveCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['savedCollections']});
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: CollectionsManager.deleteCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['savedCollections']});
    },
  });

  const deleteAllCollectionsMutation = useMutation({
    mutationFn: CollectionsManager.deleteAllCollections,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['savedCollections']});
    },
  });

  const handleExportAll = useCallback(async () => {
    try {
      const data = await CollectionsManager.getAllCollectionsExportData();
      if (data.length === 0) {
        setCustomAlert({
          visible: true,
          title: 'Export',
          message: 'No collections to export.',
        });
        return;
      }
      const code = generateAllCollectionsCode(data);
      setExportCode(code);
    } catch (e) {
      setCustomAlert({
        visible: true,
        title: 'Export Failed',
        message: 'Could not export collections.',
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
      let importedCount = 0;

      // Try bulk parsing first
      const bulkIds = parseAllCollectionsCode(code);
      if (bulkIds && bulkIds.length > 0) {
        for (const id of bulkIds) {
          try {
            // Check if already exists to avoid unnecessary fetch?
            // The user might want to update, but usually collections are static.
            // Let's just fetch and save.
            const details = await getCollectionDetails(id);
            if (details) {
              await createCollectionMutation.mutateAsync(details);
              importedCount++;
            }
          } catch (e) {}
        }
      } else {
        // Fallback to single collection parsing
        const singleId = parseCollectionCode(code);
        if (singleId) {
          const details = await getCollectionDetails(singleId);
          if (details) {
            await createCollectionMutation.mutateAsync(details);
            importedCount++;
          }
        }
      }

      if (importedCount > 0) {
        setShowImportModal(false);
        setImportCode('');
        setCustomAlert({
          visible: true,
          title: 'Import Complete',
          message: `${importedCount} collection(s) imported successfully.`,
        });
      } else {
        setCustomAlert({
          visible: true,
          title: 'Import Failed',
          message: 'Invalid code or no collections could be found.',
        });
      }
    } catch (e) {
      setCustomAlert({
        visible: true,
        title: 'Import Failed',
        message: 'Could not import this code.',
      });
    } finally {
      setIsImporting(false);
    }
  }, [importCode, createCollectionMutation]);

  const handleDeleteAll = useCallback(() => {
    setShowDeleteAllConfirm(true);
  }, []);

  const getImageUrl = (path: string | null) => {
    if (!path) return '';
    return `https://image.tmdb.org/t/p/w500${path}`;
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [60, 20],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    header: {},
    title: {
      textAlign: 'left',
      color: colors.text.primary,
      ...typography.h2,
      paddingHorizontal: spacing.md,
    },
    actionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isSolid ? colors.modal.blurSolid : colors.modal.blur,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderBottomWidth: isSolid ? 1 : 0,
      borderColor: isSolid ? colors.modal.contentSolid : colors.modal.header,
      opacity: 0.8,
      gap: 8,
    },
    actionButtonText: {
      color: colors.text.primary,
      ...typography.button,
      fontSize: isTablet ? 14 : 10,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: 200,
      paddingBottom: 150,
    },
    // Card styles from MyCollectionsList
    card: {
      backgroundColor: colors.modal.blur,
      borderRadius: isTablet ? 50 : 30,
      overflow: 'hidden',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.content,
      marginBottom: spacing.md,
    },
    imageContainer: {
      height: isTablet ? 280 : 200,
      width: '100%',
    },
    image: {
      width: '100%',
      height: '100%',
    },
    deleteButton: {
      backgroundColor: colors.modal.blur,
      borderRadius: borderRadius.round,
      padding: spacing.md,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.content,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    cardContent: {
      padding: spacing.md,
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    cardTitle: {
      ...typography.h3,
      fontSize: isTablet ? 20 : 14,
      color: colors.text.primary,
    },
    cardSubtitle: {
      ...typography.caption,
      color: colors.text.secondary,
      fontSize: isTablet ? 12 : 10,
    },
    emptyContainer: {
      height: 400,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyTitle: {
      ...typography.h3,
      color: colors.text.secondary,
    },
    emptySubtitle: {
      ...typography.body2,
      color: colors.text.muted,
      textAlign: 'center',
      maxWidth: isTablet ? 400 : 300,
      marginTop: spacing.xs,
    },
  });

  return (
    <View style={{flex: 1, backgroundColor: colors.background.primary}}>
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
      <View
        style={{position: 'absolute', top: 60, left: 0, right: 0, zIndex: 2}}>
        <View style={styles.header}>
          <Text style={styles.title}>My Collections</Text>
          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{gap: 8, paddingHorizontal: spacing.md}}
            style={{marginTop: 12}}>
            {collections.length > 0 && (
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
            )}

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
      </View>

      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: false},
        )}>
        {isLoading ? (
          <View style={{padding: 100}}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : collections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Image
              source={require('../assets/collectionsEmpty.png')}
              style={{
                width: isTablet ? width / 3 : width / 2,
                height: isTablet ? width / 3 : width / 2,
              }}
            />
            <Text style={styles.emptyTitle}>No Collections</Text>
            <Text style={styles.emptySubtitle}>
              You haven't saved any collections yet.
            </Text>
          </View>
        ) : (
          collections.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() =>
                navigation.push('Collection', {collectionId: Number(item.id)})
              }
              activeOpacity={0.9}>
              <View style={styles.imageContainer}>
                <Image
                  source={{
                    uri: getImageUrl(item.backdrop_path || item.poster_path),
                  }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', colors.background.primary]}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  useAngle
                  angle={90}
                  colors={[colors.background.primary, 'transparent']}
                  style={StyleSheet.absoluteFill}
                />

                {/* Content Overlay */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    position: 'absolute',
                    left: isTablet ? 20 : 15,
                    top: isTablet ? 20 : 15,
                  }}>
                  <View
                    style={{
                      borderWidth: 1,
                      borderBottomWidth: 0,
                      borderColor: colors.modal.header,
                      borderRadius: borderRadius.lg,
                    }}>
                    <Image
                      source={{
                        uri: getImageUrl(item.poster_path),
                      }}
                      style={{
                        width: isTablet ? 190 : 110,
                        height: isTablet ? 240 : 165,
                        borderRadius: isTablet
                          ? borderRadius.xl
                          : borderRadius.lg,
                      }}
                      resizeMode="cover"
                    />
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.name.replace(/collection/gi, '').trim()}
                    </Text>
                    <Text style={styles.cardSubtitle}>
                      {item.parts.length}{' '}
                      {item.parts.length === 1 ? 'Movie' : 'Movies'}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        deleteCollectionMutation.mutate(item.id);
                      }}>
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.text.primary}
                      />
                      <Text
                        style={{
                          ...typography.body2,
                          color: colors.text.primary,
                        }}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </Animated.ScrollView>

      {/* Import Modal */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowImportModal(false)}>
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
                marginBottom: spacing.md,
                textAlign: 'center',
              }}>
              Import Collections
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
              placeholder="Paste code (e.g. THTRC:...)"
              placeholderTextColor={colors.text.muted}
              value={importCode}
              onChangeText={setImportCode}
              multiline
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: spacing.md,
              }}>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <Text
                  style={{
                    ...typography.button,
                    color: colors.text.secondary,
                  }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleImportSubmit}
                disabled={isImporting}>
                <Text
                  style={{
                    ...typography.button,
                    color: isImporting ? colors.text.muted : colors.primary,
                  }}>
                  {isImporting ? 'Importing...' : 'Import'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              Delete All Collections?
            </Text>
            <Text
              style={{
                ...typography.body2,
                color: colors.text.secondary,
                textAlign: 'center',
                marginBottom: spacing.xl,
              }}>
              Are you sure you want to delete ALL collections? This action
              cannot be undone.
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
                    await deleteAllCollectionsMutation.mutateAsync();
                    setShowDeleteAllConfirm(false);
                  } catch (e) {
                    setCustomAlert({
                      visible: true,
                      title: 'Error',
                      message: 'Failed to delete collections',
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
              Export All Collections
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
                  backgroundColor: colors.primary,
                }}
                onPress={async () => {
                  if (exportCode) {
                    try {
                      await ShareLib.open({
                        title: 'My Collections',
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
                    color: 'white',
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
    </View>
  );
};
