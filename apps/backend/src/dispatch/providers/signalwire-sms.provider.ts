import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * SignalWire SMS Provider - Production Implementation
 * Example of how to implement a real SMS provider
 * To use this instead of MockSmsProvider:
 * 1. Add SignalWire dependency to package.json
 * 2. Replace MockSmsProvider with SignalWireService in module providers
 * 3. Configure SIGNALWIRE_* environment variables
 */
@Injectable()
export class SignalWireService implements ISmsProvider {
  private readonly logger = new Logger(SignalWireService.name);
  private readonly baseUrl: string;
  private readonly projectId: string;
  private readonly token: string;
  private readonly spaceId: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('SIGNALWIRE_BASE_URL', 'https://space.signalwire.com');
    this.projectId = this.configService.get<string>('SIGNALWIRE_PROJECT_ID');
    this.token = this.configService.get<string>('SIGNALWIRE_TOKEN');
    this.spaceId = this.configService.get<string>('SIGNALWIRE_SPACE_ID');
    
    if (!this.projectId || !this.token || !this.spaceId) {
      this.logger.warn('SignalWire credentials not fully configured');
    }
  }

  async sendSms(to: string, message: string): Promise<SmsResult> {
    const timestamp = new Date();
    
    try {
      if (!this.projectId || !this.token || !this.spaceId) {
        throw new Error('SignalWire credentials not configured');
      }

      // Validate phone number
      if (!this.validatePhoneNumber(to)) {
        throw new Error(`Invalid phone number format: ${to}`);
      }

      this.logger.log(`📱 [SIGNALWIRE] Sending SMS to ${to}`);
      this.logger.log(`   Message: ${message}`);

      // SignalWire API call
      const response = await this.callSignalWireApi({
        from: this.getFromNumber(),
        to,
        body: message,
      });

      const result: SmsResult = {
        success: true,
        messageId: response.id,
        providerResponse: response,
        timestamp,
      };

      this.logger.log(`✅ SignalWire SMS sent successfully. Message ID: ${result.messageId}`);
      return result;

    } catch (error) {
      this.logger.error(`❌ Failed to send SignalWire SMS to ${to}: ${error.message}`, error);
      
      const result: SmsResult = {
        success: false,
        error: error.message,
        providerResponse: error.response?.data,
        timestamp,
      };

      return result;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.projectId || !this.token || !this.spaceId) {
        return false;
      }

      // Test API connectivity
      await this.callSignalWireApi('/api/v1/accounts', 'GET');
      
      this.logger.log(`🏥 [SIGNALWIRE] Health check passed`);
      return true;
    } catch (error) {
      this.logger.error(`❌ [SIGNALWIRE] Health check failed: ${error.message}`);
      return false;
    }
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'SignalWire',
      version: '1.0.0',
      capabilities: [
        'sms_outbound',
        'delivery_receipts',
        'inbound_webhooks',
        'mms_support',
        'international_sms',
        'scheduled_messages',
      ],
      supportedCountries: ['US', 'CA', 'MX', 'GB', 'AU'], // Actually supported countries
      rateLimit: 100, // Rate limit from SignalWire docs
    };
  }

  private async callSignalWireApi(
    endpoint: string = '/api/v1/messaging',
    method: 'POST' = 'POST',
    data?: any
  ): Promise<any> {
    const axios = require('axios').default; // Import axios dynamically
    
    const url = `${this.baseUrl}${endpoint}`;
    const auth = Buffer.from(`${this.projectId}:${this.token}`).toString('base64');
    
    const config = {
      method,
      url,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      ...(data && { data }),
    };

    const response = await axios(config);
    return response.data;
  }

  private validatePhoneNumber(phoneNumber: string): boolean {
    const e164Pattern = /^\+?[1-9]\d{1,14}$/;
    return e164Pattern.test(phoneNumber);
  }

  private getFromNumber(): string {
    // Get configured from number or use default
    return this.configService.get<string>('SIGNALWIRE_FROM_NUMBER', '+15551234567');
  }
}

// Usage in module providers:
// {
//   provide: 'SMS_PROVIDER',
//   useClass: process.env.NODE_ENV === 'production' ? SignalWireService : MockSmsProvider,
// }