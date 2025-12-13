/**
 * Adult Content Filter Utility
 *
 * Comprehensive filtering system to remove adult and inappropriate content from the app.
 * TMDB's adult flag is unreliable, so we use multiple heuristics.
 */

import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {ContentItem} from '../components/MovieList';

// Problematic languages that often contain adult content
// Tagalog content is filtered unless user's region is Philippines
// Maori content is filtered unless user's region is New Zealand
const PROBLEMATIC_LANGUAGES = [
  'tl', // Tagalog (Philippines)
  'mi', // Maori (New Zealand)
];

// Keywords that indicate adult content (case-insensitive)
// Made more specific to avoid false positives
const ADULT_KEYWORDS = [
  // Explicit terms
  'porn',
  'pornography',
  'pornographic',
  ' sex ', // Space-padded to avoid "essex", "sussex", etc.
  'erotic',
  ' adult ', // Space-padded to avoid "adulthood"
  'nude',
  'naked',

  // Common adult film patterns (more specific)
  'milf',
  'stepmom', // More specific than 'step'
  'stepdad',
  'stepsister',
  'stepbrother',
  'stepfather',
  'stepmother',
  'barely legal',
  'hardcore',
  'softcore',

  // Asian adult content indicators
  'jav',
  'av idol',
  'gravure idol', // More specific
  'sod create', // Japanese adult studio
  'prestige adult', // More specific
  'moodyz', // Japanese adult studio
  'idea pocket', // Japanese adult studio
  's1 no.1', // Japanese adult studio
  'attackers', // Japanese adult studio
  'e-body', // Japanese adult studio
  'fitch', // Japanese adult studio
  'wanz', // Japanese adult studio
  'oppai', // Japanese adult term
  'jukujo', // Japanese adult term (mature women)
  'av debut', // Japanese adult film debut
  'uncensored', // Common in Asian adult content
  'japanese mom',

  // Korean adult content patterns
  '19+', // Korean adult rating
  '19금', // Korean adult rating (19-geum)
  'adult movie', // Common in Korean titles
  'rated 19',

  // Chinese adult content patterns
  '三级', // Chinese Category III (adult)
  'category iii', // Hong Kong adult rating
  'cat iii',
  '限制级', // Restricted rating

  // Other indicators
  'hentai',
  'ecchi',
  '18+',
  '18 plus',
  'rated x',
  'x-rated',
  'unrated cut', // More specific than just 'unrated'

  // Tagalog adult content patterns (more specific)
  'vivamax',
  'viva hot',
  'viva films sexy', // More specific
  'scorpio nights', // Known adult film series
  'bold movie', // More specific than just 'bold'
  'sexy movie', // More specific than just 'sexy'
  'scandal movie', // More specific than just 'scandal'

  // General adult film indicators (more specific)
  'adult film',
  'adult video',
  'adult entertainment',
  'for adults only',
  'explicit content',
  'sexual content',
];

// Genre IDs that might indicate adult content
// Note: These are not always adult, but combined with other signals can indicate it
const SUSPICIOUS_GENRE_IDS = [
  // No specific genre IDs as TMDB doesn't have adult genres in mainstream API
  // But we can use this for future expansion
];

// Minimum vote count threshold - adult content often has very low engagement
const MIN_VOTE_COUNT_THRESHOLD = 10;

// Minimum vote average - filter out very low-rated content
const MIN_VOTE_AVERAGE_THRESHOLD = 3.0;

/**
 * Check if content title or overview contains adult keywords
 */
const containsAdultKeywords = (text: string): boolean => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return ADULT_KEYWORDS.some(keyword => lowerText.includes(keyword));
};

/**
 * Check if content is in a problematic language
 * @param language - ISO 639-1 language code
 * @param userRegion - User's region (e.g., 'PH' for Philippines, 'NZ' for New Zealand)
 */
const isProblematicLanguage = (
  language: string,
  userRegion?: string,
): boolean => {
  if (!language) return false;

  // Tagalog content is allowed if user is in Philippines
  if (language === 'tl' && userRegion === 'PH') {
    return false;
  }

  // Maori content is allowed if user is in New Zealand
  if (language === 'mi' && userRegion === 'NZ') {
    return false;
  }

  return PROBLEMATIC_LANGUAGES.includes(language.toLowerCase());
};

/**
 * Check if content has suspicious patterns indicating adult content
 */
