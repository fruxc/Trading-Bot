/**
 * Telegram Simulator
 * Simulates sending Telegram messages with inline buttons
 */
import { Trade } from '@trading-bot/shared';

export class TelegramSimulator {
  private readonly botToken: string;

  constructor(botToken: string = process.env.TELEGRAM_BOT_TOKEN || 'mock-token') {
    this.botToken = botToken;
  }

  /**
   * Simulates sending a Telegram message with approval buttons
   */
  async sendApprovalMessage(trade: Trade): Promise<void> {
    const message = this.formatMessage(trade);
    const buttons = this.formatButtons(trade.id);

    console.log('\n📱 [TELEGRAM MESSAGE]');
    console.log('═══════════════════════════════════');
    console.log(message);
    console.log('───────────────────────────────────');
    console.log('📲 Inline Buttons:');
    buttons.forEach((button) => console.log(`   ${button}`));
    console.log('═══════════════════════════════════\n');

    // In production, this would call actual Telegram API
    // await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     chat_id: process.env.TELEGRAM_CHAT_ID,
    //     text: message,
    //     reply_markup: { inline_keyboard: [[...]] }
    //   })
    // });
  }

  private formatMessage(trade: Trade): string {
    return `
🤖 *New Trade Proposal*

*Trade ID:* \`${trade.id}\`
*Symbol:* ${trade.symbol}
*Action:* ${trade.action}
*Quantity:* ${trade.quantity}
*Price:* $${trade.price.toFixed(2)}
*Reason:* ${trade.proposalReason}

_Awaiting your approval..._
    `;
  }

  private formatButtons(tradeId: string): string[] {
    return [
      `✅ [APPROVE] /approve_${tradeId}`,
      `❌ [REJECT] /reject_${tradeId}`,
    ];
  }
}
