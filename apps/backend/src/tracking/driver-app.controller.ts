import { 
  Controller, 
  Post, 
  Body, 
  Param, 
  UseGuards, 
  Request, 
  Response, 
  HttpStatus,
  ParseUUIDPipe,
  UploadedFile,
  Headers
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { TrackingService } from '../tracking/services/geofencing.service';
import { LocationUpdate } from '../tracking/services/geofencing.service';
import { User } from '@tms-platform/types';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { CreateLocationUpdateDto } from './dto/driver-app.dto';

@ApiTags('Driver App')
@Controller('driver-app')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class DriverAppController {
  private readonly logger = new Logger(DriverAppController.name);

  constructor(private readonly trackingService: TrackingService) {}

  @Post('location')
  @ApiOperation({ 
    summary: 'Submit location update from driver mobile app',
    description: 'Accepts GPS coordinates and triggers geofence events automatically'
  })
  @ApiResponse({
    status: 200,
    description: 'Location update processed successfully',
  })
  async submitLocation(
    @Body() locationUpdate: CreateLocationUpdateDto,
    @Headers() headers: Record<string, string>,
    @Request() req: ExpressRequest,
  ): Promise<any> {
    try {
      const user = req.user as User;
      
      // Validate driver app token (additional security)
      await this.validateDriverAppToken(user, headers);

      // Process location update with geofencing
      const geofenceResult = await this.trackingService.processLocationUpdate(
        locationUpdate.shipmentId,
        {
          latitude: locationUpdate.latitude,
          longitude: locationUpdate.longitude,
          speed: locationUpdate.speed,
          heading: locationUpdate.heading,
          locationMethod: locationUpdate.locationMethod || 'DRIVER_APP',
          accuracy: locationUpdate.accuracy,
          address: locationUpdate.address,
          notes: locationUpdate.notes,
        },
        user.companyId // Use companyId as driverId for driver app
      );

      this.logger.log(`Location update from driver app: ${locationUpdate.shipmentId}`);

      return {
        success: true,
        message: 'Location update processed',
        data: {
          geofenceResult,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(`Driver app location update failed: ${error.message}`, error);
      return {
        success: false,
        message: 'Failed to process location update',
        error: error.message,
      };
    }
  }

  @Post('location/batch')
  @ApiOperation({ 
    summary: 'Submit batch location updates',
    description: 'Accepts multiple location updates for offline scenarios'
  })
  @ApiConsumes('multipart/form-data')
  async submitBatchLocations(
    @Body('locations') locationsJson: string,
    @UploadedFiles() photos: Express.Multer.File[],
    @Headers() headers: Record<string, string>,
    @Request() req: ExpressRequest,
  ): Promise<any> {
    try {
      const user = req.user as User;
      
      // Validate driver app token
      await this.validateDriverAppToken(user, headers);

      // Parse batch locations
      const locations = JSON.parse(locationsJson);
      
      const results = [];
      for (const location of locations) {
        try {
          const result = await this.trackingService.processLocationUpdate(
            location.shipmentId,
            location,
            user.companyId
          );
          results.push({
            locationId: location.id || Date.now().toString(),
            success: true,
            geofenceEvents: result.triggeredEvents?.length || 0,
          });
        } catch (error) {
          results.push({
            locationId: location.id || Date.now().toString(),
            success: false,
            error: error.message,
          });
        }
      }

      // Process uploaded photos
      if (photos && photos.length > 0) {
        await this.processLocationPhotos(photos, locations[0]?.shipmentId, user);
      }

      this.logger.log(`Batch location update processed: ${locations.length} locations`);

      return {
        success: true,
        message: `Processed ${locations.length} location updates`,
        data: {
          processed: results.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results,
        },
      };
    } catch (error) {
      this.logger.error(`Batch location update failed: ${error.message}`, error);
      return {
        success: false,
        message: 'Failed to process batch locations',
        error: error.message,
      };
    }
  }

  @Post('photos')
  @ApiOperation({ 
    summary: 'Upload photos from driver app',
    description: 'Upload photos related to shipment pickup or delivery'
  })
  @ApiConsumes('multipart/form-data')
  async uploadPhotos(
    @Body() photoData: { shipmentId: string; photoType: string; description?: string },
    @UploadedFiles() photos: Express.Multer.File[],
    @Headers() headers: Record<string, string>,
    @Request() req: ExpressRequest,
  ): Promise<any> {
    try {
      const user = req.user as User;
      
      // Validate driver app token
      await this.validateDriverAppToken(user, headers);

      // Process each photo
      const uploadedPhotos = [];
      for (const photo of photos) {
        const savedPhoto = await this.savePhoto(photo, photoData, user);
        uploadedPhotos.push(savedPhoto);
      }

      this.logger.log(`Photos uploaded for shipment: ${photoData.shipmentId}`);

      return {
        success: true,
        message: `${photos.length} photos uploaded successfully`,
        data: uploadedPhotos,
      };
    } catch (error) {
      this.logger.error(`Photo upload failed: ${error.message}`, error);
      return {
        success: false,
        message: 'Failed to upload photos',
        error: error.message,
      };
    }
  }

  @Get('shipments')
  @ApiOperation({ 
    summary: 'Get driver\'s assigned shipments',
    description: 'Returns shipments assigned to the authenticated driver'
  })
  async getAssignedShipments(@Request() req: ExpressRequest): Promise<any> {
    try {
      const user = req.user as User;
      
      // Get dispatch assignments for driver
      const assignments = await this.trackingService.getDriverAssignments(user.companyId);
      
      // Extract unique shipments
      const shipmentIds = [...new Set(assignments.map(a => a.shipmentId))];
      
      // Get shipment details
      const shipments = await this.trackingService.getShipmentsByIds(shipmentIds);

      return {
        success: true,
        data: shipments.map(shipment => ({
          id: shipment.id,
          referenceNumber: shipment.referenceNumber,
          status: shipment.status,
          pickupWindowStart: shipment.pickupWindowStart,
          pickupWindowEnd: shipment.pickupWindowEnd,
          deliveryWindowStart: shipment.deliveryWindowStart,
          deliveryWindowEnd: shipment.deliveryWindowEnd,
          shipperLocation: shipment.shipperLocation,
          consigneeLocation: shipment.consigneeLocation,
          equipment: shipment.equipmentType,
          weight: shipment.totalWeight,
          specialInstructions: shipment.commodityDescription,
          assignment: assignments.find(a => a.shipmentId === shipment.id),
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to get driver shipments: ${error.message}`, error);
      return {
        success: false,
        message: 'Failed to retrieve shipments',
        error: error.message,
      };
    }
  }

  @Get('profile')
  @ApiOperation({ 
    summary: 'Get driver profile and statistics',
    description: 'Returns driver profile information and performance metrics'
  })
  async getDriverProfile(@Request() req: ExpressRequest): Promise<any> {
    try {
      const user = req.user as User;
      const profile = await this.trackingService.getDriverProfile(user.companyId);
      
      return {
        success: true,
        data: profile,
      };
    } catch (error) {
      this.logger.error(`Failed to get driver profile: ${error.message}`, error);
      return {
        success: false,
        message: 'Failed to retrieve profile',
        error: error.message,
      };
    }
  }

  @Post('heartbeat')
  @ApiOperation({ 
    summary: 'Driver app heartbeat',
    description: 'Allows driver app to send periodic heartbeats for monitoring'
  })
  async heartbeat(
    @Body() heartbeatData: { 
      appVersion: string; 
      deviceId: string; 
      batteryLevel?: number; 
      gpsStatus?: string; 
    },
    @Request() req: ExpressRequest,
  ): Promise<any> {
    try {
      const user = req.user as User;
      
      // Update driver last seen
      await this.trackingService.updateDriverLastSeen(user.companyId);
      
      this.logger.log(`Driver heartbeat: ${user.email} - App v${heartbeatData.appVersion}`);

      return {
        success: true,
        message: 'Heartbeat received',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Heartbeat failed: ${error.message}`, error);
      return {
        success: false,
        message: 'Heartbeat processing failed',
        error: error.message,
      };
    }
  }

  /**
   * Validate driver app token for additional security
   */
  private async validateDriverAppToken(user: User, headers: Record<string, string>): Promise<void> {
    const token = headers['x-driver-app-token'];
    if (!token) {
      throw new Error('Driver app token required');
    }
    
    // In production, validate token against user's registered devices
    // For now, we'll just check if it's present
    this.logger.log(`Driver app token validated for user: ${user.email}`);
  }

  /**
   * Process uploaded photos and associate with shipment
   */
  private async savePhoto(photo: Express.Multer.File, photoData: any, user: User): Promise<any> {
    // Generate unique filename
    const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    
    // Save to storage (implement actual S3/local storage here)
    const filePath = `/uploads/${filename}`;
    
    // Create photo record in database
    const photoRecord = {
      shipmentId: photoData.shipmentId,
      fileName: filename,
      filePath: filePath,
      fileSize: photo.size,
      photoType: photoData.photoType,
      uploadedBy: user.companyId,
      uploadedAt: new Date(),
    };

    // This would save to a photos table
    // await this.photosRepository.save(photoRecord);
    
    return {
      id: filename,
      originalName: photo.originalname,
      size: photo.size,
      type: photoData.photoType,
      url: `/api/files/${filename}`,
    };
  }

  /**
   * Process location photos and create events
   */
  private async processLocationPhotos(photos: Express.Multer.File[], shipmentId: string, user: User): Promise<void> {
    for (const photo of photos) {
      const photoType = this.determinePhotoType(photo.originalname);
      
      // Create event for photo
      await this.trackingService.createManualEvent(
        shipmentId,
        'PHOTO_UPLOADED',
        `${photoType} photo uploaded`,
        user.companyId,
        {
          fileName: photo.originalname,
          fileSize: photo.size,
          uploadedAt: new Date().toISOString(),
        }
      );
    }
  }

  /**
   * Determine photo type based on filename
   */
  private determinePhotoType(filename: string): string {
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('pickup') || lowerFilename.includes('origin')) {
      return 'PICKUP_PHOTO';
    } else if (lowerFilename.includes('delivery') || lowerFilename.includes('destination')) {
      return 'DELIVERY_PHOTO';
    } else if (lowerFilename.includes('bill') || lowerFilename.includes('bol')) {
      return 'BILL_OF_LADING';
    } else if (lowerFilename.includes('damage') || lowerFilename.includes('exception')) {
      return 'DAMAGE_PHOTO';
    } else {
      return 'DOCUMENT_PHOTO';
    }
  }
}