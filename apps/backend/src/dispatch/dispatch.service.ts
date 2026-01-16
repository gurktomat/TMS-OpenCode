import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { 
  DriverEntity, 
  DispatchAssignmentEntity, 
  DriverStatus,
  DispatchStatus 
} from './entities';
import { ShipmentEntity, ShipmentStatus } from '../../shipments/entities/shipment.entity';
import { LoadTenderEntity, TenderStatus } from '../../carriers/entities/load-tender.entity';
import { ISmsProvider, SmsResult } from '../interfaces/sms-provider.interface';
import { User } from '@tms-platform/types';

export interface DispatchRequest {
  shipmentId: string;
  driverId: string;
  message?: string;
  scheduledFor?: Date;
  dispatchType?: 'PRIMARY' | 'BACKUP' | 'EMERGENCY';
}

export interface DispatchResponse {
  success: boolean;
  assignment: DispatchAssignmentEntity;
  message: string;
  smsResult?: SmsResult;
  nextActions?: string[];
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);

  constructor(
    @InjectRepository(DriverEntity)
    private readonly driversRepository: Repository<DriverEntity>,
    @InjectRepository(DispatchAssignmentEntity)
    private readonly dispatchAssignmentsRepository: Repository<DispatchAssignmentEntity>,
    @InjectRepository(ShipmentEntity)
    private readonly shipmentsRepository: Repository<ShipmentEntity>,
    @InjectRepository(LoadTenderEntity)
    private readonly loadTendersRepository: Repository<LoadTenderEntity>,
    private readonly dataSource: DataSource,
    // Provider will be injected based on environment
    // @Inject('SMS_PROVIDER')
    // private readonly smsProvider: ISmsProvider,
  ) {
    // For now, we'll import MockSmsProvider directly
    // In production, use dependency injection with provider switching
  }

  /**
   * Assign driver to shipment (The "Magic" dispatch method)
   */
  async assignDriver(dispatchRequest: DispatchRequest, user: User): Promise<DispatchResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { shipmentId, driverId, message, scheduledFor, dispatchType = 'PRIMARY' } = dispatchRequest;

      // Validate shipment and driver
      const shipment = await this.validateShipmentForDispatch(shipmentId, user);
      const driver = await this.validateDriverForAssignment(driverId, user);

      // Check if driver is available
      if (!this.isDriverAvailable(driver)) {
        throw new BadRequestException(`Driver ${driver.firstName} ${driver.lastName} is not available for dispatch`);
      }

      // Check for existing dispatch
      const existingAssignment = await this.dispatchAssignmentsRepository.findOne({
        where: {
          shipmentId,
          driverId,
          status: [DispatchStatus.DISPATCHED, DispatchStatus.CONFIRMED],
        },
      });

      if (existingAssignment) {
        throw new BadRequestException('Driver is already assigned to this shipment');
      }

      // Create dispatch assignment
      const assignment = this.dispatchAssignmentsRepository.create({
        shipmentId,
        driverId,
        tenantId: user.companyId,
        status: DispatchStatus.DISPATCHED,
        dispatchType,
        sentAt: new Date(),
        dispatchMessage: this.buildDispatchMessage(shipment, driver),
        dispatchDetails: {
          scheduledFor,
          dispatcherName: `${user.firstName} ${user.lastName}`,
          dispatcherId: user.id,
        },
        communicationLog: [{
          type: 'SMS_SENT',
          timestamp: new Date(),
          recipient: driver.phoneNumber,
          status: 'pending',
        }],
      });

      const savedAssignment = await queryRunner.manager.save(assignment);

      // Update shipment status
      await queryRunner.manager.update(ShipmentEntity, shipmentId, {
        status: ShipmentStatus.DISPATCHED,
        assignedDriverId: driverId,
        updatedById: user.id,
      });

      // Update driver status and last dispatch
      await queryRunner.manager.update(DriverEntity, driverId, {
        status: DriverStatus.ON_LOAD,
        lastDispatchDate: new Date(),
        completedLoads: driver.completedLoads + 1, // Optimistic update
      });

      await queryRunner.commitTransaction();

      // Send SMS dispatch message
      const smsResult = await this.sendDispatchSms(driver, shipment, savedAssignment.dispatchMessage);

      // Log SMS result
      await this.updateSmsLog(savedAssignment.id, smsResult);

      this.logger.log(
        `Dispatch created: Shipment ${shipment.referenceNumber} → Driver ${driver.firstName} ${driver.lastName}`
      );

      return {
        success: true,
        assignment: savedAssignment,
        message: `Dispatch sent to ${driver.firstName} ${driver.lastName}`,
        smsResult,
        nextActions: [
          'Driver will receive SMS with load details',
          'Driver can reply "1" to confirm or "2" to reject',
          'Monitor webhook for driver response',
          `SMS expires at ${new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()}`,
        ],
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to assign driver: ${error.message}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Process driver SMS response (from webhook)
   */
  async processDriverResponse(
    driverId: string, 
    response: '1' | '2', 
    assignmentId: string,
    user: User
  ): Promise<{ success: boolean; message: string; nextActions?: string[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find assignment
      const assignment = await this.dispatchAssignmentsRepository.findOne({
        where: { id: assignmentId, driverId },
        relations: ['shipment', 'driver'],
      });

      if (!assignment) {
        throw new NotFoundException('Dispatch assignment not found');
      }

      if (assignment.status !== DispatchStatus.DISPATCHED) {
        throw new BadRequestException(`Assignment is not in DISPATCHED status. Current status: ${assignment.status}`);
      }

      let newStatus: DispatchStatus;
      let message: string;
      let nextActions: string[] = [];

      if (response === '1') {
        // Confirm dispatch
        newStatus = DispatchStatus.CONFIRMED;
        message = `Driver ${assignment.driver.firstName} ${assignment.driver.lastName} confirmed dispatch`;
        nextActions = [
          'Generate BOL and pickup documents',
          'Update shipment status to IN_TRANSIT when picked up',
          'Monitor driver location for real-time tracking',
        ];

        // Update driver status
        await queryRunner.manager.update(DriverEntity, driverId, {
          status: DriverStatus.ON_LOAD,
          completedLoads: assignment.driver.completedLoads + 1,
        });

        // Update shipment
        await queryRunner.manager.update(ShipmentEntity, assignment.shipmentId, {
          status: ShipmentStatus.BOOKED,
          updatedById: user.id,
        });

      } else if (response === '2') {
        // Reject dispatch
        newStatus = DispatchStatus.REJECTED;
        message = `Driver ${assignment.driver.firstName} ${assignment.driver.lastName} rejected dispatch`;
        nextActions = [
          'Find alternative driver for this shipment',
          'Contact driver to understand rejection reason',
          'Update dispatch preferences for future loads',
        ];

        // Update driver status back to ACTIVE
        await queryRunner.manager.update(DriverEntity, driverId, {
          status: DriverStatus.ACTIVE,
        });

        // Revert shipment to TENDERED for re-dispatch
        await queryRunner.manager.update(ShipmentEntity, assignment.shipmentId, {
          status: ShipmentStatus.TENDERED,
          assignedDriverId: null,
          updatedById: user.id,
        });

      } else {
        throw new BadRequestException('Invalid response code');
      }

      // Update assignment
      await queryRunner.manager.update(DispatchAssignmentEntity, assignmentId, {
        status: newStatus,
        confirmedAt: response === '1' ? new Date() : null,
        rejectedAt: response === '2' ? new Date() : null,
        responseDetails: {
          responseType: response,
          timestamp: new Date(),
          processedBy: user.id,
        },
        communicationLog: [
          ...(assignment.communicationLog || []),
          {
            type: 'SMS_RESPONSE',
            timestamp: new Date(),
            response,
            processedBy: user.id,
            status: 'processed',
          },
        ],
      });

      await queryRunner.commitTransaction();

      this.logger.log(`Driver response processed: ${response} for assignment ${assignmentId}`);

      return {
        success: true,
        message,
        nextActions,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to process driver response: ${error.message}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get assignments for a shipment
   */
  async getAssignmentsForShipment(shipmentId: string, user: User): Promise<DispatchAssignmentEntity[]> {
    return this.dispatchAssignmentsRepository.find({
      where: { shipmentId },
      relations: ['driver', 'shipment'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get assignments for a driver
   */
  async getAssignmentsForDriver(driverId: string, user: User): Promise<DispatchAssignmentEntity[]> {
    return this.dispatchAssignmentsRepository.find({
      where: { driverId },
      relations: ['driver', 'shipment'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * The "Magic" dispatch message construction
   */
  private buildDispatchMessage(shipment: ShipmentEntity, driver: DriverEntity): string {
    const pickupTime = shipment.pickupWindowStart 
      ? new Date(shipment.pickupWindowStart).toLocaleString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit' 
        })
      : 'ASAP';

    const pickupLocation = `${shipment.shipperLocation.city}, ${shipment.shipperLocation.state}`;
    const destinationLocation = `${shipment.consigneeLocation.city}, ${shipment.consigneeLocation.state}`;
    const weight = shipment.totalWeight ? `${shipment.totalWeight.toLocaleString()} lbs` : 'Weight TBD';
    const equipment = shipment.equipmentType.replace('_', ' ');

    return `Dispatch Alert: Load ${shipment.referenceNumber} picking up in ${pickupLocation} at ${pickupTime}. Dest: ${destinationLocation}. ${weight}, ${equipment}. Reply '1' to Confirm, '2' to Reject.`;
  }

  /**
   * Send dispatch SMS message
   */
  private async sendDispatchSms(driver: DriverEntity, shipment: ShipmentEntity, message: string): Promise<SmsResult> {
    try {
      // For now, use MockSmsProvider directly
      // In production, inject SMS provider based on configuration
      const { MockSmsProvider } = await import('../providers/mock-sms.provider');
      const smsProvider = new MockSmsProvider({} as any); // Pass ConfigService if needed

      const result = await smsProvider.sendSms(driver.phoneNumber, message);
      
      this.logger.log(`📱 Dispatch SMS sent to ${driver.phoneNumber}`);
      this.logger.log(`   Message: ${message}`);
      this.logger.log(`   Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to send dispatch SMS: ${error.message}`, error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Update SMS communication log
   */
  private async updateSmsLog(assignmentId: string, smsResult: SmsResult): Promise<void> {
    try {
      await this.dispatchAssignmentsRepository.update(assignmentId, {
        communicationLog: () => 
          `jsonb_set(
            communicationLog, 
            '${communicationLog}' || '[]'::jsonb,
            $1${JSON.stringify([{
              type: 'SMS_SENT',
              timestamp: smsResult.timestamp,
              status: smsResult.success ? 'sent' : 'failed',
              messageId: smsResult.messageId,
              error: smsResult.error,
            })]}::jsonb
          )`,
      });
    } catch (error) {
      this.logger.error(`Failed to update SMS log: ${error.message}`, error);
    }
  }

  /**
   * Validate shipment for dispatching
   */
  private async validateShipmentForDispatch(shipmentId: string, user: User): Promise<ShipmentEntity> {
    const shipment = await this.shipmentsRepository.findOne({
      where: { id: shipmentId, tenantId: user.companyId },
      relations: [
        'shipperLocation',
        'consigneeLocation',
        'carrier',
        'tenders',
      ],
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.status !== ShipmentStatus.BOOKED && shipment.status !== ShipmentStatus.TENDERED) {
      throw new BadRequestException(`Shipment must be BOOKED or TENDERED to dispatch. Current status: ${shipment.status}`);
    }

    // Check if there's an accepted tender
    const acceptedTender = shipment.tenders?.find(tender => tender.status === TenderStatus.ACCEPTED);
    if (!acceptedTender) {
      throw new BadRequestException('No accepted tender found for this shipment');
    }

    return shipment;
  }

  /**
   * Validate driver for assignment
   */
  private async validateDriverForAssignment(driverId: string, user: User): Promise<DriverEntity> {
    const driver = await this.driversRepository.findOne({
      where: { id: driverId },
      relations: ['carrier'],
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (!driver.isActive) {
      throw new BadRequestException('Driver is not active');
    }

    return driver;
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
   * Get driver availability status
   */
  async getDriverAvailability(driverId: string, user: User): Promise<any> {
    const driver = await this.driversRepository.findOne({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const isAvailable = this.isDriverAvailable(driver);
    const currentAssignment = await this.dispatchAssignmentsRepository.findOne({
      where: {
        driverId,
        status: [DispatchStatus.DISPATCHED, DispatchStatus.CONFIRMED],
      },
      relations: ['shipment'],
      order: { createdAt: 'DESC' },
    });

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
    };
  }

  /**
   * Get dispatch statistics
   */
  async getDispatchStats(user: User): Promise<any> {
    const totalAssignments = await this.dispatchAssignmentsRepository.count({
      where: { tenantId: user.companyId },
    });

    const confirmedAssignments = await this.dispatchAssignmentsRepository.count({
      where: { tenantId: user.companyId, status: DispatchStatus.CONFIRMED },
    });

    const rejectedAssignments = await this.dispatchAssignmentsRepository.count({
      where: { tenantId: user.companyId, status: DispatchStatus.REJECTED },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAssignments = await this.dispatchAssignmentsRepository.count({
      where: { 
        tenantId: user.companyId,
        createdAt: today,
      },
    });

    return {
      totalAssignments,
      confirmedAssignments,
      rejectedAssignments,
      rejectedRate: totalAssignments > 0 ? (rejectedAssignments / totalAssignments) * 100 : 0,
      todayAssignments,
    };
  }
}