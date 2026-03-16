/**
 * Google Gemini LLM Provider Implementation
 * Concrete implementation of ILLMProvider for Google's Gemini API
 */
import {
  ILLMProvider,
  TradeSignal,
  PortfolioContext,
  TradeProposal,
} from '@trading-bot/shared';

// Import Gemini SDK - will be installed via npm
let genAI: any;

try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} catch {
  console.warn(
    '⚠️  Google Generative AI SDK not initialized. Set GEMINI_API_KEY environment variable.'
  );
}

export class GeminiProvider implements ILLMProvider {
  private readonly model: any;

  constructor() {
    if (!genAI) {
      throw new Error(
        'Gemini API not configured. Please set GEMINI_API_KEY environment variable.'
      );
    }
    this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  async evaluateSignal(
    signal: TradeSignal,
    portfolio: PortfolioContext
  ): Promise<TradeProposal> {
    const prompt = this.buildEvaluationPrompt(signal, portfolio);

    try {
      const result = await this.model.generateContent(prompt);
      const responseText =
        result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return this.parseResponse(responseText);
    } catch (error) {
      console.error('❌ Gemini API Error:', error);
      throw new Error(
        `Failed to evaluate signal with Gemini: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  getName(): string {
    return 'GeminiProvider';
  }

  private buildEvaluationPrompt(
    signal: TradeSignal,
    portfolio: PortfolioContext
  ): string {
    return `
You are a professional trading advisor. Evaluate this trading signal and respond with a JSON object.

SIGNAL:
- Symbol: ${signal.symbol}
- Action: ${signal.action}
- Confidence: ${signal.confidence}
- Price: $${signal.price}
- Reason: ${signal.reason}

PORTFOLIO:
- Total Value: $${portfolio.totalValue}
- Cash Available: $${portfolio.cash}
- Risk Limit: ${portfolio.riskLimit}%
- Current Positions: ${JSON.stringify(portfolio.positions)}

Respond ONLY with a valid JSON object (no markdown, no extra text) with these fields:
{
  "approved": boolean,
  "proposedAction": "BUY" | "SELL" | "HOLD",
  "quantity": number,
  "reason": string,
  "riskAssessment": string,
  "recommendedStopLoss": number (optional),
  "recommendedTakeProfit": number (optional)
}

Consider:
1. Risk management and portfolio allocation
2. Market conditions and signal confidence
3. Existing positions
4. Cash availability`;
  }

  private parseResponse(responseText: string): TradeProposal {
    try {
      // Extract JSON from response (handle cases where model includes extra text)
      const jsonMatch = new RegExp(/\{[\s\S]*\}/).exec(responseText);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        approved: parsed.approved ?? false,
        proposedAction: parsed.proposedAction || 'HOLD',
        quantity: parsed.quantity || 0,
        reason: parsed.reason || 'Evaluated by Gemini',
        riskAssessment: parsed.riskAssessment || 'Standard risk',
        recommendedStopLoss: parsed.recommendedStopLoss,
        recommendedTakeProfit: parsed.recommendedTakeProfit,
      };
    } catch (error) {
      console.error('Failed to parse Gemini response:', responseText);
      throw new Error(
        `Invalid response format from Gemini: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
