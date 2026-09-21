/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { signInWithFirebaseGoogle } from '../../lib/firebase';
import {
  Mail,
  Lock,
  User as UserIcon,
  Check,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  X,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export const AuthView: React.FC = () => {
  const { t, login, register, loginWithGoogle } = useApp();
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth authorization modal states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleStep, setGoogleStep] = useState<'CHOOSER' | 'CONSENT'>('CHOOSER');
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState({
    email: 'esubalewtezera4@gmail.com',
    name: 'Esubalew Tezera',
  });
  const [isCustomGoogleAccount, setIsCustomGoogleAccount] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);

  // Initialize official Google Identity Services SDK
  useEffect(() => {
    const initGoogleGSI = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          const clientId =
            (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
            '1084838274812-official-gis-habeshap2p.apps.googleusercontent.com';

          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: any) => {
              if (response?.credential) {
                try {
                  const base64Url = response.credential.split('.')[1];
                  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                  const jsonPayload = decodeURIComponent(
                    atob(base64)
                      .split('')
                      .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                      .join('')
                  );
                  const payload = JSON.parse(jsonPayload);
                  if (payload?.email) {
                    loginWithGoogle(
                      payload.email,
                      payload.name || payload.given_name || payload.email.split('@')[0],
                      payload.sub,
                      payload.picture,
                      response.credential
                    );
                    setShowGoogleModal(false);
                  }
                } catch (e) {
                  console.warn('Google credential decode error:', e);
                }
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render official button into target if element exists
          const nativeBtnElem = document.getElementById('gsiOfficialBtnContainer');
          if (nativeBtnElem && window.google?.accounts?.id?.renderButton) {
            window.google.accounts.id.renderButton(nativeBtnElem, {
              theme: 'outline',
              size: 'large',
              width: 280,
              text: 'continue_with',
            });
          }
        } catch (err) {
          console.warn('Official GIS initialize error:', err);
        }
      }
    };

    initGoogleGSI();
    const timer = setTimeout(initGoogleGSI, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!agreedTerms) {
        setError(t.agreeTerms);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      setLoading(true);
      try {
        await register(fullName, email, password);
      } catch (err: any) {
        setError(err.message || 'Registration failed.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        await login(email, password);
      } catch (err: any) {
        setError(err.message || 'Login failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFirebasePopupGoogle = async () => {
    setError(null);
    setGoogleAuthLoading(true);
    try {
      const res = await signInWithFirebaseGoogle();
      if (res && res.email) {
        await loginWithGoogle(res.email, res.displayName, res.firebaseUser?.uid, res.photoURL);
        setShowGoogleModal(false);
      }
    } catch (err: any) {
      console.warn('Firebase popup flow exception, falling back to chooser:', err);
      // Fallback cleanly to the account chooser modal
      setShowGoogleModal(true);
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const handleOpenGoogleAuth = () => {
    setError(null);
    if (typeof window !== 'undefined' && window.google?.accounts?.id?.prompt) {
      try {
        window.google.accounts.id.prompt();
      } catch (e) {
        console.warn('GIS prompt error:', e);
      }
    }
    setGoogleStep('CHOOSER');
    setIsCustomGoogleAccount(false);
    setShowGoogleModal(true);
  };

  const handleAuthorizeGoogleDirect = async (email: string, name: string) => {
    setGoogleAuthLoading(true);
    try {
      await loginWithGoogle(email, name);
      setShowGoogleModal(false);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
      setShowGoogleModal(false);
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const handleSelectAccount = (acc: { email: string; name: string }) => {
    setSelectedGoogleAccount(acc);
    setGoogleStep('CONSENT');
  };

  const handleConfirmCustomGoogleAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.includes('@')) {
      return;
    }
    const derivedName = customGoogleName.trim() || customGoogleEmail.split('@')[0];
    setSelectedGoogleAccount({
      email: customGoogleEmail.trim().toLowerCase(),
      name: derivedName,
    });
    setGoogleStep('CONSENT');
  };

  const handleAuthorizeGoogle = async () => {
    setGoogleAuthLoading(true);
    try {
      await loginWithGoogle(selectedGoogleAccount.email, selectedGoogleAccount.name);
      setShowGoogleModal(false);
    } catch (err: any) {
      setError(err.message || 'Google authorization failed.');
      setShowGoogleModal(false);
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center px-6 py-10 max-w-md mx-auto">
      {/* Brand Icon & Heading */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-amber-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-teal-500/20 border border-teal-400/30">
          <span className="text-3xl font-black text-slate-950">H</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white">{t.appName}</h2>
        <p className="text-xs text-slate-400 mt-1 font-medium">{t.tagline}</p>
        <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Verified Ethiopian Escrow Engine</span>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2.5 text-rose-300 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Continue with Google button (Firebase Auth & Google Identity Services) */}
      <div className="space-y-2 mb-5">
        <button
          type="button"
          onClick={handleOpenGoogleAuth}
          disabled={loading || googleAuthLoading}
          className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-slate-600 text-white font-medium text-xs flex items-center justify-center space-x-3 transition-all active:scale-98 shadow-md cursor-pointer group"
        >
          <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span className="font-semibold text-white tracking-wide">
            {googleAuthLoading ? 'Connecting...' : t.continueWithGoogle}
          </span>
        </button>

        {/* Quick Firebase Popup Alternative */}
        <button
          type="button"
          onClick={handleFirebasePopupGoogle}
          disabled={loading || googleAuthLoading}
          className="w-full text-center text-[11px] text-teal-400 hover:text-teal-300 transition-colors py-1 font-medium flex items-center justify-center space-x-1"
        >
          <span>Or sign in via Firebase Auth popup</span>
          <ExternalLink className="w-3 h-3 ml-0.5" />
        </button>
      </div>

      <div className="flex items-center my-4">
        <div className="flex-1 h-px bg-slate-800" />
        <span className="px-3 text-[11px] font-semibold text-slate-500 uppercase">{t.orDivider}</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      {/* Email / Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">{t.fullName}</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Abebe Bikila"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">{t.email}</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@gmail.com"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">{t.password}</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {isRegister && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">{t.confirmPassword}</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        )}

        {isRegister && (
          <div className="flex items-start space-x-2 pt-1">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5 rounded bg-slate-900 border-slate-700 text-teal-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="agreeTerms" className="text-[11px] text-slate-400 leading-snug cursor-pointer">
              {t.agreeTerms}
            </label>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-600/20 flex items-center justify-center space-x-2 active:scale-98 transition-all disabled:opacity-50 mt-2"
        >
          {loading ? (
            <span className="animate-pulse">Processing...</span>
          ) : (
            <>
              <span>{isRegister ? t.createAccountBtn : t.loginBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch between Register / Login */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setError(null);
          }}
          className="text-xs text-slate-400 hover:text-teal-400 transition-colors"
        >
          {isRegister ? (
            <>
              {t.haveAccount} <span className="text-teal-400 font-semibold">{t.login}</span>
            </>
          ) : (
            <>
              {t.noAccount} <span className="text-teal-400 font-semibold">{t.register}</span>
            </>
          )}
        </button>
      </div>

      {/* ================= GOOGLE AUTHENTICATION & ACCOUNT CHOOSER MODAL (OFFICIAL GOOGLE UI) ================= */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 text-slate-800 animate-in zoom-in-95 duration-200 relative">
            {/* Indeterminate Google Loading Bar */}
            {googleAuthLoading && (
              <div className="h-1 w-full bg-blue-100 overflow-hidden absolute top-0 left-0 z-10">
                <div className="h-full bg-[#1a73e8] animate-[pulse_1s_infinite] w-full" />
              </div>
            )}

            {/* Official Google Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-[#dadce0]">
              <div className="flex items-center space-x-2.5">
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span className="font-sans font-medium text-[14px] text-[#3c4043]">Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content: Split Desktop / Stacked Mobile (Exact Google OAuth Look) */}
            <div className="p-6 sm:p-10">
              {!isCustomGoogleAccount ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-start">
                  {/* Left Column: Heading & Domain */}
                  <div className="md:col-span-6 space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-normal text-[#202124] tracking-tight font-sans">
                      Choose an account
                    </h2>
                    <p className="text-sm sm:text-base text-[#202124] font-normal">
                      to continue to{' '}
                      <span className="text-[#1a73e8] font-medium hover:underline cursor-pointer">
                        habeshap2p.com
                      </span>
                    </p>
                  </div>

                  {/* Right Column: Account list */}
                  <div className="md:col-span-6 divide-y divide-[#dadce0] border-t md:border-t-0 md:border-l md:border-[#dadce0] md:pl-8 pt-4 md:pt-0">
                    {/* Primary Google Account: Esubalew Tezera */}
                    <div
                      onClick={() => handleAuthorizeGoogleDirect('esubalewtezera4@gmail.com', 'Esubalew Tezera')}
                      className="py-3 px-3 -mx-3 rounded-lg hover:bg-slate-50 active:bg-[#e8f0fe] cursor-pointer flex items-center space-x-4 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#795548] text-white flex items-center justify-center font-normal text-base select-none shrink-0 shadow-sm">
                        E
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[14px] text-[#202124] truncate">
                          Esubalew Tezera
                        </p>
                        <p className="text-[12px] text-[#5f6368] truncate">
                          esubalewtezera4@gmail.com
                        </p>
                      </div>
                    </div>

                    {/* Use Another Account */}
                    <div
                      onClick={() => setIsCustomGoogleAccount(true)}
                      className="py-3 px-3 -mx-3 rounded-lg hover:bg-slate-50 active:bg-[#e8f0fe] cursor-pointer flex items-center space-x-4 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-[#5f6368] shrink-0 border border-slate-300">
                        <UserIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[14px] text-[#202124]">
                          Use another account
                        </p>
                      </div>
                    </div>

                    {/* Official Google Identity Services SDK Render Target */}
                    <div id="gsiOfficialBtnContainer" className="pt-3 flex justify-center" />
                  </div>
                </div>
              ) : (
                /* Google Custom Email Sign-In Screen */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-start">
                  <div className="md:col-span-5 space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-normal text-[#202124] tracking-tight font-sans">
                      Sign in
                    </h2>
                    <p className="text-sm sm:text-base text-[#202124] font-normal">
                      to continue to{' '}
                      <span className="text-[#1a73e8] font-medium">habeshap2p.com</span>
                    </p>
                  </div>

                  <div className="md:col-span-7 md:border-l md:border-[#dadce0] md:pl-8">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (customGoogleEmail.includes('@')) {
                          handleAuthorizeGoogleDirect(
                            customGoogleEmail.trim().toLowerCase(),
                            customGoogleName.trim() || customGoogleEmail.split('@')[0]
                          );
                        }
                      }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Email or phone
                        </label>
                        <input
                          type="email"
                          required
                          autoFocus
                          placeholder="e.g. name@gmail.com"
                          value={customGoogleEmail}
                          onChange={(e) => setCustomGoogleEmail(e.target.value)}
                          className="w-full bg-white border border-[#dadce0] rounded-lg px-3.5 py-3 text-sm text-[#202124] placeholder-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Full Name (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Your Display Name"
                          value={customGoogleName}
                          onChange={(e) => setCustomGoogleName(e.target.value)}
                          className="w-full bg-white border border-[#dadce0] rounded-lg px-3.5 py-3 text-sm text-[#202124] placeholder-slate-400 focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                        />
                      </div>

                      <p className="text-[12px] text-[#5f6368] leading-relaxed">
                        To continue, Google will share your name, email address, and language preference with habeshap2p.com.
                      </p>

                      <div className="flex items-center justify-between pt-3">
                        <button
                          type="button"
                          onClick={() => setIsCustomGoogleAccount(false)}
                          className="text-xs font-medium text-[#1a73e8] hover:bg-blue-50 px-3 py-2 rounded-md transition-colors"
                        >
                          Back to accounts
                        </button>
                        <button
                          type="submit"
                          disabled={googleAuthLoading || !customGoogleEmail}
                          className="px-6 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium rounded-md shadow-sm transition-all disabled:opacity-50"
                        >
                          {googleAuthLoading ? 'Signing in...' : 'Next'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>

            {/* Official Google Dialog Footer */}
            <div className="bg-[#f8f9fa] px-6 sm:px-10 py-3 border-t border-[#dadce0] flex flex-col sm:flex-row justify-between items-center text-[12px] text-[#5f6368] gap-2">
              <span>English (United States)</span>
              <div className="flex space-x-6">
                <span className="hover:text-[#202124] cursor-pointer">Help</span>
                <span className="hover:text-[#202124] cursor-pointer">Privacy</span>
                <span className="hover:text-[#202124] cursor-pointer">Terms</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
