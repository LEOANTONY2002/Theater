import {RealmCollectionsManager} from '../database/managers';
import {Movie} from '../types/movie';

export interface SavedCollection {
  id: string;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  parts: Movie[];
  createdAt: number;
}

export const CollectionsManager = {
  async getSavedCollections(): Promise<SavedCollection[]> {
    const collections = await RealmCollectionsManager.getSavedCollections();
    return collections.map(col => ({
      ...col,
      createdAt: col.createdAt.getTime(),
    }));
  },

  async isCollected(id: string): Promise<boolean> {
    return await RealmCollectionsManager.isCollected(id);
  },

  async saveCollection(collection: {
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    parts: Movie[];
  }): Promise<void> {
    await RealmCollectionsManager.saveCollection(collection);
  },

  async deleteCollection(id: string): Promise<void> {
    await RealmCollectionsManager.deleteCollection(id);
  },

  async getAllCollectionsExportData(): Promise<number[]> {
    const collections = await RealmCollectionsManager.getSavedCollections();
    return collections.map(col => Number(col.id));
  },

  async deleteAllCollections(): Promise<void> {
    const collections = await RealmCollectionsManager.getSavedCollections();
    for (const col of collections) {
      await RealmCollectionsManager.deleteCollection(col.id);
    }
  },
};
