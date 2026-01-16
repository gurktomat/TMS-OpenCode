import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { 
  CarrierEntity, 
  CarrierLaneEntity,
  CarrierStatus,
  SafetyRating 
} from './entities';
import { CreateCarrierDto, UpdateCarrierDto, QueryCarriersDto } from './dto/carrier.dto';
import { User } from '@tms-platform/types';

@Injectable()
export class CarriersService {
  private readonly logger = new Logger(CarriersService.name);

  constructor(
    @InjectRepository(CarrierEntity)
    private readonly carriersRepository: Repository<CarrierEntity>,
  ) {}

  /**
   * Create a new carrier
   */
  async create(createCarrierDto: CreateCarrierDto, user: User): Promise<CarrierEntity> {
    try {
      const carrier = this.carriersRepository.create({
        ...createCarrierDto,
        status: CarrierStatus.PENDING,
        rating: 0,
        totalShipments: 0,
        successfulShipments: 0,
        onTimePercentage: 0,
      });

      const savedCarrier = await this.carriersRepository.save(carrier);

      this.logger.log(`Carrier created: ${savedCarrier.name} by ${user.email}`);
      
      return savedCarrier;
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new BadRequestException('Carrier with this SCAC or MC number already exists');
      }
      this.logger.error(`Failed to create carrier: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find all carriers with filters and pagination
   */
  async findAll(query: QueryCarriersDto, user: User): Promise<{ carriers: CarrierEntity[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, scac, status, safetyRating, serviceArea, search } = query;

    // Build query
    const queryBuilder = this.carriersRepository
      .createQueryBuilder('carrier')
      .leftJoinAndSelect('carrier.lanes', 'lanes')
      .loadRelationCountAndMap('lanes', 'laneCount');

    // Apply filters
    if (scac) {
      queryBuilder.andWhere('carrier.scac = :scac', { scac });
    }

    if (status) {
      queryBuilder.andWhere('carrier.status = :status', { status });
    }

    if (safetyRating) {
      queryBuilder.andWhere('carrier.safetyRating = :safetyRating', { safetyRating });
    }

    if (serviceArea) {
      queryBuilder.andWhere('carrier.serviceAreas @> :serviceArea', { serviceArea: [serviceArea] });
    }

    if (search) {
      queryBuilder.andWhere(
        '(carrier.name ILIKE :search OR carrier.scac ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Apply sorting
    queryBuilder.orderBy('carrier.name', 'ASC');

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const carriers = await queryBuilder.getMany();

    return {
      carriers,
      total,
      page,
      limit,
    };
  }

  /**
   * Find carrier by ID
   */
  async findById(id: string, user: User): Promise<CarrierEntity> {
    const carrier = await this.carriersRepository.findOne({
      where: { id },
      relations: ['lanes'],
    });

    if (!carrier) {
      throw new NotFoundException('Carrier not found');
    }

    return carrier;
  }

  /**
   * Update carrier
   */
  async update(id: string, updateCarrierDto: UpdateCarrierDto, user: User): Promise<CarrierEntity> {
    try {
      const existingCarrier = await this.findById(id, user);

      const updatedCarrier = this.carriersRepository.merge(existingCarrier, updateCarrierDto);
      const savedCarrier = await this.carriersRepository.save(updatedCarrier);

      this.logger.log(`Carrier updated: ${savedCarrier.name} by ${user.email}`);
      
      return savedCarrier;
    } catch (error) {
      this.logger.error(`Failed to update carrier ${id}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find carrier by SCAC code
   */
  async findByScac(scac: string): Promise<CarrierEntity | null> {
    return this.carriersRepository.findOne({
      where: { scac: scac.toUpperCase() },
    });
  }

  /**
   * Find active carriers for a specific lane
   */
  async findCarriersForLane(originState: string, destinationState: string): Promise<CarrierEntity[]> {
    return this.carriersRepository
      .createQueryBuilder('carrier')
      .leftJoinAndSelect('carrier.lanes', 'lane')
      .where('carrier.status = :status', { status: CarrierStatus.ACTIVE })
      .andWhere('carrier.isActive = :isActive', { isActive: true })
      .andWhere('lane.originZone = :originZone', { originZone: originState })
      .andWhere('lane.destinationZone = :destinationZone', { destinationZone: destinationState })
      .andWhere('lane.isActive = :laneActive', { laneActive: true })
      .orderBy('carrier.rating', 'DESC')
      .getMany();
  }

  /**
   * Update carrier performance metrics
   */
  async updatePerformance(
    carrierId: string, 
    metrics: {
      totalShipments?: number;
      successfulShipments?: number;
      onTimePercentage?: number;
      rating?: number;
    }
  ): Promise<void> {
    await this.carriersRepository.update(carrierId, metrics);
    this.logger.log(`Updated performance metrics for carrier: ${carrierId}`);
  }

  /**
   * Activate/deactivate carrier
   */
  async updateStatus(id: string, status: CarrierStatus, user: User): Promise<void> {
    await this.carriersRepository.update(id, { 
      status,
      updatedAt: new Date(),
    });
    
    this.logger.log(`Carrier ${id} status updated to ${status} by ${user.email}`);
  }

  /**
   * Get carrier statistics
   */
  async getStats(user: User): Promise<any> {
    const totalCarriers = await this.carriersRepository.count({
      where: { isActive: true },
    });

    const activeCarriers = await this.carriersRepository.count({
      where: { status: CarrierStatus.ACTIVE, isActive: true },
    });

    const byStatus = await this.carriersRepository
      .createQueryBuilder('carrier')
      .select('carrier.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('carrier.isActive = :isActive', { isActive: true })
      .groupBy('carrier.status')
      .getRawMany();

    const bySafetyRating = await this.carriersRepository
      .createQueryBuilder('carrier')
      .select('carrier.safetyRating', 'safetyRating')
      .addSelect('COUNT(*)', 'count')
      .where('carrier.isActive = :isActive', { isActive: true })
      .groupBy('carrier.safetyRating')
      .getRawMany();

    return {
      totalCarriers,
      activeCarriers,
      byStatus,
      bySafetyRating,
    };
  }

  /**
   * Search carriers by name or SCAC
   */
  async search(query: string, limit: number = 10): Promise<CarrierEntity[]> {
    return this.carriersRepository.find({
      where: [
        { name: Like(`%${query}%`) },
        { scac: Like(`%${query}%`) },
      ],
      where: { status: CarrierStatus.ACTIVE, isActive: true },
      take: limit,
      order: { rating: 'DESC' },
    });
  }
}