import {RealmHistoryManager} from '../database/managers';

export interface Collaboration {
  person1: {
    id: number;
    name: string;
    type: string;
    profile_path?: string;
  };
  person2: {
    id: number;
    name: string;
    type: string;
    profile_path?: string;
  };
  filmCount: number;
  films: Array<{
    id: number;
    title: string;
    poster_path?: string;
  }>;
}

export interface ExplorationStats {
  mostExploredYear: number | null;
  yearCounts: Map<number, number>;
  favoriteDecade: string | null;
  averageRating: number;
  totalRuntime: number; // in minutes
}

export interface GenrePreference {
  id: number;
  name: string;
  count: number;
  percentage: number;
}

export interface LanguageDiversity {
  totalLanguages: number;
  topLanguages: Array<{
    code: string;
    name: string;
    count: number;
    percentage: number;
  }>;
  totalCountries: number;
  topCountries: Array<{code: string; name: string; count: number}>;
}

export interface CollectionProgress {
  name: string;
  directorId?: number;
  directorName?: string;
  completed: number;
  total: number;
  percentage: number;
  films: Array<{id: number; title: string; watched: boolean}>;
}

export const getExplorationStats = async (): Promise<ExplorationStats> => {
  try {
    const history = await RealmHistoryManager.getAll();

    if (history.length === 0) {
      return {
        mostExploredYear: null,
        yearCounts: new Map(),
        favoriteDecade: null,
        averageRating: 0,
        totalRuntime: 0,
      };
    }

    const yearCounts = new Map<number, number>();
    let totalRating = 0;
    let ratingCount = 0;
    let totalRuntime = 0;

    history.forEach(item => {
      // Extract year
      const dateStr = item.release_date || item.first_air_date;
      if (dateStr) {
        const year = parseInt(dateStr.split('-')[0]);
        if (!isNaN(year)) {
          yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
        }
      }

      // Calculate average rating
      if (item.vote_average && item.vote_average > 0) {
        totalRating += item.vote_average;
        ratingCount++;
      }

      // Calculate total runtime
      if (item.runtime) {
        totalRuntime += item.runtime;
      }
    });

    // Find most explored year
    let mostExploredYear: number | null = null;
    let maxCount = 0;
    yearCounts.forEach((count, year) => {
      if (count > maxCount) {
        maxCount = count;
        mostExploredYear = year;
      }
    });

    // Find favorite decade
    const decadeCounts = new Map<string, number>();
    yearCounts.forEach((count, year) => {
      const decade = `${Math.floor(year / 10) * 10}s`;
      decadeCounts.set(decade, (decadeCounts.get(decade) || 0) + count);
    });

    let favoriteDecade: string | null = null;
    let maxDecadeCount = 0;
    decadeCounts.forEach((count, decade) => {
      if (count > maxDecadeCount) {
        maxDecadeCount = count;
        favoriteDecade = decade;
      }
    });

    return {
      mostExploredYear,
      yearCounts,
      favoriteDecade,
      averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
      totalRuntime,
    };
  } catch (error) {
    return {
      mostExploredYear: null,
      yearCounts: new Map(),
      favoriteDecade: null,
      averageRating: 0,
      totalRuntime: 0,
    };
  }
};

// Genre mapping (TMDB genre IDs)
const GENRE_MAP: {[key: number]: string} = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

