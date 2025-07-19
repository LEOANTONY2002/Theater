import {Platform} from 'react-native';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = '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';
const MODEL = 'meta-llama/llama-4-maverick-17b-128e-instruct';

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
  type,
}: {
  title: string;
  overview: string;
  type: 'movie' | 'tv';
}) {
  const system = {
    role: 'system',
    content: `You are a movie/TV recommender. 
      Given a title and story, look into the story closely, the story line of the resulted movie/show should be similar, 
      return a JSON array of id up to 5 similar movies or TV shows from TMDB. 
      Do not include any explanation or extra text. Just return the JSON array.`,
  };
  const user = {
    role: 'user',
    content: `Title: ${title}\nStory: ${overview}\nType: ${type}`,
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
