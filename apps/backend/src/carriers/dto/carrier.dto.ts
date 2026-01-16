import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsEnum, 
  IsEmail, 
  IsArray, 
  IsObject,
  Min,
  Max,
  ValidateNested,
  IsDecimal
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SafetyRating, CarrierStatus } from '../entities/car.entity';
import { TenderType } from '../entities/load-tender.entity';

export class CreateCarrierDto {
  @ApiProperty({
    description: 'Carrier name',
    example: 'FastTrack Logistics LLC',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Standard Carrier Alpha Code',
    example: 'FTLS',
    maxLength: 4,
  })
  @IsString()
  scac: string;

  @ApiPropertyOptional({
    description: 'Motor Carrier number',
    example: 'MC123456',
  })
  @IsOptional()
  @IsString()
  mcNumber?: string;

  @ApiPropertyOptional({
    description: 'DOT number',
    example: 'DOT789012',
  })
  @IsOptional()
  @IsString()
  dotNumber?: string;

  @ApiPropertyOptional({
    description: 'Safety rating',
    enum: SafetyRating,
    example: SafetyRating.SATISFACTORY,
  })
  @IsOptional()
  @IsEnum(SafetyRating)
  safetyRating?: SafetyRating;

  @ApiProperty({
    description: 'Contact email',
    example: 'dispatch@fasttrack.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    description: 'Contact phone',
    example: '+1-555-0100',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Company description',
    example: 'Regional carrier specializing in dry van and refrigerated freight',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Cargo coverage amount',
    example: 1000000.00,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cargoCoverage?: number;

  @ApiPropertyOptional({
    description: 'Liability coverage amount',
    example: 750000.00,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  liabilityCoverage?: number;

  @ApiPropertyOptional({
    description: 'Equipment types',
    example: ['DRY_VAN', 'REEFER'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  equipmentTypes?: string[];

  @ApiPropertyOptional({
    description: 'Service areas',
    example: ['IL', 'IN', 'WI', 'MI'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  serviceAreas?: string[];

  @ApiPropertyOptional({
    description: 'Contact information',
    example: { primaryContact: 'John Doe', dispatchPhone: '+1-555-0101' },
  })
  @IsOptional()
  @IsObject()
  contactInfo?: any;
}

export class UpdateCarrierDto {
  @ApiPropertyOptional({
    description: 'Carrier name',
    example: 'FastTrack Logistics LLC',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Safety rating',
    enum: SafetyRating,
    example: SafetyRating.SATISFACTORY,
  })
  @IsOptional()
  @IsEnum(SafetyRating)
  safetyRating?: SafetyRating;

  @ApiPropertyOptional({
    description: 'Carrier status',
    enum: CarrierStatus,
    example: CarrierStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CarrierStatus)
  status?: CarrierStatus;

  @ApiPropertyOptional({
    description: 'Contact email',
    example: 'dispatch@fasttrack.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Contact phone',
    example: '+1-555-0100',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Overall rating',
    example: 4.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(5)
  rating?: number;
}

export class CreateCarrierLaneDto {
  @ApiProperty({
    description: 'Carrier ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  carrierId: string;

  @ApiProperty({
    description: 'Origin state zone',
    example: 'IL',
    maxLength: 2,
  })
  @IsString()
  originZone: string;

  @ApiProperty({
    description: 'Destination state zone',
    example: 'TX',
    maxLength: 2,
  })
  @IsString()
  destinationZone: string;

  @ApiPropertyOptional({
    description: 'Rate per mile',
    example: 2.50,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  ratePerMile?: number;

  @ApiPropertyOptional({
    description: 'Flat rate for the lane',
    example: 2500.00,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  flatRate?: number;

  @ApiPropertyOptional({
    description: 'Minimum charge for the lane',
    example: 500.00,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minCharge?: number;

  @ApiPropertyOptional({
    description: 'Maximum charge for the lane',
    example: 5000.00,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxCharge?: number;

  @ApiPropertyOptional({
    description: 'Minimum miles for this lane rate',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumMiles?: number;

  @ApiPropertyOptional({
    description: 'Maximum miles for this lane rate',
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumMiles?: number;

  @ApiPropertyOptional({
    description: 'Equipment types for this lane',
    example: ['DRY_VAN', 'REEFER'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  equipmentTypes?: string[];

  @ApiPropertyOptional({
    description: 'Fuel surcharge percentage',
    example: 15.00,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  fuelSurchargePercentage?: number;

  @ApiPropertyOptional({
    description: 'Minimum transit days',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  transitDaysMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum transit days',
    example: 4,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  transitDaysMax?: number;

  @ApiPropertyOptional({
    description: 'Effective start date',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  effectiveStartDate?: string;

  @ApiPropertyOptional({
    description: 'Effective end date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  effectiveEndDate?: string;
}

export class TenderLoadDto {
  @ApiProperty({
    description: 'Carrier ID to tender the load to',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  carrierId: string;

  @ApiProperty({
    description: 'Offer amount',
    example: 2500.00,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Offer expiry time in hours',
    example: 24,
    default: 24,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168) // Max 1 week
  offerExpiryHours?: number;

  @ApiPropertyOptional({
    description: 'Tender type',
    enum: TenderType,
    example: TenderType.PRIMARY,
    default: TenderType.PRIMARY,
  })
  @IsOptional()
  @IsEnum(TenderType)
  tenderType?: TenderType;

  @ApiPropertyOptional({
    description: 'Additional tender details',
    example: { specialInstructions: 'Appointment required for pickup' },
  })
  @IsOptional()
  @IsObject()
  tenderDetails?: any;
}

export class RespondToTenderDto {
  @ApiPropertyOptional({
    description: 'Response notes',
    example: 'We accept this load and will pick up tomorrow',
  })
  @IsOptional()
  @IsString()
  responseNotes?: string;

  @ApiPropertyOptional({
    description: 'Counter offer amount (if rejecting with counter)',
    example: 2400.00,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  counterOfferAmount?: number;

  @ApiPropertyOptional({
    description: 'Rejection reason',
    example: 'Equipment not available for requested dates',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryCarriersDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by SCAC code',
    example: 'FTLS',
  })
  @IsOptional()
  @IsString()
  scac?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: CarrierStatus,
    example: CarrierStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CarrierStatus)
  status?: CarrierStatus;

  @ApiPropertyOptional({
    description: 'Filter by safety rating',
    enum: SafetyRating,
    example: SafetyRating.SATISFACTORY,
  })
  @IsOptional()
  @IsEnum(SafetyRating)
  safetyRating?: SafetyRating;

  @ApiPropertyOptional({
    description: 'Filter by service area',
    example: 'IL',
  })
  @IsOptional()
  @IsString()
  serviceArea?: string;

  @ApiPropertyOptional({
    description: 'Search in name or SCAC',
    example: 'FastTrack',
  })
  @IsOptional()
  @IsString()
  search?: string;
}