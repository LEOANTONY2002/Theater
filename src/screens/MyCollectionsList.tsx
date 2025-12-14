import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {CollectionsManager, SavedCollection} from '../store/collections';
import {HomeStackParamList} from '../types/navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import {LinearGradient} from 'react-native-linear-gradient';
import {useQueryClient} from '@tanstack/react-query';
import {useResponsive} from '../hooks/useResponsive';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

interface MyCollectionsListProps {
  contentContainerStyle?: any;
}

export const MyCollectionsList = ({
  contentContainerStyle,
}: MyCollectionsListProps) => {
  const navigation = useNavigation<NavigationProp>();
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const {isTablet} = useResponsive();
  const {width, height} = useWindowDimensions();

  useEffect(() => {
    loadCollections();
  }, []);

  // Simple way to refresh when focused, but for now we'll rely on local state updates if possible
  // Ideally, useFocusEffect or a store subscription would be better.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCollections();
    });
    return unsubscribe;
  }, [navigation]);

  // React Query hook
  const queryClient = useQueryClient();

  const loadCollections = async () => {
    setLoading(true);
    const saved = await CollectionsManager.getSavedCollections();
    setCollections(saved);
    setLoading(false);
  };

  const handleDelete = async (id: string, event: any) => {
    // Stop propagation is tricky in RN, just make sure delete button is distinct
    await CollectionsManager.deleteCollection(id);
    await queryClient.invalidateQueries({queryKey: ['savedCollections']});
    loadCollections();
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return '';
    return `https://image.tmdb.org/t/p/w500${path}`;
  };

  const styles = StyleSheet.create({
    listContent: {
      paddingHorizontal: isTablet ? spacing.md : spacing.sm,
      gap: isTablet ? spacing.md : spacing.sm,
    },
    card: {
      backgroundColor: colors.background.secondary,
      borderRadius: isTablet ? 50 : 30,
      overflow: 'hidden',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.header,
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
    content: {
      padding: spacing.md,
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    title: {
      ...typography.h3,
      fontSize: isTablet ? 20 : 14,
      color: colors.text.primary,
    },
    subtitle: {
      ...typography.caption,
      color: colors.text.secondary,
      fontSize: isTablet ? 12 : 10,
    },
    emptyContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
      minHeight: 300,
    },
    emptyTitle: {
      ...typography.h3,
      color: colors.text.primary,
      marginTop: spacing.md,
      marginBottom: spacing.xs,
    },
    emptySubtitle: {
      ...typography.body2,
      color: colors.text.muted,
      textAlign: 'center',
      maxWidth: 250,
    },
  });

  const renderItem = ({item}: {item: SavedCollection}) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.push('Collection', {collectionId: Number(item.id)})
        }
        activeOpacity={0.9}>
        {/* Backdrop Image */}
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

          {/* Content */}
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
                  borderRadius: isTablet ? borderRadius.xl : borderRadius.lg,
                }}
                resizeMode="cover"
              />
            </View>

            <View style={styles.content}>
              <Text style={styles.title} numberOfLines={1}>
                {item.name.replace(/collection/gi, '').trim()}
              </Text>
              <Text style={styles.subtitle}>
                {item.parts.length}{' '}
                {item.parts.length === 1 ? 'Movie' : 'Movies'}
              </Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id, null)}>
                <Icon
                  name="trash-outline"
                  size={18}
                  color={colors.text.primary}
                />
                <Text style={{...typography.body2, color: colors.text.primary}}>
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!loading && collections.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Collections Saved</Text>
        <Text style={styles.emptySubtitle}>
          Save your favorite movie collections to access them quickly.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={collections}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    />
  );
};
