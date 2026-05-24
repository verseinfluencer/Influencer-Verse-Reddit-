import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Award, ShieldAlert, Sparkles, User as UserIcon, Calendar, Gift, Copy, Check, MessageSquare, AlertCircle, Edit, CheckCircle2 } from 'lucide-react';
import { getKarmaTier, getKarmaProgressBar } from '../utils/tierHelper';

export const UserProfile: React.FC = () => {
  const { currentUser, submissions, settings, updateProfile } = useApp();
  const [copied, setCopied] = useState(false);
  const [bio, setBio] = useState('Earning USDT with decentralized campaigns on Reddit! Space explorer.');
  
  // Inline editing for gender
  const [isEditingGender, setIsEditingGender] = useState(false);
  const [tempGender, setTempGender] = useState(currentUser?.gender || '');

  if (!currentUser) return null;

  const isPending = currentUser.status === 'Pending';
  const referralLinkUrl = `https://influencerverse.com/join?ref=${currentUser.referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLinkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentTier = getKarmaTier(currentUser.karma);
  const karmaBar = getKarmaProgressBar(currentUser.karma);
  const completedTaskCount = submissions.filter(s => s.userId === currentUser.id && s.status === 'Approved').length;

  const handleSaveGender = () => {
    updateProfile(
      currentUser.fullName,
      currentUser.redditUsername,
      currentUser.redditProfileLink,
      tempGender ? (tempGender as any) : undefined
    );
    setIsEditingGender(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 text-white select-none" id="user-profile-panel">
      
      {/* Pending status warning banner for unapproved users */}
      {isPending && (
        <div className="p-5 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-3xl backdrop-blur-md space-y-3 relative overflow-hidden select-text">
          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/5 rounded-full blur-xl animate-pulse"></div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-yellow-400 leading-none">Security Compliance review pending</h3>
              <span className="text-[10px] text-zinc-500 font-bold block mt-0.5">Your Reddit profile is under manual audit</span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 font-semibold leading-relaxed">
            Your Reddit username <strong className="text-purple-400">{currentUser.redditUsername}</strong> is currently being mapped against Reddit directories to verify account authenticity and age limits. We'll send an instant update here as soon as audit results completes.
          </p>

          <div className="text-[10px] text-yellow-500 bg-yellow-500/5 border border-yellow-500/10 p-2.5 rounded-xl font-normal max-w-sm">
            🛡️ Restricted Section Lock includes: Tasks marketplace submissions, referral payouts, and instant wallet withdrawals.
          </div>
        </div>
      )}

      {/* Main visual creator profile card */}
      <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left select-text">
          {/* Avatar block */}
          <div className="relative">
            <img 
              src={currentUser.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=Admin"} 
              alt="Avatar" 
              className="w-20 h-20 rounded-full border-2 border-purple-500 p-0.5 bg-zinc-950" 
            />
            <span className="absolute -bottom-1 -right-1 text-2xl" title={`${currentTier.name} Status`}>{currentTier.emoji}</span>
          </div>

          {/* Details segment */}
          <div className="space-y-3.5 flex-1 w-full w-full">
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white">{currentUser.fullName}</h2>
                <span className="self-center px-3 py-0.5 border border-purple-500/30 text-purple-400 bg-purple-500/5 text-[10px] font-black uppercase rounded-full">
                  {currentTier.emoji} {currentTier.name} Tier
                </span>
              </div>
              <p className="text-purple-400 font-bold text-xs tracking-wider">{currentUser.redditUsername}</p>
            </div>

            {/* Custom Bio text */}
            <div className="space-y-1">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Creator Bio Statement</span>
              <p className="text-xs text-zinc-400 font-semibold italic">"{bio}"</p>
            </div>

            {/* General Creator Metadata - Including Private Gender field */}
            <div className="flex flex-wrap gap-4 text-[10px] text-zinc-500 font-bold uppercase select-none border-t border-white/5 pt-3 mt-3">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Registered: {currentUser.joinDate}</span>
              <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Compliance: Active</span>
              
              {/* Private Gender element */}
              <div className="flex items-center gap-1 border-l border-white/10 pl-4">
                <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-500 mr-1">Gender (Private):</span>
                {isEditingGender ? (
                  <div className="flex items-center gap-1.5 normal-case">
                    <select
                      value={tempGender}
                      onChange={(e) => setTempGender(e.target.value as any)}
                      className="bg-zinc-950 border border-white/10 text-white text-[10px] rounded px-1.5 py-0.5 focus:outline-none focus:border-purple-500 text-xs"
                    >
                      <option value="">Not set</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    <button
                      onClick={handleSaveGender}
                      className="px-2 py-0.5 bg-purple-600 font-black rounded text-[9px] text-white hover:bg-purple-500 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setTempGender(currentUser.gender || '');
                        setIsEditingGender(false);
                      }}
                      className="px-1.5 py-0.5 bg-zinc-800 rounded text-[9px] text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <span className="text-zinc-300 flex items-center gap-1 truncate max-w-[130px] normal-case">
                    {currentUser.gender || "Prefer not to say"}
                    <button 
                      onClick={() => setIsEditingGender(true)}
                      className="hover:text-purple-400 p-0.5 text-zinc-500 shrink-0 cursor-pointer"
                      title="Update Gender"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core statistics boxes row - cleaned of any empty space */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center">
        
        <div className="bg-zinc-900/30 border border-white/10 p-5 rounded-2xl relative overflow-hidden">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Approved Tasks</span>
          <span className="text-2xl font-black text-white font-mono">{completedTaskCount} completed</span>
          <p className="text-[9px] text-zinc-500 font-semibold mt-1">Verification compliance rating: 100%</p>
        </div>

        <div className="bg-zinc-900/30 border border-white/10 p-5 rounded-2xl relative overflow-hidden">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Revenue Earned</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">${currentUser.totalEarned.toFixed(2)} USDT</span>
          <p className="text-[9px] text-zinc-500 font-semibold mt-1">Ready wallet balance: ${currentUser.balance.toFixed(2)}</p>
        </div>

      </div>

      {/* User's private Karma stats (only visible to them on their profile) */}
      <div className="bg-zinc-900/30 border border-purple-500/10 p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Your Private Reddit Karma Status (Only Visible to You)
        </span>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-3">
          <div className="space-y-1">
            <span className="text-3xl font-black text-white font-mono">{currentUser.karma?.toLocaleString() || 0} Karma</span>
            <div className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1.5 flex-wrap">
              <span>Current Level:</span>
              <span className="text-purple-400 font-black font-mono">{currentTier.emoji} {currentTier.name} Tier</span>
              <span className="text-zinc-500">({currentTier.minKarma.toLocaleString()}{currentTier.maxKarma === Infinity ? '+' : `-${currentTier.maxKarma.toLocaleString()}`} karma)</span>
            </div>
            <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide flex items-center gap-1 pt-0.5">
              <span>🔄 Last Synced:</span>
              <span className="text-purple-400/80 font-mono">
                {currentUser.karmaLastSynced
                  ? new Date(currentUser.karmaLastSynced).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })
                  : 'Never synced'}
              </span>
            </div>
          </div>
          
          {currentUser.karmaYesterday !== undefined && (
            <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/10 text-right text-xs">
              <span className="text-zinc-500 font-semibold block uppercase text-[8px] tracking-wider">Yesterday's Sync</span>
              <span className="text-zinc-200 font-bold font-mono">{(currentUser.karmaYesterday).toLocaleString()} Karma</span>
              <span className={`font-bold font-mono block mt-0.5 ${(currentUser.karma - currentUser.karmaYesterday) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentUser.karma - currentUser.karmaYesterday >= 0 ? '+' : ''}
                {currentUser.karma - currentUser.karmaYesterday} change
              </span>
            </div>
          )}
        </div>

        {/* Progress bar displayed to user */}
        <div className="mt-6 border-t border-white/5 pt-4">
          <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1.5">
            <span className="uppercase font-bold tracking-wider">Next Tier Progression</span>
            <span className="font-mono font-bold text-zinc-300">{karmaBar.text}</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-3 border border-white/5 relative overflow-hidden">
            <div 
              style={{ width: `${karmaBar.percent}%` }}
              className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-500"
            ></div>
          </div>
        </div>

      </div>

    </div>
  );
};
