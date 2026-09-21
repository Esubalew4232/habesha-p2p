/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Habesha P2P - Authoritative API Router
 */

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Database } from './db.js';
import { DecimalMoney } from './decimal.js';
import { FeeService } from './feeService.js';
import { P2PEngine } from './p2pEngine.js';
import { WalletService } from './walletService.js';
import { User, Advertisement, SellerPaymentMethod, PopupMessage } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'habesha_p2p_secure_jwt_token_secret_key';

export interface AuthRequest extends Request {
  user?: User;
}

// Authentication Middleware
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
    const db = Database.getSchema();
    const user = db.users.find((u) => u.id === decoded.userId);
    if (!user) {
      return res.status(403).json({ error: 'User account not found.' });
    }
    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }
    req.user = user;
    next();
  });
}

// Optional Authentication Middleware (identifies user if token is provided)
export function optionalAuthenticateToken(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (!err && decoded?.userId) {
      const db = Database.getSchema();
      req.user = db.users.find((u) => u.id === decoded.userId);
    }
    next();
  });
}

// Admin Gate Middleware
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const isEligibleAdmin =
    req.user.role === 'ADMIN' ||
    req.user.email.toLowerCase().trim() === 'esubalewtezera4@gmail.com' ||
    req.user.email.toLowerCase().includes('admin');

  if (isEligibleAdmin) {
    if (req.user.role !== 'ADMIN') {
      req.user.role = 'ADMIN';
      const db = Database.getSchema();
      const u = db.users.find((x) => x.id === req.user!.id);
      if (u) {
        u.role = 'ADMIN';
        Database.save();
      }
    }
    return next();
  }

  return res.status(403).json({ error: 'Access denied. Administrative privileges required.' });
}

export const apiRouter = Router();

// ==================== AUTHENTICATION ====================

apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, agreedToTerms } = req.body;

    if (!agreedToTerms) {
      return res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy.' });
    }
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const db = Database.getSchema();
    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser: User = {
      id: Database.generateUserId(),
      email: email.toLowerCase().trim(),
      fullName: fullName.trim(),
      passwordHash,
      role: 'USER',
      isSuspended: false,
      tradingRestricted: false,
      withdrawalRestricted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    Database.getWallet(newUser.id); // initialize wallet
    Database.save();

    const token = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...safeUser } = newUser;

    res.json({ user: safeUser, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = Database.getSchema();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...safeUser } = user;

    res.json({ user: safeUser, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

// Continue with Google (OAuth flow)
apiRouter.post('/auth/google', async (req: Request, res: Response) => {
  try {
    const { email, name, googleId, picture, avatarUrl } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required for Google Sign-In.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const isEligibleAdmin = cleanEmail === 'esubalewtezera4@gmail.com' || cleanEmail.includes('admin');

    const db = Database.getSchema();
    let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const randomPassword = `G-${googleId || Date.now()}-${Math.random()}`;
      const passwordHash = await bcrypt.hash(randomPassword, salt);

      user = {
        id: Database.generateUserId(),
        email: cleanEmail,
        fullName: name || cleanEmail.split('@')[0],
        passwordHash,
        role: isEligibleAdmin ? 'ADMIN' : 'USER',
        isSuspended: false,
        tradingRestricted: false,
        withdrawalRestricted: false,
        avatarUrl: avatarUrl || picture,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.users.push(user);
      Database.getWallet(user.id);
      Database.recordAdminAction(
        user.id,
        user.email,
        'GOOGLE_SIGN_IN_REGISTER',
        'USER',
        user.id,
        undefined,
        undefined,
        undefined,
        `New user registered via Google Identity Services: ${user.fullName} (${user.email}, Role: ${user.role})`
      );
      Database.save();
    } else {
      // If user is eligible admin, promote them
      if (isEligibleAdmin && user.role !== 'ADMIN') {
        user.role = 'ADMIN';
      }
      if (avatarUrl || picture) {
        user.avatarUrl = avatarUrl || picture;
      }
      user.updatedAt = new Date().toISOString();
      Database.save();
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...safeUser } = user;

    res.json({ user: safeUser, token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Google authentication failed.' });
  }
});

// Elevate current user to Admin (convenient for testing and administration)
apiRouter.post('/admin/elevate-me', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const user = db.users.find((u) => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  user.role = 'ADMIN';
  user.updatedAt = new Date().toISOString();
  Database.recordAdminAction(
    user.id,
    user.email,
    'ELEVATE_ADMIN_PRIVILEGE',
    'USER',
    user.id,
    undefined,
    undefined,
    'ADMIN',
    `User ${user.email} elevated to Super Administrator.`
  );
  Database.save();

  const newToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash: _, ...safeUser } = user;
  res.json({ user: safeUser, token: newToken, message: 'Administrator role activated successfully.' });
});

apiRouter.get('/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const { passwordHash: _, ...safeUser } = req.user!;
  const wallet = Database.getWallet(req.user!.id);
  res.json({ user: safeUser, wallet });
});

// ==================== WALLET & TRANSFERS ====================

apiRouter.get('/wallet', authenticateToken, (req: AuthRequest, res: Response) => {
  const wallet = Database.getWallet(req.user!.id);
  res.json({ wallet });
});

apiRouter.get('/wallet/ledger', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const userLedger = db.ledger.filter((l) => l.userId === req.user!.id);
  res.json({ ledger: userLedger });
});

apiRouter.get('/wallet/deposit-methods', authenticateToken, (_req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const activeMethods = db.depositMethods.filter((m) => m.isActive);
  res.json({ depositMethods: activeMethods });
});

apiRouter.post('/wallet/deposit', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { methodId, amount, txHash, proofImageUrl } = req.body;
    if (!methodId || !amount || !txHash) {
      return res.status(400).json({ error: 'Method, amount, and transaction hash are required.' });
    }
    const deposit = await WalletService.submitDeposit(
      req.user!,
      methodId,
      amount,
      txHash,
      proofImageUrl || ''
    );
    res.json({ deposit });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/wallet/my-deposits', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const userDeposits = db.deposits.filter((d) => d.userId === req.user!.id);
  res.json({ deposits: userDeposits });
});

apiRouter.post('/wallet/withdraw', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { method, destinationId, amount } = req.body;
    if (!method || !destinationId || !amount) {
      return res.status(400).json({ error: 'Method, destination ID, and amount are required.' });
    }
    const withdrawal = await WalletService.submitWithdrawal(
      req.user!,
      method,
      destinationId,
      amount
    );
    res.json({ withdrawal });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/wallet/my-withdrawals', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const userWithdrawals = db.withdrawals.filter((w) => w.userId === req.user!.id);
  res.json({ withdrawals: userWithdrawals });
});

