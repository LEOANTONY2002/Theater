import {AISettingsManager} from '../store/aiSettings';
import {cache, CACHE_KEYS} from '../utils/cache';
import {searchMovies, searchTVShows} from './tmdb';

// Default fallback values
const DEFAULT_MODEL = 'gemini-2.5-flash';
// Note: Do NOT hardcode API keys. Users must provide their own key via settings.

// Dynamic function to get current settings
const getGeminiConfig = async () => {
  const settings = await AISettingsManager.getSettings();

  try {
    return {
      model: settings.model || DEFAULT_MODEL,
      apiKey: settings.apiKey,
      apiUrl: `https://generativelanguage.googleapis.com/v1beta/models/${
        settings.model || DEFAULT_MODEL
      }:generateContent`,
    };
  } catch (error) {
    console.error('Error getting AI settings, using defaults:', error);
    return {
      model: DEFAULT_MODEL,
      apiKey: settings.apiKey,
      apiUrl: `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent`,
    };
  }
};

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{text: string}>;
}

// Fetch critic ratings (IMDb and Rotten Tomatoes) via AI with caching
export async function getCriticRatings({
  title,
  year,
  type,
}: {
  title: string;
  year?: string;
  type: 'movie' | 'tv';
}): Promise<{
  imdb?: number | null;
  rotten_tomatoes?: number | null;
  imdb_votes?: number | null;
  source?: string;
} | null> {
  const cacheKey = `ratings:${type}:${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}${year ? `:${year}` : ''}`;

  // Try cache first
  try {
    const cached = await cache.get(CACHE_KEYS.AI_TRIVIA, cacheKey);
    if (cached) {
      if (typeof cached === 'string') {
        return JSON.parse(cached);
      }
      return cached as any;
    }
  } catch (e) {
    // proceed to fetch fresh
  }

  const yearSuffix = year ? ` (${year})` : '';
  const prompt = `Provide the latest critic ratings for the ${type} "${title}${yearSuffix}" as a strict JSON object with numeric values if available.
Return ONLY this JSON, no prose:
{"imdb": <0-10 scale as number or null>, "rotten_tomatoes": <0-100 as number or null>, "imdb_votes": <integer number of votes or null>}
If a value is unknown, set it to null. Do not include extra fields.`;

  try {
    const response = await callGemini([{role: 'user', content: prompt}]);

    let parsed: any = null;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(response);
      }
    } catch {
      parsed = null;
    }

    const normalized =
      parsed && typeof parsed === 'object'
        ? {
            imdb:
              typeof parsed.imdb === 'number'
                ? parsed.imdb
                : parsed.imdb && !isNaN(Number(parsed.imdb))
                ? Number(parsed.imdb)
                : null,
            rotten_tomatoes:
              typeof parsed.rotten_tomatoes === 'number'
                ? parsed.rotten_tomatoes
                : parsed.rotten_tomatoes &&
                  !isNaN(Number(parsed.rotten_tomatoes))
                ? Number(parsed.rotten_tomatoes)
                : null,
            imdb_votes:
              typeof parsed.imdb_votes === 'number'
                ? parsed.imdb_votes
                : parsed.imdb_votes && !isNaN(Number(parsed.imdb_votes))
                ? Number(parsed.imdb_votes)
                : null,
            source: 'ai',
          }
        : null;

    await cache.set(
      CACHE_KEYS.AI_TRIVIA,
      cacheKey,
      JSON.stringify(normalized),
      180 * 24 * 60 * 60 * 1000, // 6 months
    );

    return normalized;
  } catch (error) {
    console.error('Error in getCriticRatings:', error);
    return null;
  }
}

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Convert OpenAI-style messages to Gemini format
function convertMessagesToGemini(messages: OpenAIMessage[]): {
  systemInstruction?: {parts: Array<{text: string}>};
  contents: GeminiMessage[];
} {
  const systemMessages = messages.filter(msg => msg.role === 'system');
  const conversationMessages = messages.filter(msg => msg.role !== 'system');

  // Combine system messages
  const systemInstruction =
    systemMessages.length > 0
      ? {
          parts: [
            {
              text: systemMessages.map(msg => msg.content).join('\n\n'),
            },
          ],
        }
      : undefined;

  // Convert conversation messages
  const contents: GeminiMessage[] = conversationMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{text: msg.content}],
  }));

  return {systemInstruction, contents};
}

