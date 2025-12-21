import {getRealm} from './realm';
import Realm from 'realm';

/**
 * Realm-based managers for Settings, History, Filters, Tags
 * Replaces AsyncStorage with Realm database
 */

// ============================================================================
// SETTINGS MANAGER
// ============================================================================

export const RealmSettingsManager = {
  async getSetting(key: string): Promise<string | null> {
    try {
      const realm = getRealm();
      const settings = realm.objects('Settings').filtered('key == $0', key);
      const result = settings.length > 0 ? (settings[0].value as string) : null;
      console.log(
        `[RealmSettings] GET "${key}":`,
        result ? `"${result}"` : 'null',
      );
      return result;
    } catch (error) {
      console.error('[RealmSettings] Error getting setting:', error);
      return null;
    }
  },

  async setSetting(key: string, value: string): Promise<void> {
    try {
      const realm = getRealm();
      console.log(`[RealmSettings] SET "${key}" = "${value}"`);
      realm.write(() => {
        const existing = realm
          .objects('Settings')
          .filtered('key == $0', key)[0];
        if (existing) {
          console.log(`[RealmSettings] Updating existing setting "${key}"`);
          existing.value = value;
          existing.updatedAt = new Date();
        } else {
          console.log(`[RealmSettings] Creating new setting "${key}"`);
          realm.create('Settings', {
            _id: new Realm.BSON.ObjectId(),
            key,
            value,
            updatedAt: new Date(),
          });
        }
      });
      console.log(`[RealmSettings] ✅ SET complete for "${key}"`);
    } catch (error) {
      console.error('[RealmSettings] Error setting:', error);
    }
  },

  async removeSetting(key: string): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const settings = realm.objects('Settings').filtered('key == $0', key);
        realm.delete(settings);
      });
    } catch (error) {
      console.error('[RealmSettings] Error removing setting:', error);
    }
  },
};

// ============================================================================
// HISTORY MANAGER
// ============================================================================

export const RealmHistoryManager = {
  async getAll(): Promise<any[]> {
    try {
      const realm = getRealm();
      const history = realm.objects('HistoryItem').sorted('viewedAt', true);
      return Array.from(history).map(item => ({
        contentId: item.contentId as number,
        type: item.type as string,
        viewedAt: item.viewedAt as Date,
        title: item.title as string | undefined,
        name: item.name as string | undefined,
        poster_path: item.poster_path as string | undefined,
        backdrop_path: item.backdrop_path as string | undefined,
        vote_average: item.vote_average as number | undefined,
        release_date: item.release_date as string | undefined,
        first_air_date: item.first_air_date as string | undefined,
        overview: item.overview as string | undefined,
        runtime: item.runtime as number | undefined,
        // Analytics data for Cinema Insights
        genre_ids: item.genre_ids as string | undefined,
        original_language: item.original_language as string | undefined,
        origin_country: item.origin_country as string | undefined,
        // Crew data
        directors: item.directors as string | undefined,
        writers: item.writers as string | undefined,
        cast: item.cast as string | undefined,
        composer: item.composer as string | undefined,
        cinematographer: item.cinematographer as string | undefined,
        viewCount: item.viewCount as number | undefined,
      }));
    } catch (error) {
      console.error('[RealmHistory] Error getting history:', error);
      return [];
    }
  },

  async add(item: {
    contentId: number;
    type: string;
    title?: string;
    name?: string;
    poster_path?: string;
    backdrop_path?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    overview?: string;
    runtime?: number;
    genre_ids?: string;
    original_language?: string;
    origin_country?: string;
    directors?: string;
    writers?: string;
    cast?: string;
    composer?: string;
    cinematographer?: string;
  }): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        // Check if entry already exists
        const existing = realm
          .objects('HistoryItem')
          .filtered(
            'contentId == $0 AND type == $1',
            item.contentId,
            item.type,
          );

        if (existing.length > 0) {
          // Update view count instead of deleting
          const existingItem = existing[0] as any;
          existingItem.viewCount = (existingItem.viewCount || 1) + 1;
          existingItem.viewedAt = new Date();
          // Update crew data if provided (in case it wasn't available before)
          if (item.directors) existingItem.directors = item.directors;
          if (item.writers) existingItem.writers = item.writers;
          if (item.cast) existingItem.cast = item.cast;
          if (item.composer) existingItem.composer = item.composer;
          if (item.cinematographer)
            existingItem.cinematographer = item.cinematographer;
          if (item.runtime) existingItem.runtime = item.runtime;
          if (item.genre_ids) existingItem.genre_ids = item.genre_ids;
          if (item.original_language)
            existingItem.original_language = item.original_language;
          if (item.origin_country)
            existingItem.origin_country = item.origin_country;
        } else {
          // Add new entry with display data and crew data
          realm.create('HistoryItem', {
            _id: new Realm.BSON.ObjectId(),
            contentId: item.contentId,
            type: item.type,
            viewedAt: new Date(),
            title: item.title,
            name: item.name,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            vote_average: item.vote_average,
            release_date: item.release_date,
            first_air_date: item.first_air_date,
            overview: item.overview,
            runtime: item.runtime,
            genre_ids: item.genre_ids,
            original_language: item.original_language,
            origin_country: item.origin_country,
            directors: item.directors,
            writers: item.writers,
            cast: item.cast,
            composer: item.composer,
            cinematographer: item.cinematographer,
            viewCount: 1,
          });
        }

        // Keep only last 100 unique items
        const allHistory = realm
          .objects('HistoryItem')
          .sorted('viewedAt', true);
        if (allHistory.length > 100) {
          const toDelete = Array.from(allHistory).slice(100);
          realm.delete(toDelete);
        }
      });
    } catch (error) {
      console.error('[RealmHistory] Error adding to history:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const allHistory = realm.objects('HistoryItem');
        realm.delete(allHistory);
      });
    } catch (error) {
      console.error('[RealmHistory] Error clearing history:', error);
    }
  },
};

