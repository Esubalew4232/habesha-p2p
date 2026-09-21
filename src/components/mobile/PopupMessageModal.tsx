/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Habesha P2P - Broadcast & Targeted Popup Message Dialog
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Megaphone, AlertTriangle, AlertCircle, Info, Check, Clock } from 'lucide-react';

interface ActivePopup {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'IMPORTANT' | 'WARNING' | 'URGENT';
  targetUserId?: string | null;
  targetUserEmail?: string | null;
  createdAt: string;
  expiresAt: string;
  dismissedUserIds: string[];
}

export const PopupMessageModal: React.FC = () => {
  const { user, apiCall } = useApp();
  const [activePopup, setActivePopup] = useState<ActivePopup | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const checkPopupMessages = async () => {
      try {
        const data = await apiCall('/api/popup-messages/active');
        if (data.messages && data.messages.length > 0) {
          // Find the first message not yet dismissed in localStorage and not in dismissedUserIds
          const candidate = data.messages.find((m: ActivePopup) => {
            const locallyDismissed = localStorage.getItem(`habesha_dismissed_popup_${m.id}`);
            const serverDismissed = m.dismissedUserIds && m.dismissedUserIds.includes(user.id);
            return !locallyDismissed && !serverDismissed;
          });

          if (candidate) {
            setActivePopup(candidate);
          } else {
            setActivePopup(null);
          }
        } else {
          setActivePopup(null);
        }
      } catch (err) {
        // Silently catch in polling
      }
    };

    checkPopupMessages();
    const interval = setInterval(checkPopupMessages, 8000);
    return () => clearInterval(interval);
  }, [user, apiCall]);

  if (!activePopup) return null;

  const handleDismiss = async () => {
    if (!activePopup) return;
    setDismissing(true);
    try {
      localStorage.setItem(`habesha_dismissed_popup_${activePopup.id}`, 'true');
      await apiCall(`/api/popup-messages/${activePopup.id}/dismiss`, 'POST');
    } catch (err) {
      // Local dismissal is recorded regardless
    } finally {
      setActivePopup(null);
      setDismissing(false);
    }
  };

  const getBadge = () => {
    switch (activePopup.type) {
      case 'URGENT':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-400" />,
          bg: 'bg-rose-950/40 border-rose-500/30 text-rose-300',
          titleColor: 'text-rose-400',
          accent: 'from-rose-500 to-rose-600',
          label: 'URGENT ANNOUNCEMENT',
        };
      case 'WARNING':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          bg: 'bg-amber-950/40 border-amber-500/30 text-amber-300',
          titleColor: 'text-amber-400',
          accent: 'from-amber-500 to-orange-500',
          label: 'IMPORTANT NOTICE',
        };
      case 'IMPORTANT':
        return {
          icon: <Megaphone className="w-5 h-5 text-amber-300" />,
          bg: 'bg-amber-900/30 border-amber-500/20 text-amber-200',
          titleColor: 'text-amber-300',
          accent: 'from-amber-400 to-amber-600',
          label: 'PLATFORM NOTICE',
        };
      default:
        return {
          icon: <Info className="w-5 h-5 text-teal-400" />,
          bg: 'bg-teal-950/40 border-teal-500/30 text-teal-300',
          titleColor: 'text-teal-400',
          accent: 'from-teal-500 to-emerald-500',
          label: 'OFFICIAL UPDATE',
        };
    }
  };

  const badge = getBadge();

  // Format expiry
  const formatExpiry = (expiresAt: string) => {
    try {
      const exp = new Date(expiresAt).getTime();
      const now = Date.now();
      const diffMin = Math.max(0, Math.floor((exp - now) / 60000));
      if (diffMin < 60) return `Expires in ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `Expires in ${diffHours} hr`;
      return `Expires in ${Math.floor(diffHours / 24)} days`;
    } catch {
      return 'Limited time';
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200">
        {/* Top type chip */}
        <div className="flex items-center justify-between">
          <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase border flex items-center space-x-1.5 ${badge.bg}`}>
            {badge.icon}
            <span>{badge.label}</span>
          </div>

          <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{formatExpiry(activePopup.expiresAt)}</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="font-black text-base text-white">{activePopup.title}</h3>
          {activePopup.targetUserId && (
            <p className="text-[10px] text-teal-400 font-medium">
              🔒 Direct targeted message for Account #{activePopup.targetUserId}
            </p>
          )}
        </div>

        {/* Message Content */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
          {activePopup.message}
        </div>

        {/* Action Button: Never show again once dismissed */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissing}
            className={`w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r ${badge.accent} text-slate-950 font-black text-xs shadow-lg flex items-center justify-center space-x-2 active:scale-98 transition-all`}
          >
            <Check className="w-4 h-4" />
            <span>{dismissing ? 'Dismissing...' : 'I Understand & Dismiss'}</span>
          </button>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            This message will not appear again once dismissed.
          </p>
        </div>
      </div>
    </div>
  );
};
