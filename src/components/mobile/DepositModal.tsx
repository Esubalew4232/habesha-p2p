/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Copy, Check, QrCode, AlertCircle, ArrowDownCircle } from 'lucide-react';

interface DepositModalProps {
  onClose: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({ onClose }) => {
  const { t, apiCall, refreshData } = useApp();
  const [methods, setMethods] = useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [amount, setAmount] = useState('10.0000');
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiCall('/api/wallet/deposit-methods').then((data) => {
      if (data.depositMethods && data.depositMethods.length > 0) {
        setMethods(data.depositMethods);
        setSelectedMethodId(data.depositMethods[0].id);
      }
    });
  }, [apiCall]);

  const currentMethod = methods.find((m) => m.id === selectedMethodId);

  const handleCopy = () => {
    if (currentMethod) {
      navigator.clipboard.writeText(currentMethod.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!txHash.trim()) {
      setError('Please provide the transaction hash (TxID).');
      return;
    }

    setLoading(true);
    try {
      await apiCall('/api/wallet/deposit', 'POST', {
        methodId: selectedMethodId,
        amount,
        txHash,
        proofImageUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=600&auto=format&fit=crop&q=60',
      });
      setSuccess(true);
      await refreshData();
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit deposit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto text-white">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">{t.depositTitle}</h3>
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
            <h4 className="font-bold text-sm text-emerald-400">{t.depositSuccess}</h4>
            <p className="text-xs text-slate-400">Your deposit request is pending administrator verification.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Select Method */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">{t.selectMethod}</label>
              <div className="grid grid-cols-2 gap-2">
                {methods.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMethodId(m.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedMethodId === m.id
                        ? 'bg-teal-500/10 border-teal-500 text-teal-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <p className="font-bold text-xs">{m.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{m.network}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Address & QR */}
            {currentMethod && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{t.depositAddress}</span>
                  <span className="text-[10px] text-amber-400">Min: {currentMethod.minDeposit} USDT</span>
                </div>

                <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                  <span className="font-mono text-xs text-teal-300 truncate max-w-[240px]">
                    {currentMethod.address}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">
                  {currentMethod.instructions}
                </p>
              </div>
            )}

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Amount (USDT)</label>
              <input
                type="number"
                step="0.0001"
                min="5"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* TxID */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">{t.txHash}</label>
              <input
                type="text"
                required
                placeholder="e.g. 0x4f2b9a7c... or Tron TxID"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-600/20 active:scale-98 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Submitting...' : t.submitDeposit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
