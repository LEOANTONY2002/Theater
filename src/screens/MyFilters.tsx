import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MySpaceStackParamList} from '../types/navigation';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {SavedFilter} from '../types/filters';
import {FiltersManager} from '../store/filters';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {MyFiltersModal} from '../components/MyFiltersModal';

type MyFiltersScreenNavigationProp = NativeStackNavigationProp<
  MySpaceStackParamList,
  'MyFiltersScreen'
>;

export const MyFiltersScreen = () => {
  const navigation = useNavigation<MyFiltersScreenNavigationProp>();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null);

  const {data: savedFilters = [], isLoading} = useQuery({
    queryKey: ['savedFilters'],
    queryFn: FiltersManager.getSavedFilters,
  });

  const handleDelete = useCallback(
    async (filter: SavedFilter) => {
      Alert.alert(
        'Delete Filter',
        `Are you sure you want to delete "${filter.name}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await FiltersManager.deleteFilter(filter.id);
                queryClient.invalidateQueries({queryKey: ['savedFilters']});
              } catch (error) {
                Alert.alert('Error', 'Failed to delete filter');
              }
            },
          },
        ],
      );
    },
    [queryClient],
  );

  const handleSaveFilter = useCallback(
    (filter: SavedFilter) => {
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
    },
    [queryClient],
  );

  const renderFilterItem = useCallback(
    (filter: SavedFilter) => {
      const getFilterDescription = (filter: SavedFilter) => {
        const parts = [];
        if (filter.params.sort_by) {
          parts.push(`Sort: ${filter.params.sort_by.replace('.', ' ')}`);
        }
        if (filter.params['vote_average.gte']) {
          parts.push(`Rating: ${filter.params['vote_average.gte']}+`);
        }
        if (filter.params.with_original_language) {
          parts.push(
            `Language: ${filter.params.with_original_language.toUpperCase()}`,
          );
        }
        return parts.join(' • ');
      };

      return (
        <View key={filter.id} style={styles.filterItem}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterName}>{filter.name}</Text>
            <View style={styles.filterType}>
              <Text style={styles.filterTypeText}>
                {filter.type.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.filterDescription}>
            {getFilterDescription(filter)}
          </Text>
          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setEditingFilter(filter)}>
              <Ionicons
                name="create-outline"
                size={20}
                color={colors.text.primary}
              />
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(filter)}>
              <Ionicons
                name="trash-outline"
                size={20}
                color={colors.status.error}
              />
              <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [handleDelete],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>My Filters</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {savedFilters.map(renderFilterItem)}
      </ScrollView>

      <MyFiltersModal
        visible={showAddModal || !!editingFilter}
        onClose={() => {
          setShowAddModal(false);
          setEditingFilter(null);
        }}
        onSave={handleSaveFilter}
        editingFilter={editingFilter}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingTop: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    color: colors.text.primary,
    ...typography.h2,
  },
  addButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  filterItem: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  filterName: {
    color: colors.text.primary,
    ...typography.h3,
  },
  filterType: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  filterTypeText: {
    color: colors.text.secondary,
    ...typography.caption,
  },
  filterDescription: {
    color: colors.text.secondary,
    ...typography.body2,
    marginBottom: spacing.md,
  },
  filterActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.tertiary,
  },
  actionText: {
    color: colors.text.primary,
    ...typography.button,
  },
  deleteButton: {
    backgroundColor: colors.background.primary,
  },
  deleteText: {
    color: colors.status.error,
  },
});
