# DevMemory AI

> **HackWithHyderabad 3.0 Hackathon Project**  
> *Theme: “AI Agents That Learn Using Hindsight”*

DevMemory AI is an intelligent developer assistant that eliminates context loss during coding, onboarding, and project maintenance by remembering:
- Project technology stack
- Architectural decisions and technical rationale
- Previous bugs, edge cases, and troubleshooting history
- Bug solutions, workarounds, and fixes
- Developer preferences and coding standards
- Important project context across conversations

Powered by **Hindsight** for persistent semantic memory and **Groq LLM** for ultra-fast, contextual intelligence.

---

## Technology Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + TypeScript (Express REST API)
- **Persistent Memory Engine**: Hindsight ([`@vectorize-io/hindsight-client`](https://www.npmjs.com/package/@vectorize-io/hindsight-client))
- **LLM Reasoning**: Groq SDK (`groq-sdk`) using `openai/gpt-oss-120b`

---

## Chat Memory Architecture & Flow

```text
User Question / Context (Frontend)
               ↓
Backend REST API (`POST /api/chat`)
               ↓
Hindsight Recall (`recallMemories`)
[Retrieves relevant project & developer memories]
               ↓
Groq LLM (`generateAnswer`)
[Receives user message + recalled memories in system prompt]
               ↓
AI Generates Personalized Context-Aware Answer
               ↓
Hindsight Retain (`extractMemoryForRetention` & `retainMemory`)
[Distills and retains concise, useful facts to durable memory bank]
               ↓
Frontend Receives Answer + "Memories DevMemory AI used"
```

---

## Environment Configuration

Create or update `backend/.env` (use `backend/.env.example` as a template):

```env
# Hindsight Configuration
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
HINDSIGHT_API_KEY=your_hindsight_api_key_here
HINDSIGHT_BANK_ID=devmemory-ai

# Groq Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b

# Backend Port (Optional)
PORT=5000
```

> **Security Note**: All secrets reside strictly on the backend in `.env` (ignored by Git). Keys are never exposed to the client-side frontend.

---

## Quickstart & Running the Project

### 1. Run the Backend Server
```powershell
cd backend
npm run dev
```
*(On Windows PowerShell with execution restrictions, use `npm.cmd run dev`)*  
The backend will run at `http://localhost:5000`.

### 2. Run the Frontend Client
```powershell
cd frontend
npm run dev
```
*(On Windows PowerShell, use `npm.cmd run dev`)*  
The frontend will run at `http://localhost:5173` with Vite automatically proxying `/api` requests to the backend.

---

## Testing & Verification Scripts

### Test Hindsight Memory (Retain & Recall)
```powershell
cd backend
npm run test:hindsight
```

### Test Complete Hindsight + Groq Chat Pipeline
```powershell
cd backend
npm run test:chat
```

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check returning status and service name |
| `POST` | `/api/memory` | Retains a durable memory into Hindsight (`{ "content": "..." }`) |
| `GET` | `/api/memories?query=...` | Recalls memories matching a semantic search query |
| `POST` | `/api/chat` | Authenticated AI chat with user-isolated Hindsight recall/retain and conversation history |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Log in and receive a session token |
| `GET` | `/api/conversations` | List the signed-in user’s chats |
| `GET` | `/api/conversations/:id/messages` | Load one of the signed-in user’s chats |

---

## Project Structure
```text
devmemory-ai/
├── frontend/                     # React + TypeScript + Vite UI
│   ├── src/
│   │   ├── App.tsx               # Chat interface & memory visibility cards
│   │   ├── index.css             # Dark modern developer UI styles
│   │   └── main.tsx
│   ├── vite.config.ts            # Vite config with backend /api proxy
│   └── package.json
├── backend/                      # Node.js + TypeScript REST API
│   ├── src/
│   │   ├── services/
│   │   │   ├── hindsight.ts      # Real Hindsight client (Retain & Recall)
│   │   │   └── groq.ts           # Groq LLM service & memory distillation
│   │   ├── index.ts              # API routes (/api/chat, /api/memory, /api/memories, /api/health)
│   │   ├── test-hindsight.ts     # Verification script for Hindsight
│   │   └── test-chat.ts          # Verification script for Chat pipeline
│   ├── .env.example              # Environment variables template
│   ├── .gitignore                # Protects .env and secrets
│   └── package.json
├── ai/                           # AI modules and prompt assets
├── demo-data/                    # Sample developer memory datasets
├── tests/                        # Automated test suites
├── README.md                     # Comprehensive project documentation
└── .gitignore                    # Root Git ignore rules
```

## Current MVP Features

- User registration and login
- User-isolated chat history
- User-tagged Hindsight memories with server-side filtering
- New Chat button
- Responsive desktop/mobile chat layout
- Voice input using browser speech recognition when supported
- AI voice playback using browser speech synthesis
- Short, focused AI answers
- Hindsight memory inspector
- No automatic prompt/recommendation cards on startup
- SEO metadata and mobile-friendly viewport settings

### Local persistence note
The current hackathon MVP stores account/session/chat metadata in `backend/data/store.json` and keeps Hindsight as the semantic memory layer. For production deployment, replace this local JSON store with PostgreSQL and use a production session/authentication strategy.
