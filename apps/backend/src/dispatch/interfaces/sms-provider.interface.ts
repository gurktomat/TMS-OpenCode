/**
 * SMS Provider Interface - Adapter Pattern for flexible provider swapping
 * This interface allows easy swapping between SMS providers like Twilio, SignalWire, etc.
 */
export interface ISmsProvider {
  /**
   * Send SMS message
   * @param to - Recipient phone number in E.164 format
   * @param message - Message content
   * @returns Promise resolving to send success status
   */
  sendSms(to: string, message: string): Promise<SmsResult>;

  /**
   * Check if provider is healthy/available
   * @returns Promise resolving to provider health status
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get provider name/configuration
   */
  getProviderInfo(): ProviderInfo;
}

/**
 * SMS Send Result
 */
export interface SmsResult {
  success: boolean;
  messageId?: string;
  providerResponse?: any;
  error?: string;
  cost?: number;
  timestamp: Date;
}

/**
 * Provider Information
 */
export interface ProviderInfo {
  name: string;
  version: string;
  capabilities: string[];
  supportedCountries: string[];
  rateLimit?: number; // messages per minute
}

/**
 * SMS Message Details
 */
export interface SmsMessage {
  to: string;
  from?: string;
  message: string;
  metadata?: any;
  scheduledFor?: Date;
}

/**
 * Webhook Event from SMS Provider
 */
export interface SmsWebhookEvent {
  provider: string;
  eventType: string;
  messageId: string;
  from: string;
  to: string;
  body: string;
  timestamp: Date;
  status: string;
  errorCode?: string;
  metadata?: any;
}