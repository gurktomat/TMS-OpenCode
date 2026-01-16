import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as PDFDocument from 'pdfkit';

export interface PdfGeneratorOptions {
  format: 'A4' | 'LETTER' | 'LEGAL';
  margin?: { top: number; right: number; bottom: number; left: number };
  orientation?: 'portrait' | 'landscape';
  watermark?: string;
  fontSize?: number;
  header?: {
    logo?: string;
    company?: {
      name: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      phone: string;
      email: string;
      website: string;
    };
  };
}

export interface InvoicePdfData {
  invoice: any;
  customer: any;
  shipment: any;
  company: any;
  lineItems: any[];
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private readonly configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  /**
   * Generate invoice PDF from invoice data
   */
  async generateInvoicePdf(invoiceData: InvoicePdfData, options?: PdfGeneratorOptions): Promise<Buffer> {
    try {
      // Create PDF document
      const doc = new PDFDocument({ 
        autoFirstPage: true,
        size: options?.format || 'A4',
        margins: options?.margin || {
          top: 50,
          bottom: 50,
          right: 50,
          left: 50,
        },
        orientation: options?.orientation || 'portrait',
      bufferPages: true,
      info: {
        Title: `Invoice ${invoiceData.invoice.invoiceNumber}`,
        Author: invoiceData.company?.name || 'TMS Platform',
        Subject: `Invoice for ${invoiceData.shipment.referenceNumber}`,
        Creator: 'TMS Platform',
        Producer: 'TMS Platform v1.0',
      },
        header: options?.watermark ? {
          text: options.watermark,
          color: 'gray',
          opacity: 0.1,
          size: 32,
        } : undefined,
      },
      footer: {
        text: `Thank you for your business!\nPage {{pageCount}} of {{pageCount}}`,
        fontSize: 8,
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      defaultFontSize: options?.fontSize || 12,
        // Add company logo if available
        ...(await this.getCompanyLogo(invoiceData.company?.name)),
      },
    });

      // Add content to PDF
      await this.addInvoiceContent(doc, invoiceData);

      // Finalize PDF
      const pdfBuffer = await this.finalizePdf(doc);

      this.logger.log(`Invoice PDF generated: ${invoiceData.invoice.invoiceNumber}`);
      
      return pdfBuffer;
    } catch (error) {
      this.logger.error(`Failed to generate invoice PDF: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Add invoice content to PDF
   */
  private async addInvoiceContent(doc: PDFDocument, invoiceData: InvoicePdfData): Promise<void> {
    return new Promise((resolve) => {
      // Company header
      if (invoiceData.company) {
        const { company, company: tmsCompany } = invoiceData.company;
        
        await this.addCompanyHeader(doc, tmsCompany);
      }

      // Invoice title and number
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#000000');
      doc.text('INVOICE', 50, 130).fillColor('#000000');
      doc.fontSize(12).font('Helvetica').fillColor('#333333').text(`#${invoiceData.invoice.number}`, 450, 130);
      
      // Invoice date and due date
      doc.fontSize(10).font('Helvetica').fillColor('#666666');
      doc.text(`Invoice Date: ${this.formatDate(invoiceData.invoiceDate)}`, 50, 180);
      doc.text(`Due Date: ${this.formatDate(invoiceData.dueDate)}`, 50, 230);
      
      // Bill to and ship to
      doc.fontSize(10).font('Helvetica').fillColor('#666666');
      doc.text('Bill To:', 50, 320);
      doc.text(invoiceData.customer?.name || '', 50, 400);
      if (invoiceData.customer?.address) {
        doc.text(`${invoiceData.customer.address}`, 70, 400);
      }
      if (invoiceData.customer?.city && invoiceData.customer?.state) {
        doc.text(`${invoiceData.customer.city}, ${invoiceData.customer.state}`, 70, 440);
      }
      doc.text('', 50, 470);
      
      doc.text('Ship To:', 50, 320);
      doc.text(invoiceData.shipment?.originLocation?.city || '', 50, 400);
      if (invoiceData.shipment?.originLocation?.address) {
        doc.text(`${invoiceData.shipment.originLocation.address}`, 70, 400);
      }
      if (invoiceData.shipment?.originLocation?.city && invoiceData.shipment?.originLocation?.state) {
        doc.text(`${invoice.shipment.originLocation.city}, ${invoice.shipment.originLocation.state}`, 70, 440);
      }
      doc.text('', 50, 470);

      // Line items table
      await this.addLineItemsTable(doc, invoiceData);

      // Totals section
      doc.y(400).text('TOTAL', 50, 520);
      doc.text('Subtotal:', 350, 520);
      doc.text(`${this.formatCurrency(invoiceData.subtotal || 0)}`, 450, 520);
      
      doc.text('Tax:', 350, 570);
      doc.text(`${this.formatCurrency(invoiceData.taxAmount || 0)}`, 520, 570);
      
      doc.text('Total:', 350, 650);
      doc.text(`${this.formatCurrency(invoiceData.totalAmount || 0)}`, 450, 650);
      
      doc.text('Balance Due:', 350, 570);
      doc.text(`${this.formatCurrency(invoiceData.balanceDue || 0)}`, 450, 650);

      // Footer with terms
      doc.fontSize(10).font('Helvetica').fillColor('#666666');
      if (invoiceData.paymentTerms) {
        doc.text(`Payment Terms: ${invoiceData.paymentTerms}`, 50, 600);
      }
      doc.text(`Due by: ${this.formatDate(invoiceData.dueDate)}`, 50, 640);
      
      resolve();
    });
  }

  /**
   * Add company header section
   */
  private async addCompanyHeader(doc: PDFDocument, company: any): Promise<void> {
    return new Promise((resolve) => {
      // Company logo and info
      if (company.logo && company.logo.type === 'url') {
        try {
          const response = await fetch(company.logo.url);
          if (response.ok) {
            const logoBuffer = Buffer.from(await response.arrayBuffer());
            doc.image('png', logoBuffer, 50, 50, { align: 'right', valign: 'center' });
          }
        } catch (error) {
          this.logger.warn(`Failed to load company logo: ${company.logo.url}`);
        }
      }

      doc.fontSize(16).font('Helvetica-Bold').text(company.name || '', 50, 55);
      if (company.address) {
        doc.fontSize(10).font('Helvetica').fillColor('#666666');
        doc.text(company.address, 50, 75);
      }
      if (company.city && company.state && company.zip) {
        doc.text(`${company.city}, ${company.state} ${company.zip}`, 50, 75);
      }
      if (company.phone) {
        doc.text(`Phone: ${company.phone}`, 50, 95);
      }
      if (company.email) {
        doc.text(`Email: ${company.email}`, 50, 105);
      }
      if (company.website) {
        doc.text(`Website: ${company.website}`, 50, 115);
      }
      
      doc.moveDown(130);
      resolve();
    });
  }

  /**
   * Add line items table
   */
  private async addLineItemsTable(doc: PDFDocument, invoiceData: InvoicePdfData): Promise<void> {
    return new Promise((resolve) => {
      const { lineItems } = invoiceData;
      
      // Table header
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
      doc.text('Description', 50, 50, { underline: true });
      doc.text('Qty', 50, 150);
      doc.text('Unit Price', 50, 150);
      doc.text('Amount', 50, 150);
      doc.text('Total', 50, 400);
      
      // Table rows
      let yPosition = 200;
      
      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        
        doc.fontSize(10).font('Helvetica').fillColor('#000000');
        const truncatedDescription = item.description.length > 60 
          ? item.description.substring(0, 57) + '...' 
          : item.description;
        
        doc.text(truncatedDescription, 50, yPosition);
        doc.text(`${item.quantity || 0}`, 110, yPosition);
        
        if (item.unitOfMeasure) {
          doc.text(item.unitOfMeasure, 180, yPosition);
        }
        
        doc.text(this.formatCurrency(item.unitPrice), 250, yPosition);
        
        doc.text(this.formatCurrency(item.totalAmount), 320, yPosition);
        yPosition += 30;
      }
      
      doc.moveDown(50);
      resolve();
    });
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  /**
   * Format date
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US');
  }

  /**
   * Get company logo for PDF
   */
  private async getCompanyLogo(companyName: string): Promise<any> {
    try {
      const logoData = await this.configService.get('COMPANY_LOGO');
      if (logoData && logoData[companyName]) {
        return {
          type: 'url',
          url: logoData[companyName],
        };
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * Finalize PDF and return buffer
   */
  private async finalizePdf(doc: PDFDocument): Promise<Buffer> {
    return new Promise((resolve) => {
      doc.end();
      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => {
          buffers.push(chunk);
        });
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
      });
    });
    });
  }

  /**
   * Generate receipt PDF
   */
  async generateReceiptPdf(receiptData: any, options?: PdfGeneratorOptions): Promise<Buffer> {
    try {
      const doc = new PDFDocument({
        autoFirstPage: true,
        size: options?.format || 'A4',
        margins: options?.margin || {
          top: 30,
          bottom: 30,
          right: 30,
          left: 30,
        },
        bufferPages: true,
        info: {
          Title: 'Delivery Receipt',
          Author: 'TMS Platform',
          Subject: `Delivery Receipt - ${receiptData.shipmentNumber}`,
          Creator: 'TMS Platform v1.0',
        },
      });

      // Add receipt content
      doc.fontSize(16).font('Helvetica-Bold').text('DELIVERY RECEIPT', 50, 100);
      doc.text(`Shipment: ${receiptData.shipmentNumber || 'N/A'}`, 50, 150);
      doc.text(`Date: ${this.formatDate(new Date())}`, 50, 150);
      doc.text(`Driver: ${receiptData.driverName || 'N/A'}`, 50, 150);
      
      if (receiptData.notes) {
        doc.fontSize(10).font('Helvetica').fillColor('#666666');
        doc.text('Notes:', 50, 200);
        doc.text(receiptData.notes, 50, 250);
      }
      
      doc.end();
      
      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => {
          buffers.push(chunk);
        });
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
      });
    });
    } catch (error) {
      this.logger.error(`Failed to generate receipt PDF: ${error.message}`);
      throw error;
    }
  }
}