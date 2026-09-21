-- ==========================================================
-- HABESHA P2P - LEDGER TRIGGERS & BALANCE INTEGRITY RULES (MIGRATION 002)
-- Enforces: total_balance = available_balance + locked_balance
-- Protects against negative balances and double-release race conditions
-- ==========================================================

-- Trigger Function to enforce balance mathematical consistency
CREATE OR REPLACE FUNCTION enforce_wallet_balance_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- Check that total_balance strictly matches available + locked
    IF NEW.total_balance <> (NEW.available_balance + NEW.locked_balance) THEN
        RAISE EXCEPTION 'Wallet balance integrity failure: total_balance (%) must equal available (%) + locked (%)',
            NEW.total_balance, NEW.available_balance, NEW.locked_balance;
    END IF;

    -- Ensure non-negative balances
    IF NEW.available_balance < 0.0000 OR NEW.locked_balance < 0.0000 THEN
        RAISE EXCEPTION 'Wallet balance cannot be negative: available=%, locked=%',
            NEW.available_balance, NEW.locked_balance;
    END IF;

    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wallet_balance_check ON wallets;
CREATE TRIGGER trg_wallet_balance_check
BEFORE INSERT OR UPDATE ON wallets
FOR EACH ROW
EXECUTE FUNCTION enforce_wallet_balance_integrity();

-- Trigger to prevent double release on trades
CREATE OR REPLACE FUNCTION prevent_double_trade_release()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'COMPLETED' AND NEW.status = 'COMPLETED' AND OLD.release_tx_signature IS NOT NULL THEN
        RAISE EXCEPTION 'Double release error: Trade % has already been settled and released.', OLD.id;
    END IF;

    IF OLD.status = 'ADMIN_RESOLVED' AND (NEW.status = 'COMPLETED' OR NEW.status = 'ADMIN_RESOLVED') THEN
        RAISE EXCEPTION 'Conflict error: Trade % was already resolved by administration.', OLD.id;
    END IF;

    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_double_release ON trades;
CREATE TRIGGER trg_prevent_double_release
BEFORE UPDATE ON trades
FOR EACH ROW
EXECUTE FUNCTION prevent_double_trade_release();
