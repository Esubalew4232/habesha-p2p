/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Habesha P2P - Complete Administrator Operations Center
 * Features: Settings & Fee Controls, Marketplace Ads Management,
 * Escrow Trades Monitor, Balance Audits, User Restrictions,
 * System Announcements, Dispute Resolution, and Audit Logs.
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Shield, 
  Users, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  AlertTriangle, 
  History, 
  ArrowLeft, 
  Check, 
  X, 
  Search,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Lock,
  ExternalLink,
  Settings,
  Store,
  Layers,
  Megaphone,
  Ban,
  Unlock,
  Trash2,
  Sliders,
  Copy,
  CheckCircle,
  AlertCircle,
  User,
  Clock,
  Send,
  Eye,
  Bell,
  Key
} from 'lucide-react';

type AdminTabType = 
  | 'OVERVIEW' 
  | 'SETTINGS' 
  | 'ADS' 
  | 'TRADES' 
  | 'DEPOSITS' 
  | 'WITHDRAWALS' 
  | 'DISPUTES' 
  | 'USERS' 
  | 'ANNOUNCEMENTS' 
  | 'LOGS';

export const AdminDashboard: React.FC = () => {
  const { setViewMode, apiCall, user, elevateToAdmin, refreshData } = useApp();
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabType>('OVERVIEW');
  const [overview, setOverview] = useState<any>(null);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchAd, setSearchAd] = useState('');
  const [searchAudit, setSearchAudit] = useState('');
  const [auditCategory, setAuditCategory] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [elevatingAdmin, setElevatingAdmin] = useState(false);
  const [elevateSuccess, setElevateSuccess] = useState<string | null>(null);

  // Editable settings form state
  const [formSettings, setFormSettings] = useState({
    adCreationFeeEnabled: true,
    adCreationFeeUsdt: '1.0000',
    sellerFeeUsdt: '0.0600',
    buyerFeeUsdt: '0.0600',
    maintenanceMode: false,
    supportBotUsername: '@habeshap2pbbot',
    buyerPaymentWindowMinutes: 15,
    sellerReleaseWindowMinutes: 15,
    minTradeUsdt: '5.0000',
    maxTradeUsdt: '10000.0000',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  // New announcement form state
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annType, setAnnType] = useState<'INFO' | 'WARNING' | 'IMPORTANT'>('INFO');
  const [annLoading, setAnnLoading] = useState(false);

  // Popup messages state
  const [popupMessages, setPopupMessages] = useState<any[]>([]);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState<'INFO' | 'WARNING' | 'IMPORTANT' | 'URGENT'>('INFO');
  const [popupTargetType, setPopupTargetType] = useState<'ALL' | 'USER'>('ALL');
  const [popupTargetUserId, setPopupTargetUserId] = useState('');
  const [popupDurationMinutes, setPopupDurationMinutes] = useState(1440);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupSuccess, setPopupSuccess] = useState<string | null>(null);

  // Balance adjustment modal state
  const [adjustingUser, setAdjustingUser] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('10.0000');
  const [adjustType, setAdjustType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustReason, setAdjustReason] = useState('Administrative compensation');

  // Dispute resolution modal state
  const [resolvingDispute, setResolvingDispute] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('Payment confirmed with bank slip.');

  const handleElevateAdmin = async () => {
    setElevatingAdmin(true);
    setElevateSuccess(null);
    try {
      await elevateToAdmin();
      setElevateSuccess('Super Administrator privileges successfully granted!');
      await fetchAdminData();
      setTimeout(() => setElevateSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to elevate to admin.');
    } finally {
      setElevatingAdmin(false);
    }
  };

  const handleSeedAuditLog = async () => {
    try {
      const res = await apiCall('/api/admin/audit-logs/seed-test', 'POST');
      if (res.auditLogs) {
        setAuditLogs(res.auditLogs);
      } else {
        await fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate audit log.');
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // If user has eligible admin email but role isn't ADMIN yet, elevate automatically
      if (
        user &&
        user.role !== 'ADMIN' &&
        (user.email.toLowerCase().trim() === 'esubalewtezera4@gmail.com' ||
          user.email.toLowerCase().includes('admin'))
      ) {
        try {
          await elevateToAdmin();
        } catch {
          // ignore error
        }
      }

      const [
        ovData, 
        depData, 
        withData, 
        dispData, 
        usrData, 
        logData, 
        adsData, 
        trdData, 
        annData, 
        settData,
        popData
      ] = await Promise.all([
        apiCall('/api/admin/overview').catch(() => null),
        apiCall('/api/admin/deposits').catch(() => ({ deposits: [] })),
        apiCall('/api/admin/withdrawals').catch(() => ({ withdrawals: [] })),
        apiCall('/api/admin/disputes').catch(() => ({ disputes: [] })),
        apiCall('/api/admin/users').catch(() => ({ users: [] })),
        apiCall('/api/admin/audit-logs').catch(() => ({ auditLogs: [] })),
        apiCall('/api/admin/advertisements').catch(() => ({ advertisements: [] })),
        apiCall('/api/admin/trades').catch(() => ({ trades: [] })),
        apiCall('/api/admin/announcements').catch(() => ({ announcements: [] })),
        apiCall('/api/admin/settings').catch(() => null),
        apiCall('/api/admin/popup-messages').catch(() => ({ popupMessages: [] })),
      ]);

      if (ovData?.metrics) {
        setOverview(ovData.metrics);
      }
      setDeposits(depData?.deposits || []);
      setWithdrawals(withData?.withdrawals || []);
      setDisputes(dispData?.disputes || []);
      setUsers(usrData?.users || []);
      setAuditLogs(logData?.auditLogs || []);
      setAds(adsData?.advertisements || []);
      setTrades(trdData?.trades || []);
      setAnnouncements(annData?.announcements || []);
      setPopupMessages(popData?.popupMessages || []);

      if (settData?.settings) {
        setSettings(settData.settings);
        setFormSettings({
          adCreationFeeEnabled: settData.settings.adCreationFeeEnabled ?? true,
          adCreationFeeUsdt: settData.settings.adCreationFeeUsdt ?? '1.0000',
          sellerFeeUsdt: settData.settings.sellerFeeUsdt ?? '0.0600',
          buyerFeeUsdt: settData.settings.buyerFeeUsdt ?? '0.0600',
          maintenanceMode: settData.settings.maintenanceMode ?? false,
          supportBotUsername: settData.settings.supportBotUsername ?? '@habeshap2pbbot',
          buyerPaymentWindowMinutes: settData.settings.buyerPaymentWindowMinutes ?? 15,
          sellerReleaseWindowMinutes: settData.settings.sellerReleaseWindowMinutes ?? 15,
          minTradeUsdt: settData.settings.minTradeUsdt ?? '5.0000',
          maxTradeUsdt: settData.settings.maxTradeUsdt ?? '10000.0000',
        });
      }
    } catch (err) {
      console.warn('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSuccess(null);
    try {
      const res = await apiCall('/api/admin/settings', 'PUT', formSettings);
      if (res.settings) {
        setSettings(res.settings);
        setSettingsSuccess('System settings successfully updated and saved!');
        setTimeout(() => setSettingsSuccess(null), 4000);
      }
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleToggleAdStatus = async (adId: string) => {
    try {
      await apiCall(`/api/admin/advertisements/${adId}/toggle-status`, 'POST');
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Are you sure you want to permanently delete this advertisement?')) return;
    try {
      await apiCall(`/api/admin/advertisements/${adId}`, 'DELETE');
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleForceReleaseTrade = async (tradeId: string) => {
    const notes = prompt('Enter administrative reason for force-releasing escrow to buyer:');
    if (notes === null) return;
    try {
      await apiCall(`/api/admin/trades/${tradeId}/force-release`, 'POST', { notes });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleForceCancelTrade = async (tradeId: string) => {
    const notes = prompt('Enter administrative reason for force-cancelling trade and refunding seller:');
    if (notes === null) return;
    try {
      await apiCall(`/api/admin/trades/${tradeId}/force-cancel`, 'POST', { notes });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleRestrictions = async (userId: string, currentTrading: boolean, currentWithdrawal: boolean, type: 'TRADING' | 'WITHDRAWAL') => {
    try {
      const payload: any = {};
      if (type === 'TRADING') payload.tradingRestricted = !currentTrading;
      if (type === 'WITHDRAWAL') payload.withdrawalRestricted = !currentWithdrawal;

      await apiCall(`/api/admin/users/${userId}/toggle-restrictions`, 'POST', payload);
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleSuspend = async (userId: string) => {
    try {
      await apiCall(`/api/admin/users/${userId}/toggle-suspend`, 'POST');
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annMessage) return;
    setAnnLoading(true);
    try {
      await apiCall('/api/admin/announcements', 'POST', {
        title: annTitle,
        message: annMessage,
        type: annType,
      });
      setAnnTitle('');
      setAnnMessage('');
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAnnLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Remove this announcement?')) return;
    try {
      await apiCall(`/api/admin/announcements/${id}`, 'DELETE');
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreatePopupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!popupTitle.trim() || !popupMessage.trim()) return;
    if (popupTargetType === 'USER' && !popupTargetUserId.trim()) {
      alert('Please enter a target User ID (10-12 digits).');
      return;
    }
    setPopupLoading(true);
    setPopupSuccess(null);
    try {
      await apiCall('/api/admin/popup-messages', 'POST', {
        title: popupTitle.trim(),
        message: popupMessage.trim(),
        type: popupType,
        targetType: popupTargetType,
        targetUserId: popupTargetType === 'USER' ? popupTargetUserId.trim() : undefined,
        durationMinutes: popupDurationMinutes,
      });
      setPopupTitle('');
      setPopupMessage('');
      setPopupTargetUserId('');
      setPopupSuccess('Targeted popup message sent successfully!');
      setTimeout(() => setPopupSuccess(null), 4000);
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPopupLoading(false);
    }
  };

  const handleDeletePopupMessage = async (id: string) => {
    if (!confirm('Revoke and delete this popup message for all users?')) return;
    try {
      await apiCall(`/api/admin/popup-messages/${id}`, 'DELETE');
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApproveDeposit = async (id: string) => {
    if (!confirm('Approve this deposit? Funds will be credited immediately to user wallet.')) return;
    try {
      await apiCall(`/api/admin/deposits/${id}/approve`, 'POST');
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectDeposit = async (id: string) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await apiCall(`/api/admin/deposits/${id}/reject`, 'POST', { reason });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleApproveWithdrawal = async (id: string) => {
    if (!confirm('Approve this withdrawal? This confirms manual USDT payout to user Binance/Bybit ID.')) return;
    try {
      await apiCall(`/api/admin/withdrawals/${id}/approve`, 'POST');
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectWithdrawal = async (id: string) => {
    const reason = prompt('Enter rejection reason (reserved balance will be refunded to user):');
    if (!reason) return;
    try {
      await apiCall(`/api/admin/withdrawals/${id}/reject`, 'POST', { reason });
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveDispute = async (favor: 'BUYER' | 'SELLER') => {
    if (!resolvingDispute) return;
    if (!confirm(`Resolve dispute in favor of ${favor}? Funds will be settled accordingly.`)) return;
    try {
      await apiCall(`/api/admin/disputes/${resolvingDispute.id}/resolve`, 'POST', {
        decision: favor,
        notes: resolutionNotes,
      });
      setResolvingDispute(null);
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBalanceAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser) return;
    try {
      await apiCall(`/api/admin/users/${adjustingUser.id}/adjust-balance`, 'POST', {
        amount: adjustAmount,
        isCredit: adjustType === 'CREDIT',
        reason: adjustReason,
      });
      setAdjustingUser(null);
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Admin Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3.5 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => setViewMode('MOBILE')}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-teal-300 border border-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Switch to Mobile App</span>
            <span className="sm:hidden">App</span>
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-1.5 sm:space-x-2">
                <span className="truncate max-w-[140px] sm:max-w-none">Habesha Admin Center</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-black bg-amber-500 text-slate-950 uppercase shrink-0">
                  Super Admin
                </span>
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAdminData}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* Admin Navigation Tabs */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-3 sm:px-6 py-2 flex space-x-1.5 sm:space-x-2 overflow-x-auto no-scrollbar scroll-smooth">
        {[
          { id: 'OVERVIEW', label: 'Platform Overview', icon: TrendingUp },
          { id: 'SETTINGS', label: 'Settings & Ad Fees', icon: Settings },
          { id: 'ADS', label: `Marketplace Ads (${ads.length})`, icon: Store },
          { id: 'TRADES', label: `Escrow Trades (${trades.length})`, icon: Layers },
          { id: 'DEPOSITS', label: `Deposits (${deposits.filter((d) => d.status === 'PENDING').length})`, icon: ArrowDownCircle },
          { id: 'WITHDRAWALS', label: `Withdrawals (${withdrawals.filter((w) => w.status === 'PENDING').length})`, icon: ArrowUpCircle },
          { id: 'DISPUTES', label: `Disputes (${disputes.filter((d) => d.status === 'OPEN').length})`, icon: AlertTriangle },
          { id: 'USERS', label: `Users (${users.length})`, icon: Users },
          { id: 'ANNOUNCEMENTS', label: `Popups & Broadcasts (${popupMessages.length + announcements.length})`, icon: Megaphone },
          { id: 'LOGS', label: 'Audit Trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as AdminTabType)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Admin Content Container */}
      <div className="p-3 sm:p-6 max-w-7xl mx-auto w-full flex-1">
        {/* ================= OVERVIEW TAB ================= */}
        {activeAdminTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* Elevation status banner if user is not ADMIN */}
            {user && user.role !== 'ADMIN' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Administrative Access Required</p>
                    <p className="text-[11px] text-amber-200/80">
                      You are signed in as <span className="font-mono font-semibold text-white">{user.email}</span> ({user.role}). Click to activate full administrative privileges.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleElevateAdmin}
                  disabled={elevatingAdmin}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 shrink-0"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{elevatingAdmin ? 'Elevating...' : 'Activate Super Admin Role'}</span>
                </button>
              </div>
            )}

            {elevateSuccess && (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{elevateSuccess}</span>
              </div>
            )}

            {/* Top 4 Metrics Cards */}
            {(() => {
              const activeOverview = overview || {
                totalUsers: users.length || 1,
                activeTrades: trades.filter((t) => t.status === 'PAYMENT_PENDING' || t.status === 'BUYER_MARKED_PAID').length,
                completedTrades: trades.filter((t) => t.status === 'COMPLETED' || t.status === 'ADMIN_RESOLVED').length,
                pendingDeposits: deposits.filter((d) => d.status === 'PENDING').length,
                pendingWithdrawals: withdrawals.filter((w) => w.status === 'PENDING').length,
                openDisputes: disputes.filter((d) => d.status === 'OPEN' || d.status === 'UNDER_REVIEW').length,
                totalVolumeUsdt: '0.0000',
                totalFeesUsdt: '0.0000',
                totalAdFeesUsdt: '0.0000',
                adFeesCount: 0,
                totalEscrowLockedUsdt: '0.0000',
                totalAds: ads.length,
                activeAds: ads.filter((a) => a.isActive).length,
                sellerFeeConfig: settings?.sellerFeeUsdt || '0.0600',
                buyerFeeConfig: settings?.buyerFeeUsdt || '0.0600',
                adCreationFeeEnabled: settings?.adCreationFeeEnabled ?? true,
                adCreationFeeUsdt: settings?.adCreationFeeUsdt ?? '1.0000',
                maintenanceMode: settings?.maintenanceMode ?? false,
              };

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 hover:border-slate-700 transition-colors">
                      <span className="text-xs text-slate-400 block font-medium">Total Registered Users</span>
                      <span className="text-3xl font-black text-white font-mono">{activeOverview.totalUsers}</span>
                      <span className="text-[11px] text-teal-400 block">Short 10-12 Digit Numeric UIDs</span>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 hover:border-slate-700 transition-colors">
                      <span className="text-xs text-slate-400 block font-medium">Total P2P Volume</span>
                      <span className="text-3xl font-black text-teal-400 font-mono">{activeOverview.totalVolumeUsdt} USDT</span>
                      <span className="text-[11px] text-slate-400 block">{activeOverview.completedTrades} Completed Trades</span>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 hover:border-slate-700 transition-colors">
                      <span className="text-xs text-slate-400 block font-medium">Ad Creation Fees Collected</span>
                      <span className="text-3xl font-black text-amber-400 font-mono">{activeOverview.totalAdFeesUsdt || '0.0000'} USDT</span>
                      <span className="text-[11px] text-amber-300/80 block">
                        {activeOverview.adCreationFeeEnabled ? `Active: ${activeOverview.adCreationFeeUsdt} USDT / ad` : 'Fee Currently Disabled'}
                      </span>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 hover:border-slate-700 transition-colors">
                      <span className="text-xs text-slate-400 block font-medium">Escrow Trades Platform Fees</span>
                      <span className="text-3xl font-black text-emerald-400 font-mono">{activeOverview.totalFeesUsdt} USDT</span>
                      <span className="text-[11px] text-slate-400 block">Flat Model Option B (0.1200 USDT / trade)</span>
                    </div>
                  </div>

                  {/* Quick Metrics Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block">Active Escrow Trades</span>
                        <span className="text-xl font-black text-sky-400 font-mono">{activeOverview.activeTrades}</span>
                      </div>
                      <button
                        onClick={() => setActiveAdminTab('TRADES')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-sky-300 transition-colors"
                      >
                        Inspect Escrows
                      </button>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block">Active Marketplace Ads</span>
                        <span className="text-xl font-black text-amber-400 font-mono">{activeOverview.activeAds} / {activeOverview.totalAds}</span>
                      </div>
                      <button
                        onClick={() => setActiveAdminTab('ADS')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-amber-300 transition-colors"
                      >
                        Manage Ads
                      </button>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 block">Total Locked in Escrow</span>
                        <span className="text-xl font-black text-rose-400 font-mono">{activeOverview.totalEscrowLockedUsdt || '0.0000'} USDT</span>
                      </div>
                      <button
                        onClick={() => setActiveAdminTab('SETTINGS')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-teal-300 transition-colors"
                      >
                        Fee Settings
                      </button>
                    </div>
                  </div>

                  {/* Fast Action Cards */}
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <h3 className="font-bold text-sm text-teal-400 flex items-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span>Authoritative Administrative Governance Rules</span>
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      • <strong>Ad Creation Fee:</strong> Users must pay a one-time publishing fee of {activeOverview.adCreationFeeUsdt || '1.0000'} USDT when posting sell advertisements. Admins post free of charge with exclusive admin badges. You can toggle this fee ON/OFF and edit the amount at any time in the <strong>Settings & Ad Fees</strong> tab.
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      • <strong>Short User IDs:</strong> All user accounts feature clean 10-12 digit numeric UIDs for quick copy/pasting in Binance, Bybit, CBE remarks, and administrative search.
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      • <strong>Escrow Double-Release Defense:</strong> All buyer and seller actions are atomic transactions backed by cryptographic ledger integrity. Funds cannot be released twice or withdrawn without settlement clearance.
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* ================= SETTINGS & AD FEES TAB ================= */}
        {activeAdminTab === 'SETTINGS' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-lg font-bold">Platform Parameters & Fee Governance</h2>
              <p className="text-xs text-slate-400">Configure marketplace ad creation fees, escrow lock fees, and platform timeouts.</p>
            </div>

            {settingsSuccess && (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* Ad Creation Fee Section */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-amber-400 flex items-center space-x-2">
                      <Store className="w-4 h-4" />
                      <span>One-Time Ad Creation Fee (User Requirement)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Users must pay this one-time fee to publish a sell advertisement on Habesha P2P.
                    </p>
                  </div>

                  {/* Toggle ON / OFF */}
                  <button
                    type="button"
                    onClick={() => setFormSettings({ ...formSettings, adCreationFeeEnabled: !formSettings.adCreationFeeEnabled })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                      formSettings.adCreationFeeEnabled
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <span>{formSettings.adCreationFeeEnabled ? 'FEE: ON (ENABLED)' : 'FEE: OFF (DISABLED)'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">Ad Creation Fee Amount (USDT)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        required
                        value={formSettings.adCreationFeeUsdt}
                        onChange={(e) => setFormSettings({ ...formSettings, adCreationFeeUsdt: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:border-amber-400 focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">USDT</span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">Default: 1.0000 USDT (Editable at any time)</span>
                  </div>

                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-300">
                    <span className="font-bold text-amber-400 block">Exemption Policy:</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Super Administrator ads are automatically exempt (0 USDT). Regular users are checked before posting.
                    </p>
                  </div>
                </div>
              </div>

              {/* Escrow Trading Fees (Option B) */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="font-bold text-sm text-teal-400 flex items-center space-x-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Escrow Trade Fees (Option B: Flat Model)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">Seller Escrow Fee (USDT)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        required
                        value={formSettings.sellerFeeUsdt}
                        onChange={(e) => setFormSettings({ ...formSettings, sellerFeeUsdt: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:border-teal-400 focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">USDT</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">Buyer Escrow Fee (USDT)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        required
                        value={formSettings.buyerFeeUsdt}
                        onChange={(e) => setFormSettings({ ...formSettings, buyerFeeUsdt: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:border-teal-400 focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">USDT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operational & Security Settings */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="font-bold text-sm text-sky-400 flex items-center space-x-2">
                  <Sliders className="w-4 h-4" />
                  <span>Trade Windows & Support Bot</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">Buyer Payment Window (Minutes)</label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      required
                      value={formSettings.buyerPaymentWindowMinutes}
                      onChange={(e) => setFormSettings({ ...formSettings, buyerPaymentWindowMinutes: parseInt(e.target.value) || 15 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">Seller Release Window (Minutes)</label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      required
                      value={formSettings.sellerReleaseWindowMinutes}
                      onChange={(e) => setFormSettings({ ...formSettings, sellerReleaseWindowMinutes: parseInt(e.target.value) || 15 })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">Telegram Support Bot Username</label>
                    <input
                      type="text"
                      required
                      value={formSettings.supportBotUsername}
                      onChange={(e) => setFormSettings({ ...formSettings, supportBotUsername: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-sky-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">Emergency Maintenance Mode</label>
                    <button
                      type="button"
                      onClick={() => setFormSettings({ ...formSettings, maintenanceMode: !formSettings.maintenanceMode })}
                      className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                        formSettings.maintenanceMode
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                          : 'bg-slate-950 border border-slate-800 text-slate-400'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{formSettings.maintenanceMode ? 'ACTIVE: TRADING PAUSED' : 'OFF: NORMAL OPERATIONS'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Changes */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={settingsSaving}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 transition-all active:scale-98 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{settingsSaving ? 'Saving Parameters...' : 'Save All Platform Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= ADS MANAGEMENT TAB ================= */}
        {activeAdminTab === 'ADS' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold">Marketplace Advertisements Control</h2>
                <p className="text-xs text-slate-400">Manage all P2P buy/sell advertisements across Ethiopia.</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by seller, ID or bank..."
                  value={searchAd}
                  onChange={(e) => setSearchAd(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Mobile Cards for Ads on small screens */}
            <div className="block md:hidden space-y-3">
              {ads
                .filter((a) => 
                  a.sellerName?.toLowerCase().includes(searchAd.toLowerCase()) || 
                  a.id?.toLowerCase().includes(searchAd.toLowerCase()) ||
                  a.userId?.includes(searchAd)
                )
                .map((ad) => (
                  <div key={ad.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-sm text-white">{ad.sellerName}</span>
                          {ad.isAdminAd && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(ad.userId, ad.userId)}
                          className="flex items-center space-x-1 font-mono text-[11px] text-slate-400 hover:text-amber-400 mt-0.5"
                          title="Copy Seller UID"
                        >
                          <span>UID: {ad.userId}</span>
                          {copiedId === ad.userId ? (
                            <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500 ml-0.5" />
                          )}
                        </button>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ad.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {ad.isActive ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Available USDT</span>
                        <span className="font-mono font-bold text-teal-400">{ad.amountAvailable} USDT</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Unit Price (ETB)</span>
                        <span className="font-mono font-bold text-amber-400">{ad.priceEtb} ETB</span>
                      </div>
                    </div>

                    <div className="text-xs">
                      <span className="text-[10px] text-slate-400 block">Order Range</span>
                      <span className="font-mono text-slate-300">{ad.minOrderEtb} - {ad.maxOrderEtb} ETB</span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {ad.paymentMethods?.map((m: string, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          {m}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                      <button
                        onClick={() => handleToggleAdStatus(ad.id)}
                        className="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 text-center"
                      >
                        {ad.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteAd(ad.id)}
                        className="flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors text-center"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Ad ID</th>
                    <th className="p-3.5">Seller (UID)</th>
                    <th className="p-3.5">Available USDT</th>
                    <th className="p-3.5">Price (ETB)</th>
                    <th className="p-3.5">Order Range</th>
                    <th className="p-3.5">Payment Methods</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {ads
                    .filter((a) => 
                      a.sellerName?.toLowerCase().includes(searchAd.toLowerCase()) || 
                      a.id?.toLowerCase().includes(searchAd.toLowerCase()) ||
                      a.userId?.includes(searchAd)
                    )
                    .map((ad) => (
                      <tr key={ad.id} className="hover:bg-slate-850">
                        <td className="p-3.5 font-mono text-slate-400 font-semibold">{ad.id}</td>
                        <td className="p-3.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-white">{ad.sellerName}</span>
                            {ad.isAdminAd && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">UID: {ad.userId}</span>
                        </td>
                        <td className="p-3.5 font-mono text-teal-400 font-bold">{ad.amountAvailable} USDT</td>
                        <td className="p-3.5 font-mono text-amber-400 font-bold">{ad.priceEtb} ETB</td>
                        <td className="p-3.5 font-mono text-slate-300">{ad.minOrderEtb} - {ad.maxOrderEtb} ETB</td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {ad.paymentMethods?.map((m: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ad.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {ad.isActive ? 'ACTIVE' : 'PAUSED'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleAdStatus(ad.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
                          >
                            {ad.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteAd(ad.id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= ESCROW TRADES MONITOR TAB ================= */}
        {activeAdminTab === 'TRADES' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold">P2P Escrow Trades Monitor</h2>
                <p className="text-xs text-slate-400">Live authoritative monitor of all locked and completed P2P trades.</p>
              </div>
            </div>

            {/* Mobile Cards for Trades on small screens */}
            <div className="block md:hidden space-y-3">
              {trades.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl text-xs">
                  No P2P trades recorded yet.
                </div>
              ) : (
                trades.map((t) => (
                  <div key={t.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-slate-400 font-semibold">{t.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                        t.status === 'CANCELLED' ? 'bg-slate-800 text-slate-500' :
                        t.status === 'DISPUTED' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Buyer</span>
                        <span className="font-bold text-white block">{t.buyerName}</span>
                        <button
                          onClick={() => copyToClipboard(t.buyerId, t.buyerId)}
                          className="flex items-center space-x-1 font-mono text-[10px] text-slate-400 hover:text-amber-400 mt-0.5"
                          title="Copy Buyer UID"
                        >
                          <span>UID: {t.buyerId}</span>
                          {copiedId === t.buyerId ? (
                            <Check className="w-2.5 h-2.5 text-emerald-400 ml-0.5" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-500 ml-0.5" />
                          )}
                        </button>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Seller</span>
                        <span className="font-bold text-white block">{t.sellerName}</span>
                        <button
                          onClick={() => copyToClipboard(t.sellerId, t.sellerId)}
                          className="flex items-center space-x-1 font-mono text-[10px] text-slate-400 hover:text-amber-400 mt-0.5"
                          title="Copy Seller UID"
                        >
                          <span>UID: {t.sellerId}</span>
                          {copiedId === t.sellerId ? (
                            <Check className="w-2.5 h-2.5 text-emerald-400 ml-0.5" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-500 ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Trade Amount</span>
                        <span className="font-mono font-bold text-teal-400">{t.tradeAmountUsdt} USDT</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Total Fiat</span>
                        <span className="font-mono font-bold text-amber-400">{t.totalBirr} ETB</span>
                      </div>
                    </div>

                    {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                        <button
                          onClick={() => handleForceReleaseTrade(t.id)}
                          className="flex-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs text-center"
                        >
                          Force Release
                        </button>
                        <button
                          onClick={() => handleForceCancelTrade(t.id)}
                          className="flex-1 py-1.5 px-3 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs text-center"
                        >
                          Force Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Trade ID</th>
                    <th className="p-3.5">Buyer (UID)</th>
                    <th className="p-3.5">Seller (UID)</th>
                    <th className="p-3.5">USDT Amount</th>
                    <th className="p-3.5">ETB Fiat</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Emergency Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        No P2P trades recorded yet.
                      </td>
                    </tr>
                  ) : (
                    trades.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-850">
                        <td className="p-3.5 font-mono text-slate-400">{t.id}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-white block">{t.buyerName}</span>
                          <span className="font-mono text-[10px] text-slate-500">UID: {t.buyerId}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-white block">{t.sellerName}</span>
                          <span className="font-mono text-[10px] text-slate-500">UID: {t.sellerId}</span>
                        </td>
                        <td className="p-3.5 font-mono text-teal-400 font-bold">{t.tradeAmountUsdt} USDT</td>
                        <td className="p-3.5 font-mono text-amber-400 font-bold">{t.totalBirr} ETB</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                            t.status === 'CANCELLED' ? 'bg-slate-800 text-slate-500' :
                            t.status === 'DISPUTED' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                          {t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && (
                            <>
                              <button
                                onClick={() => handleForceReleaseTrade(t.id)}
                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs"
                                title="Force release escrow to buyer"
                              >
                                Force Release
                              </button>
                              <button
                                onClick={() => handleForceCancelTrade(t.id)}
                                className="px-2.5 py-1 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg text-xs"
                                title="Cancel trade and refund seller"
                              >
                                Force Cancel
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= USERS MANAGEMENT TAB ================= */}
        {activeAdminTab === 'USERS' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold">User Accounts & 10-12 Digit UIDs</h2>
                <p className="text-xs text-slate-400">Search and audit balances, toggle account restrictions, and adjust balances.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search UID, name, email..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Mobile Cards for Users on Small Screens (<md) */}
            <div className="block md:hidden space-y-3">
              {users
                .filter((u) => 
                  u.fullName.toLowerCase().includes(searchUser.toLowerCase()) || 
                  u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
                  u.id.includes(searchUser)
                )
                .map((usr) => (
                  <div key={usr.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-sm text-white">{usr.fullName}</h4>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            usr.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {usr.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{usr.email}</p>
                      </div>

                      {/* 10-12 Digit UID with Copy button */}
                      <button
                        onClick={() => copyToClipboard(usr.id, usr.id)}
                        className="flex items-center space-x-1 font-mono text-[11px] bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-amber-400 font-bold hover:text-amber-300"
                        title="Click to copy UID"
                      >
                        <span>UID: {usr.id}</span>
                        {copiedId === usr.id ? (
                          <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-500 ml-0.5" />
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Available Balance</span>
                        <span className="font-mono font-bold text-teal-400">{usr.wallet?.availableBalance || '0.0000'} USDT</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Locked in Escrow</span>
                        <span className="font-mono font-bold text-amber-400">{usr.wallet?.lockedBalance || '0.0000'} USDT</span>
                      </div>
                    </div>

                    {/* Restrictions badges */}
                    <div className="flex flex-wrap gap-1">
                      {usr.isSuspended && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300">
                          SUSPENDED
                        </span>
                      )}
                      {usr.tradingRestricted && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-300">
                          NO TRADING
                        </span>
                      )}
                      {usr.withdrawalRestricted && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300">
                          NO WITHDRAW
                        </span>
                      )}
                      {!usr.isSuspended && !usr.tradingRestricted && !usr.withdrawalRestricted && (
                        <span className="text-[10px] text-emerald-400 font-medium">Status: Normal</span>
                      )}
                    </div>

                    {/* Actions row */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/60">
                      <button
                        onClick={() => setAdjustingUser(usr)}
                        className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold rounded-lg text-xs text-center"
                      >
                        Adjust Balance
                      </button>
                      <button
                        onClick={() => handleToggleRestrictions(usr.id, usr.tradingRestricted, usr.withdrawalRestricted, 'TRADING')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold ${
                          usr.tradingRestricted ? 'bg-orange-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {usr.tradingRestricted ? 'Unblock' : 'Block Trade'}
                      </button>
                      <button
                        onClick={() => handleToggleSuspend(usr.id)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold ${
                          usr.isSuspended ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white'
                        }`}
                      >
                        {usr.isSuspended ? 'Reactivate' : 'Suspend'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Desktop Table View (>=md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">UID (10-12 Digits)</th>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Available USDT</th>
                    <th className="p-3.5">Locked Escrow</th>
                    <th className="p-3.5">Restrictions</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {users
                    .filter((u) => 
                      u.fullName.toLowerCase().includes(searchUser.toLowerCase()) || 
                      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
                      u.id.includes(searchUser)
                    )
                    .map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-850">
                        <td className="p-3.5">
                          <button
                            onClick={() => copyToClipboard(usr.id, usr.id)}
                            className="flex items-center space-x-1.5 font-mono text-amber-400 font-bold hover:text-amber-300"
                            title="Click to copy UID"
                          >
                            <span>{usr.id}</span>
                            {copiedId === usr.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-500" />
                            )}
                          </button>
                        </td>
                        <td className="p-3.5 font-bold text-white">{usr.fullName}</td>
                        <td className="p-3.5 text-slate-400">{usr.email}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            usr.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {usr.role}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-teal-400 font-bold">{usr.wallet?.availableBalance || '0.0000'}</td>
                        <td className="p-3.5 font-mono text-amber-400 font-bold">{usr.wallet?.lockedBalance || '0.0000'}</td>
                        <td className="p-3.5 space-x-1">
                          {usr.isSuspended && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300">
                              SUSPENDED
                            </span>
                          )}
                          {usr.tradingRestricted && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-300">
                              NO TRADING
                            </span>
                          )}
                          {usr.withdrawalRestricted && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300">
                              NO WITHDRAW
                            </span>
                          )}
                          {!usr.isSuspended && !usr.tradingRestricted && !usr.withdrawalRestricted && (
                            <span className="text-[10px] text-emerald-400 font-medium">Normal</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setAdjustingUser(usr)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold rounded-lg text-xs"
                          >
                            Adjust Balance
                          </button>
                          <button
                            onClick={() => handleToggleRestrictions(usr.id, usr.tradingRestricted, usr.withdrawalRestricted, 'TRADING')}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                              usr.tradingRestricted ? 'bg-orange-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                            title="Toggle Trading Permission"
                          >
                            {usr.tradingRestricted ? 'Unrestrict Trading' : 'Block Trade'}
                          </button>
                          <button
                            onClick={() => handleToggleSuspend(usr.id)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                              usr.isSuspended ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white'
                            }`}
                          >
                            {usr.isSuspended ? 'Reactivate' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= BROADCAST ANNOUNCEMENTS & POPUPS TAB ================= */}
        {activeAdminTab === 'ANNOUNCEMENTS' && (
          <div className="space-y-8 max-w-4xl">
            <div>
              <h2 className="text-lg font-bold">Popup Messages & Broadcast System</h2>
              <p className="text-xs text-slate-400">
                Send interactive popup alerts to all users or a specific user by their 10-12 digit ID. Once dismissed, they never show again, and expire automatically.
              </p>
            </div>

            {/* SECTION 1: IN-APP POPUP MESSAGES (TARGETED & DISMISS-PROTECTED) */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Send In-App Popup Message</h3>
                    <p className="text-[11px] text-slate-400">Appears as an urgent popup dialog upon login or app open.</p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Auto-Expiring & Seen-Once
                </span>
              </div>

              {popupSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{popupSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreatePopupMessage} className="space-y-4">
                {/* Target Selection */}
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1.5">Recipient Audience</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPopupTargetType('ALL')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                        popupTargetType === 'ALL'
                          ? 'bg-teal-500/20 text-teal-300 border-teal-500/60 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>All Platform Users ({users.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPopupTargetType('USER')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                        popupTargetType === 'USER'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Specific User (by 10-12 Digit ID)</span>
                    </button>
                  </div>
                </div>

                {/* Target User Input if USER mode */}
                {popupTargetType === 'USER' && (
                  <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <label className="block text-xs text-amber-300 font-bold">
                      Target User ID (10-12 Digits) or Email
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. 108492019482"
                        value={popupTargetUserId}
                        onChange={(e) => setPopupTargetUserId(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                      />
                      <select
                        onChange={(e) => {
                          if (e.target.value) setPopupTargetUserId(e.target.value);
                        }}
                        className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:border-amber-400 focus:outline-none max-w-[160px]"
                      >
                        <option value="">Quick Pick User...</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName || u.email} ({u.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Title & Expiry */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">Message Headline</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Action Required: Please verify your bank account"
                      value={popupTitle}
                      onChange={(e) => setPopupTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 font-semibold mb-1">Expiration Lifespan</label>
                    <select
                      value={popupDurationMinutes}
                      onChange={(e) => setPopupDurationMinutes(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                    >
                      <option value={15}>15 Minutes (Immediate Alert)</option>
                      <option value={60}>1 Hour</option>
                      <option value={360}>6 Hours</option>
                      <option value={720}>12 Hours</option>
                      <option value={1440}>24 Hours (1 Day)</option>
                      <option value={4320}>3 Days</option>
                      <option value={10080}>7 Days (1 Week)</option>
                    </select>
                  </div>
                </div>

                {/* Message Content */}
                <div>
                  <label className="block text-xs text-slate-300 font-semibold mb-1">Popup Message Content</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter the full message text for the user to read..."
                    value={popupMessage}
                    onChange={(e) => setPopupMessage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-teal-400 focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Type Selection and Submit */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 font-medium">Severity:</span>
                    {(['INFO', 'WARNING', 'IMPORTANT', 'URGENT'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPopupType(type)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          popupType === type
                            ? type === 'URGENT' || type === 'IMPORTANT'
                              ? 'bg-rose-500 text-white shadow-sm'
                              : type === 'WARNING'
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'bg-teal-500 text-slate-950 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={popupLoading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{popupLoading ? 'Dispatching...' : 'Dispatch Popup Message'}</span>
                  </button>
                </div>
              </form>

              {/* Active Popup Messages List */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                    Active In-App Popups ({popupMessages.length})
                  </h4>
                  <span className="text-[10px] text-slate-500">Auto-cleans upon expiry</span>
                </div>

                {popupMessages.length === 0 ? (
                  <div className="p-4 text-center bg-slate-950 rounded-xl text-slate-500 text-xs border border-slate-800">
                    No active popup messages right now. All messages have expired or none have been sent.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {popupMessages.map((msg) => {
                      const isExpired = new Date(msg.expiresAt).getTime() <= Date.now();
                      const timeLeftMs = new Date(msg.expiresAt).getTime() - Date.now();
                      const hoursLeft = Math.max(0, Math.floor(timeLeftMs / (1000 * 60 * 60)));
                      const minutesLeft = Math.max(0, Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60)));

                      return (
                        <div
                          key={msg.id}
                          className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-start gap-3"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  msg.type === 'URGENT' || msg.type === 'IMPORTANT'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : msg.type === 'WARNING'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                }`}
                              >
                                {msg.type}
                              </span>

                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                  msg.targetType === 'USER'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                }`}
                              >
                                {msg.targetType === 'USER'
                                  ? `👤 User: ${msg.targetUserId}`
                                  : '🌐 All Users'}
                              </span>

                              <h5 className="font-bold text-xs text-white ml-1">{msg.title}</h5>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">{msg.message}</p>

                            <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-slate-500 font-mono">
                              <span className="flex items-center space-x-1 text-amber-400">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {isExpired ? 'Expired' : `Expires in ${hoursLeft}h ${minutesLeft}m`}
                                </span>
                              </span>
                              <span>
                                Viewed & Dismissed: <strong className="text-slate-300">{msg.dismissedUserIds?.length || 0}</strong> users
                              </span>
                              <span>Created: {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeletePopupMessage(msg.id)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                            title="Revoke & Delete Immediately"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 2: TOP BANNER BROADCASTS */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Publish Top Header Banner Announcement</h3>
                  <p className="text-[11px] text-slate-400">Fixed persistent banner displayed in mobile dashboards.</p>
                </div>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">Banner Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Telebirr Instant Withdrawals Live / CBE Birr Maintenance Notice"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-teal-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">Banner Text</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Write announcement details..."
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-teal-400 focus:outline-none"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    {(['INFO', 'WARNING', 'IMPORTANT'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAnnType(type)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          annType === type
                            ? type === 'IMPORTANT'
                              ? 'bg-rose-500 text-white'
                              : type === 'WARNING'
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-teal-500 text-slate-950'
                            : 'bg-slate-950 text-slate-400 border border-slate-800'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={annLoading}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-98"
                  >
                    {annLoading ? 'Publishing...' : 'Publish Banner'}
                  </button>
                </div>
              </form>

              {/* Existing Announcements List */}
              <div className="space-y-2 pt-3 border-t border-slate-800">
                <h4 className="font-bold text-xs text-slate-200">Active Banners ({announcements.length})</h4>
                {announcements.length === 0 ? (
                  <div className="p-4 text-center bg-slate-950 rounded-xl text-slate-500 text-xs border border-slate-800">
                    No banner announcements active.
                  </div>
                ) : (
                  announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-start gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              ann.type === 'IMPORTANT'
                                ? 'bg-rose-500/20 text-rose-300'
                                : ann.type === 'WARNING'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-teal-500/20 text-teal-300'
                            }`}
                          >
                            {ann.type}
                          </span>
                          <h4 className="font-bold text-xs text-white">{ann.title}</h4>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{ann.message}</p>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {new Date(ann.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500 text-slate-400 hover:text-white transition-colors"
                        title="Remove Announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= PENDING DEPOSITS TAB ================= */}
        {activeAdminTab === 'DEPOSITS' && (
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold">Pending Deposits Verification</h2>

            {/* Mobile Cards for Deposits (<md) */}
            <div className="block md:hidden space-y-3">
              {deposits.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl text-xs">
                  No deposits recorded yet.
                </div>
              ) : (
                deposits.map((dep) => (
                  <div key={dep.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-slate-400 font-semibold">{dep.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        dep.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' :
                        dep.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {dep.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">User UID</span>
                        <button
                          onClick={() => copyToClipboard(dep.userId, dep.userId)}
                          className="flex items-center space-x-1 font-mono text-[11px] text-amber-400 font-bold hover:text-amber-300 mt-0.5"
                          title="Copy User UID"
                        >
                          <span>{dep.userId}</span>
                          {copiedId === dep.userId ? (
                            <Check className="w-2.5 h-2.5 text-emerald-400 ml-0.5" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-500 ml-0.5" />
                          )}
                        </button>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Amount</span>
                        <span className="font-mono font-bold text-white text-sm">{dep.amount} USDT</span>
                        <span className="text-[10px] text-teal-400 block">{dep.network}</span>
                      </div>
                    </div>

                    <div className="text-xs pt-1">
                      <span className="text-[10px] text-slate-400 block">Transaction Hash</span>
                      <span className="font-mono text-[11px] text-slate-300 break-all">{dep.txHash}</span>
                    </div>

                    {dep.status === 'PENDING' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                        <button
                          onClick={() => handleApproveDeposit(dep.id)}
                          className="flex-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs text-center"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectDeposit(dep.id)}
                          className="flex-1 py-1.5 px-3 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs text-center"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">ID</th>
                    <th className="p-3.5">User UID</th>
                    <th className="p-3.5">Network</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">TxHash</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {deposits.map((dep) => (
                    <tr key={dep.id} className="hover:bg-slate-850">
                      <td className="p-3.5 font-mono text-slate-400">{dep.id}</td>
                      <td className="p-3.5">
                        <button
                          onClick={() => copyToClipboard(dep.userId, dep.userId)}
                          className="flex items-center space-x-1 font-mono text-amber-400 font-bold hover:text-amber-300"
                        >
                          <span>{dep.userId}</span>
                          {copiedId === dep.userId ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 font-semibold text-teal-400">{dep.network}</td>
                      <td className="p-3.5 font-bold font-mono text-white">{dep.amount} USDT</td>
                      <td className="p-3.5 font-mono text-slate-400 max-w-xs truncate">{dep.txHash}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          dep.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' :
                          dep.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {dep.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {dep.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApproveDeposit(dep.id)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectDeposit(dep.id)}
                              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg text-xs"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= PENDING WITHDRAWALS TAB ================= */}
        {activeAdminTab === 'WITHDRAWALS' && (
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold">Pending Withdrawals (Binance ID & Bybit ID)</h2>

            {/* Mobile Cards for Withdrawals (<md) */}
            <div className="block md:hidden space-y-3">
              {withdrawals.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl text-xs">
                  No withdrawals recorded yet.
                </div>
              ) : (
                withdrawals.map((w) => (
                  <div key={w.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-slate-400 font-semibold">{w.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        w.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                        w.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {w.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">User UID</span>
                        <button
                          onClick={() => copyToClipboard(w.userId, w.userId)}
                          className="flex items-center space-x-1 font-mono text-[11px] text-amber-400 font-bold hover:text-amber-300 mt-0.5"
                          title="Copy User UID"
                        >
                          <span>{w.userId}</span>
                          {copiedId === w.userId ? (
                            <Check className="w-2.5 h-2.5 text-emerald-400 ml-0.5" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-slate-500 ml-0.5" />
                          )}
                        </button>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block">Amount</span>
                        <span className="font-mono font-bold text-white text-sm">{w.amount} USDT</span>
                      </div>
                    </div>

                    <div className="text-xs pt-1">
                      <span className="text-[10px] text-slate-400 block">Destination ({w.method})</span>
                      <button
                        onClick={() => copyToClipboard(w.destinationId, w.destinationId)}
                        className="flex items-center space-x-1 font-mono text-xs text-teal-300 font-bold hover:text-teal-200 mt-0.5"
                        title="Copy Destination ID"
                      >
                        <span>{w.destinationId}</span>
                        {copiedId === w.destinationId ? (
                          <Check className="w-2.5 h-2.5 text-emerald-400 ml-0.5" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-slate-500 ml-0.5" />
                        )}
                      </button>
                    </div>

                    {w.status === 'PENDING' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                        <button
                          onClick={() => handleCompleteWithdrawal(w.id)}
                          className="flex-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs text-center"
                        >
                          Mark Sent
                        </button>
                        <button
                          onClick={() => handleRejectWithdrawal(w.id)}
                          className="flex-1 py-1.5 px-3 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs text-center"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">ID</th>
                    <th className="p-3.5">User UID</th>
                    <th className="p-3.5">Destination Platform</th>
                    <th className="p-3.5">Destination ID</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-850">
                      <td className="p-3.5 font-mono text-slate-400">{w.id}</td>
                      <td className="p-3.5">
                        <button
                          onClick={() => copyToClipboard(w.userId, w.userId)}
                          className="flex items-center space-x-1 font-mono text-amber-400 font-bold hover:text-amber-300"
                        >
                          <span>{w.userId}</span>
                          {copiedId === w.userId ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 font-semibold text-amber-400">{w.method}</td>
                      <td className="p-3.5 font-mono text-teal-300 font-bold">
                        <button
                          onClick={() => copyToClipboard(w.destinationId, w.destinationId)}
                          className="flex items-center space-x-1 hover:text-teal-200"
                          title="Copy destination ID"
                        >
                          <span>{w.destinationId}</span>
                          {copiedId === w.destinationId ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 font-bold font-mono text-white">{w.amount} USDT</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          w.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' :
                          w.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {w.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleCompleteWithdrawal(w.id)}
                              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs"
                            >
                              Mark Sent
                            </button>
                            <button
                              onClick={() => handleRejectWithdrawal(w.id)}
                              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg text-xs"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= DISPUTES TAB ================= */}
        {activeAdminTab === 'DISPUTES' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">Dispute Resolution Center</h2>
            <div className="space-y-3">
              {disputes.length === 0 ? (
                <div className="p-8 text-center bg-slate-900 rounded-2xl text-slate-500 text-xs">
                  No active trade disputes.
                </div>
              ) : (
                disputes.map((disp) => (
                  <div key={disp.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-400">Trade ID: {disp.tradeId}</span>
                        <h4 className="font-bold text-sm text-white mt-1">{disp.reason}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{disp.explanation}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 font-bold text-xs uppercase">
                        {disp.status}
                      </span>
                    </div>

                    {disp.status === 'OPEN' && (
                      <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => setResolvingDispute(disp)}
                          className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl"
                        >
                          Review & Resolve
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= AUDIT LOGS TAB ================= */}
        {activeAdminTab === 'LOGS' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <History className="w-5 h-5 text-amber-400" />
                  <span>Immutable System Audit Trail</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Cryptographically sequenced administrative ledger recording fee governance, dispute resolutions, and system events.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSeedAuditLog}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-semibold text-amber-400 rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Log Verification Probe</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Audit Records</span>
                <span className="text-xl font-black text-white font-mono">{auditLogs.length}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Security Events</span>
                <span className="text-xl font-black text-sky-400 font-mono">
                  {auditLogs.filter((l) => l.action?.includes('AUTH') || l.action?.includes('ELEVATE') || l.action?.includes('SUSPEND')).length}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Financial Actions</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {auditLogs.filter((l) => l.amount || l.action?.includes('BALANCE') || l.action?.includes('FEE')).length}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">System Governance</span>
                <span className="text-xl font-black text-amber-400 font-mono">
                  {auditLogs.filter((l) => l.targetType === 'SYSTEM' || l.targetType === 'SETTINGS').length}
                </span>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchAudit}
                  onChange={(e) => setSearchAudit(e.target.value)}
                  placeholder="Filter by action, admin email, target UID, or reason..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                {(['ALL', 'SECURITY', 'FINANCIAL', 'SETTINGS', 'SYSTEM'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setAuditCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      auditCategory === cat
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {(() => {
              const filteredLogs = auditLogs.filter((log) => {
                const term = searchAudit.toLowerCase().trim();
                const matchesSearch =
                  !term ||
                  log.action?.toLowerCase().includes(term) ||
                  log.adminEmail?.toLowerCase().includes(term) ||
                  log.targetId?.toLowerCase().includes(term) ||
                  log.reason?.toLowerCase().includes(term);

                if (!matchesSearch) return false;
                if (auditCategory === 'ALL') return true;
                if (auditCategory === 'SECURITY') return log.action?.includes('AUTH') || log.action?.includes('SUSPEND') || log.action?.includes('ELEVATE');
                if (auditCategory === 'SETTINGS') return log.targetType === 'SETTINGS' || log.action?.includes('FEE') || log.action?.includes('CONFIG');
                if (auditCategory === 'FINANCIAL') return log.amount || log.action?.includes('BALANCE') || log.action?.includes('FEE');
                if (auditCategory === 'SYSTEM') return log.targetType === 'SYSTEM' || log.action?.includes('SYSTEM') || log.action?.includes('GATEWAY');
                return true;
              });

              if (filteredLogs.length === 0) {
                return (
                  <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
                    <History className="w-10 h-10 text-slate-600 mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-white">No Audit Trail Records Found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {searchAudit ? 'Try clearing your search query or filter category.' : 'Audit logs capture administrative actions and system boot operations.'}
                      </p>
                    </div>
                    <button
                      onClick={handleSeedAuditLog}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-colors inline-flex items-center space-x-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Seed Initial System Logs</span>
                    </button>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3.5">Timestamp</th>
                        <th className="p-3.5">Administrator</th>
                        <th className="p-3.5">Action Code</th>
                        <th className="p-3.5">Target Identifier</th>
                        <th className="p-3.5">Amount (USDT)</th>
                        <th className="p-3.5">Reason / Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3.5 font-medium text-white whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200">
                              {log.adminEmail}
                            </span>
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                              log.action?.includes('ELEVATE') || log.action?.includes('AUTH')
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : log.action?.includes('BALANCE') || log.action?.includes('FEE')
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : log.action?.includes('BOOTSTRAP') || log.action?.includes('SYSTEM')
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-slate-400 whitespace-nowrap">
                            <span className="text-slate-500">{log.targetType}:</span>
                            <span className="text-teal-300 ml-1">{log.targetId}</span>
                          </td>
                          <td className="p-3.5 font-mono text-white whitespace-nowrap">
                            {log.amount ? (
                              <span className="font-bold text-emerald-400">{log.amount} USDT</span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-300 max-w-sm">
                            <span className="line-clamp-2">{log.reason || '-'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Balance Adjustment Modal */}
      {adjustingUser && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm">Adjust Balance for {adjustingUser.fullName} (UID: {adjustingUser.id})</h3>
              <button onClick={() => setAdjustingUser(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBalanceAdjust} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('CREDIT')}
                    className={`p-2.5 rounded-xl border text-xs font-bold ${
                      adjustType === 'CREDIT' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Credit (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('DEBIT')}
                    className={`p-2.5 rounded-xl border text-xs font-bold ${
                      adjustType === 'DEBIT' ? 'bg-rose-500/20 border-rose-500 text-rose-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Debit (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Amount (USDT)</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Mandatory Audit Reason</label>
                <textarea
                  required
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Explain why this balance adjustment is being made..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingUser(null)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispute Resolution Modal */}
      {resolvingDispute && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 text-white space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm">Resolve Dispute for Trade {resolvingDispute.tradeId}</h3>
              <button onClick={() => setResolvingDispute(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
              <p className="text-slate-400">Reason: <span className="text-white font-medium">{resolvingDispute.reason}</span></p>
              <p className="text-slate-400">Explanation: <span className="text-slate-200">{resolvingDispute.explanation}</span></p>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Resolution Audit Note</label>
              <textarea
                required
                rows={2}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleResolveDispute('BUYER')}
                className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Resolve for BUYER (Release USDT)
              </button>
              <button
                onClick={() => handleResolveDispute('SELLER')}
                className="py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs"
              >
                Resolve for SELLER (Refund USDT)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
