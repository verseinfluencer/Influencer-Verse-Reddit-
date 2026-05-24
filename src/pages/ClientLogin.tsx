import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mail, Lock, AlertCircle, ArrowRight, CheckCircle, Clock } from 'lucide-react';

interface ClientLoginProps {
  onNavigate: (page: string) => void;
}

export const ClientLogin: React.FC<ClientLoginProps> = ({ onNavigate }) => {
  const { clientLogin } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Locked Status rendering (in case they have logged in but represent another state)
  const [lockedStatus, setLockedStatus] = useState<'pending' | 'rejected' | 'suspended' | null>(null);
  const [lockedReason, setLockedReason] = useState('');

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
      setError(err?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Pending view
  if (lockedStatus === 'pending') {
    return (
      <div id="pending_review_box" className="max-w-md mx-auto my-16 p-8 bg-neutral-900 border border-neutral-800 rounded-3xl text-center text-white">
        <Clock className="w-16 h-16 text-amber-500 mx-auto mb-6" />
        <h1 className="text-2xl font-bold font-sans tracking-tight mb-3 text-amber-400">Account Under Review</h1>
        <p className="text-neutral-300 mb-6 font-sans text-sm">
          Your client account is under review. <br />
          We'll contact you via WhatsApp/Gmail soon.
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
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-11 pr-4 py-2.5 bg-neutral-950 text-white rounded-xl border border-neutral-800 focus:outline-none focus:border-indigo-500 text-sm font-sans"
              />
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
