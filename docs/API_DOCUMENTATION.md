# Habesha P2P — Production API Documentation & Architecture

## Overview
Habesha P2P is an Ethiopian-focused USDT Peer-to-Peer trading platform designed with an authoritative backend escrow engine.

## Base URL
- Development / Cloud Run: `/api`
- Port: `3000`

---

## 1. Authentication
### `POST /api/auth/register`
- **Body**: `{ fullName: string, email: string, password: string, agreedToTerms: boolean }`
- **Response**: `{ user: User, token: string }`

### `POST /api/auth/login`
- **Body**: `{ email: string, password: string }`
- **Response**: `{ user: User, token: string }`

### `POST /api/auth/google`
- **Body**: `{ email: string, name: string, googleId: string }`
- **Response**: `{ user: User, token: string }`

### `GET /api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ user: User, wallet: Wallet }`

---

## 2. Wallet & Balances (Authoritative)
**Invariant**: `total_balance = available_balance + locked_balance`
Locked funds cannot be spent, withdrawn, or duplicated into another trade.

### `GET /api/wallet`
- **Response**: `{ wallet: { availableBalance, lockedBalance, totalBalance, currency } }`

### `GET /api/wallet/ledger`
- **Response**: `{ ledger: WalletLedgerEntry[] }`
- Immutable record of every financial mutation (`DEPOSIT`, `WITHDRAWAL`, `P2P_BUY`, `P2P_SELL`, `FEE`, `LOCK`, `UNLOCK`, `REFUND`, `ADMIN_ADJUSTMENT`).

### `POST /api/wallet/deposit`
- **Body**: `{ methodId: string, amount: string, txHash: string, proofImageUrl?: string }`
- **Response**: `{ deposit: DepositRequest }`

### `POST /api/wallet/withdraw`
- **Body**: `{ method: 'BINANCE_ID' | 'BYBIT_ID', destinationId: string, amount: string }`
- **Security**: Atomically reserves requested balance immediately. Funds in active trades are locked and cannot be withdrawn.

---

## 3. P2P Marketplace & Advertisements
### `GET /api/market/advertisements`
- **Response**: `{ advertisements: Advertisement[] }`
- Real user advertisements only. Filtered by active status.

### `POST /api/market/advertisements`
- **Body**: `{ amountAvailable: string, priceEtb: string, minOrderEtb: string, maxOrderEtb: string, selectedPaymentMethodIds: string[], instructions: string }`
- **Validation**: Backend authoritatively validates seller's `available_balance >= amountAvailable`.

### `GET /api/market/my-payment-methods`
- Up to 10 payment methods per seller (CBE, Telebirr, Awash, etc.).

---

## 4. P2P Trade Escrow Engine (Option B Settlement)
### `POST /api/trades`
- **Body**: `{ adId: string, tradeAmountUsdt: string, paymentMethodId: string }`
- **Fee Option B**:
  - Example: 5.0000 USDT Trade
  - Seller Fee: 0.0600 USDT
  - Buyer Fee: 0.0600 USDT
  - Total Platform Fee: 0.1200 USDT
  - Seller Required Lock: `5.0600 USDT` (trade + seller fee)
  - Buyer Receives: `5.0000 USDT`
- **Atomic Escrow**: Required 5.0600 USDT is transferred from seller's available balance to locked balance atomically.

### `POST /api/trades/:id/pay`
- **Status Transition**: `PAYMENT_PENDING` -> `BUYER_MARKED_PAID`.
- Locked funds remain locked. Seller cannot withdraw.

### `POST /api/trades/:id/release`
- **Status Transition**: `BUYER_MARKED_PAID` -> `COMPLETED`.
- **Double Release Protection**: Checks `releaseTxSignature` and state lock. Re-releases are strictly rejected.
- **Settlement**:
  - Seller locked balance decreases by 5.0600 USDT.
  - Buyer available balance increases by 5.0000 USDT.
  - Platform fee 0.1200 USDT recorded.

### `POST /api/trades/:id/dispute`
- **Body**: `{ reason: string, explanation: string, evidenceUrls: string[] }`
- Status transitions to `DISPUTED`. Notifies administrators for review.

---

## 5. Administrative Control Center
- `GET /api/admin/overview`: Platform metrics, volume, fee collections.
- `GET /api/admin/users`: User management, balance review.
- `POST /api/admin/users/:id/adjust-balance`: Manual adjustment with immutable before/after ledger audit.
- `POST /api/admin/deposits/:id/approve` & `reject` (with rejection reason).
- `POST /api/admin/withdrawals/:id/approve` & `reject` (with refund to wallet).
- `POST /api/admin/disputes/:id/resolve`: Resolve for Buyer or Resolve for Seller with automated escrow settlement.
- `GET /api/admin/audit-logs`: Complete immutable audit log of every sensitive administrative action.
