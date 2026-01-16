import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { 
  InvoiceEntity, 
  BillEntity, 
  FinancialLineItemEntity, 
  InvoiceStatus,
  BillStatus,
  LineItemType 
} from './entities/financials.entity';
import { 
  ShipmentEntity, 
  ShipmentStatus 
} from '../../shipments/entities/shipment.entity';
import { LoadTenderEntity, TenderStatus } from '../../carriers/entities/load-tender.entity';

export interface InvoiceGenerationData {
  invoice: InvoiceEntity;
  lineItems: FinancialLineItemEntity[];
  customer: any;
  shipment: ShipmentEntity;
}

export interface ProfitCalculation {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  profitMargin: number;
  profitPercentage: number;
  perMileProfit: number;
}

export interface InvoiceData {
  shipmentId: string;
  customerId: string;
  invoiceDate?: Date;
  dueDate?: Date;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    referenceNumber?: string;
    commodityCode?: string;
  }[];
  notes?: string;
}

@Injectable()
export class FinancialsService {
  private readonly logger = new Logger(FinancialsService.name);

  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly invoicesRepository: Repository<InvoiceEntity>,
    @InjectRepository(BillEntity)
    private readonly billsRepository: Repository<BillEntity>,
    @InjectRepository(FinancialLineItemEntity)
    private readonly lineItemsRepository: Repository<FinancialLineItemEntity>,
    @InjectRepository(ShipmentEntity)
    private readonly shipmentsRepository: Repository<ShipmentEntity>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Generate invoice from shipment data
   */
  async generateInvoice(shipmentId: string, invoiceData: InvoiceData, user: User): Promise<InvoiceEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate shipment is delivered
      const shipment = await this.validateShipmentForInvoicing(shipmentId, user);
      
      // Create invoice with line items
      const invoice = this.invoicesRepository.create({
        invoiceNumber: await this.generateInvoiceNumber(),
        tenantId: user.companyId,
        customerId: invoiceData.customerId || shipment.customerId,
        shipmentId,
        invoiceDate: invoiceData.invoiceDate || new Date(),
        dueDate: invoiceData.dueDate || this.calculateDueDate(shipment.invoiceDate),
        status: InvoiceStatus.DRAFT,
        totalAmount: 0,
        taxAmount: 0,
        discountAmount: 0,
        balanceDue: 0,
        currency: invoiceData.currency || 'USD',
        paymentTerms: invoiceData.paymentTerms || 'NET 30',
        notes: invoiceData.notes,
        createdById: user.id,
      });

      const savedInvoice = await queryRunner.manager.save(invoice);

      // Create line items
      const lineItems = [];
      for (let i = 0; i < invoiceData.lineItems.length; i++) {
        const lineItem = this.lineItemsRepository.create({
          tenantId: user.companyId,
          invoiceId: savedInvoice.id,
          type: LineItemType.REVENUE,
          lineNumber: i + 1,
          description: invoiceData.lineItems[i].description,
          quantity: invoiceData.lineItems[i].quantity,
          unitOfMeasure: invoiceData.lineItems[i].unitOfMeasure || 'each',
          unitPrice: invoiceData.lineItems[i].unitPrice,
          totalAmount: invoiceData.lineItems[i].totalAmount,
          referenceNumber: invoiceData.lineItems[i].referenceNumber,
          commodityCode: invoiceData.lineItems[i].commodityCode,
          locationId: invoiceData.lineItems[i].locationId,
          locationDescription: invoiceData.lineItems[i].locationDescription,
          createdById: user.id,
        });

        await queryRunner.manager.save(lineItem);
        lineItems.push(lineItem);
        
        savedInvoice.totalAmount += lineItem.totalAmount;
      }

      // Calculate totals
      savedInvoice.taxAmount = this.calculateTaxAmount(savedInvoice.totalAmount);
      savedInvoice.balanceDue = savedInvoice.totalAmount + savedInvoice.taxAmount - savedInvoice.discountAmount;

      // Update invoice with calculated totals
      await queryRunner.manager.save(savedInvoice);

      await queryRunner.commitTransaction();

      this.logger.log(`Invoice generated: ${savedInvoice.invoiceNumber} for shipment: ${shipmentId}`);

      return savedInvoice;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to generate invoice: ${error.message}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Generate bill from load tender data
   */
  async generateBill(loadTenderId: string, user: User): Promise<BillEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get load tender with relations
      const loadTender = await this.dataSource
        .getRepository(LoadTenderEntity)
        .createQueryBuilder('loadTender')
        .leftJoinAndSelect('loadTender.shipment', 'shipment')
        .leftJoinAndSelect('loadTender.carrier', 'carrier')
        .leftJoinAndSelect('carrier.company', 'company')
        .where('loadTender.id = :id', { id: loadTenderId })
        .getOne();

      if (!loadTender) {
        throw new NotFoundException('Load tender not found');
      }

      // Validate load tender is accepted
      if (loadTender.status !== TenderStatus.ACCEPTED) {
        throw new BadRequestException('Load tender must be accepted before generating bill');
      }

      // Create bill based on tender
      const bill = this.billsRepository.create({
        billNumber: await this.generateBillNumber(),
        tenantId: user.companyId,
        loadTenderId: loadTender.id,
        carrierId: loadTender.carrierId,
        billDate: new Date(),
        agreedAmount: loadTender.offerAmount,
        status: BillStatus.DRAFT,
        totalAmount: loadTender.offerAmount,
        taxAmount: 0,
        discountAmount: 0,
        paidAmount: 0,
        balanceDue: loadTender.offerAmount,
        currency: 'USD',
        paymentTerms: 'NET 30',
        notes: `Bill for load tender ${loadTender.id}`,
        createdById: user.id,
      });

