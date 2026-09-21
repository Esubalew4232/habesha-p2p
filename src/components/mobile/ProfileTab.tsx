/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  User as UserIcon, 
  CreditCard, 
  Globe, 
  Send, 
  FileText, 
  LogOut, 
  ShieldCheck, 
  History, 
  ChevronRight,
  ExternalLink,
  Shield,
  Copy,
  Check
} from 'lucide-react';
import { PaymentMethodsModal } from './PaymentMethodsModal';

export const ProfileTab: React.FC = () => {
  const { t, user, lang, setLang, logout, setViewMode } = useApp();
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24 text-white">
      {/* Profile Header */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center space-x-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center font-bold text-2xl text-amber-300 shadow-lg shadow-teal-500/20">
          {user?.fullName?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-base text-white truncate">{user?.fullName}</h3>
            {user?.role === 'ADMIN' && (
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                Admin
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{user?.email}</p>
          
          {/* 10-12 Digit User ID with Copy Button */}
          <div className="flex items-center space-x-2 mt-1.5">
            <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
              UID: {user?.id}
            </span>
            <button
              onClick={handleCopyId}
              type="button"
              className="inline-flex items-center space-x-1 text-[10px] font-medium text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 rounded-md transition-colors active:scale-95"
              title="Copy User ID"
            >
              {copiedId ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-teal-400" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Admin Switcher Card if user is Admin */}
      {user?.role === 'ADMIN' && (
        <button
          onClick={() => setViewMode('ADMIN')}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center justify-between text-left hover:border-amber-500/50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-amber-300">Administrator Operations Center</h4>
              <p className="text-[11px] text-slate-400">Manage deposits, withdrawals, users & disputes</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400" />
        </button>
      )}

      {/* Menu Options */}
      <div className="space-y-2">
        {/* Language Selection */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-teal-400" />
            <span className="text-xs font-semibold text-slate-200">{t.language}</span>
          </div>
          <div className="flex space-x-1.5">
            <button
              onClick={() => setLang('am')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'am'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              አማርኛ
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'en'
                  ? 'bg-teal-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Configured Payment Accounts */}
        <button
          onClick={() => setShowPaymentMethods(true)}
          className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-left hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <CreditCard className="w-5 h-5 text-teal-400" />
            <span className="text-xs font-semibold text-slate-200">{t.configuredPaymentMethods}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Official Telegram Support Bot */}
        <a
          href="https://t.me/habeshap2pbbot"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-left hover:border-slate-700 transition-colors block"
        >
          <div className="flex items-center space-x-3">
            <Send className="w-5 h-5 text-sky-400" />
            <div>
              <span className="text-xs font-semibold text-slate-200 block">{t.supportTelegram}</span>
              <span className="text-[10px] text-sky-400">@habeshap2pbbot</span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-500" />
        </a>

        {/* Terms of Service */}
        <button
          onClick={() => setShowTerms(true)}
          className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-left hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-200">{t.termsOfService}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between text-left hover:bg-rose-500/20 transition-colors text-rose-400"
        >
          <div className="flex items-center space-x-3">
            <LogOut className="w-5 h-5" />
            <span className="text-xs font-semibold">{t.logout}</span>
          </div>
        </button>
      </div>

      {showPaymentMethods && (
        <PaymentMethodsModal onClose={() => setShowPaymentMethods(false)} />
      )}

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 text-white space-y-4 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-teal-400">Habesha P2P — Rules & Terms of Service</h3>
            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>1. <strong>Authoritative Escrow:</strong> When a trade starts, the seller's USDT is locked. The seller cannot withdraw or transfer these funds.</p>
              <p>2. <strong>Accurate Payment:</strong> Buyers must only transfer the exact Birr amount to the designated Ethiopian bank/Telebirr account displayed in the order screen.</p>
              <p>3. <strong>Payment Verification:</strong> Sellers must verify actual arrival of funds in their bank account before releasing USDT. Do not rely solely on SMS.</p>
              <p>4. <strong>Dispute Protocol:</strong> Any discrepancies are handled by administrators and our official Telegram bot (@habeshap2pbbot).</p>
            </div>
            <button
              onClick={() => setShowTerms(false)}
              className="w-full py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