// ============================================================================
// FILTERS MANAGER
// ============================================================================

export const RealmFiltersManager = {
  async getSavedFilters(): Promise<
    Array<{
      id: string;
      name: string;
      params: any;
      type: string;
      createdAt: Date;
    }>
  > {
    try {
      const realm = getRealm();
      const filters = realm.objects('SavedFilter').sorted('createdAt', true);
      return Array.from(filters).map(filter => ({
        id: filter._id as string,
        name: filter.name as string,
        params: JSON.parse(filter.params as string),
        type: filter.type as string,
        createdAt: filter.createdAt as Date,
      }));
    } catch (error) {
      console.error('[RealmFilters] Error getting filters:', error);
      return [];
    }
  },

  async saveFilter(
    name: string,
    params: any,
    type: 'all' | 'movie' | 'tv',
  ): Promise<string> {
    try {
      const realm = getRealm();
      const id = Date.now().toString();

      realm.write(() => {
        realm.create('SavedFilter', {
          _id: id,
          name,
          params: JSON.stringify(params),
          type,
          createdAt: new Date(),
        });
      });

      return id; // Return the generated ID
    } catch (error) {
      console.error('[RealmFilters] Error saving filter:', error);
      throw error;
    }
  },

  async updateFilter(
    id: string,
    filter: {name: string; params: any; type: 'all' | 'movie' | 'tv'},
  ): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const existing = realm.objectForPrimaryKey('SavedFilter', id);
        if (existing) {
          existing.name = filter.name;
          existing.params = JSON.stringify(filter.params);
          existing.type = filter.type;
        }
      });
    } catch (error) {
      console.error('[RealmFilters] Error updating filter:', error);
      throw error;
    }
  },

  async deleteFilter(id: string): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const filter = realm.objectForPrimaryKey('SavedFilter', id);
        if (filter) {
          realm.delete(filter);
        }
      });
    } catch (error) {
      console.error('[RealmFilters] Error deleting filter:', error);
    }
  },

  async reorderFilters(ids: string[]): Promise<void> {
    try {
      const realm = getRealm();
      const now = Date.now();
      realm.write(() => {
        ids.forEach((id, index) => {
          const filter = realm.objectForPrimaryKey('SavedFilter', id);
          if (filter) {
            // Update createdAt to reflect new order
            // Sorting is descending, so earlier items in list (smaller index)
            // should have later timestamps (larger value)
            filter.createdAt = new Date(now - index * 1000);
          }
        });
      });
    } catch (error) {
      console.error('[RealmFilters] Error reordering filters:', error);
      throw error;
    }
  },
};

// ============================================================================
// THEMATIC TAGS MANAGER
// ============================================================================

