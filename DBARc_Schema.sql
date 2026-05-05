-- =============================================================================
-- DBARc PostgreSQL Schema - Comprehensive Build
-- Multi-Tenant Courier SaaS with 3PL, Hubs, Rider Management, and Tax Engine
-- Date: April 25, 2026
-- =============================================================================
CREATE DATABASE dbarc_db;
-- Enable UUID and GIS extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- -----------------------------------------------------------------------------
-- 0. Global Types & Enums
-- -----------------------------------------------------------------------------
CREATE TYPE tenant_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE billing_type AS ENUM ('commission', 'lumpsum');
CREATE TYPE pak_province AS ENUM ('Federal', 'Punjab', 'Sindh', 'KPK', 'Balochistan');
CREATE TYPE parcel_status AS ENUM ('created', 'picked', 'in_hub', 'in_transit', 'delivered', 'failed', 'returned');
CREATE TYPE rider_status AS ENUM ('active', 'on_leave', 'suspended');
CREATE TYPE settlement_status AS ENUM ('calculated', 'approved', 'processing', 'paid', 'disputed');

-- -----------------------------------------------------------------------------
-- 1. SaaS & Multi-Tenancy Core
-- -----------------------------------------------------------------------------

CREATE TABLE tenants (
    tenant_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    plan_id UUID,
    platform_commission_pct NUMERIC DEFAULT 2.0 CHECK (platform_commission_pct >= 0),
    status tenant_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE TABLE tenant_plans (
    plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    features JSONB,
    limits JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE role_definitions (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    role_name TEXT NOT NULL,
    permissions JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(user_id),
    role_id UUID REFERENCES role_definitions(role_id),
    PRIMARY KEY (user_id, role_id)
);

-- -----------------------------------------------------------------------------
-- 2. Courier, Shipper & Regions
-- -----------------------------------------------------------------------------

CREATE TABLE regions (
    region_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES regions(region_id),
    name TEXT NOT NULL,
    type TEXT, -- 'country', 'state', 'city', 'zone'
    geo_polygon GEOGRAPHY(POLYGON)
);

CREATE TABLE couriers (
    courier_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    name TEXT NOT NULL,
    contact_info JSONB,
    api_enabled BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shippers (
    shipper_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    courier_id UUID NOT NULL REFERENCES couriers(courier_id),
    name TEXT NOT NULL,
    business_type TEXT,
    api_key TEXT UNIQUE,
    webhook_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. Hub & Inventory Operations
-- -----------------------------------------------------------------------------

CREATE TABLE hubs (
    hub_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    name TEXT NOT NULL,
    hub_type TEXT, -- 'pickup', 'sorting', 'delivery'
    address TEXT,
    geo_location GEOGRAPHY(POINT),
    capacity_weight NUMERIC,
    status TEXT DEFAULT 'active'
);

CREATE TABLE bags (
    bag_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    bag_number TEXT UNIQUE NOT NULL,
    from_hub_id UUID REFERENCES hubs(hub_id),
    to_hub_id UUID REFERENCES hubs(hub_id),
    parcel_count INT DEFAULT 0,
    status TEXT DEFAULT 'open',
    sealed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. Parcel & Logistics Domain
-- -----------------------------------------------------------------------------

CREATE TABLE parcels (
    parcel_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    courier_id UUID NOT NULL REFERENCES couriers(courier_id),
    shipper_id UUID NOT NULL REFERENCES shippers(shipper_id),
    tracking_number TEXT NOT NULL UNIQUE,
    sku TEXT,
    status parcel_status NOT NULL DEFAULT 'created',
    cod_amount NUMERIC DEFAULT 0,
    weight NUMERIC NOT NULL,
    delivery_charges NUMERIC NOT NULL,
    origin_region_id UUID REFERENCES regions(region_id),
    destination_region_id UUID REFERENCES regions(region_id),
    is_ecommerce BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parcel_hub_movements (
    movement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id),
    from_hub_id UUID REFERENCES hubs(hub_id),
    to_hub_id UUID REFERENCES hubs(hub_id),
    bag_id UUID REFERENCES bags(bag_id),
    moved_by UUID NOT NULL REFERENCES users(user_id),
    moved_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pickup_requests (
    pickup_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    shipper_id UUID NOT NULL REFERENCES shippers(shipper_id),
    requested_date DATE NOT NULL,
    time_slot_id UUID,
    parcel_count INT,
    status TEXT DEFAULT 'requested',
    created_at TIMESTAMP DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. Rider & Last Mile
-- -----------------------------------------------------------------------------

CREATE TABLE riders (
    rider_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    courier_id UUID NOT NULL REFERENCES couriers(courier_id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    salary_type TEXT DEFAULT 'per_parcel',
    commission_per_parcel NUMERIC DEFAULT 0,
    base_salary NUMERIC DEFAULT 0,
    current_location GEOGRAPHY(POINT),
    is_available BOOLEAN DEFAULT TRUE,
    max_capacity_weight NUMERIC,
    status rider_status DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE rider_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID NOT NULL REFERENCES riders(rider_id),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    status TEXT DEFAULT 'assigned'
);

CREATE TABLE delivery_attempts (
    attempt_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id),
    rider_id UUID NOT NULL REFERENCES riders(rider_id),
    attempt_time TIMESTAMP DEFAULT NOW(),
    status TEXT NOT NULL,
    proof_of_delivery_url TEXT,
    recipient_name TEXT,
    recipient_relation TEXT,
    failure_reason TEXT,
    geo_location GEOGRAPHY(POINT)
);

CREATE TABLE rider_location_history (
    history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID NOT NULL REFERENCES riders(rider_id),
    location GEOGRAPHY(POINT) NOT NULL,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. 3PL Auto-Routing (Outsourcing)
-- -----------------------------------------------------------------------------

CREATE TABLE tpl_partners (
    partner_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    api_credentials JSONB,
    status TEXT DEFAULT 'active'
);

CREATE TABLE region_coverage_rules (
    rule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    region_id UUID NOT NULL REFERENCES regions(region_id),
    coverage_type TEXT NOT NULL, -- 'direct', 'tpl'
    preferred_tpl_partner_id UUID REFERENCES tpl_partners(partner_id)
);

CREATE TABLE tpl_rate_cards (
    rate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES tpl_partners(partner_id),
    origin_region_id UUID REFERENCES regions(region_id),
    destination_region_id UUID REFERENCES regions(region_id),
    price NUMERIC NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tpl_status_mappings (
    mapping_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES tpl_partners(partner_id),
    external_status_code TEXT NOT NULL,
    internal_status parcel_status NOT NULL,
    UNIQUE (partner_id, external_status_code)
);

-- -----------------------------------------------------------------------------
-- 7. Finance & Wallets
-- -----------------------------------------------------------------------------

CREATE TABLE shipper_wallets (
    wallet_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipper_id UUID NOT NULL UNIQUE REFERENCES shippers(shipper_id),
    balance NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'PKR',
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
    txn_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES shipper_wallets(wallet_id),
    amount NUMERIC NOT NULL,
    txn_type TEXT NOT NULL, -- 'credit', 'debit'
    reference_id UUID, -- Links to parcel_id or settlement_id
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cod_settlements (
    settlement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    shipper_id UUID NOT NULL REFERENCES shippers(shipper_id),
    total_cod_collected NUMERIC NOT NULL,
    net_payable NUMERIC NOT NULL,
    status settlement_status DEFAULT 'calculated',
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. Customer Trust & CX
-- -----------------------------------------------------------------------------

CREATE TABLE disputes (
    dispute_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id),
    category TEXT NOT NULL, -- 'lost', 'damaged', 'billing'
    description TEXT,
    status TEXT DEFAULT 'open',
    resolution TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ratings (
    rating_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parcel_id UUID NOT NULL REFERENCES parcels(parcel_id),
    rider_id UUID NOT NULL REFERENCES riders(rider_id),
    stars INT CHECK (stars >= 1 AND stars <= 5),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. Analytics & Integration
-- -----------------------------------------------------------------------------

CREATE TABLE event_stream (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE platform_integrations (
    integration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipper_id UUID NOT NULL REFERENCES shippers(shipper_id),
    platform_type TEXT NOT NULL,
    store_url TEXT,
    api_credentials JSONB,
    sync_settings JSONB,
    webhook_secret TEXT,
    last_sync_at TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 10. Audit & RLS
-- -----------------------------------------------------------------------------

ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Template for RLS Policy
-- CREATE POLICY tenant_isolation ON parcels USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- =============================================================================
-- EOF
-- =============================================================================
