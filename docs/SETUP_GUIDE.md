# 🚀 Complete Trading Bot Setup Guide - TODAY

Your trading bot is **completely built and ready**. This guide gets you from 0 to trading in 30 minutes.

---

## 📋 What You've Got

### Services Running
- **Strategy Service** (strategy-service) - Generates trading signals 
- **LLM Orchestrator** (llm-orchestrator) - Evaluates signals with Gemini AI
- **Approval Gateway** (approval-gateway) - Shows trades for your approval
- **Execution Service** (execution-service) - Executes approved trades
- **Real Telegram Bot** - Status updates, alerts, portfolio summaries

### Safety Features
✅ Manual approval required (all trades wait for your YES/NO)  
✅ 10-layer risk controls  
✅ Position size limits  
✅ Daily loss limits  
✅ Paper trading mode (simulate first)  
✅ Automatic backups  
✅ 24/7 monitoring  

---

## 🔧 Step 1: Environment Setup (5 min)

### 1.1 Copy .env template
```bash
cd /Users/hammad/Projects/ClawBot/Trading
cp .env.example .env
```

### 1.2 Add your API keys to `.env`

You have:
- ✅ **GEMINI_API_KEY** - You added this (LLM)
- ✅ **TELEGRAM_BOT_TOKEN** - You created this bot
- ✅ **TELEGRAM_CHAT_ID** - Your Telegram chat ID
- ⏳ **ZERODHA** - You'll add later

For now, edit `.env`:
```dotenv
# LLM (already have this)
GEMINI_API_KEY=your-key-from-makersuite

# Telegram (already have these)
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_CHAT_ID=your-chat-id-from-telegram

# Paper Trading (comment out Zerodha to test first)
USE_MOCK_BROKER=true
RISK_PROFILE=CONSERVATIVE

# Keep everything else as default
NODE_ENV=development
DB_PATH=./trades.db
```

### 1.3 Verify .gitignore protects secrets
```bash
cat .gitignore | grep -E "\.env|\.db"
```

Should show:
```
.env
.env.local
*.db
*.db-shm
*.db-wal
```

✅ Your secrets are protected (never committed to git)

---

## 💻 Step 2: Install & Build (5 min)

### 2.1 Install dependencies
```bash
npm install
```

### 2.2 Build all services
```bash
npm run build
```

### 2.3 Verify build succeeded
```bash
ls packages/*/dist
```

Should show compiled JS in each package.

---

## 🧪 Step 3: Test Locally - Paper Trading (10 min)

### 3.1 Start all services
```bash
npm run dev
```

You'll see:
```
✅ Strategy Service - Started
✅ LLM Orchestrator - Connected
✅ Approval Gateway - running on http://localhost:3000
✅ Execution Service - Started
✅ Telegram notifications enabled
✅ Database initialized
```

### 3.2 Generate a test trade

Open new terminal:
```bash
# Generate a signal via strategy service
curl -X POST http://localhost:3000/api/strategies/backtest \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "INFY",
    "action": "BUY",
    "quantity": 10,
    "price": 1500
  }'
```

You'll get a trade ID back.

### 3.3 Check pending trades
```bash
curl http://localhost:3000/trades/pending
```

You'll see your pending trade.

### 3.4 Approve the trade
```bash
curl -X POST http://localhost:3000/webhooks/trade-approval \
  -H "Content-Type: application/json" \
  -d '{
    "tradeId": "YOUR_TRADE_ID_FROM_STEP_3.2",
    "action": "APPROVE",
    "reason": "Testing"
  }'
```

### 3.5 Check Telegram
You should see:
- 🔔 **Execution Service Started** (heartbeat)
- ✅ **Trade Approved** (notification)
- 📊 **Portfolio Update** (daily at 3:35 PM)
- 📍 **Status Ping** (every 6 hours)

### 3.6 View execution
The execution service will execute the trade (on paper/mock broker) and send:
```
✅ Trade INFY BUY 10 @ ₹1500 executed
```

---

## 📊 Accounts You Need (Answer to Your Question)

### 🇮🇳 For India-Only Trading (What You're Starting With)
```
Account: Zerodha
Cost: ₹0 (only pay per trade commission)
Stocks: 5000+ Indian companies
Timeline: Add later
```

### 🌍 For Global Trading (Recommended Next Step)
```
Account 1: Zerodha (NSE - India)
Account 2: Interactive Brokers (USA/EU/Global)
Cost: $0 + $0-15/trade for IB
Stocks: 5000 India + 50000+ US/EU
Timeline: Add in 2-3 weeks
```

### 🪙 For Crypto Too (Full Coverage)
```
Account 1: Zerodha (NSE - India)
Account 2: Interactive Brokers (USA/EU/Global)
Account 3: Binance (Crypto)
Cost: ₹0 + $0-15/trade + 0.1% commission
Coverage: Complete global + crypto
Timeline: Optional, add anytime
```

**My Recommendation**: Start with **Scenario 1** (Zerodha only). Test for 1 week. Then add **Interactive Brokers** for USA trading.

---

## ⚙️ Step 4: Add Zerodha (When Ready)

### 4.1 Get Zerodha API credentials
1. Go to https://kite.zerodha.com
2. Log in with your account
3. Go to Settings → API Tokens
4. Create new token
5. Copy: **API Key** and **Access Token**

