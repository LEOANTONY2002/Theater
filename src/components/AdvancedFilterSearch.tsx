import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {BlurPreference} from '../store/blurPreference';

interface SearchItem {
  id: number;
  name: string;
  profile_path?: string;
  logo_path?: string;
  known_for_department?: string;
  known_for?: Array<{title?: string; name?: string}>; // Movies/TV shows they're known for
  popularity?: number;
}

interface AdvancedFilterSearchProps {
  title: string;
  placeholder: string;
  selectedItems: SearchItem[];
  onItemsChange: (items: SearchItem[]) => void;
  searchFunction: (query: string) => Promise<{results: SearchItem[]}>;
  icon?: string;
}

export const AdvancedFilterSearch: React.FC<AdvancedFilterSearchProps> = ({
  title,
  placeholder,
  selectedItems,
  onItemsChange,
  searchFunction,
  icon = 'search',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);
    try {
      const response = await searchFunction(text);
      setResults(response.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectItem = (item: SearchItem) => {
    const isSelected = selectedItems.some(i => i.id === item.id);
    if (isSelected) {
      onItemsChange(selectedItems.filter(i => i.id !== item.id));
    } else {
      onItemsChange([...selectedItems, item]);
    }
  };

  const handleRemoveItem = (itemId: number) => {
    onItemsChange(selectedItems.filter(i => i.id !== itemId));
  };

  const styles = StyleSheet.create({
    container: {
      gap: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      ...typography.body2,
      color: colors.text.primary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isSolid ? colors.modal.blur : colors.modal.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      height: 44,
      color: colors.text.primary,
      ...typography.body2,
    },
    resultsContainer: {
      maxHeight: 250,
      backgroundColor: isSolid ? colors.modal.blur : colors.modal.content,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    resultItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.modal.border,
    },
    resultInfo: {
      flex: 1,
    },
    resultName: {
      ...typography.body2,
      color: colors.text.primary,
      fontWeight: '600',
    },
    resultMeta: {
      ...typography.caption,
      color: colors.text.secondary,
      marginTop: 2,
    },
    selectedItemsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    selectedItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.modal.active,
      borderRadius: borderRadius.round,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      gap: spacing.xs,
    },
    selectedItemText: {
      ...typography.caption,
      color: colors.text.primary,
      fontWeight: '600',
    },
    emptyText: {
      ...typography.body2,
      color: colors.text.secondary,
      textAlign: 'center',
      padding: spacing.md,
    },
    resultImage: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.sm,
      marginRight: spacing.sm,
      backgroundColor: colors.modal.border,
    },
    resultImagePlaceholder: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.sm,
      marginRight: spacing.sm,
      backgroundColor: colors.modal.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedItemImage: {
      width: 24,
      height: 24,
      borderRadius: borderRadius.round,
      marginRight: spacing.xs,
      backgroundColor: colors.modal.border,
    },
    selectedItemImagePlaceholder: {
      width: 24,
      height: 24,
      borderRadius: borderRadius.round,
      marginRight: spacing.xs,
      backgroundColor: colors.modal.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View
          style={{flexDirection: 'row', alignItems: 'center', gap: spacing.xs}}>
          {/* <Icon name={icon} size={18} color={colors.accent} /> */}
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color={colors.text.tertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isSearching && (
          <ActivityIndicator size="small" color={colors.accent} />
        )}
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setResults([]);
              setShowResults(false);
            }}>
            <Icon name="close-circle" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results */}
      {showResults && results.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results.slice(0, 10)}
            keyExtractor={item => item.id.toString()}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            renderItem={({item}) => {
              const isSelected = selectedItems.some(i => i.id === item.id);
              const imageUrl = item.profile_path
                ? `https://image.tmdb.org/t/p/w92${item.profile_path}`
                : item.logo_path
                ? `https://image.tmdb.org/t/p/w92${item.logo_path}`
                : null;

              return (
                <TouchableOpacity
                  style={styles.resultItem}
                  onPress={() => handleSelectItem(item)}>
                  {imageUrl && (
                    <Image
                      source={{uri: imageUrl}}
                      style={styles.resultImage}
                    />
                  )}
                  {!imageUrl && (
                    <View style={styles.resultImagePlaceholder}>
                      <Icon
                        name="person"
                        size={20}
                        color={colors.text.tertiary}
                      />
                    </View>
                  )}
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    {item.known_for_department && (
                      <Text style={styles.resultMeta}>
                        {item.known_for_department}
                      </Text>
                    )}
                    {item.known_for && item.known_for.length > 0 && (
                      <Text style={styles.resultMeta} numberOfLines={1}>
                        Known for:{' '}
                        {item.known_for
                          .slice(0, 2)
                          .map(work => work.title || work.name)
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    )}
                  </View>
                  <Icon
                    name={
                      isSelected ? 'checkmark-circle' : 'add-circle-outline'
                    }
                    size={24}
                    color={isSelected ? colors.accent : colors.text.secondary}
                  />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {showResults &&
        results.length === 0 &&
        !isSearching &&
        query.length >= 2 && (
          <Text style={styles.emptyText}>No results found</Text>
        )}

      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <View style={styles.selectedItemsContainer}>
          {selectedItems.map(item => {
            const imageUrl = item.profile_path
              ? `https://image.tmdb.org/t/p/w45${item.profile_path}`
              : item.logo_path
              ? `https://image.tmdb.org/t/p/w45${item.logo_path}`
              : null;

            return (
              <View key={item.id} style={styles.selectedItem}>
                {imageUrl && (
                  <Image
                    source={{uri: imageUrl}}
                    style={styles.selectedItemImage}
                  />
                )}
                {!imageUrl && (
                  <View style={styles.selectedItemImagePlaceholder}>
                    <Icon
                      name="person"
                      size={12}
                      color={colors.text.tertiary}
                    />
                  </View>
                )}
                <Text style={styles.selectedItemText}>{item.name}</Text>
                <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                  <Icon name="close" size={16} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};
