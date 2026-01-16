import {
  Controller,
  Post,
  Body,
  Headers,
  UseGuards,
  Request,
  Response,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { DispatchService } from '../dispatch/dispatch.service';
import { User } from '@tms-platform/types';
import { Public } from '../auth/decorators/roles.decorator';

interface SmsWebhookPayload {
  From: string;
  To: string;
  Body: string;
  MessageSid?: string;
  AccountSid?: string;
  ApiVersion?: string;
  SmsStatus?: string;
}

interface SmsWebhookResponse {
  success: boolean;
  message: string;
  processedAt: Date;
  driverId?: string;
  assignmentId?: string;
  nextAction?: string;
}

@ApiTags('Webhooks')
@Controller('webhooks')
@UseGuards() // No authentication for webhooks
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly dispatchService: DispatchService) {}

  @Post('sms/inbound')
  @Public() // This endpoint is publicly accessible
  @ApiOperation({ 
    summary: 'Receive inbound SMS webhook from driver responses',
    description: 'Processes driver SMS responses (1=confirm, 2=reject) for dispatch assignments'
  })
  @ApiResponse({
    status: 200,
    description: 'SMS webhook processed successfully',
  })
  async receiveSmsWebhook(
    @Body() payload: SmsWebhookPayload,
    @Headers() headers: Record<string, string>,
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ): Promise<SmsWebhookResponse> {
    const processedAt = new Date();
    
    try {
      this.logger.log(`📨 [SMS WEBHOOK] Received inbound SMS`);
      this.logger.log(`   From: ${payload.From}`);
      this.logger.log(`   To: ${payload.To}`);
      this.logger.log(`   Body: "${payload.Body}"`);
      this.logger.log(`   MessageSid: ${payload.MessageSid}`);
      this.logger.log(`   Provider: ${this.detectProvider(headers)}`);

      // Parse the message body
      const { response, driverId, assignmentId } = this.parseSmsResponse(payload);
      
      if (!response) {
        this.logger.warn(`❌ Unrecognized SMS response: "${payload.Body}"`);
        return {
          success: false,
          message: 'Unrecognized SMS response',
          processedAt,
        };
      }

      if (!driverId || !assignmentId) {
        this.logger.warn(`❌ Could not extract driver/assignment IDs from message`);
        return {
          success: false,
          message: 'Could not process SMS response - missing IDs',
          processedAt,
        };
      }

      // Get user context (for dispatch operations)
      // In production, you might need to lookup the assignment to get the tenant context
      const mockUser = this.getMockUserForWebhook();
      
      // Process the driver response
      const result = await this.dispatchService.processDriverResponse(
        driverId,
        response,
        assignmentId,
        mockUser
      );

      this.logger.log(`✅ SMS webhook processed successfully: ${result.message}`);

      return {
        success: result.success,
        message: result.message,
        processedAt,
        driverId,
        assignmentId,
        nextAction: result.nextActions?.[0],
      };

    } catch (error) {
      this.logger.error(`❌ Failed to process SMS webhook: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to process webhook: ${error.message}`,
        processedAt,
      };
    }
  }

  @Post('sms/delivery')
  @Public()
  @ApiOperation({ 
    summary: 'Receive SMS delivery receipt webhook',
    description: 'Processes delivery status updates from SMS provider'
  })
  @ApiResponse({
    status: 200,
    description: 'Delivery receipt processed successfully',
  })
  async receiveDeliveryWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string>,
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ): Promise<any> {
    try {
      this.logger.log(`📭 [SMS DELIVERY WEBHOOK] Received delivery receipt`);
      this.logger.log(`   MessageSid: ${payload.MessageSid || payload.id}`);
      this.logger.log(`   Status: ${payload.SmsStatus || payload.status}`);
      this.logger.log(`   To: ${payload.To || payload.to}`);
      this.logger.log(`   Provider: ${this.detectProvider(headers)}`);

      // Log delivery status for audit trail
      this.logger.log(`   Delivery processed successfully`);

      return {
        success: true,
        message: 'Delivery receipt processed',
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Failed to process delivery webhook: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to process delivery webhook: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Parse SMS response to extract driver and assignment info
   */
  private parseSmsResponse(payload: SmsWebhookPayload): {
    response?: '1' | '2';
    driverId?: string;
    assignmentId?: string;
  } {
    const body = payload.Body.trim().toLowerCase();
    
    // Simple response parsing
    if (body === '1' || body.toLowerCase().includes('confirm')) {
      return { response: '1' };
    } else if (body === '2' || body.toLowerCase().includes('reject')) {
      return { response: '2' };
    }

    // Enhanced parsing - look for patterns
    const confirmPatterns = [
      /confirm/i,
      /accept/i,
      /yes/i,
      /ok/i,
      /^1$/,
      /got it/i,
      /on my way/i
    ];

    const rejectPatterns = [
      /reject/i,
      /decline/i,
      /no/i,
      /can't/i,
      /cannot/i,
      /^2$/,
      /not available/i,
      /busy/i
    ];

    if (confirmPatterns.some(pattern => pattern.test(body))) {
      return { response: '1' };
    } else if (rejectPatterns.some(pattern => pattern.test(body))) {
      return { response: '2' };
    }

    // If message doesn't match expected patterns, return null
    return {};
  }

  /**
   * Detect SMS provider from headers
   */
  private detectProvider(headers: Record<string, string>): string {
    const providerHeaders = {
      'twilio-sms-request-id': 'Twilio',
      'x-signalwire-context': 'SignalWire',
      'message Sid': 'SignalWire', // Case sensitive
      'x-twilio-signature': 'Twilio',
    };

    for (const [header, provider] of Object.entries(providerHeaders)) {
      if (headers[header] || headers[header.toLowerCase()]) {
        return provider;
      }
    }

    return 'Unknown';
  }

  /**
   * Get mock user context for webhook processing
   * In production, you would implement proper user/tenant resolution
   */
  private getMockUserForWebhook(): User {
    return {
      id: 'webhook-processor',
      email: 'system@tms-platform.com',
      firstName: 'System',
      lastName: 'Processor',
      companyId: 'system-tenant',
      role: {
        id: 'system-role',
        name: 'system',
        permissions: ['dispatch:process'],
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as User;
  }

  /**
   * Validate webhook signature (for security)
   */
  private validateWebhookSignature(payload: any, headers: Record<string, string>, secret: string): boolean {
    // Implement signature validation based on provider
    // For Twilio: validate X-Twilio-Signature
    // For SignalWire: validate their specific header
    
    // For now, return true (not secure for production)
    return true;
  }

  /**
   * Extract metadata from webhook headers
   */
  private extractWebhookMetadata(headers: Record<string, string>): any {
    return {
      provider: this.detectProvider(headers),
      userAgent: headers['user-agent'] || headers['User-Agent'],
      ip: headers['x-forwarded-for'] || headers['X-Forwarded-For'],
      timestamp: new Date(),
    };
  }

  /**
   * Health check for webhook processing
   */
  @Post('health')
  @Public()
  @ApiOperation({ summary: 'Webhook health check' })
  @ApiResponse({
    status: 200,
    description: 'Webhook service is healthy',
  })
  async healthCheck(@Response() res: ExpressResponse): Promise<void> {
    res.status(HttpStatus.OK).json({
      status: 'healthy',
      timestamp: new Date(),
      service: 'webhooks',
      version: '1.0.0',
    });
  }

  /**
   * Test webhook endpoint for development
   */
  @Post('test')
  @Public()
  @ApiOperation({ summary: 'Test webhook processing' })
  @ApiResponse({
    status: 200,
    description: 'Test webhook processed',
  })
  async testWebhook(@Body() payload: any): Promise<any> {
    this.logger.log(`🧪 [TEST WEBHOOK] Processing test webhook`);
    this.logger.log(`   Payload: ${JSON.stringify(payload, null, 2)}`);

    return {
      success: true,
      message: 'Test webhook processed successfully',
      timestamp: new Date(),
      parsed: this.parseSmsResponse(payload),
    };
  }
}