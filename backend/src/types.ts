/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Habesha P2P - Global Domain Models and Types
 */

export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  isSuspended: boolean;
  tradingRestricted: boolean;
  withdrawalRestricted: boolean;
  avatarUrl?: string;
  phone?: string;
  telegramHandle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  userId: string;
  availableBalance: string; // 4 decimal string e.g. "15.0000"
  lockedBalance: string;    // 4 decimal string e.g. "5.0600"
  totalBalance: string;     // 4 decimal string = available + locked
  currency: 'USDT';
  updatedAt: string;
}

export type LedgerEntryType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'P2P_BUY'
  | 'P2P_SELL'
  | 'FEE'
  | 'AD_CREATION_FEE'
  | 'LOCK'
  | 'UNLOCK'
  | 'RELEASE'
  | 'REFUND'
  | 'ADMIN_ADJUSTMENT';

export interface WalletLedgerEntry {
  id: string;
  userId: string;
  type: LedgerEntryType;
  amount: string; // "+5.0000" or "-5.0600"
  availableBefore: string;
  availableAfter: string;
  lockedBefore: string;
  lockedAfter: string;
  totalBefore: string;
  totalAfter: string;
  referenceId: string;
  description: string;
  createdAt: string;
}

export interface DepositMethod {
  id: string;
  name: string;        // e.g. "USDT TRC20"
  network: string;     // e.g. "TRON (TRC20)"
  address: string;     // USDT deposit address
  qrCodeUrl?: string;
  instructions: string;
  minDeposit: string;  // e.g. "5.0000"
  maxDeposit?: string;
  isActive: boolean;
  createdAt: string;
}

export type DepositStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DepositRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  methodId: string;
  methodName: string;
  network: string;
  depositAddress: string;
  amount: string;
  txHash: string;
  proofImageUrl: string;
  status: DepositStatus;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type WithdrawalMethod = 'BINANCE_ID' | 'BYBIT_ID';
export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  method: WithdrawalMethod;
  destinationId: string; // Binance Pay ID or Bybit UID
  amount: string;
  status: WithdrawalStatus;
  proofImageUrl?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface SupportedPaymentMethod {
  id: string;
  name: string; // e.g. "Commercial Bank of Ethiopia (CBE)", "Telebirr", "Awash Bank"
  amharicName?: string;
  shortCode?: string;
  isPopular?: boolean;
  color?: string;
  accountHint?: string;
  type: 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER';
  instructions: string;
  isActive: boolean;
}

export interface SellerPaymentMethod {
  id: string;
  userId: string;
  paymentMethodId: string;
  methodName: string;
  accountHolderName: string;
  accountNumber: string;
  extraDetails?: string;
  isActive: boolean;
  createdAt: string;
}

export type AdvertisementType = 'SELL' | 'BUY';

export interface Advertisement {
  id: string;
  userId: string;
  sellerName: string;
  sellerRole?: UserRole;
  isAdminAd?: boolean;
  sellerCompletedTrades: number;
  type: AdvertisementType;
  amountAvailable: string; // in USDT
  priceEtb: string;        // Ethiopian Birr per USDT, e.g. "145.50"
  minOrderEtb: string;     // min order in ETB
  maxOrderEtb: string;     // max order in ETB
  paymentMethods: string[]; // List of method names
  sellerPaymentMethodDetails: SellerPaymentMethod[];
  instructions: string;
  isActive: boolean;
  createdAt: string;
}

/**
 * Strict backend state machine for trades
 */
export type TradeStatus =
  | 'CREATED'
  | 'USDT_LOCKED'
  | 'PAYMENT_PENDING'
  | 'BUYER_MARKED_PAID'
  | 'SELLER_PENDING_RELEASE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'ADMIN_REVIEW'
  | 'ADMIN_RESOLVED'
  | 'EXPIRED';

export interface Trade {
  id: string; // Unique e.g. "HBP-839274"
  adId: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  tradeAmountUsdt: string;  // e.g. "5.0000"
  priceEtb: string;         // e.g. "145.00"
  totalEtb: string;         // e.g. "725.00"
  sellerFeeUsdt: string;    // e.g. "0.0600"
  buyerFeeUsdt: string;     // e.g. "0.0600"
  lockedSellerUsdt: string; // e.g. "5.0600" (Option B: trade + seller fee)
  buyerReceivesUsdt: string;// e.g. "5.0000"
  selectedPaymentMethod: SellerPaymentMethod;
  status: TradeStatus;
  buyerPaidAt?: string;
  releasedAt?: string;
  cancelledAt?: string;
  disputeId?: string;
  paymentProofUrl?: string;
  releaseTxSignature?: string; // Idempotency protection against double-release
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradeEvent {
  id: string;
  tradeId: string;
  eventType: string;
  triggeredBy: string;
  message: string;
  createdAt: string;
}

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_BUYER' | 'RESOLVED_SELLER' | 'CLOSED';

export interface Dispute {
  id: string;
  tradeId: string;
  openedByUserId: string;
  openedByName: string;
  reason: string;
  explanation: string;
  evidenceUrls: string[];
  status: DisputeStatus;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AdminAction {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  amount?: string;
  previousState?: string;
  newState?: string;
  reason?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'TRADE' | 'WALLET' | 'DISPUTE' | 'SYSTEM' | 'SECURITY';
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type?: string;
  language: 'all' | 'en' | 'am';
  audience: 'all' | 'buyers' | 'sellers';
  isActive: boolean;
  createdAt: string;
}

export interface PopupMessage {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'IMPORTANT' | 'URGENT';
  targetType: 'ALL' | 'USER';
  targetUserId?: string;
  targetUserName?: string;
  expiresAt: string;
  dismissedUserIds: string[];
  createdAt: string;
}

export interface SupportCase {
  id: string;
  userId: string;
  userEmail: string;
  tradeId?: string;
  category: string;
  description: string;
  evidenceUrls?: string[];
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  adminNotes?: string;
  createdAt: string;
}

export interface SystemSettings {
  sellerFeeUsdt: string;
  buyerFeeUsdt: string;
  adCreationFeeEnabled: boolean; // One-time fee for posting sell advertisements
  adCreationFeeUsdt: string;    // One-time fee amount (e.g. "1.0000")
  maintenanceMode: boolean;
  supportBotUsername: string;
  buyerPaymentWindowMinutes: number;
  sellerReleaseWindowMinutes: number;
  minTradeUsdt: string;
  maxTradeUsdt: string;
  allowNewRegistrations: boolean;
}