async function callGemini(messages: OpenAIMessage[]): Promise<string> {
  const config = await getGeminiConfig();
  const {systemInstruction, contents} = convertMessagesToGemini(messages);

  if (
    !config.apiKey ||
    typeof config.apiKey !== 'string' ||
    config.apiKey.trim().length === 0
  ) {
    const err = new Error(
      'NO_API_KEY: Please set your Gemini API key in AI Settings',
    );
    // Log once for debugging
    console.error('[Gemini] Missing API key. Open Settings and add your key.');
    throw err;
  }

  const requestBody: any = {
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  };

  if (systemInstruction) {
    requestBody.systemInstruction = systemInstruction;
  }

  // Simple retry with exponential backoff for transient 5xx errors
  const maxRetries = 4;
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(`${config.apiUrl}?key=${config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        const enriched = new Error(
          `HTTP ${response.status}: ${bodyText || response.statusText}`,
        );
        // Retry only on 5xx
        if (
          response.status >= 500 &&
          response.status < 600 &&
          attempt < maxRetries
        ) {
          attempt += 1;
          const base = 600 * Math.pow(2, attempt - 1);
          const jitter = Math.floor(Math.random() * 250);
          const delay = base + jitter;
          console.warn(
            `[Gemini] Transient error ${response.status}. Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
          );
          await new Promise(res => setTimeout(res, delay));
          continue;
        }
        throw enriched;
      }

      const data = await response.json();

      // Extract the generated text from Gemini response
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('NO_CONTENT: Gemini returned no generated text');
      }

      return generatedText;
    } catch (error) {
      lastError = error;
      // If fetch/network error, retry up to maxRetries
      const errObj: any = error as any;
      const message = String(errObj?.message || errObj);
      const shouldRetry =
        /Network request failed|fetch failed|ECONNRESET|ETIMEDOUT/i.test(
          message,
        ) && attempt < maxRetries;
      if (shouldRetry) {
        attempt += 1;
        const base = 600 * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 250);
        const delay = base + jitter;
        console.warn(
          `[Gemini] Network error. Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
        );
        await new Promise(res => setTimeout(res, delay));
        continue;
      }
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  // If we exhaust retries, throw the last error
  throw lastError || new Error('Unknown error calling Gemini');
}

// For Movie/Show Details: get similar by story
export async function getSimilarByStory({
  title,
  overview,
  genres,
  type,
}: {
  title: string;
  overview: string;
  genres: string;
  type: 'movie' | 'tv';
}) {
  const cacheKey = `${type}:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  // Try to get from cache first
  const cachedResponse = await cache.get(CACHE_KEYS.AI_SIMILAR, cacheKey);
  if (cachedResponse) {
    try {
      // If cache stored an array already
      if (Array.isArray(cachedResponse)) {
        return cachedResponse;
      }
      // If cache stored a string, try to extract/parse JSON array
      if (typeof cachedResponse === 'string') {
        const match = cachedResponse.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return Array.isArray(parsed) ? parsed : [];
        }
        const parsed = JSON.parse(cachedResponse);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      // Fall through to fetch fresh if cache is malformed
    }
  }

  const system = {
    role: 'system' as const,
    content: `You are a movie/TV recommender called Theater AI. 
      Given a title, genres and story, give the most similar movie/show. 
      Return a JSON array of title and year up to 5 similar movies or TV shows. 
      Do not include any explanation or extra text. Just return the JSON array.
      Response Format: [{"title": "Title1", "year": "2024"}, {"title": "Title2", "year": "2025"}]`,
  };
  const user = {
    role: 'user' as const,
    content: `Title: ${title}\nStory: ${overview}\nType: ${type}\nGenres: ${genres}`,
  };

  try {
    const result = await callGemini([system, user]);

    // Normalize to an array
    let parsedArray: any[] = [];
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      parsedArray = JSON.parse(jsonMatch[0]);
    } else {
      const parsed = JSON.parse(result);
      parsedArray = Array.isArray(parsed) ? parsed : [];
    }

    // Cache the parsed array for 6 months to avoid type mismatch later
    await cache.set(
      CACHE_KEYS.AI_SIMILAR,
      cacheKey,
      Array.isArray(parsedArray) ? parsedArray : [],
      180 * 24 * 60 * 60 * 1000, // 6 months
    );

    return Array.isArray(parsedArray) ? parsedArray : [];
  } catch (error) {
    console.error('Error parsing Gemini similar response:', error);
    return [];
  }
}

