import React from 'react';
import { useApp } from '../context/AppContext';
import { EarningsChart } from '../components/EarningsChart';
import { Award, Gift, TrendingUp, CheckCircle, Wallet, ArrowUpRight, Zap, RefreshCw, UserCheck, Star } from 'lucide-react';
import { getKarmaTier, getKarmaProgressBar } from '../utils/tierHelper';

interface UserDashboardProps {
  onNavigate: (page: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigate }) => {
  const { currentUser, submissions, transactions, settings, syncRedditKarma } = useApp();

  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncSuccess, setSyncSuccess] = React.useState(false);
  const [syncError, setSyncError] = React.useState<string | null>(null);

  if (!currentUser) return null;

  const handleSyncKarma = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsSyncing(true);
    setSyncSuccess(false);
    setSyncError(null);
    try {
      await syncRedditKarma();
      setSyncSuccess(true);
      setSyncError(null); // Clear any and all Sync Failed warnings on success
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (err: any) {
      console.error("[DASHBOARD SYNC ERROR]", err);
      // Requirement 6: Keep previous karma, show friendly fallback instructions, suppress raw errors
      const msg = err?.message || "";
      if (msg.includes("Please add your Reddit username")) {
        setSyncError("Please add your Reddit username in profile settings.");
      } else {
        setSyncError("Unable to fetch latest Reddit karma. Displaying last synced value.");
      }
      setTimeout(() => setSyncError(null), 10000);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatSyncedDate = (isoString?: string) => {
    if (!isoString) {
      return 'Never synced';
    }
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calculate karma tier details
  const currentTier = getKarmaTier(currentUser.karma);
  const karmaBar = getKarmaProgressBar(currentUser.karma);

  // Count approved submissions
  const completedTaskCount = submissions.filter(s => s.userId === currentUser.id && s.status === 'Approved').length;
  
  // Calculate Referral income (for demo, let's take a multiplier of referred invite count, or a fixed ratio)
  const referralIncome = Number((currentUser.totalEarned * 0.1).toFixed(2)); // let's assume 10% comes from refer matches or represent it from transactions
  
  // Achievements list
  const achievements = [
    { title: "First Task Complete", desc: "Submitted task approved", active: completedTaskCount >= 1, badge: "⭐" },
    { title: "Campaign Veteran", desc: "Approved in 5 tasks", active: completedTaskCount >= 5, badge: "🛡️" },
    { title: "Earning Captain", desc: "Made over $50.00 USDT", active: currentUser.totalEarned >= 50.00, badge: "💎" },
    { title: "Silver Veteran", desc: "Reached Silver Tier (1000+ Karma)", active: currentUser.karma >= 1000, badge: "🥈" },
    { title: "Streak Master", desc: "Claimed daily streak 3+", active: (currentUser.streak || 0) >= 3, badge: "🔥" }
  ];

  // User transactions
  const userTx = transactions.filter(tx => tx.userId === currentUser.id).slice(0, 5);

  // Get all approved submissions for currentUser sorted chronologically by submission date
  const approvedSubsByDate = submissions
    .filter(s => s.userId === currentUser.id && s.status === 'Approved')
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  // Accumulate running total of earnings
  const realEarningsProgress: number[] = [0]; // start from 0 representing the genesis/signup state
  const realEarningsLabels: string[] = ['Start'];

  let accumulatedVal = 0;
  approvedSubsByDate.forEach((sub, index) => {
    accumulatedVal += sub.reward;
    realEarningsProgress.push(accumulatedVal);
    const dateStr = sub.submittedAt 
      ? new Date(sub.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
      : `Task ${index + 1}`;
    realEarningsLabels.push(dateStr);
  });

  // If there are no approved tasks yet, show [0, 0] and ['Start', 'No rewards']
  if (realEarningsProgress.length === 1) {
    realEarningsProgress.push(0);
    realEarningsLabels.push('No rewards');
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-white select-none" id="user-dashboard-container">
      
      {/* Upper Welcome Header */}
      <div className="pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl md:text-3xl font-black font-display">Creator Dashboard</span>
            <span className="px-3 py-1 bg-purple-600/10 border border-purple-500/20 text-purple-400 font-bold rounded-full text-xs uppercase tracking-wider">
              {currentTier.emoji} {currentTier.name} Tier
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-semibold">
            Reddit Account Linked: <strong className="text-purple-400 tracking-wide font-mono">{currentUser.redditUsername}</strong>
          </p>
        </div>
      </div>

      {/* Stats Cards Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Total Earnings */}
        <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 backdrop-blur-md relative overflow-hidden group hover:border-bento-purple/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-bento-purple/10 rounded-full blur-xl"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-display">Total Earnings</span>
            <div className="p-2 bg-bento-purple/10 border border-bento-purple/20 rounded-xl text-bento-purple">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-black text-white font-mono">${currentUser.totalEarned.toFixed(2)}</h3>
            <p className="text-[10px] text-zinc-500 font-semibold">Lifetime rewards from approved Reddit tasks</p>
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 backdrop-blur-md relative overflow-hidden group hover:border-bento-blue/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-bento-blue/10 rounded-full blur-xl"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-display">Available Balance</span>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-black text-white font-mono">${currentUser.balance.toFixed(2)}</h3>
            <p className="text-[10px] text-zinc-500 font-semibold">Ready to cashout instantly to BSC BEP20 address</p>
          </div>
        </div>

        {/* Tasks Completed */}
        <div className="bg-white/5 border border-white/10 rounded-[28px] p-6 backdrop-blur-md relative overflow-hidden group hover:border-bento-purple/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#7C3AED]/10 rounded-full blur-xl"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-display">Active Submits</span>
            <div className="p-2 bg-bento-blue/10 border border-bento-blue/20 rounded-xl text-bento-blue">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-black text-white font-mono">{submissions.filter(s => s.userId === currentUser.id).length}</h3>
            <p className="text-[10px] text-zinc-500 font-semibold">{completedTaskCount} tasks approved &bull; {submissions.filter(s => s.userId === currentUser.id && s.status === 'Pending').length} in audit</p>
          </div>
        </div>



      </div>

      {/* Karma Tier & Progress Panel */}
      <div className="bg-white/5 border border-purple-500/10 rounded-[24px] p-6 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2.5 w-full md:w-3/5">
          <div className="flex justify-between items-center text-xs flex-wrap gap-2">
            <span className="text-zinc-300 font-black uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400" /> Reddit Karma Tier Status
            </span>
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-white font-black font-mono">{currentUser.karma?.toLocaleString() || 0} Reddit Karma</span>
                {currentUser.linkKarma !== undefined && currentUser.commentKarma !== undefined && (
                  <span className="text-[9px] text-zinc-400 font-mono">
                    (Link: {currentUser.linkKarma.toLocaleString()} | Comment: {currentUser.commentKarma.toLocaleString()})
                  </span>
                )}
              </div>
              <button
                id="sync-reddit-karma-btn"
                onClick={handleSyncKarma}
                disabled={isSyncing || !currentUser.redditUsername || !currentUser.redditUsername.trim()}
                className={`flex items-center justify-center gap-2 px-3.5 py-2.5 md:py-1 md:px-2.5 text-xs md:text-[10px] font-black uppercase tracking-wider rounded-xl md:rounded-lg border transition-all cursor-pointer min-h-[44px] md:min-h-0 ${
                  (!currentUser.redditUsername || !currentUser.redditUsername.trim())
                    ? 'bg-zinc-900 text-zinc-500 border-zinc-800 cursor-not-allowed opacity-50'
                    : isSyncing 
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20 cursor-wait'
                      : syncSuccess
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-white/5 text-zinc-300 border-white/5 hover:bg-white/10 hover:border-white/10 active:scale-95'
                }`}
                title={(!currentUser.redditUsername || !currentUser.redditUsername.trim()) ? "Please add your Reddit username in profile settings" : "Force refresh Reddit karma balance now"}
              >
                <RefreshCw className={`w-3.5 h-3.5 md:w-3 md:h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : syncSuccess ? 'Synced' : 'Sync Now'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white">{currentTier.emoji} {currentTier.name} Tier</span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase">
              ({currentTier.minKarma.toLocaleString()}{currentTier.maxKarma === Infinity ? '+' : ` - ${currentTier.maxKarma.toLocaleString()}`} Karma)
            </span>
          </div>

          {(!currentUser.redditUsername || !currentUser.redditUsername.trim()) ? (
            <div className="text-[10px] text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl uppercase tracking-wider inline-flex items-center gap-1.5 w-max">
              <span>⚠️ Please add your Reddit username in profile settings.</span>
            </div>
          ) : syncError ? (
            <div className="text-[10px] text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl uppercase tracking-wider animate-pulse inline-flex items-center gap-1.5">
              <span>⚠️ {syncError}</span>
            </div>
          ) : null}
          
          {/* Progress bar to next tier */}
          <div className="space-y-1">
            <div className="w-full bg-zinc-950 rounded-full h-3 border border-white/5 relative overflow-hidden">
              <div 
                style={{ width: `${karmaBar.percent}%` }}
                className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
              <span>{karmaBar.text}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <span className="text-[10px] text-zinc-500 font-semibold leading-tight">
              Sync with Reddit API triggers automatically every 24 hours. Your tier unlocks higher paying Special Tasks.
            </span>
            <span className="text-[10px] text-zinc-400 font-extrabold tracking-wide uppercase shrink-0 flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 text-purple-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Last Synced:</span> <span className="text-purple-400 font-mono">{formatSyncedDate(currentUser.karmaLastSynced)}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 md:border-l md:border-white/5 md:pl-8 py-1.5 shrink-0 select-none">
          <div>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Global Boost</span>
            <span className="text-sm font-black text-white font-mono block">
              {settings.globalMultiplier.toFixed(2)}x
            </span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Tier Boost</span>
            <span className="text-sm font-black text-purple-400 font-mono block">
              {(currentTier.multiplier || 1.00).toFixed(2)}x
            </span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block text-pink-400">Total Reward Multiplier</span>
            <span className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 font-display font-mono block">
              {(settings.globalMultiplier * (currentTier.multiplier || 1.00)).toFixed(2)}x
            </span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Badge level</span>
            <span className="text-xs px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-purple-400 font-black font-mono inline-block mt-0.5">
              {currentTier.emoji} {currentTier.name}
            </span>
          </div>
        </div>
      </div>

      {/* Main Core Layout: Charts & Feed split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 columns - Dynamic SVG Charting */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[32px] p-4 backdrop-blur-md">
          {/* We pass currentUser's specific earning values into the custom SVG charts */}
          <EarningsChart 
            earningsData={realEarningsProgress} 
            labels={realEarningsLabels}
          />
        </div>

        {/* Right 1 column - Achievements & Badges List */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 backdrop-blur-md flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-bento-purple block mb-1">Creator Milestones</span>
            <h3 className="text-base font-black text-white mb-4">Earned Achievement Badges</h3>
            
            <div className="space-y-3.5">
              {achievements.map((a, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    a.active 
                      ? 'bg-bento-purple/10 border-bento-purple/20' 
                      : 'bg-zinc-950/20 border-white/[0.02] opacity-40'
                  }`}
                >
                  <span className="text-2xl select-all">{a.badge}</span>
                  <div>
                    <span className="text-xs font-black text-white block leading-tight">{a.title}</span>
                    <span className="text-[10px] text-zinc-500 font-semibold">{a.desc}</span>
                  </div>
                  {a.active && (
                    <span className="ml-auto text-[9px] font-bold text-bento-purple uppercase tracking-widest font-mono">Unlocked</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 mt-6 flex justify-between items-center text-xs">
            <span className="text-zinc-500 font-semibold">Completed Milestones:</span>
            <span className="font-extrabold text-white font-mono">{achievements.filter(a => a.active).length} / 5</span>
          </div>
        </div>

      </div>

      {/* Quick Action links and Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Quick Earning links */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Quick Actions</span>
          <h3 className="text-base font-black text-white mb-4">Platform Shortcuts</h3>

          <div className="space-y-2.5">
            <button 
              onClick={() => onNavigate('marketplace')}
              className="w-full p-3.5 bg-black/40 border border-white/5 rounded-2xl hover:border-bento-purple/40 flex justify-between items-center text-left transition-all group cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold text-white block">Browse Active Reddit Tasks</span>
                <span className="text-[10px] text-zinc-500">Comments starting at $0.80 USDT</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </button>

            <button 
              onClick={() => onNavigate('wallet')}
              className="w-full p-3.5 bg-black/40 border border-white/5 rounded-2xl hover:border-bento-purple/40 flex justify-between items-center text-left transition-all group cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold text-white block">Wallet Cashout Requests</span>
                <span className="text-[10px] text-zinc-500">Submit USDT BEP20 withdrawal address</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </button>

            <button 
              onClick={() => onNavigate('tickets')}
              className="w-full p-3.5 bg-black/40 border border-white/5 rounded-2xl hover:border-bento-purple/40 flex justify-between items-center text-left transition-all group cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold text-white block">Support & Help Desk</span>
                <span className="text-[10px] text-zinc-500">Contact admin or view support ticket statuses</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Recent Transactions / activity feed */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[32px] p-6 backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#3B82F6] block mb-1">Submissions Ledger</span>
          <h3 className="text-base font-black text-white mb-4">Recent Activity Feed</h3>

          <div className="space-y-3">
            {userTx.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs text-balance select-text">
                No transactions recorded yet. Complete some active Reddit campaigns to populate stats!
              </div>
            ) : (
              userTx.map((tx) => (
                <div key={tx.id} className="p-3 bg-black/60 border border-white/5 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">{tx.description}</span>
                    <span className="text-[9px] text-zinc-500 font-bold font-mono">{new Date(tx.date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-black font-mono block ${
                      tx.type === 'withdrawal' ? 'text-red-400' : 'text-emerald-400'
                    }`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}${tx.amount.toFixed(2)} USDT
                    </span>
                    <span className={`text-[9px] font-mono tracking-wider ${
                      tx.status === 'Completed' ? 'text-emerald-400' : 
                      tx.status === 'Pending' ? 'text-yellow-400 animate-pulse' : 'text-red-400'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