export const RealmThematicTagsManager = {
  async getAllTags(): Promise<
    Array<{
      tag: string;
      description: string;
      category: string;
      count: number;
      confidence: number;
    }>
  > {
    try {
      const realm = getRealm();
      const tags = realm.objects('ThematicTag').sorted('count', true);
      return Array.from(tags).map(tag => ({
        tag: tag.tag as string,
        description: tag.description as string,
        category: tag.category as string,
        count: tag.count as number,
        confidence: tag.confidence as number,
      }));
    } catch (error) {
      console.error('[RealmTags] Error getting tags:', error);
      return [];
    }
  },

  async getTopTags(
    limit: number = 10,
    category?: 'thematic' | 'emotional',
  ): Promise<any[]> {
    try {
      const realm = getRealm();
      let tags = realm.objects('ThematicTag').sorted('count', true);

      if (category) {
        tags = tags.filtered('category == $0', category);
      }

      return Array.from(tags.slice(0, limit)).map(tag => ({
        tag: tag.tag as string,
        description: tag.description as string,
        category: tag.category as string,
        count: tag.count as number,
        confidence: tag.confidence as number,
      }));
    } catch (error) {
      console.error('[RealmTags] Error getting top tags:', error);
      return [];
    }
  },

  async addTags(
    newTags: Array<{
      tag: string;
      description: string;
      category: string;
      confidence: number;
    }>,
  ): Promise<void> {
    try {
      const realm = getRealm();
      const now = new Date();

      realm.write(() => {
        newTags.forEach(newTag => {
          // Normalize tag to lowercase for consistency
          const normalizedTag = newTag.tag.toLowerCase();

          const existing = realm
            .objects('ThematicTag')
            .filtered(
              'tag == $0 AND category == $1',
              normalizedTag,
              newTag.category,
            )[0];

          if (existing) {
            // Update existing - weighted average of confidence
            const oldCount = existing.count as number;
            const oldConfidence = existing.confidence as number;
            const newCount = oldCount + 1; // Increment by 1 occurrence

            // Weighted average: (old_conf * old_count + new_conf * 1) / new_count
            const newConfidence =
              (oldConfidence * oldCount + newTag.confidence) / newCount;

            existing.count = newCount;
            existing.confidence = newConfidence;
            existing.lastSeen = now;
            existing.description = newTag.description;
          } else {
            // Create new with normalized tag
            realm.create('ThematicTag', {
              _id: new Realm.BSON.ObjectId(),
              tag: normalizedTag,
              description: newTag.description,
              category: newTag.category,
              count: 1,
              lastSeen: now,
              confidence: newTag.confidence,
            });
          }
        });
      });

      // Auto-cleanup after adding tags
      const totalTags = realm.objects('ThematicTag').length;
      if (totalTags >= 150) {
        console.log(
          `[RealmTags] Tag count at ${totalTags}, triggering cleanup`,
        );
        // Run cleanup async to not block
        this.smartCleanupTags().catch(err =>
          console.error('[RealmTags] Cleanup error:', err),
        );
      }
    } catch (error) {
      console.error('[RealmTags] Error adding tags:', error);
    }
  },

  async clearAllTags(): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const tags = realm.objects('ThematicTag');
        realm.delete(tags);
      });
    } catch (error) {
      console.error('[RealmTags] Error clearing tags:', error);
    }
  },

  /**
   * Smart tag cleanup with sliding window strategy
   * - Soft limit (150): Remove stale tags (not seen in 30 days AND count < 3)
   * - Hard limit (200): Keep only top 10 thematic + top 10 emotional
   * - Also removes corresponding TagContent (AI results)
   */
  async smartCleanupTags(): Promise<{
    removed: number;
    kept: number;
    contentRemoved: number;
  }> {
    try {
      const realm = getRealm();
      const SOFT_LIMIT = 150;
      const HARD_LIMIT = 200;
      const KEEP_TOP_N = 10; // Per category
      const MIN_COUNT = 3;
      const STALE_DAYS = 30;

      const allTags = realm.objects('ThematicTag');
      const totalTags = allTags.length;

      console.log(`[TagCleanup] Total tags: ${totalTags}`);

      if (totalTags < SOFT_LIMIT) {
        console.log('[TagCleanup] Below soft limit, no cleanup needed');
        return {removed: 0, kept: totalTags, contentRemoved: 0};
      }

      let tagsToRemove: any[] = [];
      const now = new Date();
      const staleThreshold = new Date(
        now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000,
      );

      if (totalTags >= HARD_LIMIT) {
        // HARD CLEANUP: Keep only top 10 per category
        console.log(
          `[TagCleanup] Hard limit reached (${totalTags}), keeping top ${KEEP_TOP_N} per category`,
        );

        const topThematic = realm
          .objects('ThematicTag')
          .filtered('category == $0', 'thematic')
          .sorted('count', true)
          .slice(0, KEEP_TOP_N);

        const topEmotional = realm
          .objects('ThematicTag')
          .filtered('category == $0', 'emotional')
          .sorted('count', true)
          .slice(0, KEEP_TOP_N);

        const keepTags = new Set([
          ...Array.from(topThematic).map(t => (t as any)._id.toString()),
          ...Array.from(topEmotional).map(t => (t as any)._id.toString()),
        ]);

        tagsToRemove = Array.from(allTags).filter(
          tag => !keepTags.has((tag as any)._id.toString()),
        );
      } else {
        // SOFT CLEANUP: Remove stale tags only
        console.log(
          `[TagCleanup] Soft cleanup (${totalTags}), removing stale tags`,
        );

        tagsToRemove = Array.from(allTags).filter(tag => {
          const lastSeen = (tag as any).lastSeen as Date;
          const count = (tag as any).count as number;
          return lastSeen < staleThreshold && count < MIN_COUNT;
        });
      }

      if (tagsToRemove.length === 0) {
        console.log('[TagCleanup] No tags to remove');
        return {removed: 0, kept: totalTags, contentRemoved: 0};
      }

      // Get tag names to remove their content
      const tagNamesToRemove = tagsToRemove.map(t => (t as any).tag as string);

      // Remove TagContent for these tags
      let contentRemoved = 0;
      realm.write(() => {
        tagNamesToRemove.forEach(tagName => {
          const tagContent = realm
            .objects('TagContent')
            .filtered('tag == $0', tagName);
          contentRemoved += tagContent.length;
          realm.delete(tagContent);
        });

        // Remove the tags themselves
        realm.delete(tagsToRemove);
      });

      const kept = totalTags - tagsToRemove.length;
      console.log(
        `[TagCleanup] ✅ Removed ${tagsToRemove.length} tags, kept ${kept}, removed ${contentRemoved} content items`,
      );

      return {
        removed: tagsToRemove.length,
        kept,
        contentRemoved,
      };
    } catch (error) {
      console.error('[TagCleanup] Error during cleanup:', error);
      return {removed: 0, kept: 0, contentRemoved: 0};
    }
  },

  /**
   * Get cleanup stats without actually cleaning
   */
  async getCleanupStats(): Promise<{
    total: number;
    thematic: number;
    emotional: number;
    stale: number;
    wouldRemove: number;
  }> {
    try {
      const realm = getRealm();
      const STALE_DAYS = 30;
      const MIN_COUNT = 3;

      const allTags = realm.objects('ThematicTag');
      const thematicTags = realm
        .objects('ThematicTag')
        .filtered('category == $0', 'thematic');
      const emotionalTags = realm
        .objects('ThematicTag')
        .filtered('category == $0', 'emotional');

      const now = new Date();
      const staleThreshold = new Date(
        now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000,
      );

      const staleTags = Array.from(allTags).filter(tag => {
        const lastSeen = (tag as any).lastSeen as Date;
        const count = (tag as any).count as number;
        return lastSeen < staleThreshold && count < MIN_COUNT;
      });

      return {
        total: allTags.length,
        thematic: thematicTags.length,
        emotional: emotionalTags.length,
        stale: staleTags.length,
        wouldRemove: staleTags.length,
      };
    } catch (error) {
      console.error('[TagCleanup] Error getting stats:', error);
      return {
        total: 0,
        thematic: 0,
        emotional: 0,
        stale: 0,
        wouldRemove: 0,
      };
    }
  },

  async mergeDuplicateTags(): Promise<void> {
    try {
      const realm = getRealm();
      const allTags = realm.objects('ThematicTag');
      const tagMap = new Map<string, any[]>();

      // Group tags by normalized name + category
      allTags.forEach(tag => {
        const key = `${(tag.tag as string).toLowerCase()}_${tag.category}`;
        if (!tagMap.has(key)) {
          tagMap.set(key, []);
        }
        tagMap.get(key)!.push(tag);
      });

      // Merge duplicates
      realm.write(() => {
        tagMap.forEach((duplicates, key) => {
          if (duplicates.length > 1) {
            console.log(
              `[RealmTags] Merging ${duplicates.length} duplicates for: ${key}`,
            );

            // Keep first, merge others into it
            const primary = duplicates[0];
            let totalCount = primary.count as number;
            let totalConfidence =
              (primary.confidence as number) * (primary.count as number);

            for (let i = 1; i < duplicates.length; i++) {
              const dup = duplicates[i];
              totalCount += dup.count as number;
              totalConfidence +=
                (dup.confidence as number) * (dup.count as number);
              realm.delete(dup);
            }

            primary.tag = (primary.tag as string).toLowerCase();
            primary.count = totalCount;
            primary.confidence = totalConfidence / totalCount;
          }
        });
      });

      console.log('[RealmTags] Duplicate merge complete');
    } catch (error) {
      console.error('[RealmTags] Error merging duplicates:', error);
    }
  },
};

