/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ShoppingCart, 
  TrendingUp, 
  Lock, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  History,
  CreditCard,
  Sparkles,
  Zap
} from 'lucide-react';
import { DepositModal } from './DepositModal';
import { WithdrawModal } from './WithdrawModal';
import { PaymentMethodsModal } from './PaymentMethodsModal';

export const DashboardTab: React.FC = () => {
  const { t, wallet, user, trades, setActiveTab, setSelectedTrade, apiCall } = useApp();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [ledger, setLedger] = useState<any[]>([]);

  useEffect(() => {
    apiCall('/api/wallet/ledger').then((data) => {
      if (data.ledger) {
        setLedger(data.ledger.slice(0, 5));
      }
    });
  }, [apiCall, wallet]);

  const activeTrade = trades.find(
    (tr) => tr.status === 'PAYMENT_PENDING' || tr.status === 'BUYER_MARKED_PAID' || tr.status === 'DISPUTED'
  );

  const availableNum = parseFloat(wallet?.availableBalance || '0');
  const approxBirr = (availableNum * 145.5).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="p-4 space-y-4 pb-24 text-white animate-in fade-in duration-200">
      {/* User Greeting & Status */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-400">Selam,</span>
            <span className="text-xs font-bold text-teal-400">ሰላም</span>
          </div>
          <h2 className="text-base font-black text-white tracking-tight">{user?.fullName || 'Habesha Trader'}</h2>
        </div>
        <div className="flex items-center space-x-1.5 px-3 py-1 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/30 rounded-full text-teal-300 text-[11px] font-bold shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          <span>{t.verified}</span>
        </div>
      </div>

      {/* Authoritative Wallet Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden group">
        {/* Subtle background glow accent */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex justify-between items-start mb-3 relative z-10">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t.availableBalance}
            </span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-black tracking-tight text-white font-mono">
                {wallet?.availableBalance || '0.0000'}
              </span>
              <span className="text-xs font-bold text-teal-400 tracking-wider">USDT</span>
            </div>
            <p className="text-[11px] text-amber-400 font-mono mt-0.5">
              ≈ {approxBirr} <span className="text-[10px] text-amber-500/90 font-sans">ETB</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-md shadow-teal-500/10">
            <span className="font-black text-lg">₮</span>
          </div>
        </div>

        {/* Locked & Total Balances (Authoritative invariant: Total = Available + Locked) */}
        <div className="grid grid-cols-2 gap-3 pt-3.5 border-t border-slate-800/80 relative z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">{t.lockedBalance}</span>
              <span className="font-mono text-xs font-bold text-amber-300">
                {wallet?.lockedBalance || '0.0000'} USDT
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
              <span className="font-bold text-xs">Σ</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">{t.totalBalance}</span>
              <span className="font-mono text-xs font-bold text-slate-200">
                {wallet?.totalBalance || '0.0000'} USDT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Grid (Deposit, Withdraw, Buy, Sell) */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => setShowDeposit(true)}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-850 active:scale-95 transition-all shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-1.5 shadow-sm">
            <ArrowDownCircle className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-200">{t.depositBtn}</span>
        </button>

        <button
          onClick={() => setShowWithdraw(true)}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 active:scale-95 transition-all shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-1.5 shadow-sm">
            <ArrowUpCircle className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-200">{t.withdrawBtn}</span>
        </button>

        <button
          onClick={() => setActiveTab('MARKET')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 active:scale-95 transition-all shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1.5 shadow-sm">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-200">{t.buyUsdtQuick}</span>
        </button>

        <button
          onClick={() => setActiveTab('MARKET')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-850 active:scale-95 transition-all shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-1.5 shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-slate-200">{t.sellUsdtQuick}</span>
        </button>
      </div>

      {/* Ethiopian Bank Setup Shortcut */}
      <div 
        onClick={() => setShowPaymentMethods(true)}
        className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-950 border border-teal-500/20 flex items-center justify-between cursor-pointer hover:border-teal-500/50 transition-all shadow-sm group"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
              Ethiopian Bank & Telebirr Accounts
            </h4>
            <p className="text-[11px] text-slate-400">Configure CBE, Telebirr, Awash, or Dashen to receive Birr</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
      </div>

      {/* Active Trade Banner */}
      {activeTrade && (
        <div
          onClick={() => setSelectedTrade(activeTrade)}
          className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/70 to-slate-900 border border-teal-500/50 flex items-center justify-between cursor-pointer hover:border-teal-400 transition-all shadow-lg shadow-teal-950/50"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center animate-pulse">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">Active Trade #{activeTrade.id}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                  {activeTrade.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 font-mono">
                {activeTrade.tradeAmountUsdt} USDT • {activeTrade.totalEtb} ETB
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-teal-400" />
        </div>
      )}

      {/* Recent Immutable Ledger Transactions */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200">
            <History className="w-4 h-4 text-teal-400" />
            <span>{t.recentTransactions}</span>
          </div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Authoritative Ledger</span>
        </div>

        {ledger.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-1">
            <p className="font-semibold text-slate-300">{t.noTransactions}</p>
            <p className="text-[11px] text-slate-500">Deposit USDT or start a P2P trade to see financial ledger entries.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ledger.map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-xs font-bold ${
                      entry.type === 'DEPOSIT' || entry.type === 'P2P_BUY' ? 'text-emerald-400' : 'text-slate-200'
                    }`}>
                      {entry.type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">#{entry.referenceId}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{entry.description}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-white block">
                    {entry.type.includes('DEPOSIT') || entry.type.includes('BUY') || entry.type.includes('REFUND') ? '+' : '-'}
                    {entry.amount} USDT
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    Avail: {entry.availableAfter}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
      {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} />}
      {showPaymentMethods && <PaymentMethodsModal onClose={() => setShowPaymentMethods(false)} />}
    </div>
  );
};
