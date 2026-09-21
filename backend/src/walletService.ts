/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Habesha P2P - Authoritative Wallet, Deposit & Withdrawal Service
 * Enforces:
 * 1. Strict deposit approvals/rejections with audit logging
 * 2. Withdrawal balance reservation (preventing double spend)
 * 3. Binance ID and Bybit ID withdrawal destinations only
 * 4. Admin manual balance adjustment with immutable before/after ledger audit
 */

import { Database } from './db.js';
import { DecimalMoney } from './decimal.js';
import { DepositRequest, WithdrawalRequest, User } from './types.js';

export class WalletService {
  /**
   * Submit a deposit request
   */
  public static async submitDeposit(
    user: User,
    methodId: string,
    amount: string,
    txHash: string,
    proofImageUrl: string
  ): Promise<DepositRequest> {
    return await Database.withLock<DepositRequest>(async () => {
      const db = Database.getSchema();
      const method = db.depositMethods.find((m) => m.id === methodId && m.isActive);
      if (!method) {
        throw new Error('Deposit method not found or inactive.');
      }

      const formattedAmount = DecimalMoney.format(amount);
      if (DecimalMoney.lt(formattedAmount, method.minDeposit)) {
        throw new Error(`Minimum deposit amount for ${method.name} is ${method.minDeposit} USDT.`);
      }

      const depositId = `DEP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const request: DepositRequest = {
        id: depositId,
        userId: user.id,
        userEmail: user.email,
        userName: user.fullName,
        methodId: method.id,
        methodName: method.name,
        network: method.network,
        depositAddress: method.address,
        amount: formattedAmount,
        txHash: txHash.trim(),
        proofImageUrl,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      db.deposits.unshift(request);
      Database.addNotification(
        user.id,
        'Deposit Request Submitted',
        `Your deposit of ${formattedAmount} USDT via ${method.name} has been submitted for administrative verification.`,
        'WALLET',
        depositId
      );

      return request;
    });
  }

  /**
   * Admin approves deposit (Section 14)
   */
  public static async approveDeposit(
    admin: User,
    depositId: string,
    ipAddress?: string
  ): Promise<DepositRequest> {
    return await Database.withLock<DepositRequest>(async () => {
      const db = Database.getSchema();
      const deposit = db.deposits.find((d) => d.id === depositId);
      if (!deposit) throw new Error('Deposit request not found.');

      if (deposit.status !== 'PENDING') {
        throw new Error(`Deposit already processed with status: ${deposit.status}.`);
      }

      // Atomically increase user available balance
      Database.recordLedgerAndApplyBalance(
        deposit.userId,
        'DEPOSIT',
        deposit.amount,
        'AVAILABLE',
        depositId,
        `Approved USDT Deposit via ${deposit.methodName} (Tx: ${deposit.txHash})`
      );

      deposit.status = 'APPROVED';
      deposit.reviewedBy = admin.email;
      deposit.reviewedAt = new Date().toISOString();

      // Immutable admin audit log
      Database.recordAdminAction(
        admin.id,
        admin.email,
        'APPROVE_DEPOSIT',
        'DEPOSIT',
        depositId,
        deposit.amount,
        'PENDING',
        'APPROVED',
        `Approved deposit of ${deposit.amount} USDT for user ${deposit.userEmail}`,
        ipAddress
      );

      Database.addNotification(
        deposit.userId,
        'Deposit Approved! 🟢',
        `Your deposit of ${deposit.amount} USDT has been approved and credited to your available balance.`,
        'WALLET',
        depositId
      );

      return deposit;
    });
  }

  /**
   * Admin rejects deposit (Section 14)
   */
  public static async rejectDeposit(
    admin: User,
    depositId: string,
    rejectionReason: string,
    ipAddress?: string
  ): Promise<DepositRequest> {
    return await Database.withLock<DepositRequest>(async () => {
      const db = Database.getSchema();
      const deposit = db.deposits.find((d) => d.id === depositId);
      if (!deposit) throw new Error('Deposit request not found.');

      if (deposit.status !== 'PENDING') {
        throw new Error(`Deposit already processed with status: ${deposit.status}.`);
      }

      if (!rejectionReason || !rejectionReason.trim()) {
        throw new Error('A valid rejection reason is required.');
      }

      deposit.status = 'REJECTED';
      deposit.rejectionReason = rejectionReason.trim();
      deposit.reviewedBy = admin.email;
      deposit.reviewedAt = new Date().toISOString();

      Database.recordAdminAction(
        admin.id,
        admin.email,
        'REJECT_DEPOSIT',
        'DEPOSIT',
        depositId,
        deposit.amount,
        'PENDING',
        'REJECTED',
        `Rejected deposit: ${rejectionReason}`,
        ipAddress
      );

      Database.addNotification(
        deposit.userId,
        'Deposit Rejected 🔴',
        `Your deposit of ${deposit.amount} USDT was rejected. Reason: ${rejectionReason}`,
        'WALLET',
        depositId
      );

      return deposit;
    });
  }

  /**
   * Submit a withdrawal request (Section 15, 16)
   * Only Binance ID and Bybit ID supported
   */
  public static async submitWithdrawal(
    user: User,
    method: 'BINANCE_ID' | 'BYBIT_ID',
    destinationId: string,
    amount: string
  ): Promise<WithdrawalRequest> {
    return await Database.withLock<WithdrawalRequest>(async () => {
      const db = Database.getSchema();
      if (user.withdrawalRestricted || user.isSuspended) {
        throw new Error('Your account is currently restricted from withdrawals. Please contact support.');
      }

      if (method !== 'BINANCE_ID' && method !== 'BYBIT_ID') {
        throw new Error('Only Binance ID and Bybit ID withdrawals are supported.');
      }

      if (!destinationId || destinationId.trim().length < 4) {
        throw new Error('Please enter a valid Binance Pay ID or Bybit UID.');
      }

      const formattedAmount = DecimalMoney.format(amount);
      if (DecimalMoney.lt(formattedAmount, '5.0000')) {
        throw new Error('Minimum withdrawal amount is 5.0000 USDT.');
      }

      const wallet = Database.getWallet(user.id);
      if (DecimalMoney.lt(wallet.availableBalance, formattedAmount)) {
        throw new Error(
          `Insufficient available balance. Available: ${wallet.availableBalance} USDT. (Note: Locked USDT in active trades cannot be withdrawn).`
        );
      }

      const withdrawalId = `WTH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // ATOMICALLY RESERVE FUNDS: Deduct from available balance immediately to prevent double spending!
      Database.recordLedgerAndApplyBalance(
        user.id,
        'WITHDRAWAL',
        `-${formattedAmount}`,
        'AVAILABLE',
        withdrawalId,
        `Withdrawal request submitted via ${method} (Dest ID: ${destinationId})`
      );

      const request: WithdrawalRequest = {
        id: withdrawalId,
        userId: user.id,
        userEmail: user.email,
        userName: user.fullName,
        method,
        destinationId: destinationId.trim(),
        amount: formattedAmount,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      db.withdrawals.unshift(request);

      Database.addNotification(
        user.id,
        'Withdrawal Request Submitted',
        `Your withdrawal of ${formattedAmount} USDT to ${method} (${destinationId}) is being processed by administration.`,
        'WALLET',
        withdrawalId
      );

      return request;
    });
  }

  /**
   * Admin approves withdrawal (Section 17)
   */
  public static async approveWithdrawal(
    admin: User,
    withdrawalId: string,
    proofImageUrl: string,
    ipAddress?: string
  ): Promise<WithdrawalRequest> {
    return await Database.withLock<WithdrawalRequest>(async () => {
      const db = Database.getSchema();
      const withdrawal = db.withdrawals.find((w) => w.id === withdrawalId);
      if (!withdrawal) throw new Error('Withdrawal request not found.');

      if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'PROCESSING') {
        throw new Error(`Withdrawal already settled with status: ${withdrawal.status}.`);
      }

      withdrawal.status = 'COMPLETED';
      withdrawal.proofImageUrl = proofImageUrl || undefined;
      withdrawal.reviewedBy = admin.email;
      withdrawal.reviewedAt = new Date().toISOString();

      Database.recordAdminAction(
        admin.id,
        admin.email,
        'APPROVE_WITHDRAWAL',
        'WITHDRAWAL',
        withdrawalId,
        withdrawal.amount,
        'PENDING',
        'COMPLETED',
        `Completed external payout to ${withdrawal.method} (${withdrawal.destinationId})`,
        ipAddress
      );

      Database.addNotification(
        withdrawal.userId,
        'Withdrawal Completed! 🟢',
        `Your withdrawal of ${withdrawal.amount} USDT to ${withdrawal.method} (${withdrawal.destinationId}) has been successfully sent.`,
        'WALLET',
        withdrawalId
      );

      return withdrawal;
    });
  }

