import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarriersService } from './carriers.service';
import { RatingService } from './services/rating.service';
import { TenderingService } from './services/tendering.service';
import { CarriersController } from './carriers.controller';
import { 
  CarrierEntity, 
  CarrierLaneEntity, 
  LoadTenderEntity 
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CarrierEntity, 
      CarrierLaneEntity, 
      LoadTenderEntity,
    ]),
  ],
  controllers: [CarriersController],
  providers: [
    CarriersService,
    RatingService,
    TenderingService,
  ],
  exports: [
    CarriersService,
    RatingService,
    TenderingService,
  ],
})
export class CarriersModule {}