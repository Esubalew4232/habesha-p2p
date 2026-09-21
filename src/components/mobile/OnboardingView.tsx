/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, ShoppingCart, TrendingUp, Lock, Headset, ChevronRight, Globe } from 'lucide-react';

export const OnboardingView: React.FC = () => {
  const { t, lang, setLang, completeOnboarding } = useApp();
  const [step, setStep] = useState(0);

  const screens = [
    {
      icon: ShieldCheck,
      title: t.welcomeTitle,
      desc: t.welcomeDesc,
      tag: 'ETHIOPIA P2P',
      color: 'from-teal-500 to-emerald-600',
    },
    {
      icon: ShoppingCart,
      title: t.buyTitle,
      desc: t.buyDesc,
      tag: 'CBE • TELEBIRR • BANKS',
      color: 'from-amber-500 to-orange-600',
    },
    {
      icon: TrendingUp,
      title: t.sellTitle,
      desc: t.sellDesc,
      tag: 'ZERO CHARGEBACKS',
      color: 'from-emerald-500 to-teal-700',
    },
    {
      icon: Lock,
      title: t.escrowTitle,
      desc: t.escrowDesc,
      tag: 'LOCKED ESCROW',
      color: 'from-blue-500 to-indigo-700',
    },
    {
      icon: Headset,
      title: t.supportTitle,
      desc: t.supportDesc,
      tag: '@habeshap2pbbot',
      color: 'from-purple-500 to-indigo-600',
    },
  ];

  const current = screens[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (step < screens.length - 1) {
      setStep(step + 1);
    } else {
      completeOnboarding();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Top bar with language switcher */}
      <div className="flex justify-between items-center z-10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-amber-300">
            H
          </div>
          <span className="font-bold text-sm text-slate-200">Habesha P2P</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300"
          >
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>{lang === 'en' ? 'አማርኛ' : 'EN'}</span>
          </button>
          <button
            onClick={completeOnboarding}
            className="text-xs text-slate-400 hover:text-slate-200 font-medium"
          >
            {t.skip}
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="flex-1 flex flex-col items-center justify-center text-center my-8 z-10">
        <div className={`w-24 h-24 rounded-3xl bg-gradient-to-tr ${current.color} flex items-center justify-center mb-8 shadow-2xl shadow-teal-500/20 border border-white/10`}>
          <Icon className="w-12 h-12 text-white" />
        </div>

        <span className="text-[11px] tracking-widest uppercase font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mb-3">
          {current.tag}
        </span>

        <h2 className="text-2xl font-bold tracking-tight text-white mb-3">
          {current.title}
        </h2>

        <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
          {current.desc}
        </p>

        {/* Step Indicators */}
        <div className="flex space-x-2 mt-8">
          {screens.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-teal-400' : 'w-2 bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div className="z-10 space-y-3">
        <button
          onClick={handleNext}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-sm shadow-lg shadow-teal-600/30 flex items-center justify-center space-x-2 active:scale-98 transition-transform"
        >
          <span>{step === screens.length - 1 ? t.getStarted : t.next}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