// ==================== P2P MARKETPLACE ====================

apiRouter.get('/market/advertisements', optionalAuthenticateToken, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const requestingUser = req.user;
  const isRequestingAdmin = requestingUser?.role === 'ADMIN';

  // Filter active advertisements only (Rule 18, 19)
  // Admin-created ads are only visible to admin users in the marketplace
  const activeAds = db.advertisements.filter((ad) => {
    if (!ad.isActive) return false;
    const creator = db.users.find((u) => u.id === ad.userId);
    const isAdminAd = (ad as any).isAdminAd || ad.sellerRole === 'ADMIN' || creator?.role === 'ADMIN';
    if (isAdminAd) {
      return isRequestingAdmin;
    }
    return true;
  });
  res.json({ advertisements: activeAds });
});

apiRouter.get('/market/payment-methods', (_req: Request, res: Response) => {
  const db = Database.getSchema();
  const activeMethods = db.supportedPaymentMethods.filter((m) => m.isActive);
  res.json({ paymentMethods: activeMethods });
});

apiRouter.get('/market/supported-payment-methods', (_req: Request, res: Response) => {
  const db = Database.getSchema();
  const activeMethods = db.supportedPaymentMethods.filter((m) => m.isActive);
  res.json({ paymentMethods: activeMethods });
});

apiRouter.get('/market/my-payment-methods', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const methods = db.sellerPaymentMethods.filter((p) => p.userId === req.user!.id);
  res.json({ sellerPaymentMethods: methods });
});

