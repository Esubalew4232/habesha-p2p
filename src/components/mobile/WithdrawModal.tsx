/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, ArrowUpCircle, AlertCircle, Check, ShieldAlert } from 'lucide-react';

interface WithdrawModalProps {
  onClose: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ onClose }) => {
  const { t, wallet, apiCall, refreshData } = useApp();
  const [method, setMethod] = useState<'BINANCE_ID' | 'BYBIT_ID'>('BINANCE_ID');
  const [destinationId, setDestinationId] = useState('');
  const [amount, setAmount] = useState('5.0000');
  const [isConfirming, setIsConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const available = parseFloat(wallet?.availableBalance || '0');
  const withdrawNum = parseFloat(amount || '0');

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!destinationId.trim()) {
      setError('Please provide a valid destination ID.');
      return;
    }
    if (withdrawNum < 5) {
      setError('Minimum withdrawal is 5.0000 USDT.');
      return;
    }
    if (withdrawNum > available) {
      setError(`Insufficient available balance. You only have ${wallet?.availableBalance} USDT available.`);
      return;
    }

    setIsConfirming(true);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiCall('/api/wallet/withdraw', 'POST', {
        method,
        destinationId,
        amount,
      });
      setSuccess(true);
      await refreshData();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed.');
      setIsConfirming(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto text-white">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">{t.withdrawTitle}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-emerald-400">{t.withdrawSuccess}</h4>
            <p className="text-xs text-slate-400">Funds reserved. Our admin will transfer USDT and provide verification proof.</p>
          </div>
        ) : isConfirming ? (
          /* Confirmation Screen per Section 15 */
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Destination Platform</span>
                <span className="font-bold text-white">{method === 'BINANCE_ID' ? 'Binance Pay ID' : 'Bybit UID'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Destination ID</span>
                <span className="font-mono text-teal-400 font-bold">{destinationId}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Amount to Withdraw</span>
                <span className="font-bold text-amber-400">{amount} USDT</span>
              </div>
              <div className="flex justify-between text-xs pt-2 border-t border-slate-800">
                <span className="text-slate-400">Network Fee</span>
                <span className="text-emerald-400 font-semibold">0.0000 USDT (Zero Fee)</span>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Please double-check your platform ID carefully. Incorrect IDs cannot be refunded after payout.</span>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-medium text-xs"
              >
                Back / Edit
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs active:scale-98 transition-all"
              >
                {loading ? 'Processing...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleNext} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Method Picker (Strictly Binance ID or Bybit ID) */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Withdrawal Destination</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMethod('BINANCE_ID')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    method === 'BINANCE_ID'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <p className="font-bold text-xs">Binance ID</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Binance Pay ID</p>
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('BYBIT_ID')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    method === 'BYBIT_ID'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <p className="font-bold text-xs">Bybit ID</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Bybit User UID</p>
                </button>
              </div>
            </div>

            {/* Destination ID */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">{t.destinationId}</label>
              <input
                type="text"
                required
                placeholder={method === 'BINANCE_ID' ? 'e.g. 198472910' : 'e.g. 84920482'}
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Amount */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <label className="text-slate-300">{t.withdrawAmount}</label>
                <span className="text-slate-500">Available: <span className="text-teal-400 font-semibold">{wallet?.availableBalance || '0.0000'} USDT</span></span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  min="5"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setAmount(wallet?.availableBalance || '5.0000')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-teal-400 hover:text-teal-300 uppercase"
                >
                  MAX
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 leading-snug">
              {t.withdrawWarning}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-600/20 active:scale-98 transition-all"
            >
              Continue to Confirmation
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
