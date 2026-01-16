# TMS Platform - Local Development Setup Guide

## Quick Start

### 1. Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Update database passwords, JWT secrets, and AWS credentials
```

### 2. Start Development Environment
```bash
# Start all services (backend, database, Redis)
docker-compose up -d

# View logs
docker-compose logs -f tms-backend

# Stop services
docker-compose down
```

### 3. Database Access
- **PostgreSQL**: `localhost:5432`
- **Username**: `tms_user`
- **Password**: `tms_secure_password`
- **Database**: `tms_platform`

### 4. Redis Access
- **Host**: `localhost:6379`
- **Password**: `redis_secure_password`

### 5. Admin Panel (Optional)
```bash
# Start with pgAdmin for database management
docker-compose --profile admin up -d

# Access pgAdmin at: http://localhost:5050
# Email: admin@tms-platform.com
# Password: admin123
```

## Service Endpoints

### Backend API
- **URL**: `http://localhost:3000`
- **Health Check**: `http://localhost:3000/health`
- **API Documentation**: `http://localhost:3000/docs`

### Frontend (Optional)
```bash
# Start frontend development server
docker-compose --profile frontend up -d

# Access at: http://localhost:3001
```

## Default Credentials

### System Admin User
- **Email**: `admin@tms-platform.com`
- **Password**: `admin123` (change in production)

### Test Users
- **Customer**: `john.smith@globalshipping.com`
- **Dispatcher**: `sarah.johnson@fasttrack.com`
- **Driver**: `mike.wilson@reliablefreight.com`

## Database Schema

The database is automatically initialized with:
- 12 core tables with proper relationships
- Foreign key constraints and indexes
- Row Level Security (RLS) enabled
- Sample data for testing

### Key Tables
- `users` - User accounts and authentication
- `companies` - Customer and carrier organizations
- `carriers` - Carrier-specific information
- `shipments` - Transportation orders
- `shipment_events` - Tracking and status updates
- `invoices` - Financial billing
- `audit_logs` - Security and compliance logging

## Development Workflow

### 1. Code Changes
```bash
# Backend hot reload is enabled
# Changes to apps/backend/ will automatically restart the service
```

### 2. Database Changes
```bash
# Create new migration
# Add to packages/db/migrations/

# Apply changes
docker-compose exec tms-db psql -U tms_user -d tms_platform -f your-migration.sql
```

### 3. Testing
```bash
# Run tests
npm test

# Run specific service tests
npm run test --workspace=apps/backend
```

## Security Configuration

### JWT Setup
1. Update `JWT_SECRET` in `.env` with a secure 32+ character string
2. Configure `JWT_ISSUER` and `JWT_AUDIENCE` for your environment
3. Set appropriate token expiration times

### Database Security
- Change default passwords in production
- Enable SSL connections
- Configure proper user permissions
- Set up regular backups

### AWS Integration
1. Configure AWS credentials with appropriate IAM roles
2. Set up S3 bucket for document storage
3. Configure SES for email notifications
4. Enable CloudWatch for monitoring

## Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check database status
docker-compose ps tms-db

# View database logs
docker-compose logs tms-db

# Restart database
docker-compose restart tms-db
```

**Backend Service Not Starting**
```bash
# Check backend logs
docker-compose logs tms-backend

# Verify environment variables
docker-compose exec tms-backend env | grep -E "(DB_|REDIS_|JWT_)"

# Restart backend
docker-compose restart tms-backend
```

**Redis Connection Issues**
```bash
# Test Redis connection
docker-compose exec tms-redis redis-cli ping

# Check Redis logs
docker-compose logs tms-redis
```

### Port Conflicts
If ports are already in use, modify `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change to different host port
```

### Performance Issues
- Increase Docker memory allocation
- Check database connection pool settings
- Monitor Redis memory usage
- Enable query logging for slow queries

## Production Deployment

### Environment Changes
1. Set `NODE_ENV=production`
2. Enable SSL/TLS certificates
3. Configure proper domain names
4. Set up load balancer
5. Enable monitoring and alerting

### Security Checklist
- [ ] Change all default passwords
- [ ] Enable database encryption
- [ ] Configure firewall rules
- [ ] Set up backup procedures
- [ ] Enable audit logging
- [ ] Test disaster recovery

### Scaling
- Use Kubernetes for container orchestration
- Configure horizontal pod autoscaling
- Set up read replicas for database
- Implement Redis clustering
- Add CDN for static assets

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review service logs for error details
3. Consult the API documentation
4. Check the GitHub issues page