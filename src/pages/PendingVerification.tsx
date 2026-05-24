import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Clock, RotateCw, ExternalLink, HelpCircle, ShieldCheck } from 'lucide-react';

interface PendingVerificationProps {
  onNavigate: (page: string) => void;
}

export const PendingVerification: React.FC<PendingVerificationProps> = ({ onNavigate }) => {
  const { currentUser } = useApp();

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-16 text-center select-none" id="pending-verification-view">
      <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-md shadow-2xl relative overflow-hidden">
        
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Animated clock visual */}
        <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/25 flex items-center justify-center mx-auto mb-6 text-yellow-500 animate-pulse">
          <Clock className="w-8 h-8" />
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-3">
          Account Under Manual Review
        </h2>
        
        <p className="text-zinc-400 text-xs sm:text-sm font-semibold max-w-md mx-auto leading-relaxed mb-8">
          Your credentials have been submitted safely. Our security reviewers are audit-mapping your Reddit profile statistics. You'll be notified via the notification interface as soon as approval completes!
        </p>

        {/* Submitted Details Display */}
        {currentUser && (
          <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4 mb-8 text-left max-w-md mx-auto space-y-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block border-b border-white/5 pb-1.5">Submitted Details</span>
            
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 font-semibold">Creator Name:</span>
              <span className="text-white font-extrabold">{currentUser.fullName}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 font-semibold">Reddit Username:</span>
              <span className="text-purple-400 font-bold">{currentUser.redditUsername}</span>
            </div>

            <div className="flex justify-between items-start gap-4 text-xs">
              <span className="text-zinc-400 font-semibold whitespace-nowrap">Profile URL:</span>
              <a 
                href={currentUser.redditProfileLink} 
                target="_blank" 
                rel="noreferrer" 
                className="text-blue-400 hover:underline font-semibold flex items-center gap-1 break-all max-w-[220px]"
              >
                {currentUser.redditProfileLink} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>

            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-zinc-400 font-semibold">Account Status:</span>
              <span className="px-2.5 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-full font-bold text-[10px]">
                Pending Verification
              </span>
            </div>
          </div>
        )}

        {/* Informative restricted warnings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-md mx-auto mb-8 font-semibold">
          <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl text-xs text-zinc-500">
            <strong className="text-zinc-400 block mb-0.5">Blocked Sections</strong>
            Tasks marketplace, earning wallet, active submissions, leaderboard access during review.
          </div>
          <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl text-xs text-zinc-500">
            <strong className="text-zinc-400 block mb-0.5">Permitted Areas</strong>
            You are free to explore your <button onClick={() => onNavigate('profile')} className="text-purple-400 hover:underline">My Profile</button>, adjust config in <button onClick={() => onNavigate('settings')} className="text-purple-400 hover:underline">Settings</button> page, or contact support.
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={() => onNavigate('profile')}
            className="px-6 py-2.5 bg-zinc-950 hover:bg-zinc-900 text-xs font-bold rounded-xl border border-white/5 text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            Update Reddit Profile
          </button>
          <button 
            onClick={() => onNavigate('tickets')}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-xs font-bold rounded-xl text-white shadow-lg shadow-purple-500/15 cursor-pointer transition-all"
          >
            Create Help Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
