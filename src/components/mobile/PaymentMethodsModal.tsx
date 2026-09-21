/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Plus,
  Trash2,
  CreditCard,
  Building2,
  Smartphone,
  Search,
  CheckCircle2,
  Copy,
  Check,
  Star,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';

interface PaymentMethodsModalProps {
  onClose: () => void;
  onAdded?: (newMethod: any) => void;
}

export const PaymentMethodsModal: React.FC<PaymentMethodsModalProps> = ({ onClose, onAdded }) => {
  const { t, apiCall } = useApp();
  const [methods, setMethods] = useState<any[]>([]);
  const [systemMethods, setSystemMethods] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [showBankList, setShowBankList] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSystemMethod, setSelectedSystemMethod] = useState<any | null>(null);

  // Form state
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [extraDetails, setExtraDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchMethods = async () => {
    try {
      // Fetch system banks
      let sysData;
      try {
        sysData = await apiCall('/api/market/supported-payment-methods');
      } catch {
        sysData = await apiCall('/api/market/payment-methods');
      }

      const rawMethods = sysData?.paymentMethods || [];
      setSystemMethods(rawMethods);

      // Default select CBE or first popular
      const cbe = rawMethods.find((m: any) => m.id === 'PM-CBE') || rawMethods[0];
      if (cbe && !selectedSystemMethod) {
        setSelectedSystemMethod(cbe);
      }

      const myData = await apiCall('/api/market/my-payment-methods');
      setMethods(myData.sellerPaymentMethods || []);
    } catch (err) {
      console.warn('Error fetching payment methods:', err);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const filteredSystemMethods = useMemo(() => {
    if (!searchQuery.trim()) return systemMethods;
    const q = searchQuery.toLowerCase().trim();
    return systemMethods.filter((sm) => {
      const nameMatch = sm.name?.toLowerCase().includes(q);
      const amharicMatch = sm.amharicName?.toLowerCase().includes(q);
      const codeMatch = sm.shortCode?.toLowerCase().includes(q);
      return nameMatch || amharicMatch || codeMatch;
    });
  }, [systemMethods, searchQuery]);

  const popularMethods = useMemo(() => {
    return systemMethods.filter((sm) => sm.isPopular || ['PM-CBE', 'PM-TELEBIRR', 'PM-AWASH', 'PM-DASHEN', 'PM-BOA', 'PM-CBEBIRR', 'PM-COOP'].includes(sm.id));
  }, [systemMethods]);

  const handleSelectBank = (sm: any) => {
    setSelectedSystemMethod(sm);
    setError(null);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSystemMethod) {
      setError('Please choose a bank or mobile wallet.');
      return;
    }
    if (!accountHolderName.trim()) {
      setError('Please provide the account holder full name.');
      return;
    }
    if (!accountNumber.trim()) {
      setError('Please provide the account number or phone number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiCall('/api/market/my-payment-methods', 'POST', {
        paymentMethodId: selectedSystemMethod.id,
        accountHolderName: accountHolderName.trim(),
        accountNumber: accountNumber.trim(),
        extraDetails: extraDetails.trim(),
      });
      setIsAdding(false);
      setAccountHolderName('');
      setAccountNumber('');
      setExtraDetails('');
      setSearchQuery('');
      await fetchMethods();
      if (onAdded && res?.sellerPaymentMethod) {
        onAdded(res.sellerPaymentMethod);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add payment method.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this payment method?')) return;
    try {
      await apiCall(`/api/market/my-payment-methods/${id}`, 'DELETE');
      await fetchMethods();
    } catch (err: any) {
      alert(err.message || 'Failed to delete method.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800/90 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 max-h-[92vh] flex flex-col text-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-teal-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">{t.configuredPaymentMethods}</h3>
              <p className="text-[11px] text-slate-400">Ethiopian Banks & Telebirr Mobile Wallets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs shrink-0 flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-y-auto mt-3 space-y-4 pr-0.5 flex-1">
          {isAdding ? (
            <form onSubmit={handleAdd} className="space-y-4">
              {/* Add form banner */}
              <div className="bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-950 p-3.5 rounded-2xl border border-teal-500/20 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-teal-300 uppercase tracking-wider">Select Ethiopian Bank</h4>
                  <p className="text-[11px] text-slate-400">Search by English or Amharic name</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/80"
                >
                  Cancel
                </button>
              </div>

              {/* Payment Method - Serez Selector (Not just listed down) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Payment Method <span className="text-teal-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {selectedSystemMethod ? '1 bank chosen' : 'Choose 1 or more'}
                  </span>
                </div>

                {/* Serez Trigger Button */}
                <button
                  type="button"
                  onClick={() => setShowBankList(!showBankList)}
                  className={`w-full p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
                    showBankList
                      ? 'bg-slate-800 border-teal-500 text-white shadow-sm ring-1 ring-teal-500'
                      : selectedSystemMethod
                      ? 'bg-slate-950 border-teal-500/50 text-white hover:border-teal-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {selectedSystemMethod ? (
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 text-white shadow-sm"
                        style={{ backgroundColor: selectedSystemMethod.color || '#0284c7' }}
                      >
                        {selectedSystemMethod.type === 'MOBILE_MONEY' ? (
                          <Smartphone className="w-3.5 h-3.5" />
                        ) : (
                          <Building2 className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="text-left truncate">
                        <span className="font-bold text-white block text-xs truncate">
                          {selectedSystemMethod.name}
                        </span>
                        {selectedSystemMethod.amharicName && (
                          <span className="text-[10px] text-teal-300 block truncate">
                            {selectedSystemMethod.amharicName}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400">Select payment method...</span>
                  )}

                  <div className="flex items-center space-x-1.5 text-slate-400 shrink-0 ml-2">
                    <span className="text-[10px] font-bold text-teal-400 px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/25">
                      ሰረዝ
                    </span>
                    {showBankList ? (
                      <ChevronUp className="w-4 h-4 text-teal-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Bank List Dropdown - Revealed by clicking serez, and hidden immediately when a bank is chosen */}
                {showBankList && (
                  <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[11px] font-semibold text-slate-300">
                        Choose Bank or Mobile Wallet
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowBankList(false)}
                        className="text-[11px] text-slate-400 hover:text-white"
                      >
                        Close ሰረዝ
                      </button>
                    </div>

                    {/* Search Bar for Bank list */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search bank e.g. CBE, Telebirr, Awash, Dashen..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        autoFocus
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* All Banks List */}
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                      {filteredSystemMethods.length === 0 ? (
                        <p className="text-center py-3 text-xs text-slate-500">
                          No bank found matching "{searchQuery}"
                        </p>
                      ) : (
                        filteredSystemMethods.map((sm) => {
                          const isSelected = selectedSystemMethod?.id === sm.id;
                          const isWallet = sm.type === 'MOBILE_MONEY';
                          return (
                            <button
                              key={sm.id}
                              type="button"
                              onClick={() => {
                                setSelectedSystemMethod(sm);
                                setShowBankList(false); // IMMEDIATELY HIDE BANK LIST AS REQUESTED
                                setError(null);
                              }}
                              className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-colors ${
                                isSelected
                                  ? 'bg-teal-950/50 border border-teal-500/80 text-white'
                                  : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 text-white"
                                  style={{ backgroundColor: sm.color || (isWallet ? '#0284c7' : '#7c3aed') }}
                                >
                                  {isWallet ? <Smartphone className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                                </div>
                                <div className="truncate">
                                  <span className="font-semibold text-xs text-white block truncate">{sm.name}</span>
                                  {sm.amharicName && (
                                    <span className="text-[10px] text-slate-400 block truncate">{sm.amharicName}</span>
                                  )}
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-teal-400 shrink-0 ml-2" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  {t.accountName} <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abebe Bikila (Full Name on account)"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Account / Phone Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  {selectedSystemMethod?.type === 'MOBILE_MONEY'
                    ? 'Telebirr Phone Number'
                    : 'Bank Account Number'}{' '}
                  <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    selectedSystemMethod?.accountHint ||
                    (selectedSystemMethod?.type === 'MOBILE_MONEY' ? '09xxxxxxxx or 07xxxxxxxx' : 'Account Number')
                  }
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {selectedSystemMethod?.accountHint || 'Buyers will transfer Birr directly to this account'}
                </p>
              </div>

              {/* Extra Details / Branch */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Branch or Remark Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bole Branch, Addis Ababa"
                  value={extraDetails}
                  onChange={(e) => setExtraDetails(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-teal-500/20 transition-all active:scale-98 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Payment Method'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="p-2.5 rounded-xl bg-teal-950/30 border border-teal-500/20 text-[11px] text-teal-300 flex items-center justify-between">
                <span>Anyone can add all banks if they want, but you must add 1 or more.</span>
                <span className="font-bold text-teal-400 font-mono ml-2 shrink-0">{methods.length} added</span>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-semibold text-slate-300">Configured Accounts</span>
                  <span className="text-[11px] text-slate-500 ml-1.5">({methods.length} banks)</span>
                </div>
                {methods.length < 20 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(true);
                      setShowBankList(false);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-500 text-slate-950 hover:bg-teal-400 text-xs font-bold transition-transform active:scale-98 shadow-md shadow-teal-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Bank (ሰረዝ)</span>
                  </button>
                )}
              </div>

              {methods.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mx-auto">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">No payment methods added</h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                      Add your Commercial Bank of Ethiopia (CBE), Telebirr, Awash, or Dashen account to receive Birr when selling USDT.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-xl transition-transform active:scale-98"
                  >
                    + Add CBE / Telebirr Now
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {methods.map((m) => {
                    const isTelebirr = m.methodName?.includes('Telebirr') || m.methodName?.includes('CBE Birr');
                    const isCopied = copiedId === m.id;
                    return (
                      <div
                        key={m.id}
                        className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/90 flex items-center justify-between hover:border-slate-700 transition-colors shadow-sm"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${
                              isTelebirr
                                ? 'bg-sky-600 shadow-md shadow-sky-600/20'
                                : 'bg-purple-700 shadow-md shadow-purple-700/20'
                            }`}
                          >
                            {isTelebirr ? <Smartphone className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <h4 className="font-bold text-xs text-white truncate">{m.methodName}</h4>
                              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded font-semibold border border-emerald-500/20">
                                ACTIVE
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 truncate font-medium">{m.accountHolderName}</p>
                            <div className="flex items-center space-x-1 mt-0.5">
                              <span className="text-xs font-mono text-teal-400 font-semibold">{m.accountNumber}</span>
                              <button
                                onClick={() => copyToClipboard(m.accountNumber, m.id)}
                                title="Copy account number"
                                className="p-1 text-slate-500 hover:text-white transition-colors"
                              >
                                {isCopied ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            {m.extraDetails && (
                              <p className="text-[10px] text-slate-500 truncate">{m.extraDetails}</p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDelete(m.id)}
                          title="Delete payment method"
                          className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