export const getGenrePreferences = async (): Promise<GenrePreference[]> => {
  try {
    const history = await RealmHistoryManager.getAll();

    if (history.length === 0) return [];

    const genreCounts = new Map<number, number>();
    let totalGenres = 0;
    let itemsWithGenres = 0;

    history.forEach(item => {
      if (item.genre_ids) {
        try {
          const genres = JSON.parse(item.genre_ids);
          itemsWithGenres++;
          genres.forEach((genreId: number) => {
            genreCounts.set(genreId, (genreCounts.get(genreId) || 0) + 1);
            totalGenres++;
          });
        } catch (e) {}
      }
    });

    const preferences: GenrePreference[] = Array.from(genreCounts.entries())
      .map(([id, count]) => ({
        id,
        name: GENRE_MAP[id] || 'Unknown',
        count,
        percentage: (count / history.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 genres

    return preferences;
  } catch (error) {
    return [];
  }
};

// Language code to name mapping
const LANGUAGE_MAP: {[key: string]: string} = {
  en: 'English',
  ko: 'Korean',
  ja: 'Japanese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  zh: 'Chinese',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  pt: 'Portuguese',
  ru: 'Russian',
  ar: 'Arabic',
  th: 'Thai',
};

// Country code to name mapping
const COUNTRY_MAP: {[key: string]: string} = {
  US: 'USA',
  KR: 'South Korea',
  JP: 'Japan',
  GB: 'United Kingdom',
  FR: 'France',
  DE: 'Germany',
  IT: 'Italy',
  CN: 'China',
  IN: 'India',
  ES: 'Spain',
  CA: 'Canada',
  AU: 'Australia',
  MX: 'Mexico',
  BR: 'Brazil',
  RU: 'Russia',
};

export const getLanguageDiversity = async (): Promise<LanguageDiversity> => {
  try {
    const history = await RealmHistoryManager.getAll();

    if (history.length === 0) {
      return {
        totalLanguages: 0,
        topLanguages: [],
        totalCountries: 0,
        topCountries: [],
      };
    }

    const languageCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();

    history.forEach(item => {
      // Count languages
      if (item.original_language) {
        const lang = item.original_language;
        languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1);
      }

      // Count countries
      if (item.origin_country) {
        try {
          const countries = JSON.parse(item.origin_country);
          countries.forEach((country: string) => {
            countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
          });
        } catch (e) {
          // Skip invalid JSON
        }
      }
    });

    const topLanguages = Array.from(languageCounts.entries())
      .map(([code, count]) => ({
        code,
        name: LANGUAGE_MAP[code] || code.toUpperCase(),
        count,
        percentage: (count / history.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const topCountries = Array.from(countryCounts.entries())
      .map(([code, count]) => ({
        code,
        name: COUNTRY_MAP[code] || code,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalLanguages: languageCounts.size,
      topLanguages,
      totalCountries: countryCounts.size,
      topCountries,
    };
  } catch (error) {
    return {
      totalLanguages: 0,
      topLanguages: [],
      totalCountries: 0,
      topCountries: [],
    };
  }
};

export const getCollectionProgress = async (): Promise<
  CollectionProgress[]
> => {
  try {
    const history = await RealmHistoryManager.getAll();

    if (history.length === 0) return [];

    // Get top directors from history
    const directorCounts = new Map<number, {name: string; count: number}>();

    history.forEach(item => {
      if (item.directors) {
        try {
          const directors = JSON.parse(item.directors);
          directors.forEach((d: any) => {
            const existing = directorCounts.get(d.id);
            if (existing) {
              existing.count++;
            } else {
              directorCounts.set(d.id, {name: d.name, count: 1});
            }
          });
        } catch (e) {
          // Skip
        }
      }
    });

    // Get top 3 directors with at least 3 films
    const topDirectors = Array.from(directorCounts.entries())
      .filter(([_, data]) => data.count >= 3)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3);

    // For now, return simple progress based on watched films
    // In a real implementation, you'd fetch full filmographies from TMDB
    const collections: CollectionProgress[] = topDirectors.map(([id, data]) => {
      // Estimate total films (this is a placeholder - would need TMDB API call)
      const estimatedTotal = Math.max(data.count + 2, 10);

      return {
        name: `${data.name} Collection`,
        directorId: id,
        directorName: data.name,
        completed: data.count,
        total: estimatedTotal,
        percentage: (data.count / estimatedTotal) * 100,
        films: [], // Would populate with actual filmography
      };
    });

    return collections;
  } catch (error) {
    return [];
  }
};