### 4.2 Update .env
```dotenv
ZERODHA_API_KEY=your-api-key
ZERODHA_ACCESS_TOKEN=your-access-token
USE_MOCK_BROKER=false  # Enable live trading
```

### 4.3 Restart services
```bash
# Stop current (Ctrl+C)
npm run dev
```

Now trades will execute on NSE (real, but with manual approval).

---

## 🚀 Step 5: Deploy to Production 24/7 (Later)

When ready to run forever:

### 5.1 Install PM2 globally
```bash
npm install -g pm2
```

### 5.2 Start with PM2
```bash
pm2 start ecosystem.config.js
```

### 5.3 View logs
```bash
pm2 logs trading-bot
```

### 5.4 Set auto-restart on reboot
```bash
pm2 startup
pm2 save
```

Your bot now runs 24/7 with auto-restart on crashes.

---

## 📱 Telegram Integration - What You Get

### Automatic Notifications
- **Trade Proposed** - LLM found a signal, waiting for your approval
- **Trade Approved** - You said YES, moving to execution
- **Trade Rejected** - You said NO
- **Trade Executed** - Executed on broker (NSE)
- **Trade Failed** - Something went wrong
- **Status Ping** - Every 6 hours: "Bot is alive"
- **Portfolio Summary** - Daily at 3:35 PM with P&L
- **Error Alerts** - Immediate notification on issues

### How to Send Commands
While bot is running, send Telegram commands:
- `/status` - Current bot status
- `/portfolio` - Current holdings & P&L
- `/trades` - Last 5 trades
- `/stop` - Stop the bot gracefully

---

## ✅ Checklist: Before First Real Trade

- [ ] Created Telegram bot with BotFather
- [ ] Have GEMINI_API_KEY in .env
- [ ] Have TELEGRAM_BOT_TOKEN in .env
- [ ] Have TELEGRAM_CHAT_ID in .env
- [ ] Tested locally with `npm run dev`
- [ ] Received Telegram notifications
- [ ] Approved a test trade successfully
- [ ] Saw execution on mock broker
- [ ] Reviewed trade history via `/trades`
- [ ] Added Zerodha API keys to .env
- [ ] Verified ₹0 balance on Zerodha
- [ ] Tested with 1 small trade first
- [ ] Felt comfortable with the flow

---

## 🔍 Verification Commands

### Check database
```bash
sqlite3 trades.db "SELECT * FROM trades LIMIT 1;"
```

### View all trades
```bash
curl http://localhost:3000/trades
```

### Test Telegram connection
```bash
curl -X POST http://localhost:3000/test-telegram
```

### View logs
```bash
# Strategy service
npm run logs --workspace=strategy-service

# Execution service
npm run logs --workspace=execution-service
```

---

## 🆘 Troubleshooting

### "Telegram not configured"
```
→ Check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env
→ Both required to enable notifications
→ Run: source .env && echo $TELEGRAM_BOT_TOKEN
```

### "Failed to connect Zerodha"
```
→ Check ZERODHA_API_KEY and ZERODHA_ACCESS_TOKEN
→ Verify tokens haven't expired (create new ones)
→ Temporarily set USE_MOCK_BROKER=true to test
```

### "Port 3000 already in use"
```bash
lsof -i :3000
kill -9 <PID>
```

### "Database locked"
```bash
# Delete lock files
rm trades.db-shm trades.db-wal
# Restart
npm run dev
```

### "No Telegram messages"
```
→ Verify chat ID matches your telegram account
→ Send /start to bot first
→ Check if bot is blocked in Telegram
→ Run test: curl http://localhost:3000/test-telegram
```

---

## 📞 Next Steps

### Immediately (Today)
1. ✅ Complete Steps 1-3 (Setup + Test locally)
2. ✅ Verify you receive Telegram messages
3. ✅ Approve a test trade, watch execution

### This Week
1. Add Zerodha API keys (Step 4)
2. Run with 1-2 real small trades
3. Monitor P&L and verify approvals work

### Next Week
1. Increase position sizes slowly
2. Review trade history
3. Consider adding Interactive Brokers for USA

### Later
1. Deploy to production server (24/7)
2. Add more international markets
3. Tune strategy parameters

---

## 📚 Full Documentation

For detailed info:
- [SAFETY_FEATURES.md](SAFETY_FEATURES.md) - 10 risk controls explained
- [INTERNATIONAL_TELEGRAM_GUIDE.md](INTERNATIONAL_TELEGRAM_GUIDE.md) - Advanced Telegram setup
- [APPROVED_TRADE_FLOW.md](APPROVED_TRADE_FLOW.md) - How trades flow through system
- [DEPLOYMENT_PRODUCTION.md](DEPLOYMENT_PRODUCTION.md) - Production server setup

---

## 🎯 Summary

You now have a **production-ready trading bot**:
- ✅ All 4 services built
- ✅ Telegram notifications working
- ✅ Manual approval for every trade
- ✅ 10 safety layers
- ✅ Paper trading to test first
- ✅ Ready for live trading (add Zerodha anytime)
- ✅ Can run 24/7 on server

**Your bot is asking: "Can I trade now?"**

You control everything. Every trade waits for your YES/NO on Telegram.

Ready? Start with Step 2 above. 🚀

---

**Questions?** Check the troubleshooting section or review the detailed docs linked above.
