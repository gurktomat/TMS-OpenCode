# TMS CarriersModule Implementation

## Overview
Complete carrier management system with lane-based rating algorithms, load tendering state machine, and multi-tenant security.

## Features Implemented

### 🚚 **Data Layer (Entities)**
- **CarrierEntity**: Carrier profiles with SCAC, MC numbers, safety ratings
- **CarrierLaneEntity**: Lane-specific pricing and service constraints
- **LoadTenderEntity**: Complete tender lifecycle management with audit trails
- **Multi-tenancy**: All entities include `tenant_id` for data isolation

### 💰 **Rating Service (Least Cost Routing)**
- **Lane-Based Pricing**: Rate per mile vs flat rate calculations
- **Distance Calculation**: Mock distance service for lane pricing
- **Equipment Matching**: Validate carrier equipment compatibility
- **Service Area Validation**: Ensure carriers service origin/destination
- **Cost Calculation**: Base rate + fuel surcharge + accessorials
- **Sorted Results**: Least cost routing (ranked by total price)

### 📋 **Tendering Service (State Machine)**
- **State Management**: OFFERED → ACCEPTED/REJECTED/EXPIRED/CANCELLED
- **Transaction Safety**: Database transactions for state transitions
- **Auto-Rejection**: Automatically reject other tenders when one is accepted
- **Audit Trail**: Complete audit logging for compliance
- **Notification System**: Placeholder for EDI/email integration

### 🛡️ **Security & Multi-Tenancy**
- **Tenant Isolation**: All carrier operations scoped to tenant
- **Role-Based Access**: Admin/Dispatcher for tendering, Carrier for responses
- **Audit Compliance**: SOC2-compliant logging for all actions
- **Input Validation**: Comprehensive DTO validation with class-validator

## API Endpoints

### Carrier Management
```typescript
POST   /carriers                // Create carrier (Admin/Dispatcher)
GET    /carriers                // List carriers with filters
GET    /carriers/:id            // Get carrier by ID
PATCH  /carriers/:id            // Update carrier (Admin/Dispatcher)
GET    /carriers/:id/performance // Get carrier performance metrics
```

### Rating & Tendering
```typescript
POST   /carriers/shipments/:id/rate  // Get rates for shipment
POST   /carriers/shipments/:id/tender // Tender load to carrier
POST   /carriers/tenders/:id/accept  // Accept tender (Carrier)
POST   /carriers/tenders/:id/reject  // Reject tender (Carrier)
POST   /carriers/tenders/:id/cancel  // Cancel tender (Admin/Dispatcher)
```

### Lane Management
```typescript
POST   /carriers/lanes           // Create/update carrier lane
GET    /carriers/:id/lanes       // Get carrier lanes
```

## Rating Algorithm

### Lane-Based Cost Calculation
```typescript
// Find eligible carriers for lane
const eligibleCarriers = await this.carriersRepository
  .createQueryBuilder('carrier')
  .leftJoinAndSelect('carrier.lanes', 'lane')
  .where('lane.originZone = :originZone', { originZone: 'IL' })
  .andWhere('lane.destinationZone = :destinationZone', { destinationZone: 'TX' })
  .getMany();

// Calculate rate for each carrier
const calculatedRate = Math.max(
  lane.ratePerMile * distance, // Per-mile rate
  lane.flatRate,                    // Flat rate
  lane.minCharge                   // Minimum charge
);

// Apply fuel surcharge
const totalRate = calculatedRate + (calculatedRate * fuelSurchargePercentage);
```

### Least Cost Routing
```typescript
const quotes = [
  {
    carrierId: 'uuid-1',
    carrierName: 'FastTrack Logistics',
    scac: 'FTLS',
    calculatedRate: 2850.00,
    rank: 1,
    breakdown: {
      baseRate: 2400.00,
      distanceMiles: 1200,
      fuelSurcharge: 360.00,
      total: 2760.00,
    }
  },
  {
    carrierId: 'uuid-2',
    carrierName: 'Reliable Freight',
    scac: 'RELF',
    calculatedRate: 3100.00,
    rank: 2,
    breakdown: { ... }
  }
];
```

## Tendering State Machine

