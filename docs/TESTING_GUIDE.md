# Testing Guide for ClawBot

## Setup

### Install Testing Dependencies

```bash
# For Trading Bot
cd Trading
npm install --save-dev jest @types/jest ts-jest

# For RealEstateBot  
cd RealEstateBot
npm install --save-dev jest @types/jest ts-jest
```

### Jest Configuration

Create `jest.config.js` in each app root:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
};
```

### NPM Scripts

Add to package.json:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Test Structure

```
src/
├── security/
│   ├── __tests__/
│   │   ├── auth.test.ts
│   │   ├── validation.test.ts
│   │   └── audit.test.ts
│   ├── auth.ts
│   ├── validation.ts
│   └── audit.ts
└── core/
    └── __tests__/
        └── message-router.test.ts
```

## Unit Tests

### SecurityManager Tests

```typescript
import { SecurityManager } from '../auth';
import { DatabaseClient } from '../../db/db-client';

describe('SecurityManager', () => {
  let manager: SecurityManager;
  let mockDb: DatabaseClient;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    manager = new SecurityManager(mockDb, mockLogger);
  });

  describe('validateMessage', () => {
    it('should validate legitimate sender', async () => {
      const context = await manager.validateMessage('+1234567890');
      expect(context.isBlocked).toBe(false);
      expect(context.rateLimitExceeded).toBe(false);
    });

    it('should block blacklisted senders', async () => {
      manager.blockSender('+1234567890');
      const context = await manager.validateMessage('+1234567890');
      expect(context.isBlocked).toBe(true);
    });

    it('should detect rate limit violations', async () => {
      const senderId = '+1234567890';
      for (let i = 0; i < 11; i++) {
        const context = await manager.validateMessage(senderId);
        if (i < 10) {
          expect(context.rateLimitExceeded).toBe(false);
        } else {
          expect(context.rateLimitExceeded).toBe(true);
        }
      }
    });
  });

  describe('blockSender', () => {
    it('should add sender to blocklist', () => {
      manager.blockSender('+1234567890');
      const metrics = manager.getMetrics();
      expect(metrics.blockedCount).toBe(1);
    });
  });

  describe('unblockSender', () => {
    it('should remove sender from blocklist', () => {
      manager.blockSender('+1234567890');
      manager.unblockSender('+1234567890');
      const metrics = manager.getMetrics();
      expect(metrics.blockedCount).toBe(0);
    });
  });
});
```

### MessageValidator Tests

```typescript
import MessageValidator, { validatePhoneNumber, sanitizeText } from '../validation';

