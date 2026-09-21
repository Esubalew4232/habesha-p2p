/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Habesha P2P - Authoritative Centralized Trading Fee Service
 * User Selected: Option B (Seller locks trade amount + seller fee).
 * Example: 5.0000 USDT trade:
 *  - Seller Fee = 0.0600 USDT
 *  - Buyer Fee  = 0.0600 USDT
 *  - Seller Locked USDT = 5.0600 USDT
 *  - Buyer Receives = 5.0000 USDT
 *  - Total Platform Fee = 0.1200 USDT
 */

import { DecimalMoney } from './decimal.js';

export interface FeeStructure {
  sellerFeeUsdt: string;
  buyerFeeUsdt: string;
  totalPlatformFeeUsdt: string;
  sellerRequiredLockUsdt: string;
  buyerReceivesUsdt: string;
}

export class FeeService {
  private static defaultSellerFee = '0.0600';
  private static defaultBuyerFee = '0.0600';

  /**
   * Calculates precise settlement amounts using exact decimal math.
   * Authoritative calculation used on trade creation, lock, and settlement.
   */
  public static calculateTradeFees(
    tradeAmountUsdt: string,
    configuredSellerFee = this.defaultSellerFee,
    configuredBuyerFee = this.defaultBuyerFee
  ): FeeStructure {
    const formattedTrade = DecimalMoney.format(tradeAmountUsdt);
    const sellerFee = DecimalMoney.format(configuredSellerFee);
    const buyerFee = DecimalMoney.format(configuredBuyerFee);

    // Option B: Seller locks trade amount + seller fee
    const sellerRequiredLock = DecimalMoney.add(formattedTrade, sellerFee);
    const totalPlatformFee = DecimalMoney.add(sellerFee, buyerFee);

    return {
      sellerFeeUsdt: sellerFee,
      buyerFeeUsdt: buyerFee,
      totalPlatformFeeUsdt: totalPlatformFee,
      sellerRequiredLockUsdt: sellerRequiredLock,
      buyerReceivesUsdt: formattedTrade,
    };
  }

  public static getDefaults() {
    return {
      sellerFee: this.defaultSellerFee,
      buyerFee: this.defaultBuyerFee,
    };
  }
}
