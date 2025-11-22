import {getRealm} from '../database/realm';
import Realm from 'realm';

export interface WatchlistInsight {
  watchlistHash: string; // Hash of watchlist item IDs
  insights: string[];
  topGenres: string[];
  averageRating: number;
  decadeDistribution: Record<string, number>;
  contentTypeSplit: {movies: number; tvShows: number};
  moodProfile: {
    dominant: string;
    secondary: string;
    traits: string[];
  };
  hiddenGems: Array<{title: string; type: string; reason: string}>;
  contentFreshness: {
    preference: string;
    recentPercentage: number;
    note: string;
  };
  completionInsight: {
    estimatedWatchTime: string;
    bingeability: number;
    suggestion: string;
  };
  recommendations: string;
  recommendedTitles: Array<{
    title: string;
    type: 'movie' | 'tv';
  }>;
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
  static createHash(watchlistItems: Array<{id: number; type: string}>): string {
    return watchlistItems
      .map(item => `${item.id}-${item.type}`)
      .sort()
      .join(',');
  }

  // Save insights
  static async saveInsights(
    watchlistHash: string,
    data: Omit<WatchlistInsight, 'watchlistHash' | 'timestamp'>,
  ): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        realm.create(
          'WatchlistInsight',
          {
            _id: watchlistHash,
            insights: JSON.stringify(data.insights),
            topGenres: JSON.stringify(data.topGenres),
            averageRating: data.averageRating,
            decadeDistribution: JSON.stringify(data.decadeDistribution),
            contentTypeSplit: JSON.stringify(data.contentTypeSplit),
            moodProfile: JSON.stringify(data.moodProfile),
            hiddenGems: JSON.stringify(data.hiddenGems),
            contentFreshness: JSON.stringify(data.contentFreshness),
            completionInsight: JSON.stringify(data.completionInsight),
            recommendations: data.recommendations,
            recommendedTitles: JSON.stringify(data.recommendedTitles),
            timestamp: new Date(),
          },
          Realm.UpdateMode.Modified,
        );
      });
    } catch (error) {}
  }

  // Get insights
  static async getInsights(
    watchlistHash: string,
  ): Promise<WatchlistInsight | null> {
    try {
      const realm = getRealm();
      const insight = realm.objectForPrimaryKey(
        'WatchlistInsight',
        watchlistHash,
      );
      if (insight) {
        return {
          watchlistHash,
          insights: JSON.parse(insight.insights as string),
          topGenres: JSON.parse(insight.topGenres as string),
          averageRating: insight.averageRating as number,
          decadeDistribution: JSON.parse(insight.decadeDistribution as string),
          contentTypeSplit: insight.contentTypeSplit
            ? JSON.parse(insight.contentTypeSplit as string)
            : {movies: 50, tvShows: 50},
          moodProfile: insight.moodProfile
            ? JSON.parse(insight.moodProfile as string)
            : {dominant: 'Varied', secondary: 'Diverse', traits: []},
          hiddenGems: insight.hiddenGems
            ? JSON.parse(insight.hiddenGems as string)
            : [],
          contentFreshness: insight.contentFreshness
            ? JSON.parse(insight.contentFreshness as string)
            : {preference: 'Balanced', recentPercentage: 50, note: ''},
          completionInsight: insight.completionInsight
            ? JSON.parse(insight.completionInsight as string)
            : {estimatedWatchTime: 'Unknown', bingeability: 5, suggestion: ''},
          recommendations: insight.recommendations as string,
          recommendedTitles: insight.recommendedTitles
            ? JSON.parse(insight.recommendedTitles as string)
            : [],
          timestamp: (insight.timestamp as Date).getTime(),
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Save recommendations (TMDB content)
  static async saveRecommendations(
    watchlistHash: string,
    items: WatchlistRecommendation['items'],
  ): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        realm.create(
          'WatchlistRecommendation',
          {
            _id: watchlistHash,
            items: JSON.stringify(items),
            timestamp: new Date(),
          },
          Realm.UpdateMode.Modified,
        );
      });
    } catch (error) {}
  }

  // Get recommendations
  static async getRecommendations(
    watchlistHash: string,
  ): Promise<WatchlistRecommendation | null> {
    try {
      const realm = getRealm();
      const rec = realm.objectForPrimaryKey(
        'WatchlistRecommendation',
        watchlistHash,
      );
      if (rec) {
        return {
          watchlistHash,
          items: JSON.parse(rec.items as string),
          timestamp: (rec.timestamp as Date).getTime(),
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Clear old data (call when watchlist changes significantly)
  static async clearAll(): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const insights = realm.objects('WatchlistInsight');
        const recs = realm.objects('WatchlistRecommendation');
        realm.delete(insights);
        realm.delete(recs);
      });
    } catch (error) {}
  }
}
