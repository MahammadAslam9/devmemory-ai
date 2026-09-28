import dotenv from 'dotenv';
import {
  getHindsightApiKey,
  getHindsightBaseUrl,
  getHindsightBankId,
  retainMemory,
  recallMemories,
} from './services/hindsight';

// Load environment configuration
dotenv.config();

async function runTest() {
  console.log('====================================================');
  console.log(' DevMemory AI — Hindsight Memory Integration Test');
  console.log('====================================================');

  const apiKey = getHindsightApiKey();
  const baseUrl = getHindsightBaseUrl();
  const bankId = getHindsightBankId();

  console.log(`Base URL : ${baseUrl}`);
  console.log(`Bank ID  : ${bankId}`);
  console.log(`API Key  : ${apiKey ? '[CONFIGURED]' : '[MISSING]'}`);
  console.log('----------------------------------------------------');

  if (!apiKey) {
    console.warn('\n⚠️  Notice: HINDSIGHT_API_KEY is not set in backend/.env');
    console.log('Real Hindsight calls require a valid API key.');
    console.log('\nTo configure real Hindsight credentials:');
    console.log('  1. Copy backend/.env.example to backend/.env');
    console.log('  2. Set your HINDSIGHT_API_KEY=<your_api_key>');
    console.log('  3. Re-run: npm run test:hindsight (or npm.cmd run test:hindsight)\n');
    console.log('====================================================');
    return;
  }

  try {
    // 1. Retain test
    const memoryContent = 'The DevMemory AI project uses React, Node.js and PostgreSQL.';
    console.log(`\n[1/2] Testing Hindsight Retain...`);
    console.log(`Content to retain: "${memoryContent}"`);

    const retainResult = await retainMemory(memoryContent);
    console.log('Retain response:');
    console.log(JSON.stringify(retainResult, null, 2));

    // 2. Recall test
    const recallQuery = 'What technologies does the DevMemory AI project use?';
    console.log(`\n[2/2] Testing Hindsight Recall...`);
    console.log(`Query: "${recallQuery}"`);

    const recallResult = await recallMemories(recallQuery);
    console.log('Recall response:');
    console.log(JSON.stringify(recallResult, null, 2));

    console.log('\nRecalled memories:');
    if (recallResult.results && recallResult.results.length > 0) {
      recallResult.results.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.text}`);
      });
    } else {
      console.log('  (No memories returned by Hindsight)');
    }

    console.log('\n✅ Real Hindsight Retain & Recall tests executed.');
    console.log('====================================================');
  } catch (error: any) {
    console.error('\n❌ Hindsight API call failed:');
    console.error(error.message || error);
    if (error.statusCode) {
      console.error(`Status code: ${error.statusCode}`);
    }
    if (error.details) {
      console.error('Details:', error.details);
    }
    console.log('====================================================');
  }
}

runTest();
