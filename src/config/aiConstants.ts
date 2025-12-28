export const AI_CONSTANTS = {
  // Updated to Lite model as it has higher RPD (1000) vs 2.0 Flash (200)
  DEFAULT_MODEL: 'gemini-2.5-flash-lite',
  MODELS: [
    {
      id: 'gemini-2.5-flash-lite',
      name: 'Gemini 2.5 Flash Lite',
      description: 'Highest free tier limits (1000 RPD), good for most tasks',
    },
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      description: 'Workhorse model, intelligent (200 RPD)',
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Balanced performance (250 RPD)',
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      description: 'Fast and efficient fallback',
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      description: 'Complex reasoning (Restricted limits)',
    },
  ],
};
