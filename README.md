# DevMemory AI 🧠

> **Persistent Episodic Memory for SRE & DevOps Incident Response**  
> Built with [Vectorize Hindsight](https://hindsight.vectorize.io/) and [Groq](https://groq.com/) for HackwithHyderabad 3.0.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Vectorize Hindsight](https://img.shields.io/badge/Memory-Hindsight-8A2BE2)](https://hindsight.vectorize.io/)

---

## 📌 Problem & Solution

Traditional AI chatbots are stateless—they forget past outages, operational edge cases, and runbook fixes the moment a session ends. When production incidents recur, SRE and on-call teams are forced to diagnose the same issues from scratch.

**DevMemory AI** integrates **Vectorize Hindsight** as an episodic vector memory layer. When an SRE inputs a technical post-mortem (such as **INC-9302**), the system stores exact commands, configuration flags, and remediation steps verbatim. When new raw error logs or recurring alerts appear in future sessions, DevMemory AI recalls historical resolutions and provides tested, actionable runbook commands in seconds.

---

## 🏗️ Architecture

[ Incoming Logs / Queries ]│▼[ Log Preprocessor & Sanitizer ]  (Strips pod hashes, timestamps, and noise)│▼[ Vectorize Hindsight Bank ] <──────> [ Historical Post-Mortem Records ](Semantic Vector Recall)│▼[ Grounded Context Injection ]│▼[ Groq Inference ] ────────────> [ Precise Runbook Mitigation Output ]│▼[ Background Memory Retainer ] ────> [ Incremental Knowledge Storage ]
- **Verbatim Incident Retention**: Preserves runbooks with exact CLI flags, scripts, and environment parameters without lossy LLM summarization.
- **Log Signature Sanitization**: Cleans dynamic pod hashes and timestamps before semantic recall to optimize vector similarity matching.
- **Grounded Runbook Citations**: Grounds Groq LLM generations in past post-mortems, returning exact configuration commands rather than generic checklists.
- **Tenant Isolation**: Namespaces and scopes memory retrieval and retention per authenticated user ID.

---

## 🧪 Demo Scenario: INC-9302 Recurrence

### 1. Ingestion Phase (Incident Baseline)
Submit the post-mortem report into the system:
```text
Incident ID: INC-9302
Service: product-catalog-service and redis-cluster-cache-node-03
Root Cause: Cache Stampede / Thundering Herd caused by scheduled 09:12 marketing drop. Top 50 featured catalog keys expired simultaneously because TTL was set to a flat 24 hours with zero jitter.
Applied Remediation:
1. Rewarm cache keys with jitter: python3 /opt/scripts/cache_warmer.py --keys="product_catalog:featured:*" --jitter=300
2. Temporarily bump client ceiling: redis-cli -h redis-cluster-cache-node-03.internal CONFIG SET maxclients 20000
3. Enable client-side early expiration mutex: kubectl set env deployment/product-catalog-service ENABLE_PROBABILISTIC_EARLY_EXPIRATION=true -n prod
Result: Stored directly in Hindsight memory bank devmemory-ai.2. Recurrence Phase (Simulated Production Outage)In a fresh chat session, submit raw production error logs:Plaintext2026-12-15T11:00:03.204Z [WARN] [product-catalog-service-pod-99fa12-px33m]: Cache miss spike detected (99.2%) on route '/api/v1/products/flash-deals'.
2026-12-15T11:00:05.811Z [FATAL] [redis-cluster-cache-node-03]: Connection error: maxclients reached (10000/10000). Redis rejecting clients.
2026-12-15T11:00:08.102Z [ERROR] [api-gateway-edge-prod]: HTTP 504 Gateway Timeout across 450 downstream requests.
3. Agent ResponseThe agent recalls INC-9302, identifies the cache stampede and Redis connection limits, and provides the three exact remediation commands previously executed.💻 Tech StackComponentTechnologyPurposeFrontendReact, Vite, TypeScriptIncident response console and chat interfaceBackendNode.js, Express, TypeScriptAPI routing, authentication, query sanitizationMemory LayerVectorize HindsightEpisodic vector storage and semantic recallLLM InferenceGroqFast contextual response generation⚡ QuickstartPrerequisitesNode.js (v18+)npm1. Clone & InstallBashgit clone [https://github.com/MahammadAslam9/devmemory-ai.git](https://github.com/MahammadAslam9/devmemory-ai.git)
cd devmemory-ai

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
2. Environment ConfigurationCreate a .env file inside the backend/ directory:Code snippetPORT=5000
GROQ_API_KEY=your_groq_api_key
HINDSIGHT_API_KEY=your_hindsight_api_key
HINDSIGHT_BANK_ID=devmemory-ai
HINDSIGHT_BASE_URL=[https://api.hindsight.vectorize.io](https://api.hindsight.vectorize.io)
3. Run LocallyTerminal 1 (Backend):Bashcd backend
npm run dev
Terminal 2 (Frontend):Bashcd frontend
npm run dev
Open http://localhost:5173 in your browser.📂 Project StructurePlaintextdevmemory-ai/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── hindsight.ts   # Hindsight recall & retention API integration
│   │   │   ├── groq.ts        # Groq LLM inference routines
│   │   │   └── store.ts       # User sessions and conversation management
│   │   └── index.ts           # Express server, auth middleware & API routes
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Chat UI & memory inspection panel
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
└── README.md
