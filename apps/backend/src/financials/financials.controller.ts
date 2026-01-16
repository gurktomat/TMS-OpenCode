import { 
  Controller, 
  Post, 
  Get, 
  Param, 
  UseGuards, 
  Request, 
  Response, 
  HttpStatus,
  ParseUUIDPipe,
  Query,
  Body,
  Headers 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { FinancialsService } from '../services/financials.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { InvoiceEntity, InvoiceStatus } from './entities/financials.entity';
import { User } from '@tms-platform/types';
import { 
  CreateInvoiceDto, 
  UpdateInvoiceDto, 
  QueryInvoicesDto,
  UpdateBillDto,
  CreateBillDto,
  ProfitCalculation
} from './dto/financials.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { CompanyGuard } from '../../auth/guards/company.guard';

@ApiTags('Financials')
@Controller('financials')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, CompanyGuard)
@ApiBearerAuth()
export class FinancialsController {
  constructor(
    private readonly financialsService: FinancialsService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  // Invoice Operations

  @Post('invoices/generate/:shipmentId')
  @Roles('admin', 'dispatcher', 'billing')
  @Permissions('invoices:create')
  @ApiOperation({ 
    summary: 'Generate invoice from shipment',
    description: 'Creates an invoice with line items based on shipment data'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Shipment ID' })
  @ApiResponse({
    status: 201,
    description: 'Invoice generated successfully',
  })
  async generateInvoice(
    @Param('id', ParseUUIDPipe) shipmentId: string,
    @Body() invoiceData: CreateInvoiceDto,
    @Request() req: ExpressRequest,
  ): Promise<any> {
    try {
      const user = req.user as User;
      const invoice = await this.financialsService.generateInvoice(shipmentId, invoiceData, user);
      
      return {
        success: true,
        message: 'Invoice generated successfully',
        data: invoice,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate invoice',
        error: error.message,
      };
    }
  }

  @Get('invoices/:id')
  @Permissions('invoices:read')
  @ApiOperation({ 
    summary: 'Get invoice by ID',
    description: 'Returns complete invoice details with line items'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Invoice ID' })
  async getInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
  ): Promise<any> {
    const user = req.user as User;
      const invoice = await this.financialsService.getInvoice(id, user);
      
      return {
        success: true,
        data: invoice,
      };
    }
  }

  @Get('invoices')
  @Permissions('invoices:read')
  @ApiOperation({ 
    summary: 'Get all invoices for tenant',
    description: 'Returns paginated list of invoices with filtering options'
  })
  @ApiQuery({ name: 'page', type: Number, description: 'Page number', example: 1, default: 1 })
  @ApiQuery({ name: 'limit', type: Number, description: 'Items per page', example: 20, default: 20 })
  @ApiQuery({ name: 'status', type: String, enum: ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED'] })
  @ApiQuery({ name: 'customerId', type: String, description: 'Customer ID filter' })
  @ApiQuery({ name: 'dateRange', type: String, description: 'Date range filter' })
  async getInvoices(
    @Query() query: QueryInvoicesDto,
    @Request() req: ExpressRequest,
  ): Promise<any> {
    const user = req.user as User;
      const invoices = await this.financialsService.getInvoices(user, query);
      
      return {
        success: true,
        data: invoices,
      };
    }
  }

  @Patch('invoices/:id/status')
  @Roles('admin', 'dispatcher', 'billing')
  @Permissions('invoices:update')
  @ApiOperation({ 
    summary: 'Update invoice status',
    description: 'Changes invoice status (DRAFT, SENT, PAID, etc.)'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Invoice ID' })
  async updateInvoiceStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: { status: InvoiceStatus },
    @Request() req: ExpressRequest,
  ): Promise<any> {
    try {
      const user = req.user as User;
      const invoice = await this.financialsService.updateInvoiceStatus(id, updateData.status, user);
      
      return {
        success: true,
        message: `Invoice status updated to ${updateData.status}`,
        data: invoice,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update invoice status',
        error: error.message,
      };
    }
  }

  @Get('invoices/:id/pdf')
  @Permissions('invoices:read')
  @ApiOperation({ 
    summary: 'Download invoice PDF',
    description: 'Returns invoice as downloadable PDF file'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'invoice ID' })
  async downloadInvoicePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
  ): Promise<void> {
    try {
      const user = req.user as User;
      const invoice = await this.financialsService.getInvoice(id, user);
      
      const pdfBuffer = await this.pdfGeneratorService.generateInvoicePdf({
        invoice,
        customer: invoice.customer,
        shipment: invoice.shipment,
        company: invoice.customer,
      },
        {
          header: {
            company: invoice.customer?.company || {
              name: 'TMS Platform',
              address: '123 Logistics Way, Suite 100',
              city: 'Chicago',
              state: 'IL',
              zip: '60601',
              phone: '+1-800-555-0123',
              email: 'billing@tms-platform.com',
              website: 'www.tms-platform.com'
            }
          }
        },
      });

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      });
      
      res.end(pdfBuffer);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to generate invoice PDF',
        error: error.message,
      });
    }
  }

  // Bill Operations (Carrier Payments)

  @Post('bills/generate/:loadTenderId')
  @Roles('admin', 'carrier', 'billing')
  @Permissions('bills:create')
  @ApiOperation({ 
    summary: 'Generate bill from load tender',
    description: 'Creates a bill for carrier based on accepted tender'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Load Tender ID' })
  async generateBill(
    @Param('id', ParseUUIDPipe) loadTenderId: string,
    @Request() req: ExpressRequest,
    ): Promise<any> {
    try {
      const user = req.user as User;
      const bill = await this.financialsService.generateBill(loadTenderId, user);
      
      return {
        success: true,
        message: 'Bill generated successfully',
        data: bill,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to generate bill',
        error: error.message,
      };
    }
  }

  @Get('bills/:id')
  @Permissions('bills:read')
  @ApiOperation({ 
    summary: 'Get bill by ID',
    description: 'Returns complete bill details with line items'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Bill ID' })
  async getBill(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
  ): Promise<any> {
    const user = req.user as User;
      const bill = await this.dataSource.getRepository(BillEntity).findOne({
        where: { id },
        relations: ['loadTender', 'carrier', 'company', 'lineItems', 'createdBy'],
      });
      
      if (!bill) {
        throw new Error('Bill not found');
      }

      return {
        success: true,
        data: bill,
      };
    }
  }

  @Patch('bills/:id/status')
  @Roles('admin', 'carrier', 'billing')
  @Permissions('bills:update')
  @ApiOperation({ 
    summary: 'Update bill status',
    description: 'Changes bill status (DRAFT, APPROVED, PAID, etc.)'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Bill ID' })
  async updateBillStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: { status: BillStatus },
    @Request() req: ExpressRequest,
  ): Promise<any> {
    try {
      const user = req.user as User;
      const bill = await this.dataSource.getRepository(BillEntity).save({
        id,
        status: updateData.status,
        updatedAt: new Date(),
      });
      
      return {
        success: true,
        message: `Bill status updated to ${updateData.status}`,
        data: bill,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update bill status',
        error: error.message,
      };
    }
  }

  // Profit Analytics

  @Get('shipments/:id/profit')
  @Permissions('shipments:read', 'analytics:read')
  @ApiOperation({ 
    shipment: 'Profit calculation for shipment',
    description: 'Returns detailed profit analysis for a specific shipment'
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Shipment ID' })
  async getShipmentProfit(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
  ): Promise<any> {
    try {
      const user = req.user as User;
      const profitCalculation = await this.financialsService.calculateProfit(id, user);
      
      return {
        success: true,
        data: profitCalculation,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to calculate profit',
        error: error.message,
      };
    }
  }

  @Get('analytics/overview')
  @Permissions('analytics:read')
  @ApiOperation({ 
    summary: 'Financial analytics overview',
    totalRevenue: 125000,
        totalExpenses: 85000,
        grossProfit: 40000,
        profitMargin: 32.0,
        profitPerMile: 0.15,
        monthlyComparison: {
          january: { revenue: 10000, expenses: 6500, profit: 3500 },
          february: { revenue: 12000, expenses: 7000, profit: 5000 },
          march: { revenue: 13000, expenses: 8000, profit: 5000 },
          april: { revenue: 11000, expenses: 9000, profit: 2000 },
          may: { revenue: 14000, expenses: 11000, profit: 3000 }
        }
      }
    })
  @ApiResponse({
      status: 200,
      description: 'Financial analytics overview retrieved successfully',
    })
  async getFinancialAnalytics(@Request() req: ExpressRequest): Promise<any> {
    // Mock analytics data
    return {
      success: true,
      data: {
        totalRevenue: 125000,
        totalExpenses: 85000,
        grossProfit: 40000,
        profitMargin: 32.0,
        profitPerMile: 0.15,
        monthlyComparison: {
          january: { revenue: 10000, expenses: 6500, profit: 3500 },
          february: { revenue: 12000, expenses: 7000, profit: 5000 },
          march: { revenue: 13000, expenses: 8000, profit: 5000 },
          april: { revenue: 11000, expenses: 9000, profit: 2000 },
          may: { revenue: 14000, expenses: 11000, profit: 3000 }
        }
      },
        topCustomers: [
          { name: 'Global Shipping Corp', revenue: 15000 },
          { name: 'FastTrack Logistics', revenue: 12000 }
        ],
        topRevenueByMonth: [
          { month: 'April', revenue: 14000 },
          { month: 'January', revenue: 10000 }
        ],
        topExpensesByCategory: [
          { category: 'Fuel', amount: 4000 },
          { category: 'Labor', amount: 3000 },
          { category: 'Maintenance', amount: 1500 }
        ]
      }
      };
    };
  }
}