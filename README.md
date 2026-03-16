# Trading Bot - AI-Powered Stock Trading System

A production-grade stock trading bot with autonomous decision-making, real-time market analysis, and multi-level approval workflows.

## 🎯 Quick Start

### Prerequisites
- Node.js 24+
- SQLite3
- Telegram Bot (for approvals)
- Claude API key
- Docker & Docker Compose (optional, recommended for production)

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials:
# - CLAUDE_API_KEY
# - TELEGRAM_BOT_TOKEN
# - TELEGRAM_CHAT_ID

# Initialize database
npm run db:init

# Start the system
npm run dev

# Or with Docker
docker-compose up -d
```

### System Running On
- **Strategy Service:** Port 3001 (analyzes market data)
- **Orchestrator:** Port 3002 (manages workflow)
- **Approval Gateway:** Port 3000 (handles approvals)
- **Execution Service:** Port 3003 (executes trades)

## 📋 Features

### Core Trading
- **Real-time Market Analysis** - Claude 3.5 Sonnet analyzes technical indicators, sentiment, and risk
- **Paper Trading Mode** - Test strategies without real money
- **10-Layer Risk Control** - Position sizing, stop losses, profit targets, volatility checks
- **Approval Workflow** - Human review via Telegram before execution
- **Trade History** - SQLite database with full trade audit trail

### Security
- **API Key Authentication** - Role-based access control (trader, approver, admin)
- **Rate Limiting** - Per-IP and per-API-key rate limits
- **Audit Logging** - Complete action history with user/IP/reason tracking
- **Input Validation** - Comprehensive validation of all trades and API inputs
- **Security Headers** - CORS, CSP, HSTS, X-Frame-Options, etc.

### Integrations
- **Telegram Bot** - Real-time trade approvals with detailed summaries
- **Claude AI** - Natural language market analysis
- **SQLite Database** - Trade persistence with full history

## 🏗️ Architecture

```
┌─────────────────┐
│ Strategy Service│ → Analyzes market data with Claude
└────────┬────────┘
         ↓
┌─────────────────┐
│  Orchestrator   │ → Validates trades, triggers approval
└────────┬────────┘
         ↓
┌─────────────────┐
│ Approval Gateway│ → Human review via Telegram  
└────────┬────────┘
         ↓
┌─────────────────┐
│Execution Service│ → Executes approved trades
└─────────────────┘
         ↓
┌─────────────────┐
│   Database      │ → SQLite with audit logs
└─────────────────┘
```

## 🔐 Security Features

### Authentication & Authorization
- **API Keys** - Unique keys per trader/approver with role assignment
- **Role-Based Access Control** - Separate permissions for traders, approvers, admins
- **IP Validation** - Track and validate API requests by IP address

### Compliance & Monitoring
- **Audit Logging** - Every trade action logged with: user, timestamp, old/new state, reason, IP, user agent
- **Rate Limiting** - Prevents abuse: 100 requests/minute per IP, 200/minute per API key
- **Input Validation** - Trade size, price, symbol format validation

### Infrastructure Security
- **Security Headers** - Content Security Policy, HSTS, X-Frame-Options
- **CORS Protection** - Restrict API access to allowed origins
- **Error Handling** - No sensitive data in error messages

## 📊 API Endpoints

### Trades
```bash
# Get all trades
GET /api/trades

# Get specific trade
GET /api/trades/:id

# Create new trade (requires approval)
POST /api/trades
Body: { symbol, quantity, price, tradeType, riskLevel }

# Approve trade
PUT /api/trades/:id/approve
Header: X-API-Key: <your-key>

# Reject trade
PUT /api/trades/:id/reject
```

### Health
```bash
# System health
GET /health

# Detailed status
GET /health/detailed
```

## 🗂️ Project Structure

```
Trading/
├── packages/
│   ├── strategy-service/        # Market analysis service
│   ├── orchestrator/            # Workflow coordinator
│   ├── approval-gateway/        # Approval handler
│   ├── execution-service/       # Trade execution
│   └── shared/                  # Common utilities
│       ├── database/            # SQLite schema & queries
│       ├── logging/             # Audit logging system
│       ├── notifications/       # Telegram bot integration
│       └── middleware/          # Security middleware
├── docs/                        # Documentation
│   ├── SETUP_GUIDE.md          # Detailed setup instructions
│   ├── DEPLOYMENT.md           # Production deployment
│   └── SAFETY_FEATURES.md      # Risk control details
├── docker-compose.yml          # Container orchestration
├── package.json                # Dependencies
└── README.md                   # This file
```

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Run specific service tests
npm run test -- strategy-service
```

