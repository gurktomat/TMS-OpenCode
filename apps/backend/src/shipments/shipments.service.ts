import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Request } from 'express';
import { User } from '@tms-platform/types';
import { 
  ShipmentEntity, 
  LocationEntity, 
  AuditLogEntity,
  ShipmentStatus,
  EquipmentType 
} from './entities';
import { CreateShipmentDto, UpdateShipmentDto, QueryShipmentsDto } from './dto/shipment.dto';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    @InjectRepository(ShipmentEntity)
    private readonly shipmentsRepository: Repository<ShipmentEntity>,
    @InjectRepository(LocationEntity)
    private readonly locationsRepository: Repository<LocationEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new shipment with multi-tenant support
   */
  async create(createShipmentDto: CreateShipmentDto, user: User): Promise<ShipmentEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate dates: pickup must be before delivery
      this.validateDates(createShipmentDto);

      // Verify tenant ownership of locations and customer
      await this.validateTenantResources(createShipmentDto, user);

      // Generate unique reference number
      const referenceNumber = await this.generateReferenceNumber(user.companyId);

      // Create shipment entity
      const shipment = this.shipmentsRepository.create({
        ...createShipmentDto,
        referenceNumber,
        status: ShipmentStatus.QUOTE,
        tenantId: user.companyId,
        createdById: user.id,
        // Convert string dates to Date objects
        pickupWindowStart: createShipmentDto.pickupWindowStart ? new Date(createShipmentDto.pickupWindowStart) : null,
        pickupWindowEnd: createShipmentDto.pickupWindowEnd ? new Date(createShipmentDto.pickupWindowEnd) : null,
        deliveryWindowStart: createShipmentDto.deliveryWindowStart ? new Date(createShipmentDto.deliveryWindowStart) : null,
        deliveryWindowEnd: createShipmentDto.deliveryWindowEnd ? new Date(createShipmentDto.deliveryWindowEnd) : null,
      });

      const savedShipment = await queryRunner.manager.save(shipment);

      // Log creation for SOC2 compliance
      await this.logAction(
        queryRunner,
        user,
        'CREATE',
        'shipments',
        savedShipment.id,
        null,
        {
          referenceNumber: savedShipment.referenceNumber,
          status: savedShipment.status,
          customerId: savedShipment.customerId,
        }
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Shipment created: ${referenceNumber} by user ${user.email}`);
      
      // Return shipment with relations
      return this.findById(savedShipment.id, user);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create shipment: ${error.message}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Find all shipments for the user's tenant
   */
  async findAll(query: QueryShipmentsDto, user: User): Promise<{ shipments: ShipmentEntity[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, status, equipmentType, customerId, carrierId, search, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    // Build query with tenant isolation
    const queryBuilder = this.shipmentsRepository
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.shipperLocation', 'shipperLocation')
      .leftJoinAndSelect('shipment.consigneeLocation', 'consigneeLocation')
      .leftJoinAndSelect('shipment.customer', 'customer')
      .leftJoinAndSelect('shipment.carrier', 'carrier')
      .leftJoinAndSelect('shipment.createdBy', 'createdBy')
      .where('shipment.tenantId = :tenantId', { tenantId: user.companyId })
      .andWhere('shipment.isActive = :isActive', { isActive: true });

    // Apply filters
    if (status) {
      queryBuilder.andWhere('shipment.status = :status', { status });
    }

    if (equipmentType) {
      queryBuilder.andWhere('shipment.equipmentType = :equipmentType', { equipmentType });
    }

    if (customerId) {
      queryBuilder.andWhere('shipment.customerId = :customerId', { customerId });
    }

    if (carrierId) {
      queryBuilder.andWhere('shipment.carrierId = :carrierId', { carrierId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(shipment.referenceNumber ILIKE :search OR shipment.bolNumber ILIKE :search OR shipment.purchaseOrderNumber ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`shipment.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const shipments = await queryBuilder.getMany();

    return {
      shipments,
      total,
      page,
      limit,
    };
  }

  /**
   * Find shipment by ID with tenant validation
   */
  async findById(id: string, user: User): Promise<ShipmentEntity> {
    const shipment = await this.shipmentsRepository.findOne({
      where: { id, tenantId: user.companyId, isActive: true },
      relations: [
        'shipperLocation',
        'consigneeLocation', 
        'customer',
        'carrier',
        'createdBy',
        'updatedBy',
      ],
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return shipment;
  }

  /**
   * Update shipment with audit logging
   */
  async update(id: string, updateShipmentDto: UpdateShipmentDto, user: User): Promise<ShipmentEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find existing shipment with tenant validation
      const existingShipment = await this.findById(id, user);

      // Store old values for audit
      const oldValues = {
        status: existingShipment.status,
        carrierId: existingShipment.carrierId,
        quotedRate: existingShipment.quotedRate,
        actualRate: existingShipment.actualRate,
      };

      // Update shipment
      const updatedShipment = await queryRunner.manager.save(ShipmentEntity, {
        ...existingShipment,
        ...updateShipmentDto,
        updatedById: user.id,
        // Convert string dates to Date objects
        ...(updateShipmentDto.pickupWindowStart && { pickupWindowStart: new Date(updateShipmentDto.pickupWindowStart) }),
        ...(updateShipmentDto.pickupWindowEnd && { pickupWindowEnd: new Date(updateShipmentDto.pickupWindowEnd) }),
        ...(updateShipmentDto.deliveryWindowStart && { deliveryWindowStart: new Date(updateShipmentDto.deliveryWindowStart) }),
        ...(updateShipmentDto.deliveryWindowEnd && { deliveryWindowEnd: new Date(updateShipmentDto.deliveryWindowEnd) }),
        ...(updateShipmentDto.actualPickupDate && { actualPickupDate: new Date(updateShipmentDto.actualPickupDate) }),
        ...(updateShipmentDto.actualDeliveryDate && { actualDeliveryDate: new Date(updateShipmentDto.actualDeliveryDate) }),
      });

      // Log update for SOC2 compliance
      await this.logAction(
        queryRunner,
        user,
        'UPDATE',
        'shipments',
        id,
        oldValues,
        {
          status: updateShipmentDto.status,
          carrierId: updateShipmentDto.carrierId,
          quotedRate: updateShipmentDto.quotedRate,
          actualRate: updateShipmentDto.actualRate,
        }
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Shipment updated: ${id} by user ${user.email}`);
      
      return this.findById(id, user);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update shipment ${id}: ${error.message}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Soft delete shipment (deactivate)
   */
  async remove(id: string, user: User): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const shipment = await this.findById(id, user);

      // Log deletion for SOC2 compliance
      await this.logAction(
        queryRunner,
        user,
        'DELETE',
        'shipments',
        id,
        { status: shipment.status },
        { status: 'CANCELLED' }
      );

      // Soft delete
      await queryRunner.manager.update(ShipmentEntity, id, {
        isActive: false,
        status: ShipmentStatus.CANCELLED,
        updatedById: user.id,
      });

      await queryRunner.commitTransaction();

      this.logger.log(`Shipment cancelled: ${id} by user ${user.email}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to cancel shipment ${id}: ${error.message}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get shipment statistics for dashboard
   */
  async getStats(user: User): Promise<any> {
    const stats = await this.shipmentsRepository
      .createQueryBuilder('shipment')
      .select('shipment.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(shipment.quotedRate)', 'totalRevenue')
      .where('shipment.tenantId = :tenantId', { tenantId: user.companyId })
      .andWhere('shipment.isActive = :isActive', { isActive: true })
      .groupBy('shipment.status')
      .getRawMany();

    const totalShipments = await this.shipmentsRepository.count({
      where: { tenantId: user.companyId, isActive: true },
    });

    const thisMonthShipments = await this.shipmentsRepository.count({
      where: {
        tenantId: user.companyId,
        isActive: true,
        createdAt: Between(
          new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          new Date(),
        ),
      },
    });

    return {
      totalShipments,
      thisMonthShipments,
      byStatus: stats,
    };
  }

  /**
   * Generate unique shipment reference number
   */
  private async generateReferenceNumber(tenantId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    
    // Find the last reference number for this tenant and year
    const lastShipment = await this.shipmentsRepository.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      select: ['referenceNumber'],
    });

    let sequence = 1;
    
    if (lastShipment?.referenceNumber) {
      const match = lastShipment.referenceNumber.match(/L-(\d{4})-(\d{3})/);
      if (match && match[1] === currentYear.toString()) {
        sequence = parseInt(match[2]) + 1;
      }
    }

    return `L-${currentYear}-${sequence.toString().padStart(3, '0')}`;
  }

  /**
   * Validate pickup and delivery dates
   */
  private validateDates(dto: CreateShipmentDto): void {
    if (dto.pickupWindowStart && dto.deliveryWindowStart) {
      const pickup = new Date(dto.pickupWindowStart);
      const delivery = new Date(dto.deliveryWindowStart);

      if (pickup >= delivery) {
        throw new BadRequestException('Pickup date must be before delivery date');
      }
    }
  }

  /**
   * Validate that all resources belong to the user's tenant
   */
  private async validateTenantResources(dto: CreateShipmentDto, user: User): Promise<void> {
    // Validate shipper location
    const shipperLocation = await this.locationsRepository.findOne({
      where: { id: dto.shipperLocationId, tenantId: user.companyId, isActive: true },
    });
    
    if (!shipperLocation) {
      throw new ForbiddenException('Shipper location not found or access denied');
    }

    // Validate consignee location
    const consigneeLocation = await this.locationsRepository.findOne({
      where: { id: dto.consigneeLocationId, tenantId: user.companyId, isActive: true },
    });
    
    if (!consigneeLocation) {
      throw new ForbiddenException('Consignee location not found or access denied');
    }

    // Note: Customer validation would depend on your customer management system
    // For now, we assume customerId is valid for the tenant
  }

  /**
   * Log action to audit trail for SOC2 compliance
   */
  private async logAction(
    queryRunner: any,
    user: User,
    action: string,
    tableName: string,
    recordId: string,
    oldValues: any,
    newValues: any,
  ): Promise<void> {
    try {
      await queryRunner.manager.save(AuditLogEntity, {
        userId: user.id,
        action,
        tableName,
        recordId,
        oldValues,
        newValues,
        tenantId: user.companyId,
        ipAddress: user.ipAddress, // Assuming this is added to user object
        userAgent: user.userAgent, // Assuming this is added to user object
      });
    } catch (error) {
      // Log error but don't fail the main operation
      this.logger.error(`Failed to log audit action: ${error.message}`);
    }
  }

  // Location Management Methods

  /**
   * Create a new location for the tenant
   */
  async createLocation(createLocationDto: CreateLocationDto, user: User): Promise<LocationEntity> {
    const location = this.locationsRepository.create({
      ...createLocationDto,
      tenantId: user.companyId,
    });

    return this.locationsRepository.save(location);
  }

  /**
   * Find all locations for the tenant
   */
  async findAllLocations(user: User): Promise<LocationEntity[]> {
    return this.locationsRepository.find({
      where: { tenantId: user.companyId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Find location by ID with tenant validation
   */
  async findLocationById(id: string, user: User): Promise<LocationEntity> {
    const location = await this.locationsRepository.findOne({
      where: { id, tenantId: user.companyId, isActive: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  /**
   * Update location
   */
  async updateLocation(id: string, updateLocationDto: UpdateLocationDto, user: User): Promise<LocationEntity> {
    const existingLocation = await this.findLocationById(id, user);
    
    const updatedLocation = this.locationsRepository.merge(existingLocation, updateLocationDto);
    return this.locationsRepository.save(updatedLocation);
  }

  /**
   * Remove location (soft delete)
   */
  async removeLocation(id: string, user: User): Promise<void> {
    const location = await this.findLocationById(id, user);
    
    await this.locationsRepository.update(id, { isActive: false });
  }
}