// ============================================================================
// TAG CONTENT MANAGER
// ============================================================================
export const RealmTagContentManager = {
  async getContentForTag(tag: string, category: string): Promise<any[]> {
    try {
      const realm = getRealm();
      const content = realm
        .objects('TagContent')
        .filtered('tag == $0 AND category == $1', tag, category)
        .sorted('position');

      return Array.from(content).map(item => ({
        contentId: item.contentId as number,
        type: item.type as string,
        title: item.title as string | undefined,
        name: item.name as string | undefined,
        poster_path: item.poster_path as string | undefined,
        vote_average: item.vote_average as number | undefined,
        relevance: item.relevance as number | undefined,
        reason: item.reason as string | undefined,
        position: item.position as number,
      }));
    } catch (error) {
      console.error('[RealmTagContent] Error getting content:', error);
      return [];
    }
  },

  async saveContentForTag(
    tag: string,
    category: string,
    content: any[],
  ): Promise<void> {
    try {
      const realm = getRealm();
      const now = new Date();

      realm.write(() => {
        // Clear old content for this tag
        const oldContent = realm
          .objects('TagContent')
          .filtered('tag == $0 AND category == $1', tag, category);
        realm.delete(oldContent);

        // Add new content
        content.forEach((item, index) => {
          realm.create('TagContent', {
            _id: new Realm.BSON.ObjectId(),
            tag,
            category,
            contentId: item.id,
            type: item.type,
            title: item.title,
            name: item.name,
            poster_path: item.poster_path,
            vote_average: item.vote_average,
            release_date: item.release_date,
            first_air_date: item.first_air_date,
            overview: item.overview,
            relevance: item.relevance,
            generatedAt: now,
            position: index + 1,
          });
        });
      });
    } catch (error) {
      console.error('[RealmTagContent] Error saving content:', error);
    }
  },
};

// ============================================================================
// CHAT MANAGER
// ============================================================================

export const ChatManager = {
  async getThreads(): Promise<any[]> {
    try {
      const realm = getRealm();
      const threads = realm.objects('ChatThread').sorted('updatedAt', true);
      return Array.from(threads).map(t => ({
        threadId: t.threadId,
        title: t.title,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
    } catch (error) {
      console.error('[ChatManager] Error getting threads:', error);
      return [];
    }
  },

  async createThread(threadId: string, title: string): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        realm.create('ChatThread', {
          _id: new Realm.BSON.ObjectId(),
          threadId,
          title,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });
    } catch (error) {
      console.error('[ChatManager] Error creating thread:', error);
    }
  },

  async updateThread(
    threadId: string,
    updates: {title?: string},
  ): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const thread = realm
          .objects('ChatThread')
          .filtered('threadId == $0', threadId)[0];
        if (thread) {
          if (updates.title !== undefined) thread.title = updates.title;
          thread.updatedAt = new Date();
        }
      });
    } catch (error) {
      console.error('[ChatManager] Error updating thread:', error);
    }
  },

  async deleteThread(threadId: string): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const thread = realm
          .objects('ChatThread')
          .filtered('threadId == $0', threadId);
        const messages = realm
          .objects('ChatMessage')
          .filtered('threadId == $0', threadId);
        const recommendations = realm
          .objects('ChatRecommendation')
          .filtered('threadId == $0', threadId);
        realm.delete(recommendations);
        realm.delete(messages);
        realm.delete(thread);
      });
    } catch (error) {
      console.error('[ChatManager] Error deleting thread:', error);
    }
  },

  async getMessages(threadId: string): Promise<any[]> {
    try {
      const realm = getRealm();
      const messages = realm
        .objects('ChatMessage')
        .filtered('threadId == $0', threadId)
        .sorted('timestamp', false); // FALSE = ASCENDING (oldest first)
      return Array.from(messages).map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
    } catch (error) {
      console.error('[ChatManager] Error getting messages:', error);
      return [];
    }
  },

  async addMessage(
    threadId: string,
    role: string,
    content: string,
  ): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        realm.create('ChatMessage', {
          _id: new Realm.BSON.ObjectId(),
          threadId,
          role,
          content,
          timestamp: new Date(),
        });

        const thread = realm
          .objects('ChatThread')
          .filtered('threadId == $0', threadId)[0];
        if (thread) {
          thread.updatedAt = new Date();
        }
      });
    } catch (error) {
      console.error('[ChatManager] Error adding message:', error);
    }
  },

  async saveRecommendations(
    threadId: string,
    messageIndex: number,
    recommendations: any[],
  ): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const oldRecs = realm
          .objects('ChatRecommendation')
          .filtered(
            'threadId == $0 AND messageIndex == $1',
            threadId,
            messageIndex,
          );
        realm.delete(oldRecs);

        recommendations.forEach((rec, index) => {
          realm.create('ChatRecommendation', {
            _id: new Realm.BSON.ObjectId(),
            threadId,
            messageIndex,
            contentId: rec.id,
            type: rec.type,
            title: rec.title,
            name: rec.name,
            poster_path: rec.poster_path,
            vote_average: rec.vote_average,
            release_date: rec.release_date,
            first_air_date: rec.first_air_date,
            overview: rec.overview,
            createdAt: new Date(),
            position: index + 1,
          });
        });
      });
    } catch (error) {
      console.error('[ChatManager] Error saving recommendations:', error);
    }
  },

  async getRecommendations(
    threadId: string,
    messageIndex: number,
  ): Promise<any[]> {
    try {
      const realm = getRealm();
      const recs = realm
        .objects('ChatRecommendation')
        .filtered(
          'threadId == $0 AND messageIndex == $1',
          threadId,
          messageIndex,
        )
        .sorted('position', false); // FALSE = ASCENDING (1, 2, 3...)
      return Array.from(recs).map(r => ({
        id: r.contentId,
        type: r.type,
        title: r.title,
        name: r.name,
        poster_path: r.poster_path,
        vote_average: r.vote_average,
        release_date: r.release_date,
        first_air_date: r.first_air_date,
        overview: r.overview,
      }));
    } catch (error) {
      console.error('[ChatManager] Error getting recommendations:', error);
      return [];
    }
  },
};

