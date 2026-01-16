import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { 
  CarrierEntity, 
  CarrierLaneEntity, 
  SafetyRating,
  CarrierStatus 
} from './entities';
import { ShipmentEntity, EquipmentType, ShipmentStatus } from '../../shipments/entities/shipment.entity';
import { User } from '@tms-platform/types';

export interface RateQuote {
  carrier: CarrierEntity;
  carrierId: string;
  carrierName: string;
  scac: string;
  ratePerMile: number;
  flatRate: number;
  calculatedRate: number;
  minCharge: number;
  maxCharge: number;
  transitDays: { min: number; max: number };
  equipmentMatch: boolean;
  serviceAreaMatch: boolean;
  safetyRating: SafetyRating;
  overallRating: number;
  rank: number;
  breakdown: {
    baseRate: number;
    distanceMiles: number;
    fuelSurcharge: number;
    accessorialCharges: number;
    total: number;
  };
}

export interface RatingRequest {
  shipmentId: string;
  originState: string;
  destinationState: string;
  originCity: string;
  destinationCity: string;
  equipmentType: EquipmentType;
  weight: number;
  miles?: number;
  specialRequirements?: any;
}

@Injectable()
export class RatingService {
  private readonly logger = new Logger(RatingService.name);

  constructor(
    @InjectRepository(CarrierEntity)
    private readonly carriersRepository: Repository<CarrierEntity>,
    @InjectRepository(CarrierLaneEntity)
    private readonly carrierLanesRepository: Repository<CarrierLaneEntity>,
  ) {}

  /**
   * Get rates for a shipment using Least Cost Routing
   */
  async getRatesForShipment(shipment: ShipmentEntity): Promise<RateQuote[]> {
    this.logger.log(`Getting rates for shipment: ${shipment.referenceNumber}`);

    // Build rating request
    const request: RatingRequest = {
      shipmentId: shipment.id,
      originState: this.extractState(shipment.shipperLocation.postalCode),
      destinationState: this.extractState(shipment.consigneeLocation.postalCode),
      originCity: shipment.shipperLocation.city,
      destinationCity: shipment.consigneeLocation.city,
      equipmentType: shipment.equipmentType,
      weight: shipment.totalWeight || 0,
    };

    // Calculate distance if not provided
    if (!request.miles) {
      request.miles = this.calculateDistance(
        request.originCity,
        request.originState,
        request.destinationCity,
        request.destinationState
      );
    }

    // Find eligible carriers and lanes
    const eligibleQuotes = await this.findEligibleCarriers(request);

    // Calculate rates for each eligible carrier
    const calculatedQuotes = eligibleQuotes.map(quote => 
      this.calculateRate(quote, request)
    );

    // Sort by cost (lowest first)
    calculatedQuotes.sort((a, b) => a.calculatedRate - b.calculatedRate);

    // Assign rankings
    calculatedQuotes.forEach((quote, index) => {
      quote.rank = index + 1;
    });

    this.logger.log(`Generated ${calculatedQuotes.length} rate quotes for shipment ${shipment.referenceNumber}`);

    return calculatedQuotes;
  }

  /**
   * Find eligible carriers for the shipment lane
   */
  private async findEligibleCarriers(request: RatingRequest): Promise<Partial<RateQuote>[]> {
    // Find active carriers that service the lane
    const queryBuilder = this.carriersRepository
      .createQueryBuilder('carrier')
      .leftJoinAndSelect('carrier.lanes', 'lane')
      .where('carrier.status = :status', { status: CarrierStatus.ACTIVE })
      .andWhere('carrier.isActive = :isActive', { isActive: true })
      .andWhere('lane.originZone = :originZone', { originZone: request.originState })
      .andWhere('lane.destinationZone = :destinationZone', { destinationZone: request.destinationState })
      .andWhere('lane.isActive = :laneActive', { laneActive: true })
      .andWhere('(lane.effectiveStartDate IS NULL OR lane.effectiveStartDate <= :currentDate)', {
        currentDate: new Date(),
      })
      .andWhere('(lane.effectiveEndDate IS NULL OR lane.effectiveEndDate >= :currentDate)', {
        currentDate: new Date(),
      });

    const carriers = await queryBuilder.getMany();

    const eligibleQuotes: Partial<RateQuote>[] = [];

    for (const carrier of carriers) {
      // Find the best lane for this carrier
      const eligibleLane = carrier.lanes.find(lane => 
        this.isLaneEligible(lane, request)
      );

      if (eligibleLane) {
        eligibleQuotes.push({
          carrier,
          carrierId: carrier.id,
          carrierName: carrier.name,
          scac: carrier.scac,
          ratePerMile: eligibleLane.ratePerMile || 0,
          flatRate: eligibleLane.flatRate || 0,
          minCharge: eligibleLane.minCharge || 0,
          maxCharge: eligibleLane.maxCharge,
          transitDays: {
            min: eligibleLane.transitDaysMin || 1,
            max: eligibleLane.transitDaysMax || 7,
          },
          safetyRating: carrier.safetyRating,
          overallRating: carrier.rating || 0,
        });
      }
    }

    return eligibleQuotes;
  }

  /**
   * Check if a lane is eligible for the shipment
   */
  private isLaneEligible(lane: CarrierLaneEntity, request: RatingRequest): boolean {
    // Check equipment compatibility
    if (lane.equipmentTypes && lane.equipmentTypes.length > 0) {
      if (!lane.equipmentTypes.includes(request.equipmentType)) {
        return false;
      }
    }

    // Check mileage constraints
    const distance = request.miles || 0;
    if (lane.minimumMiles && distance < lane.minimumMiles) {
      return false;
    }

    if (lane.maximumMiles && distance > lane.maximumMiles) {
      return false;
    }

    return true;
  }