const hasSuspiciousPatterns = (item: ContentItem): boolean => {
  const voteCount = (item as any).vote_count;

  // Languages where adult content is more prevalent
  const asianLanguages = ['ja', 'ko', 'zh', 'cn'];
  const isAsianLanguage =
    item.original_language &&
    asianLanguages.includes(item.original_language.toLowerCase());

  // Stricter thresholds for Asian languages
  if (isAsianLanguage) {
    // For Asian languages: be more strict
    // Block if vote count < 50 AND rating < 6.0
    if (voteCount && voteCount < 50 && item.vote_average < 6.0) {
      return true;
    }

    // Also block if very low votes (< 20) regardless of rating
    if (voteCount && voteCount < 20) {
      return true;
    }
  } else {
    // For other languages: use standard thresholds
    // Very low vote count with low rating
    if (
      voteCount &&
      voteCount < MIN_VOTE_COUNT_THRESHOLD &&
      item.vote_average < MIN_VOTE_AVERAGE_THRESHOLD
    ) {
      return true;
    }
  }

  // No poster or backdrop (common for adult content that gets removed)
  if (!item.poster_path && !item.backdrop_path) {
    return true;
  }

  return false;
};

/**
 * Main filter function to determine if content should be blocked
 * @param item - Content item to check
 * @param userRegion - Optional user region for region-specific filtering
 * @returns true if content should be BLOCKED, false if it's safe
 */
export const isAdultContent = (
  item: ContentItem,
  userRegion?: string,
): boolean => {
  // 1. Check TMDB's adult flag (unreliable but still useful)
  if ((item as any).adult === true) {
    return true;
  }

  // 2. Check title for adult keywords
  const title =
    item.type === 'movie' ? (item as Movie).title : (item as TVShow).name;

  if (containsAdultKeywords(title)) {
    return true;
  }

  // 3. Check overview for adult keywords
  if (item.overview && containsAdultKeywords(item.overview)) {
    return true;
  }

  // 4. Check for problematic languages
  if (
    item.original_language &&
    isProblematicLanguage(item.original_language, userRegion)
  ) {
    return true;
  }

  return false;
};

/**
 * Filter an array of content items to remove adult content
 * @param items - Array of content items
 * @param userRegion - Optional user region
 * @returns Filtered array with adult content removed
 */
export const filterAdultContent = <T extends ContentItem>(
  items: T[],
  userRegion?: string,
): T[] => {
  return items.filter(item => !isAdultContent(item, userRegion));
};

/**
 */
export const applyContentSafetyFilter = <T extends ContentItem>(
  items: T[],
  options: {
    userRegion?: string;
    minVoteAverage?: number;
    minVoteCount?: number;
  } = {},
): T[] => {
  return items.filter(item => {
    // Remove adult content
    if (isAdultContent(item, options.userRegion)) {
      return false;
    }

    // Apply minimum vote average if specified
    if (
      options.minVoteAverage !== undefined &&
      item.vote_average < options.minVoteAverage
    ) {
      return false;
    }

    // Apply minimum vote count if specified
    if (options.minVoteCount !== undefined) {
      const voteCount = (item as any).vote_count;
      if (voteCount && voteCount < options.minVoteCount) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Debug function to log why content was filtered (dev only)
 */
export const debugContentFilter = (
  item: ContentItem,
  userRegion?: string,
): void => {
  if (!__DEV__) return;

  const reasons: string[] = [];

  if ((item as any).adult === true) {
    reasons.push('TMDB adult flag');
  }

  const title =
    item.type === 'movie' ? (item as Movie).title : (item as TVShow).name;

  if (containsAdultKeywords(title)) {
    reasons.push(`Adult keyword in title: "${title}"`);
  }

  if (item.overview && containsAdultKeywords(item.overview)) {
    reasons.push('Adult keyword in overview');
  }

  if (
    item.original_language &&
    isProblematicLanguage(item.original_language, userRegion)
  ) {
    reasons.push(`Problematic language: ${item.original_language}`);
  }

  if (reasons.length > 0) {
    console.log(`[Adult Filter] Blocked: ${title}`, reasons);
  }
};

/**
 * Helper to filter TMDB API responses (works with both movies and TV shows)
 * Use this in hooks to filter results before returning
 *
 * @example
 * const response = await getMovies('popular', page);
 * return {
 *   ...response,
 *   results: filterTMDBResponse(response.results, 'movie'),
 * };
 */
export const filterTMDBResponse = <T extends Movie | TVShow>(
  items: T[],
  type: 'movie' | 'tv',
  userRegion?: string,
): T[] => {
  return items.filter(item => {
    const contentItem: ContentItem = {
      ...item,
      type: type,
    } as ContentItem;

    const shouldBlock = isAdultContent(contentItem, userRegion);

    if (shouldBlock && __DEV__) {
      const title =
        type === 'movie' ? (item as Movie).title : (item as TVShow).name;
      console.log(`[Adult Filter] Blocked ${type}: ${title}`);
    }

    return !shouldBlock;
  });
};
