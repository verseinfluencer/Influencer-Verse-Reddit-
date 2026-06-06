import React from 'react';
import { useApp } from '../context/AppContext';
import { EarningsChart } from '../components/EarningsChart';
import { Award, Gift, TrendingUp, CheckCircle, Wallet, ArrowUpRight, Zap, RefreshCw, UserCheck, Star, ShieldAlert, CheckCircle2, ShieldCheck, Trophy, Sparkles, Flame, XCircle } from 'lucide-react';
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

  // Live countdown timer ticker (Update every second)
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    { title: "First Task Complete", desc: "Submitted task approved", active: completedTaskCount >= 1, icon: Star, color: "text-amber-500 bg-amber-50 border-amber-200" },
    { title: "Campaign Veteran", desc: "Approved in 5 tasks", active: completedTaskCount >= 5, icon: ShieldCheck, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
    { title: "Earning Captain", desc: "Made over $50.00 USDT", active: currentUser.totalEarned >= 50.00, icon: Sparkles, color: "text-purple-600 bg-purple-50 border-purple-200" },
    { title: "Silver Veteran", desc: "Reached Silver Tier (1000+ Karma)", active: currentUser.karma >= 1000, icon: Trophy, color: "text-slate-500 bg-slate-100 border-slate-250" },
    { title: "Streak Master", desc: "Claimed daily streak 3+", active: (currentUser.streak || 0) >= 3, icon: Flame, color: "text-orange-500 bg-orange-50 border-orange-200" }
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

  // Compute Claim Cooldown for dashboard
  let isPostCooldownActive = false;
  let postCooldownString = '00:00:00';

  let isCommentCooldownActive = false;
  let commentCooldownString = '00:00:00';

  const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val.toDate === 'function') {
      return val.toDate();
    }
    if (val.seconds) {
      return new Date(val.seconds * 1000);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const isUserAdmin = currentUser.role === 'admin' || currentUser.role === 'moderator' || currentUser.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com';
  if (!isUserAdmin) {
    // 1. Post Cooldown
    const lastPostClaimed = parseDate(currentUser.lastPostClaimedAt);
    const postExpiresAt = parseDate(currentUser.postCooldownExpiresAt);

    let postExpiresTime = 0;
    if (postExpiresAt) {
      postExpiresTime = postExpiresAt.getTime();
    } else if (lastPostClaimed) {
      postExpiresTime = lastPostClaimed.getTime() + 3 * 60 * 60 * 1000;
    }

    if (postExpiresTime > 0) {
      const msLeft = postExpiresTime - Date.now();
      if (msLeft > 0) {
        isPostCooldownActive = true;
        const totalSecs = Math.floor(msLeft / 1000);
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        
        const pad0 = (num: number) => num < 10 ? '0' + num : num;
        postCooldownString = `${pad0(h)}:${pad0(m)}:${pad0(s)}`;
      }
    }

    // 2. Comment Cooldown
    const lastCommentClaimed = parseDate(currentUser.lastCommentClaimedAt);
    const commentExpiresAt = parseDate(currentUser.commentCooldownExpiresAt);

    let commentExpiresTime = 0;
    if (commentExpiresAt) {
      commentExpiresTime = commentExpiresAt.getTime();
    } else if (lastCommentClaimed) {
      commentExpiresTime = lastCommentClaimed.getTime() + 3 * 60 * 60 * 1000;
    }

    if (commentExpiresTime > 0) {
      const msLeft = commentExpiresTime - Date.now();
      if (msLeft > 0) {
        isCommentCooldownActive = true;
        const totalSecs = Math.floor(msLeft / 1000);
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        
        const pad0 = (num: number) => num < 10 ? '0' + num : num;
        commentCooldownString = `${pad0(h)}:${pad0(m)}:${pad0(s)}`;
      }
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-zinc-700 select-none" id="user-dashboard-container">
      
      {/* Upper Welcome Header */}
      <div className="pb-4 border-b border-gray-200">
        <div className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-2xl md:text-3xl font-bold font-display text-gray-900 tracking-tight">Creator Dashboard</span>
                <span className="px-3 py-1 bg-purple-50 border border-purple-100 text-purple-700 font-bold rounded-full text-[11px] uppercase tracking-wider shadow-sm">
                  {currentTier.name} Tier
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Linked Reddit Identity: <strong className="text-purple-600 tracking-wide font-mono">{currentUser.redditUsername}</strong>
              </p>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              Track your campaigns, earnings, and submission progress.
            </p>
          </div>
        </div>
      </div>

      {/* Cooldown notification banners */}
      {isPostCooldownActive && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-purple-700 text-xs font-semibold gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="p-1 px-1.5 bg-purple-100 rounded-lg text-purple-600 font-bold font-mono text-[10px]">POST COOLDOWN</span>
            <span>You are currently on high precision Reddit Post claiming cooldown.</span>
          </div>
          <span className="font-mono bg-purple-100 px-3 py-1 rounded-xl text-purple-700 font-black animate-pulse flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Next Post Claim Available In: <strong className="font-mono font-black ml-1 text-purple-900">{postCooldownString}</strong>
          </span>
        </div>
      )}

      {isCommentCooldownActive && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-purple-700 text-xs font-semibold gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="p-1 px-1.5 bg-purple-100 rounded-lg text-purple-600 font-bold font-mono text-[10px]">COMMENT COOLDOWN</span>
            <span>You are currently on high precision Reddit Comment claiming cooldown.</span>
          </div>
          <span className="font-mono bg-purple-100 px-3 py-1 rounded-xl text-purple-700 font-black animate-pulse flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Next Comment Claim Available In: <strong className="font-mono font-black ml-1 text-purple-900">{commentCooldownString}</strong>
          </span>
        </div>
      )}

      {/* Stats Cards Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Total Earnings */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Total Earnings</span>
            <div className="p-2 bg-purple-50 text-purple-600 border border-purple-100 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold text-gray-900 font-mono">${currentUser.totalEarned.toFixed(2)}</h3>
            <p className="text-xs text-gray-500">Lifetime rewards from approved Reddit tasks</p>
          </div>
        </div>

        {/* Available Balance */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Available Balance</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold text-gray-900 font-mono">${currentUser.balance.toFixed(2)}</h3>
            <p className="text-xs text-gray-500">Ready to cashout instantly to BSC BEP20 address</p>
          </div>
        </div>

        {/* Tasks Completed */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 shadow-sm">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl"></div>
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Active Submits</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-2xl font-bold text-gray-900 font-mono">{submissions.filter(s => s.userId === currentUser.id).length}</h3>
            <p className="text-xs text-gray-500">{completedTaskCount} tasks approved &bull; {submissions.filter(s => s.userId === currentUser.id && s.status === 'Pending').length} in audit</p>
          </div>
        </div>

      </div>

      {/* Karma Tier & Progress Panel */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-all duration-300">
        <div className="space-y-3 w-full md:w-3/5">
          <div className="flex justify-between items-center text-xs flex-wrap gap-2">
            <span className="text-gray-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Reddit Karma Tier Status
            </span>
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-gray-900 font-bold font-mono">{(currentUser.redditKarma ?? currentUser.karma)?.toLocaleString() || 0} Reddit Karma</span>
                {((currentUser.linkKarma !== undefined && currentUser.commentKarma !== undefined) || (currentUser.postKarma !== undefined && currentUser.commentKarma !== undefined)) && (
                  <span className="text-[10px] text-gray-400 font-mono block">
                    (Post: {(currentUser.postKarma ?? currentUser.linkKarma ?? 0).toLocaleString()} | Comment: {(currentUser.commentKarma ?? 0).toLocaleString()})
                  </span>
                )}
                {(currentUser.lastRedditSync || currentUser.karmaLastSynced) && (
                  <span className="text-[9px] text-gray-400 font-mono block mt-0.5">
                    Last Synced: {formatSyncedDate(currentUser.lastRedditSync || currentUser.karmaLastSynced || undefined)}
                  </span>
                )}
              </div>
              {isProxyAvailable === false ? (
                <button
                  id="sync-reddit-karma-btn"
                  disabled={true}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border bg-amber-50 text-amber-700 border-amber-200 cursor-not-allowed font-sans"
                  title="Live Reddit sync is currently unavailable"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Manual verification active. Sync offline.</span>
                </button>
              ) : (
                <button
                  id="sync-reddit-karma-btn"
                  disabled={isSyncing || !currentUser.redditUsername}
                  onClick={handleSyncKarma}
                  className={`flex items-center justify-center gap-2 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all duration-200 font-sans ${
                    isSyncing 
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : !currentUser.redditUsername
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                        : 'bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 text-emerald-600 border-emerald-200 active:scale-95 cursor-pointer'
                  }`}
                  title={currentUser.redditUsername ? "Sync Reddit Karma Now" : "Please add Reddit username in profile settings"}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900">{currentTier.name} Tier</span>
            <span className="text-xs text-gray-500 font-bold uppercase">
              ({currentTier.minKarma.toLocaleString()}{currentTier.maxKarma === Infinity ? '+' : ` - ${currentTier.maxKarma.toLocaleString()}`} Karma)
            </span>
          </div>

          {(!currentUser.redditUsername || !currentUser.redditUsername.trim()) ? (
            <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg uppercase tracking-wider inline-flex items-center gap-1.5 w-max">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Please add your Reddit username in profile settings.</span>
            </div>
          ) : null}
          
          {/* Progress bar to next tier */}
          <div className="space-y-1">
            <div className="w-full bg-gray-100 border border-gray-200 rounded-full h-3 relative overflow-hidden">
              <div 
                style={{ width: `${karmaBar.percent}%` }}
                className="bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              ></div>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 font-mono">
              <span className="font-semibold">{karmaBar.text}</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <span className="text-xs text-gray-500 font-medium leading-tight">
              Reddit Karma and Tier Level are managed manually by platform moderators. Your tier unlocks higher paying Special Tasks.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 md:border-l md:border-gray-200 md:pl-8 py-1.5 shrink-0 select-none">
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Global Boost</span>
            <span className="text-base font-bold text-gray-900 font-mono block">
              {settings.globalMultiplier.toFixed(2)}x
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Tier Boost</span>
            <span className="text-base font-bold text-purple-650 font-mono block">
              {(currentTier.multiplier || 1.00).toFixed(2)}x
            </span>
          </div>
          <div>
            <span className="text-[10px] text-pink-600 font-bold uppercase tracking-wider block">Total Multiplier</span>
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-amber-550 font-display font-mono block">
              {(settings.globalMultiplier * (currentTier.multiplier || 1.00)).toFixed(2)}x
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Badge level</span>
            <span className="text-xs px-2.5 py-1 bg-purple-50 border border-purple-100 rounded-lg text-purple-700 font-bold font-mono inline-block mt-0.5">
              {currentTier.name}
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
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-purple-600 block mb-1">Creator Milestones</span>
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-display">Earned Accomplishment Badges</h3>
            
            <div className="space-y-3">
              {achievements.map((a, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    a.active 
                      ? 'bg-purple-50/50 border-purple-100' 
                      : 'bg-gray-50 border-gray-100 opacity-40'
                  }`}
                >
                  <div className={`p-2 rounded-lg border ${a.color}`}>
                    <a.icon className="w-5 h-5 shrink-0" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block leading-tight">{a.title}</span>
                    <span className="text-xs text-gray-500 font-medium">{a.desc}</span>
                  </div>
                  {a.active && (
                    <span className="ml-auto text-[9px] font-bold text-purple-600 uppercase tracking-widest font-mono bg-purple-100 px-1.5 py-0.5 rounded">Unlocked</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-6 flex justify-between items-center text-xs">
            <span className="text-gray-600 font-bold font-sans">Completed Milestones:</span>
            <span className="font-extrabold text-gray-800 font-mono bg-gray-100 px-2.5 py-1 rounded-lg">{achievements.filter(a => a.active).length} / 5</span>
          </div>
        </div>

      </div>

      {/* Quick Action links and Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Quick Earning links */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1">Quick Actions</span>
          <h3 className="text-lg font-bold text-gray-900 mb-4 font-display">Platform Shortcuts</h3>

          <div className="space-y-2.5">
            <button 
              onClick={() => onNavigate('marketplace')}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-purple-300 hover:bg-white flex justify-between items-center text-left transition-all group cursor-pointer hover:shadow-sm"
            >
              <div>
                <span className="text-xs font-bold text-gray-900 block">Browse Active Reddit Tasks</span>
                <span className="text-xs text-gray-500 font-medium font-sans">Comments starting at $0.80 USDT</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </button>

            <button 
              onClick={() => onNavigate('wallet')}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-purple-300 hover:bg-white flex justify-between items-center text-left transition-all group cursor-pointer hover:shadow-sm"
            >
              <div>
                <span className="text-xs font-bold text-gray-900 block">Wallet Cashout Requests</span>
                <span className="text-xs text-gray-500 font-medium font-sans">Submit USDT BEP20 withdrawal address</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </button>

            <button 
              onClick={() => onNavigate('tickets')}
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-purple-300 hover:bg-white flex justify-between items-center text-left transition-all group cursor-pointer hover:shadow-sm"
            >
              <div>
                <span className="text-xs font-bold text-gray-900 block">Support & Help Desk</span>
                <span className="text-xs text-gray-500 font-medium font-sans">Contact admin or view support ticket statuses</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Recent Transactions / activity feed */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 block mb-1">Submissions Ledger</span>
          <h3 className="text-lg font-bold text-gray-900 mb-4 font-display">Recent Activity Feed</h3>

          <div className="space-y-3">
            {userTx.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs font-medium font-sans">
                No transactions recorded yet. Complete some active Reddit campaigns to populate stats!
              </div>
            ) : (
              userTx.map((tx) => (
                <div key={tx.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex justify-between items-center hover:bg-white hover:border-purple-200 hover:shadow-sm transition-all duration-200">
                  <div>
                    <span className="text-xs font-bold text-gray-900 block leading-tight">{tx.description}</span>
                    <span className="text-[10px] text-gray-500 font-bold font-mono">{new Date(tx.date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold font-mono block ${
                      tx.type === 'withdrawal' ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {tx.type === 'withdrawal' ? '-' : '+'}${tx.amount.toFixed(2)} USDT
                    </span>
                    <span className={`text-[10px] font-mono tracking-wider font-extrabold uppercase ${
                      tx.status === 'Completed' ? 'text-emerald-600' : 
                      tx.status === 'Pending' ? 'text-amber-500' : 'text-red-500'
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
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-gray-200 text-gray-800 rounded-xl p-4 shadow-xl flex items-center gap-3 animate-slide-up-fade-in font-bold text-xs select-none">
          <span className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Synced
          </span>
          <span>{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-gray-700 ml-2 cursor-pointer transition-colors p-1"
          >
            ✕
          </button>
        </div>
      )}

      {syncError && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-red-200 text-gray-800 rounded-xl p-4 shadow-xl flex items-center gap-3 animate-slide-up-fade-in font-bold text-xs select-none">
          <span className="p-2 bg-red-50 text-red-600 border border-red-150 rounded-lg font-bold flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-red-650" /> Error
          </span>
          <span>{syncError}</span>
          <button 
            type="button" 
            onClick={() => setSyncError(null)}
            className="text-gray-400 hover:text-gray-700 ml-2 cursor-pointer transition-colors p-1"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
};
