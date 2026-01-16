import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  Response,
  HttpStatus,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { CarriersService } from './carriers.service';
import { RatingService } from './services/rating.service';
import { TenderingService } from './services/tendering.service';
import { 
  CreateCarrierDto, 
  UpdateCarrierDto, 
  CreateCarrierLaneDto, 
  TenderLoadDto, 
  RespondToTenderDto,
  QueryCarriersDto 
} from './dto/carrier.dto';
import { User } from '@tms-platform/types';
import { Roles, Permissions } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CompanyGuard } from '../auth/guards/company.guard';

@ApiTags('Carriers')
@Controller('carriers')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, CompanyGuard)
@ApiBearerAuth()
export class CarriersController {
  constructor(
    private readonly carriersService: CarriersService,
    private readonly ratingService: RatingService,
    private readonly tenderingService: TenderingService,
  ) {}

  @Post()
  @Roles('admin', 'dispatcher')
  @Permissions('carriers:create')
  @ApiOperation({ summary: 'Create a new carrier (Admin/Dispatcher only)' })
  @ApiResponse({
    status: 201,
    description: 'Carrier created successfully',
  })
  async create(
    @Body() createCarrierDto: CreateCarrierDto,
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ) {
    try {
      const user = req.user as User;
      const carrier = await this.carriersService.create(createCarrierDto, user);
      
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: 'Carrier created successfully',
        data: carrier,
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
  @Permissions('carriers:read')
  @ApiOperation({ summary: 'Get all carriers' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'scac', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'] })
  @ApiQuery({ name: 'safetyRating', required: false, enum: ['SATISFACTORY', 'CONDITIONAL', 'UNSATISFACTORY', 'NOT_RATED'] })
  @ApiQuery({ name: 'serviceArea', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Carriers retrieved successfully',
  })
  async findAll(
    @Query() query: QueryCarriersDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const result = await this.carriersService.findAll(query, user);
    
    return {
      success: true,
      data: result.carriers,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get(':id')
  @Permissions('carriers:read')
  @ApiParam({ name: 'id', type: 'string', description: 'Carrier ID' })
  @ApiOperation({ summary: 'Get carrier by ID' })
  @ApiResponse({
    status: 200,
    description: 'Carrier retrieved successfully',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const carrier = await this.carriersService.findById(id, user);
    
    return {
      success: true,
      data: carrier,
    };
  }

  @Patch(':id')
  @Roles('admin', 'dispatcher')
  @Permissions('carriers:update')
  @ApiParam({ name: 'id', type: 'string', description: 'Carrier ID' })
  @ApiOperation({ summary: 'Update carrier (Admin/Dispatcher only)' })
  @ApiResponse({
    status: 200,
    description: 'Carrier updated successfully',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCarrierDto: UpdateCarrierDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const carrier = await this.carriersService.update(id, updateCarrierDto, user);
    
    return {
      success: true,
      message: 'Carrier updated successfully',
      data: carrier,
    };
  }

  // Rating Endpoints

  @Post('shipments/:id/rate')
  @Permissions('shipments:read', 'carriers:read')
  @ApiParam({ name: 'id', type: 'string', description: 'Shipment ID' })
  @ApiOperation({ summary: 'Get rates for a shipment' })
  @ApiResponse({
    status: 200,
    description: 'Rates calculated successfully',
    schema: {
      type: 'object',
      properties: {
        shipment: { type: 'object' },
        quotes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              carrierId: { type: 'string' },
              carrierName: { type: 'string' },
              scac: { type: 'string' },
              calculatedRate: { type: 'number' },
              rank: { type: 'number' },
              breakdown: { type: 'object' },
            },
          },
        },
      },
    },
  })
  async getRates(
    @Param('id', ParseUUIDPipe) shipmentId: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const quotes = await this.ratingService.getRatesForShipmentId(shipmentId, user);
    
    return {
      success: true,
      data: {
        shipmentId,
        totalQuotes: quotes.length,
        quotes: quotes.map(quote => ({
          carrierId: quote.carrierId,
          carrierName: quote.carrierName,
          scac: quote.scac,
          calculatedRate: quote.calculatedRate,
          rank: quote.rank,
          breakdown: quote.breakdown,
          transitDays: quote.transitDays,
          equipmentMatch: quote.equipmentMatch,
          safetyRating: quote.safetyRating,
          overallRating: quote.overallRating,
        })),
      },
    };
  }

  // Tendering Endpoints

  @Post('shipments/:id/tender')
  @Roles('admin', 'dispatcher')
  @Permissions('carriers:tender')
  @ApiParam({ name: 'id', type: 'string', description: 'Shipment ID' })
  @ApiOperation({ summary: 'Tender a shipment to a carrier' })
  @ApiResponse({
    status: 200,
    description: 'Load tendered successfully',
  })
  async tenderLoad(
    @Param('id', ParseUUIDPipe) shipmentId: string,
    @Body() tenderDto: TenderLoadDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const result = await this.tenderingService.tenderLoad({
      shipmentId,
      ...tenderDto,
    }, user);
    
    return {
      success: result.success,
      message: result.message,
      data: {
        tenderId: result.tender.id,
        status: result.tender.status,
        offerAmount: result.tender.offerAmount,
        offerExpiryDate: result.tender.offerExpiryDate,
        nextActions: result.nextActions,
      },
    };
  }

  @Post('tenders/:id/accept')
  @Permissions('tenders:respond')
  @ApiParam({ name: 'id', type: 'string', description: 'Tender ID' })
  @ApiOperation({ summary: 'Accept a tender (Carrier action)' })
  @ApiResponse({
    status: 200,
    description: 'Tender accepted successfully',
  })
  async acceptTender(
    @Param('id', ParseUUIDPipe) tenderId: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const result = await this.tenderingService.acceptTender(tenderId, user.companyId, user);
    
    return {
      success: result.success,
      message: result.message,
      data: {
        tenderId: result.tender.id,
        status: result.tender.status,
        acceptedDate: result.tender.acceptedDate,
        nextActions: result.nextActions,
      },
    };
  }

  @Post('tenders/:id/reject')
  @Permissions('tenders:respond')
  @ApiParam({ name: 'id', type: 'string', description: 'Tender ID' })
  @ApiOperation({ summary: 'Reject a tender (Carrier action)' })
  @ApiResponse({
    status: 200,
    description: 'Tender rejected successfully',
  })
  async rejectTender(
    @Param('id', ParseUUIDPipe) tenderId: string,
    @Body() responseDto: RespondToTenderDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const result = await this.tenderingService.rejectTender(
      tenderId, 
      user.companyId, 
      responseDto.reason,
      user
    );
    
    return {
      success: result.success,
      message: result.message,
      data: {
        tenderId: result.tender.id,
        status: result.tender.status,
        rejectedDate: result.tender.rejectedDate,
        responseNotes: result.tender.responseNotes,
      },
    };
  }

  @Post('tenders/:id/cancel')
  @Roles('admin', 'dispatcher')
  @Permissions('tenders:cancel')
  @ApiParam({ name: 'id', type: 'string', description: 'Tender ID' })
  @ApiOperation({ summary: 'Cancel a tender (Admin/Dispatcher only)' })
  @ApiResponse({
    status: 200,
    description: 'Tender cancelled successfully',
  })
  async cancelTender(
    @Param('id', ParseUUIDPipe) tenderId: string,
    @Body('reason') reason: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const result = await this.tenderingService.cancelTender(tenderId, reason, user);
    
    return {
      success: result.success,
      message: result.message,
      data: {
        tenderId: result.tender.id,
        status: result.tender.status,
        cancelledDate: result.tender.cancelledDate,
        cancellationReason: result.tender.cancellationReason,
      },
    };
  }

  @Get('tenders')
  @Permissions('tenders:read')
  @ApiOperation({ summary: 'Get tenders for the user\'s carrier' })
  @ApiQuery({ name: 'status', required: false, enum: ['OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'WITHDRAWN'] })
  @ApiQuery({ name: 'shipmentId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Tenders retrieved successfully',
  })
  async getTenders(
    @Query('status') status?: string,
    @Query('shipmentId') shipmentId?: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    
    let tenders;
    if (shipmentId) {
      tenders = await this.tenderingService.getTendersForShipment(shipmentId, user);
    } else {
      tenders = await this.tenderingService.getTendersForCarrier(user.companyId, user);
    }

    // Filter by status if provided
    if (status) {
      tenders = tenders.filter(tender => tender.status === status);
    }
    
    return {
      success: true,
      data: tenders,
    };
  }

  // Lane Management Endpoints

  @Post('lanes')
  @Roles('admin', 'dispatcher')
  @Permissions('carriers:update')
  @ApiOperation({ summary: 'Create or update carrier lane' })
  @ApiResponse({
    status: 200,
    description: 'Lane saved successfully',
  })
  async createLane(
    @Body() createLaneDto: CreateCarrierLaneDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const lane = await this.ratingService.upsertLane(createLaneDto, user);
    
    return {
      success: true,
      message: 'Lane saved successfully',
      data: lane,
    };
  }

  @Get(':id/lanes')
  @Permissions('carriers:read')
  @ApiParam({ name: 'id', type: 'string', description: 'Carrier ID' })
  @ApiOperation({ summary: 'Get carrier lanes' })
  @ApiResponse({
    status: 200,
    description: 'Carrier lanes retrieved successfully',
  })
  async getCarrierLanes(
    @Param('id', ParseUUIDPipe) carrierId: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const lanes = await this.ratingService.getCarrierLanes(carrierId, user);
    
    return {
      success: true,
      data: lanes,
    };
  }

  @Get(':id/performance')
  @Permissions('carriers:read')
  @ApiParam({ name: 'id', type: 'string', description: 'Carrier ID' })
  @ApiOperation({ summary: 'Get carrier performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'Carrier performance retrieved successfully',
  })
  async getCarrierPerformance(
    @Param('id', ParseUUIDPipe) carrierId: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const performance = await this.ratingService.getCarrierPerformance(carrierId);
    
    return {
      success: true,
      data: performance,
    };
  }
}