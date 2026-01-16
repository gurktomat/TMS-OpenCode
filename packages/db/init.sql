-- TMS Platform Database Initialization Script
-- PostgreSQL 15 - Core Tables with Foreign Keys and Indexes

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE company_type AS ENUM ('shipper', 'carrier', 'broker', '3pl');
CREATE TYPE shipment_status AS ENUM ('draft', 'tendered', 'accepted', 'in_transit', 'delivered', 'cancelled');
CREATE TYPE shipment_priority AS ENUM ('standard', 'expedited', 'urgent');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void');
CREATE TYPE document_type AS ENUM ('bol', 'pod', 'invoice', 'weight_ticket', 'photo');
CREATE TYPE event_type AS ENUM ('created', 'tendered', 'accepted', 'picked_up', 'in_transit', 'delivered', 'exception');

-- Create indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_shipments_search ON shipments USING gin(to_tsvector('english', reference_number || ' ' || bol_number || ' ' || commodity_description));

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role_id UUID NOT NULL,
    company_id UUID,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- Roles Table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies Table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type company_type NOT NULL,
    tax_id VARCHAR(50),
    mc_number VARCHAR(50),
    dot_number VARCHAR(50),
    address_id UUID,
    billing_address_id UUID,
    is_active BOOLEAN DEFAULT true,
    credit_limit DECIMAL(12, 2) DEFAULT 0.00,
    payment_terms INTEGER DEFAULT 30, -- days
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_companies_address FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL,
    CONSTRAINT fk_companies_billing_address FOREIGN KEY (billing_address_id) REFERENCES addresses(id) ON DELETE SET NULL
);

-- Addresses Table
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    street1 VARCHAR(255) NOT NULL,
    street2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'US',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Carriers Table
CREATE TABLE carriers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL,
    operating_authority VARCHAR(100),
    insurance_policy_number VARCHAR(100),
    insurance_expiration DATE,
    cargo_coverage DECIMAL(12, 2),
    liability_coverage DECIMAL(12, 2),
    equipment_types JSONB NOT NULL DEFAULT '[]',
    service_areas JSONB NOT NULL DEFAULT '[]',
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    is_approved BOOLEAN DEFAULT false,
    safety_rating VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_carriers_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    CONSTRAINT uk_carriers_company UNIQUE (company_id)
);

-- Shipments Table
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    bol_number VARCHAR(100),
    purchase_order_number VARCHAR(100),
    customer_id UUID NOT NULL,
    carrier_id UUID,
    status shipment_status NOT NULL DEFAULT 'draft',
    priority shipment_priority DEFAULT 'standard',
    
    -- Origin and Destination
    origin_address_id UUID NOT NULL,
    destination_address_id UUID NOT NULL,
    
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
    created_by UUID NOT NULL,
    assigned_to UUID,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_shipments_customer FOREIGN KEY (customer_id) REFERENCES companies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_shipments_carrier FOREIGN KEY (carrier_id) REFERENCES carriers(id) ON DELETE SET NULL,
    CONSTRAINT fk_shipments_origin FOREIGN KEY (origin_address_id) REFERENCES addresses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_shipments_destination FOREIGN KEY (destination_address_id) REFERENCES addresses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_shipments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_shipments_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_shipments_rate CHECK (quoted_rate > 0),
    CONSTRAINT chk_shipments_weight CHECK (weight > 0),
    CONSTRAINT chk_shipments_piece_count CHECK (piece_count > 0)
);

-- Shipment Events Table
CREATE TABLE shipment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL,
    event_type event_type NOT NULL,
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location_id UUID,
    description TEXT,
    metadata JSONB,
    created_by UUID,
    
    CONSTRAINT fk_shipment_events_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
    CONSTRAINT fk_shipment_events_location FOREIGN KEY (location_id) REFERENCES addresses(id) ON DELETE SET NULL,
    CONSTRAINT fk_shipment_events_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Shipment Documents Table
CREATE TABLE shipment_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL,
    document_type document_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by UUID NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_shipment_documents_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
    CONSTRAINT fk_shipment_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    shipment_id UUID NOT NULL,
    bill_to_company_id UUID NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status invoice_status DEFAULT 'draft',
    
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
    
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_invoices_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
    CONSTRAINT fk_invoices_bill_to_company FOREIGN KEY (bill_to_company_id) REFERENCES companies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uk_invoices_shipment UNIQUE (shipment_id),
    CONSTRAINT chk_invoices_total CHECK (total_amount > 0)
);