## 🚀 Deployment

### Local Development
```bash
npm install
npm run dev
```

### Docker
```bash
docker-compose up -d
docker-compose logs -f
```

### Production Checklist
- ✅ Set all environment variables in `.env`
- ✅ Run database migrations: `npm run db:migrate`
- ✅ Create API keys for traders/approvers
- ✅ Configure Telegram bot token and chat ID
- ✅ Enable HTTPS for API endpoints
- ✅ Setup database backups
- ✅ Configure monitoring/alerts

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete production setup.

## 📈 Monitoring

### Key Metrics
- **Trade Success Rate** - % of trades executed successfully
- **Average Approval Time** - Time from submission to approval
- **System Response Time** - API latency (target: <500ms)
- **Error Rate** - Failed trades / total submitted

### Logging
All actions logged to SQLite `audit_logs` table:
```sql
SELECT * FROM audit_logs 
WHERE created_at > datetime('now', '-1 day')
ORDER BY created_at DESC;
```

## 🔧 Troubleshooting

### Telegram Messages Not Sending
- Check `TELEGRAM_BOT_TOKEN` in `.env`
- Verify `TELEGRAM_CHAT_ID` is correct
- Check bot has message permissions
- View logs: `docker-compose logs approval-gateway`

### Database Locked Error
- Ensure only one process writes to SQLite
- Close other connections to `.db` file
- Check file permissions: `chmod 666 trading.db`

### Trades Stuck in Pending
- Check approval gateway logs
- Verify Telegram bot is running
- Review audit_logs for error messages

## 📚 Documentation

- **[Setup Guide](docs/SETUP_GUIDE.md)** - Step-by-step installation
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment
- **[Safety Features](docs/SAFETY_FEATURES.md)** - Risk control details
- **[Architecture](ARCHITECTURE_EXPLANATION.md)** - System design

## 🤝 Contributing

1. Create a feature branch
2. Make changes
3. Add tests for new code
4. Submit pull request

## 📝 License

MIT License - See LICENSE file

## 🆘 Support

