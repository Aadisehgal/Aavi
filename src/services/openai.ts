import axios from 'axios';
import type {Message} from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function* streamChatCompletion(
  messages: Message[],
  apiKey: string,
  systemPrompt: string,
): AsyncGenerator<string, void, unknown> {
  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: 'gpt-4o-mini',
      messages: [
        {role: 'system', content: systemPrompt},
        ...messages.map(m => ({role: m.role, content: m.content})),
      ],
      stream: true,
      max_tokens: 2048,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      responseType: 'text',
      timeout: 60000,
    },
  );

  const lines = response.data.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      } catch {
        // Ignore parse errors for incomplete chunks
      }
    }
  }
}

export async function sendChatMessage(
  messages: Message[],
  apiKey: string,
  systemPrompt: string,
): Promise<string> {
  const response = await axios.post(
    OPENAI_API_URL,
    {
      model: 'gpt-4o-mini',
      messages: [
        {role: 'system', content: systemPrompt},
        ...messages.map(m => ({role: m.role, content: m.content})),
      ],
      max_tokens: 2048,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    },
  );

  return response.data.choices[0].message.content;
}
