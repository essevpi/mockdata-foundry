import { handleGenerate } from '../src/server/handler.js';

export const config = {
  maxDuration: 60,
};

export default {
  fetch(request: Request) {
    return handleGenerate(request, {
      apiKey: process.env.GROQ_API_KEY,
      fetch,
      log: (entry) => console.info(JSON.stringify({ event: 'generate', ...entry })),
    });
  },
};
