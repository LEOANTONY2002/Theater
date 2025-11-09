import axios from 'axios';
// @ts-ignore
import * as cheerio from 'cheerio-without-node-native';
import {getMovie} from '../database/contentCache';

const headers = {
  'User-Agent': 'PostmanRuntime/7.45.0',
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  Referer: 'https://www.google.com/',
};

/**
 * Get IMDB rating by scraping with Realm caching
 * @param id - IMDB ID (e.g., "tt1234567")
 * @param movieId - TMDB movie ID for caching in Realm
 */
export const getIMDBRating = async (
  id: string,
  movieId?: number,
): Promise<{rating: string; voteCount: string; director?: string} | null> => {
  // Check Realm cache first if movieId provided
  if (movieId) {
    const cached = getMovie(movieId);
    if (cached?.ai_ratings_cached_at) {
      // Check if ratings are still valid (6 months)
      const age = Date.now() - (cached.ai_ratings_cached_at as Date).getTime();
      if (age < 180 * 24 * 60 * 60 * 1000) {
        if (cached.ai_imdb_rating != null) {
          console.log('[IMDB Scraping] Using cached rating from Realm');
          return {
            rating: cached.ai_imdb_rating.toString(),
            voteCount: cached.ai_imdb_votes
              ? formatVoteCount(cached.ai_imdb_votes)
              : '',
            director: undefined,
          };
        }
      }
    }
  }

  // If no cache or stale, scrape from IMDB
  try {
    if (!id || id === '') {
      console.log('[IMDB Scraping] No IMDB ID provided');
      return null;
    }

    console.log('[IMDB Scraping] Fetching from IMDB:', id);
    const response = await axios.get(`https://imdb.com/title/${id}`, {
      headers,
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    // Get the rating container first
    const ratingContainer = $(
      '[data-testid="hero-rating-bar__aggregate-rating"]',
    );

    // Extract rating from the score element
    const rating = ratingContainer
      .find('[data-testid="hero-rating-bar__aggregate-rating__score"]')
      .text()
      .split('/')[0] // Gets "7.2" from "7.2/10"
      .trim();

    // Vote count is in the element that comes after the score element
    const voteCountText = ratingContainer
      .find('[data-testid="hero-rating-bar__aggregate-rating__score"]')
      .first()
      .next() // Skip the empty div (.sc-4dc495c1-5)
      .next() // Get the vote count element
      .text()
      .trim();

    const director = $(
      'li[data-testid="title-pc-principal-credit"] .ipc-metadata-list-item__list-content-item',
    )
      .first()
      .text()
      .trim();

    if (!rating) {
      console.log('[IMDB Scraping] No rating found on page');
      return null;
    }

    // Cache in Realm if movieId provided
    if (movieId) {
      try {
        const {getRealm} = await import('../database/realm');
        const realm = getRealm();
        realm.write(() => {
          const movie = realm.objectForPrimaryKey('Movie', movieId);
          if (movie) {
            movie.ai_imdb_rating = parseFloat(rating);
            movie.ai_imdb_votes = parseVoteCount(voteCountText);
            movie.ai_ratings_cached_at = new Date();
            console.log('[IMDB Scraping] Cached rating in Realm:', rating);
          }
        });
      } catch (cacheError) {
        console.error('[IMDB Scraping] Error caching to Realm:', cacheError);
      }
    }

    return {rating, voteCount: voteCountText, director};
  } catch (error) {
    console.error('[IMDB Scraping] Error:', error);
    return null;
  }
};

/**
 * Parse vote count string to number (e.g., "1.2M" -> 1200000)
 */
function parseVoteCount(voteCountText: string): number | null {
  if (!voteCountText) return null;
  try {
    // Remove parentheses and commas
    const cleaned = voteCountText.replace(/[(),]/g, '').trim();
    if (cleaned.endsWith('M')) {
      return Math.round(parseFloat(cleaned) * 1000000);
    } else if (cleaned.endsWith('K')) {
      return Math.round(parseFloat(cleaned) * 1000);
    } else {
      return parseInt(cleaned.replace(/\D/g, ''), 10) || null;
    }
  } catch {
    return null;
  }
}

/**
 * Format vote count number to string (e.g., 1200000 -> "1.2M")
 */
function formatVoteCount(votes: number): string {
  if (votes >= 1000000) {
    return `${(votes / 1000000).toFixed(1)}M`;
  } else if (votes >= 1000) {
    return `${(votes / 1000).toFixed(1)}K`;
  }
  return votes.toString();
}

export const getIMDBSeriesRating = async (title: string, year: string) => {
  try {
    const response = await axios.get(
      `https://imdb.com/find?title=${title}&title_type=tv_series&release_date=${year}`,
      {
        headers,
      },
    );

    const $ = cheerio.load(response.data);
    // Step 1: find the span with aria-label starting with "IMDb rating:"
    const imdbRatingSpan = $('span[aria-label^="IMDb rating:"]').first();

    // Step 2: get its child spans
    const rating = imdbRatingSpan.find('span').first().text().trim();
    const voteCount = imdbRatingSpan
      .find('span')
      .eq(1)
      .text()
      .replace(/[()]/g, '')
      .trim();

    return {rating, voteCount};
  } catch (error) {}
};