// ============================================================================
// RECENT SEARCH MANAGER (for query strings)
// ============================================================================

export const RecentSearchManager = {
  async getRecentSearches(limit: number = 10): Promise<string[]> {
    try {
      const realm = getRealm();
      const searches = realm
        .objects('RecentSearch')
        .sorted('timestamp', true)
        .slice(0, limit);
      return Array.from(searches).map(s => s.query as string);
    } catch (error) {
      console.error('[RecentSearch] Error getting searches:', error);
      return [];
    }
  },

  async addSearch(query: string): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const existing = realm
          .objects('RecentSearch')
          .filtered('query == $0', query);
        realm.delete(existing);

        realm.create('RecentSearch', {
          _id: new Realm.BSON.ObjectId(),
          query,
          timestamp: new Date(),
        });

        const all = realm.objects('RecentSearch').sorted('timestamp', true);
        if (all.length > 20) {
          const toDelete = Array.from(all).slice(20);
          realm.delete(toDelete);
        }
      });
    } catch (error) {
      console.error('[RecentSearch] Error adding search:', error);
    }
  },

  async clearSearches(): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const all = realm.objects('RecentSearch');
        realm.delete(all);
      });
    } catch (error) {
      console.error('[RecentSearch] Error clearing searches:', error);
    }
  },
};

// ============================================================================
// RECENT SEARCH ITEMS MANAGER (for content items clicked from search)
// ============================================================================

export const RecentSearchItemManager = {
  async getAll(): Promise<any[]> {
    try {
      const realm = getRealm();
      const items = realm
        .objects('RecentSearchItem')
        .sorted('searchedAt', true);
      return Array.from(items).map(item => ({
        contentId: item.contentId as number,
        type: item.type as string,
        searchedAt: item.searchedAt as Date,
        isSearch: item.isSearch as boolean,
        title: item.title as string | undefined,
        name: item.name as string | undefined,
        poster_path: item.poster_path as string | undefined,
        backdrop_path: item.backdrop_path as string | undefined,
        vote_average: item.vote_average as number | undefined,
        release_date: item.release_date as string | undefined,
        first_air_date: item.first_air_date as string | undefined,
        overview: item.overview as string | undefined,
      }));
    } catch (error) {
      console.error('[RecentSearchItem] Error getting items:', error);
      return [];
    }
  },

  async add(item: {
    contentId: number;
    type: 'movie' | 'tv';
    isSearch: boolean;
    title?: string;
    name?: string;
    poster_path?: string;
    backdrop_path?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    overview?: string;
  }): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        // Remove existing entry for this content
        const existing = realm
          .objects('RecentSearchItem')
          .filtered(
            'contentId == $0 AND type == $1',
            item.contentId,
            item.type,
          );
        realm.delete(existing);

        // Add new entry with display data
        realm.create('RecentSearchItem', {
          _id: new Realm.BSON.ObjectId(),
          contentId: item.contentId,
          type: item.type,
          searchedAt: new Date(),
          isSearch: item.isSearch,
          title: item.title,
          name: item.name,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          vote_average: item.vote_average,
          release_date: item.release_date,
          first_air_date: item.first_air_date,
          overview: item.overview,
        });

        // Keep only last 50 items
        const allItems = realm
          .objects('RecentSearchItem')
          .sorted('searchedAt', true);
        if (allItems.length > 50) {
          const toDelete = Array.from(allItems).slice(50);
          realm.delete(toDelete);
        }
      });
    } catch (error) {
      console.error('[RecentSearchItem] Error adding item:', error);
    }
  },

  async clear(): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const allItems = realm.objects('RecentSearchItem');
        realm.delete(allItems);
      });
    } catch (error) {
      console.error('[RecentSearchItem] Error clearing items:', error);
    }
  },
};

// ============================================================================
// USER FEEDBACK MANAGER
// ============================================================================

export const UserFeedbackManager = {
  async getAllFeedback(): Promise<
    Array<{contentId: number; title: string; liked: boolean; timestamp: Date}>
  > {
    try {
      const realm = getRealm();
      const feedback = realm.objects('UserFeedback').sorted('timestamp', false);
      return Array.from(feedback).map(f => ({
        contentId: f.contentId as number,
        title: f.title as string,
        liked: f.liked as boolean,
        timestamp: f.timestamp as Date,
      }));
    } catch (error) {
      console.error('[UserFeedback] Error getting feedback:', error);
      return [];
    }
  },

  async addFeedback(
    contentId: number,
    title: string,
    liked: boolean,
  ): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        // Remove existing feedback for this content
        const existing = realm
          .objects('UserFeedback')
          .filtered('contentId == $0', contentId);
        realm.delete(existing);

        // Add new feedback
        realm.create('UserFeedback', {
          _id: new Realm.BSON.ObjectId(),
          contentId,
          title,
          liked,
          timestamp: new Date(),
        });
      });
    } catch (error) {
      console.error('[UserFeedback] Error adding feedback:', error);
    }
  },

  async clearAllFeedback(): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const all = realm.objects('UserFeedback');
        realm.delete(all);
      });
    } catch (error) {
      console.error('[UserFeedback] Error clearing feedback:', error);
    }
  },
};

// ============================================================================
// USER PREFERENCES MANAGER
// ============================================================================