  /**
   * Admin rejects withdrawal (Section 17)
   * Safely returns reserved funds back to available balance!
   */
  public static async rejectWithdrawal(
    admin: User,
    withdrawalId: string,
    rejectionReason: string,
    ipAddress?: string
  ): Promise<WithdrawalRequest> {
    return await Database.withLock<WithdrawalRequest>(async () => {
      const db = Database.getSchema();
      const withdrawal = db.withdrawals.find((w) => w.id === withdrawalId);
      if (!withdrawal) throw new Error('Withdrawal request not found.');

      if (withdrawal.status !== 'PENDING' && withdrawal.status !== 'PROCESSING') {
        throw new Error(`Withdrawal already settled with status: ${withdrawal.status}.`);
      }

      if (!rejectionReason || !rejectionReason.trim()) {
        throw new Error('A valid rejection reason is required.');
      }

      // RETURN RESERVED FUNDS to user available balance
      Database.recordLedgerAndApplyBalance(
        withdrawal.userId,
        'REFUND',
        `+${withdrawal.amount}`,
        'AVAILABLE',
        withdrawalId,
        `Refunded rejected withdrawal ${withdrawalId}. Reason: ${rejectionReason}`
      );

      withdrawal.status = 'REJECTED';
      withdrawal.rejectionReason = rejectionReason.trim();
      withdrawal.reviewedBy = admin.email;
      withdrawal.reviewedAt = new Date().toISOString();

      Database.recordAdminAction(
        admin.id,
        admin.email,
        'REJECT_WITHDRAWAL',
        'WITHDRAWAL',
        withdrawalId,
        withdrawal.amount,
        'PENDING',
        'REJECTED',
        `Rejected withdrawal: ${rejectionReason}. Funds returned.`,
        ipAddress
      );

      Database.addNotification(
        withdrawal.userId,
        'Withdrawal Rejected 🔴',
        `Your withdrawal of ${withdrawal.amount} USDT was rejected. Reason: ${rejectionReason}. Your funds have been refunded to your wallet.`,
        'WALLET',
        withdrawalId
      );

      return withdrawal;
    });
  }

