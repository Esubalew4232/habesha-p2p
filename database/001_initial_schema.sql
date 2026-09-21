-- ==========================================================
-- HABESHA P2P - PRODUCTION POSTGRESQL SCHEMA (MIGRATION 001)
-- Exact NUMERIC(20,4) for financial precision
-- Authoritative locked-balance and immutable audit trail
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'USER', -- 'USER', 'ADMIN'
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    trading_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    withdrawal_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url TEXT,
    phone VARCHAR(64),
    telegram_handle VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wallets Table
-- Invariant: total_balance = available_balance + locked_balance
CREATE TABLE IF NOT EXISTS wallets (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    available_balance NUMERIC(20, 4) NOT NULL DEFAULT 0.0000 CHECK (available_balance >= 0.0000),
    locked_balance NUMERIC(20, 4) NOT NULL DEFAULT 0.0000 CHECK (locked_balance >= 0.0000),
    total_balance NUMERIC(20, 4) NOT NULL DEFAULT 0.0000 CHECK (total_balance >= 0.0000),
    currency VARCHAR(16) NOT NULL DEFAULT 'USDT',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Wallet Ledger Table (Immutable Financial Audit)
CREATE TABLE IF NOT EXISTS wallet_ledger (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL, -- 'DEPOSIT', 'WITHDRAWAL', 'P2P_BUY', 'P2P_SELL', 'FEE', 'LOCK', 'UNLOCK', 'REFUND', 'ADMIN_ADJUSTMENT'
    amount NUMERIC(20, 4) NOT NULL,
    available_before NUMERIC(20, 4) NOT NULL,
    available_after NUMERIC(20, 4) NOT NULL,
    locked_before NUMERIC(20, 4) NOT NULL,
    locked_after NUMERIC(20, 4) NOT NULL,
    total_before NUMERIC(20, 4) NOT NULL,
    total_after NUMERIC(20, 4) NOT NULL,
    reference_id VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Deposit Methods (Configured by Admin)
CREATE TABLE IF NOT EXISTS deposit_methods (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    network VARCHAR(64) NOT NULL,
    address VARCHAR(255) NOT NULL,
    qr_code_url TEXT,
    instructions TEXT NOT NULL,
    min_deposit NUMERIC(20, 4) NOT NULL DEFAULT 5.0000,
    max_deposit NUMERIC(20, 4),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Deposits Table
CREATE TABLE IF NOT EXISTS deposits (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method_id VARCHAR(64) NOT NULL REFERENCES deposit_methods(id),
    method_name VARCHAR(128) NOT NULL,
    network VARCHAR(64) NOT NULL,
    deposit_address VARCHAR(255) NOT NULL,
    amount NUMERIC(20, 4) NOT NULL CHECK (amount > 0.0000),
    tx_hash VARCHAR(255) NOT NULL,
    proof_image_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    rejection_reason TEXT,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Withdrawals Table (Strictly Binance ID & Bybit ID)
CREATE TABLE IF NOT EXISTS withdrawals (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method VARCHAR(32) NOT NULL CHECK (method IN ('BINANCE_ID', 'BYBIT_ID')),
    destination_id VARCHAR(128) NOT NULL,
    amount NUMERIC(20, 4) NOT NULL CHECK (amount >= 5.0000),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED'
    proof_image_url TEXT,
    rejection_reason TEXT,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Supported Payment Methods (Ethiopian Banks, Telebirr)
CREATE TABLE IF NOT EXISTS payment_methods (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL, -- 'BANK_TRANSFER', 'MOBILE_MONEY'
    instructions TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seller Configured Payment Methods (Up to 10 per seller)
CREATE TABLE IF NOT EXISTS seller_payment_methods (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_method_id VARCHAR(64) NOT NULL REFERENCES payment_methods(id),
    method_name VARCHAR(128) NOT NULL,
    account_holder_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(128) NOT NULL,
    extra_details TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Advertisements Table (Real users only, no placeholders)
CREATE TABLE IF NOT EXISTS advertisements (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(16) NOT NULL DEFAULT 'SELL',
    amount_available NUMERIC(20, 4) NOT NULL CHECK (amount_available > 0.0000),
    price_etb NUMERIC(20, 2) NOT NULL CHECK (price_etb > 0.00),
    min_order_etb NUMERIC(20, 2) NOT NULL CHECK (min_order_etb > 0.00),
    max_order_etb NUMERIC(20, 2) NOT NULL CHECK (max_order_etb >= min_order_etb),
    instructions TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trades Table (Strict State Machine & Option B Fee Settlement)
CREATE TABLE IF NOT EXISTS trades (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'HBP-839274'
    ad_id VARCHAR(64) NOT NULL REFERENCES advertisements(id),
    buyer_id VARCHAR(64) NOT NULL REFERENCES users(id),
    seller_id VARCHAR(64) NOT NULL REFERENCES users(id),
    trade_amount_usdt NUMERIC(20, 4) NOT NULL CHECK (trade_amount_usdt > 0.0000),
    price_etb NUMERIC(20, 2) NOT NULL CHECK (price_etb > 0.00),
    total_etb NUMERIC(20, 2) NOT NULL CHECK (total_etb > 0.00),
    seller_fee_usdt NUMERIC(20, 4) NOT NULL DEFAULT 0.0600,
    buyer_fee_usdt NUMERIC(20, 4) NOT NULL DEFAULT 0.0600,
    locked_seller_usdt NUMERIC(20, 4) NOT NULL, -- trade_amount + seller_fee (Option B)
    buyer_receives_usdt NUMERIC(20, 4) NOT NULL, -- trade_amount
    payment_method_snapshot JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PAYMENT_PENDING',
    buyer_paid_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    dispute_id VARCHAR(64),
    payment_proof_url TEXT,
    release_tx_signature VARCHAR(255) UNIQUE, -- Prevents double release
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Disputes Table
CREATE TABLE IF NOT EXISTS disputes (
    id VARCHAR(64) PRIMARY KEY,
    trade_id VARCHAR(64) NOT NULL REFERENCES trades(id),
    opened_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    reason VARCHAR(255) NOT NULL,
    explanation TEXT NOT NULL,
    evidence_urls TEXT[],
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER', 'CLOSED'
    resolution_notes TEXT,
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admin Audit Logs (Section 58)
CREATE TABLE IF NOT EXISTS admin_actions (
    id VARCHAR(64) PRIMARY KEY,
    admin_id VARCHAR(64) NOT NULL REFERENCES users(id),
    admin_email VARCHAR(255) NOT NULL,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    amount NUMERIC(20, 4),
    previous_state VARCHAR(64),
    new_state VARCHAR(64),
    reason TEXT,
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
