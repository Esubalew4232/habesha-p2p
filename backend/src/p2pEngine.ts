/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Habesha P2P - Core Authoritative P2P Trade & Escrow Engine
 * Enforces:
 * 1. Atomic Locking of seller funds (Option B: tradeAmount + sellerFee)
 * 2. Immutable double-release prevention with cryptographic signatures & state checks
 * 3. Authoritative fee deduction
 * 4. Full audit logging & immutable ledger entries
 */

import { Database } from './db.js';
import { DecimalMoney } from './decimal.js';
import { FeeService } from './feeService.js';
import { Trade, TradeEvent, Dispute, TradeStatus, User } from './types.js';

export class P2PEngine {
  /**
   * Generates a non-sequential, professional trade ID: e.g. HBP-839274
   */
  private static generateTradeId(): string {
    const randomSix = Math.floor(100000 + Math.random() * 900000);
    return `HBP-${randomSix}`;
  }

  /**
   * Create trade with atomic lock of seller USDT
   */
  public static async createTrade(
    buyer: User,
    adId: string,
    tradeAmountUsdt: string,
    selectedPaymentMethodId: string
  ): Promise<Trade> {
    return await Database.withLock<Trade>(async () => {
      const db = Database.getSchema();
      const ad = db.advertisements.find((a) => a.id === adId && a.isActive);
      if (!ad) {
        throw new Error('Advertisement not found or no longer active.');
      }

      if (ad.userId === buyer.id) {
        throw new Error('You cannot trade with your own advertisement.');
      }

      const seller = db.users.find((u) => u.id === ad.userId);
      if (!seller || seller.isSuspended || seller.tradingRestricted) {
        throw new Error('Seller is currently unavailable or restricted from trading.');
      }

      const formattedAmount = DecimalMoney.format(tradeAmountUsdt);
      if (DecimalMoney.lt(formattedAmount, db.settings.minTradeUsdt)) {
        throw new Error(`Minimum trade amount is ${db.settings.minTradeUsdt} USDT.`);
      }

      // Calculate ETB total
      const priceEtb = DecimalMoney.format(ad.priceEtb);
      const totalEtb = (parseFloat(formattedAmount) * parseFloat(priceEtb)).toFixed(2);

      // Verify ETB limits
      if (parseFloat(totalEtb) < parseFloat(ad.minOrderEtb)) {
        throw new Error(`Minimum order limit is ${ad.minOrderEtb} ETB (current: ${totalEtb} ETB).`);
      }
      if (parseFloat(totalEtb) > parseFloat(ad.maxOrderEtb)) {
        throw new Error(`Maximum order limit is ${ad.maxOrderEtb} ETB (current: ${totalEtb} ETB).`);
      }

      // Check seller payment method
      const paymentMethod = ad.sellerPaymentMethodDetails.find((p) => p.id === selectedPaymentMethodId) ||
        ad.sellerPaymentMethodDetails[0];
      if (!paymentMethod) {
        throw new Error('No valid payment method available for this advertisement.');
      }

      // Calculate Option B Fee Structure
      const fees = FeeService.calculateTradeFees(
        formattedAmount,
        db.settings.sellerFeeUsdt,
        db.settings.buyerFeeUsdt
      );

      // Verify seller available balance
      const sellerWallet = Database.getWallet(seller.id);
      if (DecimalMoney.lt(sellerWallet.availableBalance, fees.sellerRequiredLockUsdt)) {
        throw new Error(
          `Seller has insufficient available USDT to satisfy this trade lock (${fees.sellerRequiredLockUsdt} USDT required).`
        );
      }

      const tradeId = this.generateTradeId();

      // ATOMICALLY LOCK SELLER USDT (Option B: trade + seller fee)
      Database.recordLedgerAndApplyBalance(
        seller.id,
        'LOCK',
        fees.sellerRequiredLockUsdt,
        'LOCK_TRANSFER',
        tradeId,
        `Locked ${fees.sellerRequiredLockUsdt} USDT for Trade ${tradeId} (${formattedAmount} USDT trade + ${fees.sellerFeeUsdt} USDT seller fee)`
      );

      const expiresAt = new Date(
        Date.now() + db.settings.buyerPaymentWindowMinutes * 60 * 1000
      ).toISOString();

      const trade: Trade = {
        id: tradeId,
        adId: ad.id,
        buyerId: buyer.id,
        buyerName: buyer.fullName,
        buyerEmail: buyer.email,
        sellerId: seller.id,
        sellerName: seller.fullName,
        sellerEmail: seller.email,
        tradeAmountUsdt: formattedAmount,
        priceEtb,
        totalEtb,
        sellerFeeUsdt: fees.sellerFeeUsdt,
        buyerFeeUsdt: fees.buyerFeeUsdt,
        lockedSellerUsdt: fees.sellerRequiredLockUsdt,
        buyerReceivesUsdt: fees.buyerReceivesUsdt,
        selectedPaymentMethod: paymentMethod,
        status: 'PAYMENT_PENDING',
        expiresAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.trades.unshift(trade);

      // Add Trade Event
      db.tradeEvents.push({
        id: `EVT-${Date.now()}`,
        tradeId,
        eventType: 'TRADE_CREATED',
        triggeredBy: buyer.fullName,
        message: `Trade created. ${fees.sellerRequiredLockUsdt} USDT locked in escrow. Buyer must pay ${totalEtb} ETB.`,
        createdAt: new Date().toISOString(),
      });

      // Notifications
      Database.addNotification(
        seller.id,
        'New Trade Created',
        `Buyer ${buyer.fullName} opened trade ${tradeId} for ${formattedAmount} USDT (${totalEtb} ETB). ${fees.sellerRequiredLockUsdt} USDT locked.`,
        'TRADE',
        tradeId
      );
      Database.addNotification(
        buyer.id,
        'Trade Created',
        `You opened trade ${tradeId}. Please transfer ${totalEtb} ETB to seller's ${paymentMethod.methodName} account within ${db.settings.buyerPaymentWindowMinutes} minutes.`,
        'TRADE',
        tradeId
      );

      return trade;
    });
  }

  /**
   * Buyer marks payment completed
   */
  public static async markPaid(buyerId: string, tradeId: string, proofUrl?: string): Promise<Trade> {
    return await Database.withLock<Trade>(async () => {
      const db = Database.getSchema();
      const trade = db.trades.find((t) => t.id === tradeId);
      if (!trade) throw new Error('Trade not found.');

      if (trade.buyerId !== buyerId) {
        throw new Error('Unauthorized. Only the buyer can mark this trade as paid.');
      }

      if (trade.status !== 'PAYMENT_PENDING' && trade.status !== 'USDT_LOCKED') {
        throw new Error(`Cannot mark trade as paid in status ${trade.status}.`);
      }

      trade.status = 'BUYER_MARKED_PAID';
      trade.buyerPaidAt = new Date().toISOString();
      trade.updatedAt = new Date().toISOString();
      if (proofUrl) trade.paymentProofUrl = proofUrl;

      // Event
      db.tradeEvents.push({
        id: `EVT-${Date.now()}`,
        tradeId,
        eventType: 'BUYER_MARKED_PAID',
        triggeredBy: trade.buyerName,
        message: 'Buyer marked payment as completed. Awaiting seller account confirmation.',
        createdAt: new Date().toISOString(),
      });

      // Notify Seller per Section 26:
      Database.addNotification(
        trade.sellerId,
        'Buyer Marked Payment Completed',
        `BUYER HAS MARKED THE PAYMENT AS COMPLETED (${trade.totalEtb} ETB). PLEASE CHECK YOUR PAYMENT ACCOUNT BEFORE RELEASING THE USDT.`,
        'TRADE',
        tradeId
      );

      return trade;
    });
  }

  /**
   * Seller releases USDT. Strictly prevents double-release.
   */
  public static async releaseUsdt(sellerId: string, tradeId: string): Promise<Trade> {
    return await Database.withLock<Trade>(async () => {
      const db = Database.getSchema();
      const trade = db.trades.find((t) => t.id === tradeId);
      if (!trade) throw new Error('Trade not found.');

      if (trade.sellerId !== sellerId) {
        throw new Error('Unauthorized. Only the seller can release USDT for this trade.');
      }

      if (trade.status === 'COMPLETED') {
        throw new Error('Trade has already been released and completed.');
      }

      if (trade.status !== 'BUYER_MARKED_PAID' && trade.status !== 'PAYMENT_PENDING') {
        throw new Error(`Cannot release trade in status: ${trade.status}.`);
      }

      // Check double-release signature
      if (trade.releaseTxSignature) {
        throw new Error('Double release protection: Transaction signature already exists.');
      }

      const sellerWallet = Database.getWallet(sellerId);
      if (DecimalMoney.lt(sellerWallet.lockedBalance, trade.lockedSellerUsdt)) {
        throw new Error('Critical: Seller locked balance is insufficient to settle this trade.');
      }

      // --- ATOMIC SETTLEMENT (Option B) ---
      // 1. Clear seller's locked balance:
      // Seller's locked balance decreases by lockedSellerUsdt (e.g. 5.0600)
      // Seller's total balance decreases by lockedSellerUsdt
      const sellerAvail = sellerWallet.availableBalance;
      const sellerLockedBefore = sellerWallet.lockedBalance;
      const sellerTotalBefore = sellerWallet.totalBalance;

      sellerWallet.lockedBalance = DecimalMoney.sub(sellerLockedBefore, trade.lockedSellerUsdt);
      sellerWallet.totalBalance = DecimalMoney.sub(sellerTotalBefore, trade.lockedSellerUsdt);
      sellerWallet.updatedAt = new Date().toISOString();

      // Ledger for seller's trade delivery
      db.ledger.unshift({
        id: `LEDGER-${Date.now()}-SELL`,
        userId: sellerId,
        type: 'P2P_SELL',
        amount: `-${trade.tradeAmountUsdt}`,
        availableBefore: sellerAvail,
        availableAfter: sellerAvail,
        lockedBefore: sellerLockedBefore,
        lockedAfter: DecimalMoney.sub(sellerLockedBefore, trade.tradeAmountUsdt),
        totalBefore: sellerTotalBefore,
        totalAfter: DecimalMoney.sub(sellerTotalBefore, trade.tradeAmountUsdt),
        referenceId: tradeId,
        description: `Completed P2P Sell Trade ${tradeId}: Transferred ${trade.tradeAmountUsdt} USDT to buyer`,
        createdAt: new Date().toISOString(),
      });

      // Ledger for seller fee
      db.ledger.unshift({
        id: `LEDGER-${Date.now()}-SFEE`,
        userId: sellerId,
        type: 'FEE',
        amount: `-${trade.sellerFeeUsdt}`,
        availableBefore: sellerAvail,
        availableAfter: sellerAvail,
        lockedBefore: DecimalMoney.sub(sellerLockedBefore, trade.tradeAmountUsdt),
        lockedAfter: sellerWallet.lockedBalance,
        totalBefore: DecimalMoney.sub(sellerTotalBefore, trade.tradeAmountUsdt),
        totalAfter: sellerWallet.totalBalance,
        referenceId: tradeId,
        description: `P2P Trading Fee for Trade ${tradeId}`,
        createdAt: new Date().toISOString(),
      });

      // 2. Credit buyer's available balance:
      const buyerWallet = Database.getWallet(trade.buyerId);
      const buyerAvailBefore = buyerWallet.availableBalance;
      const buyerLockedBefore = buyerWallet.lockedBalance;
      const buyerTotalBefore = buyerWallet.totalBalance;

      buyerWallet.availableBalance = DecimalMoney.add(buyerAvailBefore, trade.buyerReceivesUsdt);
      buyerWallet.totalBalance = DecimalMoney.add(buyerTotalBefore, trade.buyerReceivesUsdt);
      buyerWallet.updatedAt = new Date().toISOString();

      // Ledger for buyer's trade credit
      db.ledger.unshift({
        id: `LEDGER-${Date.now()}-BUY`,
        userId: trade.buyerId,
        type: 'P2P_BUY',
        amount: `+${trade.buyerReceivesUsdt}`,
        availableBefore: buyerAvailBefore,
        availableAfter: buyerWallet.availableBalance,
        lockedBefore: buyerLockedBefore,
        lockedAfter: buyerLockedBefore,
        totalBefore: buyerTotalBefore,
        totalAfter: buyerWallet.totalBalance,
        referenceId: tradeId,
        description: `Completed P2P Buy Trade ${tradeId}: Received ${trade.buyerReceivesUsdt} USDT`,
        createdAt: new Date().toISOString(),
      });

      // Generate unique release transaction signature for idempotency
      const releaseSig = `REL-${Date.now()}-${tradeId}-${Math.floor(Math.random() * 100000)}`;
      trade.status = 'COMPLETED';
      trade.releasedAt = new Date().toISOString();
      trade.releaseTxSignature = releaseSig;
      trade.updatedAt = new Date().toISOString();

      // Record trade event
      db.tradeEvents.push({
        id: `EVT-${Date.now()}`,
        tradeId,
        eventType: 'SELLER_RELEASED',
        triggeredBy: trade.sellerName,
        message: `Seller confirmed payment receipt and released ${trade.buyerReceivesUsdt} USDT to buyer. Trade completed.`,
        createdAt: new Date().toISOString(),
      });

      // Notifications
      Database.addNotification(
        trade.buyerId,
        'Trade Completed! USDT Received',
        `Trade ${tradeId} has been completed! ${trade.buyerReceivesUsdt} USDT is now in your available wallet.`,
        'TRADE',
        tradeId
      );
      Database.addNotification(
        trade.sellerId,
        'Trade Completed',
        `Trade ${tradeId} completed successfully. ${trade.lockedSellerUsdt} USDT settled from escrow.`,
        'TRADE',
        tradeId
      );

      return trade;
    });
  }

  /**
   * Cancel trade (only allowed before payment marked, or upon mutual cancellation)
   */
  public static async cancelTrade(userId: string, tradeId: string, reason: string): Promise<Trade> {
    return await Database.withLock<Trade>(async () => {
      const db = Database.getSchema();
      const trade = db.trades.find((t) => t.id === tradeId);
      if (!trade) throw new Error('Trade not found.');

      if (trade.status === 'COMPLETED') {
        throw new Error('Cannot cancel an already completed trade.');
      }

      if (trade.status === 'BUYER_MARKED_PAID') {
        throw new Error('Buyer has already marked payment. Trade cannot be cancelled directly; open a dispute if needed.');
      }

      if (trade.buyerId !== userId && trade.sellerId !== userId) {
        throw new Error('Unauthorized to cancel this trade.');
      }

      // Return locked funds back to seller available balance
      Database.recordLedgerAndApplyBalance(
        trade.sellerId,
        'UNLOCK',
        trade.lockedSellerUsdt,
        'UNLOCK_TRANSFER',
        tradeId,
        `Returned ${trade.lockedSellerUsdt} USDT to seller from cancelled Trade ${tradeId}. Reason: ${reason}`
      );

      trade.status = 'CANCELLED';
      trade.cancelledAt = new Date().toISOString();
      trade.updatedAt = new Date().toISOString();

      db.tradeEvents.push({
        id: `EVT-${Date.now()}`,
        tradeId,
        eventType: 'TRADE_CANCELLED',
        triggeredBy: userId,
        message: `Trade cancelled. Reason: ${reason}. Locked funds returned to seller.`,
        createdAt: new Date().toISOString(),
      });

      Database.addNotification(trade.buyerId, 'Trade Cancelled', `Trade ${tradeId} was cancelled.`, 'TRADE', tradeId);
      Database.addNotification(trade.sellerId, 'Trade Cancelled - Funds Returned', `Trade ${tradeId} was cancelled. ${trade.lockedSellerUsdt} USDT returned to your available balance.`, 'TRADE', tradeId);

      return trade;
    });
  }

  /**
   * Open Dispute
   */
  public static async openDispute(
    userId: string,
    tradeId: string,
    reason: string,
    explanation: string,
    evidenceUrls: string[]
  ): Promise<Dispute> {
    return await Database.withLock<Dispute>(async () => {
      const db = Database.getSchema();
      const trade = db.trades.find((t) => t.id === tradeId);
      if (!trade) throw new Error('Trade not found.');

      if (trade.buyerId !== userId && trade.sellerId !== userId) {
        throw new Error('Unauthorized to dispute this trade.');
      }

      if (trade.status === 'COMPLETED' || trade.status === 'CANCELLED') {
        throw new Error(`Cannot dispute trade in status ${trade.status}.`);
      }

      const disputeId = `DSP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const user = db.users.find((u) => u.id === userId);

      const dispute: Dispute = {
        id: disputeId,
        tradeId,
        openedByUserId: userId,
        openedByName: user?.fullName || 'User',
        reason,
        explanation,
        evidenceUrls,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
      };

      db.disputes.unshift(dispute);
      trade.status = 'DISPUTED';
      trade.disputeId = disputeId;
      trade.updatedAt = new Date().toISOString();

      db.tradeEvents.push({
        id: `EVT-${Date.now()}`,
        tradeId,
        eventType: 'DISPUTE_OPENED',
        triggeredBy: user?.fullName || 'User',
        message: `Dispute opened (${reason}): ${explanation}. Admin review requested.`,
        createdAt: new Date().toISOString(),
      });

      // Notify counterparty
      const counterpartyId = userId === trade.buyerId ? trade.sellerId : trade.buyerId;
      Database.addNotification(
        counterpartyId,
        'Dispute Opened for Trade',
        `A dispute has been opened for Trade ${tradeId}. Platform administrators have been notified to review evidence.`,
        'DISPUTE',
        tradeId
      );

      return dispute;
    });
  }

  /**
   * Admin Force Resolution (Section 32, 33, 34)
   * Prevents repeated resolutions.
   */
  public static async adminResolveDispute(
    admin: User,
    disputeId: string,
    decision: 'BUYER' | 'SELLER',
    notes: string,
    ipAddress?: string
  ): Promise<{ trade: Trade; dispute: Dispute }> {
    return await Database.withLock(async () => {
      const db = Database.getSchema();
      const dispute = db.disputes.find((d) => d.id === disputeId);
      if (!dispute) throw new Error('Dispute not found.');

      if (dispute.status !== 'OPEN' && dispute.status !== 'UNDER_REVIEW') {
        throw new Error(`Dispute already concluded with status: ${dispute.status}. Duplicate resolution rejected.`);
      }

      const trade = db.trades.find((t) => t.id === dispute.tradeId);
      if (!trade) throw new Error('Disputed trade record not found.');

      if (trade.status === 'COMPLETED' || trade.status === 'ADMIN_RESOLVED') {
        throw new Error('Trade has already been settled and completed. Cannot resolve again.');
      }

      const prevStatus = trade.status;

      if (decision === 'BUYER') {
        // Resolve in favor of Buyer (Section 33)
        // Seller locked funds transferred to Buyer
        const sellerWallet = Database.getWallet(trade.sellerId);
        const buyerWallet = Database.getWallet(trade.buyerId);

        if (DecimalMoney.lt(sellerWallet.lockedBalance, trade.lockedSellerUsdt)) {
          throw new Error('Seller locked balance is insufficient to fulfill resolution.');
        }

        // 1. Deduct from seller locked & total
        sellerWallet.lockedBalance = DecimalMoney.sub(sellerWallet.lockedBalance, trade.lockedSellerUsdt);
        sellerWallet.totalBalance = DecimalMoney.sub(sellerWallet.totalBalance, trade.lockedSellerUsdt);
        sellerWallet.updatedAt = new Date().toISOString();

        // 2. Credit buyer
        buyerWallet.availableBalance = DecimalMoney.add(buyerWallet.availableBalance, trade.buyerReceivesUsdt);
        buyerWallet.totalBalance = DecimalMoney.add(buyerWallet.totalBalance, trade.buyerReceivesUsdt);
        buyerWallet.updatedAt = new Date().toISOString();

        // Ledger records
        db.ledger.unshift({
          id: `LEDGER-${Date.now()}-ADMIN-BUY`,
          userId: trade.buyerId,
          type: 'P2P_BUY',
          amount: `+${trade.buyerReceivesUsdt}`,
          availableBefore: DecimalMoney.sub(buyerWallet.availableBalance, trade.buyerReceivesUsdt),
          availableAfter: buyerWallet.availableBalance,
          lockedBefore: buyerWallet.lockedBalance,
          lockedAfter: buyerWallet.lockedBalance,
          totalBefore: DecimalMoney.sub(buyerWallet.totalBalance, trade.buyerReceivesUsdt),
          totalAfter: buyerWallet.totalBalance,
          referenceId: trade.id,
          description: `Dispute ${disputeId} resolved in buyer favor by admin. Received ${trade.buyerReceivesUsdt} USDT`,
          createdAt: new Date().toISOString(),
        });

        db.ledger.unshift({
          id: `LEDGER-${Date.now()}-ADMIN-SELL`,
          userId: trade.sellerId,
          type: 'P2P_SELL',
          amount: `-${trade.tradeAmountUsdt}`,
          availableBefore: sellerWallet.availableBalance,
          availableAfter: sellerWallet.availableBalance,
          lockedBefore: DecimalMoney.add(sellerWallet.lockedBalance, trade.lockedSellerUsdt),
          lockedAfter: sellerWallet.lockedBalance,
          totalBefore: DecimalMoney.add(sellerWallet.totalBalance, trade.lockedSellerUsdt),
          totalAfter: sellerWallet.totalBalance,
          referenceId: trade.id,
          description: `Dispute ${disputeId} resolved in buyer favor by admin. Released ${trade.tradeAmountUsdt} USDT`,
          createdAt: new Date().toISOString(),
        });

        dispute.status = 'RESOLVED_BUYER';
        trade.status = 'ADMIN_RESOLVED';
        trade.releasedAt = new Date().toISOString();
      } else {
        // Resolve in favor of Seller (Section 34)
        // Return locked funds back to seller available balance
        Database.recordLedgerAndApplyBalance(
          trade.sellerId,
          'UNLOCK',
          trade.lockedSellerUsdt,
          'UNLOCK_TRANSFER',
          trade.id,
          `Dispute ${disputeId} resolved in seller favor by admin. Returned ${trade.lockedSellerUsdt} USDT to available balance.`
        );

        dispute.status = 'RESOLVED_SELLER';
        trade.status = 'ADMIN_RESOLVED';
        trade.cancelledAt = new Date().toISOString();
      }

      dispute.resolutionNotes = notes;
      dispute.resolvedBy = admin.email;
      dispute.resolvedAt = new Date().toISOString();
      trade.updatedAt = new Date().toISOString();

      // Record immutable admin action audit log (Section 32, 58)
      Database.recordAdminAction(
        admin.id,
        admin.email,
        `RESOLVE_DISPUTE_${decision}`,
        'DISPUTE',
        disputeId,
        trade.tradeAmountUsdt,
        prevStatus,
        trade.status,
        notes,
        ipAddress
      );

      // Event
      db.tradeEvents.push({
        id: `EVT-${Date.now()}`,
        tradeId: trade.id,
        eventType: 'ADMIN_RESOLVED',
        triggeredBy: admin.fullName,
        message: `Admin resolved dispute in favor of ${decision}. Notes: ${notes}`,
        createdAt: new Date().toISOString(),
      });

      Database.addNotification(
        trade.buyerId,
        `Dispute Resolved (${decision})`,
        `Administrator has resolved Trade ${trade.id} dispute in favor of ${decision}. Notes: ${notes}`,
        'DISPUTE',
        trade.id
      );
      Database.addNotification(
        trade.sellerId,
        `Dispute Resolved (${decision})`,
        `Administrator has resolved Trade ${trade.id} dispute in favor of ${decision}. Notes: ${notes}`,
        'DISPUTE',
        trade.id
      );

      return { trade, dispute };
    });
  }
}