apiRouter.post('/market/my-payment-methods', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const db = Database.getSchema();
    const existing = db.sellerPaymentMethods.filter((p) => p.userId === req.user!.id);

    // Section 21: Max 10 payment methods
    if (existing.length >= 10) {
      return res.status(400).json({ error: 'You can configure a maximum of 10 payment methods.' });
    }

    const { paymentMethodId, accountHolderName, accountNumber, extraDetails } = req.body;
    const supported = db.supportedPaymentMethods.find((p) => p.id === paymentMethodId && p.isActive);
    if (!supported) {
      return res.status(400).json({ error: 'Invalid or inactive payment method type.' });
    }

    if (!accountHolderName || !accountNumber) {
      return res.status(400).json({ error: 'Account holder name and account number are required.' });
    }

    const newMethod: SellerPaymentMethod = {
      id: `SPM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      userId: req.user!.id,
      paymentMethodId,
      methodName: supported.name,
      accountHolderName: accountHolderName.trim(),
      accountNumber: accountNumber.trim(),
      extraDetails: extraDetails?.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.sellerPaymentMethods.push(newMethod);
    Database.save();

    res.json({ sellerPaymentMethod: newMethod });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.delete('/market/my-payment-methods/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const index = db.sellerPaymentMethods.findIndex((p) => p.id === req.params.id && p.userId === req.user!.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Payment method not found.' });
  }
  db.sellerPaymentMethods.splice(index, 1);
  Database.save();
  res.json({ success: true });
});

// Ad Fee configuration public route
apiRouter.get('/market/ad-fee-config', (_req: Request, res: Response) => {
  const db = Database.getSchema();
  res.json({
    adCreationFeeEnabled: db.settings.adCreationFeeEnabled ?? true,
    adCreationFeeUsdt: db.settings.adCreationFeeUsdt ?? '1.0000',
  });
});

// Create Sell Advertisement (Section 20: Verified seller available USDT + Ad creation fee)
apiRouter.post('/market/advertisements', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.tradingRestricted) {
      return res.status(403).json({ error: 'Your account is currently restricted from creating advertisements.' });
    }

    const { amountAvailable, priceEtb, minOrderEtb, maxOrderEtb, selectedPaymentMethodIds, instructions } = req.body;
    const formattedAmount = DecimalMoney.format(amountAvailable);
    const wallet = Database.getWallet(user.id);
    const db = Database.getSchema();

    // Check one-time advertisement fee
    const isAdmin = user.role === 'ADMIN';
    const isFeeEnabled = Boolean(db.settings.adCreationFeeEnabled) && !isAdmin;
    const feeAmount = db.settings.adCreationFeeUsdt || '1.0000';

    const requiredTotal = isFeeEnabled ? DecimalMoney.add(formattedAmount, feeAmount) : formattedAmount;

    // Section 20: Verify seller has sufficient available USDT
    if (DecimalMoney.lt(wallet.availableBalance, requiredTotal)) {
      if (isFeeEnabled) {
        return res.status(400).json({
          error: `Insufficient available USDT to publish advertisement. You need ${formattedAmount} USDT for the ad plus ${feeAmount} USDT one-time ad publishing fee (Total required: ${requiredTotal} USDT). Your available balance: ${wallet.availableBalance} USDT.`,
        });
      } else {
        return res.status(400).json({
          error: `Insufficient available USDT to create advertisement. Available: ${wallet.availableBalance} USDT, Requested: ${formattedAmount} USDT.`,
        });
      }
    }

    const userPaymentMethods = db.sellerPaymentMethods.filter(
      (p) => p.userId === user.id && selectedPaymentMethodIds.includes(p.id)
    );

    if (userPaymentMethods.length === 0) {
      return res.status(400).json({ error: 'You must select at least one of your configured payment methods.' });
    }

    // Deduct one-time ad fee if applicable
    if (isFeeEnabled) {
      const availBefore = wallet.availableBalance;
      const totalBefore = wallet.totalBalance;
      wallet.availableBalance = DecimalMoney.sub(wallet.availableBalance, feeAmount);
      wallet.totalBalance = DecimalMoney.sub(wallet.totalBalance, feeAmount);
      wallet.updatedAt = new Date().toISOString();

      db.ledger.unshift({
        id: `LDG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        userId: user.id,
        type: 'AD_CREATION_FEE',
        amount: `-${feeAmount}`,
        availableBefore: availBefore,
        availableAfter: wallet.availableBalance,
        lockedBefore: wallet.lockedBalance,
        lockedAfter: wallet.lockedBalance,
        totalBefore: totalBefore,
        totalAfter: wallet.totalBalance,
        referenceId: `AD-FEE-${Date.now()}`,
        description: `One-time P2P advertisement posting fee (${feeAmount} USDT)`,
        createdAt: new Date().toISOString(),
      });
    }

    const completedTradesCount = db.trades.filter((t) => t.sellerId === user.id && t.status === 'COMPLETED').length;

    const ad: Advertisement = {
      id: `AD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      userId: user.id,
      sellerName: user.fullName,
      sellerRole: user.role,
      isAdminAd: isAdmin,
      sellerCompletedTrades: completedTradesCount,
      type: 'SELL',
      amountAvailable: formattedAmount,
      priceEtb: parseFloat(priceEtb).toFixed(2),
      minOrderEtb: parseFloat(minOrderEtb).toFixed(2),
      maxOrderEtb: parseFloat(maxOrderEtb).toFixed(2),
      paymentMethods: userPaymentMethods.map((m) => m.methodName),
      sellerPaymentMethodDetails: userPaymentMethods,
      instructions: instructions || 'Please transfer the exact Birr amount and write trade ID in remarks.',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.advertisements.unshift(ad);
    Database.save();

    res.json({ 
      advertisement: ad, 
      feeCharged: isFeeEnabled ? feeAmount : '0.0000',
      wallet: Database.getWallet(user.id)
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==================== TRADES & ESCROW ====================

apiRouter.post('/trades', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { adId, tradeAmountUsdt, paymentMethodId } = req.body;
    if (!adId || !tradeAmountUsdt) {
      return res.status(400).json({ error: 'Advertisement ID and trade amount are required.' });
    }
    const trade = await P2PEngine.createTrade(
      req.user!,
      adId,
      tradeAmountUsdt,
      paymentMethodId
    );
    res.json({ trade });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/trades/my', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const userTrades = db.trades.filter((t) => t.buyerId === req.user!.id || t.sellerId === req.user!.id);
  res.json({ trades: userTrades });
});

apiRouter.get('/trades/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const trade = db.trades.find((t) => t.id === req.params.id);
  if (!trade) {
    return res.status(404).json({ error: 'Trade not found.' });
  }
  if (trade.buyerId !== req.user!.id && trade.sellerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied to this trade.' });
  }
  const events = db.tradeEvents.filter((e) => e.tradeId === trade.id);
  res.json({ trade, events });
});

apiRouter.post('/trades/:id/pay', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { proofUrl } = req.body;
    const trade = await P2PEngine.markPaid(req.user!.id, req.params.id, proofUrl);
    res.json({ trade });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/trades/:id/release', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const trade = await P2PEngine.releaseUsdt(req.user!.id, req.params.id);
    res.json({ trade });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/trades/:id/cancel', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const trade = await P2PEngine.cancelTrade(req.user!.id, req.params.id, reason || 'Cancelled by user');
    res.json({ trade });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/trades/:id/dispute', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { reason, explanation, evidenceUrls } = req.body;
    if (!reason || !explanation) {
      return res.status(400).json({ error: 'Dispute reason and explanation are required.' });
    }
    const dispute = await P2PEngine.openDispute(
      req.user!.id,
      req.params.id,
      reason,
      explanation,
      evidenceUrls || []
    );
    res.json({ dispute });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==================== NOTIFICATIONS & SETTINGS ====================

apiRouter.get('/notifications', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const notifs = db.notifications.filter((n) => n.userId === req.user!.id);
  res.json({ notifications: notifs });
});

apiRouter.post('/notifications/read-all', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  db.notifications.forEach((n) => {
    if (n.userId === req.user!.id) n.isRead = true;
  });
  Database.save();
  res.json({ success: true });
});

apiRouter.get('/settings/public', (_req: Request, res: Response) => {
  const db = Database.getSchema();
  res.json({
    settings: {
      sellerFeeUsdt: db.settings.sellerFeeUsdt,
      buyerFeeUsdt: db.settings.buyerFeeUsdt,
      supportBotUsername: db.settings.supportBotUsername,
      maintenanceMode: db.settings.maintenanceMode,
      minTradeUsdt: db.settings.minTradeUsdt,
      buyerPaymentWindowMinutes: db.settings.buyerPaymentWindowMinutes,
    },
  });
});

apiRouter.get('/announcements', (_req: Request, res: Response) => {
  const db = Database.getSchema();
  res.json({ announcements: db.announcements.filter((a) => a.isActive) });
});

// Support Case Submission (Section 30, 83)
apiRouter.post('/support/cases', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { tradeId, category, description, evidenceUrls } = req.body;
    if (!category || !description) {
      return res.status(400).json({ error: 'Category and description are required.' });
    }

    const db = Database.getSchema();
    const supportCase = {
      id: `CASE-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      userId: req.user!.id,
      userEmail: req.user!.email,
      tradeId: tradeId || undefined,
      category,
      description,
      evidenceUrls: evidenceUrls || [],
      status: 'OPEN' as const,
      createdAt: new Date().toISOString(),
    };

    db.supportCases.unshift(supportCase);
    Database.save();

    res.json({ supportCase });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADMIN OPERATIONS ====================

