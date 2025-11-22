import axios from 'axios';
// @ts-ignore
import * as cheerio from 'cheerio-without-node-native';
import {getMovie} from '../database/contentCache';

const headers = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
  'sec-ch-ua':
    '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
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

    // Debug: Log available script tags
    console.log('[IMDB Scraping] Found script tags:', {
      jsonLdCount: $('script[type="application/ld+json"]').length,
      hasNextData: $('#__NEXT_DATA__').length > 0,
      totalScripts: $('script').length,
    });

    // Method 1: Try to find JSON-LD structured data (most reliable)
    let rating: string | null = null;
    let voteCount: string | null = null;

    $('script[type="application/ld+json"]').each((_i: any, elem: any) => {
      try {
        const jsonData = JSON.parse($(elem).html() || '');
        console.log('[IMDB Scraping] Checking JSON-LD:', Object.keys(jsonData));
        if (jsonData.aggregateRating) {
          rating = jsonData.aggregateRating.ratingValue?.toString();
          voteCount = jsonData.aggregateRating.ratingCount?.toString();
          console.log('[IMDB Scraping] Found rating in JSON-LD:', {
            rating,
            voteCount,
          });
        }
      } catch (e) {
        console.log('[IMDB Scraping] JSON-LD parse error:', e);
      }
    });

    // Method 2: Try to find in __NEXT_DATA__ (Next.js data)
    if (!rating) {
      const nextDataScript = $('#__NEXT_DATA__').html();
      if (nextDataScript) {
        try {
          const nextData = JSON.parse(nextDataScript);
          console.log('[IMDB Scraping] __NEXT_DATA__ structure:', {
            hasProps: !!nextData?.props,
            hasPageProps: !!nextData?.props?.pageProps,
            pagePropsKeys: nextData?.props?.pageProps
              ? Object.keys(nextData.props.pageProps)
              : [],
          });

          // Try different paths in __NEXT_DATA__
          const ratingData =
            nextData?.props?.pageProps?.aboveTheFoldData?.aggregateRating ||
            nextData?.props?.pageProps?.mainColumnData?.aggregateRating;

          if (ratingData) {
            rating =
              ratingData.aggregateRating?.toString() ||
              ratingData.ratingValue?.toString();
            voteCount =
              ratingData.voteCount?.toString() ||
              ratingData.ratingCount?.toString();
            console.log('[IMDB Scraping] Found rating in __NEXT_DATA__:', {
              rating,
              voteCount,
            });
          }
        } catch (e) {
          console.log('[IMDB Scraping] Could not parse __NEXT_DATA__:', e);
        }
      } else {
        console.log('[IMDB Scraping] No __NEXT_DATA__ found');
      }
    }

    // Method 3: Try the original DOM-based approach as fallback
    if (!rating) {
      const ratingContainer = $(
        '[data-testid="hero-rating-bar__aggregate-rating"]',
      );

      rating = ratingContainer
        .find('[data-testid="hero-rating-bar__aggregate-rating__score"]')
        .text()
        .split('/')[0]
        .trim();

      voteCount = ratingContainer
        .find('[data-testid="hero-rating-bar__aggregate-rating__score"]')
        .first()
        .next()
        .next()
        .text()
        .trim();

      if (rating) {
        console.log('[IMDB Scraping] Found rating in DOM:', {
          rating,
          voteCount,
        });
      }
    }

    if (!rating) {
      console.log('[IMDB Scraping] No rating found on page');
      return null;
    }

    // Format vote count if it's a plain number
    const formattedVoteCount =
      voteCount &&
      !voteCount.includes('M') &&
      !voteCount.includes('K') &&
      !isNaN(Number(voteCount))
        ? formatVoteCount(Number(voteCount))
        : voteCount || '';

    // Cache in Realm if movieId provided
    if (movieId && rating) {
      try {
        const {getRealm} = await import('../database/realm');
        const realm = getRealm();
        realm.write(() => {
          const movie = realm.objectForPrimaryKey('Movie', movieId);
          if (movie) {
            movie.ai_imdb_rating = parseFloat(rating);
            movie.ai_imdb_votes = parseVoteCount(formattedVoteCount);
            movie.ai_ratings_cached_at = new Date();
            console.log('[IMDB Scraping] Cached rating in Realm:', rating);
          }
        });
      } catch (cacheError) {
        console.error('[IMDB Scraping] Error caching to Realm:', cacheError);
      }
    }

    return {rating, voteCount: formattedVoteCount};
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
