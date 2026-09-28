import dotenv from 'dotenv';
import {
  getHindsightApiKey,
  getHindsightBaseUrl,
  getHindsightBankId,
  recallMemories,
  retainMemory,
} from './services/hindsight';
import {
  getGroqApiKey,
  getGroqModel,
  generateAnswer,
  extractMemoryForRetention,
} from './services/groq';

// Load environment configuration
dotenv.config();

async function runChatTest() {
  console.log('====================================================');
  console.log(' DevMemory AI — Hindsight + Groq Chat Test');
  console.log('====================================================');

  const hindsightKey = getHindsightApiKey();
  const groqKey = getGroqApiKey();
  const baseUrl = getHindsightBaseUrl();
  const bankId = getHindsightBankId();
  const model = getGroqModel();

  console.log(`Hindsight Base URL : ${baseUrl}`);
  console.log(`Hindsight Bank ID  : ${bankId}`);
  console.log(`Hindsight API Key  : ${hindsightKey ? '[CONFIGURED]' : '[MISSING]'}`);
  console.log(`Groq Model         : ${model}`);
  console.log(`Groq API Key       : ${groqKey ? '[CONFIGURED]' : '[MISSING]'}`);
  console.log('----------------------------------------------------');

  if (!hindsightKey || !groqKey) {
    console.warn('\n⚠️  Notice: Required API keys are not fully configured in backend/.env');
    if (!hindsightKey) console.log('  - HINDSIGHT_API_KEY is missing');
    if (!groqKey) console.log('  - GROQ_API_KEY is missing');
    console.log('\nTo test with live Hindsight and Groq services:');
    console.log('  1. Add your keys to backend/.env:');
    console.log('     HINDSIGHT_API_KEY=<your_key>');
    console.log('     GROQ_API_KEY=<your_groq_key>');
    console.log('  2. Re-run: npm run test:chat (or npm.cmd run test:chat)\n');
    console.log('====================================================');
    return;
  }

  try {
    const testMessage = 'What database and tech stack does our project use?';
    console.log(`\n[1/3] Calling Hindsight Recall with query: "${testMessage}"...`);
    const recallResponse = await recallMemories(testMessage);
    const memories = (recallResponse.results || []).map((m) => ({ text: m.text }));

    console.log(`Recalled ${memories.length} memories:`);
    memories.forEach((m, idx) => console.log(`  [${idx + 1}] ${m.text}`));

    console.log(`\n[2/3] Calling Groq LLM (${model}) with question + memories...`);
    const answer = await generateAnswer(testMessage, memories);
    console.log('\n--- AI Generated Answer ---');
    console.log(answer);
    console.log('---------------------------');

    console.log(`\n[3/3] Extracting concise memory and retaining to Hindsight...`);
    const memoryToRetain = await extractMemoryForRetention(testMessage, answer);
    console.log(`Memory distilled for retention: "${memoryToRetain}"`);

    const retainResult = await retainMemory(memoryToRetain);
    console.log('Retain response:');
    console.log(JSON.stringify(retainResult, null, 2));

    console.log('\n✅ Real Hindsight + Groq Chat pipeline executed successfully.');
    console.log('====================================================');
  } catch (error: any) {
    console.error('\n❌ Chat test failed:');
    console.error(error.message || error);
    if (error.statusCode) console.error(`Status code: ${error.statusCode}`);
    if (error.details) console.error('Details:', error.details);
    console.log('====================================================');
  }
}

runChatTest();