export const UserPreferencesManager = {
  async getPreferences(): Promise<{
    selectedGenres: number[];
    moodAnswers: {[key: string]: string};
    timestamp: number;
  } | null> {
    try {
      const realm = getRealm();
      const prefs = realm.objectForPrimaryKey(
        'UserPreferences',
        'user_preferences',
      );
      if (!prefs) return null;

      return {
        selectedGenres: JSON.parse(prefs.selectedGenres as string),
        moodAnswers: JSON.parse(prefs.moodAnswers as string),
        timestamp: (prefs.timestamp as Date).getTime(),
      };
    } catch (error) {
      console.error('[UserPreferences] Error getting preferences:', error);
      return null;
    }
  },

  async setPreferences(
    selectedGenres: number[],
    moodAnswers: {[key: string]: string},
  ): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        realm.create(
          'UserPreferences',
          {
            _id: 'user_preferences',
            selectedGenres: JSON.stringify(selectedGenres),
            moodAnswers: JSON.stringify(moodAnswers),
            timestamp: new Date(),
          },
          Realm.UpdateMode.Modified,
        );
      });
    } catch (error) {
      console.error('[UserPreferences] Error setting preferences:', error);
    }
  },

  async getOnboardingStatus(): Promise<boolean> {
    try {
      const prefs = await this.getPreferences();
      return prefs !== null;
    } catch (error) {
      console.error(
        '[UserPreferences] Error getting onboarding status:',
        error,
      );
      return false;
    }
  },

  async clearPreferences(): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const prefs = realm.objectForPrimaryKey(
          'UserPreferences',
          'user_preferences',
        );
        if (prefs) {
          realm.delete(prefs);
        }
      });
    } catch (error) {
      console.error('[UserPreferences] Error clearing preferences:', error);
    }
  },
};

// ============================================================================
// DEBUG HELPER - View all Realm data
// ============================================================================