  /**
   * Calculate the final rate for a carrier quote
   */
  private calculateRate(quote: Partial<RateQuote>, request: RatingRequest): RateQuote {
    const distance = request.miles || 0;
    const weight = request.weight || 0;

    // Calculate base rate
    let baseRate = 0;
    if (quote.flatRate && quote.flatRate > 0) {
      baseRate = quote.flatRate;
    } else if (quote.ratePerMile && quote.ratePerMile > 0) {
      baseRate = quote.ratePerMile * distance;
    }

    // Apply fuel surcharge (simplified calculation)
    const fuelSurcharge = quote.fuelSurchargePercentage 
      ? baseRate * (quote.fuelSurchargePercentage / 100)
      : baseRate * 0.15; // Default 15% fuel surcharge

    // Calculate total
    let total = baseRate + fuelSurcharge;

    // Apply minimum charge
    if (quote.minCharge && total < quote.minCharge) {
      total = quote.minCharge;
    }

    // Apply maximum charge
    if (quote.maxCharge && total > quote.maxCharge) {
      total = quote.maxCharge;
    }

    // Check equipment and service area compatibility
    const equipmentMatch = this.checkEquipmentCompatibility(quote.carrier, request.equipmentType);
    const serviceAreaMatch = this.checkServiceArea(quote.carrier, request.originState, request.destinationState);

    const completeQuote: RateQuote = {
      ...quote,
      calculatedRate: total,
      equipmentMatch,
      serviceAreaMatch,
      breakdown: {
        baseRate,
        distanceMiles: distance,
        fuelSurcharge,
        accessorialCharges: 0, // Could be calculated based on special requirements
        total,
      },
    } as RateQuote;

    return completeQuote;
  }

  /**
   * Check if carrier has the required equipment
   */
  private checkEquipmentCompatibility(carrier: CarrierEntity, equipmentType: EquipmentType): boolean {
    if (!carrier.equipmentTypes || carrier.equipmentTypes.length === 0) {
      return true; // No restrictions
    }

    return carrier.equipmentTypes.includes(equipmentType);
  }

  /**
   * Check if carrier services the required areas
   */
  private checkServiceArea(carrier: CarrierEntity, originState: string, destinationState: string): boolean {
    if (!carrier.serviceAreas || carrier.serviceAreas.length === 0) {
      return true; // No restrictions
    }

    // Check if carrier services both origin and destination states
    return carrier.serviceAreas.includes(originState) && carrier.serviceAreas.includes(destinationState);
  }

  /**
   * Calculate distance between two cities (mock implementation)
   * In production, this would use a real distance calculation service
   */
  private calculateDistance(originCity: string, originState: string, destinationCity: string, destinationState: string): number {
    // Mock distance calculation - in production use actual mapping service
    const stateDistances: { [key: string]: number } = {
      'IL-TX': 1200,
      'IL-NY': 800,
      'IL-CA': 2100,
      'IL-FL': 1100,
      'TX-NY': 1600,
      'TX-CA': 1500,
      'TX-FL': 1000,
      'NY-CA': 2900,
      'NY-FL': 1100,
      'CA-FL': 2700,
    };

    const key = `${originState}-${destinationState}`;
    const reverseKey = `${destinationState}-${originState}`;
    
    return stateDistances[key] || stateDistances[reverseKey] || 1000; // Default 1000 miles
  }

  /**
   * Extract state code from postal code
   */
  private extractState(postalCode: string): string {
    // Mock state extraction - in production use proper ZIP code lookup
    const stateMap: { [key: string]: string } = {
      '60601': 'IL',
      '90210': 'CA',
      '10001': 'NY',
      '33101': 'FL',
      '75201': 'TX',
    };

    // Extract first 5 digits if ZIP+4
    const zip5 = postalCode.substring(0, 5);
    return stateMap[zip5] || 'XX'; // Default to unknown
  }

  /**
   * Get carrier lanes for management
   */
  async getCarrierLanes(carrierId: string, user: User): Promise<CarrierLaneEntity[]> {
    return this.carrierLanesRepository.find({
      where: { carrierId, isActive: true },
      relations: ['carrier'],
      order: { originZone: 'ASC', destinationZone: 'ASC' },
    });
  }

  /**
   * Add or update carrier lane
   */
  async upsertLane(laneData: Partial<CarrierLaneEntity>, user: User): Promise<CarrierLaneEntity> {
    const existingLane = await this.carrierLanesRepository.findOne({
      where: {
        carrierId: laneData.carrierId,
        originZone: laneData.originZone,
        destinationZone: laneData.destinationZone,
      },
    });

    if (existingLane) {
      // Update existing lane
      const updatedLane = this.carrierLanesRepository.merge(existingLane, laneData);
      return this.carrierLanesRepository.save(updatedLane);
    } else {
      // Create new lane
      const lane = this.carrierLanesRepository.create(laneData);
      return this.carrierLanesRepository.save(lane);
    }
  }

  /**
   * Get carrier performance metrics
   */
  async getCarrierPerformance(carrierId: string): Promise<any> {
    // This would typically query shipment/tender history
    // For now, return mock data
    return {
      totalTenders: 150,
      acceptedTenders: 120,
      rejectionRate: 20,
      averageResponseTime: 45, // minutes
      onTimeDeliveryRate: 95.5,
      averageTransitTime: 3.2, // days
    };
  }
}