/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Habesha P2P - Exact Decimal Precision Math Service
 * Strict requirement: Do NOT use floating point arithmetic for balances,
 * fees, deposits, withdrawals, or trade settlements.
 * 1 USDT = 10,000 Micro-Units (4 decimal places).
 */

export class DecimalMoney {
  private static readonly SCALE = 10000n; // 4 decimal places precision (0.0001 USDT)

  public static toMicro(val: number | string): bigint {
    const s = typeof val === 'number' ? val.toFixed(4) : val.trim();
    const parts = s.split('.');
    const whole = BigInt(parts[0] || '0');
    let fracStr = (parts[1] || '').padEnd(4, '0').slice(0, 4);
    const frac = BigInt(fracStr);
    return (whole >= 0n ? 1n : -1n) * (BigInt(Math.abs(Number(parts[0] || 0))) * this.SCALE + frac);
  }

  public static fromMicro(micro: bigint): string {
    const isNegative = micro < 0n;
    const abs = isNegative ? -micro : micro;
    const whole = abs / this.SCALE;
    const frac = abs % this.SCALE;
    const fracStr = frac.toString().padStart(4, '0');
    return `${isNegative ? '-' : ''}${whole}.${fracStr}`;
  }

  public static format(val: number | string): string {
    return this.fromMicro(this.toMicro(val));
  }

  public static add(a: string | number, b: string | number): string {
    return this.fromMicro(this.toMicro(a) + this.toMicro(b));
  }

  public static sub(a: string | number, b: string | number): string {
    return this.fromMicro(this.toMicro(a) - this.toMicro(b));
  }

  public static mul(a: string | number, factor: number): string {
    const factorMicro = BigInt(Math.round(factor * 10000));
    const resultMicro = (this.toMicro(a) * factorMicro) / 10000n;
    return this.fromMicro(resultMicro);
  }

  public static gte(a: string | number, b: string | number): boolean {
    return this.toMicro(a) >= this.toMicro(b);
  }

  public static gt(a: string | number, b: string | number): boolean {
    return this.toMicro(a) > this.toMicro(b);
  }

  public static lte(a: string | number, b: string | number): boolean {
    return this.toMicro(a) <= this.toMicro(b);
  }

  public static lt(a: string | number, b: string | number): boolean {
    return this.toMicro(a) < this.toMicro(b);
  }

  public static eq(a: string | number, b: string | number): boolean {
    return this.toMicro(a) === this.toMicro(b);
  }

  public static isZero(a: string | number): boolean {
    return this.toMicro(a) === 0n;
  }
}
