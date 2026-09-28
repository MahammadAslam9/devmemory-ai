# Tests

This directory stores integration, unit, and end-to-end functionality tests for DevMemory AI.

### Backend Verification Scripts

#### 1. Hindsight Memory Integration Test
Verifies real Hindsight Retain and Recall operations against your bank:
```powershell
cd ../backend
npm run test:hindsight
```
*Note: Requires `HINDSIGHT_API_KEY` to be set in `backend/.env`.*

#### 2. Full Hindsight + Groq Chat Pipeline Test
Verifies end-to-end Chat Recall → Groq LLM Answer Generation → Retain Memory cycle:
```powershell
cd ../backend
npm run test:chat
```
*Note: Requires `HINDSIGHT_API_KEY` and `GROQ_API_KEY` in `backend/.env`.*
