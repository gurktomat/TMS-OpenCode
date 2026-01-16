import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  ISmsProvider, 
  SmsResult, 
  ProviderInfo,
  SmsMessage 
} from '../interfaces/sms-provider.interface';

/**
 * Mock SMS Provider - Development and Testing
 * Implements ISmsProvider interface, logs messages to console
 * In production, replace with SignalWireService, TwilioService, etc.
 */
@Injectable()
export class MockSmsProvider implements ISmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);
  private readonly providerName = 'MockSMS';

  constructor(private readonly configService: ConfigService) {
    this.logger.log('MockSmsProvider initialized');
  }

  /**
   * Send SMS message (mock implementation)
   */
  async sendSms(to: string, message: string): Promise<SmsResult> {
    const timestamp = new Date();
    
    try {
      // Validate phone number format (E.164)
      if (!this.validatePhoneNumber(to)) {
        throw new Error(`Invalid phone number format: ${to}`);
      }

      // Mock API call - in production, call actual SMS provider
      this.logger.log(`📱 [MOCK SMS] To: ${to}`);
      this.logger.log(`   Message: ${message}`);
      this.logger.log(`   Timestamp: ${timestamp.toISOString()}`);
      this.logger.log(`   Length: ${message.length} characters`);

      // Simulate processing delay
      await this.simulateProcessingTime(100, 500);

      const result: SmsResult = {
        success: true,
        messageId: `mock_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
        providerResponse: {
          status: 'sent',
          provider: this.providerName,
          mock: true,
        },
        timestamp,
      };

      this.logger.log(`✅ SMS sent successfully. Message ID: ${result.messageId}`);
      return result;

    } catch (error) {
      this.logger.error(`❌ Failed to send SMS to ${to}: ${error.message}`, error);
      
      const result: SmsResult = {
        success: false,
        error: error.message,
        providerResponse: {
          status: 'failed',
          provider: this.providerName,
          mock: true,
        },
        timestamp,
      };

      return result;
    }
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Mock health check - always returns true for mock provider
      this.logger.log(`🏥 [MOCK SMS] Health check passed`);
      return true;
    } catch (error) {
      this.logger.error(`❌ [MOCK SMS] Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get provider information
   */
  getProviderInfo(): ProviderInfo {
    return {
      name: this.providerName,
      version: '1.0.0',
      capabilities: [
        'sms_outbound',
        'delivery_receipts',
        'inbound_webhooks',
        'template_variables',
        'scheduled_messages',
      ],
      supportedCountries: ['US', 'CA', 'MX'], // Mock supported countries
      rateLimit: 60, // messages per minute
    };
  }

  /**
   * Validate phone number format (E.164)
   */
  private validatePhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 validation for development
    const e164Pattern = /^\+?[1-9]\d{1,14}$/;
    return e164Pattern.test(phoneNumber);
  }

  /**
   * Simulate network processing time
   */
  private simulateProcessingTime(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Get mock delivery report
   */
  async getDeliveryReport(messageId: string): Promise<any> {
    this.logger.log(`📊 [MOCK SMS] Getting delivery report for: ${messageId}`);
    
    // Simulate random delivery status
    const statuses = ['delivered', 'sent', 'failed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      messageId,
      status: randomStatus,
      deliveredAt: randomStatus === 'delivered' ? new Date() : null,
      error: randomStatus === 'failed' ? 'Simulated delivery failure' : null,
    };
  }

  /**
   * Validate message content
   */
  private validateMessage(message: string): { valid: boolean; error?: string } {
    if (!message || message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (message.length > 1600) { // Standard SMS limit
      return { valid: false, error: 'Message too long (max 1600 characters)' };
    }

    return { valid: true };
  }

  /**
   * Format phone number to E.164
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present (assuming US for simplicity)
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }
    
    // Add + prefix
    return '+' + cleaned;
  }

  /**
   * Get usage statistics (mock)
   */
  async getUsageStats(startDate: Date, endDate: Date): Promise<any> {
    this.logger.log(`📈 [MOCK SMS] Getting usage stats from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Mock usage data
    return {
      totalMessages: 150,
      successfulMessages: 142,
      failedMessages: 8,
      cost: 12.50,
      averageCostPerMessage: 0.087,
      peakHour: '14:00',
      mostActiveDay: 'Monday',
    };
  }
}