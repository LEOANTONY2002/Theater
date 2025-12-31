import {AISettingsManager} from '../store/aiSettings';
import {cache, CACHE_KEYS} from '../utils/cache';
import {searchMovies, searchTVShows} from './tmdb';
import {getMovie, getTVShow} from '../database/contentCache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AI_CONFIG} from '../config/aiConfig';

// Default fallback values
const DEFAULT_MODEL = AI_CONFIG.DEFAULT_MODEL; // Fast, latest data
const GROQ_API_URL = AI_CONFIG.GROQ_API_URL;
// Note: Do NOT hardcode API keys. Users must provide their own key via settings.

// Dynamic function to get current settings
const getGroqConfig = async () => {
  const settings = await AISettingsManager.getSettings();

  try {
    return {
      model: settings.model || DEFAULT_MODEL,
      apiKey: settings.apiKey,
      apiUrl: GROQ_API_URL,
    };
  } catch (error) {
    return {
      model: DEFAULT_MODEL,
      apiKey: settings.apiKey,
      apiUrl: GROQ_API_URL,
    };
  }
};

interface GroqMessage {
  role: 'user' | 'model';
  parts: Array<{text: string}>;
}

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

async function callGroq(
  messages: OpenAIMessage[],
  modelOverride?: string,
): Promise<string> {
  const config = await getGroqConfig();
  const selectedModel = modelOverride || config.model;

  if (
    !config.apiKey ||
    typeof config.apiKey !== 'string' ||
    config.apiKey.trim().length === 0
  ) {
    throw new Error('NO_API_KEY: Please set your Groq API key in AI Settings');
  }

  // Groq Compound API request body (official SDK format)
  const requestBody: any = {
    model: selectedModel,
    messages,
    compound_custom: {
      tools: {
        enabled_tools: ['web_search', 'code_interpreter', 'visit_website'],
      },
    },
    temperature: 1,
    top_p: 1,
  };

  // Add Compound-specific settings if using compound model
  // Handle both "compound" and "groq/compound" model names
  if (
    selectedModel === 'groq/compound' ||
    selectedModel === 'compound' ||
    selectedModel?.includes('compound') ||
    selectedModel === 'groq/compound-mini'
  ) {
    const isMini = selectedModel.includes('mini');
    requestBody.compound_custom = {
      tools: {
        enabled_tools: [
          'web_search', // Real-time web search for ratings, facts
          'code_interpreter', // Data analysis
          'visit_website', // Visit specific URLs (IMDB, RT, etc)
        ],
      },
    };
    // Ensure model is set correctly
    requestBody.model = isMini ? 'groq/compound-mini' : 'groq/compound';
  }

  // Retry logic with exponential backoff
  const maxRetries = 4;
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    try {
      console.log('Groq request: attempt', attempt, requestBody);
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Groq response: attempt', attempt, response);

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');

        // Extract rate limit information from headers
        let retryAfter: number | null = null;
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('retry-after');
          const rateLimitReset = response.headers.get(
            'x-ratelimit-reset-requests',
          );

          if (retryAfterHeader) {
            retryAfter = parseInt(retryAfterHeader, 10);
          } else if (rateLimitReset) {
            // Calculate seconds until reset
            const resetTime = new Date(rateLimitReset).getTime();
            const now = Date.now();
            retryAfter = Math.ceil((resetTime - now) / 1000);
          }
        }

        const enriched = new Error(
          `HTTP ${response.status}: ${bodyText || response.statusText}`,
        ) as any;

        // Attach retry-after info to error for 429 responses
        if (response.status === 429) {
          console.error('[Groq] Rate limit hit (429)');
          if (retryAfter) {
            enriched.retryAfter = retryAfter;
            console.warn(`[Groq] Retry suggested after ${retryAfter} seconds`);
          }
        }

        // Retry on 5xx errors
        if (
          response.status >= 500 &&
          response.status < 600 &&
          attempt < maxRetries
        ) {
          attempt += 1;
          const delay = 600 * Math.pow(2, attempt - 1) + Math.random() * 250;
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        throw enriched;
      }

      const data = await response.json();

      // Extract text from OpenAI/Groq response format
      const generatedText = data.choices?.[0]?.message?.content;

      if (!generatedText) {
        throw new Error('NO_CONTENT: Groq returned no generated text');
      }

      return generatedText;
    } catch (error) {
      lastError = error;
      const errObj: any = error;
      const message = String(errObj?.message || errObj);
      const shouldRetry =
        /Network request failed|fetch failed|ECONNRESET|ETIMEDOUT/i.test(
          message,
        ) && attempt < maxRetries;

      if (shouldRetry) {
        attempt += 1;
        const delay = 600 * Math.pow(2, attempt - 1) + Math.random() * 250;
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Unknown error calling Groq');
}

// Optimization: Get ALL AI content in 1 call (Ratings, Trivia, Tags, Similar)
export async function getContentAnalysis({
  title,
  year,
  overview,
  genres,
  type,
  contentId,
  skipImdb = false,
  releaseDate,
}: {
  title: string;
  year?: string;
  overview: string;
  genres: string;
  type: 'movie' | 'tv';
  contentId?: number;
  skipImdb?: boolean;
  releaseDate?: string;
}): Promise<{
  ratings?: {
    imdb?: number | null;
    rotten_tomatoes?: number | null;
    imdb_votes?: number | null;
    source?: string;
  };
  trivia?: Array<{
    fact: string;
    category: 'Production' | 'Cast' | 'Behind the Scenes' | 'Fun Fact';
  }>;
  tags?: {
    thematicTags: Array<{tag: string; description: string; confidence: number}>;
    emotionalTags: Array<{
      tag: string;
      description: string;
      confidence: number;
    }>;
  };
  similar?: Array<{title: string; year: string}>;
} | null> {
  // 1. Check Realm Cache for ALL fields
  if (contentId) {
    const {getMovie, getTVShow} = await import('../database/contentCache');
    const cached =
      type === 'movie' ? getMovie(contentId) : getTVShow(contentId);

    if (cached) {
      const hasRatings =
        cached.ai_ratings_cached_at &&
        Date.now() - (cached.ai_ratings_cached_at as Date).getTime() <
          180 * 24 * 60 * 60 * 1000; // 6 months
      const hasTrivia = !!cached.ai_trivia;
      const hasTags = !!cached.ai_tags;
      const hasSimilar = !!cached.ai_similar;

      // If we have EVERYTHING efficient, return cached
      if (hasRatings && hasTrivia && hasTags && hasSimilar) {
        // Validate that "hasTrivia" isn't just an empty array
        const triviaStr = cached.ai_trivia || '[]';
        // Quick check without parsing everything if possible
        const isTriviaEmpty = triviaStr === '[]' || triviaStr.length < 5;

        if (!isTriviaEmpty) {
          try {
            const ratings = {
              imdb: cached.ai_imdb_rating as number | null,
              rotten_tomatoes: cached.ai_rotten_tomatoes as number | null,
              imdb_votes: cached.ai_imdb_votes as number | null,
              source: 'cached',
            };

            let trivia: Array<{
              fact: string;
              category:
                | 'Production'
                | 'Cast'
                | 'Behind the Scenes'
                | 'Fun Fact';
            }> = [];
            let tags = undefined;
            let similar: Array<{title: string; year: string}> = [];

            if (cached.ai_trivia) {
              const parsedTrivia = JSON.parse(cached.ai_trivia);
              if (Array.isArray(parsedTrivia)) {
                // Handle both raw strings (legacy/current prompt) and objects (future)
                trivia = parsedTrivia.map((item: any) => {
                  if (typeof item === 'string') {
                    return {
                      fact: item,
                      category: [
                        'Production',
                        'Cast',
                        'Behind the Scenes',
                        'Fun Fact',
                      ][Math.floor(Math.random() * 4)] as
                        | 'Production'
                        | 'Cast'
                        | 'Behind the Scenes'
                        | 'Fun Fact',
                    };
                  }
                  return item;
                });
              }
            }
            if (cached.ai_tags) tags = JSON.parse(cached.ai_tags);
            if (cached.ai_similar) similar = JSON.parse(cached.ai_similar);

            return {
              ratings,
              trivia,
              tags,
              similar,
            };
          } catch (e) {
            /* ignore parse errors, continue to fetch */
          }
        }
      }
    }
  }

  const yearSuffix = year ? ` (${year})` : '';

  // Truncate overview to prevent "Request Entity Too Large" errors
  const truncatedOverview =
    overview.length > 500 ? overview.substring(0, 500) + '...' : overview;

  // 2. Construct Master Prompt
  const system = {
    role: 'system' as const,
    content: `Expert analyst. Analyze ${type} "${title}${yearSuffix}".
    Return SINGLE JSON:
    1. "ratings": {"imdb": 0.0-10.0, "rotten_tomatoes": 0-100, "imdb_votes": int}
    2. "trivia": ["5 rare facts"]
    3. "tags": {"thematicTags": [{"tag": "str", "description": "str", "confidence": 0-1}], "emotionalTags": [{"tag": "str", "description": "str", "confidence": 0-1}]}
    4. "similar": [{"title": "str", "year": "YYYY"}] (5 narrative-based)
    
    If data is unknown, return null or empty array for that field. DO NOT explain lack of info or NO placeholders.
    JSON ONLY. No talk.`,
  };

  const user = {
    role: 'user' as const,
    content: `Analyze "${title}${yearSuffix}"`,
  };

  // 2.5 Determine Model Strategy
  let modelsToTry: Array<string | undefined> = [undefined]; // Start with App Model (undefined uses config.model)

  if (releaseDate) {
    const release = new Date(releaseDate);
    const now = new Date();
    const diffDays =
      (now.getTime() - release.getTime()) / (1000 * 60 * 60 * 24);

    // If released within 60 days (or in the future), use Compound strategy
    if (diffDays <= 60) {
      console.log(
        `[AI Strategy] Fresh content detected (${diffDays.toFixed(
          0,
        )} days old). Using Compound strategy.`,
      );
      modelsToTry = ['groq/compound-mini', 'groq/compound', undefined];
    }
  }

  try {
    let response = '';
    let success = false;
    let lastError: any = null;

    for (const modelCandidate of modelsToTry) {
      try {
        const isCompound = modelCandidate?.includes('compound');
        const finalSystem = isCompound
          ? {
              ...system,
              content:
                system.content +
                ' No research tables, preamble, or notes. Start { and end }.',
            }
          : system;

        response = await callGroq([finalSystem, user], modelCandidate);
        success = true;
        break;
      } catch (error: any) {
        lastError = error;
        // If it's a rate limit (429) and we have more models to try, move to the next
        if (
          error?.message?.includes('429') &&
          modelsToTry.indexOf(modelCandidate) < modelsToTry.length - 1
        ) {
          console.warn(
            `[AI Strategy] Rate limited on ${
              modelCandidate || 'App Model'
            }. Falling back...`,
          );
          continue;
        }
        throw error; // Re-throw if not a rate limit or no more fallbacks
      }
    }

    if (!success) throw lastError;
    console.log('Groq response:', response);

    // 3. Parse Response
    let parsed: any = null;
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      parsed = JSON.parse(response);
    }

    if (!parsed) return null;

    // Helper to parse ratings that might be strings or mis-scaled
    const parseRating = (val: any, isImdb = false): number | null => {
      if (val === undefined || val === null) return null;
      let num = 0;
      if (typeof val === 'number') {
        num = val;
      } else if (typeof val === 'string') {
        const cleaned = val.replace(/[^0-9.]/g, '');
        num = parseFloat(cleaned);
      } else {
        return null;
      }

      if (isNaN(num)) return null;

      // Special case: if IMDb rating > 10, AI likely returned it as a percentage
      if (isImdb && num > 10) {
        return parseFloat((num / 10).toFixed(1));
      }

      return num;
    };

    const result = {
      ratings:
        parsed.ratings && Object.keys(parsed.ratings).length > 0
          ? {
              imdb: skipImdb
                ? undefined
                : parseRating(parsed.ratings?.imdb, true),
              rotten_tomatoes: parseRating(
                parsed.ratings?.rotten_tomatoes || parsed.ratings?.rt,
              ),
              imdb_votes: skipImdb
                ? undefined
                : parseRating(parsed.ratings?.imdb_votes),
              source: 'ai',
            }
          : null,
      trivia:
        parsed.trivia &&
        Array.isArray(parsed.trivia) &&
        parsed.trivia.length > 0
          ? parsed.trivia.map((t: any) => {
              if (typeof t === 'string') {
                return {
                  fact: t,
                  category: [
                    'Production',
                    'Cast',
                    'Behind the Scenes',
                    'Fun Fact',
                  ][Math.floor(Math.random() * 4)],
                };
              }
              return t;
            })
          : null,
      tags:
        parsed.tags &&
        (Array.isArray(parsed.tags.thematicTags) ||
          Array.isArray(
            parsed.tags.emotionalTags || parsed.tags.emotionalTones,
          ))
          ? {
              thematicTags: (Array.isArray(parsed.tags.thematicTags)
                ? parsed.tags.thematicTags
                : []
              ).map((t: any) =>
                typeof t === 'string'
                  ? {tag: t, description: '', confidence: 0.8}
                  : t,
              ),
              emotionalTags: (Array.isArray(
                parsed.tags.emotionalTags || parsed.tags.emotionalTones,
              )
                ? parsed.tags.emotionalTags || parsed.tags.emotionalTones
                : []
              ).map((t: any) =>
                typeof t === 'string'
                  ? {tag: t, description: '', confidence: 0.8}
                  : t,
              ),
            }
          : null,
      similar:
        Array.isArray(parsed.similar) && parsed.similar.length > 0
          ? parsed.similar
          : null,
    };

    // 5. Cache in Realm
    if (contentId) {
      const {getRealm} = await import('../database/realm');
      const realm = getRealm();
      realm.write(() => {
        const content =
          type === 'movie'
            ? realm.objectForPrimaryKey('Movie', contentId)
            : realm.objectForPrimaryKey('TVShow', contentId);

        if (content) {
          // Update Ratings
          if (result.ratings) {
            if (
              !skipImdb &&
              result.ratings.imdb !== undefined &&
              result.ratings.imdb !== null
            )
              content.ai_imdb_rating = result.ratings.imdb;
            if (
              !skipImdb &&
              result.ratings.imdb_votes !== undefined &&
              result.ratings.imdb_votes !== null
            )
              content.ai_imdb_votes = result.ratings.imdb_votes;
            if (
              result.ratings.rotten_tomatoes !== undefined &&
              result.ratings.rotten_tomatoes !== null
            )
              content.ai_rotten_tomatoes = result.ratings.rotten_tomatoes;

            if (
              result.ratings.imdb !== null ||
              result.ratings.rotten_tomatoes !== null
            )
              content.ai_ratings_cached_at = new Date();
          }

          // Update Trivia
          if (parsed.trivia && Array.isArray(parsed.trivia)) {
            content.ai_trivia = JSON.stringify(parsed.trivia);
          }

          // Update Tags (and add to Global Tags Manager if needed, but we can do that in the hook)
          if (result.tags) {
            content.ai_tags = JSON.stringify(result.tags);
          }

          // Update Similar
          if (result.similar && result.similar.length > 0) {
            content.ai_similar = JSON.stringify(result.similar);
          }
        }
      });
    }

    return result as any;
  } catch (error) {
    console.warn('[getContentAnalysis] Failed:', error);
    return null;
  }
}

