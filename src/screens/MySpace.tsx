import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {useUserContent} from '../hooks/useUserContent';
import {MovieList, ContentItem} from '../components/MovieList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {LanguageSettings} from '../components/LanguageSettings';
import {SettingsManager, Language} from '../store/settings';
import {useQueryClient, useQuery} from '@tanstack/react-query';
import {BlurView} from '@react-native-community/blur';
import {MovieCard} from '../components/MovieCard';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {HorizontalListSkeleton} from '../components/LoadingSkeleton';
import {ContentCard} from '../components/ContentCard';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

type MySpaceScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

export const MySpaceScreen = () => {
  const navigation = useNavigation<MySpaceScreenNavigationProp>();
  const queryClient = useQueryClient();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const {content: watchlist, isLoading} = useUserContent('WATCHLIST');
  const {data: selectedLanguages = [], isLoading: isLoadingLanguages} =
    useQuery<Language[]>({
      queryKey: ['selectedLanguages'],
      queryFn: SettingsManager.getContentLanguages,
      initialData: [],
    });

  useEffect(() => {
    // Listen for language changes and invalidate queries to refetch data
    const handleLanguageChange = () => {
      // Invalidate all queries to refetch with new language settings
      queryClient.invalidateQueries();
    };

    SettingsManager.addChangeListener(handleLanguageChange);

    return () => {
      SettingsManager.removeChangeListener(handleLanguageChange);
    };
  }, [queryClient]);

  const handleMoviePress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigation.navigate('MovieDetails', {
          movie: item as Movie,
        });
      } else {
        navigation.navigate('TVShowDetails', {
          show: item as TVShow,
        });
      }
    },
    [navigation],
  );

  const renderLanguageItem = ({item}: {item: Language}) => (
    <View style={styles.languageTag}>
      <Text style={styles.languageText}>{item.english_name}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>Watchlist</Text>
        <Ionicons
          name="chevron-forward"
          size={24}
          color={colors.text.primary}
        />
      </View>

      {isLoading ? (
        <View style={{paddingBottom: spacing.md}}>
          <HorizontalListSkeleton />
        </View>
      ) : (
        watchlist.length > 0 && (
          <View style={styles.watchlistContainer}>
            <FlatList
              data={watchlist}
              renderItem={({item}) => (
                <ContentCard item={item} onPress={handleMoviePress} />
              )}
              keyExtractor={item => `${item.id}-${item.type}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              horizontal={true}
            />
          </View>
        )
      )}

      <View>
        <TouchableOpacity
          style={styles.headerContainer}
          onPress={() => setShowLanguageModal(true)}>
          <Text style={styles.sectionTitle}>Language</Text>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.text.primary}
          />
        </TouchableOpacity>

        {isLoadingLanguages ? (
          <View style={styles.languagesContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : selectedLanguages.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.languagesContainer}
            contentContainerStyle={styles.languagesContent}>
            {selectedLanguages.map(lang => (
              <View key={lang.iso_639_1} style={styles.languageTag}>
                <Text style={styles.languageText}>{lang.english_name}</Text>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>Region</Text>
        <Ionicons
          name="chevron-forward"
          size={24}
          color={colors.text.primary}
        />
      </View>

      <View style={styles.headerContainer}>
        <Text style={styles.sectionTitle}>My Filters</Text>
        <Ionicons
          name="chevron-forward"
          size={24}
          color={colors.text.primary}
        />
      </View>

      <Modal
        visible={showLanguageModal}
        animationType="slide"
        statusBarTranslucent={true}
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <BlurView
              style={styles.blurView}
              blurType="dark"
              blurAmount={10}
              overlayColor="rgba(23, 17, 42, 0.87)"
              reducedTransparencyFallbackColor="rgba(0, 0, 0, 0.5)"
            />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Language Settings</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <LanguageSettings />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingVertical: spacing.xxl,
    height: '100%',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text.primary,
    ...typography.h3,
  },
  watchlistContainer: {
    paddingBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 1, 3, 0.28)',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    height: '90%',
    // borderWidth: 1,
    // borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  modalTitle: {
    color: colors.text.primary,
    ...typography.h3,
  },
  modalBody: {
    flex: 1,
  },
  languagesContainer: {
    marginTop: -spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  languagesContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  languageTag: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.lg,
    // borderWidth: 1,
    // borderColor: colors.primary,
  },
  languageText: {
    color: colors.text.primary,
    ...typography.body2,
  },
});
