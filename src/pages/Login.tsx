import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Lock, LogIn, Sparkles, ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import { Logo } from '../components/Logo';
import { auth, db } from '../utils/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';

interface LoginProps {
  onNavigate: (page: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorObj, setErrorObj] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        setResendMessage('📧 Verification email sent successfully!');
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
      <div className="w-full min-h-[80vh] flex items-center justify-center bg-zinc-950 px-4 select-none" id="login-verification-panel">
        <div className="w-full max-w-md bg-zinc-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
          
          <div className="text-center space-y-4 mb-6 flex flex-col items-center">
            <Clock className="w-16 h-16 text-amber-500 mx-auto mb-2 animate-pulse" />
            <div>
              <h2 className="text-xl font-bold font-sans tracking-tight text-white">Email Verification Required</h2>
              <p className="text-zinc-400 text-xs mt-1">Please verify your email before entering your workspace.</p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl p-4 leading-relaxed mb-6 font-semibold animate-pulse">
            📧 Please verify your email first. Check your inbox for verification link.
          </div>

          <div className="space-y-4 mb-6">
            <button
              onClick={handleResendEmail}
              disabled={resendCooldown > 0 || resendCount >= 3}
              className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 text-xs font-bold rounded-xl text-zinc-300 hover:text-white border border-white/5 disabled:opacity-45 transition-all flex items-center justify-center gap-2"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : '📧 Resend Verification Email'}
            </button>

            {resendMessage && (
              <p className="text-[10px] font-bold text-zinc-400 text-center">{resendMessage}</p>
            )}
          </div>

          <button
            onClick={handleCheckEmailVerification}
            disabled={isCheckingEmail}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-xs font-bold rounded-xl text-white hover:opacity-95 shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40"
          >
            {isCheckingEmail ? 'Syncing...' : "I've verified my email"}
          </button>

          <button
            onClick={() => setIsEmailVerificationPending(false)}
            className="w-full py-2.5 mt-3 bg-zinc-850 hover:bg-zinc-700 text-xs font-bold rounded-xl text-zinc-350 hover:text-white transition-all cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[80vh] flex items-center justify-center bg-zinc-950 px-4 select-none" id="login-panel">
      <div className="w-full max-w-md bg-zinc-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
        
        {/* Brand visual header */}
        <div className="text-center space-y-4 mb-8 flex flex-col items-center">
          <Logo size="md" />
          <div>
            <h2 className="text-2.5xl font-black text-white">Welcome Back</h2>
            <p className="text-zinc-400 text-xs font-semibold mt-1">Access your Influencer Verse creator account</p>
          </div>
        </div>

        {errorObj && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2 mb-5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorObj}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <Mail className="w-4 h-4" />
              </span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" 
                className="w-full text-xs text-white bg-zinc-950 border border-white/5 pl-10 pr-4 py-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Password</label>
              <a href="#" className="text-[10px] text-purple-400 hover:text-purple-300 font-bold transition-colors">Forgot Password?</a>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                <Lock className="w-4 h-4" />
              </span>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full text-xs text-white bg-zinc-950 border border-white/5 pl-10 pr-4 py-3 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                autoComplete="current-password"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-xs font-bold rounded-xl text-white hover:opacity-95 shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In To Wallet'} <LogIn className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Separator */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <span className="relative bg-zinc-900/60 px-3 text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">OR CONTINUING USING</span>
        </div>

        {/* Google Mock OAuth */}
        <button 
          onClick={() => {
            setErrorObj("Google OAuth interface initialization successful! Google registration details will complete inside production applets.");
          }}
          className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-900 border border-white/5 text-xs text-zinc-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <img src="https://api.dicebear.com/7.x/identicon/svg?seed=google" className="w-3.5 h-3.5 opacity-80" alt="google" />
          Continue via Google OAuth
        </button>

        <p className="text-center text-[11px] text-zinc-400 mt-6 select-none font-semibold">
          Don't have a wallet configured?{' '}
          <button onClick={() => onNavigate('signup')} className="text-purple-400 hover:text-purple-300 font-bold hover:underline cursor-pointer">
            Create account
          </button>
        </p>
      </div>
    </div>
  );
};
