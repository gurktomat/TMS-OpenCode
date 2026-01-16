import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialsModule } from './financials/financials.module';
import { 
  InvoiceEntity, 
  BillEntity, 
  FinancialLineItemEntity 
} from './entities/financials.entity';
import { 
  InvoiceStatus,
  BillStatus,
  LineItemType 
} from './entities/financials.entity';
import { 
  UserEntity,
  CompanyEntity 
} from '../../users/entities/user.entity';
import { 
  ShipmentEntity,
  LoadTenderEntity,
  TenderStatus 
} from '../../shipments/entities/shipment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InvoiceEntity,
      BillEntity, 
      FinancialLineItemEntity,
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [
    FinancialsModule,
  ],
})
export class FinancialsModule {}