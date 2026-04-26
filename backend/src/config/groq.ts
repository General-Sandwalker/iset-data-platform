import { config } from './env.js';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqChoice {
  message: { role: string; content: string };
  finish_reason: string;
  index: number;
}

interface GroqResponse {
  id: string;
  choices: GroqChoice[];
  model: string;
}

export async function groqChat(
  messages: GroqMessage[],
  model: string = 'llama-3.1-70b-versatile'
): Promise<string> {
  if (!config.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as GroqResponse;
  return data.choices[0]?.message?.content || '';
}