import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {Cast} from '../types/movie';
import {getImageUrl} from '../services/tmdb';
import {PersonCard} from './PersonCard';

type TabType = 'cast' | 'crew';

interface CategoryTab {
  key: TabType;
  label: string;
}

const CATEGORIES: CategoryTab[] = [
  {key: 'cast', label: 'Cast'},
  {key: 'crew', label: 'Crew'},
];

interface CastCrewTabbedSectionProps {
  cast?: Cast[];
  crew?: Cast[];
  onPersonPress: (personId: number, personName: string) => void;
}

export const CastCrewTabbedSection: React.FC<CastCrewTabbedSectionProps> = ({
  cast = [],
  crew = [],
  onPersonPress,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('cast');

  const renderTabButton = (category: CategoryTab) => (
    <TouchableOpacity
      key={category.key}
      style={[
        styles.tabButton,
        activeTab === category.key && styles.activeTabButton,
      ]}
      onPress={() => setActiveTab(category.key)}>
      <Text
        style={[
          styles.tabText,
          activeTab === category.key && styles.activeTabText,
        ]}>
        {category.label}
      </Text>
    </TouchableOpacity>
  );

  const renderPerson = useCallback(
    ({item: person}: {item: Cast}) => (
      <TouchableOpacity
        style={styles.castItem}
        onPress={() => onPersonPress(person.id, person.name)}>
        <PersonCard
          item={getImageUrl(person.profile_path || '', 'w154')}
          onPress={() => onPersonPress(person.id, person.name)}
        />
        <Text style={styles.castName} numberOfLines={2}>
          {person.name}
        </Text>
        <Text style={styles.character} numberOfLines={2}>
          {(person as any).character || (person as any).job || ''}
        </Text>
      </TouchableOpacity>
    ),
    [onPersonPress],
  );

  const currentData = activeTab === 'cast' ? cast.slice(0, 15) : crew.slice(0, 15);

  if (cast.length === 0 && crew.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.sectionTitle}>Cast & Crew</Text>

      {/* Horizontal Tabs */}
      <ScrollView
        style={styles.tabContainer}
        horizontal={true}
        showsHorizontalScrollIndicator={false}>
        {CATEGORIES.map(renderTabButton)}
      </ScrollView>

      {/* Content List */}
      {currentData.length > 0 ? (
        <FlatList
          data={currentData}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal: 16, paddingVertical: 8}}
          renderItem={renderPerson}
          keyExtractor={(person: Cast) => `${activeTab}-${person.id}`}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No {activeTab} information available
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text.primary,
    ...typography.h3,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  tabButton: {
    padding: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderColor: colors.modal.content,
  },
  activeTabButton: {
    backgroundColor: colors.modal.border,
    borderWidth: 1,
    borderColor: colors.modal.active,
  },
  tabText: {
    color: colors.text.secondary,
    ...typography.body2,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.text.primary,
  },
  castItem: {
    marginRight: 16,
    width: 100,
  },
  castName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'Inter_18pt-Regular',
  },
  character: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Inter_18pt-Regular',
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
  },
  emptyText: {
    color: colors.text.secondary,
    ...typography.body2,
    textAlign: 'center',
  },
});