// For Movie/Show Details: get similar by story
export async function getSimilarByStory({
  title,
  overview,
  genres,
  type,
  contentId,
}: {
  title: string;
  overview: string;
  genres: string;
  type: 'movie' | 'tv';
  contentId?: number;
}) {
  // Check Realm cache first
  if (contentId) {
    const cached =
      type === 'movie' ? getMovie(contentId) : getTVShow(contentId);
    if (cached?.ai_similar) {
      try {
        const parsed = JSON.parse(cached.ai_similar);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
  }

  // NOTE: Redundant AI call removed!
  // getContentAnalysis() already fetches similar content in a single call.
  // This function now ONLY returns cached data to avoid duplicate API calls.
  // If cache is empty, return empty array (UI will handle gracefully).
  return [];
}

// For Online AI Chat (cinema only)
export async function cinemaChat(
  messages: {role: 'user' | 'assistant' | 'system'; content: string}[],
): Promise<{aiResponse: string; arr: any[]}> {
  const system = {
    role: 'system' as const,
    content: `You are an expert cinema assistant called Theater AI. 
      Only answer questions related to movies, TV, actors, directors, film history, and cinema. 
      Politely refuse unrelated questions. 
      IMPORTANT: Whenever you suggest any movies/TV shows, include an array only at the last line of the message response containing exact title, year, exact type ("movie" or "tv"), and original_language (ISO 639-1 like "en", "fr"). Should contain all the movies/TV shows suggested in the response.
      The array should be the last line of the WHOLE RESPONSE. Don't include multiple arrays.
      JSON Format: [{"title": "Title1", "year": "2024", "type": "movie", "original_language": "en"}, {"title": "Title2", "year": "2025", "type": "tv", "original_language": "ja"}].
      `,
  };

  const GroqMessages = [system, ...messages];
  try {
    const response = await callGroq(GroqMessages);

    let arr = [];

    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[.*?\]/s);

    if (jsonMatch) {
      arr = JSON.parse(jsonMatch[0] || '[]');
    }

    // AI Response without JSON
    const aiResponse = response.replace(/\[.*?\]/s, '');

    return {aiResponse, arr};
  } catch (error) {
    throw error;
  }
}

// For My Next Watch: get personalized recommendations based on mood
export async function getPersonalizedRecommendation(
  moodAnswers: {[key: string]: string} | null,
  feedbackHistory: Array<{
    contentId: number;
    title: string;
    liked: boolean;
    timestamp: number;
  }>,
): Promise<any> {
  // Create a cache key based on mood answers and recent feedback
  // Include latest 10 feedback items to ensure cache invalidation on feedback changes
  const feedbackKey =
    feedbackHistory.length > 0
      ? feedbackHistory
          .slice(0, 10)
          .map(f => `${f.contentId}_${f.liked ? 'L' : 'D'}`)
          .join(',')
      : 'none';

  const cacheKey = `@mynextwatch_rec:${JSON.stringify(
    moodAnswers,
  )}:${feedbackKey}`;

  // Try to get from AsyncStorage first (persists across app restarts)
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      console.log(
        '[MyNextWatch] Returning cached recommendation from AsyncStorage',
      );
      return parsed;
    }
  } catch (error) {
    console.warn('[MyNextWatch] Failed to read cache:', error);
  }

  const likedContent = feedbackHistory.filter(f => f.liked === true);
  const dislikedContent = feedbackHistory.filter(f => f.liked === false);

  const system = {
    role: 'system' as const,
    content: `You are Theater AI, a personalized movie/TV recommendation engine. 
      Based on user's current mood/preferences and their feedback history, recommend ONE single movie or TV show that perfectly matches their current state of mind.
      
      Analyze their mood responses deeply to understand what they're truly looking for - not just genres, but emotional tone, pacing, themes.
      
      Return ONLY a JSON object with these exact fields:
      {"title": "Movie/Show Title", "year": "2024", "type": "movie" or "tv", "original_language": "en", "description": "A detailed, engaging explanation of why this content perfectly matches their current mood and preferences. Include key themes, emotional tone, pacing, and what makes it compelling for their current state of mind. Make it 2-3 sentences long."}
            
      Do not include any explanation or extra text. Just return the JSON object.`,
  };

  let userPrompt = '';

  if (moodAnswers) {
    userPrompt += 'My current mood and preferences:\n';
    Object.entries(moodAnswers).forEach(([questionId, answer]) => {
      if (questionId === 'energy_level') {
        return; // skip removed question
      }
      const questionMap: {[key: string]: string} = {
        current_mood: "How I'm feeling right now",
        content_type: 'Preferred content type',
        content_preference: 'Preferred story tone/style',
        discovery_mood: 'Discovery preference',
      };
      userPrompt += `- ${questionMap[questionId] || questionId}: ${answer}\n`;
    });
    userPrompt += '\n';
  }

  // Enforce content type if provided (Movie -> movie, Series -> tv)
  let desiredType: 'movie' | 'tv' | null = null;
  if (moodAnswers && typeof moodAnswers['content_type'] === 'string') {
    const val = (moodAnswers['content_type'] as string).toLowerCase();
    if (val === 'movie') desiredType = 'movie';
    else if (val === 'series') desiredType = 'tv';
  }

  if (likedContent.length > 0) {
    userPrompt += `Content I previously enjoyed:\n${likedContent
      .slice(0, 10)
      .map(c => `- ${c.title}`)
      .join('\n')}\n\n`;
  }

  if (dislikedContent.length > 0) {
    userPrompt += `Content I didn't enjoy:\n${dislikedContent
      .slice(0, 10)
      .map(c => `- ${c.title}`)
      .join('\n')}\n\n`;
  }

  if (desiredType) {
    userPrompt += `STRICT: Recommend only a ${
      desiredType === 'movie' ? 'movie' : 'TV series'
    } and set \"type\": \"${desiredType}\" in the JSON.`;
  }
  userPrompt +=
    'IMPORTANT: Do NOT recommend any title that appears in the liked or disliked lists above (avoid repeats).';

  const user = {
    role: 'user' as const,
    content: userPrompt,
  };

  try {
    console.log('[MyNextWatch] Calling Groq for recommendation...');
    const result = await callGroq([system, user]);
    console.log(
      '[MyNextWatch] Groq response received:',
      result.substring(0, 200),
    );

    // Try to extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiRecommendation = JSON.parse(jsonMatch[0]);
      console.log('[MyNextWatch] AI Recommendation:', aiRecommendation);

      // Now search TMDB for the actual content data
      let tmdbData = null;
      if (aiRecommendation.type === 'movie') {
        console.log(
          '[MyNextWatch] Searching TMDB for movie:',
          aiRecommendation.title,
          aiRecommendation.year,
          aiRecommendation.original_language,
        );
        // Try with year first
        let data = await searchMovies(aiRecommendation.title, 1, {
          year: aiRecommendation.year,
        } as any);

        // Fallback: search without year if no results
        if (!data?.results || data.results.length === 0) {
          console.log(
            '[MyNextWatch] No results with year, retrying without year...',
          );
          data = await searchMovies(aiRecommendation.title, 1);
        }

        // Filter by language if available
        let candidates = data?.results || [];
        if (aiRecommendation.original_language && candidates.length > 0) {
          const langFiltered = candidates.filter(
            (c: any) =>
              c?.original_language === aiRecommendation.original_language,
          );
          if (langFiltered.length > 0) {
            candidates = langFiltered;
            console.log(
              '[MyNextWatch] Filtered by language:',
              aiRecommendation.original_language,
            );
          }
        }

        tmdbData = candidates.length > 0 ? candidates[0] : null;
      } else if (aiRecommendation.type === 'tv') {
        console.log(
          '[MyNextWatch] Searching TMDB for TV show:',
          aiRecommendation.title,
          aiRecommendation.year,
          aiRecommendation.original_language,
        );
        // Try with year first
        let data = await searchTVShows(aiRecommendation.title, 1, {
          first_air_date_year: aiRecommendation.year,
        } as any);

        // Fallback: search without year if no results
        if (!data?.results || data.results.length === 0) {
          console.log(
            '[MyNextWatch] No results with year, retrying without year...',
          );
          data = await searchTVShows(aiRecommendation.title, 1);
        }

        // Filter by language if available
        let candidates = data?.results || [];
        if (aiRecommendation.original_language && candidates.length > 0) {
          const langFiltered = candidates.filter(
            (c: any) =>
              c?.original_language === aiRecommendation.original_language,
          );
          if (langFiltered.length > 0) {
            candidates = langFiltered;
            console.log(
              '[MyNextWatch] Filtered by language:',
              aiRecommendation.original_language,
            );
          }
        }

        tmdbData = candidates.length > 0 ? candidates[0] : null;
      }

      if (tmdbData) {
        console.log(
          '[MyNextWatch] TMDB data found:',
          tmdbData.title || tmdbData.name,
        );
        const result = {
          id: tmdbData.id,
          title: tmdbData.title,
          name: tmdbData.name,
          overview: aiRecommendation.description || tmdbData.overview, // Use AI description first
          poster_path: tmdbData.poster_path,
          backdrop_path: tmdbData.backdrop_path,
          vote_average: tmdbData.vote_average,
          release_date: tmdbData.release_date,
          first_air_date: tmdbData.first_air_date,
          genre_ids: tmdbData.genre_ids || [],
          media_type: aiRecommendation.type,
        };

        // Cache the result in AsyncStorage (persists across app restarts)
        try {
          await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
          console.log('[MyNextWatch] Cached recommendation to AsyncStorage');
        } catch (error) {
          console.warn('[MyNextWatch] Failed to cache recommendation:', error);
        }

        return result;
      } else {
        console.warn(
          '[MyNextWatch] TMDB data not found for:',
          aiRecommendation.title,
        );
      }
    } else {
      console.warn('[MyNextWatch] No JSON match in Groq response');
    }

    return null;
  } catch (error) {
    console.error('[MyNextWatch] Error getting recommendation:', error);
    return null;
  }
}

