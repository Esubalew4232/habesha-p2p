/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  PlusCircle,
  AlertCircle,
  Check,
  Plus,
  Smartphone,
  Building2,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { PaymentMethodsModal } from './PaymentMethodsModal';

interface CreateAdModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateAdModal: React.FC<CreateAdModalProps> = ({ onClose, onSuccess }) => {
  const { t, wallet, user, apiCall } = useApp();
  const [sellerMethods, setSellerMethods] = useState<any[]>([]);
  const [systemMethods, setSystemMethods] = useState<any[]>([]);
  const [selectedMethodIds, setSelectedMethodIds] = useState<string[]>([]);
  const [amountAvailable, setAmountAvailable] = useState('10.0000');
  const [priceEtb, setPriceEtb] = useState('145.00');
  const [minOrderEtb, setMinOrderEtb] = useState('100.00');
  const [maxOrderEtb, setMaxOrderEtb] = useState('1450.00');
  const [instructions, setInstructions] = useState('Fast release upon payment confirmation via CBE or Telebirr.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adFeeConfig, setAdFeeConfig] = useState<{ adCreationFeeEnabled: boolean; adCreationFeeUsdt: string }>({
    adCreationFeeEnabled: true,
    adCreationFeeUsdt: '1.0000',
  });

  // Dropdown selector state (serez button)
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [configuringBank, setConfiguringBank] = useState<any | null>(null);
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newAccountHolder, setNewAccountHolder] = useState(user?.fullName || '');
  const [savingAccount, setSavingAccount] = useState(false);

  // Modal toggle for advanced payment methods
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  const fetchUserMethodsAndFee = async () => {
    try {
      const [methodsData, feeData, sysData] = await Promise.all([
        apiCall('/api/market/my-payment-methods'),
        apiCall('/api/market/ad-fee-config').catch(() => ({ adCreationFeeEnabled: true, adCreationFeeUsdt: '1.0000' })),
        apiCall('/api/market/supported-payment-methods').catch(() =>
          apiCall('/api/market/payment-methods').catch(() => ({ paymentMethods: [] }))
        ),
      ]);

      if (methodsData?.sellerPaymentMethods) {
        setSellerMethods(methodsData.sellerPaymentMethods);
        if (methodsData.sellerPaymentMethods.length > 0 && selectedMethodIds.length === 0) {
          setSelectedMethodIds([methodsData.sellerPaymentMethods[0].id]);
        }
      }

      if (sysData?.paymentMethods) {
        setSystemMethods(sysData.paymentMethods);
      }

      if (feeData) {
        setAdFeeConfig({
          adCreationFeeEnabled: feeData.adCreationFeeEnabled ?? true,
          adCreationFeeUsdt: feeData.adCreationFeeUsdt ?? '1.0000',
        });
      }
    } catch (err) {
      console.warn('Failed to fetch user payment methods or fee config:', err);
    }
  };

  useEffect(() => {
    fetchUserMethodsAndFee();
  }, [apiCall]);

  const removeMethod = (id: string) => {
    setSelectedMethodIds((prev) => prev.filter((m) => m !== id));
  };

  // Filter system banks by search query
  const filteredBanks = useMemo(() => {
    if (!bankSearchQuery.trim()) return systemMethods;
    const q = bankSearchQuery.toLowerCase().trim();
    return systemMethods.filter(
      (b) =>
        b.name?.toLowerCase().includes(q) ||
        b.amharicName?.toLowerCase().includes(q) ||
        b.shortCode?.toLowerCase().includes(q)
    );
  }, [systemMethods, bankSearchQuery]);

  // Handle bank selection from the dropdown list
  const handleChooseBank = (bank: any) => {
    // Check if user already has an account for this bank
    const existingSellerMethod = sellerMethods.find(
      (sm) => sm.paymentMethodId === bank.id || sm.methodName?.toLowerCase().includes(bank.shortCode?.toLowerCase())
    );

    if (existingSellerMethod) {
      // Add if not already selected
      if (!selectedMethodIds.includes(existingSellerMethod.id)) {
        setSelectedMethodIds((prev) => [...prev, existingSellerMethod.id]);
      }
      // Immediately hide the bank list ("then hide the bank list okay")
      setShowBankPicker(false);
      setConfiguringBank(null);
    } else {
      // Open inline account details prompt for this bank
      setConfiguringBank(bank);
      setNewAccountHolder(user?.fullName || '');
      setNewAccountNumber('');
    }
  };

  // Save new bank account and select it
  const handleSaveAndAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configuringBank) return;
    if (!newAccountNumber.trim()) {
      setError('Please enter your account or mobile number.');
      return;
    }

    setSavingAccount(true);
    setError(null);
    try {
      const res = await apiCall('/api/market/my-payment-methods', 'POST', {
        paymentMethodId: configuringBank.id,
        accountHolderName: newAccountHolder.trim() || user?.fullName || 'Account Holder',
        accountNumber: newAccountNumber.trim(),
        extraDetails: '',
      });

      if (res?.sellerPaymentMethod) {
        setSellerMethods((prev) => [...prev, res.sellerPaymentMethod]);
        setSelectedMethodIds((prev) => [...prev, res.sellerPaymentMethod.id]);
      }

      // Immediately hide the bank list and prompt ("then hide the bank list okay")
      setConfiguringBank(null);
      setShowBankPicker(false);
      setNewAccountNumber('');
    } catch (err: any) {
      setError(err.message || 'Failed to save payment method.');
    } finally {
      setSavingAccount(false);
    }
  };

  const handlePaymentMethodAdded = (newMethod: any) => {
    setSellerMethods((prev) => [...prev, newMethod]);
    setSelectedMethodIds((prev) => [...prev, newMethod.id]);
    setShowAddPaymentModal(false);
    setShowBankPicker(false);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isFeeApplicable = adFeeConfig.adCreationFeeEnabled && !isAdmin;
  const adFee = isFeeApplicable ? parseFloat(adFeeConfig.adCreationFeeUsdt || '1.0000') : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const available = parseFloat(wallet?.availableBalance || '0');
    const amountNum = parseFloat(amountAvailable || '0');

    if (amountNum <= 0) {
      setError('Please enter a valid amount of USDT to sell.');
      return;
    }

    const totalNeeded = amountNum + adFee;
    if (totalNeeded > available) {
      if (isFeeApplicable) {
        setError(
          `Insufficient available balance. You need ${amountNum.toFixed(4)} USDT for the ad plus ${adFeeConfig.adCreationFeeUsdt} USDT one-time ad creation fee (Total required: ${totalNeeded.toFixed(4)} USDT). Your available balance: ${wallet?.availableBalance || '0'} USDT.`
        );
      } else {
        setError(`Insufficient available balance. You only have ${wallet?.availableBalance || '0'} USDT available. Deposit USDT first.`);
      }
      return;
    }

    if (selectedMethodIds.length === 0) {
      setError('Please select at least one configured Ethiopian payment method (e.g. CBE or Telebirr).');
      return;
    }

    setLoading(true);
    try {
      await apiCall('/api/market/advertisements', 'POST', {
        amountAvailable,
        priceEtb,
        minOrderEtb,
        maxOrderEtb,
        selectedPaymentMethodIds: selectedMethodIds,
        instructions,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create advertisement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 max-h-[92vh] overflow-y-auto text-white space-y-4 shadow-2xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{t.createAdBtn}</h3>
                <p className="text-[11px] text-slate-400">Post Sell Ad for Ethiopian Buyers</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Amount to Sell */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <label className="text-slate-300 font-medium">Total USDT to Sell</label>
                <span className="text-slate-400 text-[11px]">
                  Available:{' '}
                  <span className="text-teal-400 font-bold font-mono">
                    {wallet?.availableBalance || '0.0000'} USDT
                  </span>
                </span>
              </div>
              <input
                type="number"
                step="0.0001"
                min="1"
                required
                value={amountAvailable}
                onChange={(e) => {
                  setAmountAvailable(e.target.value);
                  const calcMax = (parseFloat(e.target.value || '0') * parseFloat(priceEtb || '0')).toFixed(2);
                  setMaxOrderEtb(calcMax);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono font-bold"
              />
            </div>

            {/* Unit Price in ETB */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <label className="text-slate-300 font-medium">Unit Price (ETB per 1 USDT)</label>
                <span className="text-amber-400 text-[11px] font-semibold">Market avg ~145 ETB</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={priceEtb}
                  onChange={(e) => {
                    setPriceEtb(e.target.value);
                    const calcMax = (parseFloat(amountAvailable || '0') * parseFloat(e.target.value || '0')).toFixed(2);
                    setMaxOrderEtb(calcMax);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-14 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono font-bold"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  ETB
                </span>
              </div>
            </div>

            {/* Order Limit Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Min Order (ETB)</label>
                <input
                  type="number"
                  step="1"
                  min="50"
                  required
                  value={minOrderEtb}
                  onChange={(e) => setMinOrderEtb(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Max Order (ETB)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={maxOrderEtb}
                  onChange={(e) => setMaxOrderEtb(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            {/* Select Payment Methods Section */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs text-slate-300 font-semibold flex items-center space-x-1.5">
                  <span>Payment Method</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    selectedMethodIds.length > 0
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {selectedMethodIds.length === 0 ? '0 selected' : `${selectedMethodIds.length} added`}
                  </span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {selectedMethodIds.length >= 1 ? '✓ 1 or more added' : 'Add at least 1'}
                </span>
              </div>

              {/* Selected Banks List */}
              {selectedMethodIds.length > 0 ? (
                <div className="space-y-1.5 mb-2">
                  {selectedMethodIds.map((id) => {
                    const m = sellerMethods.find((sm) => sm.id === id);
                    if (!m) return null;
                    const isTelebirr = m.methodName?.includes('Telebirr') || m.methodName?.includes('CBE Birr');
                    return (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-xl border border-teal-500/30 bg-teal-950/30 text-left flex items-center justify-between shadow-sm animate-in fade-in duration-150"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1 mr-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white ${
                              isTelebirr ? 'bg-sky-600' : 'bg-purple-700'
                            }`}
                          >
                            {isTelebirr ? <Smartphone className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-bold text-white truncate">{m.methodName}</span>
                              <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1.5 py-0.2 rounded font-semibold">Active</span>
                            </div>
                            <span className="text-[10px] text-teal-200/80 font-mono truncate block">
                              {m.accountNumber} ({m.accountHolderName})
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMethod(m.id)}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors shrink-0"
                          title="Remove bank"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-[11px] text-amber-300 mb-2 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>No payment method selected yet. Click the selector below to add at least 1 bank.</span>
                </div>
              )}

              {/* Serez (Dropdown Trigger Button) */}
              <button
                type="button"
                onClick={() => {
                  setShowBankPicker(!showBankPicker);
                  setConfiguringBank(null);
                }}
                className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                  showBankPicker
                    ? 'bg-slate-800 border-teal-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>
                    {selectedMethodIds.length > 0
                      ? '+ Add Another Bank / Payment Method'
                      : 'Select Payment Method (CBE, Telebirr, BoA...)'}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-400">
                  <span className="text-[10px] font-mono text-slate-400">ሰረዝ</span>
                  {showBankPicker ? <ChevronUp className="w-4 h-4 text-teal-400" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {/* Bank Picker Dropdown (shown when serez is clicked) */}
              {showBankPicker && (
                <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Inline Bank Configuration (if user chose a bank without saved details) */}
                  {configuringBank ? (
                    <div className="space-y-2.5 bg-slate-900 border border-teal-500/40 rounded-xl p-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-teal-400" />
                          <span className="text-xs font-bold text-white">{configuringBank.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfiguringBank(null)}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Enter your account details for {configuringBank.name}. It will be saved and added to your ad.
                      </p>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">
                            {configuringBank.shortCode === 'TELEBIRR' || configuringBank.shortCode === 'CBE_BIRR'
                              ? 'Mobile Phone Number'
                              : 'Bank Account Number'}
                          </label>
                          <input
                            type="text"
                            required
                            value={newAccountNumber}
                            onChange={(e) => setNewAccountNumber(e.target.value)}
                            placeholder={
                              configuringBank.shortCode === 'TELEBIRR' || configuringBank.shortCode === 'CBE_BIRR'
                                ? '09XXXXXXXX'
                                : '1000XXXXXXXX'
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-1">Account Holder Full Name</label>
                          <input
                            type="text"
                            required
                            value={newAccountHolder}
                            onChange={(e) => setNewAccountHolder(e.target.value)}
                            placeholder="Full Name on Account"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setConfiguringBank(null)}
                          className="w-1/2 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAndAddBank}
                          disabled={savingAccount || !newAccountNumber.trim()}
                          className="w-1/2 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {savingAccount ? 'Saving...' : 'Save & Add'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Search Bar for Banks */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={bankSearchQuery}
                          onChange={(e) => setBankSearchQuery(e.target.value)}
                          placeholder="Search bank (CBE, Telebirr, Awash, Abyssinia...)"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      {/* List of All Banks */}
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                        {filteredBanks.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-500">
                            No matching bank found.
                          </div>
                        ) : (
                          filteredBanks.map((bank) => {
                            const isTelebirr =
                              bank.shortCode === 'TELEBIRR' || bank.shortCode === 'CBE_BIRR';
                            const matchingSellerMethod = sellerMethods.find(
                              (sm) =>
                                sm.paymentMethodId === bank.id ||
                                sm.methodName?.toLowerCase().includes(bank.shortCode?.toLowerCase())
                            );
                            const isAlreadySelected = matchingSellerMethod
                              ? selectedMethodIds.includes(matchingSellerMethod.id)
                              : false;

                            return (
                              <button
                                key={bank.id}
                                type="button"
                                onClick={() => handleChooseBank(bank)}
                                className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                                  isAlreadySelected
                                    ? 'bg-teal-950/40 border border-teal-500/40 text-teal-300'
                                    : 'hover:bg-slate-900 text-slate-300 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                                  <div
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white ${
                                      isTelebirr ? 'bg-sky-600' : 'bg-purple-700'
                                    }`}
                                  >
                                    {isTelebirr ? <Smartphone className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                  </div>
                                  <div className="truncate">
                                    <span className="text-xs font-semibold text-white block truncate">
                                      {bank.name}
                                    </span>
                                    {bank.amharicName && (
                                      <span className="text-[10px] text-slate-400 block truncate">
                                        {bank.amharicName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  {isAlreadySelected ? (
                                    <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/30">
                                      Added ✓
                                    </span>
                                  ) : matchingSellerMethod ? (
                                    <span className="text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-800 px-2 py-0.5 rounded-full">
                                      + Select
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-teal-400 hover:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-full">
                                      + Configure
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Payment Instructions for Buyer</label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Please put Order ID in remark. Release will be instant."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Transparent fee explanation & One-Time Ad Creation Fee */}
            <div className="space-y-2 pt-1">
              {isAdmin ? (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-semibold">
                    <span>👑 Admin Ad Posting:</span>
                  </div>
                  <span className="font-mono font-bold text-amber-400">0.0000 USDT (Fee Waived)</span>
                </div>
              ) : adFeeConfig.adCreationFeeEnabled ? (
                <div className="p-3 bg-gradient-to-r from-teal-950/60 to-slate-950 rounded-xl border border-teal-500/30 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold flex items-center space-x-1">
                      <span>One-Time Ad Posting Fee:</span>
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      {adFeeConfig.adCreationFeeUsdt} USDT
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    <span>Total Required:</span>
                    <span className="font-mono text-white font-bold">
                      {(parseFloat(amountAvailable || '0') + adFee).toFixed(4)} USDT
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                <span>P2P Escrow Trade Fee:</span>
                <span className="font-mono text-teal-400 font-semibold">0.0600 USDT (Upon Trade Completion)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || selectedMethodIds.length === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/25 active:scale-98 transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {loading
                ? 'Publishing Advertisement...'
                : selectedMethodIds.length === 0
                ? 'Select At Least 1 Payment Method'
                : `Publish Sell Advertisement (${(parseFloat(amountAvailable || '0') + adFee).toFixed(4)} USDT)`}
            </button>
          </form>
        </div>
      </div>

      {showAddPaymentModal && (
        <PaymentMethodsModal
          onClose={() => setShowAddPaymentModal(false)}
          onAdded={handlePaymentMethodAdded}
        />
      )}
    </>
  );
};
