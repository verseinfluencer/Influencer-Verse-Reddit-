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
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const [isProxyAvailable, setIsProxyAvailable] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let active = true;
    const probeProxy = async () => {
      try {
        const res = await fetch('/api/reddit-karma?username=test_health_probe');
        const contentType = res.headers.get("content-type") || "";
        if (!active) return;
        
        // If content-type is text/html, the backend endpoint is not implemented (wildcard SPA fallback served index.html)
        if (contentType.toLowerCase().includes("html")) {
          setIsProxyAvailable(false);
        } else {
          setIsProxyAvailable(true);
        }
      } catch (err) {
        console.warn("[PROBE PROXY FAILED]", err);
        if (active) setIsProxyAvailable(false);
      }
    };
    probeProxy();
    return () => {
      active = false;
    };
  }, []);

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
      const newKarma = await syncRedditKarma();
      setSyncSuccess(true);
      setSyncError(null); 
      setToastMessage(`Success! Your Reddit Karma has been synced. Total Karma: ${newKarma.toLocaleString()}`);
      setTimeout(() => setToastMessage(null), 5000);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (err: any) {
      console.error("[DASHBOARD SYNC ERROR]", err);
      const msg = err?.message || "";
      if (msg === "Reddit account not found." || msg === "USER_NOT_FOUND") {
        setSyncError("Reddit account not found.");
      } else if (msg === "Reddit temporarily unavailable. Please try again later." || msg === "RATE_LIMIT_REACHED") {
        setSyncError("Reddit temporarily unavailable. Please try again later.");
      } else if (msg.includes("Please add your Reddit username")) {
        setSyncError("Please add your Reddit username in profile settings.");
      } else {
        setSyncError("Unable to sync Reddit karma.");
      }
      setTimeout(() => setSyncError(null), 12000);
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-zinc-805 select-none" id="user-dashboard-container">
      
      {/* Upper Welcome Header */}
      <div className="pb-2 border-b border-slate-200/60">
        <div className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl md:text-3xl font-black font-display text-zinc-900">Creator Dashboard</span>
                <span className="px-3 py-1 bg-purple-50 border border-purple-150/70 text-purple-700 font-extrabold rounded-full text-[11px] uppercase tracking-wider shadow-sm">
                  {currentTier.emoji} {currentTier.name} Tier
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-semibold mt-1">
                Linked Reddit Identity: <strong className="text-purple-650 tracking-wide font-mono">{currentUser.redditUsername}</strong>
              </p>
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              Track your campaigns, earnings, and submission progress.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Total Earnings */}
        <div className="bg-white border border-slate-200/65 rounded-[24px] p-6 relative overflow-hidden group hover:border-purple-600/30 hover:shadow-lg hover:shadow-purple-500/[0.015] transition-all duration-300 shadow-sm shadow-slate-100">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl animate-pulse"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-display">Total Earnings</span>
            <div className="p-2 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold text-zinc-900 font-mono">${currentUser.totalEarned.toFixed(2)}</h3>
            <p className="text-[10px] text-zinc-500 font-medium">Lifetime rewards from approved Reddit tasks</p>
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-white border border-slate-200/65 rounded-[24px] p-6 relative overflow-hidden group hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/[0.015] transition-all duration-300 shadow-sm shadow-slate-100">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl animate-pulse"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-display">Available Balance</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold text-zinc-900 font-mono">${currentUser.balance.toFixed(2)}</h3>
            <p className="text-[10px] text-zinc-500 font-medium">Ready to cashout instantly to BSC BEP20 address</p>
          </div>
        </div>

        {/* Tasks Completed */}
        <div className="bg-white border border-slate-200/65 rounded-[24px] p-6 relative overflow-hidden group hover:border-indigo-650/30 hover:shadow-lg hover:shadow-indigo-500/[0.015] transition-all duration-300 shadow-sm shadow-slate-100">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#7C3AED]/5 rounded-full blur-xl animate-pulse"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-display">Active Submits</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold text-zinc-900 font-mono">{submissions.filter(s => s.userId === currentUser.id).length}</h3>
            <p className="text-[10px] text-zinc-500 font-medium">{completedTaskCount} tasks approved &bull; {submissions.filter(s => s.userId === currentUser.id && s.status === 'Pending').length} in audit</p>
          </div>
        </div>

      </div>

      {/* Karma Tier & Progress Panel */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2.5 w-full md:w-3/5">
          <div className="flex justify-between items-center text-xs flex-wrap gap-2">
            <span className="text-zinc-705 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500" /> Reddit Karma Tier Status
            </span>
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-zinc-800 font-bold font-mono">{(currentUser.redditKarma ?? currentUser.karma)?.toLocaleString() || 0} Reddit Karma</span>
                {((currentUser.linkKarma !== undefined && currentUser.commentKarma !== undefined) || (currentUser.postKarma !== undefined && currentUser.commentKarma !== undefined)) && (
                  <span className="text-[9px] text-zinc-400 font-mono block">
                    (Post: {(currentUser.postKarma ?? currentUser.linkKarma ?? 0).toLocaleString()} | Comment: {(currentUser.commentKarma ?? 0).toLocaleString()})
                  </span>
                )}
                {(currentUser.lastRedditSync || currentUser.karmaLastSynced) && (
                  <span className="text-[8px] text-zinc-400 font-mono block mt-0.5">
                    Last Synced: {formatSyncedDate(currentUser.lastRedditSync || currentUser.karmaLastSynced || undefined)}
                  </span>
                )}
              </div>
              {isProxyAvailable === false ? (
                <button
                  id="sync-reddit-karma-btn"
                  disabled={true}
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 md:py-1.5 md:px-3 text-xs md:text-[10px] font-bold uppercase tracking-wider rounded-xl md:rounded-lg border bg-amber-50 text-amber-600 border-amber-200 cursor-not-allowed min-h-[44px] md:min-h-0 font-sans"
                  title="Live Reddit sync is currently unavailable"
                >
                  <UserCheck className="w-3.5 h-3.5 md:w-3 md:h-3" />
                  <span>Manual verification active. Sync offline.</span>
                </button>
              ) : (
                <button
                  id="sync-reddit-karma-btn"
                  disabled={isSyncing || !currentUser.redditUsername}
                  onClick={handleSyncKarma}
                  className={`flex items-center justify-center gap-2 px-3.5 py-2.5 md:py-1.5 md:px-3 text-xs md:text-[10px] font-bold uppercase tracking-wider rounded-xl hover:shadow-sm md:rounded-lg border transition-all duration-205 min-h-[44px] md:min-h-0 font-sans ${
                    isSyncing 
                      ? 'bg-slate-100 text-zinc-400 border-slate-200 cursor-not-allowed'
                      : !currentUser.redditUsername
                        ? 'bg-slate-100 text-zinc-400 border-slate-200 cursor-not-allowed opacity-50'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200/70 active:scale-95 cursor-pointer font-bold'
                  }`}
                  title={currentUser.redditUsername ? "Sync Reddit Karma Now" : "Please add Reddit username in profile settings"}
                >
                  <RefreshCw className={`w-3.5 h-3.5 md:w-3 md:h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-900">{currentTier.emoji} {currentTier.name} Tier</span>
            <span className="text-[10px] text-zinc-400 font-bold uppercase">
              ({currentTier.minKarma.toLocaleString()}{currentTier.maxKarma === Infinity ? '+' : ` - ${currentTier.maxKarma.toLocaleString()}`} Karma)
            </span>
          </div>

          {(!currentUser.redditUsername || !currentUser.redditUsername.trim()) ? (
            <div className="text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl uppercase tracking-wider inline-flex items-center gap-1.5 w-max">
              <span>⚠️ Please add your Reddit username in profile settings.</span>
            </div>
          ) : null}
          
          {/* Progress bar to next tier */}
          <div className="space-y-1">
            <div className="w-full bg-slate-50 border border-slate-200/60 rounded-full h-3 relative overflow-hidden">
              <div 
                style={{ width: `${karmaBar.percent}%` }}
                className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              ></div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span className="font-semibold">{karmaBar.text}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <span className="text-[10px] text-zinc-400 font-medium leading-tight">
              Reddit Karma and Tier Level are managed manually by platform moderators. Your tier unlocks higher paying Special Tasks.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 md:border-l md:border-slate-100 md:pl-8 py-1.5 shrink-0 select-none">
          <div>
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Global Boost</span>
            <span className="text-sm font-bold text-zinc-805 font-mono block">
              {settings.globalMultiplier.toFixed(2)}x
            </span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Tier Boost</span>
            <span className="text-sm font-bold text-purple-650 font-mono block">
              {(currentTier.multiplier || 1.00).toFixed(2)}x
            </span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block text-pink-500">Total Multiplier</span>
            <span className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 font-display font-mono block">
              {(settings.globalMultiplier * (currentTier.multiplier || 1.00)).toFixed(2)}x
            </span>
          </div>
          <div>
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block">Badge level</span>
            <span className="span-badge text-xs px-2.5 py-1 bg-purple-50 border border-purple-150 rounded-lg text-purple-700 font-extrabold font-mono inline-block mt-0.5">
              {currentTier.emoji} {currentTier.name}
            </span>
          </div>
        </div>
      </div>

      {/* Main Core Layout: Charts & Feed split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 columns - Dynamic SVG Charting */}
        <div className="lg:col-span-2">
          <EarningsChart 
            earningsData={realEarningsProgress} 
            labels={realEarningsLabels}
          />
        </div>

        {/* Right 1 column - Achievements & Badges List */}
        <div className="bg-white border border-slate-205 rounded-[24px] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 block mb-1">Creator Milestones</span>
            <h3 className="text-base font-bold text-zinc-900 mb-4">Earned Accomplishment Badges</h3>
            
            <div className="space-y-3">
              {achievements.map((a, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    a.active 
                      ? 'bg-purple-50/50 border-purple-150/50' 
                      : 'bg-slate-50/50 border-slate-100 opacity-40'
                  }`}
                >
                  <span className="text-2xl select-all">{a.badge}</span>
                  <div>
                    <span className="text-xs font-bold text-zinc-805 block leading-tight">{a.title}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">{a.desc}</span>
                  </div>
                  {a.active && (
                    <span className="ml-auto text-[9px] font-extrabold text-purple-600 uppercase tracking-widest font-mono bg-purple-100/60 px-1.5 py-0.5 rounded">Unlocked</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6 flex justify-between items-center text-xs">
            <span className="text-zinc-550 font-semibold font-sans">Completed Milestones:</span>
            <span className="font-extrabold text-zinc-800 font-mono bg-slate-100 px-2.5 py-1 rounded-lg">{achievements.filter(a => a.active).length} / 5</span>
          </div>
        </div>

      </div>

      {/* Quick Action links and Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Quick Earning links */}
        <div className="bg-white border border-slate-205 rounded-[24px] p-6 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">Quick Actions</span>
          <h3 className="text-base font-bold text-zinc-900 mb-4">Platform Shortcuts</h3>

          <div className="space-y-2.5">
            <button 
              onClick={() => onNavigate('marketplace')}
              className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-purple-600/30 hover:bg-slate-50/80 flex justify-between items-center text-left transition-all group cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold text-zinc-805 block">Browse Active Reddit Tasks</span>
                <span className="text-[10px] text-zinc-500 font-medium font-sans">Comments starting at $0.80 USDT</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </button>

            <button 
              onClick={() => onNavigate('wallet')}
              className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-purple-600/30 hover:bg-slate-50/80 flex justify-between items-center text-left transition-all group cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold text-zinc-805 block">Wallet Cashout Requests</span>
                <span className="text-[10px] text-zinc-500 font-medium font-sans">Submit USDT BEP20 withdrawal address</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </button>

            <button 
              onClick={() => onNavigate('tickets')}
              className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-purple-600/30 hover:bg-slate-50/80 flex justify-between items-center text-left transition-all group cursor-pointer"
            >
              <div>
                <span className="text-xs font-bold text-zinc-805 block">Support & Help Desk</span>
                <span className="text-[10px] text-zinc-500 font-medium font-sans">Contact admin or view support ticket statuses</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Recent Transactions / activity feed */}
        <div className="lg:col-span-2 bg-white border border-slate-205 rounded-[24px] p-6 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 block mb-1">Submissions Ledger</span>
          <h3 className="text-base font-bold text-zinc-900 mb-4">Recent Activity Feed</h3>

          <div className="space-y-3">
            {userTx.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs text-balance select-text font-medium font-sans">
                No transactions recorded yet. Complete some active Reddit campaigns to populate stats!
              </div>
            ) : (
              userTx.map((tx) => (
                <div key={tx.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-zinc-800 block leading-tight">{tx.description}</span>
                    <span className="text-[9px] text-zinc-400 font-bold font-mono">{new Date(tx.date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-black font-mono block ${
                      tx.type === 'withdrawal' ? 'text-red-500' : 'text-emerald-600'
                    }`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}${tx.amount.toFixed(2)} USDT
                    </span>
                    <span className={`text-[9px] font-mono tracking-wider font-extrabold uppercase ${
                      tx.status === 'Completed' ? 'text-emerald-600' : 
                      tx.status === 'Pending' ? 'text-amber-500 animate-pulse' : 'text-red-500'
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

      {/* Floating Animated Toast Feedback Container */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 text-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center gap-3.5 animate-slide-up-fade-in font-bold text-xs select-none">
          <span className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-150 rounded-xl font-bold">✅ Synced</span>
          <span>{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="text-zinc-400 hover:text-zinc-800 ml-2 cursor-pointer transition-colors p-1 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {syncError && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-red-200 text-zinc-805 rounded-2xl p-4 shadow-2xl flex items-center gap-3.5 animate-slide-up-fade-in font-bold text-xs select-none">
          <span className="p-2 bg-red-50 text-red-505 border border-red-200 rounded-xl font-bold">❌ Error</span>
          <span>{syncError}</span>
          <button 
            type="button" 
            onClick={() => setSyncError(null)}
            className="text-zinc-400 hover:text-zinc-850 ml-2 cursor-pointer transition-colors p-1 text-xs"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
};
