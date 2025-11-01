import {RealmThematicTagsManager, RealmTagContentManager} from '../database/managers';

export const ThematicTagsManager = {
  async getAllTags(): Promise<Array<{tag: string; description: string; category: string; count: number; confidence: number}>> {
    return await RealmThematicTagsManager.getAllTags();
  },

  async getTopTags(limit: number = 10, category?: 'thematic' | 'emotional'): Promise<any[]> {
    return await RealmThematicTagsManager.getTopTags(limit, category);
  },

  async addTags(tags: Array<{tag: string; description: string; category: string; confidence: number}>): Promise<void> {
    await RealmThematicTagsManager.addTags(tags);
  },

  async clearAllTags(): Promise<void> {
    await RealmThematicTagsManager.clearAllTags();
  },

  async getContentForTag(tag: string, category: string): Promise<any[]> {
    return await RealmTagContentManager.getContentForTag(tag, category);
  },

  async saveContentForTag(tag: string, category: string, content: any[]): Promise<void> {
    await RealmTagContentManager.saveContentForTag(tag, category, content);
  },
};
