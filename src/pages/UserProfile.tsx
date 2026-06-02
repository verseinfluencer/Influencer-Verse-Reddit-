import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Award, ShieldAlert, Sparkles, User as UserIcon, Calendar, Edit } from 'lucide-react';
import { getKarmaTier, getKarmaProgressBar } from '../utils/tierHelper';
import { AccountSidebar } from '../components/AccountSidebar';

interface UserProfileProps {
  onNavigate: (page: string) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onNavigate }) => {
  const { currentUser, submissions, updateProfile } = useApp();
  const [bio] = useState('Earning USDT with decentralized campaigns on Reddit! Space explorer.');
  
  // Inline editing for gender
  const [isEditingGender, setIsEditingGender] = useState(false);
  const [tempGender, setTempGender] = useState(currentUser?.gender || '');

  if (!currentUser) return null;

  const isPending = currentUser.status === 'Pending';
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 select-none" id="user-profile-panel">
      
      {/* Title Header */}
      <div className="space-y-1.5 pb-4 border-b border-gray-200">
        <span className="text-xs text-purple-600 font-bold uppercase tracking-widest block mb-1">Account & Settings</span>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Creator Profile</h1>
        <p className="text-sm text-gray-500 font-medium">Manage your micro-influencer identity, sync your Reddit stats, and view milestones</p>
      </div>

      {/* Main Account Area with Sidebar Grid */}
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Sidebar Left Column */}
        <AccountSidebar activeTab="profile" onNavigate={onNavigate} />

        {/* Content Right Column */}
        <div className="flex-1 space-y-6 w-full">
          
          {/* Pending status warning banner for unapproved users */}
          {isPending && (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl relative overflow-hidden select-text text-gray-700 shadow-sm animate-fade-in">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl"></div>
              
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 border border-amber-200 text-amber-800">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-none">Security Compliance review pending</h3>
                  <span className="text-[10px] text-gray-500 font-bold block mt-1">Your Reddit profile is under manual audit</span>
                </div>
              </div>

              <p className="text-xs text-gray-600 font-medium leading-relaxed mt-3">
                Your Reddit username <strong className="text-purple-600 font-bold">{currentUser.redditUsername}</strong> is currently being mapped against Reddit directories to verify account authenticity and age limits. We'll send an instant update here as soon as audit results completes.
              </p>

              <div className="text-[10px] text-amber-900 bg-amber-100/50 border border-amber-200/50 p-2.5 rounded-xl font-semibold mt-3 max-w-md">
                🛡️ Restricted Section Lock includes: Tasks marketplace submissions, referral payouts, and instant wallet withdrawals.
              </div>
            </div>
          )}

          {/* Main visual creator profile card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left select-text">
              {/* Avatar block */}
              <div className="relative shrink-0">
                <img 
                  src={currentUser.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=Admin"} 
                  alt="Avatar" 
                  className="w-20 h-20 rounded-full border-2 border-purple-500 p-0.5 bg-white shadow-sm" 
                />
                <span className="absolute -bottom-1 -right-1 text-2xl" title={`${currentTier.name} Status`}>{currentTier.emoji}</span>
              </div>

              {/* Details segment */}
              <div className="space-y-4 flex-1 w-full text-left">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 justify-center sm:justify-start">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">{currentUser.fullName}</h2>
                    <span className="inline-flex self-start sm:self-center px-3 py-0.5 border border-purple-200/50 text-purple-600 bg-purple-50 text-[10px] font-bold uppercase rounded-full">
                      {currentTier.emoji} {currentTier.name} Tier
                    </span>
                  </div>
                  <p className="text-purple-600 font-bold text-xs tracking-wider mt-1 font-mono">{currentUser.redditUsername}</p>
                </div>

                {/* Custom Bio text */}
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Creator Bio Statement</span>
                  <p className="text-sm text-gray-600 font-medium italic">"{bio}"</p>
                </div>

                {/* General Creator Metadata - Including Private Gender field */}
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 font-medium select-none border-t border-gray-100 pt-4 mt-4">
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" /> Registered: {currentUser.joinDate}</span>
                  <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-gray-400" /> Compliance: Active</span>
                  
                  {/* Private Gender element */}
                  <div className="flex items-center gap-1.5 sm:border-l sm:border-gray-200 sm:pl-4">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Gender (Private):</span>
                    {isEditingGender ? (
                      <div className="flex items-center gap-1.5 normal-case">
                        <select
                          value={tempGender}
                          onChange={(e) => setTempGender(e.target.value as any)}
                          className="bg-white border border-gray-200 text-gray-800 text-xs rounded px-2 py-1 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
                        >
                          <option value="">Not set</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                        <button
                          onClick={handleSaveGender}
                          className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 font-bold rounded text-xs text-white hover:opacity-95 shadow-sm cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setTempGender(currentUser.gender || '');
                            setIsEditingGender(false);
                          }}
                          className="px-2.5 py-1 bg-white border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-800 font-bold flex items-center gap-1 truncate max-w-[130px] normal-case">
                        {currentUser.gender || "Prefer not to say"}
                        <button 
                          onClick={() => setIsEditingGender(true)}
                          className="hover:text-purple-600 p-0.5 text-gray-400 shrink-0 cursor-pointer transition-colors"
                          title="Update Gender"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center">
            
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-widest block mb-1">Approved Tasks</span>
              <span className="text-2xl font-bold text-gray-900 font-mono block mt-1">{completedTaskCount} completed</span>
              <p className="text-xs text-emerald-600 font-medium mt-2">Verification compliance rating: 100%</p>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-widest block mb-1">Total Earned</span>
              <span className="text-2xl font-bold text-emerald-600 font-mono block mt-1">${currentUser.totalEarned.toFixed(2)} USDT</span>
              <p className="text-xs text-gray-500 font-medium mt-2">Ready wallet balance: <span className="font-bold text-gray-700">${currentUser.balance.toFixed(2)}</span></p>
            </div>

          </div>

          {/* User's private Karma stats */}
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <span className="text-xs text-purple-600 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Your Private Reddit Karma Status (Only Visible to You)
            </span>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-4 pb-4 border-b border-gray-100">
              <div className="space-y-1">
                <span className="text-3xl font-bold text-gray-900 font-mono block">{(currentUser.redditKarma ?? currentUser.karma ?? 0).toLocaleString()} Karma</span>
                <div className="text-xs text-gray-500 font-semibold flex items-center gap-1.5 flex-wrap">
                  <span>Current Level:</span>
                  <span className="text-purple-600 font-bold">{currentTier.emoji} {currentTier.name} Tier</span>
                  <span className="text-gray-400">({currentTier.minKarma.toLocaleString()}{currentTier.maxKarma === Infinity ? '+' : `-${currentTier.maxKarma.toLocaleString()}`} karma)</span>
                </div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide flex items-center gap-1 pt-1.5">
                  <span>🔄 Last Synced:</span>
                  <span className="text-purple-600 font-mono">
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
                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100 text-right text-xs">
                  <span className="text-gray-400 font-bold block uppercase text-[8px] tracking-wider mb-0.5">Yesterday's Sync</span>
                  <span className="text-gray-900 font-bold font-mono">{(currentUser.karmaYesterday).toLocaleString()} Karma</span>
                  <span className={`font-bold font-mono block mt-1 ${(currentUser.karma - currentUser.karmaYesterday) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {currentUser.karma - currentUser.karmaYesterday >= 0 ? '+' : ''}
                    {currentUser.karma - currentUser.karmaYesterday} change
                  </span>
                </div>
              )}
            </div>

            {/* Progress bar displayed to user */}
            <div className="mt-5">
              <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                <span className="uppercase font-bold tracking-wider text-[10px]">Next Tier Progression</span>
                <span className="font-mono font-bold text-gray-700">{karmaBar.text}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 border border-gray-200 relative overflow-hidden">
                <div 
                  style={{ width: `${karmaBar.percent}%` }}
                  className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                ></div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
