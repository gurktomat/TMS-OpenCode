import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { 
  CarrierEntity, 
  LoadTenderEntity, 
  TenderStatus, 
  TenderType 
} from './entities';
import { ShipmentEntity, ShipmentStatus } from '../../shipments/entities/shipment.entity';
import { User } from '@tms-platform/types';

export interface TenderRequest {
  shipmentId: string;
  carrierId: string;
  amount: number;
  offerExpiryHours?: number;
  tenderType?: TenderType;
  tenderDetails?: any;
}

export interface TenderResponse {
  success: boolean;
  tender: LoadTenderEntity;
  message: string;
  nextActions?: string[];
}

@Injectable()
export class TenderingService {
  private readonly logger = new Logger(TenderingService.name);

  constructor(
    @InjectRepository(LoadTenderEntity)
    private readonly loadTendersRepository: Repository<LoadTenderEntity>,
    @InjectRepository(ShipmentEntity)
    private readonly shipmentsRepository: Repository<ShipmentEntity>,
    @InjectRepository(CarrierEntity)
    private readonly carriersRepository: Repository<CarrierEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tender a shipment to a carrier (State Machine)
   */
  async tenderLoad(tenderRequest: TenderRequest, user: User): Promise<TenderResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { shipmentId, carrierId, amount, offerExpiryHours = 24, tenderType = TenderType.PRIMARY, tenderDetails } = tenderRequest;

      // Validate shipment and carrier
      const shipment = await this.validateShipmentForTender(shipmentId, user);
      const carrier = await this.validateCarrierForTender(carrierId, user);

      // Check if shipment is already tendered to this carrier
      const existingTender = await this.loadTendersRepository.findOne({
        where: {
          shipmentId,
          carrierId,
          status: TenderStatus.OFFERED,
        },
      });

      if (existingTender) {
        throw new BadRequestException('Shipment is already tendered to this carrier');
      }

      // Update shipment status to TENDERED
      await queryRunner.manager.update(ShipmentEntity, shipmentId, {
        status: ShipmentStatus.TENDERED,
        carrierId,
        updatedById: user.id,
      });

      // Create load tender with OFFERED status
      const offerExpiryDate = new Date();
      offerExpiryDate.setHours(offerExpiryDate.getHours() + offerExpiryHours);

      const tender = this.loadTendersRepository.create({
        shipmentId,
        carrierId,
        status: TenderStatus.OFFERED,
        tenderType,
        offerAmount: amount,
        offerExpiryDate,
        tenderDetails,
        auditTrail: [{
          action: 'OFFERED',
          timestamp: new Date(),
          userId: user.id,
          notes: `Load tendered to ${carrier.name} for $${amount}`,
        }],
      });

      const savedTender = await queryRunner.manager.save(tender);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Send notification (placeholder)
      await this.sendTenderNotification(savedTender, shipment, carrier);

      this.logger.log(
        `Shipment ${shipment.referenceNumber} tendered to carrier ${carrier.scac} for $${amount}`
      );

      return {
        success: true,
        tender: savedTender,
        message: `Load successfully tendered to ${carrier.name}`,
        nextActions: [
          'Carrier will receive notification',
          'Carrier can accept, reject, or counter-offer',
          'Offer expires at ' + offerExpiryDate.toISOString(),
        ],
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to tender load: ${error.message}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Accept a tender (carrier response)
   */
  async acceptTender(tenderId: string, carrierId: string, user: User): Promise<TenderResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find and validate tender
      const tender = await this.findTenderForResponse(tenderId, carrierId, user);

      if (tender.status !== TenderStatus.OFFERED) {
        throw new BadRequestException('Tender cannot be accepted in current status');
      }

      if (new Date() > tender.offerExpiryDate) {
        throw new BadRequestException('Tender has expired');
      }

      // Update tender status
      await queryRunner.manager.update(LoadTenderEntity, tenderId, {
        status: TenderStatus.ACCEPTED,
        responseDate: new Date(),
        acceptedDate: new Date(),
        acceptedById: user.id,
        carrierResponse: {
          action: 'ACCEPTED',
          timestamp: new Date(),
          userId: user.id,
        },
        auditTrail: [
          ...(tender.auditTrail || []),
          {
            action: 'ACCEPTED',
            timestamp: new Date(),
            userId: user.id,
            notes: 'Tender accepted by carrier',
          },
        ],
      });

      // Update shipment status
      await queryRunner.manager.update(ShipmentEntity, tender.shipmentId, {
        status: ShipmentStatus.BOOKED,
        carrierId: tender.carrierId,
        updatedById: user.id,
      });

      // Reject other tenders for this shipment
      await this.rejectOtherTenders(queryRunner, tender.shipmentId, tenderId);

      await queryRunner.commitTransaction();

      // Send notification (placeholder)
      await this.sendAcceptanceNotification(tender);

      this.logger.log(`Tender ${tenderId} accepted by carrier ${carrierId}`);

      return {
        success: true,
        tender: { ...tender, status: TenderStatus.ACCEPTED },
        message: 'Tender accepted successfully',
        nextActions: [
          'Shipment is now booked',
          'Generate BOL and documents',
          'Schedule pickup',
        ],
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to accept tender: ${error.message}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reject a tender (carrier response)
   */
  async rejectTender(tenderId: string, carrierId: string, reason?: string, user: User): Promise<TenderResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find and validate tender
      const tender = await this.findTenderForResponse(tenderId, carrierId, user);

      if (tender.status !== TenderStatus.OFFERED) {
        throw new BadRequestException('Tender cannot be rejected in current status');
      }

      // Update tender status
      await queryRunner.manager.update(LoadTenderEntity, tenderId, {
        status: TenderStatus.REJECTED,
        responseDate: new Date(),
        rejectedDate: new Date(),
        rejectedById: user.id,
        responseNotes: reason,
        carrierResponse: {
          action: 'REJECTED',
          timestamp: new Date(),
          userId: user.id,
          reason,
        },
        auditTrail: [
          ...(tender.auditTrail || []),
          {
            action: 'REJECTED',
            timestamp: new Date(),
            userId: user.id,
            notes: reason || 'No reason provided',
          },
        ],
      });

      await queryRunner.commitTransaction();

      // Send notification (placeholder)
      await this.sendRejectionNotification(tender, reason);

      this.logger.log(`Tender ${tenderId} rejected by carrier ${carrierId}`);

      return {
        success: true,
        tender: { ...tender, status: TenderStatus.REJECTED },
        message: 'Tender rejected',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to reject tender: ${error.message}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cancel a tender
   */
  async cancelTender(tenderId: string, reason: string, user: User): Promise<TenderResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const tender = await this.loadTendersRepository.findOne({
        where: { id: tenderId },
        relations: ['shipment'],
      });

      if (!tender) {
        throw new NotFoundException('Tender not found');
      }

      if (tender.status === TenderStatus.CANCELLED || tender.status === TenderStatus.EXPIRED) {
        throw new BadRequestException('Tender is already cancelled or expired');
      }

      if (tender.status === TenderStatus.ACCEPTED) {
        // If accepted, need to update shipment status back
        await queryRunner.manager.update(ShipmentEntity, tender.shipmentId, {
          status: ShipmentStatus.QUOTE,
          carrierId: null,
          updatedById: user.id,
        });
      }

      // Update tender status
      await queryRunner.manager.update(LoadTenderEntity, tenderId, {
        status: TenderStatus.CANCELLED,
        cancelledDate: new Date(),
        cancelledById: user.id,
        cancellationReason: reason,
        auditTrail: [
          ...(tender.auditTrail || []),
          {
            action: 'CANCELLED',
            timestamp: new Date(),
            userId: user.id,
            notes: reason,
          },
        ],
      });

      await queryRunner.commitTransaction();

      this.logger.log(`Tender ${tenderId} cancelled by ${user.email}`);

      return {
        success: true,
        tender: { ...tender, status: TenderStatus.CANCELLED },
        message: 'Tender cancelled successfully',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to cancel tender: ${error.message}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get tenders for a shipment
   */
  async getTendersForShipment(shipmentId: string, user: User): Promise<LoadTenderEntity[]> {
    return this.loadTendersRepository.find({
      where: { shipmentId },
      relations: ['carrier', 'shipment'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get tenders for a carrier
   */
  async getTendersForCarrier(carrierId: string, user: User): Promise<LoadTenderEntity[]> {
    return this.loadTendersRepository.find({
      where: { carrierId },
      relations: ['carrier', 'shipment'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Validate shipment for tendering
   */
  private async validateShipmentForTender(shipmentId: string, user: User): Promise<ShipmentEntity> {
    const shipment = await this.shipmentsRepository.findOne({
      where: { id: shipmentId, tenantId: user.companyId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.status !== ShipmentStatus.QUOTE) {
      throw new BadRequestException(`Shipment must be in QUOTE status to tender. Current status: ${shipment.status}`);
    }

    return shipment;
  }

  /**
   * Validate carrier for tendering
   */
  private async validateCarrierForTender(carrierId: string, user: User): Promise<CarrierEntity> {
    const carrier = await this.carriersRepository.findOne({
      where: { id: carrierId },
    });

    if (!carrier) {
      throw new NotFoundException('Carrier not found');
    }

    if (carrier.status !== 'ACTIVE') {
      throw new BadRequestException(`Carrier must be ACTIVE to receive tenders. Current status: ${carrier.status}`);
    }

    return carrier;
  }

  /**
   * Find tender for response operations
   */
  private async findTenderForResponse(tenderId: string, carrierId: string, user: User): Promise<LoadTenderEntity> {
    const tender = await this.loadTendersRepository.findOne({
      where: { id: tenderId, carrierId },
      relations: ['carrier', 'shipment'],
    });

    if (!tender) {
      throw new NotFoundException('Tender not found');
    }

    return tender;
  }

  /**
   * Reject other tenders for the same shipment
   */
  private async rejectOtherTenders(queryRunner: any, shipmentId: string, acceptedTenderId: string): Promise<void> {
    await queryRunner.manager.update(LoadTenderEntity, 
      {
        shipmentId,
        status: TenderStatus.OFFERED,
      }, 
      {
        status: TenderStatus.CANCELLED,
        cancelledDate: new Date(),
        cancellationReason: 'Another tender was accepted for this shipment',
        auditTrail: [{
          action: 'AUTO_CANCELLED',
          timestamp: new Date(),
          notes: 'Cancelled due to another tender being accepted',
        }],
      }
    );
  }

  /**
   * Send tender notification (placeholder)
   */
  private async sendTenderNotification(tender: LoadTenderEntity, shipment: ShipmentEntity, carrier: CarrierEntity): Promise<void> {
    this.logger.log(`📧 [PLACEHOLDER] Sending tender notification to ${carrier.email}:`);
    this.logger.log(`   Shipment: ${shipment.referenceNumber}`);
    this.logger.log(`   Amount: $${tender.offerAmount}`);
    this.logger.log(`   Expires: ${tender.offerExpiryDate}`);
    // In production, integrate with email/EDI service
  }

  /**
   * Send acceptance notification (placeholder)
   */
  private async sendAcceptanceNotification(tender: LoadTenderEntity): Promise<void> {
    this.logger.log(`📧 [PLACEHOLDER] Sending acceptance notification for tender ${tender.id}`);
    // In production, integrate with email/EDI service
  }

  /**
   * Send rejection notification (placeholder)
   */
  private async sendRejectionNotification(tender: LoadTenderEntity, reason?: string): Promise<void> {
    this.logger.log(`📧 [PLACEHOLDER] Sending rejection notification for tender ${tender.id}`);
    if (reason) {
      this.logger.log(`   Reason: ${reason}`);
    }
    // In production, integrate with email/EDI service
  }
}