// For Online AI Chat (cinema only)
export async function cinemaChat(
  messages: {role: 'user' | 'assistant' | 'system'; content: string}[],
): Promise<{aiResponse: string; arr: any[]}> {
  // No caching: always compute fresh response for detail screen chats

  const system = {
    role: 'system' as const,
    content: `You are an expert cinema assistant called Theater AI. 
      Only answer questions related to movies, TV, actors, directors, film history, and cinema. 
      Politely refuse unrelated questions. 
      Whenever you suggest any movies/TV shows, include an array only at the last line of the message response containing exact title, year, exact type ("movie" or "tv"), and original_language (ISO 639-1 like "en", "fr").
      The array should be the last line of the WHOLE RESPONSE. Don't include multiple arrays.
      JSON Format: [{"title": "Title1", "year": "2024", "type": "movie", "original_language": "en"}, {"title": "Title2", "year": "2025", "type": "tv", "original_language": "ja"}].
      `,
  };

  const geminiMessages = [system, ...messages];
  try {
    const response = await callGemini(geminiMessages);

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
    console.error('Error in cinemaChat:', error);
    throw error;
  }
}

// For Movie/TV Trivia & Facts
export async function getMovieTrivia({
  title,
  year,
  type,
}: {
  title: string;
  year?: string;
  type: 'movie' | 'tv';
}) {
  // Generate a consistent cache key
  const cacheKey = `trivia:${type}:${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}${year ? `:${year}` : ''}`;

  // Try to get from cache first
  try {
    const cached = await cache.get<string>(CACHE_KEYS.AI_TRIVIA, cacheKey);
    if (cached) {
      // If we have a cached string, parse it
      if (typeof cached === 'string') {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      // If it's already an array, return it
      else if (Array.isArray(cached)) {
        return cached;
      }
      console.warn('Invalid cached trivia format, fetching fresh data');
    }
  } catch (e) {
    console.warn('Error reading from cache:', e);
  }

  const yearSuffix = year ? ` (${year})` : '';
  const prompt = `Provide 5 interesting pieces of trivia about the ${type} "${title}${yearSuffix}". Format your response as a JSON array of strings. Only return the JSON array, no other text or markdown formatting. If no trivia available ust return empty array, nothing more`;

  try {
    const response = await callGemini([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    let triviaItems: string[] = [];

    // First try to parse the response as JSON
    try {
      // Try to extract JSON array if it's wrapped in markdown or other text
      const jsonMatch = response.match(/\[([\s\S]*?)\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          triviaItems = parsed.filter((item: any) => typeof item === 'string');
        }
      } else {
        // If no array found, try to parse the whole response
        const parsed = JSON.parse(response);
        if (Array.isArray(parsed)) {
          triviaItems = parsed.filter((item: any) => typeof item === 'string');
        } else if (typeof parsed === 'string') {
          triviaItems = [parsed];
        }
      }
    } catch (e) {
      console.warn('Failed to parse trivia as JSON, using as plain text');
      // If all else fails, split by newlines and clean up
      triviaItems = response
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.match(/^[\[\]{}]/)); // Remove any JSON artifacts
    }

    // Ensure we have at least one valid trivia item
    if (triviaItems.length === 0) {
      triviaItems = [
        `No trivia available for ${title}${yearSuffix}. Check back later!`,
      ];
    }

    // Format as TriviaFact array
    const triviaFacts = triviaItems.map(fact => ({
      fact,
      category: ['Production', 'Cast', 'Behind the Scenes', 'Fun Fact'][
        Math.floor(Math.random() * 4)
      ] as 'Production' | 'Cast' | 'Behind the Scenes' | 'Fun Fact',
    }));

    // Cache the formatted trivia
    await cache.set(
      CACHE_KEYS.AI_TRIVIA,
      cacheKey,
      JSON.stringify(triviaFacts),
      180 * 24 * 60 * 60 * 1000, // 6 months
    );

    return triviaFacts;
  } catch (error) {
    console.error('Error in getMovieTrivia:', error);
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
  const cacheKey = `mood:${JSON.stringify(moodAnswers)}:history:${
    feedbackHistory.length > 0 ? feedbackHistory[0].contentId : 'none'
  }`;

  // Try to get from cache first (shorter TTL since preferences might change)
  const cachedResponse = await cache.get(
    CACHE_KEYS.AI_RECOMMENDATION,
    cacheKey,
  );
  if (cachedResponse) {
    return cachedResponse;
  }

  const likedContent = feedbackHistory.filter(f => f.liked === true);
  const dislikedContent = feedbackHistory.filter(f => f.liked === false);

  const system = {
    role: 'system' as const,
    content: `You are Theater AI, a personalized movie/TV recommendation engine. 
      Based on user's current mood/preferences and their feedback history, recommend ONE single movie or TV show that perfectly matches their current state of mind.
      
      Analyze their mood responses deeply to understand what they're truly looking for - not just genres, but emotional tone, pacing, themes, and viewing experience.
      
      Return ONLY a JSON object with these exact fields:
      {"title": "Movie/Show Title", "year": "2024", "type": "movie" or "tv", "description": "A detailed, engaging explanation of why this content perfectly matches their current mood and preferences. Include key themes, emotional tone, pacing, and what makes it compelling for their current state of mind. Make it 2-3 sentences long."}
      
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
      .map(c => `- ${c.title}`)
      .join('\n')}\n\n`;
  }

  if (dislikedContent.length > 0) {
    userPrompt += `Content I didn't enjoy:\n${dislikedContent
      .map(c => `- ${c.title}`)
      .join('\n')}\n\n`;
  }

  userPrompt +=
    'Based on my current mood and viewing history, recommend ONE movie or TV show that would be perfect for me right now. ';
  userPrompt +=
    'Align the suggestion\'s tone with my selected story preference and overall mood (avoid contradictions, e.g., do not suggest dark & gritty for a lighthearted/"laughs" mood). ';
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
    const result = await callGemini([system, user]);

    // Try to extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiRecommendation = JSON.parse(jsonMatch[0]);

      // Now search TMDB for the actual content data
      let tmdbData = null;
      if (aiRecommendation.type === 'movie') {
        const data = await searchMovies(aiRecommendation.title, 1, {
          year: aiRecommendation.year,
        } as any);
        tmdbData =
          data?.results && data.results.length > 0 ? data.results[0] : null;
      } else if (aiRecommendation.type === 'tv') {
        const data = await searchTVShows(aiRecommendation.title, 1, {
          first_air_date_year: aiRecommendation.year,
        } as any);
        tmdbData =
          data?.results && data.results.length > 0 ? data.results[0] : null;
      }

      if (tmdbData) {
        return {
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
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting personalized recommendation:', error);
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
    genre_ids?: number[];
    vote_average?: number;
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
  const historySummary = historyItems
    .slice(0, 10)
    .map(
      item =>
        `- "${item.title || item.name}" (${item.type}, rating: ${
          item.vote_average || 'N/A'
        })`,
    )
    .join('\n');

  const system = {
    role: 'system' as const,
    content: `You are Theater AI, an expert movie and TV show recommender. 
Based on the user's watch history, recommend 8 diverse movies or TV shows they would love.
Consider their viewing patterns, genres, and preferences.
Return ONLY a JSON array with title, year, and type. No explanations.
Format: [{"title": "Title1", "year": "2024", "type": "movie"}, {"title": "Title2", "year": "2023", "type": "tv"}]`,
  };

  const user = {
    role: 'user' as const,
    content: `Based on my watch history, recommend 8 movies or TV shows I would enjoy:\n\n${historySummary}`,
  };

  try {
    const result = await callGemini([system, user]);

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
    console.error('Error getting personalized recommendations:', error);
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

=== FILTER PARAMETERS ===
{
  "sort_by": "popularity.desc" | "vote_average.desc" | "primary_release_date.desc" | "original_title.asc",
  "vote_average.gte": number (0-10),
  "primary_release_date.gte": "YYYY-MM-DD",
  "primary_release_date.lte": "YYYY-MM-DD",
  "first_air_date.gte": "YYYY-MM-DD",
  "first_air_date.lte": "YYYY-MM-DD",
  "with_genres": "id1|id2" (pipe-separated),
  "with_original_language": "code",
  "with_runtime_gte": number (minutes),
  "with_watch_providers": "id1|id2",
  "watch_region": "US"
}

=== RETURN FORMAT ===
{
  "contentType": "movie" | "tv" | "all",
  "filters": {...},
  "explanation": "string"
}

=== STRICT RULES ===
1. CONTENT TYPE DETECTION:
   - "series", "show", "tv", "drama" → contentType: "tv"
   - "movie", "film" → contentType: "movie"
   - Default → "all"

2. GENRE SELECTION:
   - If contentType="movie" → USE ONLY MOVIE GENRES LIST
   - If contentType="tv" → USE ONLY TV SHOW GENRES LIST
   - NEVER use genre IDs not in the correct list!

3. LANGUAGE:
   - USE ONLY language codes from LANGUAGES list
   - Map language name to code (e.g., Tamil→ta, Hindi→hi)

4. PROVIDERS:
   - USE ONLY provider IDs from STREAMING PROVIDERS list
   - Map service name to ID (e.g., Netflix→8)

5. If data not found in lists, OMIT that filter parameter!`,
  };

  const user = {
    role: 'user' as const,
    content: `Parse this search query: "${query}"`,
  };

  try {
    const result = await callGemini([system, user]);
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
    console.error('Error parsing natural language filters:', error);
    return null;
  }
}

// Feature 2: Watchlist Pattern Analysis
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
  recommendations: string;
  recommendedTitles: Array<{title: string; type: 'movie' | 'tv'}>;
} | null> {
  if (!watchlistItems || watchlistItems.length === 0) {
    return null;
  }

  // Prepare summary
  const summary = watchlistItems
    .slice(0, 30)
    .map(
      item =>
        `- "${item.title || item.name}" (${item.type}, rating: ${
          item.vote_average || 'N/A'
        }, genres: ${item.genre_ids?.join(',') || 'none'})`,
    )
    .join('\n');

  const system = {
    role: 'system' as const,
    content: `You are Theater AI's pattern analyzer. Analyze user's watchlist and provide insights.

Return ONLY a JSON object with these exact fields:
{
  "insights": ["insight 1", "insight 2", "insight 3"] (3-5 key patterns you notice),
  "topGenres": ["genre1", "genre2", "genre3"] (most common genre names),
  "averageRating": 7.5 (average rating preference),
  "decadeDistribution": {"2020s": 15, "2010s": 10, "2000s": 5} (content by decade),
  "recommendations": "Based on your patterns, you might enjoy...",
  "recommendedTitles": [
    {"title": "Movie/Show Name", "type": "movie or tv"},
    {"title": "Another Title", "type": "movie or tv"}
  ] (5-7 specific movie/show recommendations based on their taste)
}`,
  };

  const user = {
    role: 'user' as const,
    content: `Analyze this watchlist (${watchlistItems.length} items):\n\n${summary}`,
  };

  try {
    const result = await callGemini([system, user]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        insights: parsed.insights || [],
        topGenres: parsed.topGenres || [],
        averageRating: parsed.averageRating || 0,
        decadeDistribution: parsed.decadeDistribution || {},
        recommendations: parsed.recommendations || '',
        recommendedTitles: parsed.recommendedTitles || [],
      };
    }
    return null;
  } catch (error) {
    console.error('Error analyzing watchlist patterns:', error);
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
  userPreferences?: {
    thematicTags?: Array<{tag: string; description: string}>;
    emotionalTags?: Array<{tag: string; description: string}>;
  },
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

  // Build user preference context
  let preferenceContext = '';
  if (userPreferences) {
    const thematicList = userPreferences.thematicTags
      ?.slice(0, 5)
      .map(t => `"${t.tag}" (${t.description})`)
      .join(', ');
    const emotionalList = userPreferences.emotionalTags
      ?.slice(0, 5)
      .map(t => `"${t.tag}" (${t.description})`)
      .join(', ');

    if (thematicList || emotionalList) {
      preferenceContext = `\n\nUSER'S PROVEN PREFERENCES (based on browse history):`;
      if (thematicList) {
        preferenceContext += `\n- Thematic Tags: ${thematicList}`;
      }
      if (emotionalList) {
        preferenceContext += `\n- Emotional Tags: ${emotionalList}`;
      }
      preferenceContext += `\n\nPrioritize content that matches these preferences. Mention specific preference matches in your reasoning.`;
    }
  }

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
    const result = await callGemini([system, user]);
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
    console.error('Error comparing content:', error);
    return null;
  }
}

// Generate thematic and emotional tags for a single content item
export async function generateTagsForContent(
  title: string,
  overview: string,
  genres: string,
  type: 'movie' | 'tv',
): Promise<{
  thematicTags: Array<{tag: string; description: string; confidence: number}>;
  emotionalTags: Array<{tag: string; description: string; confidence: number}>;
} | null> {
  const cacheKey = `tags:${type}:${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;

  // Try cache first
  try {
    const cached = await cache.get(CACHE_KEYS.AI_TRIVIA, cacheKey);
    if (cached) {
      console.log(`[generateTagsForContent] 📂 Using cached tags for "${title}"`);
      if (typeof cached === 'string') {
        return JSON.parse(cached);
      }
      return cached as any;
    }
  } catch (e) {
    // proceed to fetch fresh
  }

  const system = {
    role: 'system' as const,
    content: `You are Theater AI's content analyzer. Analyze a movie/TV show and identify:

1. THEMATIC TAGS: Story themes, narrative patterns, character archetypes (e.g., "Revenge & Redemption", "Found Family", "Time Travel Paradoxes")
2. EMOTIONAL TAGS: Emotional tones, moods, atmosphere (e.g., "Heartwarming & Uplifting", "Tense & Suspenseful", "Melancholic")

Return ONLY a JSON object with 3-5 tags of each type:
{
  "thematicTags": [
    {"tag": "Short tag (2-4 words)", "description": "Brief explanation", "confidence": 0.0-1.0}
  ],
  "emotionalTags": [
    {"tag": "Short tag (2-4 words)", "description": "Brief explanation", "confidence": 0.0-1.0}
  ]
}

Focus on the most prominent and distinctive tags. Confidence should reflect how strongly the tag applies.`,
  };

  const user = {
    role: 'user' as const,
    content: `Analyze this ${type}:

Title: ${title}
Genres: ${genres}
Overview: ${overview}

Identify the key thematic and emotional tags.`,
  };

  try {
    const result = await callGemini([system, user]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const tags = {
        thematicTags: parsed.thematicTags || [],
        emotionalTags: parsed.emotionalTags || [],
      };
      
      // Cache for 6 months
      await cache.set(
        CACHE_KEYS.AI_TRIVIA,
        cacheKey,
        JSON.stringify(tags),
        180 * 24 * 60 * 60 * 1000, // 6 months
      );
      
      console.log(`[generateTagsForContent] ✅ Generated and cached tags for "${title}" (6 months)`);
      return tags;
    }
    return null;
  } catch (error) {
    console.error('Error generating tags for content:', error);
    return null;
  }
}

// Search content by thematic genre using AI
export async function searchByThematicGenre(
  thematicTag: string,
): Promise<Array<{title: string; year: string; type: 'movie' | 'tv'}> | null> {
  const system = {
    role: 'system' as const,
    content: `You are Theater AI's content discovery assistant. Given a thematic genre/tag, recommend movies and TV shows that match this theme.

Return ONLY a JSON array of 10-15 recommendations with exact titles and years:
[
  {"title": "Movie/Show Title", "year": "2024", "type": "movie"},
  {"title": "Another Title", "year": "2023", "type": "tv"}
]

Focus on content that truly embodies the thematic essence, not just surface-level genre matches. Recommend diverse, well-known content that clearly represents the theme.`,
  };

  const user = {
    role: 'user' as const,
    content: `Find movies and TV shows that match this thematic genre: "${thematicTag}"\n\nRecommend a diverse mix of movies and TV shows that capture this thematic essence.`,
  };

  try {
    const result = await callGemini([system, user]);
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : null;
    }
    return null;
  } catch (error) {
    console.error('Error searching by thematic genre:', error);
    return null;
  }
}

// Search content by emotional tone using AI (with type filter)
export async function searchByEmotionalTone(
  emotionalTag: string,
  contentType?: 'movie' | 'tv',
): Promise<Array<{title: string; year: string; type: 'movie' | 'tv'}> | null> {
  const typeFilter = contentType === 'movie' ? 'movies only' : contentType === 'tv' ? 'TV shows only' : 'movies and TV shows';
  
  const system = {
    role: 'system' as const,
    content: `You are Theater AI's content discovery assistant. Given an emotional tone/mood, recommend content that matches this emotional atmosphere.

Return ONLY a JSON array of 10-15 recommendations with exact titles and years:
[
  {"title": "Movie/Show Title", "year": "2024", "type": "movie"},
  {"title": "Another Title", "year": "2023", "type": "tv"}
]

Focus on content that truly captures the emotional tone and atmosphere, not just genre. Recommend diverse, well-known content.`,
  };

  const user = {
    role: 'user' as const,
    content: `Find ${typeFilter} that match this emotional tone: "${emotionalTag}"\n\nRecommend content that captures this emotional atmosphere and mood.${contentType ? ` IMPORTANT: Return ONLY ${contentType === 'movie' ? 'movies' : 'TV shows'} (type: "${contentType}").` : ''}`,
  };

  try {
    const result = await callGemini([system, user]);
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : null;
    }
    return null;
  } catch (error) {
    console.error('Error searching by emotional tone:', error);
    return null;
  }
}

// Generate Thematic Genres based on user's watchlist and history
export async function generateThematicGenres(
  watchlistItems: Array<{
    title?: string;
    name?: string;
    overview?: string;
    genre_ids?: number[];
    type: 'movie' | 'tv';
  }>,
  historyItems: Array<{
    title?: string;
    name?: string;
    overview?: string;
    genre_ids?: number[];
    type: 'movie' | 'tv';
  }>,
): Promise<{
  thematicTags: Array<{
    tag: string;
    description: string;
    confidence: number;
  }>;
} | null> {
  const allItems = [...watchlistItems, ...historyItems];

  if (allItems.length < 3) {
    return null;
  }

  // Create summary of content
  const contentSummary = allItems
    .slice(0, 50) // Limit to 50 items to avoid token limits
    .map(
      item =>
        `"${item.title || item.name}" (${item.type}) - ${
          item.overview?.slice(0, 100) || 'No overview'
        }`,
    )
    .join('\n');

  const system = {
    role: 'system' as const,
    content: `You are Theater AI's thematic genre analyzer. Based on a user's watching patterns, identify deep thematic preferences beyond standard genres.

Analyze the story themes, narrative patterns, character archetypes, emotional tones, and storytelling styles they prefer.

Return ONLY a JSON object with 5-8 thematic tags:
{
  "thematicTags": [
    {
      "tag": "Short descriptive tag (2-4 words)",
      "description": "Brief explanation of this theme",
      "confidence": 0.0-1.0 (how strongly this theme appears in their content)
    }
  ]
}

Examples of good thematic tags:
- "Underdog Triumphs"
- "Mind-Bending Mysteries"
- "Found Family Bonds"
- "Moral Ambiguity"
- "Time Travel Paradoxes"
- "Revenge & Redemption"
- "Coming of Age"
- "Dystopian Futures"
- "Heist & Strategy"
- "Supernatural Romance"

Focus on narrative themes, not standard genres like "Action" or "Drama".`,
  };

  const user = {
    role: 'user' as const,
    content: `Analyze these ${allItems.length} movies/shows and identify thematic patterns:\n\n${contentSummary}`,
  };

  try {
    const result = await callGemini([system, user]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        thematicTags: (parsed.thematicTags || [])
          .filter((tag: any) => tag.confidence >= 0.5) // Only high-confidence tags
          .slice(0, 8), // Max 8 tags
      };
    }
    return null;
  } catch (error) {
    console.error('Error generating thematic genres:', error);
    return null;
  }
}
