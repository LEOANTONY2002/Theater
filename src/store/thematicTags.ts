import AsyncStorage from '@react-native-async-storage/async-storage';
import {queryClient} from '../services/queryClient';

const STORAGE_KEY = '@theater_thematic_tags';

export interface ThematicTag {
  tag: string;
  description: string;
  category: 'thematic' | 'emotional';
  count: number; // Weighted count (sum of confidence scores across occurrences)
  lastSeen: number; // Timestamp of last occurrence
  confidence: number; // Average confidence score
}

export interface TagStorage {
  tags: ThematicTag[];
  lastUpdated: number;
}

class ThematicTagsManager {
  /**
   * Get all stored tags
   */
  async getAllTags(): Promise<ThematicTag[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }
      const storage: TagStorage = JSON.parse(data);
      return storage.tags || [];
    } catch (error) {
      console.error('Error getting thematic tags:', error);
      return [];
    }
  }

  /**
   * Get top N tags sorted by count (most frequent first)
   * All tags are stored sorted by count, we slice to get top N
   */
  async getTopTags(
    limit: number = 10,
    category?: 'thematic' | 'emotional',
  ): Promise<ThematicTag[]> {
    try {
      const allTags = await this.getAllTags();
      
      // Filter by category if specified
      const filteredTags = category
        ? allTags.filter(t => t.category === category)
        : allTags;

      // Tags are already sorted by count in storage
      // Return top N based on limit
      return filteredTags.slice(0, limit);
    } catch (error) {
      console.error('Error getting top tags:', error);
      return [];
    }
  }

  /**
   * Add or update tags from a content item
   * Stores ALL tags sorted by count (descending)
   */
  async addTags(
    newTags: Array<{
      tag: string;
      description: string;
      category: 'thematic' | 'emotional';
      confidence: number;
    }>,
  ): Promise<void> {
    try {
      const existingTags = await this.getAllTags();
      const now = Date.now();

      // Separate by category
      const thematicMap = new Map<string, ThematicTag>();
      const emotionalMap = new Map<string, ThematicTag>();

      // Load existing tags into maps
      existingTags.forEach(t => {
        const key = t.tag.toLowerCase();
        if (t.category === 'thematic') {
          thematicMap.set(key, t);
        } else {
          emotionalMap.set(key, t);
        }
      });

      // Process new tags
      console.log(`[ThematicTags] Processing ${newTags.length} new tags`);
      newTags.forEach(newTag => {
        const key = newTag.tag.toLowerCase();
        const map = newTag.category === 'thematic' ? thematicMap : emotionalMap;
        const existing = map.get(key);

        if (existing) {
          // Tag exists: increment count by confidence (weighted)
          const oldCount = existing.count;
          const increment = newTag.confidence; // Use confidence as weight (0.0-1.0)
          existing.count += increment;
          existing.lastSeen = now;
          // Update average confidence
          existing.confidence =
            (existing.confidence * oldCount + newTag.confidence * increment) /
            existing.count;
          existing.description = newTag.description; // Use latest description
          console.log(`[ThematicTags] ✅ Incremented "${newTag.tag}" (${newTag.category}): ${oldCount.toFixed(2)} → ${existing.count.toFixed(2)} (+${increment.toFixed(2)})`);
        } else {
          // Tag doesn't exist: add with initial count = confidence
          map.set(key, {
            tag: newTag.tag,
            description: newTag.description,
            category: newTag.category,
            count: newTag.confidence, // Start with confidence as initial weight
            lastSeen: now,
            confidence: newTag.confidence,
          });
          console.log(`[ThematicTags] 🆕 Added "${newTag.tag}" (${newTag.category}): count=${newTag.confidence.toFixed(2)}`);
        }
      });

      // Sort each category by count (descending)
      // Keep ALL tags, not just top 10 (we'll slice when retrieving)
      const sortedThematic = Array.from(thematicMap.values())
        .sort((a, b) => b.count - a.count);

      const sortedEmotional = Array.from(emotionalMap.values())
        .sort((a, b) => b.count - a.count);

      // Combine both categories (store all tags)
      const updatedTags = [...sortedThematic, ...sortedEmotional];

      // Save to storage
      const storage: TagStorage = {
        tags: updatedTags,
        lastUpdated: now,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storage));

      console.log(
        `[ThematicTags] 💾 Stored ALL tags: ${sortedThematic.length} thematic, ${sortedEmotional.length} emotional`,
      );
      console.log('[ThematicTags] Top 10 Thematic:', sortedThematic.slice(0, 10).map(t => `${t.tag}(${t.count})`).join(', '));
      console.log('[ThematicTags] Top 10 Emotional:', sortedEmotional.slice(0, 10).map(t => `${t.tag}(${t.count})`).join(', '));

      // Invalidate queries to refresh Home screen
      queryClient.invalidateQueries({queryKey: ['thematic_genres']});
      queryClient.invalidateQueries({queryKey: ['emotional_tags']});
    } catch (error) {
      console.error('Error adding thematic tags:', error);
    }
  }

  /**
   * Clear all tags (for testing or reset)
   */
  async clearAllTags(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing thematic tags:', error);
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalTags: number;
    thematicCount: number;
    emotionalCount: number;
    lastUpdated: number | null;
  }> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) {
        return {
          totalTags: 0,
          thematicCount: 0,
          emotionalCount: 0,
          lastUpdated: null,
        };
      }

      const storage: TagStorage = JSON.parse(data);
      const tags = storage.tags || [];

      return {
        totalTags: tags.length,
        thematicCount: tags.filter(t => t.category === 'thematic').length,
        emotionalCount: tags.filter(t => t.category === 'emotional').length,
        lastUpdated: storage.lastUpdated,
      };
    } catch (error) {
      console.error('Error getting tag stats:', error);
      return {
        totalTags: 0,
        thematicCount: 0,
        emotionalCount: 0,
        lastUpdated: null,
      };
    }
  }
}

export const thematicTagsManager = new ThematicTagsManager();
