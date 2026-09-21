/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Habesha P2P - Application Global State & API Communication Context
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, Language } from '../i18n/translations';
import { saveUserToFirestore, signOutFirebaseUser } from '../lib/firebase';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  isSuspended: boolean;
  tradingRestricted: boolean;
  withdrawalRestricted: boolean;
}

export interface Wallet {
  availableBalance: string;
  lockedBalance: string;
  totalBalance: string;
  currency: string;
}

export interface Advertisement {
  id: string;
  userId: string;
  sellerName: string;
  sellerCompletedTrades: number;
  type: 'SELL' | 'BUY';
  amountAvailable: string;
  priceEtb: string;
  minOrderEtb: string;
  maxOrderEtb: string;
  paymentMethods: string[];
  sellerPaymentMethodDetails: any[];
  instructions: string;
  isActive: boolean;
  isAdminAd?: boolean;
  sellerRole?: 'USER' | 'ADMIN';
}

export interface Trade {
  id: string;
  adId: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  tradeAmountUsdt: string;
  priceEtb: string;
  totalEtb: string;
  sellerFeeUsdt: string;
  buyerFeeUsdt: string;
  lockedSellerUsdt: string;
  buyerReceivesUsdt: string;
  selectedPaymentMethod: any;
  status: string;
  paymentProofUrl?: string;
  disputeId?: string;
  expiresAt: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface AppContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: typeof translations['en'];
  user: User | null;
  token: string | null;
  wallet: Wallet | null;
  trades: Trade[];
  ads: Advertisement[];
  notifications: NotificationItem[];
  activeTab: 'DASHBOARD' | 'MARKET' | 'TRADES' | 'PROFILE';
  setActiveTab: (t: 'DASHBOARD' | 'MARKET' | 'TRADES' | 'PROFILE') => void;
  viewMode: 'MOBILE' | 'ADMIN';
  setViewMode: (v: 'MOBILE' | 'ADMIN') => void;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: (email?: string, name?: string, googleId?: string, avatarUrl?: string, credential?: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  elevateToAdmin: () => Promise<void>;
  logout: () => void;
  refreshData: () => Promise<void>;
  selectedTrade: Trade | null;
  setSelectedTrade: (t: Trade | null) => void;
  apiCall: (endpoint: string, method?: string, body?: any) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('habesha_p2p_lang') as Language) || 'am';
  });
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    return localStorage.getItem('habesha_p2p_onboarding') === 'done';
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('habesha_p2p_token'));
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'MARKET' | 'TRADES' | 'PROFILE'>('DASHBOARD');
  const [viewMode, setViewMode] = useState<'MOBILE' | 'ADMIN'>('MOBILE');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  const t = translations[lang];

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('habesha_p2p_lang', newLang);
  };

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true);
    localStorage.setItem('habesha_p2p_onboarding', 'done');
  };

  const apiCall = useCallback(async (endpoint: string, method = 'GET', body?: any) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(endpoint, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Server error occurred');
    }
    return data;
  }, [token]);

  const refreshData = useCallback(async () => {
    try {
      // Public market ads
      const marketRes = await fetch('/api/market/advertisements');
      const marketData = await marketRes.json();
      if (marketData.advertisements) {
        setAds(marketData.advertisements);
      }

      if (token) {
        // Fetch current user & wallet
        const meData = await apiCall('/api/auth/me');
        setUser(meData.user);
        setWallet(meData.wallet);

        // Fetch my trades
        const tradesData = await apiCall('/api/trades/my');
        setTrades(tradesData.trades || []);

        // Fetch notifications
        const notifData = await apiCall('/api/notifications');
        setNotifications(notifData.notifications || []);
      }
    } catch (err) {
      console.warn('[AppContext] refreshData error:', err);
    }
  }, [token, apiCall]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Periodic background refresh for live escrow status
  useEffect(() => {
    const timer = setInterval(() => {
      refreshData();
    }, 4000);
    return () => clearInterval(timer);
  }, [refreshData]);

  const login = async (email: string, pass: string) => {
    const data = await apiCall('/api/auth/login', 'POST', { email, password: pass });
    setToken(data.token);
    setUser(data.user);
    if (data.user) {
      saveUserToFirestore(data.user);
    }
    localStorage.setItem('habesha_p2p_token', data.token);
    await refreshData();
  };

  const loginWithGoogle = async (
    customEmail?: string, 
    customName?: string, 
    googleId?: string, 
    avatarUrl?: string, 
    credential?: string
  ) => {
    const email = customEmail || 'esubalewtezera4@gmail.com';
    const name = customName || 'Esubalew Tezera';
    const data = await apiCall('/api/auth/google', 'POST', { 
      email, 
      name, 
      googleId: googleId || 'google-oauth-session', 
      avatarUrl, 
      credential 
    });
    setToken(data.token);
    setUser(data.user);
    if (data.user) {
      saveUserToFirestore(data.user);
    }
    localStorage.setItem('habesha_p2p_token', data.token);
    await refreshData();
  };

  const elevateToAdmin = async () => {
    const data = await apiCall('/api/admin/elevate-me', 'POST');
    if (data.token) {
      setToken(data.token);
      localStorage.setItem('habesha_p2p_token', data.token);
    }
    if (data.user) {
      setUser(data.user);
      saveUserToFirestore(data.user);
    }
    await refreshData();
  };

  const register = async (fullName: string, email: string, pass: string) => {
    const data = await apiCall('/api/auth/register', 'POST', {
      fullName,
      email,
      password: pass,
      agreedToTerms: true,
    });
    setToken(data.token);
    setUser(data.user);
    if (data.user) {
      saveUserToFirestore(data.user);
    }
    localStorage.setItem('habesha_p2p_token', data.token);
    await refreshData();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setWallet(null);
    setTrades([]);
    localStorage.removeItem('habesha_p2p_token');
    try {
      signOutFirebaseUser();
    } catch (e) {
      // safe fallback
    }
  };

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        t,
        user,
        token,
        wallet,
        trades,
        ads,
        notifications,
        activeTab,
        setActiveTab,
        viewMode,
        setViewMode,
        hasCompletedOnboarding,
        completeOnboarding,
        login,
        loginWithGoogle,
        register,
        elevateToAdmin,
        logout,
        refreshData,
        selectedTrade,
        setSelectedTrade,
        apiCall,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