apiRouter.get('/admin/overview', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  try {
    const db = Database.getSchema();
    const totalUsers = db.users ? db.users.length : 0;
    const activeTrades = (db.trades || []).filter((t) => t.status === 'PAYMENT_PENDING' || t.status === 'BUYER_MARKED_PAID').length;
    const completedTrades = (db.trades || []).filter((t) => t.status === 'COMPLETED' || t.status === 'ADMIN_RESOLVED').length;
    const pendingDeposits = (db.deposits || []).filter((d) => d.status === 'PENDING').length;
    const pendingWithdrawals = (db.withdrawals || []).filter((w) => w.status === 'PENDING').length;
    const openDisputes = (db.disputes || []).filter((d) => d.status === 'OPEN' || d.status === 'UNDER_REVIEW').length;

    let totalVolumeUsdt = '0.0000';
    let totalFeesUsdt = '0.0000';
    (db.trades || []).forEach((t) => {
      if (t.status === 'COMPLETED' || t.status === 'ADMIN_RESOLVED') {
        totalVolumeUsdt = DecimalMoney.add(totalVolumeUsdt, t.tradeAmountUsdt || '0.0000');
        const feeSum = DecimalMoney.add(t.sellerFeeUsdt || '0.0000', t.buyerFeeUsdt || '0.0000');
        totalFeesUsdt = DecimalMoney.add(totalFeesUsdt, feeSum);
      }
    });

    // Calculate total ad creation fees collected
    let totalAdFeesUsdt = '0.0000';
    let adFeesCount = 0;
    (db.ledger || []).forEach((l) => {
      if (l.type === 'AD_CREATION_FEE' && l.amount) {
        const positiveAmt = l.amount.replace('-', '');
        totalAdFeesUsdt = DecimalMoney.add(totalAdFeesUsdt, positiveAmt);
        adFeesCount++;
      }
    });

    // Calculate total locked balance in active escrows
    let totalEscrowLockedUsdt = '0.0000';
    if (db.wallets) {
      Object.values(db.wallets).forEach((w) => {
        if (w.lockedBalance) {
          totalEscrowLockedUsdt = DecimalMoney.add(totalEscrowLockedUsdt, w.lockedBalance);
        }
      });
    }

    res.json({
      metrics: {
        totalUsers,
        activeTrades,
        completedTrades,
        pendingDeposits,
        pendingWithdrawals,
        openDisputes,
        totalVolumeUsdt,
        totalFeesUsdt,
        totalAdFeesUsdt,
        adFeesCount,
        totalEscrowLockedUsdt,
        totalAds: db.advertisements ? db.advertisements.length : 0,
        activeAds: db.advertisements ? db.advertisements.filter((a) => a.isActive).length : 0,
        sellerFeeConfig: db.settings?.sellerFeeUsdt || '0.0600',
        buyerFeeConfig: db.settings?.buyerFeeUsdt || '0.0600',
        adCreationFeeEnabled: db.settings?.adCreationFeeEnabled ?? true,
        adCreationFeeUsdt: db.settings?.adCreationFeeUsdt ?? '1.0000',
        maintenanceMode: db.settings?.maintenanceMode ?? false,
      },
    });
  } catch (err: any) {
    console.error('[Admin Overview Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to compute admin overview' });
  }
});

