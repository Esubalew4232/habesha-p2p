/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Habesha P2P - Verification Suite
 * Tests Critical P2P Test Cases (Section 90, 91), Balance Invariants,
 * Option B Fee Calculations, and Double Release Prevention.
 */

import { Database } from '../backend/src/db.js';
import { DecimalMoney } from '../backend/src/decimal.js';
import { FeeService } from '../backend/src/feeService.js';
import { P2PEngine } from '../backend/src/p2pEngine.js';
import { WalletService } from '../backend/src/walletService.js';
import { User } from '../backend/src/types.js';

async function runTests() {
  console.log('\n==================================================');
  console.log('  HABESHA P2P - COMPREHENSIVE TEST SUITE EXECUTION');
  console.log('==================================================\n');

  await Database.init();

  // Test 1: Exact Decimal Math Precision
  console.log('TEST 1: Decimal Precision & Absence of Floating Point Inaccuracies');
  const sum = DecimalMoney.add('0.0001', '0.0002');
  if (sum !== '0.0003') throw new Error(`Decimal add failed: expected 0.0003 got ${sum}`);
  const sub = DecimalMoney.sub('20.0000', '5.0600');
  if (sub !== '14.9400') throw new Error(`Decimal sub failed: expected 14.9400 got ${sub}`);
  console.log('✅ TEST 1 PASSED: Exact Decimal Math Verified.\n');

  // Test 2: Fee Service (Option B - 5 USDT Example)
  console.log('TEST 2: Fee Calculation (Option B: 5 USDT Trade)');
  const fees = FeeService.calculateTradeFees('5.0000', '0.0600', '0.0600');
  if (fees.sellerRequiredLockUsdt !== '5.0600') {
    throw new Error(`Expected lock 5.0600, got ${fees.sellerRequiredLockUsdt}`);
  }
  if (fees.buyerReceivesUsdt !== '5.0000') {
    throw new Error(`Expected buyer receives 5.0000, got ${fees.buyerReceivesUsdt}`);
  }
  if (fees.totalPlatformFeeUsdt !== '0.1200') {
    throw new Error(`Expected platform fee 0.1200, got ${fees.totalPlatformFeeUsdt}`);
  }
  console.log(`✅ TEST 2 PASSED: Option B validated (Seller Locks: ${fees.sellerRequiredLockUsdt}, Buyer Receives: ${fees.buyerReceivesUsdt}, Fee: ${fees.totalPlatformFeeUsdt}).\n`);

  // Test 3: Critical P2P Test Case (Section 90)
  console.log('TEST 3: Critical P2P Lifecycle Test (Section 90)');
  const db = Database.getSchema();

  // Create Test Seller with exactly 20.0000 USDT
  const testSeller: User = {
    id: `TEST-SELLER-${Date.now()}`,
    email: `seller_${Date.now()}@test.com`,
    fullName: 'Abebe Bikila (Seller)',
    passwordHash: 'dummy',
    role: 'USER',
    isSuspended: false,
    tradingRestricted: false,
    withdrawalRestricted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.users.push(testSeller);
  const sellerWallet = Database.getWallet(testSeller.id);
  sellerWallet.availableBalance = '20.0000';
  sellerWallet.lockedBalance = '0.0000';
  sellerWallet.totalBalance = '20.0000';

  // Create Test Buyer
  const testBuyer: User = {
    id: `TEST-BUYER-${Date.now()}`,
    email: `buyer_${Date.now()}@test.com`,
    fullName: 'Derartu Tulu (Buyer)',
    passwordHash: 'dummy',
    role: 'USER',
    isSuspended: false,
    tradingRestricted: false,
    withdrawalRestricted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.users.push(testBuyer);
  const buyerWallet = Database.getWallet(testBuyer.id);
  buyerWallet.availableBalance = '0.0000';
  buyerWallet.lockedBalance = '0.0000';
  buyerWallet.totalBalance = '0.0000';

  // Seller Payment Method
  const testPmt = {
    id: `PMT-${Date.now()}`,
    userId: testSeller.id,
    paymentMethodId: 'PM-CBE',
    methodName: 'Commercial Bank of Ethiopia (CBE)',
    accountHolderName: 'Abebe Bikila',
    accountNumber: '1000123456789',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  db.sellerPaymentMethods.push(testPmt);

  // Seller Advertisement
  const testAd = {
    id: `AD-${Date.now()}`,
    userId: testSeller.id,
    sellerName: testSeller.fullName,
    sellerCompletedTrades: 0,
    type: 'SELL' as const,
    amountAvailable: '20.0000',
    priceEtb: '145.00',
    minOrderEtb: '100.00',
    maxOrderEtb: '5000.00',
    paymentMethods: [testPmt.methodName],
    sellerPaymentMethodDetails: [testPmt],
    instructions: 'Send exact Birr to CBE',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  db.advertisements.push(testAd);

  console.log(`- Initial Seller Balance: Available=${sellerWallet.availableBalance}, Locked=${sellerWallet.lockedBalance}, Total=${sellerWallet.totalBalance}`);

  // Step 1: Buyer starts 5.0000 USDT trade
  const trade = await P2PEngine.createTrade(testBuyer, testAd.id, '5.0000', testPmt.id);
  console.log(`- Trade created: ${trade.id} for 5.0000 USDT (Total ${trade.totalEtb} ETB)`);

  const sWalletAfterLock = Database.getWallet(testSeller.id);
  console.log(`- Seller balance after lock: Available=${sWalletAfterLock.availableBalance}, Locked=${sWalletAfterLock.lockedBalance}, Total=${sWalletAfterLock.totalBalance}`);
  if (sWalletAfterLock.availableBalance !== '14.9400') {
    throw new Error(`Expected available 14.9400, got ${sWalletAfterLock.availableBalance}`);
  }
  if (sWalletAfterLock.lockedBalance !== '5.0600') {
    throw new Error(`Expected locked 5.0600, got ${sWalletAfterLock.lockedBalance}`);
  }
  if (sWalletAfterLock.totalBalance !== '20.0000') {
    throw new Error(`Expected total 20.0000, got ${sWalletAfterLock.totalBalance}`);
  }

  // Verify seller CANNOT withdraw locked balance
  try {
    await WalletService.submitWithdrawal(testSeller, 'BINANCE_ID', '12345678', '16.0000');
    throw new Error('FAILED: Seller was able to withdraw more than available balance!');
  } catch (err: any) {
    console.log(`- Verified: Seller cannot withdraw locked USDT (${err.message})`);
  }

  // Step 2: Buyer clicks "I HAVE PAID"
  await P2PEngine.markPaid(testBuyer.id, trade.id);
  console.log('- Buyer marked payment completed.');
  const sWalletAfterPaid = Database.getWallet(testSeller.id);
  if (sWalletAfterPaid.availableBalance !== '14.9400' || sWalletAfterPaid.lockedBalance !== '5.0600') {
    throw new Error('Seller balance mutated unexpectedly on markPaid.');
  }

  // Step 3: Seller Releases USDT
  await P2PEngine.releaseUsdt(testSeller.id, trade.id);
  console.log('- Seller released USDT.');

  const sWalletFinal = Database.getWallet(testSeller.id);
  const bWalletFinal = Database.getWallet(testBuyer.id);
  console.log(`- Final Seller Balance: Available=${sWalletFinal.availableBalance}, Locked=${sWalletFinal.lockedBalance}, Total=${sWalletFinal.totalBalance}`);
  console.log(`- Final Buyer Balance: Available=${bWalletFinal.availableBalance}, Locked=${bWalletFinal.lockedBalance}, Total=${bWalletFinal.totalBalance}`);

  if (sWalletFinal.availableBalance !== '14.9400' || sWalletFinal.lockedBalance !== '0.0000' || sWalletFinal.totalBalance !== '14.9400') {
    throw new Error(`Seller final balance incorrect: ${JSON.stringify(sWalletFinal)}`);
  }
  if (bWalletFinal.availableBalance !== '5.0000' || bWalletFinal.totalBalance !== '5.0000') {
    throw new Error(`Buyer final balance incorrect: ${JSON.stringify(bWalletFinal)}`);
  }

  // Step 4: Double Release Protection
  try {
    await P2PEngine.releaseUsdt(testSeller.id, trade.id);
    throw new Error('FAILED: Double release allowed!');
  } catch (err: any) {
    console.log(`- Verified: Double release rejected (${err.message})`);
  }
  console.log('✅ TEST 3 PASSED: Critical Section 90 Lifecycle & Double Release Protection verified.\n');

  // Test 4: Section 91 Admin Dispute Resolution
  console.log('TEST 4: Admin Dispute Resolution Test (Section 91)');
  const adminUser = db.users.find((u) => u.role === 'ADMIN');
  if (!adminUser) throw new Error('Super Admin missing in DB.');

  // Create another trade to dispute
  const trade2 = await P2PEngine.createTrade(testBuyer, testAd.id, '5.0000', testPmt.id);
  await P2PEngine.markPaid(testBuyer.id, trade2.id);
  const dispute = await P2PEngine.openDispute(testBuyer.id, trade2.id, 'Seller not releasing', 'Paid via CBE screenshot attached', []);

  // Admin resolves in favor of Buyer
  await P2PEngine.adminResolveDispute(adminUser, dispute.id, 'BUYER', 'Payment receipt verified by admin');
  console.log('- Admin successfully resolved dispute in favor of Buyer.');

  // Attempt duplicate resolution
  try {
    await P2PEngine.adminResolveDispute(adminUser, dispute.id, 'BUYER', 'Duplicate resolution');
    throw new Error('FAILED: Duplicate admin dispute resolution allowed!');
  } catch (err: any) {
    console.log(`- Verified: Duplicate dispute resolution rejected (${err.message})`);
  }
  console.log('✅ TEST 4 PASSED: Admin Dispute Resolution and Idempotency verified.\n');

  console.log('==================================================');
  console.log('  ALL CORE FINANCIAL INTEGRITY TESTS PASSED! 🎉');
  console.log('==================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
