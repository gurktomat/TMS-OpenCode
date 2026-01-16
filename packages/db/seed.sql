-- TMS Platform Database Seed Script
-- Initial data for development and testing

-- Insert System Roles
INSERT INTO roles (id, name, description, permissions, is_system_role) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin', 'System Administrator with full access', '["*"]', true),
('550e8400-e29b-41d4-a716-446655440002', 'dispatcher', 'Operations Dispatcher managing shipments and carriers', '["shipments:*", "carriers:read", "customers:read", "documents:read", "tracking:read"]', true),
('550e8400-e29b-41d4-a716-446655440003', 'driver', 'Carrier Driver with limited access', '["shipments:read_assigned", "shipments:update_status", "documents:upload", "tracking:update"]', true),
('550e8400-e29b-41d4-a716-446655440004', 'customer', 'Shipper Customer with self-service access', '["shipments:read_own", "invoices:read_own", "documents:read_own"]', true);

-- Insert Addresses
INSERT INTO addresses (id, street1, city, state, postal_code, country, latitude, longitude) VALUES
('660e8400-e29b-41d4-a716-446655440001', '123 Main Street', 'Chicago', 'IL', '60601', 'US', 41.8781, -87.6298),
('660e8400-e29b-41d4-a716-446655440002', '456 Oak Avenue', 'Los Angeles', 'CA', '90210', 'US', 34.0522, -118.2437),
('660e8400-e29b-41d4-a716-446655440003', '789 Industrial Blvd', 'Dallas', 'TX', '75201', 'US', 32.7767, -96.7970),
('660e8400-e29b-41d4-a716-446655440004', '321 Commerce St', 'New York', 'NY', '10001', 'US', 40.7128, -74.0060),
('660e8400-e29b-41d4-a716-446655440005', '555 Logistics Way', 'Atlanta', 'GA', '30301', 'US', 33.7490, -84.3880);

-- Insert Companies
INSERT INTO companies (id, name, type, tax_id, mc_number, dot_number, address_id, billing_address_id, is_active, credit_limit, payment_terms) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'Global Shipping Corporation', 'shipper', '12-3456789', NULL, NULL, '660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', true, 500000.00, 30),
('770e8400-e29b-41d4-a716-446655440002', 'FastTrack Logistics LLC', 'carrier', '98-7654321', 'MC123456', 'DOT789012', '660e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', true, 100000.00, 15),
('770e8400-e29b-41d4-a716-446655440003', 'Reliable Freight Inc', 'carrier', '45-6789012', 'MC987654', 'DOT345678', '660e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', true, 75000.00, 30),
('770e8400-e29b-41d4-a716-446655440004', 'Freight Brokers Inc', 'broker', '33-1112222', NULL, NULL, '660e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440004', true, 250000.00, 45);

-- Insert Carriers
INSERT INTO carriers (id, company_id, operating_authority, insurance_policy_number, insurance_expiration, cargo_coverage, liability_coverage, equipment_types, service_areas, rating, is_approved, safety_rating) VALUES
('880e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440002', 'MC-123456 (Property)', 'POL-FT-2024-001', '2024-12-31', 1000000.00, 750000.00, '["dry_van", "reefer", "flatbed"]', '["midwest", "southeast", "northeast"]', 4.5, true, 'Satisfactory'),
('880e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440003', 'MC-987654 (Property)', 'POL-RF-2024-002', '2024-11-30', 750000.00, 500000.00, '["dry_van", "reefer"]', '["southwest", "west", "mountain"]', 4.2, true, 'Satisfactory');

