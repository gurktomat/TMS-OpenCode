import { 
  IsString, 
  IsNumber, 
  IsOptional, 
  IsEnum, 
  IsDecimal, 
  IsArray, 
  IsObject, 
  IsNotEmpty,
  IsBoolean,
  ValidateNested,
  Min,
  Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationMethod } from '../entities/tracking-ping.entity';
import { EventType } from '../entities/shipment-event.entity';

export class CreateLocationUpdateDto {
  @ApiProperty({
    description: 'Shipment ID',
    example: 'uuid-shipment-123',
  })
  @IsString()
  @IsNotEmpty()
  shipmentId: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 41.8781,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -87.6298,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({
    description: 'Speed in MPH',
    example: 65.5,
  })
  @IsNumber()
  @Min(0)
  @Max(120)
  speed?: number;

  @ApiPropertyOptional({
    description: 'Heading in degrees',
    example: 270.0,
  })
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;

  @ApiPropertyOptional({
    description: 'Location method',
    enum: LocationMethod,
    example: LocationMethod.DRIVER_APP,
  })
  @IsEnum(LocationMethod)
  locationMethod?: LocationMethod;

  @ApiPropertyOptional({
    description: 'GPS accuracy in meters',
    example: 10.5,
  })
  @IsNumber()
  @Min(0)
  accuracy?: any;

  @ApiPropertyOptional({
    description: 'Physical address',
    example: '123 Main St, Chicago, IL 60601',
  })
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Driver notes',
    example: 'Waiting for loading to begin',
  })
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Additional data',
    example: { batteryLevel: 85, networkSignal: 'strong' },
  })
  @IsObject()
  additionalData?: any;
}

export class BatchLocationDto {
  @ApiProperty({
    description: 'Unique location ID for this update',
    example: 'loc_1642345678',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Shipment ID',
    example: 'uuid-shipment-123',
  })
  @IsString()
  @IsNotEmpty()
  shipmentId: string;

  @ApiProperty({
    description: 'Latitude coordinate',
    example: 41.8781,
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: -87.6298,
  })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({
    description: 'Timestamp of location',
    example: '2024-01-16T15:30:00Z',
  })
  @IsString()
  timestamp?: string;

  @ApiPropertyOptional({
    description: 'Speed in MPH',
    example: 65.5,
  })
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({
    description: 'Location method',
    enum: LocationMethod,
    example: LocationMethod.DRIVER_APP,
  })
  @IsEnum(LocationMethod)
  locationMethod?: LocationMethod;
}

export class PhotoUploadDto {
  @ApiProperty({
    description: 'Shipment ID',
    example: 'uuid-shipment-123',
  })
  @IsString()
  @IsNotEmpty()
  shipmentId: string;

  @ApiProperty({
    description: 'Photo type',
    example: 'PICKUP_PHOTO',
    enum: ['PICKUP_PHOTO', 'DELIVERY_PHOTO', 'BILL_OF_LADING', 'DAMAGE_PHOTO', 'DOCUMENT_PHOTO'],
  })
  @IsString()
  @IsNotEmpty()
  photoType: string;

  @ApiPropertyOptional({
    description: 'Photo description',
    example: 'Loading complete, ready to depart',
  })
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { timeOfDay: 'morning', weather: 'clear' },
  })
  @IsObject()
  metadata?: any;
}

export class HeartbeatDto {
  @ApiProperty({
    description: 'App version',
    example: '2.1.0',
  })
  @IsString()
  @IsNotEmpty()
  appVersion: string;

  @ApiProperty({
    description: 'Device identifier',
    example: 'iPhone-123456',
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @ApiPropertyOptional({
    description: 'Battery level percentage',
    example: 85,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @ApiPropertyOptional({
    description: 'GPS status',
    example: 'active',
    enum: ['active', 'inactive', 'searching', 'no_signal'],
  })
  @IsString()
  gpsStatus?: string;

  @ApiPropertyOptional({
    description: 'Network connection status',
    example: '4g',
    enum: ['wifi', '4g', '3g', '2g', 'none'],
  })
  @IsString()
  networkStatus?: string;

  @ApiPropertyOptional({
    description: 'Device temperature',
    example: 22.5,
  })
  @IsNumber()
  @Min(-20)
  @Max(60)
  deviceTemperature?: number;
}

export class CreateManualEventDto {
  @ApiProperty({
    description: 'Event type',
    enum: EventType,
    example: EventType.DELAYED,
  })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({
    description: 'Event description',
    example: 'Traffic delay estimated 2 hours',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: 'Event metadata',
    example: { weatherCondition: 'heavy_rain', reportedBy: 'dispatch' },
  })
  @IsObject()
  metadata?: any;
}

export class QueryTrackingDto {
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
    description: 'Filter by shipment status',
    example: 'IN_TRANSIT',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by event type',
    example: 'ARRIVED_PICKUP',
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({
    description: 'Start date filter',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date filter',
    example: '2024-01-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Driver ID filter',
    example: 'uuid-driver-123',
  })
  @IsOptional()
  @IsString()
  driverId?: string;

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