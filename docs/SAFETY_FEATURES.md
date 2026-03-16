# 🛡️ SAFETY FEATURES & RISK CONTROLS

## Complete Safety Architecture

Your trading system has **10 layers of protection** to prevent catastrophic losses and ensure manual approval is ALWAYS required.

---

## Layer 1: Human-in-the-Loop Approval ✅

**Every trade requires manual approval before execution.**

```
Signal Generated → LLM Evaluation → Database (PENDING) → 
[WAIT FOR HUMAN] → Manual Approval (Webhook) → APPROVED → 
Execution Service → Real Trade Placement
```

### How It Works:
1. Strategy generates signal → Stored as `PENDING`
2. LLM evaluates it with portfolio context
3. Proposal sent to Approval Gateway
4. **YOU manually approve via API or dashboard**
5. Only then does Execution Service place the trade

### Manual Approval Endpoints:

```bash
# Check pending trades waiting for approval
curl http://localhost:3000/trades/pending

# Sample response:
{
  "trades": [
    {
      "id": "uuid",
      "symbol": "AAPL",
      "action": "BUY",
      "quantity": 15,
      "price": 150,
      "status": "PENDING",
      "proposal_reason": "Signal confidence 78% is acceptable"
    }
  ]
}

# Manually APPROVE a trade
curl -X POST http://localhost:3000/webhooks/trade-approval \
  -H "Content-Type: application/json" \
  -d '{
    "tradeId": "uuid",
    "action": "APPROVE",
    "reason": "Looks good, market conditions favor this"
  }'

# Or REJECT a trade
curl -X POST http://localhost:3000/webhooks/trade-approval \
  -H "Content-Type: application/json" \
  -d '{
    "tradeId": "uuid",
    "action": "REJECT",
    "reason": "Market too volatile right now"
  }'
```

---

## Layer 2: Risk Controller - Position Sizing ✅

**Prevents over-leveraging and position concentration.**

```typescript
interface RiskConfig {
  maxPositionSize: number;    // % of portfolio per trade
  maxDailyLoss: number;       // % of portfolio per day
  maxDrawdown: number;        // % decline before stop
  minConfidence: number;      // Min signal confidence
  enablePaperTrading: boolean; // Paper trading mode
}

// Three profiles built-in:
CONSERVATIVE: {
  maxPositionSize: 5%,      // Max 5% per trade
  maxDailyLoss: 2%,         // Stop if lose 2% daily
  maxDrawdown: 5%,          // Stop if portfolio down 5%
  minConfidence: 70%,       // Only execute 70%+ confidence
  enablePaperTrading: true  // Paper mode by default
}

MODERATE: {
  maxPositionSize: 10%,
  maxDailyLoss: 5%,
  maxDrawdown: 10%,
  minConfidence: 60%,
  enablePaperTrading: false
}

AGGRESSIVE: {
  maxPositionSize: 15%,
  maxDailyLoss: 10%,
  maxDrawdown: 15%,
  minConfidence: 50%,
  enablePaperTrading: false
}
```

### Example Validation:
```
Trade Request: BUY 50 AAPL @ ₹150 (₹7,500)
Portfolio: ₹100,000 total

Position Size Check:
  ₹7,500 / ₹100,000 = 7.5% of portfolio
  Max allowed: 5% (CONSERVATIVE)
  ❌ REJECTED: Position size 7.5% exceeds max 5%
```

---

## Layer 3: Confidence Threshold ✅

**Only executes if signal confidence meets minimum.**

```
Strategy generates signal:
  confidence: 0.78 (78%)

Risk config requires:
  minConfidence: 0.70 (70%)

Check: 0.78 >= 0.70?
✅ PASS - Execute
```

---

## Layer 4: Portfolio Validation ✅

**Prevents selling what you don't have.**

```
Trade: SELL 100 MSFT

Current Holdings:
  MSFT: 50 shares

Check: Can sell 100 when holding only 50?
❌ REJECTED: Cannot sell 100 of MSFT - only 50 available
```

---

## Layer 5: Daily Loss Limit ✅

**Stops trading if daily losses exceed threshold.**

```
Daily Loss Tracking:
  Loss so far today: 1.5%
  Max allowed: 2%

New trade P&L: -0.8%
Total would be: 2.3%

Check: 2.3% > 2%?
❌ REJECTED: Daily loss limit (2%) already reached
```