-- Audit Log Table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create Performance Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);

CREATE INDEX idx_companies_type ON companies(type);
CREATE INDEX idx_companies_is_active ON companies(is_active);
CREATE INDEX idx_companies_mc_number ON companies(mc_number) WHERE mc_number IS NOT NULL;

CREATE INDEX idx_addresses_postal_code ON addresses(postal_code);
CREATE INDEX idx_addresses_city_state ON addresses(city, state);
CREATE INDEX idx_addresses_location ON addresses USING gist (point(longitude, latitude)) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX idx_carriers_company_id ON carriers(company_id);
CREATE INDEX idx_carriers_is_approved ON carriers(is_approved);
CREATE INDEX idx_carriers_rating ON carriers(rating);
CREATE INDEX idx_carriers_equipment_types ON carriers USING gin(equipment_types);

CREATE INDEX idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX idx_shipments_carrier_id ON shipments(carrier_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_priority ON shipments(priority);
CREATE INDEX idx_shipments_pickup_window ON shipments(pickup_window_start, pickup_window_end);
CREATE INDEX idx_shipments_delivery_window ON shipments(delivery_window_start, delivery_window_end);
CREATE INDEX idx_shipments_created_by ON shipments(created_by);
CREATE INDEX idx_shipments_assigned_to ON shipments(assigned_to);
CREATE INDEX idx_shipments_created_at ON shipments(created_at);

CREATE INDEX idx_shipment_events_shipment_id ON shipment_events(shipment_id);
CREATE INDEX idx_shipment_events_timestamp ON shipment_events(event_timestamp);
CREATE INDEX idx_shipment_events_type ON shipment_events(event_type);

CREATE INDEX idx_shipment_documents_shipment_id ON shipment_documents(shipment_id);
CREATE INDEX idx_shipment_documents_type ON shipment_documents(document_type);
CREATE INDEX idx_shipment_documents_uploaded_at ON shipment_documents(uploaded_at);

CREATE INDEX idx_invoices_shipment_id ON invoices(shipment_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_bill_to_company_id ON invoices(bill_to_company_id);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Create Triggers for Updated Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carriers_updated_at BEFORE UPDATE ON carriers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security for GDPR/SOC2 Compliance
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create Functions for Reference Number Generation
CREATE OR REPLACE FUNCTION generate_shipment_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
        NEW.reference_number := 'TMS' || to_char(now(), 'YYYYMMDD') || '-' || 
                               LPAD(nextval('shipment_reference_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE shipment_reference_seq START 1;

CREATE TRIGGER generate_shipment_reference_trigger
    BEFORE INSERT ON shipments
    FOR EACH ROW EXECUTE FUNCTION generate_shipment_reference();

-- Create Function for Invoice Number Generation
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := 'INV' || to_char(now(), 'YYYYMMDD') || '-' || 
                              LPAD(nextval('invoice_number_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE invoice_number_seq START 1;

CREATE TRIGGER generate_invoice_number_trigger
    BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Create Views for Common Queries
CREATE VIEW shipment_summary AS
SELECT 
    s.id,
    s.reference_number,
    s.status,
    s.priority,
    s.created_at,
    c.name as customer_name,
    co.name as carrier_name,
    origin.city || ', ' || origin.state as origin_location,
    destination.city || ', ' || destination.state as destination_location,
    s.quoted_rate,
    s.actual_pickup,
    s.actual_delivery
FROM shipments s
LEFT JOIN companies c ON s.customer_id = c.id
LEFT JOIN carriers cr ON s.carrier_id = cr.id
LEFT JOIN companies co ON cr.company_id = co.id
LEFT JOIN addresses origin ON s.origin_address_id = origin.id
LEFT JOIN addresses destination ON s.destination_address_id = destination.id;

-- Grant permissions (adjust as needed for your application user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tms_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tms_user;

-- Log initialization completion
DO $$
BEGIN
    RAISE NOTICE 'TMS Platform database initialized successfully at %', now();
END $$;