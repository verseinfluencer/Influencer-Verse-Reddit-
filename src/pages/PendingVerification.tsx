import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Clock, RotateCw, ExternalLink, HelpCircle, ShieldCheck } from 'lucide-react';
import { auth } from '../utils/firebase';
import { sendEmailVerification } from 'firebase/auth';

interface PendingVerificationProps {
  onNavigate: (page: string) => void;
}

export const PendingVerification: React.FC<PendingVerificationProps> = ({ onNavigate }) => {
  const { currentUser } = useApp();

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [resendMessage, setResendMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

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
        setResendMessage('❌ No active session found.');
      }
    } catch (err: any) {
      console.error(err);
      setResendMessage('❌ Please wait before resending.');
    }
  };

  const handleSyncVerification = async () => {
    setIsSyncing(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          const db = (await import('../utils/firebase')).db;
          const { doc, updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'users', user.uid), { emailVerified: true, gmailVerified: true });
          alert("✅ Email verified successfully! Admin can now approve your profile.");
          window.location.reload();
        } else {
          alert("❌ Email is not verified yet. Please check your inbox and click the verification link.");
        }
      } else {
        alert("Session is untraceable. Try logging in again.");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-16 text-center select-none" id="pending-verification-view">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden text-slate-800 font-semibold">
        
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Animated clock visual */}
        <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/25 flex items-center justify-center mx-auto mb-6 text-yellow-650 animate-pulse">
          <Clock className="w-8 h-8" />
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-3">
          Account Under Manual Review
        </h2>
        
        <p className="text-slate-550 text-xs sm:text-sm font-semibold max-w-md mx-auto leading-relaxed mb-8">
          Your credentials have been submitted safely. Our security reviewers are audit-mapping your Reddit profile statistics. You'll be notified via the notification interface as soon as approval completes!
        </p>

        {/* Submitted Details Display */}
        {currentUser && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8 text-left max-w-md mx-auto space-y-3 mt-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block border-b border-slate-200 pb-1.5">Submitted Details</span>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Creator Name:</span>
              <span className="text-slate-900 font-extrabold">{currentUser.fullName}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Reddit Username:</span>
              <span className="text-purple-650 font-bold font-mono">@{currentUser.redditUsername}</span>
            </div>

            <div className="flex justify-between items-start gap-4 text-xs">
              <span className="text-slate-500 font-semibold whitespace-nowrap">Profile URL:</span>
              <a 
                href={currentUser.redditProfileLink} 
                target="_blank" 
                rel="noreferrer" 
                className="text-indigo-600 hover:underline font-bold flex items-center gap-1 break-all max-w-[220px]"
              >
                {currentUser.redditProfileLink} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>

            <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-1.5">
              <span className="text-slate-500 font-semibold">Email Status:</span>
              {(currentUser.emailVerified || currentUser.gmailVerified || auth.currentUser?.emailVerified) ? (
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full font-bold text-[10px]">
                  Verified
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-550 rounded-full font-bold text-[10px] animate-pulse">
                  Unverified
                </span>
              )}
            </div>

            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-slate-500 font-semibold">Account Status:</span>
              <span className="px-2.5 py-0.5 bg-yellow-500/10 text-yellow-600 rounded-full font-bold text-[10px]">
                Pending Verification
              </span>
            </div>
          </div>
        )}

        {/* Resend and check email verification block */}
        {currentUser && !(currentUser.emailVerified || currentUser.gmailVerified || auth.currentUser?.emailVerified) && (
          <div className="max-w-md mx-auto mb-8 bg-purple-50/50 border border-purple-200/50 p-4 rounded-2xl text-center space-y-3">
            <p className="text-xs text-slate-700 font-semibold leading-relaxed">
              📧 Verification email sent to <strong className="text-purple-700 font-bold break-all">{currentUser.email || auth.currentUser?.email || 'your email'}</strong>. Please check your inbox and spam folder. Click the verification link to continue.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={handleResendEmail}
                disabled={resendCooldown > 0 || resendCount >= 3}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[11px] font-bold text-slate-700 hover:text-slate-900 rounded-xl disabled:opacity-40 cursor-pointer transition-all"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : '📧 Resend Email'}
              </button>
              
              <button
                onClick={handleSyncVerification}
                disabled={isSyncing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 font-bold text-white text-[11px] rounded-xl cursor-pointer transition-all shadow-xs"
              >
                {isSyncing ? 'Syncing...' : "I've verified my email"}
              </button>
            </div>
            {resendMessage && (
              <p className="text-[10px] text-slate-500 font-bold">{resendMessage}</p>
            )}
          </div>
        )}

        {/* Informative restricted warnings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md mx-auto mb-8 font-semibold select-none">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
            <strong className="text-slate-600 block mb-0.5 font-bold">Blocked Sections</strong>
            Tasks marketplace, earning wallet, active submissions, leaderboard access during review.
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
            <strong className="text-slate-600 block mb-0.5 font-bold">Permitted Areas</strong>
            You are free to explore your <button onClick={() => onNavigate('profile')} className="text-purple-600 hover:underline cursor-pointer font-bold">My Profile</button>, adjust config in <button onClick={() => onNavigate('settings')} className="text-purple-600 hover:underline cursor-pointer font-bold">Settings</button> page, or contact support.
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={() => onNavigate('profile')}
            className="px-6 py-2.5 bg-white hover:bg-slate-50 text-xs font-bold rounded-xl border border-slate-250 text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-xs"
          >
            Update Reddit Profile
          </button>
          <button 
            onClick={() => onNavigate('tickets')}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-xs font-bold rounded-xl text-white shadow-md shadow-purple-500/15 cursor-pointer transition-all active:scale-[0.98]"
          >
            Create Help Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
