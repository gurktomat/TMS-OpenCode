import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseGuards,
  Request,
  Response,
  HttpStatus,
  ParseUUIDPipe,
  Query,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { DispatchService } from './dispatch.service';
import { DriversService } from './drivers.service';
import { DispatchRequest, DispatchResponse } from './dispatch.service';
import { CreateDriverDto, UpdateDriverDto, QueryDriversDto } from './dto/driver.dto';
import { User } from '@tms-platform/types';
import { Roles, Permissions } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CompanyGuard } from '../auth/guards/company.guard';

@ApiTags('Dispatch')
@Controller('dispatch')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, CompanyGuard)
@ApiBearerAuth()
export class DispatchController {
  constructor(
    private readonly dispatchService: DispatchService,
    private readonly driversService: DriversService,
  ) {}

  // Driver Management Endpoints

  @Post('drivers')
  @Roles('admin', 'dispatcher')
  @Permissions('drivers:create')
  @ApiOperation({ summary: 'Create a new driver' })
  @ApiResponse({
    status: 201,
    description: 'Driver created successfully',
  })
  async createDriver(
    @Body() createDriverDto: CreateDriverDto,
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    try {
      const user = req.user as User;
      const driver = await this.driversService.create(createDriverDto, user);
      
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Driver created successfully',
        data: driver,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get('drivers')
  @Permissions('drivers:read')
  @ApiOperation({ summary: 'Get all drivers with filters' })
  @ApiResponse({
    status: 200,
    description: 'Drivers retrieved successfully',
  })
  async findAllDrivers(
    @Query() query: QueryDriversDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const result = await this.driversService.findAll(query, user);
    
    return {
      success: true,
      data: result.drivers,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('drivers/:id')
  @Permissions('drivers:read')
  @ApiParam({ name: 'id', type: 'string', description: 'Driver ID' })
  @ApiOperation({ summary: 'Get driver by ID' })
  @ApiResponse({
    status: 200,
    description: 'Driver retrieved successfully',
  })
  async findDriver(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const driver = await this.driversService.findById(id, user);
    
    return {
      success: true,
      data: driver,
    };
  }

  @Get('drivers/:id/availability')
  @Permissions('drivers:read')
  @ApiParam({ name: 'id', type: 'string', description: 'Driver ID' })
  @ApiOperation({ summary: 'Get driver availability status' })
  @ApiResponse({
    status: 200,
    description: 'Driver availability retrieved successfully',
  })
  async getDriverAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const availability = await this.dispatchService.getDriverAvailability(id, user);
    
    return {
      success: true,
      data: availability,
    };
  }

  // Dispatching Endpoints

  @Post('assign')
  @Roles('admin', 'dispatcher')
  @Permissions('dispatch:create')
  @ApiOperation({ summary: 'Assign driver to shipment' })
  @ApiResponse({
    status: 200,
    description: 'Driver assigned successfully',
  })
  async assignDriver(
    @Body() dispatchRequest: DispatchRequest,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const result: DispatchResponse = await this.dispatchService.assignDriver(dispatchRequest, user);
    
    return {
      success: result.success,
      message: result.message,
      data: {
        assignment: result.assignment,
        smsResult: result.smsResult,
        nextActions: result.nextActions,
      },
    };
  }

  @Get('assignments')
  @Permissions('dispatch:read')
  @ApiOperation({ summary: 'Get dispatch assignments' })
  @ApiQuery({ name: 'shipmentId', required: false, type: String })
  @ApiQuery({ name: 'driverId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Assignments retrieved successfully',
  })
  async getAssignments(
    @Query('shipmentId') shipmentId?: string,
    @Query('driverId') driverId?: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    let assignments;

    if (shipmentId) {
      assignments = await this.dispatchService.getAssignmentsForShipment(shipmentId, user);
    } else if (driverId) {
      assignments = await this.dispatchService.getAssignmentsForDriver(driverId, user);
    } else {
      // Return all assignments for the tenant
      assignments = await this.driversService.getAssignments(user);
    }
    
    return {
      success: true,
      data: assignments,
    };
  }

  @Get('assignments/:id')
  @Permissions('dispatch:read')
  @ApiParam({ name: 'id', type: 'string', description: 'Assignment ID' })
  @ApiOperation({ summary: 'Get assignment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Assignment retrieved successfully',
  })
  async findAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const assignments = await this.dispatchService.getAssignmentsForShipment(id, user);
    const assignment = assignments.find(a => a.id === id);
    
    if (!assignment) {
      return {
        success: false,
        message: 'Assignment not found',
      };
    }
    
    return {
      success: true,
      data: assignment,
    };
  }

  @Get('stats')
  @Permissions('dispatch:read')
  @ApiOperation({ summary: 'Get dispatch statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dispatch statistics retrieved successfully',
  })
  async getDispatchStats(@Request() req: ExpressRequest) {
    const user = req.user as User;
    const dispatchStats = await this.dispatchService.getDispatchStats(user);
    const driverStats = await this.driversService.getStats(user);
    
    return {
      success: true,
      data: {
        dispatch: dispatchStats,
        drivers: driverStats,
      },
    };
  }

  // Driver Status Management

  @Post('drivers/:id/status')
  @Roles('admin', 'dispatcher')
  @Permissions('drivers:update')
  @ApiParam({ name: 'id', type: 'string', description: 'Driver ID' })
  @ApiOperation({ summary: 'Update driver status' })
  @ApiResponse({
    status: 200,
    description: 'Driver status updated successfully',
  })
  async updateDriverStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const driver = await this.driversService.updateStatus(id, status, user);
    
    return {
      success: true,
      message: 'Driver status updated successfully',
      data: driver,
    };
  }

  @Post('drivers/:id/location')
  @Roles('admin', 'dispatcher')
  @Permissions('drivers:update')
  @ApiParam({ name: 'id', type: 'string', description: 'Driver ID' })
  @ApiOperation({ summary: 'Update driver location' })
  @ApiResponse({
    status: 200,
    description: 'Driver location updated successfully',
  })
  async updateDriverLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() locationData: { latitude: number; longitude: number; },
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const driver = await this.driversService.updateLocation(id, locationData, user);
    
    return {
      success: true,
      message: 'Driver location updated successfully',
      data: driver,
    };
  }
}