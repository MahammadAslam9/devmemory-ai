import dotenv from 'dotenv';
dotenv.config();

const HINDSIGHT_BANK_ID = process.env.HINDSIGHT_BANK_ID || 'devmemory-ai';
const HINDSIGHT_API_KEY = process.env.HINDSIGHT_API_KEY || '';
const HINDSIGHT_BASE_URL = (
  process.env.HINDSIGHT_BASE_URL || 'https://api.hindsight.vectorize.io'
).replace(/\/+$/, '');

export function getHindsightApiKey(): string {
  return HINDSIGHT_API_KEY;
}

export function getHindsightBankId(): string {
  return HINDSIGHT_BANK_ID;
}

export interface RecalledMemory {
  text: string;
  score?: number;
  metadata?: Record<string, any>;
}

export interface RecallResult {
  results: RecalledMemory[];
}

export function cleanMemoryText(text: string): string {
  if (!text) return '';
  return text.trim();
}

/**
 * Recall memories using direct HTTP POST to avoid SDK path serialization bugs
 */
export async function recallMemories(
  query: string,
  userId: string,
  limit: number = 5
): Promise<RecallResult> {
  try {
    console.log(`\n🧠 [RECALL QUERY] User: ${userId} | Query: "${query.slice(0, 100)}..."`);

    const url = `${HINDSIGHT_BASE_URL}/v1/default/banks/${encodeURIComponent(HINDSIGHT_BANK_ID)}/memories/recall`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HINDSIGHT_API_KEY}`,
      },
      body: JSON.stringify({
        query: query,
        limit: limit,
        max_results: limit,
        user: userId,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const allResults = data?.results || data?.data || [];
    
    // Explicitly cap to the requested limit so prompt context stays clean
    const rawResults = allResults.slice(0, limit);

    const memories: RecalledMemory[] = rawResults.map((item: any) => ({
      text: item.content || item.text || item.memory || item.document || '',
      score: item.score ?? 0,
      metadata: item.metadata || {},
    }));

    console.log(`🧠 [RECALL SUCCESS] Displaying top ${memories.length} relevant memories for user: ${userId}`);
    memories.forEach((m, idx) => {
      console.log(`   [Memory ${idx + 1}] (${m.score?.toFixed(3)}): ${m.text.slice(0, 120)}...`);
    });

    return { results: memories };
  } catch (error: any) {
    console.error(`❌ [RECALL ERROR] Failed to recall memories for user ${userId}:`, error.message);
    return { results: [] };
  }
}

/**
 * Retain memory directly into Hindsight using the valid schema: { items: [{ content, ... }] }
 */
export async function retainMemory(
  text: string,
  userId: string,
  metadata: Record<string, any> = {}
): Promise<boolean> {
  if (!text || !text.trim()) {
    console.warn(`⚠️ [RETAIN SKIPPED] Attempted to retain empty text for user: ${userId}`);
    return false;
  }

  try {
    console.log(`💾 [RETAIN ATTEMPT] User: ${userId} | Text: "${text.slice(0, 100)}..."`);

    const url = `${HINDSIGHT_BASE_URL}/v1/default/banks/${encodeURIComponent(HINDSIGHT_BANK_ID)}/memories`;
    const trimmed = text.trim();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HINDSIGHT_API_KEY}`,
      },
      body: JSON.stringify({
        items: [
          {
            content: trimmed,
            text: trimmed,
            user: userId,
            metadata: {
              ...metadata,
              userId: userId,
              timestamp: new Date().toISOString(),
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    console.log(`💾 [RETAIN SUCCESS] Memory saved successfully for user: ${userId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ [RETAIN FAILED] Could not save memory for user ${userId}:`, error.message);
    return false;
  }
}