import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Lock, LogIn, Sparkles, ShieldCheck, AlertCircle, Clock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../components/Logo';
import { auth, db } from '../utils/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';

interface LoginProps {
  onNavigate: (page: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot Password state indicators
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    const cleanEmail = resetEmail.trim();

    if (!cleanEmail) {
      setResetError("Please enter your email address.");
      return;
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setResetError("Please enter a valid email address.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSuccess("Password reset link sent. Please check your inbox and spam folder.");
      setResetEmail("");
    } catch (err: any) {
      console.error("[PASSWORD RESET ERROR]", err);
      const errCode = err?.code || "";
      if (errCode === 'auth/user-not-found') {
        setResetError("No account found with this email.");
      } else if (errCode === 'auth/invalid-email') {
        setResetError("Please enter a valid email address.");
      } else {
        setResetError("Unable to send reset link. Please try again later.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  // Email Verification block state indicators
  const [isEmailVerificationPending, setIsEmailVerificationPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [resendMessage, setResendMessage] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (resendCount >= 3) {
      setResendMessage('❌ Maximum 3 resends reached.');
      return;
    }
    if (resendCooldown > 0) return;

    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setResendCount(prev => prev + 1);
        setResendCooldown(60);
        setResendMessage('Verification email resent successfully. Please check Inbox and Spam folder.');
      } else {
        setResendMessage('❌ Active session is not found. Please try registering or logging in again.');
      }
    } catch (err: any) {
      console.error(err);
      setResendMessage('❌ Please wait before resending.');
    }
  };

  const handleCheckEmailVerification = async () => {
    setIsCheckingEmail(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          // Sync flags to Firestore
          await updateDoc(doc(db, 'users', user.uid), { emailVerified: true, gmailVerified: true });
          
          // Re-trigger standard login behavior to load credentials fully
          const loggedUser = await login(email, password);
          setIsEmailVerificationPending(false);

          if (loggedUser.role === 'admin') {
            onNavigate('admin');
          } else if (loggedUser.status === 'Pending') {
            onNavigate('profile');
          } else {
            onNavigate('dashboard');
          }
        } else {
          alert("❌ Email is not verified yet. Please check your inbox and click the verification link.");
        }
      } else {
        alert("Session is untraceable. Try logging in again.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error checking status: " + err.message);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorObj(null);

    if (!email || !password) {
      setErrorObj('Please fill in all credentials.');
      return;
    }

    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      setLoading(false);
      
      // Route routing after login
      if (loggedUser.role === 'admin') {
        onNavigate('admin');
      } else if (loggedUser.status === 'Pending') {
        onNavigate('profile'); // Send them to their profile/pending status info
      } else {
        onNavigate('dashboard');
      }
    } catch (err: any) {
      setLoading(false);
      if (err.message === 'email_not_verified' || err.message?.includes('email_not_verified')) {
        setIsEmailVerificationPending(true);
      } else {
        setErrorObj(err.message || 'Login failed.');
      }
    }
  };

  if (isEmailVerificationPending) {
    return (
      <div className="w-full min-h-[85vh] flex items-center justify-center py-12 px-4 select-none" id="login-verification-panel">
        <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
          
          <div className="w-16 h-16 bg-purple-50 text-purple-600 border border-purple-100 rounded-full flex items-center justify-center mb-6">
            <Mail className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-zinc-900 mb-2 font-display tracking-tight">Verify Your Email</h2>
          <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
            We sent a verification link to:<br />
            <span className="font-semibold text-purple-600 break-all">{auth.currentUser?.email || email}</span>
          </p>

          <p className="text-zinc-500 text-xs leading-relaxed mb-6">
            Please check your inbox and spam folder. Click the link in the email to complete your registration.
          </p>

          <div className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left mb-6">
            <h4 className="text-zinc-900 text-xs font-semibold mb-1">Didn't receive the email?</h4>
            <p className="text-zinc-500 text-[11px] leading-relaxed">
              Please check your Spam, Junk, or Promotions folder. Verification emails may sometimes be filtered there. If you still can't find it, wait a few minutes and try resending.
            </p>
          </div>

          <button
            onClick={handleCheckEmailVerification}
            disabled={isCheckingEmail}
            className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-extrabold rounded-xl transition duration-200 flex items-center justify-center gap-2 mb-4 font-sans disabled:opacity-50 cursor-pointer shadow-md shadow-purple-600/10 hover:scale-[1.01]"
          >
            {isCheckingEmail ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Checking...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>I've Verified My Email</span>
              </>
            )}
          </button>

          <button
            onClick={handleResendEmail}
            disabled={resendCooldown > 0 || resendCount >= 3}
            className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-zinc-700 font-bold border border-slate-200/65 rounded-xl text-xs uppercase tracking-wider transition duration-200 mb-6 disabled:opacity-40 cursor-pointer"
          >
            {resendCooldown > 0 ? (
              <span className="flex items-center justify-center gap-2 text-zinc-500 font-mono">
                <Clock className="w-4 h-4 animate-spin text-purple-600" />
                Resend in {resendCooldown}s
              </span>
            ) : (
              <span>📧 Resend Email</span>
            )}
          </button>

          {resendMessage && (
            <p className={`text-xs font-semibold mb-6 ${resendMessage.includes('❌') ? 'text-red-600' : 'text-emerald-600'}`}>
              {resendMessage}
            </p>
          )}

          <button
            onClick={async () => {
              try {
                const u = auth.currentUser;
                if (u) {
                  await u.delete();
                }
                setIsEmailVerificationPending(false);
              } catch (err) {
                setIsEmailVerificationPending(false);
              }
            }}
            className="text-zinc-400 hover:text-zinc-650 text-xs font-bold underline transition duration-200 cursor-pointer"
          >
            Wrong email? Go back
          </button>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="w-full min-h-[85vh] flex items-center justify-center py-12 px-4 select-none" id="forgot-password-panel">
        <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
          
          {/* Brand visual header */}
          <div className="text-center space-y-4 mb-8 flex flex-col items-center">
            <Logo size="md" onClick={() => onNavigate('home')} />
            <div>
              <h2 className="text-2xl font-black text-zinc-900 font-display tracking-tight">Reset Password</h2>
              <p className="text-zinc-500 text-xs font-semibold mt-1">We will send you a secure link to update your password</p>
            </div>
          </div>

          {resetError && (
            <div className="p-3 bg-red-500/5 border border-red-500/15 text-red-600 text-xs rounded-xl flex items-center gap-2 mb-5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 text-emerald-600 text-xs rounded-xl flex items-center gap-2 mb-5">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{resetSuccess}</span>
            </div>
          )}

          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input 
                  type="email" 
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com" 
                  className="w-full text-xs text-zinc-900 bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 rounded-xl focus:border-purple-500 focus:outline-none focus:bg-white transition-all hover:border-slate-300"
                  autoComplete="email"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={resetLoading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold rounded-xl text-white hover:opacity-95 shadow-lg shadow-purple-600/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {resetLoading ? 'Sending Link...' : 'Send Reset Link'} <Sparkles className="w-4 h-4" />
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setShowForgotPassword(false);
              setResetError(null);
              setResetSuccess(null);
            }}
            className="w-full mt-4 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200/50 text-xs text-zinc-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-500" />
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[85vh] flex items-center justify-center py-12 px-4 select-none" id="login-panel">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
        
        {/* Brand visual header */}
        <div className="text-center space-y-4 mb-8 flex flex-col items-center">
          <Logo size="md" onClick={() => onNavigate('home')} />
          <div>
            <h2 className="text-2xl font-black text-zinc-900 font-display tracking-tight">Welcome Back</h2>
            <p className="text-zinc-500 text-xs font-semibold mt-1">Access your Influencer Verse creator account</p>
          </div>
        </div>

        {errorObj && (
          <div className="p-3 bg-red-500/5 border border-red-500/15 text-red-600 text-xs rounded-xl flex items-center gap-2 mb-5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorObj}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                <Mail className="w-4 h-4" />
              </span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" 
                className="w-full text-xs text-zinc-900 bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 rounded-xl focus:border-purple-500 focus:outline-none focus:bg-white hover:border-slate-300 transition-all"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Password</label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setResetEmail(email);
                  setResetError(null);
                  setResetSuccess(null);
                }}
                className="text-[10px] text-purple-600 hover:text-purple-700 font-bold transition-colors cursor-pointer bg-transparent border-none p-0"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                <Lock className="w-4 h-4" />
              </span>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full text-xs text-zinc-900 bg-slate-50 border border-slate-200 pl-10 pr-10 py-3 rounded-xl focus:border-purple-500 focus:outline-none focus:bg-white hover:border-slate-300 transition-all"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-650 transition-colors cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-xs font-bold rounded-xl text-white hover:opacity-95 shadow-lg shadow-purple-600/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In To Wallet'} <LogIn className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Separator */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100"></div>
          </div>
          <span className="relative bg-white px-3 text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none">OR CONTINUE WITH</span>
        </div>

        {/* Google Mock OAuth */}
        <button 
          onClick={() => {
            setErrorObj("Google OAuth interface initialization successful! Google registration details will complete inside production applets.");
          }}
          className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-zinc-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <img src="https://api.dicebear.com/7.x/identicon/svg?seed=google" className="w-3.5 h-3.5 opacity-85" alt="google" />
          <span>Continue via Google OAuth</span>
        </button>

        <p className="text-center text-[11px] text-zinc-500 mt-6 select-none font-semibold">
          Don't have a wallet configured?{' '}
          <button onClick={() => onNavigate('signup')} className="text-purple-600 hover:text-purple-700 font-bold hover:underline cursor-pointer">
            Create account
          </button>
        </p>
      </div>
    </div>
  );
};