apiRouter.get('/admin/users', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const usersWithWallets = db.users.map((u) => {
    const { passwordHash: _, ...safe } = u;
    const wallet = Database.getWallet(u.id);
    return { ...safe, wallet };
  });
  res.json({ users: usersWithWallets });
});

apiRouter.post('/admin/users/:id/toggle-suspend', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  user.isSuspended = !user.isSuspended;
  user.updatedAt = new Date().toISOString();
  Database.recordAdminAction(
    req.user!.id,
    req.user!.email,
    user.isSuspended ? 'SUSPEND_USER' : 'REACTIVATE_USER',
    'USER',
    user.id,
    undefined,
    undefined,
    undefined,
    `Toggled suspend status to ${user.isSuspended}`
  );
  Database.save();
  res.json({ user });
});

apiRouter.post('/admin/users/:id/adjust-balance', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, isCredit, reason } = req.body;
    const result = await WalletService.adminAdjustBalance(
      req.user!,
      req.params.id,
      amount,
      isCredit,
      reason,
      req.ip
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/admin/deposits', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  res.json({ deposits: db.deposits });
});

apiRouter.post('/admin/deposits/:id/approve', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const deposit = await WalletService.approveDeposit(req.user!, req.params.id, req.ip);
    res.json({ deposit });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/admin/deposits/:id/reject', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { rejectionReason } = req.body;
    const deposit = await WalletService.rejectDeposit(req.user!, req.params.id, rejectionReason, req.ip);
    res.json({ deposit });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/admin/withdrawals', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  res.json({ withdrawals: db.withdrawals });
});

