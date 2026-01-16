import { 
  IsString, 
  IsOptional, 
  IsEnum, 
  IsNumber, 
  IsInt, 
  Min, 
  Max, 
  IsDateString, 
  IsBoolean,
  IsArray,
  IsObject,
  ValidateNested,
  ArrayNotEmpty
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentType, ShipmentPriority } from '../entities/shipment.entity';

export class CreateShipmentDto {
  @ApiProperty({
    description: 'Bill of Lading number',
    example: 'BOL-2024-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  bolNumber?: string;

  @ApiProperty({
    description: 'Purchase Order number',
    example: 'PO-GLS-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  purchaseOrderNumber?: string;

  @ApiProperty({
    description: 'Shipment priority',
    enum: ShipmentPriority,
    example: ShipmentPriority.STANDARD,
    default: ShipmentPriority.STANDARD,
  })
  @IsOptional()
  @IsEnum(ShipmentPriority)
  priority?: ShipmentPriority = ShipmentPriority.STANDARD;

  @ApiProperty({
    description: 'Customer ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'Shipper location ID',
    example: '660e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  shipperLocationId: string;

  @ApiProperty({
    description: 'Consignee location ID',
    example: '660e8400-e29b-41d4-a716-446655440002',
  })
  @IsString()
  consigneeLocationId: string;

  @ApiProperty({
    description: 'Pickup window start date and time',
    example: '2024-01-17T08:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  pickupWindowStart?: string;

  @ApiProperty({
    description: 'Pickup window end date and time',
    example: '2024-01-17T12:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  pickupWindowEnd?: string;

  @ApiProperty({
    description: 'Delivery window start date and time',
    example: '2024-01-19T14:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  deliveryWindowStart?: string;

  @ApiProperty({
    description: 'Delivery window end date and time',
    example: '2024-01-19T18:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  deliveryWindowEnd?: string;

  @ApiProperty({
    description: 'Equipment type required',
    enum: EquipmentType,
    example: EquipmentType.DRY_VAN,
  })
  @IsEnum(EquipmentType)
  equipmentType: EquipmentType;

  @ApiProperty({
    description: 'Total weight in pounds',
    example: 25000.50,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalWeight?: number;

  @ApiProperty({
    description: 'Total volume in cubic feet',
    example: 1800.00,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalVolume?: number;

  @ApiProperty({
    description: 'Total number of pieces',
    example: 24,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalPieces?: number;

  @ApiProperty({
    description: 'Commodity description',
    example: 'Electronics and computer equipment',
    required: false,
  })
  @IsOptional()
  @IsString()
  commodityDescription?: string;

  @ApiProperty({
    description: 'Special instructions for handling',
    example: 'Fragile items - handle with care',
    required: false,
  })
  @IsOptional()
  @IsObject()
  specialInstructions?: any;

  @ApiProperty({
    description: 'Whether shipment contains hazardous materials',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hazardousMaterial?: boolean = false;

  @ApiProperty({
    description: 'Temperature requirements for reefer shipments',
    example: { minTemp: -10, maxTemp: 0, unit: 'F' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  temperatureRequirements?: any;

  @ApiProperty({
    description: 'Quoted rate for the shipment',
    example: 1850.00,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quotedRate?: number;

  @ApiProperty({
    description: 'Internal notes',
    example: 'Customer requires appointment',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { salesperson: 'John Doe', source: 'web' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateShipmentDto {
  @ApiPropertyOptional({
    description: 'Bill of Lading number',
    example: 'BOL-2024-001',
  })
  @IsOptional()
  @IsString()
  bolNumber?: string;

  @ApiPropertyOptional({
    description: 'Purchase Order number',
    example: 'PO-GLS-001',
  })
  @IsOptional()
  @IsString()
  purchaseOrderNumber?: string;

  @ApiPropertyOptional({
    description: 'Shipment status',
    enum: ['QUOTE', 'TENDERED', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
  })
  @IsOptional()
  @IsEnum(['QUOTE', 'TENDERED', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Shipment priority',
    enum: ShipmentPriority,
    example: ShipmentPriority.EXPEDITED,
  })
  @IsOptional()
  @IsEnum(ShipmentPriority)
  priority?: ShipmentPriority;

  @ApiPropertyOptional({
    description: 'Carrier ID',
    example: '770e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsString()
  carrierId?: string;

  @ApiPropertyOptional({
    description: 'Pickup window start date and time',
    example: '2024-01-17T08:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  pickupWindowStart?: string;

  @ApiPropertyOptional({
    description: 'Pickup window end date and time',
    example: '2024-01-17T12:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  pickupWindowEnd?: string;

  @ApiPropertyOptional({
    description: 'Delivery window start date and time',
    example: '2024-01-19T14:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  deliveryWindowStart?: string;

  @ApiPropertyOptional({
    description: 'Delivery window end date and time',
    example: '2024-01-19T18:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  deliveryWindowEnd?: string;

  @ApiPropertyOptional({
    description: 'Actual pickup date and time',
    example: '2024-01-17T09:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  actualPickupDate?: string;

  @ApiPropertyOptional({
    description: 'Actual delivery date and time',
    example: '2024-01-19T15:45:00Z',
  })
  @IsOptional()
  @IsDateString()
  actualDeliveryDate?: string;

  @ApiPropertyOptional({
    description: 'Total weight in pounds',
    example: 26000.00,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalWeight?: number;

  @ApiPropertyOptional({
    description: 'Total volume in cubic feet',
    example: 1850.00,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalVolume?: number;

  @ApiPropertyOptional({
    description: 'Total number of pieces',
    example: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalPieces?: number;

  @ApiPropertyOptional({
    description: 'Quoted rate',
    example: 1900.00,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quotedRate?: number;

  @ApiPropertyOptional({
    description: 'Actual rate',
    example: 1850.00,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  actualRate?: number;

  @ApiPropertyOptional({
    description: 'Assigned dispatcher ID',
    example: '990e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsString()
  assignedDispatcherId?: string;

  @ApiPropertyOptional({
    description: 'Assigned driver ID',
    example: '990e8400-e29b-41d4-a716-446655440004',
  })
  @IsOptional()
  @IsString()
  assignedDriverId?: string;

  @ApiPropertyOptional({
    description: 'Internal notes',
    example: 'Customer updated delivery address',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryShipmentsDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'QUOTE',
  })
  @IsOptional()
  @IsEnum(['QUOTE', 'TENDERED', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by equipment type',
    example: 'DRY_VAN',
  })
  @IsOptional()
  @IsEnum(EquipmentType)
  equipmentType?: EquipmentType;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by carrier ID',
    example: '770e8400-e29b-41d4-a716-446655440002',
  })
  @IsOptional()
  @IsString()
  carrierId?: string;

  @ApiPropertyOptional({
    description: 'Search in reference number, BOL, or PO number',
    example: 'L-2026-001',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'DESC',
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}