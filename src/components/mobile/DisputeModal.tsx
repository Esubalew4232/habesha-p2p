/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, AlertTriangle, Check, UploadCloud } from 'lucide-react';

interface DisputeModalProps {
  tradeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({ tradeId, onClose, onSuccess }) => {
  const { t, apiCall } = useApp();
  const [reason, setReason] = useState('Payment made but seller not releasing');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasons = [
    'Payment made but seller not releasing',
    'Buyer marked paid but funds not received in bank/Telebirr',
    'Incorrect Birr amount transferred',
    'Invalid/fake bank receipt provided',
    'Other dispute reason',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explanation.trim()) {
      setError('Please provide a detailed explanation.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiCall(`/api/trades/${tradeId}/dispute`, 'POST', {
        reason,
        explanation,
        evidenceUrls: [
          'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=60',
        ],
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to open dispute.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 text-white space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h4 className="font-bold text-sm text-white">{t.disputeTitle}</h4>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">{t.disputeReason}</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
            >
              {reasons.map((r, i) => (
                <option key={i} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">{t.disputeExplanation}</label>
            <textarea
              required
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Provide transaction details, time of payment, reference numbers..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="p-3 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-center space-y-1">
            <UploadCloud className="w-5 h-5 text-teal-400 mx-auto" />
            <span className="text-[11px] text-slate-300 block font-medium">Bank receipt attached</span>
            <span className="text-[9px] text-slate-500">JPG, PNG or PDF</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs active:scale-98 transition-all disabled:opacity-50"
          >
            {loading ? 'Submitting...' : t.submitDisputeBtn}
          </button>
        </form>
      </div>
    </div>
  );
};
