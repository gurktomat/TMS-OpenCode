import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { 
  ShipmentEntity, 
  LocationEntity, 
  AuditLogEntity,
  UserEntity,
  CompanyEntity 
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShipmentEntity, 
      LocationEntity, 
      AuditLogEntity,
      UserEntity,
      CompanyEntity,
    ]),
  ],
  controllers: [ShipmentsController],
  providers: [ShipmentsService],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}