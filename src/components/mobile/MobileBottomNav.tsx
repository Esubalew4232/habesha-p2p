/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, Store, ArrowLeftRight, User } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, t, trades } = useApp();

  const activeTradesCount = trades.filter(
    (t) => t.status === 'PAYMENT_PENDING' || t.status === 'BUYER_MARKED_PAID'
  ).length;

  const tabs = [
    { id: 'DASHBOARD' as const, label: t.dashboard, icon: LayoutDashboard },
    { id: 'MARKET' as const, label: t.market, icon: Store },
    { id: 'TRADES' as const, label: t.trades, icon: ArrowLeftRight, badge: activeTradesCount },
    { id: 'PROFILE' as const, label: t.profile, icon: User },
  ];

  return (
    <nav className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1.5 fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-1.5 px-2 rounded-xl transition-all relative ${
                isActive
                  ? 'text-teal-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-slate-900">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight truncate max-w-[70px]">
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
