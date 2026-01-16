// Import required entities for circular dependency resolution
import { CarrierEntity } from '../../carriers/entities/carrier.entity';

// Export all dispatch-related entities
export { DriverEntity, DriverStatus, LicenseType } from './driver.entity';
export { DispatchAssignmentEntity, DispatchStatus, DispatchType } from './dispatch-assignment.entity';
export { CarrierEntity } from '../../carriers/entities/carrier.entity';