# TMS TrackingModule Implementation

## Overview
Complete tracking system with GPS updates, geofencing, automated event triggering, and secure public tracking pages.

## Features Implemented

### 🛰️ **Data Layer (Entities)**
- **TrackingPingEntity**: GPS coordinates, speed, heading, location method
- **ShipmentEventEntity**: Complete event lifecycle with timestamps and photos
- **PublicShareTokenEntity**: Secure token-based public tracking with view counts
- **Multi-tenancy**: All entities include `tenant_id` for data isolation

### 🌍 **Geofencing Service (Haversine Algorithm)**
- **Distance Calculations**: Accurate distance between coordinates
- **Geofence Radius**: 500-meter automatic detection zones
- **Event Triggers**: ARRIVED_PICKUP at pickup, ARRIVED_DELIVERY at destination
- **ETA Calculation**: Speed-based arrival time estimation
- **Route Statistics**: Distance, speed, and duration analytics

### 📱 **Public Tracking (No JWT Required)**
- **Token Validation**: Secure UUID tokens with expiration
- **Sanitized Data**: Hides sensitive information (costs, driver details)
- **View Count Tracking**: Usage analytics per token
- **Professional UI**: Clean, customer-friendly tracking interface

### 🚚 **Driver App API (Protected)**
- **Location Updates**: Real-time GPS coordinate submission
- **Batch Updates**: Offline scenario support
- **Photo Uploads**: Pickup/delivery photos with metadata
- **Heartbeat Monitoring**: App health and device status
- **Assigned Shipments**: Driver's current and upcoming loads

### 🔄 **Automatic Trigger Logic**
```typescript
// If Distance < 500m AND Status is DISPATCHED → Auto-create ARRIVED_PICKUP
if (distanceToPickup <= geofenceRadiusMeters && shipment.status === DISPATCHED) {
  await this.createEvent('ARRIVED_PICKUP', 'Driver arrived at pickup location');
}

// If Distance < 500m AND Status is IN_TRANSIT → Auto-create ARRIVED_DELIVERY  
if (distanceToDelivery <= geofenceRadiusMeters && shipment.status === IN_TRANSIT) {
  await this.createEvent('ARRIVED_DELIVERY', 'Driver arrived at delivery location');
}

// ETA Calculation
const estimatedTimeSeconds = remainingDistance / (speed * 0.44704); // Convert mph to m/s
const eta = new Date(Date.now() + (estimatedTimeSeconds * 1000));
```

## API Endpoints

### Public Tracking (No Authentication)
```typescript
GET /tracking/track/:token      // Public tracking page
→ Returns sanitized shipment data (no costs, no sensitive info)
→ Updates view count and logs access
→ Secure token-based access control
```

### Driver App (JWT Protected)
```typescript
POST /driver-app/location           // Submit GPS coordinates
POST /driver-app/location/batch     // Batch location updates
POST /driver-app/photos           // Upload pickup/delivery photos
GET  /driver-app/shipments        // Get assigned shipments
GET  /driver-app/profile          // Driver profile and stats
POST /driver-app/heartbeat        // App health monitoring
```

### Internal Tracking (JWT Protected)
```typescript
GET /tracking/shipments/:id          // Complete tracking data
GET /tracking/shipments/:id/pings    // Raw GPS history
GET /tracking/shipments/:id/events    // Event timeline
GET /tracking/shipments/:id/statistics // Route analytics
POST /tracking/shipments/:id/events    // Manual event creation
GET /tracking/geofence/:id/check     // Manual geofence check
```

## Haversine Distance Calculation

### Algorithm Implementation
```typescript
private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = this.toRadians(lat2 - lat1);
  const dLon = this.toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}
```

## Public Tracking Experience

### Customer-Friendly Interface
```typescript
// GET /tracking/track/uuid-token-123
{
  "success": true,
  "data": {
    "shipment": {
      "referenceNumber": "L-2026-001",
      "status": "IN_TRANSIT",
      "origin": { "city": "Chicago", "state": "IL" },
      "destination": { "city": "Dallas", "state": "TX" },
      "currentLocation": {
        "latitude": 41.8781,
        "longitude": -87.6298,
        "address": "123 Main St, Dallas, TX",
        "timestamp": "2024-01-16T15:30:00Z"
      },
      "estimatedTimeOfArrival": "2024-01-17T18:45:00Z",
      "events": [
        {
          "eventType": "ARRIVED_PICKUP",
          "description": "Driver arrived at pickup location",
          "occurredAt": "2024-01-16T10:30:00Z",
          "location": "Chicago, IL"
        }
      ]
    }
  }
}
```

### Driver App Experience
```typescript
// POST /driver-app/location
{
  "latitude": 41.8781,
  "longitude": -87.6298,
  "speed": 65.5,
  "shipmentId": "uuid-shipment-123"
}

Response:
{
  "success": true,
  "data": {
    "geofenceResult": {
      "triggeredEvents": ["ARRIVED_PICKUP"],
      "distanceToDelivery": 120000,
      "estimatedTimeOfArrival": "2024-01-17T18:45:00Z"
    }
  }
}
```

## Security & Multi-Tenancy

### Public Access Control
```typescript
// Token validation with expiration
const token = await this.shareTokensRepository.findOne({
  where: { 
    token, 
    expiresAt: MoreThanOrEqual(new Date()),
    isActive: true 
  },
});

// Sanitized data output (no sensitive information)
return {
  shipment: {
    referenceNumber: shipment.referenceNumber,
    status: shipment.status,
    // NO: quotedRate, actualRate, carrier costs
    // NO: driver personal information
  }
};
```

### Driver App Security
```typescript
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, CompanyGuard)
// Protected endpoints require authentication and proper permissions

// Additional token validation
const appToken = headers['x-driver-app-token'];
if (!appToken) {
  throw new Error('Driver app token required');
}
```

This implementation provides enterprise-grade tracking with real-time GPS updates, intelligent geofencing, secure public access, and comprehensive driver app functionality for TMS operations.