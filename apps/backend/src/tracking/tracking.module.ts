import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingController } from './tracking.controller';
import { DriverAppController } from './driver-app.controller';
import { GeofencingService } from './services/geofencing.service';
import { 
  TrackingPingEntity, 
  ShipmentEventEntity, 
  PublicShareTokenEntity 
} from './entities';
import { ShipmentEntity } from '../../shipments/entities/shipment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TrackingPingEntity, 
      ShipmentEventEntity, 
      PublicShareTokenEntity,
      ShipmentEntity,
    ]),
  ],
  controllers: [
    TrackingController,
    DriverAppController,
  ],
  providers: [
    GeofencingService,
  ],
  exports: [
    GeofencingService,
  ],
})
export class TrackingModule {}