---

## Layer 6: Maximum Drawdown Protection ✅

**Halts trading if portfolio declines too much.**

```
Portfolio Status:
  Current value: ₹95,000
  Peak value: ₹100,000
  Drawdown: -5%

Max allowed: -5%

Check: -5% <= -5%?
⚠️ AT LIMIT - No more trades allowed
```

---

## Layer 7: Order Quantity Limits ✅

**Maximum 50 trades per day to prevent execution errors.**

```
Orders today: 45
Max allowed: 50

New trade request → Count: 46
Check: 46 <= 50?
✅ PASS - Execute

New trade request → Count: 51
Check: 51 <= 50?
❌ REJECTED: Daily order limit (50) reached
```

---

## Layer 8: Broker Connection Validation ✅

**Ensures connection to broker before placing trade.**

```
Try to place trade:
  1. Check: Broker connected? ✅ YES
  2. Check: API key valid? ✅ YES
  3. Check: Access token valid? ✅ YES
  
→ Proceed with execution

vs.

  1. Check: Broker connected? ❌ NO
  
→ ❌ REJECTED: Broker not connected
   Trade remains PENDING, retry later
```

---

## Layer 9: Paper Trading Mode ✅

**Simulate trades without real money execution.**

```bash
# Enable paper trading in .env
USE_MOCK_BROKER=true      # Simulates trades
RISK_PROFILE=PAPER_TRADING # Higher limits for testing

# Or in code:
const broker = new ZerodhaBroker(apiKey, token, paperTrading=true);

# Result:
# ✅ Trades execute in database (status = EXECUTED)
# ❌ No real money is spent
# ✅ Full audit trail preserved
# ✅ Test your strategy safely
```

### Paper Trading Orders:
```
Order ID: PAPER_1710568000_abc123xyz
Status: EXECUTED (in database only)
Filled: 15/15 AAPL @ ₹150
Real money spent: ₹0

→ Perfect for learning and backtesting!
```

---

## Layer 10: Audit Trail & Logging ✅

**Every decision is logged with full context.**

### Database Audit Trail:
```sql
SELECT * FROM trades;

id           | symbol | action | quantity | price | status    | proposed_at | approval_reason | executed_at | execution_price
-------------|--------|--------|----------|-------|-----------|-------------|-----------------|-------------|----------------
uuid-1       | AAPL   | BUY    | 15       | 150   | EXECUTED  | 14:23:45    | "Manual OK"     | 14:25:12    | 150.05
uuid-2       | MSFT   | SELL   | 10       | 320   | REJECTED  | 14:24:01    | "Market too...  | NULL        | NULL
uuid-3       | GOOGL  | BUY    | 5        | 100   | APPROVED  | 14:24:33    | "Approved"      | NULL        | NULL
```

### Log Files:
```
logs/
├── execution-service/
│   └── combined.log (all trades placed)
├── gateway/
│   └── combined.log (all webhooks & approvals)
├── orchestrator/
│   └── combined.log (all LLM evaluations)
└── strategy-service/
    └── combined.log (all signals generated)
```

---

## Safety Configuration Examples

### Example 1: Super Conservative (First Month)
```env
RISK_PROFILE=CONSERVATIVE
USE_MOCK_BROKER=true              # Paper trading only!

# CONSERVATIVE profile settings:
maxPositionSize=5%                # Max ₹5,000 per trade
maxDailyLoss=2%                   # Stop at ₹2,000 loss
maxDrawdown=5%                    # Stop at ₹5,000 decline
minConfidence=70%                 # Only high-confidence signals
enablePaperTrading=true           # No real money
```

**Result:** All trades simulated, you practice approval workflow

### Example 2: Paper Trading with Real Signals
```env
RISK_PROFILE=PAPER_TRADING
USE_MOCK_BROKER=true

# PAPER_TRADING profile:
maxPositionSize=50%               # Larger positions for testing
maxDailyLoss=100%                 # No loss limit
maxDrawdown=100%                  # No drawdown limit
minConfidence=30%                 # Accept all signals for testing
enablePaperTrading=true           # No real money
```

**Result:** Test your strategy with real Zerodha data, no real execution

