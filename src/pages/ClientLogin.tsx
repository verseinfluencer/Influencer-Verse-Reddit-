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
      <div id="pending_review_box" className="max-w-md mx-auto my-16 p-8 bg-neutral-900 border border-neutral-800 rounded-3xl text-center text-white select-none">
        <Clock className="w-16 h-16 text-amber-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold font-sans tracking-tight mb-3 text-amber-400">Account Under Review</h1>
        
        <div className="bg-indigo-950/45 p-4 rounded-xl border border-indigo-550/20 text-left text-xs text-indigo-200 leading-relaxed font-sans space-y-1.5 mb-6">
          <p className="font-bold text-center text-xs text-white">
            📧 Verification Sent
          </p>
          <p className="text-center font-semibold text-zinc-300">
            📧 Verification email sent to <span className="text-purple-400 font-bold break-all">{auth.currentUser?.email || email || 'your email'}</span>. Please check your inbox and spam folder. Click the verification link to continue.
          </p>
        </div>

        <p className="text-neutral-300 mb-6 font-sans text-xs">
          Your client account is under review. <br />
          We'll contact you via WhatsApp/Gmail soon.
        </p>

        {/* Resend verification email block */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={resendCooldown > 0 || resendCount >= 3}
            className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-neutral-850 text-[11px] text-zinc-300 font-bold border border-white/5 rounded-xl transition duration-150 w-full"
          >
            {resendCooldown > 0 
              ? `Resend in ${resendCooldown}s` 
              : `📧 Resend Verification Email`
            }
          </button>
          
          {resendMessage && (
            <p className="text-[11px] text-zinc-400 font-bold mt-2 text-center">
              {resendMessage}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleCheckGmailVerification}
          disabled={isCheckingGmail}
          className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 text-xs font-extrabold rounded-xl transition font-sans w-full cursor-pointer mb-3 flex items-center justify-center gap-2"
        >
          {isCheckingGmail ? 'Syncing...' : "I've verified my email"}
        </button>

        <button 
          onClick={() => setLockedStatus(null)} 
          className="px-6 py-2.5 bg-neutral-800 text-neutral-300 font-semibold rounded-xl hover:bg-neutral-700 transition font-sans w-full"
        >
          Back to Login
        </button>
      </div>
    );
  }

  // 2. Rejected View
  if (lockedStatus === 'rejected') {
    return (
      <div id="rejected_review_box" className="max-w-md mx-auto my-16 p-8 bg-neutral-900 border border-red-950 rounded-3xl text-center text-white">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold font-sans tracking-tight mb-3 text-red-400">Onboarding Request Declined</h1>
        <p className="text-neutral-300 text-sm mb-4">
          Unfortunately, your brand registration request has been rejected.
        </p>
        <div className="bg-red-950/20 text-red-200 p-4 border border-red-900/40 rounded-xl mb-6 text-sm text-left">
          <strong>Reason for Rejection:</strong> <br />
          <p className="mt-1 text-xs text-neutral-300 leading-relaxed">{lockedReason}</p>
        </div>
        <button 
          onClick={() => setLockedStatus(null)} 
          className="px-6 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition font-sans w-full"
        >
          Try Logging In Again
        </button>
      </div>
    );
  }

  // 3. Suspended View
  if (lockedStatus === 'suspended') {
    return (
      <div id="suspended_review_box" className="max-w-md mx-auto my-16 p-8 bg-neutral-900 border border-red-900 rounded-3xl text-center text-white">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6 animate-pulse" />
        <h1 className="text-2xl font-bold font-sans tracking-tight mb-3 text-red-500">Account Suspended</h1>
        <p className="text-neutral-300 text-sm mb-6">
          Your client account access has been revoked or suspended temporarily. Please resolve outstanding pending billing statements with management.
        </p>
        <button 
          onClick={() => setLockedStatus(null)} 
          className="px-6 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition font-sans w-full"
        >
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div id="client_login_form_container" className="max-w-md mx-auto my-16 px-4 text-white">
      <div className="text-center mb-8">
        <span className="px-3 py-1 bg-indigo-950 text-indigo-400 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 inline-block">
          Enterprise Portal
        </span>
        <h1 className="text-3xl font-extrabold font-sans tracking-tight mb-1 text-white">
          Login as Client
        </h1>
        <p className="text-xs text-neutral-400">
          Sign in to manage posts, revisions, payments, and custom campaigns.
        </p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl shadow-xl p-8">
        {error && (
          <div className="flex items-start gap-3 bg-red-950/40 border border-red-950 p-4 rounded-xl mb-6 text-red-200 text-xs">
            <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Official Gmail Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-neutral-500" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="brand@gmail.com"
                required
                className="w-full pl-11 pr-4 py-2.5 bg-neutral-950 text-white rounded-xl border border-neutral-800 focus:outline-none focus:border-indigo-500 text-sm font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Client Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-neutral-500" />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-11 py-2.5 bg-neutral-950 text-white rounded-xl border border-neutral-800 focus:outline-none focus:border-indigo-500 text-sm font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
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
            className="w-full py-3 px-6 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 transition focus:outline-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Login to dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-neutral-800"></div>
          <span className="flex-shrink mx-4 text-neutral-500 text-[10px] uppercase font-bold tracking-widest">
            Brand Accounts Only
          </span>
          <div className="flex-grow border-t border-neutral-800"></div>
        </div>

        <button
          onClick={() => onNavigate('client-register')}
          className="w-full py-2.5 px-4 bg-neutral-800 text-white text-xs font-semibold rounded-xl hover:bg-neutral-700 transition"
        >
          Create New Client Account
        </button>
      </div>
    </div>
  );
};
