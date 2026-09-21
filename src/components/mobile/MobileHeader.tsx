/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, Globe, Shield, RefreshCw } from 'lucide-react';
import { NotificationsModal } from './NotificationsModal';

export const MobileHeader: React.FC = () => {
  const { lang, setLang, t, user, notifications, setViewMode, refreshData } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800/80 px-4 py-3 sticky top-0 z-30 flex items-center justify-between text-white">
        {/* Brand & App Icon */}
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-teal-900/30 border border-teal-400/20">
            <span className="font-extrabold text-amber-300 text-lg tracking-tighter">H</span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="font-bold text-base tracking-tight text-slate-100">{t.appName}</h1>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                P2P
              </span>
            </div>
            <p className="text-[10px] text-slate-400">USDT / ETB</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Refresh button */}
          <button
            onClick={() => refreshData()}
            title="Refresh Data"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700/60 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>{lang === 'en' ? 'አማርኛ' : 'EN'}</span>
          </button>

          {/* Notifications Icon with Badge */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(true)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 active:scale-95 transition-all"
              title={t.notifications}
            >
              <Bell className="w-4 h-4" />
            </button>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-slate-900">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Admin Center Quick Access if Admin */}
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setViewMode('ADMIN')}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-semibold"
              title="Open Admin Center"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}
        </div>
      </header>

      {/* Modals */}
      {showNotifications && (
        <NotificationsModal onClose={() => setShowNotifications(false)} />
      )}
    </>
  );
};
