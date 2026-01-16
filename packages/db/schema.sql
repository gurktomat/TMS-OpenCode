-- TMS Platform Database Schema
-- PostgreSQL Schema for Core Tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role_id UUID NOT NULL REFERENCES roles(id),
    company_id UUID REFERENCES companies(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles Table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies Table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'shipper', 'carrier', 'broker', '3pl'
    tax_id VARCHAR(50),
    mc_number VARCHAR(50),
    dot_number VARCHAR(50),
    address_id UUID REFERENCES addresses(id),
    billing_address_id UUID REFERENCES addresses(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Addresses Table
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    street1 VARCHAR(255) NOT NULL,
    street2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carriers Table
CREATE TABLE carriers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    operating_authority VARCHAR(100),
    insurance_policy_number VARCHAR(100),
    insurance_expiration DATE,
    cargo_coverage DECIMAL(12, 2),
    liability_coverage DECIMAL(12, 2),
    equipment_types JSONB NOT NULL DEFAULT '[]', -- ['dry_van', 'reefer', 'flatbed']
    service_areas JSONB NOT NULL DEFAULT '[]', -- ['northeast', 'midwest']
    rating DECIMAL(3, 2) DEFAULT 0.00,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipments Table
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    bol_number VARCHAR(100),
    purchase_order_number VARCHAR(100),
    customer_id UUID NOT NULL REFERENCES companies(id),
    carrier_id UUID REFERENCES carriers(id),
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'tendered', 'accepted', 'in_transit', 'delivered', 'cancelled'
    priority VARCHAR(20) DEFAULT 'standard', -- 'standard', 'expedited', 'urgent'
    
    -- Origin and Destination
    origin_address_id UUID NOT NULL REFERENCES addresses(id),
    destination_address_id UUID NOT NULL REFERENCES addresses(id),
    
    -- Timing
    pickup_window_start TIMESTAMP,
    pickup_window_end TIMESTAMP,
    delivery_window_start TIMESTAMP,
    delivery_window_end TIMESTAMP,
    actual_pickup TIMESTAMP,
    actual_delivery TIMESTAMP,
    
    -- Cargo Details
    equipment_type VARCHAR(50) NOT NULL,
    weight DECIMAL(10, 2),
    volume DECIMAL(10, 2),
    piece_count INTEGER,
    commodity_description TEXT,
    hazardous_material BOOLEAN DEFAULT false,
    temperature_requirements JSONB,
    
    -- Financial
    quoted_rate DECIMAL(10, 2),
    actual_rate DECIMAL(10, 2),
    fuel_surcharge DECIMAL(10, 2) DEFAULT 0.00,
    accessorial_charges DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipment Events Table
CREATE TABLE shipment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id),
    event_type VARCHAR(50) NOT NULL, -- 'created', 'tendered', 'accepted', 'picked_up', 'in_transit', 'delivered', 'exception'
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location_id UUID REFERENCES addresses(id),
    description TEXT,
    metadata JSONB,
    created_by UUID REFERENCES users(id)
);

-- Shipment Documents Table
CREATE TABLE shipment_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id),
    document_type VARCHAR(50) NOT NULL, -- 'bol', 'pod', 'invoice', 'weight_ticket', 'photo'
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    shipment_id UUID NOT NULL REFERENCES shipments(id),
    bill_to_company_id UUID NOT NULL REFERENCES companies(id),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'sent', 'paid', 'overdue', 'void'
    
    -- Financial Details
    base_amount DECIMAL(10, 2) NOT NULL,
    fuel_surcharge DECIMAL(10, 2) DEFAULT 0.00,
    accessorials DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Payment Details
    payment_method VARCHAR(50),
    payment_date TIMESTAMP,
    transaction_id VARCHAR(100),
    
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX idx_shipments_carrier_id ON shipments(carrier_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_pickup_window ON shipments(pickup_window_start, pickup_window_end);
CREATE INDEX idx_shipment_events_shipment_id ON shipment_events(shipment_id);
CREATE INDEX idx_shipment_events_timestamp ON shipment_events(event_timestamp);
CREATE INDEX idx_invoices_shipment_id ON invoices(shipment_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Row Level Security (RLS) for GDPR/SOC2 Compliance
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Sample Data for Roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'System Administrator', '["*"]'),
('dispatcher', 'Operations Dispatcher', '["shipments:*", "carriers:read", "customers:read"]'),
('driver', 'Carrier Driver', '["shipments:read", "shipments:update_status"]'),
('customer', 'Shipper Customer', '["shipments:read_own", "invoices:read_own"]');

-- Sample Data for Companies
INSERT INTO companies (name, type, tax_id) VALUES
('Global Shipping Corp', 'shipper', '12-3456789'),
('FastTrack Logistics', 'carrier', '98-7654321'),
('Freight Brokers Inc', 'broker', '45-6789012');