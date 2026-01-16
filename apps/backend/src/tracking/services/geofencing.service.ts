import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { 
  TrackingPingEntity, 
  ShipmentEventEntity, 
  EventType, 
  EventSeverity 
} from './entities';
import { 
  ShipmentEntity, 
  ShipmentStatus 
} from '../../shipments/entities/shipment.entity';
import { DriverEntity } from '../../dispatch/entities/driver.entity';

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  locationMethod?: string;
  accuracy?: any;
  additionalData?: any;
  address?: string;
  notes?: string;
}

export interface GeofenceResult {
  isInsideGeofence: boolean;
  distanceToPickup: number;
  distanceToDelivery: number;
  triggeredEvents: EventType[];
  nearestStop: string;
  estimatedTimeOfArrival?: Date;
}

export interface TrackingSummary {
  shipmentId: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    timestamp: Date;
  };
  status: ShipmentStatus;
  pickupEvents: ShipmentEventEntity[];
  deliveryEvents: ShipmentEventEntity[];
  driverInfo: {
    id: string;
    name: string;
    phone: string;
  };
  lastUpdate: Date;
  totalEvents: number;
}

@Injectable()
export class GeofencingService {
  private readonly logger = new Logger(GeofencingService.name);

  constructor(
    @InjectRepository(TrackingPingEntity)
    private readonly trackingPingsRepository: Repository<TrackingPingEntity>,
    @InjectRepository(ShipmentEventEntity)
    private readonly shipmentEventsRepository: Repository<ShipmentEventEntity>,
    @InjectRepository(ShipmentEntity)
    private readonly shipmentsRepository: Repository<ShipmentEntity>,
    @InjectRepository(DriverEntity)
    private readonly driversRepository: Repository<DriverEntity>,
  ) {}