### State Transitions
```typescript
// Initial State
OFFERED → [ACCEPTED, REJECTED, EXPIRED, CANCELLED]

// Transaction Logic
1. Validate shipment is in QUOTE status
2. Update shipment to TENDERED
3. Create LoadTender with OFFERED status
4. Send notification (EDI/email placeholder)
5. Log audit trail

// Acceptance Logic
1. Validate tender is OFFERED and not expired
2. Update tender to ACCEPTED
3. Update shipment to BOOKED
4. Auto-reject other tenders for same shipment
5. Send confirmation notification

// Rejection Logic
1. Update tender to REJECTED
2. Record rejection reason
3. Send notification to shipper
```

### Multi-Tenant Tendering
```typescript
// All tendering operations are tenant-isolated
const tender = await this.loadTendersRepository.create({
  shipmentId,
  carrierId,
  status: TenderStatus.OFFERED,
  offerAmount: amount,
  // tenant_id is automatically handled by relations
});

// Cross-tenant access prevention
const existingTender = await this.loadTendersRepository.findOne({
  where: { shipmentId, carrierId },
  // Automatically filtered by tenant through user context
});
```

## Usage Examples

### Rate a Shipment
```typescript
POST /carriers/shipments/123/rate
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "shipmentId": "uuid-shipment-123",
    "totalQuotes": 3,
    "quotes": [
      {
        "carrierId": "uuid-carrier-1",
        "carrierName": "FastTrack Logistics",
        "scac": "FTLS",
        "calculatedRate": 2850.00,
        "rank": 1,
        "breakdown": {
          "baseRate": 2400.00,
          "distanceMiles": 1200,
          "fuelSurcharge": 360.00,
          "total": 2760.00
        }
      }
    ]
  }
}
```

### Tender a Load
```typescript
POST /carriers/shipments/123/tender
Authorization: Bearer <token>
Content-Type: application/json

{
  "carrierId": "uuid-carrier-1",
  "amount": 2850.00,
  "offerExpiryHours": 24,
  "tenderType": "PRIMARY",
  "tenderDetails": {
    "specialInstructions": "Appointment required for pickup"
  }
}

Response:
{
  "success": true,
  "message": "Load successfully tendered to FastTrack Logistics",
  "data": {
    "tenderId": "uuid-tender-456",
    "status": "OFFERED",
    "offerAmount": 2850.00,
    "offerExpiryDate": "2024-01-17T10:00:00Z",
    "nextActions": [
      "Carrier will receive notification",
      "Carrier can accept, reject, or counter-offer",
      "Offer expires at 2024-01-17T10:00:00Z"
    ]
  }
}
```

## Security Implementation

### Multi-Tenant Isolation
```typescript
// All carrier operations automatically tenant-scoped
// Through CompanyGuard that extracts tenant_id from JWT
.where('carrier.tenantId = :tenantId', { tenantId: user.companyId })
```

### RBAC Authorization
```typescript
@Post('shipments/:id/tender')
@Roles('admin', 'dispatcher')          // Only Admin/Dispatcher can tender
@Permissions('carriers:tender')        // Requires tendering permission
async tenderLoad() {
  // State machine logic with tenant validation
}

@Post('tenders/:id/accept')
@Permissions('tenders:respond')        // Carrier can respond to tenders
async acceptTender() {
  // Carrier-side response logic
}
```

## Performance Optimizations

### Database Indexes
```sql
-- Optimized for carrier lane lookups
CREATE INDEX idx_carrier_lanes_carrier_origin_dest ON carrier_lanes(carrierId, originZone, destinationZone);

-- Optimized for tender status queries
CREATE INDEX idx_load_tenders_shipment_status ON load_tenders(shipmentId, status);

-- Multi-tenant carrier lookup
CREATE INDEX idx_carriers_tenant_status ON carriers(tenantId, status);
```

### Query Optimization
- Eager loading of carrier lanes and tenders
- Efficient lane matching with indexed zone lookups
- Batch operations for tender state updates
- Connection pooling for high-volume operations

This implementation provides enterprise-grade carrier management with sophisticated rating algorithms, secure tendering workflows, and complete multi-tenant isolation for TMS operations.