export const RealmDebugger = {
  async logAllData(): Promise<void> {
    try {
      const realm = getRealm();

      console.log(
        '\n╔════════════════════════════════════════════════════════════╗',
      );
      console.log(
        '║           REALM DATABASE DETAILED DUMP                     ║',
      );
      console.log(
        '╚════════════════════════════════════════════════════════════╝\n',
      );

      // Chat data
      const threads = realm.objects('ChatThread').sorted('createdAt', false);
      console.log(`📱 ChatThreads: ${threads.length}`);
      console.log(
        '─────────────────────────────────────────────────────────────',
      );
      threads.forEach((t: any, idx: number) => {
        const date = new Date(t.createdAt).toLocaleString();
        console.log(`  ${idx + 1}. Thread ID: ${t.threadId}`);
        console.log(`     Title: "${t.title || '(empty)'}"`);
        console.log(`     Created: ${date}`);
        console.log(`     Updated: ${new Date(t.updatedAt).toLocaleString()}`);
        console.log('');
      });

      const messages = realm.objects('ChatMessage');
      console.log(`\n💬 ChatMessages: ${messages.length}`);
      console.log(
        '─────────────────────────────────────────────────────────────',
      );
      const messagesByThread: any = {};
      messages.forEach((m: any) => {
        if (!messagesByThread[m.threadId]) {
          messagesByThread[m.threadId] = [];
        }
        messagesByThread[m.threadId].push(m);
      });
      Object.keys(messagesByThread).forEach(threadId => {
        const msgs = messagesByThread[threadId];
        console.log(`  Thread ${threadId}: ${msgs.length} messages`);
        msgs.slice(0, 3).forEach((m: any, idx: number) => {
          const preview = m.content.slice(0, 50).replace(/\n/g, ' ');
          console.log(`    ${idx + 1}. [${m.role}] ${preview}...`);
        });
        if (msgs.length > 3) {
          console.log(`    ... and ${msgs.length - 3} more`);
        }
        console.log('');
      });

      const recommendations = realm.objects('ChatRecommendation');
      console.log(`\n🎬 ChatRecommendations: ${recommendations.length}`);
      console.log(
        '─────────────────────────────────────────────────────────────',
      );
      const recsByThread: any = {};
      recommendations.forEach((r: any) => {
        if (!recsByThread[r.threadId]) {
          recsByThread[r.threadId] = [];
        }
        recsByThread[r.threadId].push(r);
      });
      Object.keys(recsByThread).forEach(threadId => {
        const recs = recsByThread[threadId];
        console.log(`  Thread ${threadId}: ${recs.length} recommendations`);
        recs.slice(0, 5).forEach((r: any) => {
          console.log(
            `    - ${r.title || r.name} (${r.type}, ID: ${r.contentId})`,
          );
        });
        if (recs.length > 5) {
          console.log(`    ... and ${recs.length - 5} more`);
        }
        console.log('');
      });

      // User data
      const feedback = realm.objects('UserFeedback').sorted('timestamp', false);
      console.log(`\n👍👎 UserFeedback: ${feedback.length}`);
      console.log(
        '─────────────────────────────────────────────────────────────',
      );
      feedback.forEach((f: any, idx: number) => {
        const date = new Date(f.timestamp).toLocaleString();
        console.log(
          `  ${idx + 1}. ${f.liked ? '👍 LIKED' : '👎 DISLIKED'}: ${f.title}`,
        );
        console.log(`     Content ID: ${f.contentId}`);
        console.log(`     Date: ${date}`);
        console.log('');
      });

      const prefs = realm.objectForPrimaryKey(
        'UserPreferences',
        'user_preferences',
      );
      console.log(`\n⚙️ UserPreferences: ${prefs ? 'EXISTS' : 'NONE'}`);
      console.log(
        '─────────────────────────────────────────────────────────────',
      );
      if (prefs) {
        const genres = JSON.parse(prefs.selectedGenres as string);
        const mood = JSON.parse(prefs.moodAnswers as string);
        console.log(`  Selected Genres: ${JSON.stringify(genres)}`);
        console.log(`  Mood Answers:`);
        Object.entries(mood).forEach(([key, value]) => {
          console.log(`    - ${key}: ${value}`);
        });
        console.log(
          `  Last Updated: ${new Date(
            prefs.timestamp as Date,
          ).toLocaleString()}`,
        );
        console.log('');
      }

      // Settings
      const settings = realm.objects('Settings');
      console.log(`\n🔧 Settings: ${settings.length}`);
      console.log(
        '─────────────────────────────────────────────────────────────',
      );
      settings.forEach((s: any) => {
        console.log(`  ${s.key}: ${s.value}`);
      });
      console.log('');

      // Watchlists
      const watchlists = realm.objects('Watchlist');
      console.log(`\n📋 Watchlists: ${watchlists.length}`);
      console.log(
        '─────────────────────────────────────────────────────────────',
      );
      watchlists.forEach((w: any, idx: number) => {
        console.log(`  ${idx + 1}. ${w.name}`);
        console.log(`     ID: ${w._id}`);
        console.log(`     Created: ${new Date(w.createdAt).toLocaleString()}`);
        console.log('');
      });

      const watchlistItems = realm.objects('WatchlistItem');
      console.log(`\n🎥 WatchlistItems: ${watchlistItems.length}`);
      console.log(
        '─────────────────────────────────────────────────────────────',
      );
      const itemsByWatchlist: any = {};
      watchlistItems.forEach((item: any) => {
        if (!itemsByWatchlist[item.watchlistId]) {
          itemsByWatchlist[item.watchlistId] = [];
        }
        itemsByWatchlist[item.watchlistId].push(item);
      });
      Object.keys(itemsByWatchlist).forEach(wId => {
        const items = itemsByWatchlist[wId];
        console.log(`  Watchlist ${wId}: ${items.length} items`);
        items.slice(0, 5).forEach((item: any) => {
          console.log(
            `    - ${item.title} (${item.type}, ID: ${item.contentId})`,
          );
        });
        if (items.length > 5) {
          console.log(`    ... and ${items.length - 5} more`);
        }
        console.log('');
      });

      // History
      const history = realm.objects('HistoryItem').sorted('viewedAt', false);
      console.log(`\n📜 History: ${history.length}`);
      console.log(
        '─────────────────────────────────────────────────────────────',
      );
      history.slice(0, 10).forEach((h: any, idx: number) => {
        const date = new Date(h.viewedAt).toLocaleString();
        console.log(`  ${idx + 1}. Content ID: ${h.contentId} (${h.type})`);
        console.log(`     Viewed: ${date}`);
      });
      if (history.length > 10) {
        console.log(`  ... and ${history.length - 10} more`);
      }
      console.log('');

      // Search
      const searches = realm.objects('RecentSearch').sorted('timestamp', false);
      console.log(`\n🔍 RecentSearches: ${searches.length}`);
      console.log(
        '─────────────────────────────────────────────────────────────',
      );
      searches.forEach((s: any, idx: number) => {
        const date = new Date(s.timestamp).toLocaleString();
        console.log(`  ${idx + 1}. "${s.query}"`);
        console.log(`     Searched: ${date}`);
      });
      console.log('');

      // Tags
      const tags = realm.objects('ThematicTag').sorted('count', false);
      console.log(`\n🏷️ ThematicTags: ${tags.length}`);
      console.log(
        '─────────────────────────────────────────────────────────────',
      );
      tags.forEach((tag: any, idx: number) => {
        if (idx < 10) {
          // Show top 10
          console.log(`  ${idx + 1}. "${tag.tag}" (${tag.category})`);
          console.log(`     Description: ${tag.description}`);
          console.log(
            `     Count: ${tag.count}, Confidence: ${tag.confidence.toFixed(
              2,
            )}`,
          );
          console.log(
            `     Last Seen: ${new Date(tag.lastSeen).toLocaleString()}`,
          );
          console.log('');
        }
      });
      if (tags.length > 10) {
        console.log(`  ... and ${tags.length - 10} more tags`);
      }
      console.log('');

      const tagContent = realm.objects('TagContent').sorted('position', false);
      console.log(`\n📦 TagContent: ${tagContent.length}`);
      console.log(
        '─────────────────────────────────────────────────────────────',
      );
      const contentByTag: any = {};
      tagContent.forEach((tc: any) => {
        if (!contentByTag[tc.tag]) {
          contentByTag[tc.tag] = [];
        }
        contentByTag[tc.tag].push(tc);
      });
      Object.keys(contentByTag).forEach(tagName => {
        const items = contentByTag[tagName];
        console.log(`  Tag: "${tagName}" (${items[0].category})`);
        console.log(`     ${items.length} content items:`);
        items.slice(0, 3).forEach((item: any) => {
          console.log(
            `       - ${item.title || item.name} (${item.type}, ID: ${
              item.contentId
            })`,
          );
          if (item.relevance) {
            console.log(
              `         Relevance: ${(item.relevance * 100).toFixed(0)}%`,
            );
          }
        });
        if (items.length > 3) {
          console.log(`       ... and ${items.length - 3} more`);
        }
        console.log('');
      });

      // Summary
      console.log(
        '\n╔════════════════════════════════════════════════════════════╗',
      );
      console.log(
        '║                      SUMMARY                               ║',
      );
      console.log(
        '╚════════════════════════════════════════════════════════════╝',
      );
      console.log(`  Total Threads: ${threads.length}`);
      console.log(`  Total Messages: ${messages.length}`);
      console.log(`  Total Recommendations: ${recommendations.length}`);
      console.log(`  User Feedback: ${feedback.length}`);
      console.log(`  Watchlists: ${watchlists.length}`);
      console.log(`  Watchlist Items: ${watchlistItems.length}`);
      console.log(`  History Items: ${history.length}`);
      console.log(`  Recent Searches: ${searches.length}`);
      console.log(`  Tags: ${tags.length}`);
      console.log(`  Tag Content: ${tagContent.length}`);
      console.log(`  Settings: ${settings.length}`);
      console.log(`  User Preferences: ${prefs ? 'Configured' : 'Not Set'}`);
      console.log(
        '\n════════════════════════════════════════════════════════════\n',
      );
    } catch (error) {
      console.error('[RealmDebugger] Error:', error);
    }
  },

  async clearAllData(): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        realm.deleteAll();
      });
      console.log('[RealmDebugger] ✅ All data cleared!');
    } catch (error) {
      console.error('[RealmDebugger] Error clearing data:', error);
    }
  },

  async cleanupInvalidTags(): Promise<number> {
    try {
      const realm = getRealm();
      const tags = realm.objects('ThematicTag');
      const invalidTags: any[] = [];

      tags.forEach((tag: any) => {
        // Check for missing required fields
        if (
          !tag.tag ||
          !tag.category ||
          !tag.lastSeen ||
          tag.count === undefined
        ) {
          invalidTags.push(tag);
        }
      });

      if (invalidTags.length > 0) {
        realm.write(() => {
          invalidTags.forEach(tag => {
            realm.delete(tag);
          });
        });
        console.log(
          `[RealmDebugger] ✅ Cleaned up ${invalidTags.length} invalid tags`,
        );
      } else {
        console.log('[RealmDebugger] No invalid tags found');
      }

      return invalidTags.length;
    } catch (error) {
      console.error('[RealmDebugger] Error cleaning up tags:', error);
      return 0;
    }
  },
};

