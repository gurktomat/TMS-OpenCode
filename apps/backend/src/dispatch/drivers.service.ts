import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverEntity, DriverStatus, LicenseType } from './entities/driver.entity';
import { DispatchAssignmentEntity } from './entities/dispatch-assignment.entity';
import { CreateDriverDto, UpdateDriverDto, QueryDriversDto } from './dto/driver.dto';
import { User } from '@tms-platform/types';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    @InjectRepository(DriverEntity)
    private readonly driversRepository: Repository<DriverEntity>,
  ) {}

  /**
   * Create a new driver
   */
  async create(createDriverDto: CreateDriverDto, user: User): Promise<DriverEntity> {
    try {
      const driver = this.driversRepository.create({
        ...createDriverDto,
        tenantId: user.companyId,
        status: DriverStatus.ACTIVE,
        completedLoads: 0,
        totalMiles: 0,
        onTimePercentage: 0,
        safetyScore: 0,
      });

      const savedDriver = await this.driversRepository.save(driver);

      this.logger.log(`Driver created: ${savedDriver.firstName} ${savedDriver.lastName} by ${user.email}`);
      
      return savedDriver;
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new BadRequestException('Driver with this phone number or CDL already exists');
      }
      this.logger.error(`Failed to create driver: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Find all drivers with filters and pagination
   */
  async findAll(query: QueryDriversDto, user: User): Promise<{ drivers: DriverEntity[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, status, carrierId, search, licenseType, equipment, sortBy = 'lastName', sortOrder = 'ASC' } = query;

    // Build query
    const queryBuilder = this.driversRepository
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.carrier', 'carrier')
      .loadRelationCountAndMap('assignments', 'assignmentCount');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('driver.status = :status', { status });
    }

    if (carrierId) {
      queryBuilder.andWhere('driver.carrierId = :carrierId', { carrierId });
    }

    if (licenseType) {
      queryBuilder.andWhere('driver.licenseType = :licenseType', { licenseType });
    }

    if (equipment) {
      queryBuilder.andWhere('driver.equipmentExperience @> :equipment', { equipment: [equipment] });
    }

    if (search) {
      queryBuilder.andWhere(
        '(driver.firstName ILIKE :search OR driver.lastName ILIKE :search OR driver.phoneNumber ILIKE :search OR driver.cdlNumber ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Apply sorting
    const validSortFields = ['firstName', 'lastName', 'phoneNumber', 'cdlNumber', 'status', 'safetyScore'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'lastName';
    
    queryBuilder.orderBy(`driver.${sortField}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const drivers = await queryBuilder.getMany();

    return {
      drivers,
      total,
      page,
      limit,
    };
  }

  /**
   * Find driver by ID
   */
  async findById(id: string, user: User): Promise<DriverEntity> {
    const driver = await this.driversRepository.findOne({
      where: { id },
      relations: ['carrier', 'assignments'],
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  /**
   * Update driver
   */
  async update(id: string, updateDriverDto: UpdateDriverDto, user: User): Promise<DriverEntity> {
    try {
      const existingDriver = await this.findById(id, user);

      const updatedDriver = this.driversRepository.merge(existingDriver, updateDriverDto);
      const savedDriver = await this.driversRepository.save(updatedDriver);

      this.logger.log(`Driver updated: ${savedDriver.firstName} ${savedDriver.lastName} by ${user.email}`);
      
      return savedDriver;
    } catch (error) {
      this.logger.error(`Failed to update driver ${id}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update driver status
   */
  async updateStatus(id: string, status: DriverStatus, user: User): Promise<DriverEntity> {
    try {
      await this.driversRepository.update(id, { 
        status,
        updatedAt: new Date(),
      });
      
      const updatedDriver = await this.findById(id, user);
      
      this.logger.log(`Driver ${id} status updated to ${status} by ${user.email}`);
      
      return updatedDriver;
    } catch (error) {
      this.logger.error(`Failed to update driver status ${id}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update driver location
   */
  async updateLocation(id: string, locationData: { latitude: number; longitude: number }, user: User): Promise<DriverEntity> {
    try {
      await this.driversRepository.update(id, { 
        lastLocationUpdate: new Date(),
      });
      
      const updatedDriver = await this.findById(id, user);
      
      this.logger.log(`Driver ${id} location updated by ${user.email}`);
      
      return updatedDriver;
    } catch (error) {
      this.logger.error(`Failed to update driver location ${id}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Update driver performance metrics
   */
  async updatePerformance(
    id: string, 
    metrics: {
      completedLoads?: number;
      totalMiles?: number;
      onTimePercentage?: number;
      safetyScore?: number;
      baseRate?: number;
    }
  ): Promise<void> {
    try {
      await this.driversRepository.update(id, metrics);
      this.logger.log(`Updated performance metrics for driver: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to update driver performance ${id}: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get driver availability
   */
  async getAvailability(id: string, user: User): Promise<any> {
    const driver = await this.findById(id, user);
    
    const isAvailable = this.isDriverAvailable(driver);
    const currentAssignment = await this.getCurrentAssignment(id);
    
    return {
      driverId: driver.id,
      driverName: `${driver.firstName} ${driver.lastName}`,
      phoneNumber: driver.phoneNumber,
      status: driver.status,
      isAvailable,
      lastDispatchDate: driver.lastDispatchDate,
      currentAssignment,
      completedLoads: driver.completedLoads,
      onTimePercentage: driver.onTimePercentage,
      safetyScore: driver.safetyScore,
      baseRate: driver.baseRate,
      carrier: driver.carrier,
    };
  }

  /**
   * Get current assignment for driver
   */
  async getCurrentAssignment(driverId: string): Promise<DispatchAssignmentEntity | null> {
    return await this.driversRepository
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.assignments', 'assignment')
      .leftJoinAndSelect('assignment.shipment', 'shipment')
      .where('driver.id = :driverId', { driverId })
      .andWhere('assignment.status IN (:...statuses)', { 
        statuses: [DispatchStatus.DISPATCHED, DispatchStatus.CONFIRMED] 
      })
      .orderBy('assignment.createdAt', 'DESC')
      .getOne()
      .then(result => result?.assignments || null);
  }

  /**
   * Get driver statistics
   */
  async getStats(user: User): Promise<any> {
    const totalDrivers = await this.driversRepository.count({
      where: { isActive: true },
    });

    const activeDrivers = await this.driversRepository.count({
      where: { status: DriverStatus.ACTIVE, isActive: true },
    });

    const onLoadDrivers = await this.driversRepository.count({
      where: { status: DriverStatus.ON_LOAD, isActive: true },
    });

    const byStatus = await this.driversRepository
      .createQueryBuilder('driver')
      .select('driver.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('driver.isActive = :isActive', { isActive: true })
      .groupBy('driver.status')
      .getRawMany();

    const byLicenseType = await this.driversRepository
      .createQueryBuilder('driver')
      .select('driver.licenseType', 'licenseType')
      .addSelect('COUNT(*)', 'count')
      .where('driver.isActive = :isActive', { isActive: true })
      .groupBy('driver.licenseType')
      .getRawMany();

    return {
      totalDrivers,
      activeDrivers,
      onLoadDrivers,
      byStatus,
      byLicenseType,
      averageSafetyScore: await this.getAverageSafetyScore(),
      averageExperience: await this.getAverageExperience(),
    };
  }

  /**
   * Get dispatch assignments for all drivers (for dispatcher view)
   */
  async getAssignments(user: User): Promise<DispatchAssignmentEntity[]> {
    return await this.driversRepository
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.assignments', 'assignment')
      .leftJoinAndSelect('assignment.shipment', 'shipment')
      .leftJoinAndSelect('assignment.driver', 'assignmentDriver')
      .where('assignment.status IN (:...statuses)', { 
        statuses: [DispatchStatus.DISPATCHED, DispatchStatus.CONFIRMED] 
      })
      .orderBy('assignment.createdAt', 'DESC')
      .getMany()
      .then(results => results.map(r => r.assignment));
  }

  /**
   * Find drivers for a carrier
   */
  async findByCarrier(carrierId: string, user: User): Promise<DriverEntity[]> {
    return this.driversRepository.find({
      where: { carrierId },
      relations: ['carrier'],
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  /**
   * Search drivers by name or phone
   */
  async search(query: string, limit: number = 10): Promise<DriverEntity[]> {
    return this.driversRepository.find({
      where: [
        { firstName: Like(`%${query}%`) },
        { lastName: Like(`%${query}%`) },
        { phoneNumber: Like(`%${query}%`) },
        { cdlNumber: Like(`%${query}%`) },
      ],
      where: { isActive: true },
      take: limit,
      order: { lastName: 'ASC', firstName: 'ASC' },
    });
  }

  /**
   * Check if driver is available for dispatch
   */
  private isDriverAvailable(driver: DriverEntity): boolean {
    // Check driver status
    if (driver.status !== DriverStatus.ACTIVE && driver.status !== DriverStatus.OFF_DUTY) {
      return false;
    }

    // Check CDL expiration
    if (driver.licenseExpirationDate && driver.licenseExpirationDate < new Date()) {
      return false;
    }

    // Check medical certificate if applicable
    if (driver.medicalCertificate?.expirationDate && 
        new Date(driver.medicalCertificate.expirationDate) < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Get average safety score across all drivers
   */
  private async getAverageSafetyScore(): Promise<number> {
    const result = await this.driversRepository
      .createQueryBuilder('driver')
      .select('AVG(driver.safetyScore)', 'avgSafetyScore')
      .where('driver.isActive = :isActive AND driver.safetyScore IS NOT NULL', { isActive: true })
      .getRawOne();

    return result ? parseFloat(result.avgSafetyScore) : 0;
  }

  /**
   * Get average years of experience across all drivers
   */
  private async getAverageExperience(): Promise<number> {
    const result = await this.driversRepository
      .createQueryBuilder('driver')
      .select('AVG(driver.experienceYears)', 'avgExperience')
      .where('driver.isActive = :isActive AND driver.experienceYears IS NOT NULL', { isActive: true })
      .getRawOne();

    return result ? parseFloat(result.avgExperience) : 0;
  }

  /**
   * Deactivate driver (soft delete)
   */
  async deactivate(id: string, user: User): Promise<void> {
    await this.driversRepository.update(id, {
      isActive: false,
      status: DriverStatus.INACTIVE,
      updatedAt: new Date(),
    });
    
    this.logger.log(`Driver ${id} deactivated by ${user.email}`);
  }

  /**
   * Reactivate driver
   */
  async reactivate(id: string, user: User): Promise<DriverEntity> {
    await this.driversRepository.update(id, {
      isActive: true,
      status: DriverStatus.ACTIVE,
      updatedAt: new Date(),
    });
    
    const reactivatedDriver = await this.findById(id, user);
    
    this.logger.log(`Driver ${id} reactivated by ${user.email}`);
    
    return reactivatedDriver;
  }
}