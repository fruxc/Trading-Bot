import * as dotenv from "dotenv";
import { resolve } from "node:path";
import { TradeDatabase } from "@trading-bot/shared";
import { ZerodhaBroker, MockBroker } from "./brokers/zerodha";
import { RiskController, RiskProfiles } from "./risk/risk-controller";
import { TradeMonitor } from "./monitor/trade-monitor";
import {
  startStatusPings,
  startPortfolioUpdates,
  initTelegramNotifier,
} from "./telegram-integration";

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
  dotenv.config({ path: envPath });
} else {
  dotenv.config(); // Fallback to default
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("🚀 EXECUTION SERVICE - Started");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Initialize database
  const db = new TradeDatabase(process.env.DB_PATH || "./trades.db");
  console.log("✅ Database initialized\n");

  // Initialize broker
  let broker;
  const useMockBroker = process.env.USE_MOCK_BROKER === "true" || !process.env.ZERODHA_API_KEY;

  if (useMockBroker) {
    console.log("📊 Using Mock Broker (Paper Trading Mode)");
    broker = new MockBroker();
  } else {
    console.log("📊 Connecting to Zerodha...");
    const apiKey = process.env.ZERODHA_API_KEY;
    const accessToken = process.env.ZERODHA_ACCESS_TOKEN;

    if (!apiKey || !accessToken) {
      console.error(
        "❌ ZERODHA_API_KEY and ZERODHA_ACCESS_TOKEN required in .env for live trading"
      );
      process.exit(1);
    }

    broker = new ZerodhaBroker(apiKey, accessToken, false);
  }

  try {
    await broker.connect();
    console.log("✅ Broker connected\n");
  } catch (error) {
    console.error("❌ Failed to connect broker:", error);
    process.exit(1);
  }

  // Initialize risk controller with chosen profile
  const riskProfile = (process.env.RISK_PROFILE || "CONSERVATIVE") as keyof typeof RiskProfiles;
  const config = RiskProfiles[riskProfile] || RiskProfiles.CONSERVATIVE;

  console.log(`🛡️ Risk Profile: ${riskProfile}`);
  console.log(`   • Max position size: ${config.maxPositionSize}% per trade`);
  console.log(`   • Max daily loss: ${config.maxDailyLoss}%`);
  console.log(`   • Min confidence: ${(config.minConfidence * 100).toFixed(0)}%`);
  console.log(`   • Paper trading: ${config.enablePaperTrading ? "YES" : "NO"}\n`);

  const riskController = new RiskController(config);

  // Initialize trade monitor
  const monitor = new TradeMonitor(db, broker, riskController);

  // Initialize Telegram if configured
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    initTelegramNotifier();
    console.log("✅ Telegram notifications enabled");
    console.log(`   Bot Token: ${process.env.TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);
    console.log(`   Chat ID: ${process.env.TELEGRAM_CHAT_ID}\n`);
  } else {
    console.log("⚠️  Telegram not fully configured");
    if (!process.env.TELEGRAM_BOT_TOKEN) console.log("   Missing: TELEGRAM_BOT_TOKEN");
    if (!process.env.TELEGRAM_CHAT_ID) console.log("   Missing: TELEGRAM_CHAT_ID");
    console.log("   Notifications disabled\n");
  }

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n\n⏹️ Shutting down gracefully...");
    monitor.stop();
    await broker.disconnect();
    db.close();
    console.log("✅ Execution service stopped");
    process.exit(0);
  });

  // Start monitoring approved trades
  await monitor.start();

  // Start Telegram status pings (every 6 hours)
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    startStatusPings();
  }

  // Start portfolio updates (daily at 3:35 PM)
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    startPortfolioUpdates(() =>
      Promise.resolve({
        totalValue: 0,
        cash: 0,
        invested: 0,
        realizedPL: 0,
        unrealizedPL: 0,
        totalPL: 0,
        positions: [],
        dayMetrics: {
          trades: 0,
          wins: 0,
          losses: 0,
          averageWin: 0,
          averageLoss: 0,
          profitFactor: 0,
        },
        weekMetrics: {
          trades: 0,
          wins: 0,
          losses: 0,
          averageWin: 0,
          averageLoss: 0,
          profitFactor: 0,
        },
        monthMetrics: {
          trades: 0,
          wins: 0,
          losses: 0,
          averageWin: 0,
          averageLoss: 0,
          profitFactor: 0,
        },
        diversificationScore: 0,
        riskScore: 0,
      })
    );
  }

  // Log status every minute
  setInterval(() => {
    const status = monitor.getRiskStatus();
    console.log(`\n📊 Risk Status:`);
    console.log(`   Daily orders: ${status.dailyOrdersUsed}/${status.daysOrderLimit}`);
    console.log(`   Daily losses: ${status.dailyLossesAccumulated.toFixed(2)} units`);
  }, 60000);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().catch((error: unknown) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
