# TMS Platform - Enterprise Transportation Management System

## Overview
A scalable, secure, SaaS-based Transportation Management System built with modern microservices architecture.

## Technology Stack

### Frontend
- **React.js** with TypeScript
- **Redux Toolkit** for state management
- **Material UI** for component library
- **React Router** for navigation

### Backend
- **Node.js** with Express/NestJS
- **TypeScript** for type safety
- **PostgreSQL** for relational data
- **MongoDB** for logs/tracking data
- **Redis** for caching and sessions

### Infrastructure
- **Docker** containers
- **Kubernetes** orchestration
- **AWS** cloud services
- **GitHub Actions** CI/CD

## Security Features
- OAuth2/OIDC authentication
- Granular RBAC authorization
- AES-256 encryption at rest
- TLS 1.3 encryption in transit
- GDPR & SOC2 compliance
- Comprehensive audit logging

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development environment
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

## Project Structure
```
tms-platform/
├── apps/                    # Microservices
│   ├── frontend/           # React application
│   ├── backend/            # API gateway
│   ├── auth-service/       # Authentication service
│   ├── order-service/      # Order management
│   ├── tracking-service/   # Real-time tracking
│   └── billing-service/    # Financial management
├── packages/              # Shared libraries
│   ├── shared/            # Common utilities
│   ├── types/             # TypeScript definitions
│   ├── utils/             # Helper functions
│   ├── config/            # Configuration
│   └── db/                # Database schemas
├── tools/                 # Development tools
├── docs/                  # Documentation
└── tests/                 # Test suites
```

## Core Features

### 🚚 Order Management
- API/EDI ingestion
- Manual order entry
- Order consolidation
- Custom workflows

### 🗺️ Planning & Optimization
- Route optimization algorithms
- Load planning
- Carrier selection (Least Cost Routing)
- Capacity management

### 📦 Execution
- Automated carrier tendering
- Digital booking
- Shipping label generation
- Document management

### 👁️ Visibility
- Real-time tracking integration
- Geofencing capabilities
- Status notifications
- Customer portal

### 💰 Financials
- Freight audit & payment
- Automated invoicing
- Multi-currency support
- Cost analysis

### ⚙️ Administration
- User management
- Carrier onboarding
- Customer management
- System configuration

## API Documentation
See [API Roadmap](docs/api/api-roadmap.md) for detailed endpoint specifications and implementation priorities.

## Database Schema
Refer to [Database ERD](docs/architecture/database-erd.md) for complete entity relationships and security considerations.

## Security Implementation
The security middleware provides:
- JWT token validation
- Role-based access control
- Company data isolation
- Rate limiting
- Input validation
- Comprehensive audit logging

## Development Guidelines
- Follow TypeScript strict mode
- Use ESLint and Prettier for code quality
- Write unit tests for all business logic
- Implement proper error handling
- Maintain security best practices
- Document all public APIs

## Deployment
The application is containerized and ready for Kubernetes deployment with:
- Horizontal pod autoscaling
- Load balancing
- Health checks
- Rolling updates
- Blue-green deployments

## License
Enterprise License - All rights reserved