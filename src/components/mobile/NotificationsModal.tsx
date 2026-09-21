/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Habesha P2P - Interactive Notifications Modal
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, CheckCheck, Clock, ShieldAlert, CheckCircle2, ArrowRight, X } from 'lucide-react';

interface NotificationsModalProps {
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose }) => {
  const { notifications, apiCall, refreshData, trades, setSelectedTrade } = useApp();
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = async () => {
    setLoading(true);
    try {
      await apiCall('/api/notifications/read-all', 'POST');
      await refreshData();
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (item: any) => {
    // Check if notification text or title contains a trade reference (e.g. HBP-xxx)
    const match = item.message.match(/HBP-[A-Z0-9]+/i) || item.title.match(/HBP-[A-Z0-9]+/i);
    if (match) {
      const tradeId = match[0].toUpperCase();
      const matchedTrade = trades.find((t) => t.id.toUpperCase() === tradeId);
      if (matchedTrade) {
        setSelectedTrade(matchedTrade);
        onClose();
      }
    }
  };

  const getIcon = (type: string, title: string) => {
    const t = (type + ' ' + title).toLowerCase();
    if (t.includes('dispute') || t.includes('warning') || t.includes('alert')) {
      return <ShieldAlert className="w-4 h-4 text-amber-400" />;
    }
    if (t.includes('completed') || t.includes('release') || t.includes('success')) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
    return <Clock className="w-4 h-4 text-teal-400" />;
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">Escrow alerts, trade updates & platform notices</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center space-x-1 border border-slate-700"
              >
                <CheckCheck className="w-3 h-3 text-teal-400" />
                <span>Mark read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto p-4 space-y-2.5 flex-1">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2">
              <Bell className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-300">No notifications yet</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                You will receive real-time alerts for active trades, payment confirmations, and escrow status here.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const hasTradeRef = item.message.includes('HBP-') || item.title.includes('HBP-');
              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    !item.isRead
                      ? 'bg-slate-850 border-teal-500/30 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  } ${hasTradeRef ? 'cursor-pointer hover:bg-slate-800/80 group' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-xl bg-slate-800/90 shrink-0 mt-0.5">
                      {getIcon(item.type, item.title)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {formatTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {item.message}
                      </p>
                      {hasTradeRef && (
                        <div className="mt-2 flex items-center space-x-1 text-[10px] font-bold text-teal-400 group-hover:text-teal-300">
                          <span>View Trade Details</span>
                          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
