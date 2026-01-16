import { 
  Controller, 
  Get, 
  Post, 
  Param, 
  UseGuards, 
  Request, 
  Response, 
  HttpStatus,
  ParseUUIDPipe,
  Query,
  Headers 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { TrackingService } from './services/geofencing.service';
import { User } from '@tms-platform/types';
import { Public } from '../auth/decorators/roles.decorator';
import { CreateManualEventDto, QueryTrackingDto } from './dto/tracking.dto';

@ApiTags('Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('track/:token')
  @Public() // No JWT required for public tracking
  @ApiOperation({ 
    summary: 'Public shipment tracking page',
    description: 'Allows customers to track shipments without authentication using a secure token'
  })
  @ApiParam({ name: 'token', type: 'string', description: 'Tracking token' })
  @ApiResponse({
    status: 200,
    description: 'Tracking information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        shipment: {
          type: 'object',
          properties: {
            referenceNumber: { type: 'string' },
            status: { type: 'string' },
            currentLocation: { type: 'object' },
            events: { type: 'array' },
          },
        },
        trackingUrl: { type: 'string' },
        estimatedTimeOfArrival: { type: 'string' },
      },
    },
  })
  async getPublicTracking(
    @Param('token', ParseUUIDPipe) token: string,
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ): Promise<void> {
    try {
      // Validate token and get shipment
      const trackingData = await this.trackingService.getPublicTrackingData(token, req);
      
      if (!trackingData) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: 'Invalid or expired tracking token',
          error: 'TOKEN_NOT_FOUND',
        });
      }

      // Update view count and log access
      await this.trackingService.updateTrackingView(token, req);

      // Return sanitized tracking data (hide sensitive info)
      const sanitizedData = this.sanitizePublicData(trackingData);

      res.status(HttpStatus.OK).json({
        success: true,
        data: sanitizedData,
      });

      // Log tracking access
      console.log(`📊 Public tracking accessed: ${token} from ${req.ip}`);
    } catch (error) {
      console.error(`Public tracking error: ${error.message}`);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Tracking service unavailable',
        error: 'INTERNAL_ERROR',
      });
    }
  }

  @Get('shipments/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, CompanyGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string', description: 'Shipment ID' })
  @ApiOperation({ 
    summary: 'Get detailed tracking for a shipment (Authenticated)',
    description: 'Returns comprehensive tracking information including geofence events and location history'
  })
  @ApiResponse({
    status: 200,
    description: 'Tracking data retrieved successfully',
  })
  async getShipmentTracking(
    @Param('id', ParseUUIDPipe) shipmentId: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const trackingSummary = await this.trackingService.getTrackingSummary(shipmentId);
    
    return {
      success: true,
      data: trackingSummary,
    };
  }

  @Get('shipments/:id/pings')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, CompanyGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string', description: 'Shipment ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 100 })
  @ApiOperation({ 
    summary: 'Get location pings for a shipment',
    description: 'Returns raw GPS/location data points for the shipment'
  })
  async getTrackingPings(
    @Param('id', ParseUUIDPipe) shipmentId: string,
    @Query('limit') limit: number = 100,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const pings = await this.trackingService.getTrackingPings(shipmentId, limit);
    
    return {
      success: true,
      data: {
        pings,
        total: pings.length,
        limit,
      },
    };
  }

  @Get('shipments/:id/events')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, CompanyGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string', description: 'Shipment ID' })
  @ApiQuery({ name: 'eventType', required: false, type: String })
  @ApiOperation({ 
    summary: 'Get shipment events',
    description: 'Returns all events for a shipment, optionally filtered by event type'
  })
  async getShipmentEvents(
    @Param('id', ParseUUIDPipe) shipmentId: string,
    @Query('eventType') eventType?: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const events = await this.trackingService.getShipmentEvents(shipmentId, eventType as any);
    
    return {
      success: true,
      data: {
        events,
        total: events.length,
      },
    };
  }

  @Get('shipments/:id/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, CompanyGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string', description: 'Shipment ID' })
  @ApiOperation({ 
    summary: 'Get route statistics for a shipment',
    description: 'Returns distance, speed, and duration statistics based on tracking data'
  })
  async getRouteStatistics(
    @Param('id', ParseUUIDPipe) shipmentId: string,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const statistics = await this.trackingService.getRouteStatistics(shipmentId);
    
    return {
      success: true,
      data: statistics,
    };
  }

  @Post('shipments/:id/events')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, CompanyGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string', description: 'Shipment ID' })
  @ApiOperation({ 
    summary: 'Create manual shipment event',
    description: 'Creates a manual event for the shipment (e.g., delay, exception, etc.)'
  })
  async createManualEvent(
    @Param('id', ParseUUIDPipe) shipmentId: string,
    @Body() createEventDto: CreateManualEventDto,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    const event = await this.trackingService.createManualEvent(
      shipmentId,
      createEventDto.eventType,
      createEventDto.description,
      user.companyId, // Use driverId from JWT as fallback
      createEventDto.metadata
    );
    
    return {
      success: true,
      message: 'Event created successfully',
      data: event,
    };
  }

  @Get('geofence/:id/check')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, CompanyGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string', description: 'Shipment ID' })
  @ApiQuery({ name: 'lat', required: true, type: Number, description: 'Latitude' })
  @ApiQuery({ name: 'lon', required: true, type: Number, description: 'Longitude' })
  @ApiOperation({ 
    summary: 'Check geofence status for coordinates',
    description: 'Tests if coordinates are within pickup/delivery geofence and triggers appropriate events'
  })
  async checkGeofence(
    @Param('id', ParseUUIDPipe) shipmentId: string,
    @Query('lat') latitude: number,
    @Query('lon') longitude: number,
    @Request() req: ExpressRequest,
  ) {
    const user = req.user as User;
    
    const locationUpdate = {
      latitude,
      longitude,
      locationMethod: 'MANUAL',
    };

    const geofenceResult = await this.trackingService.processLocationUpdate(
      shipmentId,
      locationUpdate,
      user.companyId // Use companyId from user as driverId
    );
    
    return {
      success: true,
      data: geofenceResult,
      message: `Geofence check completed. Events triggered: ${geofenceResult.triggeredEvents.length}`,
    };
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Tracking service health check' })
  @ApiResponse({
    status: 200,
    description: 'Tracking service is healthy',
  })
  async healthCheck(@Response() res: ExpressResponse) {
    res.status(HttpStatus.OK).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'tracking',
      version: '1.0.0',
    });
  }

  /**
   * Sanitize public tracking data to hide sensitive information
   */
  private sanitizePublicData(trackingData: any): any {
    return {
      shipment: {
        referenceNumber: trackingData.shipment?.referenceNumber,
        status: trackingData.shipment?.status,
        origin: {
          city: trackingData.shipment?.shipperLocation?.city,
          state: trackingData.shipment?.shipperLocation?.state,
        },
        destination: {
          city: trackingData.shipment?.consigneeLocation?.city,
          state: trackingData.shipment?.consigneeLocation?.state,
        },
        currentLocation: trackingData.currentLocation,
        estimatedTimeOfArrival: trackingData.shipment?.metadata?.estimatedTimeOfArrival,
        // Hide sensitive information
        // - No carrier cost information
        // - No internal notes
        // - No driver personal information
      },
      events: trackingData.pickupEvents.map(event => ({
        eventType: event.eventType,
        description: event.description,
        occurredAt: event.occurredAt,
        // Hide sensitive driver information for public view
        location: event.address || event.city,
      })),
      lastUpdate: trackingData.lastUpdate,
    };
  }
}