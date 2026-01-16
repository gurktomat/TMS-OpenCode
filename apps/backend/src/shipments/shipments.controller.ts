import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Response,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto, UpdateShipmentDto, QueryShipmentsDto } from './dto/shipment.dto';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { User } from '@tms-platform/types';
import { Roles, Permissions } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CompanyGuard } from '../auth/guards/company.guard';

@ApiTags('Shipments')
@Controller('shipments')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, CompanyGuard)
@ApiBearerAuth()
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  @Roles('admin', 'dispatcher')
  @Permissions('shipments:create')
  @ApiOperation({ summary: 'Create a new shipment (Admin/Dispatcher only)' })
  @ApiResponse({
    status: 201,
    description: 'Shipment created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or business rule violation',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async create(
    @Body() createShipmentDto: CreateShipmentDto,
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    try {
      const user = req.user as User;
      const shipment = await this.shipmentsService.create(createShipmentDto, user);
      
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Shipment created successfully',
        data: shipment,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get()
  @Permissions('shipments:read')
  @ApiOperation({ summary: 'Get all shipments for the tenant' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: ['QUOTE', 'TENDERED', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] })
  @ApiQuery({ name: 'equipmentType', required: false, enum: ['DRY_VAN', 'REEFER', 'FLATBED'] })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'carrierId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], example: 'DESC' })
  @ApiResponse({
    status: 200,
    description: 'Shipments retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        shipments: {
          type: 'array',
          items: { type: 'object' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async findAll(
    @Query() query: QueryShipmentsDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const result = await this.shipmentsService.findAll(query, user);
    
    return {
      success: true,
      data: result.shipments,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('stats')
  @Permissions('shipments:read')
  @ApiOperation({ summary: 'Get shipment statistics for dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStats(@Request() req: ExpressRequest) {
    const user = req.user as User;
    const stats = await this.shipmentsService.getStats(user);
    
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  @Permissions('shipments:read')
  @ApiParam({ name: 'id', type: 'string', description: 'Shipment ID' })
  @ApiOperation({ summary: 'Get shipment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Shipment retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Shipment not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const shipment = await this.shipmentsService.findById(id, user);
    
    return {
      success: true,
      data: shipment,
    };
  }

  @Patch(':id')
  @Permissions('shipments:update')
  @ApiParam({ name: 'id', type: 'string', description: 'Shipment ID' })
  @ApiOperation({ summary: 'Update shipment' })
  @ApiResponse({
    status: 200,
    description: 'Shipment updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Shipment not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateShipmentDto: UpdateShipmentDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const shipment = await this.shipmentsService.update(id, updateShipmentDto, user);
    
    return {
      success: true,
      message: 'Shipment updated successfully',
      data: shipment,
    };
  }

  @Delete(':id')
  @Roles('admin', 'dispatcher')
  @Permissions('shipments:delete')
  @ApiParam({ name: 'id', type: 'string', description: 'Shipment ID' })
  @ApiOperation({ summary: 'Cancel/delete shipment (Admin/Dispatcher only)' })
  @ApiResponse({
    status: 200,
    description: 'Shipment cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Shipment not found',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    await this.shipmentsService.remove(id, user);
    
    return {
      success: true,
      message: 'Shipment cancelled successfully',
    };
  }

  // Location Management Endpoints

  @Post('locations')
  @Permissions('locations:create')
  @ApiOperation({ summary: 'Create a new location' })
  @ApiResponse({
    status: 201,
    description: 'Location created successfully',
  })
  async createLocation(
    @Body() createLocationDto: CreateLocationDto,
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    try {
      const user = req.user as User;
      const location = await this.shipmentsService.createLocation(createLocationDto, user);
      
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Location created successfully',
        data: location,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('locations')
  @Permissions('locations:read')
  @ApiOperation({ summary: 'Get all locations for the tenant' })
  @ApiResponse({
    status: 200,
    description: 'Locations retrieved successfully',
  })
  async findAllLocations(@Request() req: ExpressRequest) {
    const user = req.user as User;
    const locations = await this.shipmentsService.findAllLocations(user);
    
    return {
      success: true,
      data: locations,
    };
  }

  @Get('locations/:id')
  @Permissions('locations:read')
  @ApiParam({ name: 'id', type: 'string', description: 'Location ID' })
  @ApiOperation({ summary: 'Get location by ID' })
  @ApiResponse({
    status: 200,
    description: 'Location retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Location not found',
  })
  async findLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const location = await this.shipmentsService.findLocationById(id, user);
    
    return {
      success: true,
      data: location,
    };
  }

  @Patch('locations/:id')
  @Permissions('locations:update')
  @ApiParam({ name: 'id', type: 'string', description: 'Location ID' })
  @ApiOperation({ summary: 'Update location' })
  @ApiResponse({
    status: 200,
    description: 'Location updated successfully',
  })
  async updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const location = await this.shipmentsService.updateLocation(id, updateLocationDto, user);
    
    return {
      success: true,
      message: 'Location updated successfully',
      data: location,
    };
  }

  @Delete('locations/:id')
  @Permissions('locations:delete')
  @ApiParam({ name: 'id', type: 'string', description: 'Location ID' })
  @ApiOperation({ summary: 'Delete location' })
  @ApiResponse({
    status: 200,
    description: 'Location deleted successfully',
  })
  async removeLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    await this.shipmentsService.removeLocation(id, user);
    
    return {
      success: true,
      message: 'Location deleted successfully',
    };
  }
}