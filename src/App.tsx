/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Habesha P2P - Main Application Shell & Device Simulator
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { MobileHeader } from './components/mobile/MobileHeader';
import { MobileBottomNav } from './components/mobile/MobileBottomNav';
import { OnboardingView } from './components/mobile/OnboardingView';
import { AuthView } from './components/mobile/AuthView';
import { DashboardTab } from './components/mobile/DashboardTab';
import { MarketTab } from './components/mobile/MarketTab';
import { TradesTab } from './components/mobile/TradesTab';
import { ProfileTab } from './components/mobile/ProfileTab';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TradeDetailModal } from './components/mobile/TradeDetailModal';
import { PopupMessageModal } from './components/mobile/PopupMessageModal';
import { Smartphone, Shield, Sparkles } from 'lucide-react';

const MainScreen: React.FC = () => {
  const { viewMode, setViewMode, hasCompletedOnboarding, token, activeTab, user, selectedTrade, setSelectedTrade } = useApp();
  const [deviceFrame, setDeviceFrame] = useState(true);

  if (viewMode === 'ADMIN') {
    return <AdminDashboard />;
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingView />;
  }

  if (!token) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start md:py-6 sm:px-4 font-sans select-none antialiased">
      {/* Top Floating Control Bar for Demo / Testing */}
      <div className="w-full max-w-md mb-3 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 flex items-center justify-between text-xs text-slate-300 shadow-xl z-40 hidden sm:flex">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-semibold text-slate-200">Habesha P2P Mobile</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDeviceFrame(!deviceFrame)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Toggle Device Frame"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          <button
            onClick={() => setViewMode('ADMIN')}
            className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg font-bold text-[11px] transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin Center</span>
          </button>
        </div>
      </div>

      {/* Mobile Device Frame */}
      <div
        className={`w-full max-w-md bg-slate-950 overflow-hidden relative flex flex-col transition-all duration-300 ${
          deviceFrame
            ? 'sm:rounded-[40px] sm:border-[8px] sm:border-slate-800 sm:shadow-2xl sm:shadow-teal-950/40 sm:min-h-[844px]'
            : 'min-h-screen'
        }`}
      >
        {/* Mobile Device Speaker Notch */}
        {deviceFrame && (
          <div className="w-full flex justify-center pt-2 pb-1 bg-slate-900 hidden sm:flex">
            <div className="w-20 h-4 bg-slate-950 rounded-full flex items-center justify-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-slate-800" />
              <div className="w-8 h-1 rounded-full bg-slate-800" />
            </div>
          </div>
        )}

        {/* Mobile App Header */}
        <MobileHeader />

        {/* Tab Viewport */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'DASHBOARD' && <DashboardTab />}
          {activeTab === 'MARKET' && <MarketTab />}
          {activeTab === 'TRADES' && <TradesTab />}
          {activeTab === 'PROFILE' && <ProfileTab />}
        </main>

        {/* Bottom Navigation */}
        <MobileBottomNav />

        {/* Global Popup Message Modal */}
        <PopupMessageModal />

        {/* Global Active Trade Escrow Detail Modal */}
        {selectedTrade && (
          <TradeDetailModal trade={selectedTrade} onClose={() => setSelectedTrade(null)} />
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainScreen />
    </AppProvider>
  );
}