### Example 3: Live Trading (After Confidence)
```env
RISK_PROFILE=CONSERVATIVE
USE_MOCK_BROKER=false             # LIVE execution!
ZERODHA_API_KEY=xxx
ZERODHA_ACCESS_TOKEN=yyy

# CONSERVATIVE profile + live
# = Small, careful, real trades
```

---

## Approval Workflow (Day-to-Day)

### Morning (9:15 AM - Market Opens)
```bash
# 1. Check pending trades
curl http://localhost:3000/trades/pending

# 2. Review each one
# - Strategy behind signal?
# - LLM reasoning sound?
# - Market conditions favorable?

# 3. Approve the good ones
curl -X POST http://localhost:3000/webhooks/trade-approval \
  -d '{"tradeId": "uuid-1", "action": "APPROVE", "reason": "Momentum confirmed"}'

# 4. Reject the risky ones
curl -X POST http://localhost:3000/webhooks/trade-approval \
  -d '{"tradeId": "uuid-2", "action": "REJECT", "reason": "Market too volatile"}'
```

### Throughout Day
```bash
# Monitor execution service logs
tail -f logs/execution-service/combined.log

# See real-time trades being placed:
# ⚡ Executing trade: uuid-1
#    Action: BUY 15 AAPL @ ₹150
# ✅ Trade executed successfully
```

### End of Day
```bash
# Check final status
curl http://localhost:3000/trades

# Verify all trades:
# - APPROVED trades → must be EXECUTED or FAILED
# - REJECTED trades → remain PENDING (can approve later)
# - EXECUTED trades → show execution_price

# Example:
# APPROVED (01:23:45) → EXECUTED (01:25:12) ✅
# APPROVED (02:15:00) → FAILED (execution error) ⚠️
```

---

## Emergency Stop Procedures

### If Something Goes Wrong:

```bash
# IMMEDIATE: Stop all services
pm2 stop all

# WAIT: Don't panic, check what happened
pm2 logs execution-service --lines 50

# FIX: Address the issue
# Example: Out of position size budget? Wait for daily reset at 3:30 PM

# RESUME: When safe
pm2 start all

# Alternative: Stop only execution service
pm2 stop execution-service
# Other services keep running, new trades go PENDING
# Fix issue, then restart execution
pm2 start execution-service
```

### Circuit Breaker (Auto Stop):
```
If daily loss hits 2% (CONSERVATIVE):
  → Auto-stop new trade approvals
  → All remaining signals stay PENDING
  → Execution service stops polling
  → Resets at market close (3:30 PM for NSE)
  
You get notified: "❌ Daily loss limit reached"
```

---

## Checklist Before Going Live

- [ ] Test with paper trading for 1 week
- [ ] Verify manual approval workflow 10+ times
- [ ] Check that database persists correctly
- [ ] Confirm backups running daily
- [ ] Review all 10 safety layers
- [ ] Have emergency stop procedure memorized
- [ ] Monitor first live trade yourself
- [ ] Set up alerts for errors
- [ ] Have backup Zerodha login ready

---

## Data Integrity Guarantees

### Your data is NEVER lost:
1. ✅ SQLite writes to disk immediately
2. ✅ WAL mode enables crash-safe transactions
3. ✅ Daily automated backups
4. ✅ Backup encryption available
5. ✅ 30-day backup retention
6. ✅ Cloud backup option (S3/GCS)
7. ✅ Full audit trail in logs
8. ✅ Database can be restored anytime

### Access Your Data Anytime:
```bash
# SSH into server
ssh trading@your-server

# Query database
sqlite3 /opt/trading-bot/trades.db
> SELECT * FROM trades WHERE status='EXECUTED' ORDER BY executed_at DESC LIMIT 10;

# Download for local analysis
scp trading@server:/opt/trading-bot/trades.db ./backup.db

# Restore if needed
cp backup.db /opt/trading-bot/trades.db
```

---

## Summary

**YOUR SYSTEM IS BUILT FOR SAFETY:**

✅ Human approval required for EVERY trade
✅ Position sizes automatically limited
✅ Daily loss limits enforced
✅ Portfolio drawdown monitoring
✅ Paper trading mode available
✅ Full audit trail maintained
✅ Emergency stop procedures ready
✅ Data backed up daily
✅ 24/7 uptime with auto-restart
✅ Access data anytime, anywhere

**No trade can execute without YOUR approval. Period.**