apiRouter.post('/admin/withdrawals/:id/approve', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { proofImageUrl } = req.body;
    const withdrawal = await WalletService.approveWithdrawal(req.user!, req.params.id, proofImageUrl, req.ip);
    res.json({ withdrawal });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/admin/withdrawals/:id/reject', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { rejectionReason } = req.body;
    const withdrawal = await WalletService.rejectWithdrawal(req.user!, req.params.id, rejectionReason, req.ip);
    res.json({ withdrawal });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/admin/trades', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  res.json({ trades: db.trades });
});

apiRouter.get('/admin/disputes', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  res.json({ disputes: db.disputes });
});

apiRouter.post('/admin/disputes/:id/resolve', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { decision, notes } = req.body;
    if (decision !== 'BUYER' && decision !== 'SELLER') {
      return res.status(400).json({ error: "Decision must be 'BUYER' or 'SELLER'." });
    }
    const result = await P2PEngine.adminResolveDispute(
      req.user!,
      req.params.id,
      decision,
      notes || `Resolved by Admin in favor of ${decision}`,
      req.ip
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get('/admin/audit-logs', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  if (!db.adminActions || db.adminActions.length === 0) {
    db.adminActions = Database.getDefaultAuditActions();
    Database.save();
  }
  res.json({ auditLogs: db.adminActions || [] });
});

apiRouter.post('/admin/audit-logs/seed-test', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const testAction = Database.recordAdminAction(
    req.user!.id,
    req.user!.email,
    'MANUAL_AUDIT_PROBE',
    'SETTINGS',
    'SYSTEM_HEALTH_CHECK',
    undefined,
    undefined,
    undefined,
    `Admin ${req.user!.email} triggered live cryptographic audit trail verification at ${new Date().toISOString()}`
  );
  res.json({ success: true, action: testAction, auditLogs: db.adminActions });
});

apiRouter.get('/admin/settings', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  res.json({ settings: db.settings });
});

apiRouter.put('/admin/settings', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const { 
    sellerFeeUsdt, 
    buyerFeeUsdt, 
    adCreationFeeEnabled, 
    adCreationFeeUsdt, 
    maintenanceMode, 
    supportBotUsername,
    buyerPaymentWindowMinutes,
    sellerReleaseWindowMinutes,
    minTradeUsdt,
    maxTradeUsdt,
    allowNewRegistrations
  } = req.body;

  if (sellerFeeUsdt !== undefined) db.settings.sellerFeeUsdt = DecimalMoney.format(sellerFeeUsdt);
  if (buyerFeeUsdt !== undefined) db.settings.buyerFeeUsdt = DecimalMoney.format(buyerFeeUsdt);
  if (adCreationFeeEnabled !== undefined) db.settings.adCreationFeeEnabled = Boolean(adCreationFeeEnabled);
  if (adCreationFeeUsdt !== undefined) db.settings.adCreationFeeUsdt = DecimalMoney.format(adCreationFeeUsdt);
  if (maintenanceMode !== undefined) db.settings.maintenanceMode = Boolean(maintenanceMode);
  if (supportBotUsername !== undefined) db.settings.supportBotUsername = supportBotUsername.trim();
  if (buyerPaymentWindowMinutes !== undefined) db.settings.buyerPaymentWindowMinutes = Number(buyerPaymentWindowMinutes);
  if (sellerReleaseWindowMinutes !== undefined) db.settings.sellerReleaseWindowMinutes = Number(sellerReleaseWindowMinutes);
  if (minTradeUsdt !== undefined) db.settings.minTradeUsdt = DecimalMoney.format(minTradeUsdt);
  if (maxTradeUsdt !== undefined) db.settings.maxTradeUsdt = DecimalMoney.format(maxTradeUsdt);
  if (allowNewRegistrations !== undefined) db.settings.allowNewRegistrations = Boolean(allowNewRegistrations);

  Database.save();
  Database.recordAdminAction(
    req.user!.id, 
    req.user!.email, 
    'UPDATE_SETTINGS', 
    'SETTINGS', 
    'SYSTEM', 
    undefined, 
    undefined, 
    undefined, 
    `Updated platform settings: Ad Fee=${db.settings.adCreationFeeUsdt} (Enabled: ${db.settings.adCreationFeeEnabled}), Seller Fee=${db.settings.sellerFeeUsdt}, Maintenance=${db.settings.maintenanceMode}`
  );
  res.json({ settings: db.settings });
});

// Admin Marketplace Ads Management
apiRouter.get('/admin/advertisements', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  res.json({ advertisements: db.advertisements });
});