-- Insert Test Users
-- Note: In production, use proper password hashing (bcrypt, argon2, etc.)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role_id, company_id, is_active, email_verified, created_at) VALUES
('990e8400-e29b-41d4-a716-446655440001', 'admin@tms-platform.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'System', 'Administrator', '+1-555-0100', '550e8400-e29b-41d4-a716-446655440001', NULL, true, true, CURRENT_TIMESTAMP),
('990e8400-e29b-41d4-a716-446655440002', 'john.smith@globalshipping.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'John', 'Smith', '+1-555-0101', '550e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440001', true, true, CURRENT_TIMESTAMP),
('990e8400-e29b-41d4-a716-446655440003', 'sarah.johnson@fasttrack.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Sarah', 'Johnson', '+1-555-0102', '550e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', true, true, CURRENT_TIMESTAMP),
('990e8400-e29b-41d4-a716-446655440004', 'mike.wilson@reliablefreight.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Mike', 'Wilson', '+1-555-0103', '550e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', true, true, CURRENT_TIMESTAMP);

-- Insert Sample Shipments
INSERT INTO shipments (
    id, reference_number, bol_number, purchase_order_number, customer_id, carrier_id, status, priority,
    origin_address_id, destination_address_id, pickup_window_start, pickup_window_end, delivery_window_start, delivery_window_end,
    equipment_type, weight, piece_count, commodity_description, hazardous_material, quoted_rate, fuel_surcharge, accessorial_charges,
    created_by, notes
) VALUES
('a01e8400-e29b-41d4-a716-446655440001', 'TMS20240116-0001', 'BOL-001', 'PO-GLS-001', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 'accepted', 'standard',
 '660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002', '2024-01-17 08:00:00', '2024-01-17 12:00:00', '2024-01-19 14:00:00', '2024-01-19 18:00:00',
 'dry_van', 25000.50, 24, 'Electronics and computer equipment', false, 1850.00, 150.00, 75.00,
 '990e8400-e29b-41d4-a716-446655440002', 'Standard LTL shipment with fragile electronics. Handle with care.'),

('a01e8400-e29b-41d4-a716-446655440002', 'TMS20240116-0002', 'BOL-002', 'PO-GLS-002', '770e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440002', 'tendered', 'expedited',
 '660e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440004', '2024-01-16 14:00:00', '2024-01-16 18:00:00', '2024-01-17 10:00:00', '2024-01-17 14:00:00',
 'reefer', 18000.75, 18, 'Frozen food products - maintain temperature below 0°F', false, 2200.00, 200.00, 100.00,
 '990e8400-e29b-41d4-a716-446655440002', 'Expedited refrigerated shipment. Temperature critical.'),

('a01e8400-e29b-41d4-a716-446655440003', 'TMS20240116-0003', 'BOL-003', 'PO-GLS-003', '770e8400-e29b-41d4-a716-446655440001', NULL, 'draft', 'standard',
 '660e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440005', '2024-01-18 06:00:00', '2024-01-18 10:00:00', '2024-01-20 16:00:00', '2024-01-20 20:00:00',
 'flatbed', 35000.00, 12, 'Construction materials and steel beams', false, 2800.00, 250.00, 125.00,
 '990e8400-e29b-41d4-a716-446655440002', 'Flatbed shipment requiring tarps and securement.');

-- Insert Shipment Events
INSERT INTO shipment_events (id, shipment_id, event_type, event_timestamp, location_id, description, created_by) VALUES
('b01e8400-e29b-41d4-a716-446655440001', 'a01e8400-e29b-41d4-a716-446655440001', 'created', '2024-01-16 09:00:00', '660e8400-e29b-41d4-a716-446655440001', 'Shipment created and entered into system', '990e8400-e29b-41d4-a716-446655440002'),
('b01e8400-e29b-41d4-a716-446655440002', 'a01e8400-e29b-41d4-a716-446655440001', 'tendered', '2024-01-16 10:30:00', '660e8400-e29b-41d4-a716-446655440001', 'Tendered to FastTrack Logistics', '990e8400-e29b-41d4-a716-446655440002'),
('b01e8400-e29b-41d4-a716-446655440003', 'a01e8400-e29b-41d4-a716-446655440001', 'accepted', '2024-01-16 11:15:00', '660e8400-e29b-41d4-a716-446655440002', 'Carrier accepted shipment', '990e8400-e29b-41d4-a716-446655440003'),

('b01e8400-e29b-41d4-a716-446655440004', 'a01e8400-e29b-41d4-a716-446655440002', 'created', '2024-01-16 12:00:00', '660e8400-e29b-41d4-a716-446655440003', 'Expedited shipment created', '990e8400-e29b-41d4-a716-446655440002'),
('b01e8400-e29b-41d4-a716-446655440005', 'a01e8400-e29b-41d4-a716-446655440002', 'tendered', '2024-01-16 13:00:00', '660e8400-e29b-41d4-a716-446655440003', 'Tendered to Reliable Freight Inc', '990e8400-e29b-41d4-a716-446655440002'),

('b01e8400-e29b-41d4-a716-446655440006', 'a01e8400-e29b-41d4-a716-446655440003', 'created', '2024-01-16 15:00:00', '660e8400-e29b-41d4-a716-446655440004', 'Flatbed shipment created - awaiting carrier assignment', '990e8400-e29b-41d4-a716-446655440002');

-- Insert Sample Documents
INSERT INTO shipment_documents (id, shipment_id, document_type, file_name, file_path, file_size, mime_type, uploaded_by) VALUES
('c01e8400-e29b-41d4-a716-446655440001', 'a01e8400-e29b-41d4-a716-446655440001', 'bol', 'BOL-TMS20240116-0001.pdf', '/documents/shipments/a01e8400-e29b-41d4-a716-446655440001/bol.pdf', 245760, 'application/pdf', '990e8400-e29b-41d4-a716-446655440002'),
('c01e8400-e29b-41d4-a716-446655440002', 'a01e8400-e29b-41d4-a716-446655440002', 'bol', 'BOL-TMS20240116-0002.pdf', '/documents/shipments/a01e8400-e29b-41d4-a716-446655440002/bol.pdf', 198656, 'application/pdf', '990e8400-e29b-41d4-a716-446655440002'),
('c01e8400-e29b-41d4-a716-446655440003', 'a01e8400-e29b-41d4-a716-446655440001', 'weight_ticket', 'Weight-Ticket-001.jpg', '/documents/shipments/a01e8400-e29b-41d4-a716-446655440001/weight.jpg', 524288, 'image/jpeg', '990e8400-e29b-41d4-a716-446655440003');

-- Insert Sample Invoices
INSERT INTO invoices (
    id, invoice_number, shipment_id, bill_to_company_id, invoice_date, due_date, status,
    base_amount, fuel_surcharge, accessorials, total_amount, tax_amount,
    created_by
) VALUES
('d01e8400-e29b-41d4-a716-446655440001', 'INV20240116-0001', 'a01e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', '2024-01-16', '2024-02-15', 'sent',
 1850.00, 150.00, 75.00, 2075.00, 0.00,
 '990e8400-e29b-41d4-a716-446655440002'),

('d01e8400-e29b-41d4-a716-446655440002', 'INV20240116-0002', 'a01e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', '2024-01-16', '2024-02-15', 'draft',
 2200.00, 200.00, 100.00, 2500.00, 0.00,
 '990e8400-e29b-41d4-a716-446655440002');

-- Insert Audit Log Entries
INSERT INTO audit_logs (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) VALUES
('e01e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440002', 'INSERT', 'shipments', 'a01e8400-e29b-41d4-a716-446655440001', NULL, '{"reference_number": "TMS20240116-0001", "status": "draft"}', '127.0.0.1', 'TMS-Backend/1.0'),
('e01e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440002', 'UPDATE', 'shipments', 'a01e8400-e29b-41d4-a716-446655440001', '{"status": "draft"}', '{"status": "tendered"}', '127.0.0.1', 'TMS-Backend/1.0'),
('e01e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440003', 'UPDATE', 'shipments', 'a01e8400-e29b-41d4-a716-446655440001', '{"status": "tendered"}', '{"status": "accepted"}', '127.0.0.1', 'TMS-Backend/1.0');

-- Create sequences for reference numbers (if not exists)
SELECT setval('shipment_reference_seq', 3, true);
SELECT setval('invoice_number_seq', 2, true);

-- Update statistics for better query performance
ANALYZE;

-- Log seeding completion
DO $$
BEGIN
    RAISE NOTICE 'TMS Platform database seeded successfully at %', now();
    RAISE NOTICE 'Created % users, % companies, % carriers, % shipments', 
        (SELECT COUNT(*) FROM users),
        (SELECT COUNT(*) FROM companies),
        (SELECT COUNT(*) FROM carriers),
        (SELECT COUNT(*) FROM shipments);
END $$;