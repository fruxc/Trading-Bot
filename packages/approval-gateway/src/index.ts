/**
 * Approval Gateway Entry Point
 * Exposes webhook endpoints for trade approval/rejection
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { TradeDatabase } from '@trading-bot/shared';
import { createServer } from './server';
import { initTelegramNotifier, testTelegramConnection } from './telegram-integration';

// Load .env from workspace root (try multiple paths)
const envPaths = [
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../../.env'),
];

let envPath: string | undefined;
for (const path of envPaths) {
  const fs = require('node:fs');
  if (fs.existsSync(path)) {
    envPath = path;
    break;
  }
}

if (envPath) {
  config({ path: envPath });
} else {
  config(); // Fallback to default
}

const PORT = Number.parseInt(process.env.GATEWAY_PORT || '3000', 10);
const db = new TradeDatabase(process.env.DATABASE_PATH);
const app = createServer(db);

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Approval Gateway running on http://localhost:${PORT}`);
  console.log('📌 Endpoints:');
  console.log(`  POST /webhooks/trade-approval - Approve/reject a trade`);
  console.log(`  GET /trades/pending - List pending trades`);
  console.log(`  GET /trades - List all trades`);
  console.log('');
});

// Initialize Telegram and test connection
async function initializeServices() {
  console.log('🔄 Initializing services...\n');

  // Initialize Telegram
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    console.log('🔌 Initializing Telegram...');
    initTelegramNotifier();
    
    // Test connection
    const telegramConnected = await testTelegramConnection();
    if (telegramConnected) {
      console.log('✅ Telegram notifications enabled\n');
    } else {
      console.warn('⚠️  Telegram connection failed - check your configuration\n');
      console.log('📝 Configuration check:');
      console.log(`   TELEGRAM_BOT_TOKEN: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Missing'}`);
      console.log(`   TELEGRAM_CHAT_ID: ${process.env.TELEGRAM_CHAT_ID ? '✅ Set to: ' + process.env.TELEGRAM_CHAT_ID : '❌ Missing'}`);
      console.log(`   Note: Chat ID must be numeric (not bot name)\n`);
    }
  } else {
    console.log('⚠️  Telegram not configured (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing)');
    console.log('   Notifications will not be sent\n');
  }

  // Demo trade generation disabled - trades created by strategy service
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
// Initialize services
initializeServices()
  .then(() => console.log('✅ Approval Gateway ready'))
  .catch((error) => {
    console.error('❌ Initialization failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
