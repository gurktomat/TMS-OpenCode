import { 
  IsString, 
  IsOptional, 
  IsEmail, 
  IsPhoneNumber, 
  IsEnum, 
  IsNumber, 
  IsDateString, 
  IsArray, 
  IsObject,
  Min,
  Max,
  ValidateNested,
  IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DriverStatus, LicenseType } from '../entities/driver.entity';
import { DispatchStatus, DispatchType } from '../entities/dispatch-assignment.entity';

export class CreateDriverDto {
  @ApiProperty({
    description: 'Driver first name',
    example: 'John',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'Driver last name',
    example: 'Smith',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '+15551234567',
  })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({
    description: 'CDL number',
    example: 'CDL123456',
  })
  @IsString()
  cdlNumber: string;

  @ApiPropertyOptional({
    description: 'License type',
    enum: LicenseType,
    example: LicenseType.CLASS_A,
    default: LicenseType.CLASS_A,
  })
  @IsOptional()
  @IsEnum(LicenseType)
  licenseType?: LicenseType;

  @ApiPropertyOptional({
    description: 'License expiration date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  licenseExpirationDate?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john.smith@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Street address',
    example: '123 Main St',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Chicago',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'State',
    example: 'IL',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Postal code',
    example: '60601',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'US',
    default: 'US',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Carrier ID if driver belongs to a carrier',
    example: 'uuid-carrier-123',
  })
  @IsOptional()
  @IsString()
  carrierId?: string;

  @ApiPropertyOptional({
    description: 'Hire date',
    example: '2020-01-15',
  })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({
    description: 'Base rate per mile',
    example: 0.45,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseRate?: number;

  @ApiPropertyOptional({
    description: 'Years of experience',
    example: 5.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(50)
  experienceYears?: number;

  @ApiPropertyOptional({
    description: 'CDL endorsements',
    example: ['HAZMAT', 'DOUBLES', 'TANKER'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  endorsements?: string[];

  @ApiPropertyOptional({
    description: 'Equipment experience',
    example: ['DRY_VAN', 'REEFER', 'FLATBED'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  equipmentExperience?: string[];

  @ApiPropertyOptional({
    description: 'Emergency contact information',
    example: { name: 'Jane Smith', phone: '+15559876543', relationship: 'spouse' },
  })
  @IsOptional()
  @IsObject()
  emergencyContact?: any;

  @ApiPropertyOptional({
    description: 'Driver preferences',
    example: { preferredRoutes: ['midwest'], maxDriveTime: 11 },
  })
  @IsOptional()
  @IsObject()
  preferences?: any;
}

export class UpdateDriverDto {
  @ApiPropertyOptional({
    description: 'Driver first name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Driver last name',
    example: 'Smith',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Phone number in E.164 format',
    example: '+15551234567',
  })
  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john.smith@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Driver status',
    enum: DriverStatus,
    example: DriverStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @ApiPropertyOptional({
    description: 'Address',
    example: '123 Main St, Chicago, IL 60601',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Base rate per mile',
    example: 0.48,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseRate?: number;

  @ApiPropertyOptional({
    description: 'Experience years',
    example: 6.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(50)
  experienceYears?: number;

  @ApiPropertyOptional({
    description: 'Safety score',
    example: 95.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  safetyScore?: number;

  @ApiPropertyOptional({
    description: 'On-time delivery percentage',
    example: 98.2,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  onTimePercentage?: number;

  @ApiPropertyOptional({
    description: 'Driver notes',
    example: 'Experienced in refrigerated freight',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Whether driver is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryDriversDto {
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
    description: 'Filter by status',
    enum: DriverStatus,
    example: DriverStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @ApiPropertyOptional({
    description: 'Filter by carrier ID',
    example: 'uuid-carrier-123',
  })
  @IsOptional()
  @IsString()
  carrierId?: string;

  @ApiPropertyOptional({
    description: 'Search in name, phone, or CDL',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by license type',
    enum: LicenseType,
    example: LicenseType.CLASS_A,
  })
  @IsOptional()
  @IsEnum(LicenseType)
  licenseType?: LicenseType;

  @ApiPropertyOptional({
    description: 'Filter by equipment experience',
    example: 'REEFER',
  })
  @IsOptional()
  @IsString()
  equipment?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'lastName',
    default: 'lastName',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'lastName';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'ASC',
    default: 'ASC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

export class DispatchDriverDto {
  @ApiProperty({
    description: 'Shipment ID to dispatch driver to',
    example: 'uuid-shipment-123',
  })
  @IsString()
  shipmentId: string;

  @ApiProperty({
    description: 'Driver ID to assign',
    example: 'uuid-driver-456',
  })
  @IsString()
  driverId: string;

  @ApiPropertyOptional({
    description: 'Dispatch message',
    example: 'Load details and instructions',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Scheduled dispatch time',
    example: '2024-01-17T08:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiPropertyOptional({
    description: 'Dispatch type',
    enum: DispatchType,
    example: DispatchType.PRIMARY,
    default: DispatchType.PRIMARY,
  })
  @IsOptional()
  @IsEnum(DispatchType)
  dispatchType?: DispatchType;
}