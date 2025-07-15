import {Platform} from 'react-native';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = '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';
const MODEL = 'llama3-8b-8192';

async function callGroq(messages: any[]) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
    }),
  });
  if (!response.ok) {
    throw new Error('Groq API error: ' + response.statusText);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// For Movie/Show Details: get similar by story
export async function getSimilarByStory({
  title,
  overview,
}: {
  title: string;
  overview: string;
}) {
  const system = {
    role: 'system',
    content:
      'You are a movie/TV recommender. Given a title and overview, look into the overview closely, the story line of the resulted movie/show should be similar, return a JSON array of up to 10 similar movies or TV shows from TMDB, using only their TMDB IDs or the TMDB response structure. Do not include any explanation or extra text.',
  };
  const user = {
    role: 'user',
    content: `Title: ${title}\nOverview: ${overview}`,
  };
  const result = await callGroq([system, user]);
  console.log('Groq AI similar response:', result);
  try {
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// For Online AI Chat (cinema only)
export async function cinemaChat(
  messages: {role: 'user' | 'assistant'; content: string}[],
) {
  const system = {
    role: 'system',
    content:
      'You are an expert cinema assistant. Only answer questions related to movies, TV, actors, directors, film history, and cinema. Politely refuse unrelated questions.',
  };
  const groqMessages = [system, ...messages];
  return callGroq(groqMessages);
}