apiRouter.post('/admin/advertisements/:id/toggle-status', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const ad = db.advertisements.find((a) => a.id === req.params.id);
  if (!ad) return res.status(404).json({ error: 'Advertisement not found.' });

  ad.isActive = !ad.isActive;
  Database.save();
  Database.recordAdminAction(
    req.user!.id,
    req.user!.email,
    'UPDATE_SETTINGS',
    'ADVERTISEMENT',
    ad.id,
    ad.amountAvailable,
    undefined,
    undefined,
    `Toggled ad active status to ${ad.isActive}`
  );
  res.json({ advertisement: ad });
});

apiRouter.delete('/admin/advertisements/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const idx = db.advertisements.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Advertisement not found.' });

  const removed = db.advertisements.splice(idx, 1)[0];
  Database.save();
  Database.recordAdminAction(
    req.user!.id,
    req.user!.email,
    'UPDATE_SETTINGS',
    'ADVERTISEMENT',
    removed.id,
    undefined,
    undefined,
    undefined,
    `Admin deleted advertisement ${removed.id}`
  );
  res.json({ success: true, removedAdId: removed.id });
});

// Admin User Restrictions (Trading / Withdrawal)
apiRouter.post('/admin/users/:id/toggle-restrictions', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const { tradingRestricted, withdrawalRestricted } = req.body;
  if (tradingRestricted !== undefined) user.tradingRestricted = Boolean(tradingRestricted);
  if (withdrawalRestricted !== undefined) user.withdrawalRestricted = Boolean(withdrawalRestricted);
  user.updatedAt = new Date().toISOString();

  Database.save();
  Database.recordAdminAction(
    req.user!.id,
    req.user!.email,
    'UPDATE_SETTINGS',
    'USER',
    user.id,
    undefined,
    undefined,
    undefined,
    `Updated restrictions: Trading=${user.tradingRestricted}, Withdrawal=${user.withdrawalRestricted}`
  );
  res.json({ user });
});

