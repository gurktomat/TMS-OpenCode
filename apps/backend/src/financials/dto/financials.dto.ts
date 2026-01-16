import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsEnum, 
  IsDate, 
  IsArray, 
  IsNotEmpty,
  Min,
  Max,
  ValidateNested
  IsBoolean,
  IsDecimal
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus, BillStatus } from '../entities/financials.entity';

export class CreateInvoiceDto {
  @ApiProperty({
    description: 'Shipper ID',
    example: 'uuid-shipment-123',
  })
  @IsString()
  @IsNotEmpty()
  shipmentId: string;

  @ApiPropertyOptional({
    description: 'Invoice date',
    example: '2024-01-15',
  })
  @IsDateString()
  invoiceDate?: string;

  @ApiPropertyOptional({
    description: 'Due date',
    example: '2024-02-14',
  })
  @IsDateString()
  dueDate?: string;

  @ApiProperty({
    description: 'Customer PO number',
    example: 'PO-GLS-001',
  })
  @IsString()
  @IsOptional()
  purchaseOrderNumber?: string;

  @ApiPropertyOptional({
    description: 'Line items for the invoice',
    example: [
      {
        description: 'Line Haul - Chicago to Dallas',
        quantity: 1,
        unitPrice: 2.50,
        unitOfMeasure: 'mile',
        totalAmount: 2500.00
      },
      {
        description: 'Detention/Stopover',
        quantity: 1,
        unitPrice: 150.00,
        unitOfMeasure: 'flat',
        totalAmount: 150.00
      }
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    unitOfMeasure: string;
    totalAmount: number;
    referenceNumber?: string;
    commodityCode?: string;
    locationId?: string;
    locationDescription?: string;
    metadata?: any;
  }[];

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
    default: 'USD',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Payment terms',
    example: 'NET 30',
    default: 'NET 30',
  })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiPropertyOptional({
    description: 'Invoice notes',
    example: 'Payment due upon delivery confirmation',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { customer: 'Global Shipping Corp', salesperson: 'John Doe' },
  })
  @IsObject()
  metadata?: any;
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({
    description: 'Invoice status',
    enum: InvoiceStatus,
    example: InvoiceStatus.SENT,
  })
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    description: 'Paid amount',
    example: 2500.00,
  })
  @IsNumber()
  @Min(0)
  @IsDecimalPrecision(2)
  paidAmount?: number;

  @ApiPropertyOptional({
    description: 'Discount amount',
    example: 100.00,
  })
  @IsNumber()
  @Min(0)
  @IsDecimalPrecision(2)
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Tax amount',
    example: 200.00,
  })
  @IsNumber()
  @Min(0)
  @IsDecimalPrecision(2)
  taxAmount?: number;

  @ApiPropertyOptional({
    description: 'Notes',
    example: 'Customer requested expedited delivery',
  })
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Metadata',
    example: { 'customer_priority': 'high' },
  })
  @IsObject()
  metadata?: any;
}

export class CreateBillDto {
  @ApiProperty({
    description: 'Load Tender ID',
    example: 'uuid-loadtender-456',
  })
  @IsString()
  @IsNotEmpty()
  loadTenderId: string;

  @ApiPropertyOptional({
    description: 'Bill date',
    example: '2024-01-10',
  })
  @IsDateString()
  billDate?: Date;

  @ApiPropertyOptional({
    description: 'Due date',
    example: '2024-01-20',
  })
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: 'Payment terms',
    example: 'NET 30',
    default: 'NET 30',
  })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiPropertyOptional({
    description: 'Currency',
    example: 'USD',
    default: 'USD',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Agreed amount',
    example: 2000.00,
  })
  @IsNumber()
  @Min(0)
  @IsDecimalPrecision(2)
  agreedAmount?: number;

  @ApiPropertyOptional({
    description: 'Tax amount',
    example: 160.00,
  })
  @IsNumber()
  @Min(0)
  @IsDecimalPrecision(2)
  taxAmount?: number;

  @ApiPropertyOptional({
    description: 'Discount amount',
    example: 50.00,
  })
  @IsNumber()
  @Min(0)
  @IsDecimalPrecision(2)
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Balance due',
    example: 2000.00,
  })
  @IsNumber()
  @Min(0)
  @IsDecimalPrecision(2)
  balanceDue?: number;

  @ApiPropertyOptional({
    description: 'Notes',
    example: 'Payment due upon delivery',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Metadata',
    example: { 'loading_dock_required': true },
    })
  @IsObject()
  metadata?: any;
}

export class UpdateBillDto {
  @ApiPropertyOptional({
    description: 'Bill status',
    enum: BillStatus,
    example: BillStatus.RECEIVED,
  })
  @IsEnum(BillStatus)
  status?: BillStatus;

  @ApiPropertyOptional({
    description: 'Paid amount',
    example: 2000.00,
  })
  @IsNumber()
  @Min(0)
  @IsDecimalPrecision(2)
  paidAmount?: number;

  @ApiPropertyOptional({
    description: 'Discount amount',
    example: 50.00,
  })
  @IsNumber()
  @Min(0)
  @IsDecimalPrecision(2)
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Notes',
    example: 'Customer paid early',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Metadata',
    example: { 'payment_method': 'wire_transfer' },
  })
  @IsObject()
  metadata?: any;
}

export class ProfitCalculationDto {
  @ApiProperty({
    description: 'Include expenses in calculation',
    example: true,
    default: false,
  })
  @IsBoolean()
  includeExpenses?: boolean;
}

export class QueryInvoicesDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
  })
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: 'uuid-customer-123',
  })
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'SENT',
    enum: InvoiceStatus,
    })
  @IsEnum(InvoiceStatus)
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range start',
    example: '2024-01-01',
  })
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range end',
    example: '2024-01-31',
  })
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Search in reference number',
    example: 'INV2024-001',
  })
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    default: 'DESC',
  })
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}