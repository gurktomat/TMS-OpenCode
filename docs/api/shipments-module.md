# TMS Shipments Module Implementation

## Overview
Complete freight order lifecycle management with multi-tenant security, RBAC authorization, and SOC2-compliant audit logging.

## Features Implemented

### 📦 **Data Layer (Entities)**
- **ShipmentEntity**: Full PostgreSQL mapping with relations and indexes
- **LocationEntity**: Shipper/consignee locations with tenant isolation
- **AuditLogEntity**: SOC2-compliant audit trail for all data changes

### 🔄 **Multi-Tenancy Support**
- **Tenant Isolation**: All queries filtered by `tenant_id` from JWT
- **Indexed tenant_id**: Optimized for multi-tenant performance
- **Resource Validation**: Prevents cross-tenant data access
- **Company Guard**: Automatic tenant validation on all routes

### 🛡️ **Security & Validation**
- **RBAC Authorization**: Role-based endpoint protection
- **Input Validation**: Comprehensive class-validator rules
- **Date Validation**: Pickup must be before delivery
- **Tenant Validation**: All resources must belong to user's tenant

### 📊 **Business Logic**
- **Reference Numbers**: Auto-generated `L-2026-001` format
- **Status Management**: QUOTE → TENDERED → BOOKED → IN_TRANSIT → DELIVERED
- **Audit Logging**: Automatic SOC2 compliance for all actions
- **Transaction Safety**: Database transactions for data integrity

## API Endpoints

### Shipment Management
```typescript
POST   /shipments          - Create shipment (Admin/Dispatcher)
GET    /shipments          - List tenant shipments
GET    /shipments/stats     - Dashboard statistics
GET    /shipments/:id      - Get shipment by ID
PATCH  /shipments/:id      - Update shipment
DELETE /shipments/:id      - Cancel shipment (Admin/Dispatcher)
```

### Location Management
```typescript
POST   /shipments/locations        - Create location
GET    /shipments/locations        - List tenant locations
GET    /shipments/locations/:id    - Get location by ID
PATCH  /shipments/locations/:id    - Update location
DELETE /shipments/locations/:id    - Delete location
```

## Entity Schema

### ShipmentEntity
```typescript
{
  id: string,                    // UUID primary key
  referenceNumber: string,        // L-2026-001 (auto-generated)
  status: ShipmentStatus,          // QUOTE, TENDERED, BOOKED, etc.
  tenantId: string,              // Multi-tenancy
  customerId: string,             // Shipper company
  carrierId: string,              // Assigned carrier
  shipperLocationId: string,       // Origin
  consigneeLocationId: string,    // Destination
  equipmentType: EquipmentType,    // DRY_VAN, REEFER, FLATBED
  totalWeight: number,            // Weight in pounds
  totalPieces: number,            // Piece count
  quotedRate: number,             // Initial quote
  // ... additional fields
}
```

### LocationEntity
```typescript
{
  id: string,              // UUID primary key
  tenantId: string,        // Multi-tenancy
  name: string,            // Location name
  address: Address,        // Full address
  coordinates: Lat/Lng,    // GPS coordinates
  contactInfo: Contact,    // Contact details
  operatingHours: Hours,    // Business hours
  equipmentRestrictions: {}, // Equipment constraints
}
```

## Security Implementation

### Multi-Tenant Isolation
```typescript
// Automatic tenant filtering
.where('shipment.tenantId = :tenantId', { tenantId: user.companyId })

// Resource validation
const location = await this.locationsRepository.findOne({
  where: { id: dto.shipperLocationId, tenantId: user.companyId }
});
if (!location) {
  throw new ForbiddenException('Access denied');
}
```

### RBAC Authorization
```typescript
@Post('shipments')
@Roles('admin', 'dispatcher')          // Role-based
@Permissions('shipments:create')        // Permission-based
@UseGuards(JwtAuthGuard, RolesGuard)   // Security guards
async create() {
  // Only Admin/Dispatcher can create shipments
}
```

### Input Validation
```typescript
export class CreateShipmentDto {
  @IsDateString()
  pickupWindowStart: string;

  @IsDateString()
  deliveryWindowStart: string;

  @IsEnum(EquipmentType)
  equipmentType: EquipmentType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalWeight?: number;

  @IsInt()
  @Min(1)
  totalPieces?: number;
}
```

## Business Logic Flow

### Shipment Creation
1. **Validate Input**: Check DTO rules and business logic
2. **Tenant Validation**: Ensure all resources belong to tenant
3. **Date Validation**: Pickup must be before delivery
4. **Reference Generation**: Create unique L-YYYY-NNN number
5. **Database Transaction**: Save with audit logging
6. **Audit Log**: SOC2 compliance trail
7. **Return Response**: With all relations loaded

### Multi-Tenant Security
```typescript
async findAll(query: QueryShipmentsDto, user: User) {
  // Automatic tenant isolation
  return this.shipmentsRepository
    .createQueryBuilder('shipment')
    .where('shipment.tenantId = :tenantId', { tenantId: user.companyId })
    // ... additional filters
    .getMany();
}
```

### Audit Logging (SOC2)
```typescript
await this.logAction(
  queryRunner,
  user,
  'CREATE',
  'shipments',
  shipmentId,
  null,  // oldValues
    {    // newValues
    referenceNumber,
    status,
    customerId,
  }
);
```

## Usage Examples

### Create Shipment
```typescript
POST /shipments
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": "uuid-customer",
  "shipperLocationId": "uuid-origin",
  "consigneeLocationId": "uuid-destination",
  "equipmentType": "DRY_VAN",
  "totalWeight": 25000.50,
  "totalPieces": 24,
  "pickupWindowStart": "2024-01-17T08:00:00Z",
  "deliveryWindowStart": "2024-01-19T14:00:00Z"
}
```

### Response
```json
{
  "success": true,
  "message": "Shipment created successfully",
  "data": {
    "id": "uuid-shipment",
    "referenceNumber": "L-2026-001",
    "status": "QUOTE",
    "tenantId": "uuid-tenant",
    "customer": { "name": "Global Shipping Corp" },
    "shipperLocation": { "name": "Warehouse A" },
    "consigneeLocation": { "name": "Distribution Center" }
  }
}
```

### List Shipments with Filters
```typescript
GET /shipments?page=1&limit=20&status=QUOTE&equipmentType=DRY_VAN&sortOrder=DESC
Authorization: Bearer <token>
```

## Error Handling

### Security Errors
```json
{
  "success": false,
  "message": "Access denied: You can only access your company resources",
  "timestamp": "2024-01-16T10:00:00.000Z"
}
```

### Validation Errors
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "totalPieces",
      "messages": ["totalPieces must not be less than 1"],
      "value": 0
    }
  ]
}
```

## Performance Optimizations

### Database Indexes
```sql
-- Multi-tenant optimized indexes
CREATE INDEX idx_shipments_tenant_status ON shipments(tenantId, status);
CREATE INDEX idx_shipments_tenant_created ON shipments(tenantId, createdAt);
CREATE INDEX idx_locations_tenant_postal ON locations(tenantId, postalCode);
```

### Query Optimization
- Eager loading of relations
- Pagination for large datasets
- Indexed tenant filtering
- Connection pooling

This implementation provides enterprise-grade shipment management with proper security, multi-tenancy, and compliance features for TMS operations.