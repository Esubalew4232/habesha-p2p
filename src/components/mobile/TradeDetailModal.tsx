/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp, Trade } from '../../context/AppContext';
import { 
  X, 
  Copy, 
  Check, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  Lock,
  UploadCloud,
  XCircle
} from 'lucide-react';
import { DisputeModal } from './DisputeModal';

interface TradeDetailModalProps {
  trade: Trade;
  onClose: () => void;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({ trade: initialTrade, onClose }) => {
  const { t, user, apiCall, refreshData } = useApp();
  const [trade, setTrade] = useState<Trade>(initialTrade);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const isBuyer = user?.id === trade.buyerId;
  const isSeller = user?.id === trade.sellerId;

  // Poll current trade status
  useEffect(() => {
    const fetchTrade = async () => {
      try {
        const data = await apiCall(`/api/trades/${trade.id}`);
        if (data.trade) {
          setTrade(data.trade);
        }
      } catch (err) {
        // ignore
      }
    };
    fetchTrade();
    const interval = setInterval(fetchTrade, 3000);
    return () => clearInterval(interval);
  }, [trade.id, apiCall]);

  // Countdown timer calculation
  useEffect(() => {
    const calcTime = () => {
      const diff = Math.max(0, Math.floor((new Date(trade.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
    };
    calcTime();
    const timer = setInterval(calcTime, 1000);
    return () => clearInterval(timer);
  }, [trade.expiresAt]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkPaid = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall(`/api/trades/${trade.id}/pay`, 'POST', {
        paymentProofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60',
      });
      setTrade(data.trade);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall(`/api/trades/${trade.id}/release`, 'POST');
      setTrade(data.trade);
      setShowReleaseConfirm(false);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Release failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this trade?')) return;
    setLoading(true);
    try {
      const data = await apiCall(`/api/trades/${trade.id}/cancel`, 'POST');
      setTrade(data.trade);
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'Cancel failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 max-h-[92vh] overflow-y-auto text-white space-y-4">
        {/* Top Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-amber-400">{trade.id}</span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                trade.status === 'COMPLETED'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : trade.status === 'DISPUTED'
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'bg-teal-500/20 text-teal-300'
              }`}>
                {trade.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isBuyer ? `Buying from ${trade.sellerName}` : `Selling to ${trade.buyerName}`}
            </p>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Timer Banner if Pending */}
        {trade.status === 'PAYMENT_PENDING' && (
          <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>Payment Window</span>
            </div>
            <span className="font-mono font-bold text-sm text-amber-400">{formatTimer(timeLeft)}</span>
          </div>
        )}

        {/* Amount & Fee Box (Option B Settlement) */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Amount to Pay</span>
            <span className="text-lg font-black text-white">{trade.totalEtb} ETB</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>USDT Receiving</span>
            <span className="text-base font-bold text-teal-400">{trade.tradeAmountUsdt} USDT</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Unit Price</span>
            <span className="font-mono text-slate-300">1 USDT = {trade.priceEtb} ETB</span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[11px] text-slate-500">
            <span className="flex items-center space-x-1">
              <Lock className="w-3 h-3 text-teal-400" />
              <span>Locked in Escrow (Option B)</span>
            </span>
            <span className="font-mono text-slate-400">{trade.lockedSellerUsdt} USDT</span>
          </div>
        </div>

        {/* Payment Account Details */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            {t.sellerAccountInfo}
          </h4>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">{t.bankName}</span>
              <span className="font-bold text-amber-300">{trade.selectedPaymentMethod?.methodName}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">{t.accountName}</span>
              <span className="font-medium text-white">{trade.selectedPaymentMethod?.accountHolderName}</span>
            </div>

            <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block">{t.accountNumber}</span>
                <span className="font-mono font-bold text-white text-sm">
                  {trade.selectedPaymentMethod?.accountNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(trade.selectedPaymentMethod?.accountNumber || '')}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Safety Warning */}
        <div className="p-3 bg-teal-950/40 border border-teal-800/40 rounded-xl text-teal-300 text-[11px] flex items-start space-x-2 leading-relaxed">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-teal-400" />
          <span>{t.tradeSafetyWarning}</span>
        </div>

        {/* Buyer Actions */}
        {isBuyer && trade.status === 'PAYMENT_PENDING' && (
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-600/30 flex items-center justify-center space-x-2 active:scale-98 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.iHavePaidBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="w-full py-2.5 text-slate-400 hover:text-rose-400 text-xs font-medium transition-colors"
            >
              {t.cancelTradeBtn}
            </button>
          </div>
        )}

        {/* Buyer waiting for release */}
        {isBuyer && trade.status === 'BUYER_MARKED_PAID' && (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-3">
            <div className="flex items-center justify-center space-x-2 text-teal-400 text-xs font-semibold">
              <Clock className="w-4 h-4 animate-spin" />
              <span>You marked paid. Awaiting seller release.</span>
            </div>
            <button
              type="button"
              onClick={() => setShowDisputeModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium border border-slate-700"
            >
              {t.openDisputeBtn}
            </button>
          </div>
        )}

        {/* Seller Actions */}
        {isSeller && trade.status === 'BUYER_MARKED_PAID' && (
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t.sellerReleaseWarning}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowReleaseConfirm(true)}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 active:scale-98 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.releaseUsdtBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDisputeModal(true)}
              className="w-full py-2.5 text-slate-400 hover:text-amber-400 text-xs font-medium text-center block"
            >
              {t.openDisputeBtn}
            </button>
          </div>
        )}

        {/* Completed State */}
        {trade.status === 'COMPLETED' && (
          <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="font-bold text-sm text-emerald-300">Trade Completed Successfully!</h4>
            <p className="text-xs text-slate-400">The escrow has settled and funds are available in the buyer's wallet.</p>
          </div>
        )}

        {/* DISPUTED State */}
        {trade.status === 'DISPUTED' && (
          <div className="p-4 bg-rose-950/30 border border-rose-800/60 rounded-2xl space-y-3">
            <div className="flex items-center space-x-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
              <h4 className="font-black text-sm text-white">Dispute Under Active Arbitration</h4>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Dispute Case ID:</span>
                <span className="font-mono text-amber-400 font-bold">{trade.disputeId || `DSP-${trade.id}`}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Escrow Security:</span>
                <span className="text-teal-300 font-bold flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>USDT Locked & Protected</span>
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Current Status:</span>
                <span className="text-amber-300 font-semibold">Under Official Investigation</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <p className="font-semibold text-rose-300">What happens now:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                <li>USDT escrow funds are completely frozen and cannot be withdrawn.</li>
                <li>The admin is cross-checking bank transaction SMS and payment slips.</li>
                <li>You can send transaction screenshots and references directly to the bot.</li>
              </ul>
            </div>

            <a
              href="https://t.me/habeshap2pbbot"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-md transition-colors"
            >
              <span>Submit Proof to Arbitrator @habeshap2pbbot</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* ADMIN RESOLVED State */}
        {trade.status === 'ADMIN_RESOLVED' && (
          <div className="p-4 bg-teal-950/30 border border-teal-800/50 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto" />
            <h4 className="font-bold text-sm text-teal-300">Dispute Resolved by Admin</h4>
            <p className="text-xs text-slate-400">
              The administrator has concluded arbitration. The locked USDT escrow funds have been released according to verified evidence.
            </p>
          </div>
        )}

        {/* CANCELLED State */}
        {trade.status === 'CANCELLED' && (
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-2">
            <XCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="font-bold text-sm text-slate-300">Trade Cancelled</h4>
            <p className="text-xs text-slate-400">
              This trade was cancelled and the locked USDT was returned safely to the seller's available balance.
            </p>
          </div>
        )}

        {/* Direct Telegram Support Link */}
        <div className="pt-2">
          <a
            href="https://t.me/habeshap2pbbot"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs flex items-center justify-center space-x-2 transition-colors"
          >
            <span>Need Help? Contact @habeshap2pbbot</span>
            <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
          </a>
        </div>

        {/* Seller Confirmation Modal */}
        {showReleaseConfirm && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xs w-full p-5 space-y-4 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
              <h4 className="font-bold text-sm text-white">{t.releaseConfirmTitle}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{t.releaseConfirmDesc}</p>
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowReleaseConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRelease}
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs active:scale-98"
                >
                  {loading ? 'Releasing...' : 'Yes, Release'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Modal */}
        {showDisputeModal && (
          <DisputeModal
            tradeId={trade.id}
            onClose={() => setShowDisputeModal(false)}
            onSuccess={() => {
              setShowDisputeModal(false);
              refreshData();
            }}
          />
        )}
      </div>
    </div>
  );
};