// ============================================================================
// AI PERSONALIZATION CACHE MANAGER
// ============================================================================

export const AIPersonalizationCacheManager = {
  async get(): Promise<{
    inputHistoryIds: Array<{id: number; type: string; title: string}>;
    aiRecommendations: any[];
    timestamp: Date;
  } | null> {
    try {
      const realm = getRealm();
      const cache = realm.objectForPrimaryKey(
        'AIPersonalizationCache',
        'history_personalization',
      );

      if (!cache) {
        return null;
      }

      return {
        inputHistoryIds: JSON.parse(cache.inputHistoryIds as string),
        aiRecommendations: JSON.parse(cache.aiRecommendations as string),
        timestamp: cache.timestamp as Date,
      };
    } catch (error) {
      console.error('[AIPersonalizationCache] Error getting cache:', error);
      return null;
    }
  },

  async set(
    inputHistoryIds: Array<{id: number; type: string; title: string}>,
    aiRecommendations: any[],
  ): Promise<void> {
    try {
      const realm = getRealm();

      realm.write(() => {
        realm.create(
          'AIPersonalizationCache',
          {
            _id: 'history_personalization',
            inputHistoryIds: JSON.stringify(inputHistoryIds),
            aiRecommendations: JSON.stringify(aiRecommendations),
            timestamp: new Date(),
          },
          Realm.UpdateMode.Modified,
        );
      });

      console.log('[AIPersonalizationCache] ✅ Cache updated');
    } catch (error) {
      console.error('[AIPersonalizationCache] Error setting cache:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      const realm = getRealm();

      realm.write(() => {
        const cache = realm.objectForPrimaryKey(
          'AIPersonalizationCache',
          'history_personalization',
        );
        if (cache) {
          realm.delete(cache);
        }
      });

      console.log('[AIPersonalizationCache] ✅ Cache cleared');
    } catch (error) {
      console.error('[AIPersonalizationCache] Error clearing cache:', error);
    }
  },

  // Compare current history with cached input
  hasHistoryChanged(
    currentHistory: Array<{id: number; type: string; title: string}>,
    cachedInput: Array<{id: number; type: string; title: string}>,
  ): boolean {
    if (currentHistory.length !== cachedInput.length) {
      return true;
    }

    // Compare IDs and types of top 10 items
    for (let i = 0; i < currentHistory.length; i++) {
      if (
        currentHistory[i].id !== cachedInput[i].id ||
        currentHistory[i].type !== cachedInput[i].type
      ) {
        return true;
      }
    }

    return false;
  },
};

// ============================================================================
// COLLECTIONS MANAGER
// ============================================================================

export const RealmCollectionsManager = {
  async getSavedCollections(): Promise<
    Array<{
      id: string;
      name: string;
      overview: string;
      poster_path: string | null;
      backdrop_path: string | null;
      parts: any[]; // Decoded JSON
      createdAt: Date;
    }>
  > {
    try {
      const realm = getRealm();
      const collections = realm
        .objects('SavedCollection')
        .sorted('createdAt', true);
      return Array.from(collections).map(col => ({
        id: col._id as string,
        name: col.name as string,
        overview: col.overview as string,
        poster_path: (col.poster_path as string) || null,
        backdrop_path: (col.backdrop_path as string) || null,
        parts: JSON.parse(col.parts as string), // Decode JSON
        createdAt: col.createdAt as Date,
      }));
    } catch (error) {
      console.error('[RealmCollections] Error getting collections:', error);
      return [];
    }
  },

  async isCollected(id: string): Promise<boolean> {
    try {
      const realm = getRealm();
      const collection = realm.objectForPrimaryKey('SavedCollection', id);
      return !!collection;
    } catch (error) {
      return false;
    }
  },

  async saveCollection(collection: {
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    parts: any[];
  }): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        realm.create(
          'SavedCollection',
          {
            _id: collection.id.toString(),
            name: collection.name,
            overview: collection.overview,
            poster_path: collection.poster_path,
            backdrop_path: collection.backdrop_path,
            parts: JSON.stringify(collection.parts),
            createdAt: new Date(),
          },
          Realm.UpdateMode.Modified,
        );
      });
      console.log(`[RealmCollections] Saved collection: ${collection.name}`);
    } catch (error) {
      console.error('[RealmCollections] Error saving collection:', error);
      throw error;
    }
  },

  async deleteCollection(id: string): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const collection = realm.objectForPrimaryKey('SavedCollection', id);
        if (collection) {
          realm.delete(collection);
        }
      });
      console.log(`[RealmCollections] Deleted collection: ${id}`);
    } catch (error) {
      console.error('[RealmCollections] Error deleting collection:', error);
    }
  },
};
