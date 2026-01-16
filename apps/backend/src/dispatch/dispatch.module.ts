import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DispatchService } from './dispatch.service';
import { DriversService } from './drivers.service';
import { DispatchController } from './dispatch.controller';
import { WebhooksController } from './webhooks.controller';
import { ISmsProvider } from './interfaces/sms-provider.interface';
import { MockSmsProvider } from './providers/mock-sms.provider';
import { SignalWireService } from './providers/signalwire-sms.provider';
import { 
  DriverEntity, 
  DispatchAssignmentEntity, 
  DriverStatus,
  DispatchStatus,
  LicenseType 
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DriverEntity, 
      DispatchAssignmentEntity
    ]),
  ],
  controllers: [
    DispatchController,
    WebhooksController
  ],
  providers: [
    DispatchService,
    DriversService,
    // SMS Provider - can be swapped based on environment
    {
      provide: 'SMS_PROVIDER',
      useClass: process.env.NODE_ENV === 'production' ? SignalWireService : MockSmsProvider,
    },
    // For development, use MockSmsProvider
    // For production, replace with SignalWireService or other real providers
  ],
  exports: [
    DispatchService,
    DriversService,
    'SMS_PROVIDER',
  ],
})
export class DispatchModule {}