// Get personalized recommendations based on user's watch history
export async function getPersonalizedRecommendations(
  historyItems: Array<{
    id: number;
    title?: string;
    name?: string;
    type: 'movie' | 'tv';
    release_date?: string;
    first_air_date?: string;
    original_language?: string;
  }>,
): Promise<Array<{title: string; year: string; type: 'movie' | 'tv'}> | null> {
  if (!historyItems || historyItems.length === 0) {
    return null;
  }

  // Create cache key based on recent 10 history items
  const historyIds = historyItems
    .slice(0, 10)
    .map(i => i.id)
    .sort()
    .join(',');
  const cacheKey = `personalized:${historyIds}`;

  // Try cache first
  try {
    const cached = await cache.get(CACHE_KEYS.AI_SIMILAR, cacheKey);
    if (cached && Array.isArray(cached)) {
      return cached;
    }
  } catch (e) {
    // Fall through to fetch fresh
  }

  // Prepare history summary for AI - limit to recent 10 items
  // Include: Title, Release Date, Original Language (more relevant than rating/genre)
  const historySummary = historyItems
    .slice(0, 10)
    .map(item => {
      const title = item.title || item.name;
      const date =
        item.type === 'movie' ? item.release_date : item.first_air_date;
      const year = date ? new Date(date).getFullYear() : 'N/A';
      const language = item.original_language
        ? item.original_language.toUpperCase()
        : 'N/A';

      return `- "${title}" (${item.type}, ${year}, ${language})`;
    })
    .join('\n');

  const system = {
    role: 'system' as const,
    content: `You are Theater AI, an expert movie and TV show recommender. 
Based on the user's watch history, recommend 8 diverse movies or TV shows they would love.
Consider their viewing patterns, release years, and language preferences to understand their taste.
Return ONLY a JSON array with title, year, and type. No explanations.
Format: [{"title": "Title1", "year": "2024", "type": "movie"}, {"title": "Title2", "year": "2023", "type": "tv"}]`,
  };

  const user = {
    role: 'user' as const,
    content: `Based on my watch history, recommend 8 movies or TV shows I would enjoy:\n\n${historySummary}`,
  };

  try {
    const result = await callGroq([system, user]);

    // Parse JSON array from response
    let parsedArray: any[] = [];
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      parsedArray = JSON.parse(jsonMatch[0]);
    } else {
      const parsed = JSON.parse(result);
      parsedArray = Array.isArray(parsed) ? parsed : [];
    }

    // Validate and normalize results
    const validResults = parsedArray
      .filter(
        item =>
          item.title &&
          item.year &&
          (item.type === 'movie' || item.type === 'tv'),
      )
      .slice(0, 10);

    // Cache for 6 months
    await cache.set(
      CACHE_KEYS.AI_SIMILAR,
      cacheKey,
      validResults,
      180 * 24 * 60 * 60 * 1000, // 6 months
    );

    return validResults.length > 0 ? validResults : null;
  } catch (error) {
    return null;
  }
}

