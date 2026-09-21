/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp, Advertisement } from '../../context/AppContext';
import { 
  PlusCircle, 
  CreditCard, 
  Store, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  ArrowRight,
  X,
  Filter,
  Sparkles,
  TrendingUp,
  Building2,
  Smartphone,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { CreateAdModal } from './CreateAdModal';
import { PaymentMethodsModal } from './PaymentMethodsModal';

export const MarketTab: React.FC = () => {
  const { t, ads, user, wallet, apiCall, refreshData, setSelectedTrade, setActiveTab } = useApp();
  const [tabType, setTabType] = useState<'BUY' | 'SELL'>('BUY');
  const [showCreateAd, setShowCreateAd] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [bankFilter, setBankFilter] = useState<string>('ALL');

  // Buy Trade initiation state
  const [buyingAd, setBuyingAd] = useState<Advertisement | null>(null);
  const [buyAmountUsdt, setBuyAmountUsdt] = useState('5.0000');
  const [selectedPmtId, setSelectedPmtId] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);

  // Quick filter options
  const filterOptions = [
    { id: 'ALL', label: 'All Banks / Wallets' },
    { id: 'CBE', label: 'CBE (ንግድ ባንክ)' },
    { id: 'Telebirr', label: 'Telebirr (ቴሌብር)' },
    { id: 'Awash', label: 'Awash Bank' },
    { id: 'Dashen', label: 'Dashen Bank' },
    { id: 'Abyssinia', label: 'Bank of Abyssinia' },
    { id: 'Coop', label: 'Coop Bank' },
  ];

  const filteredAds = useMemo(() => {
    return ads.filter((ad) => {
      const matchType = ad.type === (tabType === 'BUY' ? 'SELL' : 'BUY');
      if (!matchType) return false;
      if (bankFilter === 'ALL') return true;
      return ad.paymentMethods.some((pm) => pm.toLowerCase().includes(bankFilter.toLowerCase()));
    });
  }, [ads, tabType, bankFilter]);

  const handleOpenBuy = (ad: Advertisement) => {
    if (ad.userId === user?.id) {
      alert('You cannot trade with your own advertisement.');
      return;
    }
    setBuyingAd(ad);
    setBuyAmountUsdt(Math.min(10, parseFloat(ad.amountAvailable)).toFixed(4));
    setTradeError(null);
    if (ad.sellerPaymentMethodDetails && ad.sellerPaymentMethodDetails.length > 0) {
      setSelectedPmtId(ad.sellerPaymentMethodDetails[0].id);
    }
  };

  const handleConfirmTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyingAd) return;
    setTradeError(null);
    setTradeLoading(true);

    try {
      const data = await apiCall('/api/trades', 'POST', {
        adId: buyingAd.id,
        tradeAmountUsdt: buyAmountUsdt,
        paymentMethodId: selectedPmtId,
      });
      await refreshData();
      setBuyingAd(null);
      setSelectedTrade(data.trade);
      setActiveTab('TRADES');
    } catch (err: any) {
      setTradeError(err.message || 'Failed to start trade.');
    } finally {
      setTradeLoading(false);
    }
  };

  const calcTotalEtb = buyingAd
    ? (parseFloat(buyAmountUsdt || '0') * parseFloat(buyingAd.priceEtb)).toFixed(2)
    : '0.00';

  return (
    <div className="p-4 space-y-4 pb-24 text-white">
      {/* Top Controls: Buy/Sell Switcher & Action Buttons */}
      <div className="flex justify-between items-center gap-2">
        {/* Toggle Buy / Sell */}
        <div className="flex p-1 bg-slate-900/90 border border-slate-800 rounded-2xl w-48 shadow-inner">
          <button
            onClick={() => setTabType('BUY')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1 ${
              tabType === 'BUY'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{t.buyTab}</span>
            <span className="text-[10px] opacity-80">USDT</span>
          </button>
          <button
            onClick={() => setTabType('SELL')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1 ${
              tabType === 'SELL'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{t.sellTab}</span>
            <span className="text-[10px] opacity-80">USDT</span>
          </button>
        </div>

        {/* Action icons */}
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCreateAd(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-md shadow-teal-500/20 active:scale-98 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.createAdBtn}</span>
          </button>
        </div>
      </div>

      {/* Advertisements List */}
      <div className="space-y-3">
        {filteredAds.length === 0 ? (
          <div className="p-8 text-center bg-gradient-to-b from-slate-900/80 to-slate-950 rounded-3xl border border-slate-800/90 shadow-xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-amber-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 mx-auto shadow-lg shadow-teal-500/10">
              <Store className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-sm text-white">Ethiopian P2P Marketplace</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                {bankFilter !== 'ALL'
                  ? `No active advertisements found for ${bankFilter}. Try switching to "All Banks" or post your own ad.`
                  : 'Be the first to post a Buy or Sell advertisement! Trade securely with CBE, Telebirr, Awash Bank, Dashen, and more.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setShowCreateAd(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-teal-500/20 transition-all active:scale-98"
              >
                + Post Sell Advertisement
              </button>
              <button
                onClick={() => setShowPaymentMethods(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition-colors"
              >
                Configure Payment Methods
              </button>
            </div>

            {/* Platform security banner */}
            <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-center space-x-2 text-[11px] text-teal-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>All trades protected by Habesha Authoritative Escrow Lock</span>
            </div>
          </div>
        ) : (
          filteredAds.map((ad) => (
            <div
              key={ad.id}
              className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/95 to-slate-900/70 border border-slate-800/90 hover:border-teal-500/40 transition-all space-y-3 shadow-md group"
            >
              {/* Seller Name & Stats */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 border border-teal-500/30 text-teal-300 font-bold text-xs flex items-center justify-center">
                    {ad.sellerName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
                        {ad.sellerName}
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      {/* Show ADMIN badge in P2P marketplace ONLY for the admin */}
                      {user?.role === 'ADMIN' && (ad.isAdminAd || ad.userId === user.id) && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center space-x-0.5 shadow-sm">
                          <span>👑 ADMIN (YOU)</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                      <span>{ad.sellerCompletedTrades} orders</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium">100% completion</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Unit Price</span>
                  <div className="flex items-baseline space-x-1 justify-end">
                    <span className="text-base font-black text-amber-400 font-mono tracking-tight">
                      {ad.priceEtb}
                    </span>
                    <span className="text-[10px] font-bold text-amber-500/90">ETB</span>
                  </div>
                </div>
              </div>

              {/* Limits & Payment Method Badges */}
              <div className="flex justify-between items-end pt-2 border-t border-slate-800/80">
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400">
                    <span>Available: </span>
                    <span className="font-mono text-white font-bold">{ad.amountAvailable} USDT</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    <span>Order Limit: </span>
                    <span className="font-mono text-slate-300 font-semibold">{ad.minOrderEtb} - {ad.maxOrderEtb} ETB</span>
                  </div>

                  {/* Clean Payment Method Text */}
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-300 pt-0.5">
                    <Building2 className="w-3 h-3 text-teal-400 shrink-0" />
                    <span className="truncate max-w-[220px] font-medium">
                      {ad.paymentMethods.join(' • ')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenBuy(ad)}
                  className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-teal-500/20 active:scale-95 transition-all"
                >
                  {tabType === 'BUY' ? t.buyAction : t.sellAction}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Start Buy Trade Modal */}
      {buyingAd && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5 text-white space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white">Start P2P Buy Order</h3>
                <p className="text-[11px] text-slate-400">Seller: <span className="text-teal-300 font-semibold">{buyingAd.sellerName}</span></p>
              </div>
              <button onClick={() => setBuyingAd(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {tradeError && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{tradeError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmTrade} className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label className="text-slate-300 font-medium">USDT to Buy</label>
                  <span className="text-slate-400 text-[11px]">Max: <span className="font-mono text-teal-400 font-bold">{buyingAd.amountAvailable}</span> USDT</span>
                </div>
                <input
                  type="number"
                  step="0.0001"
                  min="1"
                  max={buyingAd.amountAvailable}
                  required
                  value={buyAmountUsdt}
                  onChange={(e) => setBuyAmountUsdt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono font-bold"
                />
              </div>

              {/* Calculated Birr */}
              <div className="p-3.5 bg-gradient-to-r from-slate-950 to-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Total to Pay Seller in Birr</span>
                  <span className="text-[10px] text-slate-500">Rate: 1 USDT = {buyingAd.priceEtb} ETB</span>
                </div>
                <span className="font-mono font-black text-amber-400 text-lg tracking-tight">{calcTotalEtb} ETB</span>
              </div>

              {/* Select Payment Method */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Send Payment to Seller Via:
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {buyingAd.sellerPaymentMethodDetails?.map((pm) => {
                    const isSelected = selectedPmtId === pm.id;
                    const isTelebirr = pm.methodName?.includes('Telebirr') || pm.methodName?.includes('CBE Birr');
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setSelectedPmtId(pm.id)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                          isSelected
                            ? 'bg-teal-950/50 border-teal-500 text-white shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white ${
                              isTelebirr ? 'bg-sky-600' : 'bg-purple-700'
                            }`}
                          >
                            {isTelebirr ? <Smartphone className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                          </div>
                          <div className="truncate">
                            <span className="font-semibold block truncate">{pm.methodName}</span>
                            <span className="text-[10px] text-slate-400 font-mono truncate">{pm.accountNumber} ({pm.accountHolderName})</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-400 shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-teal-950/40 border border-teal-800/40 rounded-xl text-[11px] text-teal-300 leading-snug flex items-start space-x-2">
                <Lock className="w-4 h-4 shrink-0 text-teal-400 mt-0.5" />
                <span>The seller's {buyAmountUsdt} USDT + escrow fee will be locked in escrow immediately. Seller cannot move funds until you complete payment.</span>
              </div>

              <button
                type="submit"
                disabled={tradeLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-lg shadow-teal-600/30 flex items-center justify-center space-x-2 active:scale-98 transition-all disabled:opacity-50"
              >
                {tradeLoading ? (
                  <span className="animate-pulse">Locking Escrow & Starting Order...</span>
                ) : (
                  <>
                    <span>Confirm & Lock Escrow</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Ad Modal */}
      {showCreateAd && (
        <CreateAdModal
          onClose={() => setShowCreateAd(false)}
          onSuccess={() => {
            setShowCreateAd(false);
            refreshData();
          }}
        />
      )}

      {/* Payment Methods Modal */}
      {showPaymentMethods && (
        <PaymentMethodsModal onClose={() => setShowPaymentMethods(false)} />
      )}
    </div>
  );
};