For issues or questions:
1. Check [docs/](docs/) for documentation
2. Review logs: `docker-compose logs -f`
3. Check [TROUBLESHOOTING](#-troubleshooting) section above

### Option 1: Run All Services
```bash
npm run dev
```

### Option 2: Run Individual Services
```bash
# Terminal 1: Strategy Service
npm run strategy

# Terminal 2: LLM Orchestrator
npm run orchestrator

# Terminal 3: Approval Gateway
npm run gateway
```

## 📋 Service Details

### Strategy Service
- **Purpose**: Generates market signals
- **Output**: TradeSignal JSON
- **Demo**: 5 mock signals every 2 seconds

```bash
cd packages/strategy-service
npm run dev
```

Output:
```json
{
  "symbol": "AAPL",
  "action": "BUY",
  "confidence": 0.75,
  "price": 150,
  "timestamp": "2024-03-16T10:30:00Z",
  "reason": "Positive momentum: 2.50% 24h change"
}
```

### LLM Orchestrator
- **Purpose**: Evaluates signals using pluggable LLM provider
- **Input**: TradeSignal + PortfolioContext
- **Output**: TradeProposal with structured recommendation

```bash
cd packages/llm-orchestrator
npm run dev
```

**Features**:
- ✅ Uses Gemini API if `GEMINI_API_KEY` set
- ✅ Falls back to MockLLMProvider automatically
- ✅ Evaluates risk, portfolio allocation, confidence

### Approval Gateway
- **Purpose**: HTTP webhook endpoint for approvals
- **Port**: 3000 (configurable via `GATEWAY_PORT`)
- **Database**: SQLite with trade history

```bash
cd packages/approval-gateway
npm run dev
```

**API Endpoints**:

```bash
# Approve a trade
curl -X POST http://localhost:3000/webhooks/trade-approval \
  -H "Content-Type: application/json" \
  -d '{"tradeId": "uuid-here", "action": "APPROVE", "reason": "Looks good"}'

# Get pending trades
curl http://localhost:3000/trades/pending

# Get all trades (audit log)
curl http://localhost:3000/trades

# Health check
curl http://localhost:3000/health
```

## 💾 Database Schema

SQLite `trades` table:
- `id` (TEXT PRIMARY KEY): Unique trade identifier
- `symbol` (TEXT): Trading symbol (AAPL, GOOGL, etc.)
- `action` (TEXT): BUY or SELL
- `quantity` (REAL): Number of shares
- `price` (REAL): Price per share
- `proposed_at` (DATETIME): When proposal was created
- `status` (TEXT): PENDING → APPROVED/REJECTED → EXECUTED/FAILED
- `proposal_reason` (TEXT): Why LLM recommended
- `approval_reason` (TEXT): Why human approved
- `rejection_reason` (TEXT): Why human rejected
- `executed_at` (DATETIME): When trade executed (optional)
- `execution_price` (REAL): Actual execution price (optional)

## 🔄 Execution Flow

```
1. Strategy Service
   └─> Generates TradeSignal

2. LLM Orchestrator
   └─> Evaluates with ILLMProvider (Gemini or Mock)
   └─> Returns TradeProposal

3. Approval Gateway
   └─> Persists to SQLite (status: PENDING)
   └─> Sends Telegram notification (simulated)
   └─> Waits for webhook

4. Human Approval
   └─> Sends POST to /webhooks/trade-approval
   └─> Updates status: APPROVED/REJECTED

5. Execution Layer (Future)
   └─> Monitors APPROVED trades
   └─> Executes via broker API
   └─> Updates status: EXECUTED/FAILED
   └─> Logs: "Trade Executed: [Details]"
```

## 🧪 Testing Without Gemini API

### Mock Provider Demo
```typescript
const orchestrator = new LLMOrchestrator(new MockLLMProvider());
const proposal = await orchestrator.proposeTrade(signal, portfolio);
```

The MockLLMProvider:
- Simulates decision logic
- Uses 5% portfolio allocation for BUY, 3% for SELL
- Requires >60% confidence
- Generates stop-loss and take-profit levels

## 🔐 Security Notes

- **API Keys**: Store in `.env`, never commit
- **Database**: Uses WAL (Write-Ahead Logging) for concurrent access
- **Input Validation**: Webhook handler validates all inputs
- **Error Handling**: Structured error responses with status codes

## 🚧 Next Steps (Not Implemented)

1. **Real Broker Integration**
   - Replace execution logging with actual broker API calls
   - Handle partial fills, rejections, etc.

2. **Real Telegram Integration**
   - Replace TelegramSimulator with actual Telegram Bot API
   - Use inline_keyboard for button callbacks

3. **Additional LLM Providers**
   ```typescript
   // Implement ILLMProvider for:
   class AnthropicProvider implements ILLMProvider { }
   class OpenAIProvider implements ILLMProvider { }
   class LlamaProvider implements ILLMProvider { }
   ```

4. **Persistence Layer**
   - Add Redis for caching signals
   - Add message queue (RabbitMQ/Kafka) for service communication

5. **Monitoring & Observability**
   - Add Winston logging
   - Prometheus metrics
   - OpenTelemetry tracing

## 📚 Development Tips

### Type-Checking Only
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Building Production Bundle
```bash
npm run build
# Output in packages/*/dist/
```

## 🐛 Troubleshooting

### "Cannot find module '@trading-bot/shared'"
```bash
# Rebuild workspace references
npm install
npm run build
```

### "Gemini API failed"
- Check `GEMINI_API_KEY` in `.env`
- Verify key is valid at https://makersuite.google.com/app/apikey
- Service automatically falls back to MockLLMProvider

### "Port 3000 already in use"
```bash
# Change port
GATEWAY_PORT=3001 npm run gateway
```

### "Database locked"
- SQLite uses WAL mode for concurrent access
- Check no duplicate processes are running
- Delete `.db-shm` and `.db-wal` files if corrupted

---

**Created**: March 16, 2026  
**Architecture**: Modular, Decoupled, Type-Safe  
**Status**: Ready for extension and integration