// Feature 1: Natural Language to Filter Conversion
export async function parseNaturalLanguageToFilters(
  query: string,
  movieGenres: Array<{id: number; name: string}>,
  tvGenres: Array<{id: number; name: string}>,
  languages: Array<{iso_639_1: string; english_name: string}>,
  watchProviders: Array<{provider_id: number; provider_name: string}>,
): Promise<{
  filters: Record<string, any>;
  contentType: 'all' | 'movie' | 'tv';
  explanation: string;
} | null> {
  // Format all TMDB data for AI
  const movieGenresList = movieGenres.map(g => `${g.id}:${g.name}`).join(', ');
  const tvGenresList = tvGenres.map(g => `${g.id}:${g.name}`).join(', ');
  const languagesList = languages
    .map(l => `${l.iso_639_1}:${l.english_name}`)
    .join(', ');
  const providersList = watchProviders
    .map(p => `${p.provider_id}:${p.provider_name}`)
    .join(', ');

  const system = {
    role: 'system' as const,
    content: `You are Theater AI's filter parser. Convert natural language to TMDB filter parameters.

=== AVAILABLE DATA FROM TMDB (USE ONLY THESE!) ===

MOVIE GENRES: ${movieGenresList}

TV SHOW GENRES: ${tvGenresList}

LANGUAGES: ${languagesList}

STREAMING PROVIDERS: ${providersList}

=== ALL AVAILABLE FILTER PARAMETERS ===

BASIC FILTERS:
{
  "sort_by": "popularity.desc" | "popularity.asc" | "vote_average.desc" | "vote_average.asc" | "primary_release_date.desc" | "primary_release_date.asc" | "original_title.asc" | "original_title.desc",
  
  // Rating filters
  "vote_average.gte": number (0-10, minimum rating),
  "vote_average.lte": number (0-10, maximum rating),
  
  // Date filters (use primary_release_date for movies, first_air_date for TV)
  "primary_release_date.gte": "YYYY-MM-DD" (movies only),
  "primary_release_date.lte": "YYYY-MM-DD" (movies only),
  "first_air_date.gte": "YYYY-MM-DD" (TV only),
  "first_air_date.lte": "YYYY-MM-DD" (TV only),
  
  // Genre filters
  "with_genres": "id1|id2|id3" (pipe-separated, include these genres),
  "without_genres": "id1|id2" (pipe-separated, exclude these genres),
  "genre_operator": "AND" | "OR" (how to combine genres: OR=any genre matches, AND=all genres must match),
  
  // Language & Region
  "with_original_language": "code" (e.g., "en", "ko", "ja", "zh"),
  "with_watch_providers": "id1|id2" (pipe-separated provider IDs),
  "watch_region": "US" (default region for providers),
  
  // Runtime filters
  "with_runtime_gte": number (minimum runtime in minutes),
  "with_runtime_lte": number (maximum runtime in minutes),
  
  // Popularity & Vote Count
  "vote_count.gte": number (minimum number of votes - use for filtering popular/well-known content),
  "vote_count.lte": number (maximum number of votes),
  "with_popularity.gte": number (minimum popularity score),
  "with_popularity.lte": number (maximum popularity score)
}

ADVANCED FILTERS (use when user mentions specific people, keywords, companies, or networks):
{
  // People filters (requires TMDB person IDs - can't be used directly, only mention in explanation)
  "with_cast": "person_id1,person_id2" (comma-separated, cast members),
  "with_crew": "person_id1,person_id2" (comma-separated, directors/writers),
  "with_people": "person_id" (either cast or crew),
  
  // Keyword filters (requires TMDB keyword IDs - can't be used directly, only mention in explanation)
  "with_keywords": "keyword_id1,keyword_id2" (comma-separated),
  "without_keywords": "keyword_id1,keyword_id2" (exclude keywords),
  
  // Production filters (requires TMDB company/network IDs - can't be used directly, only mention in explanation)
  "with_companies": "company_id1,company_id2" (production companies),
  "with_networks": "network_id1,network_id2" (TV networks only),
  
  // Certification/Rating (age ratings - US system)
  "certification": "G" | "PG" | "PG-13" | "R" | "NC-17" (US movie ratings),
  "certification": "TV-Y" | "TV-Y7" | "TV-G" | "TV-PG" | "TV-14" | "TV-MA" (US TV ratings),
  "certification_country": "US" (default),
  
  // Release Type (movies only)
  "with_release_type": "1" | "2" | "3" | "4" | "5" | "6" (1=Premiere, 2=Theatrical Limited, 3=Theatrical, 4=Digital, 5=Physical, 6=TV)
}

=== RETURN FORMAT ===
{
  "contentType": "movie" | "tv" | "all",
  "filters": {...},
  "explanation": "string describing what filters were applied"
}

=== STRICT RULES ===

1. CONTENT TYPE DETECTION:
   - "series", "show", "tv", "drama", "anime" → contentType: "tv"
   - "movie", "film" → contentType: "movie"
   - Default or mixed → "all"

2. GENRE SELECTION:
   - If contentType="movie" → USE ONLY MOVIE GENRES LIST
   - If contentType="tv" → USE ONLY TV SHOW GENRES LIST
   - If contentType="all" → Can use both, but prefer broader matches
   - NEVER use genre IDs not in the correct list!
   - Multiple genres: use pipe-separated (|) format

3. GENRE OPERATORS:
   - Default to "OR" (any genre matches)
   - Use "AND" only when explicitly stated "must have all these genres"

4. LANGUAGE:
   - USE ONLY language codes from LANGUAGES list
   - Map language name to code (e.g., Korean→ko, Japanese→ja, Chinese→zh, Tamil→ta)

5. PROVIDERS:
   - USE ONLY provider IDs from STREAMING PROVIDERS list
   - Map service name to ID (e.g., Netflix→8, Disney+→337, HBO Max→384)
   - Multiple providers: pipe-separated (|)

6. RATING RANGES:
   - "highly rated" → vote_average.gte: 7.5
   - "well-rated" → vote_average.gte: 6.5
   - "popular" → vote_count.gte: 500
   - "hidden gems" → vote_average.gte: 7, vote_count.lte: 200

7. DATE RANGES:
   - Decades: "90s" → 1990-01-01 to 1999-12-31
   - Years: "2020" → 2020-01-01 to 2020-12-31
   - Recent: "recent" → use last 2-3 years

8. RUNTIME:
   - "short" → with_runtime_lte: 90
   - "long" → with_runtime_gte: 150
   - "under X minutes" → with_runtime_lte: X

9. EXCLUDING GENRES:
   - "no horror" or "exclude horror" → use without_genres with horror ID
   - "family friendly" → exclude horror (27), add family (10751)

10. CERTIFICATIONS:
    - "family friendly" or "kids" → certification: "G" or "PG" (movies), "TV-Y" or "TV-G" (TV)
    - "mature" or "adults" → certification: "R" or "NC-17" (movies), "TV-MA" (TV)

11. ADVANCED FILTERS:
    - If user mentions specific actors/directors/keywords/companies → Note in explanation that manual selection needed
    - Don't create IDs for these - they require UI interaction

12. If data not found in lists, OMIT that filter parameter!

=== EXAMPLES ===

Query: "highly rated 90s romantic comedies"
→ {contentType: "movie", filters: {with_genres: "10749|35", primary_release_date.gte: "1990-01-01", primary_release_date.lte: "1999-12-31", vote_average.gte: 7.5}}

Query: "short Korean dramas with happy endings"
→ {contentType: "tv", filters: {with_original_language: "ko", with_genres: "18", with_runtime_lte: 45}, explanation: "Korean dramas under 45 min (happy endings require manual keyword selection)"}

Query: "family friendly action movies on Netflix, no horror"
→ {contentType: "movie", filters: {with_genres: "28|10751", without_genres: "27", with_watch_providers: "8", certification: "PG"}}`,
  };

  const user = {
    role: 'user' as const,
    content: `Parse this search query: "${query}"`,
  };

  try {
    const result = await callGroq([system, user]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        filters: parsed.filters || {},
        contentType: parsed.contentType || 'all',
        explanation: parsed.explanation || 'Filters applied',
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Feature 2: Watchlist Pattern Analysis
// Genre ID to name mapping (TMDB standard genres)
const GENRE_MAP: Record<number, string> = {
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
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  // TV-specific genres
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

export async function analyzeWatchlistPatterns(
  watchlistItems: Array<{
    id: number;
    title?: string;
    name?: string;
    type: 'movie' | 'tv';
    genre_ids?: number[];
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
  }>,
): Promise<{
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
    matchReason?: string;
  }>;
} | null> {
  if (!watchlistItems || watchlistItems.length === 0) {
    return null;
  }

  // Helper to convert genre IDs to names
  const getGenreNames = (genreIds?: number[]): string => {
    if (!genreIds || genreIds.length === 0) return 'none';
    return genreIds.map(id => GENRE_MAP[id] || `Unknown(${id})`).join(', ');
  };

  // Prepare summary
  const summary = watchlistItems
    .slice(0, 30)
    .map(item => {
      const date =
        item.type === 'movie' ? item.release_date : item.first_air_date;
      const year = date ? date.split('-')[0] : 'Unknown';

      return `- "${item.title || item.name}" (${item.type}, ${year}, rating: ${
        item.vote_average || 'N/A'
      }, genres: ${getGenreNames(item.genre_ids)})`;
    })
    .join('\n');

  const system = {
    role: 'system' as const,
    content: `You are Theater AI's pattern analyzer. Analyze user's watchlist and provide deep, interesting insights.

IMPORTANT: For hiddenGems, you MUST use the EXACT title as it appears in the watchlist. Copy it character-by-character.

Return ONLY a JSON object with these exact fields:
{
  "insights": ["insight 1", "insight 2", "insight 3"] (3-4 SHORT, punchy insights - max 10 words each),
  "topGenres": ["genre1", "genre2", "genre3"] (most common genre names),
  "averageRating": 7.5 (average rating preference),
  "decadeDistribution": {"2020s": 15, "2010s": 10, "2000s": 5} (content by decade - use the YEAR provided for each item, skip items with "Unknown" year),
  
  "contentTypeSplit": {"movies": 45, "tvShows": 55} (percentage split between movies and TV shows),
  
  "moodProfile": {
    "dominant": "Dark & Intense" (primary mood/tone),
    "secondary": "Heartwarming" (secondary mood),
    "traits": ["Complex narratives", "Character-driven"] (2-3 key characteristics)
  },
  
  "hiddenGems": [
    {"title": "EXACT title from watchlist", "type": "movie", "reason": "Why it's underrated"}
  ] (1-3 high-rated but less popular items - USE EXACT TITLES FROM THE WATCHLIST ABOVE),
  
  "contentFreshness": {
    "preference": "Modern" or "Balanced" or "Classic",
    "recentPercentage": 60,
    "note": "Brief explanation of their era preference"
  },
  
  "completionInsight": {
    "estimatedWatchTime": "45 hours" (total runtime estimate),
    "bingeability": 7.5 (score 1-10 for how binge-worthy their list is),
    "suggestion": "Practical tip about their watchlist"
  },
  
  "recommendations": "2-3 sentences summarizing what the user clearly loves based on their watchlist patterns (genres, themes, styles, eras). Be specific and insightful about their taste. Then suggest what they might enjoy next.",
  "recommendedTitles": [
    {"title": "Movie/Show Name", "type": "movie or tv"}
  ] (5-7 specific recommendations with EXACT titles from TMDB)
}`,
  };

  const user = {
    role: 'user' as const,
    content: `Analyze this watchlist (${watchlistItems.length} items):\n\n${summary}`,
  };

  try {
    const result = await callGroq([system, user]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        insights: parsed.insights || [],
        topGenres: parsed.topGenres || [],
        averageRating: parsed.averageRating || 0,
        decadeDistribution: parsed.decadeDistribution || {},
        contentTypeSplit: parsed.contentTypeSplit || {movies: 50, tvShows: 50},
        moodProfile: parsed.moodProfile || {
          dominant: 'Varied',
          secondary: 'Diverse',
          traits: [],
        },
        hiddenGems: parsed.hiddenGems || [],
        contentFreshness: parsed.contentFreshness || {
          preference: 'Balanced',
          recentPercentage: 50,
          note: '',
        },
        completionInsight: parsed.completionInsight || {
          estimatedWatchTime: 'Unknown',
          bingeability: 5,
          suggestion: '',
        },
        recommendations: parsed.recommendations || '',
        recommendedTitles: parsed.recommendedTitles || [],
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Feature 3: Quick Decision - Compare Content
export async function compareContent(
  items: Array<{
    title?: string;
    name?: string;
    overview?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    genre_ids?: number[];
    type: 'movie' | 'tv';
  }>,
): Promise<{
  comparisons: Array<{
    title: string;
    pros: string[];
    cons: string[];
    bestFor: string;
  }>;
  recommendation: string;
  reasoning: string;
} | null> {
  if (!items || items.length < 2) {
    return null;
  }

  const itemsSummary = items
    .map(
      (item, idx) =>
        `${idx + 1}. "${item.title || item.name}" (${item.type}, ${
          item.vote_average || 'N/A'
        }/10) - ${item.overview?.slice(0, 150) || 'No overview'}`,
    )
    .join('\n\n');

  const system = {
    role: 'system' as const,
    content: `You are Theater AI's decision assistant. Compare content and help users decide what to watch.

Return ONLY a JSON object with these exact fields:
{
  "comparisons": [
    {
      "title": "Movie/Show Title",
      "pros": ["pro 1", "pro 2", "pro 3"],
      "cons": ["con 1", "con 2"],
      "bestFor": "When you want..."
    }
  ],
  "recommendation": "Title of best choice",
  "reasoning": "Brief explanation why this is the best choice right now"
}`,
  };

  const user = {
    role: 'user' as const,
    content: `Compare these ${items.length} options and help me decide:\n\n${itemsSummary}`,
  };

  try {
    const result = await callGroq([system, user]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        comparisons: parsed.comparisons || [],
        recommendation: parsed.recommendation || '',
        reasoning: parsed.reasoning || '',
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Search content by thematic genre using AI
export async function searchByThematicGenre(
  thematicTag: string,
): Promise<Array<{
  title: string;
  year: string;
  type: 'movie' | 'tv';
  confidence: number;
  matchReason: string;
  imdbRating?: number;
}> | null> {
  const system = {
    role: 'system' as const,
    content: `You are Theater AI's content discovery assistant. Given a thematic genre/tag, recommend movies and TV shows that match this theme.

Return ONLY a JSON array of 10-15 recommendations with exact titles, years, confidence scores, IMDb ratings, and match explanations:
[
  {
    "title": "Movie/Show Title",
    "year": "2024",
    "type": "movie",
    "confidence": 0.95,
    "imdbRating": 8.5,
    "matchReason": "Brief explanation (1-2 sentences) of why this content perfectly matches the thematic tag"
  }
]

Focus on content that truly embodies the thematic essence, not just surface-level genre matches. Recommend diverse, well-known content that clearly represents the theme.

Confidence scoring:
- 0.9-1.0: Perfect thematic match, core narrative embodies the theme
- 0.8-0.9: Strong match, major story elements align with theme
- 0.7-0.8: Good match, clear thematic connections
- 0.6-0.7: Moderate match, some thematic elements present`,
  };

  const user = {
    role: 'user' as const,
    content: `Find movies and TV shows that match this thematic genre: "${thematicTag}"\n\nRecommend a diverse mix of movies and TV shows that capture this thematic essence. Include confidence scores and explain why each matches.`,
  };

  try {
    const result = await callGroq([system, user]);
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : null;
    }
    return null;
  } catch (error) {
    throw error; // Re-throw to let UI handle it
  }
}

// Search content by emotional tone using AI (with type filter)
export async function searchByEmotionalTone(
  emotionalTag: string,
  contentType?: 'movie' | 'tv',
): Promise<Array<{
  title: string;
  year: string;
  type: 'movie' | 'tv';
  confidence: number;
  matchReason: string;
  imdbRating?: number;
}> | null> {
  const typeFilter =
    contentType === 'movie'
      ? 'movies only'
      : contentType === 'tv'
      ? 'TV shows only'
      : 'movies and TV shows';

  const system = {
    role: 'system' as const,
    content: `You are Theater AI's content discovery assistant. Given an emotional tone/mood, recommend content that matches this emotional atmosphere.

Return ONLY a JSON array of 10-15 recommendations with exact titles, years, confidence scores, IMDb ratings, and match explanations:
[
  {
    "title": "Movie/Show Title",
    "year": "2024",
    "type": "movie",
    "confidence": 0.92,
    "imdbRating": 8.3,
    "matchReason": "Brief explanation (1-2 sentences) of why this content perfectly captures the emotional tone"
  }
]

Focus on content that truly captures the emotional tone and atmosphere, not just genre. Recommend diverse, well-known content.

Confidence scoring:
- 0.9-1.0: Perfect emotional match, core atmosphere embodies the tone
- 0.8-0.9: Strong match, dominant emotional elements align
- 0.7-0.8: Good match, clear emotional connections
- 0.6-0.7: Moderate match, some emotional elements present`,
  };

  const user = {
    role: 'user' as const,
    content: `Find ${typeFilter} that match this emotional tone: "${emotionalTag}"\n\nRecommend content that captures this emotional atmosphere and mood. Include confidence scores and explain why each matches.${
      contentType
        ? ` IMPORTANT: Return ONLY ${
            contentType === 'movie' ? 'movies' : 'TV shows'
          } (type: "${contentType}").`
        : ''
    }`,
  };

  try {
    const result = await callGroq([system, user]);
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : null;
    }
    return null;
  } catch (error) {
    throw error; // Re-throw to let UI handle it
  }
}

/**
 * AI-powered search that understands natural language queries
 * Handles: fuzzy names, descriptions, vibes, comparisons, plot elements
 */
export async function aiSearch({query}: {query: string}): Promise<{
  bestMatch: {
    id: number;
    type: 'movie' | 'tv';
    title: string;
    year?: string;
    poster_path?: string;
    vote_average?: number;
    overview?: string;
    confidence: number;
    explanation: string;
  } | null;
  moreResults: Array<{
    id: number;
    type: 'movie' | 'tv';
    title: string;
    year?: string;
    poster_path?: string;
    vote_average?: number;
    overview?: string;
    reason: string;
  }>;
  source: 'ai' | 'tmdb_fallback';
} | null> {
  try {
    const prompt = `You are a movie/TV show search assistant. Analyze this user query and find the best matching content.

User Query: "${query}"

Your task:
1. Identify what the user is looking for (specific title, description, vibe, comparison, etc.)
2. Find the BEST MATCH (single most relevant movie or TV show)
3. Suggest 5-8 MORE RESULTS that are also relevant

Return ONLY valid JSON in this exact format:
{
  "bestMatch": {
    "title": "Exact title",
    "year": "Release year (YYYY format)",
    "type": "movie or tv",
    "confidence": 0.0-1.0,
    "explanation": "1-2 sentences explaining why this matches the query"
  },
  "moreResults": [
    {
      "title": "Title",
      "year": "YYYY",
      "type": "movie or tv",
      "reason": "Brief reason (5-10 words)"
    }
  ]
}

Rules:
- bestMatch must be the SINGLE most relevant result
- confidence: 0.9+ for exact matches, 0.7-0.9 for good matches, 0.5-0.7 for loose matches
- moreResults should have 5-8 items
- Use real movie/TV show titles and years
- If query is vague, interpret it intelligently
- For misspellings, find the correct title
- For descriptions, match by plot/theme
- For comparisons ("like X"), find similar content

Examples:
- "intersteller" → Interstellar (2014), confidence: 0.95
- "space movie about time" → Interstellar (2014), confidence: 0.85
- "shows like Breaking Bad" → Better Call Saul, confidence: 0.9
- "feel good animated movies" → Toy Story, confidence: 0.75`;

    const response = await callGroq([{role: 'user', content: prompt}]);

    // Parse AI response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return await fallbackToTMDBSearch(query);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.bestMatch || !parsed.bestMatch.title) {
      return await fallbackToTMDBSearch(query);
    }

    // Search TMDB for the AI-suggested titles to get full data
    const bestMatchData = await searchTMDBForTitle(
      parsed.bestMatch.title,
      parsed.bestMatch.year,
      parsed.bestMatch.type,
    );

    if (!bestMatchData) {
      return await fallbackToTMDBSearch(query);
    }

    // Search for more results
    const moreResultsData = await Promise.all(
      (parsed.moreResults || []).slice(0, 8).map(async (item: any) => {
        const data = await searchTMDBForTitle(item.title, item.year, item.type);
        if (data) {
          return {
            ...data,
            reason: item.reason || 'Related content',
          };
        }
        return null;
      }),
    );

    const validMoreResults = moreResultsData.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );

    return {
      bestMatch: {
        ...bestMatchData,
        confidence: parsed.bestMatch.confidence || 0.8,
        explanation:
          parsed.bestMatch.explanation || 'Matches your search query',
      },
      moreResults: validMoreResults,
      source: 'ai',
    };
  } catch (error) {
    return await fallbackToTMDBSearch(query);
  }
}

/**
 * Search TMDB for a specific title
 */
async function searchTMDBForTitle(
  title: string,
  year?: string,
  type?: 'movie' | 'tv',
): Promise<{
  id: number;
  type: 'movie' | 'tv';
  title: string;
  year?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  overview?: string;
} | null> {
  try {
    // Try movie search first if type is movie or unspecified
    if (!type || type === 'movie') {
      const movieResults = await searchMovies(title, 1, {});
      if (movieResults?.results && movieResults.results.length > 0) {
        // Find best match by title similarity and year
        let bestMatch = movieResults.results[0];
        if (year) {
          const yearMatch = movieResults.results.find((m: any) =>
            m.release_date?.startsWith(year),
          );
          if (yearMatch) bestMatch = yearMatch;
        }

        return {
          id: bestMatch.id,
          type: 'movie',
          title: bestMatch.title,
          year: bestMatch.release_date?.split('-')[0],
          poster_path: bestMatch.poster_path,
          backdrop_path: bestMatch.backdrop_path,
          vote_average: bestMatch.vote_average,
          overview: bestMatch.overview,
        };
      }
    }

    // Try TV search if type is tv or movie search failed
    if (!type || type === 'tv') {
      const tvResults = await searchTVShows(title, 1, {});
      if (tvResults?.results && tvResults.results.length > 0) {
        let bestMatch = tvResults.results[0];
        if (year) {
          const yearMatch = tvResults.results.find((s: any) =>
            s.first_air_date?.startsWith(year),
          );
          if (yearMatch) bestMatch = yearMatch;
        }

        return {
          id: bestMatch.id,
          type: 'tv',
          title: bestMatch.name,
          year: bestMatch.first_air_date?.split('-')[0],
          poster_path: bestMatch.poster_path,
          backdrop_path: bestMatch.backdrop_path,
          vote_average: bestMatch.vote_average,
          overview: bestMatch.overview,
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Fallback to regular TMDB search if AI fails
 */
async function fallbackToTMDBSearch(query: string): Promise<{
  bestMatch: any;
  moreResults: any[];
  source: 'ai' | 'tmdb_fallback';
} | null> {
  try {
    // Search both movies and TV shows
    const [movieResults, tvResults] = await Promise.all([
      searchMovies(query, 1, {}),
      searchTVShows(query, 1, {}),
    ]);

    const allResults = [
      ...(movieResults?.results || []).map((m: any) => ({
        id: m.id,
        type: 'movie' as const,
        title: m.title,
        year: m.release_date?.split('-')[0],
        poster_path: m.poster_path,
        backdrop_path: m.backdrop_path,
        vote_average: m.vote_average,
        overview: m.overview,
      })),
      ...(tvResults?.results || []).map((s: any) => ({
        id: s.id,
        type: 'tv' as const,
        title: s.name,
        year: s.first_air_date?.split('-')[0],
        poster_path: s.poster_path,
        backdrop_path: s.backdrop_path,
        vote_average: s.vote_average,
        overview: s.overview,
      })),
    ];

    if (allResults.length === 0) {
      return null;
    }

    // Sort by vote_average to get best match
    allResults.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));

    return {
      bestMatch: {
        ...allResults[0],
        confidence: 0.6,
        explanation: 'Found via keyword search',
      },
      moreResults: allResults.slice(1, 9).map(item => ({
        ...item,
        reason: 'Related to your search',
      })),
      source: 'tmdb_fallback',
    };
  } catch (error) {
    return null;
  }
}
