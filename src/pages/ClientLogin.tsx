import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Lock, AlertCircle, ArrowRight, CheckCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { auth, db } from '../utils/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';

interface ClientLoginProps {
  onNavigate: (page: string) => void;
}

export const ClientLogin: React.FC<ClientLoginProps> = ({ onNavigate }) => {
  const { clientLogin, completeClientRegistration } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Locked Status rendering (in case they have logged in but represent another state)
  const [lockedStatus, setLockedStatus] = useState<'pending' | 'rejected' | 'suspended' | null>(null);
  const [lockedReason, setLockedReason] = useState('');

  const [isCheckingGmail, setIsCheckingGmail] = useState(false);
  const [gmailVerifiedStatus, setGmailVerifiedStatus] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [resendMessage, setResendMessage] = useState('');

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
        setResendMessage('❌ No active session. Please try registering or signing in.');
      }
    } catch (err: any) {
      console.error(err);
      setResendMessage('❌ Please wait before resending.');
    }
  };

  const handleCheckGmailVerification = async () => {
    setIsCheckingGmail(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          const freshEmail = (user.email || email || '').trim().toLowerCase();
          const draftStr = localStorage.getItem('pending_client_reg_' + freshEmail);
          
          if (draftStr) {
            const draftObj = JSON.parse(draftStr);
            await completeClientRegistration(draftObj);
          } else {
            // Lazy fallback creation in Firestore
            const fallbackClient = {
              id: user.uid,
              name: freshEmail.split('@')[0],
              company: freshEmail.split('@')[0] + ' Brand',
              country: 'US',
              whatsapp: 'N/A',
              gmail: freshEmail,
              gmailVerified: true,
              emailVerified: true,
              phoneNumber: '',
              phoneVerified: false,
              phoneVerifiedAt: '',
              paymentMethod: 'Crypto' as const,
              budget: '$500+',
              paymentNotes: '',
              status: 'pending' as const,
              taskUploadEnabled: true,
              registeredAt: new Date().toISOString(),
              payAgencyBalance: 0,
              payAgencyHistory: []
            };
            await completeClientRegistration(fallbackClient);
          }
          setGmailVerifiedStatus(true);
          alert("✅ Email verified successfully! Your account is now in review status and admin can approve your profile.");
        } else {
          alert("❌ Email is not verified yet. Please check your inbox and click the verification link.");
        }
      } else {
        alert("Session is untraceable. Try logging in again.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error checking email status: " + err.message);
    } finally {
      setIsCheckingGmail(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLockedStatus(null);

    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }

    try {
      setLoading(true);
      const client = await clientLogin(email, password);
      
      if (client.status === 'pending') {
        setLockedStatus('pending');
      } else if (client.status === 'rejected') {
        setLockedStatus('rejected');
        setLockedReason(client.rejectionReason || 'No specific rejection reason specified.');
      } else if (client.status === 'suspended') {
        setLockedStatus('suspended');
      } else {
        // Approved client success: Navigate straight to dashboard!
        onNavigate('client-dashboard');
      }
    } catch (err: any) {
      if (err.message === 'email_not_verified') {
        setLockedStatus('pending');
      } else {
        setError(err?.message || 'Login failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 1. Pending view
  if (lockedStatus === 'pending') {
    return (
      <div id="pending_review_box" className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-100 rounded-3xl text-center text-zinc-900 shadow-xl select-none">
        <Clock className="w-16 h-16 text-amber-500 mx-auto mb-6" />
        <h1 className="text-2xl font-black font-display tracking-tight mb-3 text-zinc-900">Account Under Review</h1>
        
        <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 text-left text-xs text-indigo-805 leading-relaxed font-sans space-y-1.5 mb-6">
          <p className="font-bold text-center text-xs text-indigo-900">
            📧 Verification Sent
          </p>
          <p className="text-center font-semibold text-indigo-700/90 leading-normal">
            Verification email sent to <span className="text-purple-600 font-bold break-all">{auth.currentUser?.email || email || 'your email'}</span>. Please check your inbox and spam folder. Click the verification link to continue.
          </p>
        </div>

        <p className="text-zinc-500 mb-6 font-sans text-xs">
          Your client account is under review. <br />
          We'll contact you via WhatsApp/Gmail soon.
        </p>

        {/* Resend verification email block */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={resendCooldown > 0 || resendCount >= 3}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-[11px] text-zinc-700 font-bold border border-slate-200/50 rounded-xl transition duration-150 w-full cursor-pointer"
          >
            {resendCooldown > 0 
              ? `Resend in ${resendCooldown}s` 
              : `📧 Resend Verification Email`
            }
          </button>
          
          {resendMessage && (
            <p className="text-[11px] text-zinc-500 font-bold mt-2 text-center">
              {resendMessage}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleCheckGmailVerification}
          disabled={isCheckingGmail}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white hover:opacity-95 shadow-lg shadow-indigo-600/10 disabled:opacity-40 text-xs font-extrabold rounded-xl transition font-sans w-full cursor-pointer mb-3 flex items-center justify-center gap-2"
        >
          {isCheckingGmail ? 'Syncing...' : "I've verified my email"}
        </button>

        <button 
          onClick={() => setLockedStatus(null)} 
          className="px-6 py-3 bg-slate-100 text-zinc-700 font-bold rounded-xl hover:bg-slate-200 border border-slate-200/50 transition font-sans w-full cursor-pointer"
        >
          Back to Login
        </button>
      </div>
    );
  }

  // 2. Rejected View
  if (lockedStatus === 'rejected') {
    return (
      <div id="rejected_review_box" className="max-w-md mx-auto my-16 p-8 bg-white border border-red-100 rounded-3xl text-center text-zinc-900 shadow-xl">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-2xl font-black font-display tracking-tight mb-3 text-red-600">Onboarding Request Declined</h1>
        <p className="text-zinc-500 text-sm mb-4 leading-normal">
          Unfortunately, your brand registration request has been rejected.
        </p>
        <div className="bg-red-50 text-red-800 p-4 border border-red-100 rounded-xl mb-6 text-sm text-left">
          <strong className="text-red-900 text-xs uppercase tracking-wider block mb-1">Reason for Rejection:</strong>
          <p className="text-xs text-red-700 leading-relaxed">{lockedReason}</p>
        </div>
        <button 
          onClick={() => setLockedStatus(null)} 
          className="px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition font-sans w-full cursor-pointer"
        >
          Try Logging In Again
        </button>
      </div>
    );
  }

  // 3. Suspended View
  if (lockedStatus === 'suspended') {
    return (
      <div id="suspended_review_box" className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-100 rounded-3xl text-center text-zinc-900 shadow-xl">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-2xl font-black font-display tracking-tight mb-3 text-red-600">Account Suspended</h1>
        <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
          Your client account access has been revoked or suspended temporarily. Please resolve outstanding pending billing statements with management.
        </p>
        <button 
          onClick={() => setLockedStatus(null)} 
          className="px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition font-sans w-full cursor-pointer"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div id="client_login_form_container" className="max-w-md mx-auto my-16 px-4 text-zinc-900">
      <div className="text-center mb-8">
        <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2.5 inline-block">
          Enterprise Portal
        </span>
        <h1 className="text-3xl font-black font-display tracking-tight mb-1 text-zinc-900">
          Login as Client
        </h1>
        <p className="text-xs text-zinc-500 font-semibold mt-1.5">
          Sign in to manage posts, revisions, payments, and custom campaigns.
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl shadow-xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl"></div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 p-4 rounded-xl mb-6 text-red-700 text-xs leading-normal">
            <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Official Gmail Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                <Mail className="w-4.5 h-4.5" />
              </span>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="brand@gmail.com"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 text-zinc-900 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-500 text-xs font-sans hover:border-slate-300 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Client Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-11 py-3 bg-slate-50 text-zinc-900 rounded-xl border border-slate-200 focus:outline-none focus:bg-white focus:border-indigo-500 text-xs font-sans hover:border-slate-300 transition-all font-medium"
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
            id="client_login_btn"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition focus:outline-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-600/10 hover:scale-[1.01]"
          >
            {loading ? 'Authenticating...' : 'Login to dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex py-5 items-center">
          <div className="flex-grow border-t border-slate-100"></div>
          <span className="flex-shrink mx-4 text-zinc-400 text-[10px] uppercase font-bold tracking-widest">
            Brand Accounts Only
          </span>
          <div className="flex-grow border-t border-slate-100"></div>
        </div>

        <button
          onClick={() => onNavigate('client-register')}
          className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-zinc-700 text-xs font-bold border border-slate-200 rounded-xl transition cursor-pointer"
        >
          Create New Client Account
        </button>
      </div>
    </div>
  );
};