  /**
   * Admin Manual Balance Adjustment (Section 46)
   */
  public static async adminAdjustBalance(
    admin: User,
    userId: string,
    amountDelta: string,
    isCredit: boolean,
    reason: string,
    ipAddress?: string
  ) {
    return await Database.withLock(async () => {
      const db = Database.getSchema();
      const targetUser = db.users.find((u) => u.id === userId);
      if (!targetUser) throw new Error('Target user not found.');

      if (!reason || !reason.trim()) {
        throw new Error('An authoritative justification reason is required for manual balance adjustment.');
      }

      const formatted = DecimalMoney.format(amountDelta);
      const signedDelta = isCredit ? `+${formatted}` : `-${formatted}`;

      const walletBefore = Database.getWallet(userId);
      const prevTotal = walletBefore.totalBalance;

      const ledgerEntry = Database.recordLedgerAndApplyBalance(
        userId,
        'ADMIN_ADJUSTMENT',
        signedDelta,
        'AVAILABLE',
        `ADJ-${Date.now()}`,
        `Admin balance adjustment by ${admin.email}. Reason: ${reason}`
      );

      const walletAfter = Database.getWallet(userId);

      Database.recordAdminAction(
        admin.id,
        admin.email,
        isCredit ? 'CREDIT_BALANCE' : 'DEBIT_BALANCE',
        'USER_BALANCE',
        userId,
        formatted,
        prevTotal,
        walletAfter.totalBalance,
        reason,
        ipAddress
      );

      Database.addNotification(
        userId,
        'Balance Adjusted by Administration',
        `Your wallet was ${isCredit ? 'credited' : 'debited'} by ${formatted} USDT. Reason: ${reason}`,
        'SYSTEM'
      );

      return { ledgerEntry, wallet: walletAfter };
    });
  }
}