  /**
   * Process location update and trigger geofence events
   */
  async processLocationUpdate(shipmentId: string, locationUpdate: LocationUpdate, driverId: string): Promise<GeofenceResult> {
    this.logger.log(`Processing location update for shipment: ${shipmentId}`);

    try {
      // Fetch shipment with locations
      const shipment = await this.shipmentsRepository.findOne({
        where: { id: shipmentId },
        relations: ['shipperLocation', 'consigneeLocation'],
      });

      if (!shipment) {
        throw new Error('Shipment not found');
      }

      // Save tracking ping
      const trackingPing = this.trackingPingsRepository.create({
        shipmentId,
        driverId,
        latitude: locationUpdate.latitude,
        longitude: locationUpdate.longitude,
        speed: locationUpdate.speed || 0,
        heading: locationUpdate.heading || 0,
        locationMethod: locationUpdate.locationMethod || 'DRIVER_APP',
        accuracy: locationUpdate.accuracy,
        additionalData: locationUpdate.additionalData,
        address: locationUpdate.address,
        notes: locationUpdate.notes,
        timestamp: new Date(),
      });

      await this.trackingPingsRepository.save(trackingPing);

      // Calculate geofence analysis
      const geofenceResult = await this.analyzeGeofence(shipment, locationUpdate);

      // Trigger automatic events based on geofence
      if (geofenceResult.triggeredEvents.length > 0) {
        await this.createGeofenceEvents(shipmentId, driverId, geofenceResult);
      }

      // Estimate time of arrival
      if (geofenceResult.estimatedTimeOfArrival) {
        await this.updateEstimatedArrival(shipmentId, geofenceResult.estimatedTimeOfArrival);
      }

      this.logger.log(`Location update processed. Geofence events: ${geofenceResult.triggeredEvents.length}`);

      return geofenceResult;
    } catch (error) {
      this.logger.error(`Failed to process location update: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Analyze location against shipment geofences
   */
  private async analyzeGeofence(shipment: ShipmentEntity, locationUpdate: LocationUpdate): Promise<GeofenceResult> {
    const pickupLat = shipment.shipperLocation.latitude;
    const pickupLng = shipment.shipperLocation.longitude;
    const deliveryLat = shipment.consigneeLocation.latitude;
    const deliveryLng = shipment.consigneeLocation.longitude;

    const currentLat = locationUpdate.latitude;
    const currentLng = locationUpdate.longitude;

    // Calculate distances using Haversine formula
    const distanceToPickup = this.haversineDistance(
      currentLat, currentLng, pickupLat, pickupLng
    );

    const distanceToDelivery = this.haversineDistance(
      currentLat, currentLng, deliveryLat, deliveryLng
    );

    // Define geofence radius (500 meters ~ 0.3 miles)
    const geofenceRadiusMeters = 500;

    const isInsidePickupGeofence = distanceToPickup <= geofenceRadiusMeters;
    const isInsideDeliveryGeofence = distanceToDelivery <= geofenceRadiusMeters;

    const triggeredEvents: EventType[] = [];

    // Determine triggered events based on shipment status and location
    if (shipment.status === ShipmentStatus.DISPATCHED || shipment.status === ShipmentStatus.BOOKED) {
      if (isInsidePickupGeofence && !this.hasEventRecently(shipment.id, EventType.ARRIVED_PICKUP)) {
        triggeredEvents.push(EventType.ARRIVED_PICKUP);
      }
    }

    if (shipment.status === ShipmentStatus.IN_TRANSIT) {
      if (isInsideDeliveryGeofence && !this.hasEventRecently(shipment.id, EventType.ARRIVED_DELIVERY)) {
        triggeredEvents.push(EventType.ARRIVED_DELIVERY);
      }
    }

    // Determine nearest stop
    let nearestStop: string;
    if (distanceToPickup < distanceToDelivery) {
      nearestStop = 'pickup';
    } else {
      nearestStop = 'delivery';
    }

    // Estimate time of arrival
    let estimatedTimeOfArrival: Date | undefined;
    if (locationUpdate.speed && locationUpdate.speed > 0) {
      const remainingDistance = distanceToDelivery;
      const speedMps = locationUpdate.speed * 0.44704; // Convert mph to m/s
      const estimatedTimeSeconds = remainingDistance / speedMps;
      
      if (estimatedTimeSeconds > 0 && estimatedTimeSeconds < 24 * 60 * 60) { // Max 24 hours
        estimatedTimeOfArrival = new Date(Date.now() + (estimatedTimeSeconds * 1000));
      }
    }

    return {
      isInsideGeofence: isInsidePickupGeofence || isInsideDeliveryGeofence,
      distanceToPickup,
      distanceToDelivery,
      triggeredEvents,
      nearestStop,
      estimatedTimeOfArrival,
    };
  }

  /**
   * Create geofence-triggered events
   */
  private async createGeofenceEvents(
    shipmentId: string, 
    driverId: string, 
    geofenceResult: GeofenceResult
  ): Promise<void> {
    for (const eventType of geofenceResult.triggeredEvents) {
      const event = this.shipmentEventsRepository.create({
        shipmentId,
        eventType,
        description: this.generateEventDescription(eventType, geofenceResult),
        occurredAt: new Date(),
        severity: this.getEventSeverity(eventType),
        latitude: this.getLatestLocation(shipmentId)?.latitude,
        longitude: this.getLatestLocation(shipmentId)?.longitude,
        driverId,
      });

      await this.shipmentEventsRepository.save(event);
    }
  }

  /**
   * Get latest tracking ping for a shipment
   */
  private async getLatestLocation(shipmentId: string): Promise<{ latitude: number; longitude: number } | null> {
    const latestPing = await this.trackingPingsRepository.findOne({
      where: { shipmentId },
      order: { timestamp: 'DESC' },
      select: ['latitude', 'longitude'],
    });

    return latestPing || null;
  }

  /**
   * Check if event occurred recently (within last hour)
   */
  private async hasEventRecently(shipmentId: string, eventType: EventType): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentEvent = await this.shipmentEventsRepository.findOne({
      where: {
        shipmentId,
        eventType,
        occurredAt: oneHourAgo,
      },
      order: { occurredAt: 'DESC' },
    });

    return !!recentEvent;
  }

  /**
   * Haversine formula to calculate distance between two coordinates
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Generate event description
   */
  private generateEventDescription(eventType: EventType, geofenceResult: GeofenceResult): string {
    switch (eventType) {
      case EventType.ARRIVED_PICKUP:
        return `Driver arrived at pickup location (${geofenceResult.distanceToPickup.toFixed(0)}m from origin)`;
      case EventType.ARRIVED_DELIVERY:
        return `Driver arrived at delivery location (${geofenceResult.distanceToDelivery.toFixed(0)}m from destination)`;
      case EventType.LOADED:
        return 'Shipment loaded at pickup location';
      case EventType.IN_TRANSIT:
        return 'Shipment departed pickup and is now in transit';
      case EventType.DELIVERED:
        return 'Shipment delivered successfully';
      default:
        return `Geofence event: ${eventType}`;
    }
  }

  /**
   * Get event severity
   */
  private getEventSeverity(eventType: EventType): EventSeverity {
    switch (eventType) {
      case EventType.EXCEPTION:
      case EventType.CRITICAL:
        return EventSeverity.CRITICAL;
      case EventType.DELAYED:
        return EventSeverity.WARNING;
      default:
        return EventSeverity.INFO;
    }
  }

  /**
   * Update estimated time of arrival
   */
  private async updateEstimatedArrival(shipmentId: string, eta: Date): Promise<void> {
    await this.shipmentsRepository.update(shipmentId, {
      metadata: {
        estimatedTimeOfArrival: eta.toISOString(),
        etaLastUpdated: new Date().toISOString(),
      },
    });

    this.logger.log(`Updated ETA for shipment ${shipmentId}: ${eta.toISOString()}`);
  }

  /**
   * Get complete tracking summary for a shipment
   */
  async getTrackingSummary(shipmentId: string): Promise<TrackingSummary> {
    try {
      // Get shipment with relations
      const shipment = await this.shipmentsRepository.findOne({
        where: { id: shipmentId },
        relations: [
          'shipperLocation',
          'consigneeLocation',
          'assignedDriver',
          'trackingPings',
          'events',
        ],
      });

      if (!shipment) {
        throw new Error('Shipment not found');
      }

      // Get latest location
      const latestPing = shipment.trackingPings
        ? shipment.trackingPings.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )[0]
        : null;

      // Get pickup and delivery events
      const pickupEvents = shipment.events
        ? shipment.events.filter(event => 
            event.eventType === EventType.ARRIVED_PICKUP ||
            event.eventType === EventType.LOADED ||
            event.eventType === EventType.DEPARTED_PICKUP
          ).sort((a, b) => 
            new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
          )
        : [];

      const deliveryEvents = shipment.events
        ? shipment.events.filter(event => 
            event.eventType === EventType.ARRIVED_DELIVERY ||
            event.eventType === EventType.DELIVERED
          ).sort((a, b) => 
            new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
          )
        : [];

      return {
        shipmentId,
        currentLocation: latestPing ? {
          latitude: latestPing.latitude,
          longitude: latestPing.longitude,
          address: latestPing.address,
          timestamp: latestPing.timestamp,
        } : undefined,
        status: shipment.status,
        pickupEvents,
        deliveryEvents,
        driverInfo: shipment.assignedDriver ? {
          id: shipment.assignedDriver.id,
          name: `${shipment.assignedDriver.firstName} ${shipment.assignedDriver.lastName}`,
          phone: shipment.assignedDriver.phoneNumber,
        } : undefined,
        lastUpdate: latestPing?.timestamp || shipment.updatedAt,
        totalEvents: shipment.events ? shipment.events.length : 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get tracking summary: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get tracking pings for a shipment
   */
  async getTrackingPings(shipmentId: string, limit: number = 100): Promise<TrackingPingEntity[]> {
    return this.trackingPingsRepository.find({
      where: { shipmentId },
      relations: ['driver'],
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get shipment events
   */
  async getShipmentEvents(shipmentId: string, eventType?: EventType): Promise<ShipmentEventEntity[]> {
    const queryBuilder = this.shipmentEventsRepository
      .createQueryBuilder('event')
      .where('event.shipmentId = :shipmentId', { shipmentId })
      .leftJoinAndSelect('event.driver', 'driver')
      .orderBy('event.occurredAt', 'DESC');

    if (eventType) {
      queryBuilder.andWhere('event.eventType = :eventType', { eventType });
    }

    return queryBuilder.getMany();
  }

  /**
   * Create manual event
   */
  async createManualEvent(
    shipmentId: string,
    eventType: EventType,
    description: string,
    driverId: string,
    metadata?: any
  ): Promise<ShipmentEventEntity> {
    const event = this.shipmentEventsRepository.create({
      shipmentId,
      eventType,
      description,
      occurredAt: new Date(),
      severity: this.getEventSeverity(eventType),
      driverId,
      metadata,
    });

    const savedEvent = await this.shipmentEventsRepository.save(event);
    
    this.logger.log(`Manual event created: ${eventType} for shipment ${shipmentId}`);
    
    return savedEvent;
  }

  /**
   * Calculate route statistics
   */
  async getRouteStatistics(shipmentId: string): Promise<any> {
    const pings = await this.getTrackingPings(shipmentId);
    
    if (pings.length < 2) {
      return {
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        duration: 0,
      };
    }

    let totalDistance = 0;
    let totalSpeed = 0;
    let maxSpeed = 0;

    for (let i = 1; i < pings.length; i++) {
      const distance = this.haversineDistance(
        pings[i - 1].latitude,
        pings[i - 1].longitude,
        pings[i].latitude,
        pings[i].longitude
      );

      totalDistance += distance;
      
      if (pings[i].speed) {
        totalSpeed += pings[i].speed;
        maxSpeed = Math.max(maxSpeed, pings[i].speed);
      }
    }

    const averageSpeed = pings.length > 1 ? totalSpeed / (pings.length - 1) : 0;
    const duration = pings.length > 1 
      ? (new Date(pings[pings.length - 1].timestamp).getTime() - new Date(pings[0].timestamp).getTime()) / 1000 / 60 
      : 0;

    return {
      totalDistance: Math.round(totalDistance),
      averageSpeed: Math.round(averageSpeed * 10) / 10, // Round to 1 decimal
      maxSpeed: Math.round(maxSpeed * 10) / 10,
      duration: Math.round(duration * 10) / 10, // Round to 1 decimal
      pointCount: pings.length,
    };
  }
}