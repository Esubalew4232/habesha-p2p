/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp, Trade } from '../../context/AppContext';
import { ArrowLeftRight, Clock, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';

export const TradesTab: React.FC = () => {
  const { t, trades, user, selectedTrade, setSelectedTrade } = useApp();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED'>('ALL');

  const filteredTrades = trades.filter((tr) => {
    if (filter === 'ACTIVE') {
      return tr.status === 'PAYMENT_PENDING' || tr.status === 'BUYER_MARKED_PAID' || tr.status === 'DISPUTED';
    }
    if (filter === 'COMPLETED') {
      return tr.status === 'COMPLETED';
    }
    if (filter === 'DISPUTED') {
      return tr.status === 'DISPUTED';
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAYMENT_PENDING':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
            <Clock className="w-3 h-3 animate-pulse" />
            <span>Pending</span>
          </span>
        );
      case 'BUYER_MARKED_PAID':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-bold">
            <Clock className="w-3 h-3" />
            <span>Paid</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'DISPUTED':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
            <AlertTriangle className="w-3 h-3" />
            <span>Dispute</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
            <XCircle className="w-3 h-3" />
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24 text-white">
      {/* Heading */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-slate-100">{t.trades}</h2>
          <p className="text-xs text-slate-400">Your peer-to-peer escrow transactions</p>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex space-x-2 overflow-x-auto pb-1">
        {(['ALL', 'ACTIVE', 'COMPLETED', 'DISPUTED'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-teal-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Trades List */}
      <div className="space-y-2.5">
        {filteredTrades.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-2">
            <ArrowLeftRight className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">No trades found matching this filter.</p>
          </div>
        ) : (
          filteredTrades.map((tr) => {
            const isBuyer = user?.id === tr.buyerId;
            return (
              <div
                key={tr.id}
                onClick={() => setSelectedTrade(tr)}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-amber-400">{tr.id}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {isBuyer ? 'BUY' : 'SELL'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isBuyer ? `Seller: ${tr.sellerName}` : `Buyer: ${tr.buyerName}`}
                    </p>
                  </div>

                  {getStatusBadge(tr.status)}
                </div>

                <div className="flex justify-between items-end pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-sm font-bold text-white font-mono block">
                      {tr.tradeAmountUsdt} USDT
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Total: <span className="text-amber-400 font-semibold">{tr.totalEtb} ETB</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 text-xs text-teal-400 font-medium">
                    <span>View Escrow</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