      const savedBill = await queryRunner.manager.save(bill);

      await queryRunner.commitTransaction();

      this.logger.log(`Bill generated: ${savedBill.billNumber} for load tender: ${loadTenderId}`);

      return savedBill;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to generate bill: ${error.message}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Calculate profit for a shipment
   */
  async calculateProfit(shipmentId: string, user: User): Promise<ProfitCalculation> {
    try {
      // Get invoice and bill for the shipment
      const invoice = await this.invoicesRepository.findOne({
        where: { shipmentId },
        relations: ['lineItems'],
      });

      const bill = await this.billsRepository.findOne({
        where: { loadTenderId: { 
          shipmentId, 
          status: TenderStatus.ACCEPTED 
        } },
        relations: ['lineItems'],
      });

      if (!invoice || !bill) {
        throw new NotFoundException('No invoice or bill found for shipment');
      }

      // Calculate revenue from invoice
      const totalRevenue = invoice.totalAmount || 0;

      // Calculate expenses from bill
      const totalExpenses = bill.totalAmount || 0;

      // Calculate profit
      const grossProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const profitPercentage = profitMargin;

      // Calculate per mile profit (if shipment has distance data)
      let perMileProfit = 0;
      const shipment = invoice.shipment;
      if (shipment && shipment.totalMiles) {
        perMileProfit = totalRevenue / shipment.totalMiles;
      }

      return {
        totalRevenue,
        totalExpenses,
        grossProfit,
        profitMargin,
        profitPercentage,
        perMileProfit,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate profit: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(id: string, user: User): Promise<InvoiceEntity> {
    const invoice = await this.invoicesRepository.findOne({
      where: { id, tenantId: user.companyId },
      relations: [
        'customer',
        'shipment',
        'lineItems',
        'createdBy',
      ],
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(id: string, status: InvoiceStatus, user: User): Promise<InvoiceEntity> {
    const updatedInvoice = await this.invoicesRepository.save({
      id,
      status,
      updatedAt: new Date(),
    });

    this.logger.log(`Invoice ${id} status updated to ${status} by ${user.email}`);

    return updatedInvoice;
  }

  /**
   * Get all invoices for tenant
   */
  async getInvoices(user: User, filters: any = {}): Promise<any> {
    const queryBuilder = this.invoicesRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .leftJoinAndSelect('invoice.shipment', 'shipment')
      .where('invoice.tenantId = :tenantId', { tenantId: user.companyId })
      .orderBy('invoice.createdAt', 'DESC');

    // Apply filters
    if (filters.status) {
      queryBuilder.andWhere('invoice.status = :status', { status: filters.status });
    }

    if (filters.customerId) {
      queryBuilder.andWhere('invoice.customerId = :customerId', { customerId: filters.customerId });
    }

    if (filters.dateRange) {
      queryBuilder.andWhere('invoice.invoiceDate >= :startDate', { 
        startDate: filters.dateRange.startDate 
      }).andWhere('invoice.invoiceDate <= :endDate', { 
        endDate: filters.dateRange.endDate 
      });
    }

    const invoices = await queryBuilder.getMany();
    const total = await queryBuilder.getCount();

    return { invoices, total };
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const prefix = 'INV';
    const date = new Date();
    const timestamp = date.getTime();
    
    // Query for last invoice number
    const lastInvoice = await this.invoicesRepository
      .createQueryBuilder('invoice')
      .orderBy('invoice.createdAt', 'DESC')
      .where('invoice.invoiceNumber LIKE :pattern', { pattern: `${prefix}%` })
      .getOne();

    let sequence = 1;
    if (lastInvoice) {
      const match = lastInvoice.invoiceNumber.match(/INV(\d+)/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `${prefix}${date.getFullYear()}${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Generate unique bill number
   */
  private async generateBillNumber(): Promise<string> {
    const prefix = 'BILL';
    const date = new Date();
    const timestamp = date.getTime();
    
    // Query for last bill number
    const lastBill = await this.billsRepository
      .createQueryBuilder('bill')
      .orderBy('bill.createdAt', 'DESC')
      .where('bill.billNumber LIKE :pattern', { pattern: `${prefix}%` })
      .getOne();

    let sequence = 1;
    if (lastBill) {
      const match = lastBill.billNumber.match(/BILL(\d+)/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `${prefix}${date.getFullYear()}${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Calculate tax amount
   */
  private calculateTaxAmount(totalAmount: number): number {
    // Simple tax calculation (adjust based on your tax rules)
    const taxRate = 0.08; // 8% tax rate
    return totalAmount * taxRate;
  }

  /**
   * Calculate due date
   */
  private calculateDueDate(invoiceDate: Date): Date {
    // Net 30 terms by default
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate;
  }

  /**
   * Validate shipment for invoicing
   */
  private async validateShipmentForInvoicing(shipmentId: string, user: User): Promise<ShipmentEntity> {
    const shipment = await this.shipmentsRepository.findOne({
      where: { id: shipmentId, tenantId: user.companyId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.status !== ShipmentStatus.DELIVERED) {
      throw new BadRequestException('Shipment must be delivered before invoicing');
    }

    return shipment;
  }
}