describe('MessageValidator', () => {
  describe('validatePhoneNumber', () => {
    it('should accept valid phone numbers', () => {
      expect(validatePhoneNumber('+1234567890')).toBe(true);
      expect(validatePhoneNumber('1234567890')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('abc')).toBe(false);
    });
  });

  describe('validateMessage', () => {
    it('should validate legitimate messages', () => {
      const result = MessageValidator.validateMessage(
        '+1234567890',
        'Hello, I am interested in this property',
        'text'
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty messages', () => {
      const result = MessageValidator.validateMessage(
        '+1234567890',
        '',
        'text'
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message is empty or exceeds maximum length');
    });

    it('should warn on unknown media types', () => {
      const result = MessageValidator.validateMessage(
        '+1234567890',
        'Hello',
        'unknown'
      );
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const result = sanitizeText('Hello <script>alert(1)</script>');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should remove event handlers', () => {
      const result = sanitizeText('Click onclick=alert(1)');
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript:', () => {
      const result = sanitizeText('Click here: javascript:alert(1)');
      expect(result).not.toContain('javascript:');
    });

    it('should preserve normal text', () => {
      const text = 'This is a normal message';
      expect(sanitizeText(text)).toBe(text);
    });
  });

  describe('validateNegotiation', () => {
    it('should validate legitimate negotiation data', () => {
      const result = MessageValidator.validateNegotiation({
        propertyPrice: 500000,
        offerPrice: 450000,
        address: '123 Main St, City, State',
        bedrooms: 3,
        bathrooms: 2,
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject negative prices', () => {
      const result = MessageValidator.validateNegotiation({
        propertyPrice: -100,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid property price');
    });

    it('should reject invalid bedroom count', () => {
      const result = MessageValidator.validateNegotiation({
        bedrooms: -1,
      });
      expect(result.isValid).toBe(false);
    });
  });
});
```

### AuditLogger Tests

```typescript
import { AuditLogger } from '../audit';

describe('AuditLogger', () => {
  let logger: AuditLogger;
  let mockDb: any;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    };
    logger = new AuditLogger(mockDb, mockLogger);
  });

  describe('log', () => {
    it('should log event with timestamp', async () => {
      await logger.log({
        event_type: 'TEST_EVENT',
        sender_id: '+1234567890',
        action: 'test action',
        status: 'SUCCESS',
      });

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should capture success status', async () => {
      await logger.log({
        event_type: 'TEST_EVENT',
        sender_id: '+1234567890',
        action: 'test',
        status: 'SUCCESS',
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Audit'),
        expect.objectContaining({ status: 'SUCCESS' })
      );
    });

    it('should capture error information', async () => {
      await logger.log({
        event_type: 'TEST_EVENT',
        sender_id: '+1234567890',
        action: 'test',
        status: 'FAILED',
        error_message: 'Test error',
      });

      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('logMessageReceived', () => {
    it('should log incoming messages', async () => {
      await logger.logMessageReceived('+1234567890', 'text');
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security violations', async () => {
      await logger.logSecurityEvent(
        '+1234567890',
        'RATE_LIMIT',
        'Rate limit exceeded'
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });
  });
});
```

## Integration Tests

### Message Router Tests

```typescript
import { MessageRouter } from '../../core/message-router';

describe('MessageRouter Integration', () => {
  let router: MessageRouter;

  beforeEach(() => {
    // Setup router with mocked dependencies
  });

  it('should process message end-to-end', async () => {
    const context = {
      senderId: '+1234567890',
      messageId: 'msg-1',
      content: 'I am interested in the property at 123 Main St',
      mediaType: 'text' as const,
      timestamp: new Date(),
    };

    await router.route(context);
    // Assert message was processed
  });

  it('should handle blocked senders', async () => {
    // Setup blocked sender
    // Assert message is rejected
  });

  it('should store conversation', async () => {
    // Send message
    // Assert stored in database
  });
});
```

## E2E Tests

### Trading Bot Full Cycle

```typescript
describe('Trading Bot E2E', () => {
  it('should complete trade from signal to execution', async () => {
    // 1. Strategy Service generates signal
    // 2. LLM Orchestrator evaluates
    // 3. Approval Gateway sends to Telegram
    // 4. Approver responds
    // 5. Execution Service executes
    // Assert: Trade in database with SUCCESS status
  });

  it('should handle rejection', async () => {
    // 1. Strategy Service generates signal
    // 2. Approval Gateway sends to Telegram
    // 3. Approver rejects
    // Assert: Trade marked REJECTED, not executed
  });

  it('should respect rate limits', async () => {
    // Send 100+ trade requests
    // Assert: Only allowed number processed
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- validation.test.ts

# Run in watch mode (re-run on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Coverage Goals

- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Lines:** >80%

## Continuous Integration

Add GitHub Actions workflow (`.github/workflows/test.yml`):

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - run: npm install
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Test Checklist

- [ ] Unit tests for all security modules
- [ ] Integration tests for message routing
- [ ] E2E tests for trading workflow
- [ ] Rate limiting enforcement
- [ ] Audit logging accuracy
- [ ] Input validation edge cases
- [ ] Error handling
- [ ] Database integrity
- [ ] Concurrency handling
- [ ] Performance benchmarks

## Next Steps

1. Setup Jest in both projects
2. Write unit tests for security modules
3. Write integration tests for workflows
4. Add GitHub Actions CI/CD
5. Target >80% code coverage
6. Setup performance benchmarking
