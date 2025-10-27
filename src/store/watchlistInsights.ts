import AsyncStorage from '@react-native-async-storage/async-storage';

const INSIGHTS_KEY = '@watchlist_insights';
const RECOMMENDATIONS_KEY = '@watchlist_recommendations';

export interface WatchlistInsight {
  watchlistHash: string; // Hash of watchlist item IDs
  insights: string[];
  topGenres: string[];
  averageRating: number;
  decadeDistribution: Record<string, number>;
  recommendations: string;
  timestamp: number;
}

export interface WatchlistRecommendation {
  watchlistHash: string;
  items: Array<{
    id: number;
    title?: string;
    name?: string;
    type: 'movie' | 'tv';
    poster_path?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    overview?: string;
  }>;
  timestamp: number;
}

export class WatchlistInsightsManager {
  // Create hash from watchlist items
  static createHash(
    watchlistItems: Array<{id: number; type: string}>,
  ): string {
    return watchlistItems
      .map(item => `${item.id}-${item.type}`)
      .sort()
      .join(',');
  }

  // Save insights
  static async saveInsights(
    watchlistHash: string,
    data: {
      insights: string[];
      topGenres: string[];
      averageRating: number;
      decadeDistribution: Record<string, number>;
      recommendations: string;
    },
  ): Promise<void> {
    try {
      const insight: WatchlistInsight = {
        watchlistHash,
        ...data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        `${INSIGHTS_KEY}:${watchlistHash}`,
        JSON.stringify(insight),
      );
      console.log('💾 Saved watchlist insights:', watchlistHash);
    } catch (error) {
      console.error('Error saving insights:', error);
    }
  }

  // Get insights
  static async getInsights(
    watchlistHash: string,
  ): Promise<WatchlistInsight | null> {
    try {
      const data = await AsyncStorage.getItem(
        `${INSIGHTS_KEY}:${watchlistHash}`,
      );
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Error getting insights:', error);
      return null;
    }
  }

  // Save recommendations (TMDB content)
  static async saveRecommendations(
    watchlistHash: string,
    items: WatchlistRecommendation['items'],
  ): Promise<void> {
    try {
      const recommendation: WatchlistRecommendation = {
        watchlistHash,
        items,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        `${RECOMMENDATIONS_KEY}:${watchlistHash}`,
        JSON.stringify(recommendation),
      );
      console.log(
        '💾 Saved watchlist recommendations:',
        watchlistHash,
        items.length,
        'items',
      );
    } catch (error) {
      console.error('Error saving recommendations:', error);
    }
  }

  // Get recommendations
  static async getRecommendations(
    watchlistHash: string,
  ): Promise<WatchlistRecommendation | null> {
    try {
      const data = await AsyncStorage.getItem(
        `${RECOMMENDATIONS_KEY}:${watchlistHash}`,
      );
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return null;
    }
  }

  // Clear old data (call when watchlist changes significantly)
  static async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const insightKeys = keys.filter(
        key =>
          key.startsWith(INSIGHTS_KEY) || key.startsWith(RECOMMENDATIONS_KEY),
      );
      await AsyncStorage.multiRemove(insightKeys);
      console.log('🗑️ Cleared all watchlist insights and recommendations');
    } catch (error) {
      console.error('Error clearing insights:', error);
    }
  }
}