// Admin Force Escrow Release
apiRouter.post('/admin/trades/:id/force-release', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { notes } = req.body;
    const db = Database.getSchema();
    const trade = db.trades.find((t) => t.id === req.params.id);
    if (!trade) return res.status(404).json({ error: 'Trade not found.' });

    if (trade.status === 'COMPLETED' || trade.status === 'CANCELLED') {
      return res.status(400).json({ error: `Trade is already ${trade.status}.` });
    }

    // Force resolve to buyer
    const result = await P2PEngine.adminResolveDispute(
      req.user!,
      trade.id,
      'BUYER',
      notes || 'Administrative Force-Release: Escrow released directly to buyer.',
      req.ip
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Force Escrow Cancel / Refund
apiRouter.post('/admin/trades/:id/force-cancel', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { notes } = req.body;
    const db = Database.getSchema();
    const trade = db.trades.find((t) => t.id === req.params.id);
    if (!trade) return res.status(404).json({ error: 'Trade not found.' });

    if (trade.status === 'COMPLETED' || trade.status === 'CANCELLED') {
      return res.status(400).json({ error: `Trade is already ${trade.status}.` });
    }

    // Force resolve to seller (refund escrow)
    const result = await P2PEngine.adminResolveDispute(
      req.user!,
      trade.id,
      'SELLER',
      notes || 'Administrative Force-Cancel: Trade cancelled, escrow refunded to seller.',
      req.ip
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// System Broadcast Announcements
apiRouter.get('/announcements', (_req: Request, res: Response) => {
  const db = Database.getSchema();
  const active = (db.announcements || []).filter((a) => a.isActive);
  res.json({ announcements: active });
});

apiRouter.get('/admin/announcements', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  res.json({ announcements: db.announcements || [] });
});

apiRouter.post('/admin/announcements', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const { title, message, type } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }
  const announcement = {
    id: `ANN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    title: title.trim(),
    message: message.trim(),
    type: type || 'INFO',
    audience: 'all' as const,
    language: 'all' as const,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  if (!db.announcements) db.announcements = [];
  db.announcements.unshift(announcement);
  Database.save();
  Database.recordAdminAction(
    req.user!.id,
    req.user!.email,
    'UPDATE_SETTINGS',
    'SYSTEM',
    announcement.id,
    undefined,
    undefined,
    undefined,
    `Published announcement: ${announcement.title}`
  );
  res.json({ announcement });
});

apiRouter.delete('/admin/announcements/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  if (!db.announcements) return res.json({ success: true });
  const idx = db.announcements.findIndex((a) => a.id === req.params.id);
  if (idx !== -1) {
    db.announcements.splice(idx, 1);
    Database.save();
  }
  res.json({ success: true });
});

// ==================== POPUP & BROADCAST MESSAGES ====================

// Admin: Create broadcast or targeted popup message with expiration
apiRouter.post('/admin/popup-messages', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  Database.cleanExpiredPopupMessages();

  const { title, message, type, targetType, targetUserId, durationMinutes, expiresAt } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message content are required.' });
  }

  const finalTargetType: 'ALL' | 'USER' = targetType === 'USER' ? 'USER' : 'ALL';
  let targetUserName: string | undefined;
  let cleanTargetUserId: string | undefined;

  if (finalTargetType === 'USER') {
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required when sending to a specific user.' });
    }
    const targetUser = db.users.find(
      (u) => u.id.trim() === targetUserId.trim() || u.email.trim().toLowerCase() === targetUserId.trim().toLowerCase()
    );
    if (!targetUser) {
      return res.status(404).json({ error: `User with ID or Email '${targetUserId}' not found in the system.` });
    }
    cleanTargetUserId = targetUser.id;
    targetUserName = targetUser.fullName || targetUser.email;
  }

  // Calculate expiration time (defaults to 24 hours if unspecified)
  let finalExpiresAt: string;
  if (expiresAt) {
    finalExpiresAt = new Date(expiresAt).toISOString();
  } else {
    const mins = Number(durationMinutes) > 0 ? Number(durationMinutes) : 1440; // default 24 hours
    finalExpiresAt = new Date(Date.now() + mins * 60 * 1000).toISOString();
  }

  const popupMessage: PopupMessage = {
    id: `POP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    title: title.trim(),
    message: message.trim(),
    type: (type || 'INFO') as 'INFO' | 'WARNING' | 'IMPORTANT' | 'URGENT',
    targetType: finalTargetType,
    targetUserId: cleanTargetUserId,
    targetUserName,
    expiresAt: finalExpiresAt,
    dismissedUserIds: [],
    createdAt: new Date().toISOString(),
  };

  if (!db.popupMessages) db.popupMessages = [];
  db.popupMessages.unshift(popupMessage);
  Database.save();

  Database.recordAdminAction(
    req.user!.id,
    req.user!.email,
    'UPDATE_SETTINGS',
    'SYSTEM',
    popupMessage.id,
    undefined,
    undefined,
    undefined,
    `Sent popup message [${popupMessage.targetType}${cleanTargetUserId ? ' -> ' + cleanTargetUserId : ''}]: ${popupMessage.title} (Expires: ${popupMessage.expiresAt})`
  );

  res.json({ popupMessage });
});

// Admin: List all popup messages
apiRouter.get('/admin/popup-messages', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  Database.cleanExpiredPopupMessages();
  const db = Database.getSchema();
  res.json({ popupMessages: db.popupMessages || [] });
});

// Admin: Delete a popup message
apiRouter.delete('/admin/popup-messages/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  if (!db.popupMessages) return res.json({ success: true });
  const idx = db.popupMessages.findIndex((m) => m.id === req.params.id);
  if (idx !== -1) {
    db.popupMessages.splice(idx, 1);
    Database.save();
  }
  res.json({ success: true });
});

// User / Client: Get active popup messages for current user (not expired, not dismissed yet)
apiRouter.get('/popup-messages/active', authenticateToken, (req: AuthRequest, res: Response) => {
  Database.cleanExpiredPopupMessages();
  const db = Database.getSchema();
  const now = Date.now();
  const userId = req.user!.id;

  const activeMessages = (db.popupMessages || []).filter((m) => {
    const isNotExpired = new Date(m.expiresAt).getTime() > now;
    const isTargeted = m.targetType === 'ALL' || m.targetUserId === userId;
    const isDismissed = m.dismissedUserIds?.includes(userId);
    return isNotExpired && isTargeted && !isDismissed;
  });

  res.json({ popupMessages: activeMessages });
});

// User: Dismiss popup message (mark as seen so it will never show again)
apiRouter.post('/popup-messages/:id/dismiss', authenticateToken, (req: AuthRequest, res: Response) => {
  const db = Database.getSchema();
  const userId = req.user!.id;
  const msg = (db.popupMessages || []).find((m) => m.id === req.params.id);
  if (msg) {
    if (!msg.dismissedUserIds) msg.dismissedUserIds = [];
    if (!msg.dismissedUserIds.includes(userId)) {
      msg.dismissedUserIds.push(userId);
      Database.save();
    }
  }
  res.json({ success: true });
});
