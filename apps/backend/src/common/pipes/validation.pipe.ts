import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * Custom validation pipe with enhanced error handling and security
 */
export class GlobalValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true, // Remove properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted values are provided
      transform: true, // Transform payloads to be objects typed according to their DTO classes
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
      },
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        // Custom error formatting to prevent information leakage
        const errors = this.formatErrors(validationErrors);
        
        return new BadRequestException({
          message: 'Validation failed',
          errors: errors,
          timestamp: new Date().toISOString(),
        });
      },
    });
  }

  /**
   * Format validation errors for consistent response
   */
  private formatErrors(errors: ValidationError[]): any[] {
    return errors.map(error => {
      const constraints = error.constraints;
      const messages = constraints ? Object.values(constraints) : [];
      
      return {
        field: error.property,
        messages: messages,
        value: error.value,
      };
    });
  }
}