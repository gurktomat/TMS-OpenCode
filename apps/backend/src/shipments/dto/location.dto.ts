import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsDecimal,
  Min, 
  Max, 
  IsDateString, 
  IsArray,
  IsObject,
  ValidateNested,
  ArrayNotEmpty,
  IsEnum
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OperatingHoursDto {
  @ApiPropertyOptional({
    description: 'Monday operating hours',
    example: { open: '08:00', close: '17:00' },
  })
  @IsOptional()
  @IsObject()
  monday?: { open: string; close: string };

  @ApiPropertyOptional({
    description: 'Tuesday operating hours',
    example: { open: '08:00', close: '17:00' },
  })
  @IsOptional()
  @IsObject()
  tuesday?: { open: string; close: string };

  @ApiPropertyOptional({
    description: 'Wednesday operating hours',
    example: { open: '08:00', close: '17:00' },
  })
  @IsOptional()
  @IsObject()
  wednesday?: { open: string; close: string };

  @ApiPropertyOptional({
    description: 'Thursday operating hours',
    example: { open: '08:00', close: '17:00' },
  })
  @IsOptional()
  @IsObject()
  thursday?: { open: string; close: string };

  @ApiPropertyOptional({
    description: 'Friday operating hours',
    example: { open: '08:00', close: '17:00' },
  })
  @IsOptional()
  @IsObject()
  friday?: { open: string; close: string };

  @ApiPropertyOptional({
    description: 'Saturday operating hours',
    example: { open: '08:00', close: '12:00' },
  })
  @IsOptional()
  @IsObject()
  saturday?: { open: string; close: string };

  @ApiPropertyOptional({
    description: 'Sunday operating hours',
    example: null,
  })
  @IsOptional()
  sunday?: { open: string; close: string } | null;
}

export class EquipmentRestrictionsDto {
  @ApiPropertyOptional({
    description: 'Maximum weight allowed',
    example: 45000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWeight?: number;

  @ApiPropertyOptional({
    description: 'Maximum height allowed',
    example: 13.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxHeight?: number;

  @ApiPropertyOptional({
    description: 'Dock availability',
    example: true,
  })
  @IsOptional()
  hasDock?: boolean;

  @ApiPropertyOptional({
    description: 'Forklift availability',
    example: true,
  })
  @IsOptional()
  hasForklift?: boolean;

  @ApiPropertyOptional({
    description: 'Loading equipment available',
    example: ['pallet_jack', 'forklift'],
  })
  @IsOptional()
  @IsArray()
  loadingEquipment?: string[];
}

export class CreateLocationDto {
  @ApiProperty({
    description: 'Location name',
    example: 'Global Shipping Corp - Warehouse A',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Street address line 1',
    example: '123 Main Street',
  })
  @IsString()
  street1: string;

  @ApiPropertyOptional({
    description: 'Street address line 2',
    example: 'Suite 100',
  })
  @IsOptional()
  @IsString()
  street2?: string;

  @ApiProperty({
    description: 'City',
    example: 'Chicago',
  })
  @IsString()
  city: string;

  @ApiProperty({
    description: 'State/Province',
    example: 'IL',
  })
  @IsString()
  state: string;

  @ApiProperty({
    description: 'Postal/ZIP code',
    example: '60601',
  })
  @IsString()
  postalCode: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'US',
    default: 'US',
  })
  @IsOptional()
  @IsString()
  country?: string = 'US';

  @ApiPropertyOptional({
    description: 'Latitude',
    example: 41.8781,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude',
    example: -87.6298,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Contact person name',
    example: 'John Smith',
  })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+1-555-0100',
  })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'contact@example.com',
  })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Operating hours',
    type: OperatingHoursDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OperatingHoursDto)
  operatingHours?: OperatingHoursDto;

  @ApiPropertyOptional({
    description: 'Special handling instructions',
    example: 'Appointment required for loading',
  })
  @IsOptional()
  @IsObject()
  specialInstructions?: any;

  @ApiPropertyOptional({
    description: 'Equipment restrictions',
    type: EquipmentRestrictionsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EquipmentRestrictionsDto)
  equipmentRestrictions?: EquipmentRestrictionsDto;

  @ApiPropertyOptional({
    description: 'Location type',
    example: 'warehouse',
    enum: ['warehouse', 'customer', 'terminal', 'distribution_center'],
  })
  @IsOptional()
  @IsEnum(['warehouse', 'customer', 'terminal', 'distribution_center'])
  locationType?: string;
}

export class UpdateLocationDto {
  @ApiPropertyOptional({
    description: 'Location name',
    example: 'Global Shipping Corp - Warehouse A',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Street address line 1',
    example: '123 Main Street',
  })
  @IsOptional()
  @IsString()
  street1?: string;

  @ApiPropertyOptional({
    description: 'Street address line 2',
    example: 'Suite 100',
  })
  @IsOptional()
  @IsString()
  street2?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'Chicago',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'State/Province',
    example: 'IL',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'Postal/ZIP code',
    example: '60601',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Contact person name',
    example: 'John Smith',
  })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+1-555-0100',
  })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'contact@example.com',
  })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional({
    description: 'Operating hours',
    type: OperatingHoursDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OperatingHoursDto)
  operatingHours?: OperatingHoursDto;

  @ApiPropertyOptional({
    description: 'Special handling instructions',
    example: 'Appointment required for loading',
  })
  @IsOptional()
  @IsObject()
  specialInstructions?: any;

  @ApiPropertyOptional({
    description: 'Equipment restrictions',
    type: EquipmentRestrictionsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EquipmentRestrictionsDto)
  equipmentRestrictions?: EquipmentRestrictionsDto;

  @ApiPropertyOptional({
    description: 'Location type',
    example: 'warehouse',
  })
  @IsOptional()
  @IsEnum(['warehouse', 'customer', 'terminal', 'distribution_center'])
  locationType?: string;
}