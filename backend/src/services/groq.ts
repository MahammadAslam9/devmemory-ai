import Groq from 'groq-sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export function getGroqApiKey(): string | undefined {
  return process.env.GROQ_API_KEY?.trim() || undefined;
}

export function getGroqModel(): string {
  return process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';
}

export function getGroqClient(): Groq {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in backend environment variables.');
  }
  return new Groq({ apiKey });
}

export interface RecalledMemoryItem {
  text: string;
  [key: string]: unknown;
}

/**
 * Generates an answer using Groq LLM infused with recalled Hindsight memories
 */
export async function generateAnswer(
  userMessage: string,
  memories: RecalledMemoryItem[] = []
): Promise<string> {
  const groq = getGroqClient();
  const model = getGroqModel();

  let memorySection = 'No previous memories found for this context.';
  if (memories && memories.length > 0) {
    memorySection = memories
      .map((m, idx) => `[Memory ${idx + 1}]: ${m.text}`)
      .join('\n');
  }

  const systemPrompt = `You are DevMemory AI, an intelligent developer assistant that remembers project context across conversations.
You are powered by Hindsight for durable semantic memory.

Here are the recalled project and developer memories from Hindsight:
---
${memorySection}
---

Guidelines:
1. Use the recalled memories to give tailored, accurate, and context-specific answers.
2. If relevant memories exist (e.g., tech stack choices, architectural decisions, developer preferences, resolved bugs), reference them naturally.
3. Do NOT make up or hallucinate project details, decisions, or technologies not present in memories or provided by the developer.
4. If you don't know something or no memories exist, state what you know and ask for clarification directly.
5. Be concise, practical, and clear.
6. Keep normal answers short: usually 2-5 sentences or a few bullets.
7. Do not repeat the user question or add unnecessary introductions.`;

  const response = await groq.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content || 'No response generated.';
}

/**
 * Synthesizes a concise memory entry to retain in Hindsight after an interaction
 */
export async function extractMemoryForRetention(
  userMessage: string,
  answer: string
): Promise<string> {
  try {
    const groq = getGroqClient();
    const model = getGroqModel();

    const prompt = `Given this developer conversation turn:
Developer: "${userMessage}"
AI Assistant: "${answer}"

Write a concise 1-2 sentence factual summary of any project decision, technology, preference, bug, solution, or key question discussed that should be remembered for future developer sessions.
Do not write commentary or conversational filler. Return only the concise memory statement.`;

    const response = await groq.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 150,
    });

    const summary = response.choices[0]?.message?.content?.trim();
    if (summary && summary.length > 0) {
      return summary;
    }
  } catch {
    // Fallback if summarization fails or is rate-limited
  }

  return `Developer asked: "${userMessage.slice(0, 100)}". Context: ${answer.slice(0, 150)}`;
}
