import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import {
  retainMemory,
  recallMemories,
  getHindsightApiKey,
  cleanMemoryText,
} from './services/hindsight';

import {
  generateAnswer,
  extractMemoryForRetention,
  getGroqApiKey,
} from './services/groq';

import {
  addMessage,
  createConversation,
  createSession,
  createUser,
  findUserByEmail,
  getConversation,
  getUserByToken,
  listConversations,
  listMessages,
  updateConversationTitle,
  verifyPassword,
} from './services/store';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

type AuthRequest = Request & {
  userId?: string;
  userName?: string;
};

async function auth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.header('authorization') || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : '';

  const user = token
    ? await getUserByToken(token)
    : undefined;

  if (!user) {
    return res.status(401).json({
      error: 'Please log in to continue.',
    });
  }

  req.userId = user.id;
  req.userName = user.name;

  next();
}

/* =========================
   HEALTH
========================= */

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'DevMemory AI',
  });
});

/* =========================
   AUTH
========================= */

app.post('/api/auth/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '');

    if (
      name.length < 2 ||
      !email.includes('@') ||
      password.length < 6
    ) {
      return res.status(400).json({
        error:
          'Enter a name, valid email, and password of at least 6 characters.',
      });
    }

    const user = await createUser(
      name,
      email,
      password
    );

    const token = await createSession(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      error: error.message || 'Registration failed.',
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');

  const user = await findUserByEmail(email);

  if (
    !user ||
    !verifyPassword(password, user.passwordHash)
  ) {
    return res.status(401).json({
      error: 'Invalid email or password.',
    });
  }

  const token = await createSession(user.id);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});

app.get(
  '/api/auth/me',
  auth,
  async (req: AuthRequest, res) => {
    res.json({
      user: {
        id: req.userId,
        name: req.userName,
      },
    });
  }
);

/* =========================
   CONVERSATIONS
========================= */

app.get(
  '/api/conversations',
  auth,
  async (req: AuthRequest, res) => {
    res.json({
      conversations: await listConversations(
        req.userId!
      ),
    });
  }
);

app.post(
  '/api/conversations',
  auth,
  async (req: AuthRequest, res) => {
    const conversation = await createConversation(
      req.userId!,
      String(req.body.title || 'New Chat')
    );

    res.status(201).json({
      conversation,
    });
  }
);

app.get(
  '/api/conversations/:id/messages',
  auth,
  async (req: AuthRequest, res) => {
    const conversation = await getConversation(
      req.userId!,
      req.params.id
    );

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found.',
      });
    }

    res.json({
      conversation,
      messages: await listMessages(
        req.userId!,
        req.params.id
      ),
    });
  }
);

/* =========================
   MEMORY SEARCH
========================= */

app.get(
  '/api/memories',
  auth,
  async (req: AuthRequest, res) => {
    try {
      const query = String(
        req.query.query || ''
      ).trim();

      if (!query) {
        return res.status(400).json({
          error: 'query parameter is required',
        });
      }

      const response = await recallMemories(
        query,
        req.userId!,
        10
      );

      res.json({
        query,
        memories: (response.results || []).map(
          (result) => ({
            ...result,
            text: cleanMemoryText(result.text),
          })
        ),
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error:
          error.message ||
          'Failed to recall memories.',
      });
    }
  }
);

/* =========================
   MANUAL MEMORY
========================= */

app.post(
  '/api/memory',
  auth,
  async (req: AuthRequest, res) => {
    try {
      const content = String(
        req.body.content || ''
      ).trim();

      if (!content) {
        return res.status(400).json({
          error: 'content is required',
        });
      }

      const result = await retainMemory(
        content,
        req.userId!
      );

      console.log(
        '💾 Manual memory saved successfully'
      );

      res.json({
        success: true,
        result,
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error:
          error.message ||
          'Failed to retain memory.',
      });
    }
  }
);

/* =========================
   CHAT
========================= */

const INCIDENT_KEYWORDS = [
  'incident',
  'root cause',
  'remediation',
  'post-mortem',
  'postmortem',
  'fix',
  'inc-',
  'runbook',
  'workaround',
  'ttl',
  'outage',
  'redis',
  'cluster',
];

function containsIncidentKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return INCIDENT_KEYWORDS.some((kw) => lower.includes(kw));
}

app.post(
  '/api/chat',
  auth,
  async (req: AuthRequest, res) => {
    try {
      const message = String(
        req.body.message || ''
      ).trim();

      let conversationId = String(
        req.body.conversationId || ''
      ).trim();

      if (!message) {
        return res.status(400).json({
          error:
            'message is required and must be a non-empty string',
        });
      }

      if (!getHindsightApiKey()) {
        return res.status(500).json({
          error:
            'HINDSIGHT_API_KEY is not configured.',
        });
      }

      if (!getGroqApiKey()) {
        return res.status(500).json({
          error:
            'GROQ_API_KEY is not configured.',
        });
      }

      /* =========================
         CREATE / GET CONVERSATION
      ========================= */

      let conversation = conversationId
        ? await getConversation(
            req.userId!,
            conversationId
          )
        : undefined;

      if (!conversation) {
        conversation = await createConversation(
          req.userId!,
          message.slice(0, 60)
        );
      }

      conversationId = conversation.id;

      /* =========================
         SAVE USER MESSAGE
      ========================= */

      const userRecord = await addMessage({
        conversationId,
        userId: req.userId!,
        sender: 'user',
        text: message,
      });

      /* =========================
         RECALL MEMORY
      ========================= */

      // Clean query by removing timestamp strings for cleaner vector match
      const cleanQuery = message
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/g, '')
        .replace(/\[\w+\]/g, '')
        .trim();

      const recallResponse =
        await recallMemories(
          cleanQuery || message,
          req.userId!,
          5
        );

      const recalledItems = (
        recallResponse.results || []
      ).map((result) => ({
        text: cleanMemoryText(result.text),
      }));

      console.log(
        `🧠 Chat recalled ${recalledItems.length} memories`
      );

      /* =========================
         GENERATE AI ANSWER
      ========================= */

      const answer = await generateAnswer(
        message,
        recalledItems
      );

      /* =========================
         SAVE AI MESSAGE
      ========================= */

      await addMessage({
        conversationId,
        userId: req.userId!,
        sender: 'ai',
        text: answer,
        memories: recalledItems,
      });

      await updateConversationTitle(
        req.userId!,
        conversationId,
        conversation.title === 'New Chat'
          ? message
          : conversation.title
      );

      /* =========================
         SEND RESPONSE TO CLIENT
      ========================= */

      res.json({
        answer,
        memories: recalledItems,
        conversationId,
        userMessageId: userRecord.id,
      });

      /* =========================
         ASYNC MEMORY RETENTION
      ========================= */

      (async () => {
        try {
          let memoryToRetain = '';

          // 1. Direct retention for incident/post-mortem reports
          if (containsIncidentKeywords(message)) {
            memoryToRetain = message;
            console.log(
              '🔍 [RETENTION ROUTE] Incident keyword matched. Retaining original message directly.'
            );
          } else {
            // 2. Normal conversational extraction via Groq
            try {
              memoryToRetain =
                await extractMemoryForRetention(
                  message,
                  answer
                );
              memoryToRetain = String(memoryToRetain || '').trim();
            } catch (extractError: any) {
              console.warn(
                '⚠️ Memory extraction failed, falling back to message:',
                extractError?.message || extractError
              );
              memoryToRetain = message;
            }
          }

          // Retain if content is meaningful
          if (memoryToRetain && memoryToRetain.length >= 15) {
            await retainMemory(
              memoryToRetain,
              req.userId!
            );
            console.log(
              '💾 Chat memory saved successfully'
            );
          }
        } catch (retainError: any) {
          console.warn(
            '⚠️ Memory retention skipped:',
            retainError?.message || retainError
          );
        }
      })();

    } catch (error: any) {
      console.error(
        'Error in /api/chat:',
        error
      );

      res.status(
        error.statusCode || 500
      ).json({
        error:
          error.message ||
          'Internal server error while processing chat message',
      });
    }
  }
);

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(
    `DevMemory AI backend running on http://localhost:${PORT}`
  );
});