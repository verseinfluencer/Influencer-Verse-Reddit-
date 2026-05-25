import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Task, Submission } from '../types';
import { Search, Filter, ShieldAlert, CheckCircle, Clock, ExternalLink, Calendar, PlusCircle, Sparkles, BookOpen, UserMinus, X } from 'lucide-react';
import { getTierRequirementText, getKarmaTier } from '../utils/tierHelper';

export const Marketplace: React.FC = () => {
  const { tasks, submissions, submitTaskProof, currentUser, settings, claimTask, unclaimTask } = useApp();
  const userTier = currentUser ? getKarmaTier(currentUser.karma) : null;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<'all' | 'post' | 'comment'>('all');
  const [activeDiff, setActiveDiff] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  // Submission overlay modal states
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [redditProofLink, setRedditProofLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successSubmission, setSuccessSubmission] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer tick state
  const [, setTick] = useState(0);
  const [claimLoading, setClaimLoading] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Tick every second to keep live count down responsive
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if current user has already submitted a proof for this task (limit 1 submission per task per user in demo)
  const getUserSubmissionForTask = (taskId: string) => {
    if (!currentUser) return null;
    return submissions.find(s => s.taskId === taskId && s.userId === currentUser.id);
  };

  // Get all unique subreddits from tasks for auto-filtering recommendation chips
  const uniqueSubreddits: string[] = Array.from(
    new Set<string>(
      tasks
        .map(t => {
          let sub = t.targetSubreddit || '';
          if (sub && !sub.startsWith('r/')) {
            sub = 'r/' + sub;
          }
          return sub;
        })
        .filter((sub): sub is string => !!sub)
    )
  );

  const isSubredditActive = (sub: string) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return false;
    const cleanQ = q.startsWith('r/') ? q.substring(2) : q.startsWith('/r/') ? q.substring(3) : q;
    const cleanSub = sub.startsWith('r/') ? sub.substring(2) : sub.startsWith('/r/') ? sub.substring(3) : sub;
    return cleanQ === cleanSub.toLowerCase();
  };

  const handleSubredditClick = (sub: string) => {
    if (isSubredditActive(sub)) {
      setSearchQuery('');
    } else {
      setSearchQuery(sub);
    }
  };

  // Search and Filter tasks with high-precision real-time matches and r/ prefix normalization
  const filteredTasks = tasks.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = (() => {
      if (!q) return true;
      
      const cleanQ = q.startsWith('r/') ? q.substring(2) : q.startsWith('/r/') ? q.substring(3) : q;
      
      const titleMatch = t.title.toLowerCase().includes(q);
      const descMatch = t.description.toLowerCase().includes(q);
      
      const cleanSub = t.targetSubreddit ? (t.targetSubreddit.startsWith('r/') ? t.targetSubreddit.substring(2) : t.targetSubreddit.startsWith('/r/') ? t.targetSubreddit.substring(3) : t.targetSubreddit) : '';
      const subMatch = cleanSub ? cleanSub.toLowerCase().includes(cleanQ) : false;
      
      const reqTitleMatch = t.requiredPostTitle ? t.requiredPostTitle.toLowerCase().includes(q) : false;
      const postGuideMatch = t.postGuidelines ? t.postGuidelines.toLowerCase().includes(q) : false;
      const commentGuideMatch = t.commentGuidelines ? t.commentGuidelines.toLowerCase().includes(q) : false;
      
      return titleMatch || descMatch || subMatch || reqTitleMatch || postGuideMatch || commentGuideMatch;
    })();
    
    const matchesType = activeType === 'all' ? true : t.type === activeType;
    const matchesDiff = activeDiff === 'all' ? true : t.difficulty === activeDiff;

    const matchesTier = (() => {
      if (tierFilter === 'all') return true;

      const isTaskSpecial = t.isSpecial;
      const minKarma = t.minKarmaRequired || 0;
      const isUserAdmin = currentUser?.role === 'admin';
      const isLocked = isTaskSpecial && !!minKarma && currentUser && currentUser.karma < minKarma && !isUserAdmin;

      if (tierFilter === 'eligible') {
        return !isLocked;
      }

      if (tierFilter === 'unlocked') {
        return !isTaskSpecial || !minKarma;
      }

      if (tierFilter === 'special_only') {
        return isTaskSpecial && !!minKarma;
      }

      const taskTierName = isTaskSpecial && minKarma ? getKarmaTier(minKarma).name.toLowerCase() : 'none';
      return taskTierName === tierFilter;
    })();

    return matchesSearch && matchesType && matchesDiff && matchesTier;
  });

  // Task filter visibility rules:
  // 1. If task is available -> visible to all
  // 2. If task is claimed/completed by the current user -> visible so they can submit/track
  // 3. Otherwise -> hidden from other users instantly
  const visibleTasks = filteredTasks.filter(t => {
    if (t.status === 'available') return true;
    if (t.claimed_by === currentUser?.id) return true;
    return false;
  });

  const handleClaimTask = async (taskId: string) => {
    setClaimLoading(taskId);
    setClaimError(null);
    try {
      await claimTask(taskId);
    } catch (err: any) {
      setClaimError(err.message || 'Claim failed.');
      setTimeout(() => setClaimError(null), 4000);
    } finally {
      setClaimLoading(null);
    }
  };

  const handleOpenSubmission = (task: Task) => {
    setSelectedTask(task);
    setRedditProofLink('');
    setSuccessSubmission(false);
    setErrorMessage(null);
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !currentUser) return;
    
    const trimmedLink = redditProofLink.trim();
    if (!trimmedLink) {
      setErrorMessage('Please provide your Proof Link.');
      return;
    }

    setSubmitting(true);
    try {
      await submitTaskProof(selectedTask.id, trimmedLink, trimmedLink);
      setSubmitting(false);
      setSuccessSubmission(true);
      setTimeout(() => {
        setSelectedTask(null);
        setSuccessSubmission(false);
      }, 2500);
    } catch (err: any) {
      setSubmitting(false);
      setErrorMessage(err.message || 'Proof submission failed.');
    }
  };

  const isPending = currentUser?.status === 'Pending';

  // Compute Claim Cooldown countdown for active users
  let isCooldownActive = false;
  let cooldownString = '';
  if (currentUser?.cooldown_expires_at) {
    const expires = new Date(currentUser.cooldown_expires_at).getTime();
    const now = Date.now();
    const msLeft = expires - now;
    if (msLeft > 0) {
      isCooldownActive = true;
      const totalSecs = Math.floor(msLeft / 1000);
      const m = Math.floor(totalSecs / 60);
      const s = totalSecs % 60;
      cooldownString = `${m}:${s < 10 ? '0' : ''}${s}`;
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-white select-none" id="marketplace-panel">
      
      {/* Title section */}
      <div className="space-y-1.5 pb-2">
        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block mb-1">Reddit Campaigns Desk</span>
        <h1 className="text-2xl md:text-3xl font-black">Tasks Marketplace</h1>
        <p className="text-xs text-zinc-400">Discover and execute high-paying Reddit tasks to earn verified USDT</p>
      </div>

      {/* Search & Filter Toolbars */}
      <div className="space-y-3">
        <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-4 backdrop-blur-md flex flex-col md:flex-row gap-4 items-center justify-between font-semibold">
          
          {/* Search */}
          <div className="relative w-full md:w-96 select-text">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns by subreddit, title, keywords..." 
              className="w-full text-xs text-white bg-zinc-950 border border-white/5 pl-10 pr-10 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none placeholder-zinc-500"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-white cursor-pointer"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            {/* Type trigger */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/5 text-[11px]">
              <button 
                type="button"
                onClick={() => setActiveType('all')} 
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeType === 'all' ? 'bg-purple-600 text-white font-bold' : 'text-zinc-500 hover:text-white'
                }`}
              >
                All Types
              </button>
              <button 
                type="button"
                onClick={() => setActiveType('post')} 
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeType === 'post' ? 'bg-purple-600 text-white font-bold' : 'text-zinc-500 hover:text-white'
                }`}
              >
                Posts campaigns
              </button>
              <button 
                type="button"
                onClick={() => setActiveType('comment')} 
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeType === 'comment' ? 'bg-purple-600 text-white font-bold' : 'text-zinc-500 hover:text-white'
                }`}
              >
                Comments campaigns
              </button>
            </div>

            {/* Difficulty filter */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/5 text-[11px]">
              <button 
                type="button"
                onClick={() => setActiveDiff('all')} 
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeDiff === 'all' ? 'bg-purple-600 text-white font-bold' : 'text-zinc-500 hover:text-white'
                }`}
              >
                All Difficulties
              </button>
              {['Easy', 'Medium', 'Hard'].map((diff) => (
                <button 
                  key={diff}
                  type="button"
                  onClick={() => setActiveDiff(diff as any)} 
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeDiff === diff ? 'bg-purple-600 text-white font-bold' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            {/* Tier Requirements Dropdown */}
            <div className="flex items-center gap-2 bg-zinc-950 p-1 pl-3 rounded-xl border border-white/5 text-[11px] font-semibold text-zinc-400 select-none">
              <span className="shrink-0 flex items-center gap-1.5 text-zinc-400">
                <Filter className="w-3.5 h-3.5 text-purple-400" />
                <span>Tier Requirements:</span>
              </span>
              <select
                id="tier-requirement-filter"
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-transparent border-0 text-white focus:outline-none focus:ring-0 cursor-pointer font-black text-xs p-1 px-2 pr-8"
              >
                <option value="all" className="bg-zinc-900 text-white">👑 All Tiers</option>
                <option value="eligible" className="bg-zinc-900 text-purple-400 font-extrabold">
                  ✅ Eligible For Me {userTier ? `(${userTier.emoji} ${userTier.name})` : ''}
                </option>
                <option value="unlocked" className="bg-zinc-900 text-white">🔓 No Tier Required</option>
                <option value="special_only" className="bg-zinc-900 text-white">⭐ Special Only</option>
                <option value="bronze" className="bg-zinc-900 text-white">🥉 Bronze Required</option>
                <option value="silver" className="bg-zinc-900 text-white">🥈 Silver Required</option>
                <option value="gold" className="bg-zinc-900 text-white">⭐ Gold Required</option>
                <option value="diamond" className="bg-zinc-900 text-white">💎 Diamond Required</option>
                <option value="platinum" className="bg-zinc-900 text-white">🔥 Platinum Required</option>
                <option value="elite" className="bg-zinc-900 text-white">👑 Elite Required</option>
                <option value="legend" className="bg-zinc-900 text-white">🚀 Legend Required</option>
              </select>
            </div>

          </div>

        </div>

        {/* Dynamic real-time quick subreddit suggestions */}
        {uniqueSubreddits.length > 0 && (
          <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 select-none mr-2">
              ⚡ Quick Subreddit Filters:
            </span>
            {uniqueSubreddits.map(sub => {
              const active = isSubredditActive(sub);
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => handleSubredditClick(sub)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer border ${
                    active 
                      ? 'bg-purple-600/20 border-purple-500 text-purple-400 font-extrabold shadow-sm shadow-purple-500/10' 
                      : 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
            
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[10px] text-purple-400 hover:text-purple-300 ml-auto font-bold underline px-1 cursor-pointer"
              >
                Reset Search
              </button>
            )}
          </div>
        )}

        {/* Search & Matches statistics */}
        {searchQuery.trim() && (
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 pl-1 animate-fade-in">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
            <span>
              Real-time filtered: found <strong className="text-purple-400 font-extrabold">{visibleTasks.length}</strong> campaigns matching <strong className="text-zinc-200">"{searchQuery}"</strong>
            </span>
          </div>
        )}
      </div>

      {/* Block pending users notification if necessary */}
      {isPending && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/25 rounded-2xl flex gap-3.5 text-yellow-500 text-xs font-semibold leading-relaxed">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div>
            <strong className="block text-yellow-400 mb-0.5">Tasks Restricted During Manual Review</strong>
            Your profile is currently undergo manual background reviews. Review limits allow viewing existing market tasks, but submission actions are disabled until your Reddit Username is authenticated!
          </div>
        </div>
      )}

      {/* Cooldown notification banner */}
      {isCooldownActive && (
        <div className="p-4 bg-purple-500/15 border border-purple-500/30 rounded-2xl flex items-center justify-between text-purple-400 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 animate-spin text-purple-500" />
            <span>You are currently on claiming cooldown between campaigns.</span>
          </div>
          <span className="font-mono bg-purple-500/20 px-3 py-1 rounded-xl text-white font-black animate-pulse">
            ⏳ Claim available in {cooldownString || '00:00'}
          </span>
        </div>
      )}

      {/* Claim operations general alert */}
      {claimError && (
        <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl flex gap-3 text-red-500 text-xs font-bold leading-relaxed">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <div>
            <span className="block text-red-400 mb-0.5">Claim Interrupted</span>
            {claimError}
          </div>
        </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleTasks.length === 0 ? (
          <div className="col-span-full text-center py-20 text-zinc-500 text-xs font-semibold">
            No active campaigns match your currently selected filters. Refine criteria queries.
          </div>
        ) : (
          visibleTasks.map((task) => {
            const userSub = getUserSubmissionForTask(task.id);
            const slotsLeft = Math.max(0, task.maxSubmissions - task.completedSubmissionsCount);

            // Special lock and claim variables
            const isTaskSpecial = task.isSpecial;
            const isUserAdmin = currentUser?.role === 'admin';
            const isLocked = isTaskSpecial && task.minKarmaRequired && currentUser && currentUser.karma < task.minKarmaRequired && !isUserAdmin;
            const isClaimedByMe = task.status === 'claimed' && task.claimed_by === currentUser?.id;

            // Compute countdown remaining seconds
            let secondsRemaining = 0;
            if (isClaimedByMe && task.claim_expires_at) {
              const expires = new Date(task.claim_expires_at).getTime();
              const now = Date.now();
              secondsRemaining = Math.max(0, Math.floor((expires - now) / 1000));
            }

            const formatMinsSecs = (totalSecs: number) => {
              const m = Math.floor(totalSecs / 60);
              const s = totalSecs % 60;
              return `${m}:${s < 10 ? '0' : ''}${s}`;
            };

            return (
              <div 
                key={task.id} 
                className="bg-zinc-900/30 border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-purple-500/35 transition-all duration-300 group shadow-md relative overflow-hidden"
              >
                {/* Visual lock overlay for low karma influencers */}
                {isLocked && (
                  <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-[3px] rounded-2xl flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-auto">
                    <span className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full mb-3">
                      <ShieldAlert className="w-5 h-5" />
                    </span>
                    <h4 className="font-extrabold text-sm text-white">🔒 Locked Special Campaign</h4>
                    <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px] leading-normal font-semibold">
                      This premium special task is restricted. Requires <strong className="text-purple-400">{getTierRequirementText(task.minKarmaRequired)}</strong>. Check your dashboard status card!
                    </p>
                    <button className="mt-4 px-4 py-1.5 bg-zinc-800 text-zinc-500 text-[10px] font-bold rounded-lg border border-zinc-700 cursor-not-allowed uppercase">
                      Locked 🔒
                    </button>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        task.type === 'post' 
                          ? 'bg-purple-600/10 border border-purple-500/20 text-purple-400 font-bold' 
                          : 'bg-zinc-950 border border-white/5 text-zinc-400 font-semibold'
                      }`}>
                        Reddit {task.type}
                      </span>
                      {isTaskSpecial && (
                        <span className="bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none flex items-center gap-0.5 tracking-wider animate-pulse">
                          ⭐ SPECIAL
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 font-bold">🎯 {task.difficulty}</span>
                  </div>

                  <h3 className="text-base font-extrabold text-white mb-2 leading-tight group-hover:text-purple-400 transition-all select-text">
                    {task.title}
                  </h3>
                  
                  <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3 mb-4 select-text">
                    {task.description}
                  </p>

                  <div className="space-y-1.5 mb-6 text-[11px] font-semibold text-zinc-500 select-text">
                    {task.type === 'post' && task.targetSubreddit && (
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span>Target subreddit:</span>
                        <span className="text-purple-400 font-bold">{task.targetSubreddit}</span>
                      </div>
                    )}
                    {task.type === 'comment' && (
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span>Platform comment:</span>
                        <span className="text-zinc-400 font-bold">See guidlines</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>Deadline Date:</span>
                      <span className="text-zinc-400">{task.deadline}</span>
                    </div>

                    {isTaskSpecial && !isLocked && (
                      <div className="mt-2.5 text-[9px] text-emerald-400 font-bold tracking-wide flex items-center gap-1 bg-emerald-500/5 p-1.5 rounded-lg border border-emerald-500/10 select-none">
                        <CheckCircle className="w-3.5 h-3.5" /> ⭐ You're eligible for this special task
                      </div>
                    )}

                    {isClaimedByMe && (
                      <div className="mt-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] py-2 px-3 rounded-xl flex items-center justify-between font-mono animate-pulse">
                        <span>⏰ Time Remaining to Submit:</span>
                        <span className="font-extrabold text-white font-mono bg-purple-600 px-2 py-0.5 rounded">
                          {formatMinsSecs(secondsRemaining)} mins
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 flex justify-between items-center bg-transparent mt-auto select-none">
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">Earning payout</span>
                    <span className="text-base font-black text-white font-mono">
                      ${(task.reward * settings.globalMultiplier).toFixed(2)} USDT
                    </span>
                    {task.isSpecial && (
                      <span className="text-[8px] text-amber-400 block tracking-wider uppercase font-bold">🔒 Requires {getTierRequirementText(task.minKarmaRequired)}</span>
                    )}
                  </div>

                  {userSub ? (
                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${
                      userSub.status === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                      userSub.status === 'Pending' ? 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400 animate-pulse' :
                      'bg-red-500/10 border-red-500/25 text-red-500'
                    }`}>
                      {userSub.status === 'Approved' && <CheckCircle className="w-3.5 h-3.5" />}
                      {userSub.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                      {userSub.status === 'Rejected' && <ShieldAlert className="w-3.5 h-3.5" />}
                      {userSub.status === 'Pending' ? 'Proof Reviewing' : `Submission ${userSub.status}`}
                    </div>
                  ) : slotsLeft === 0 ? (
                    <div className="px-3 py-1.5 bg-zinc-800 text-zinc-500 text-[10px] font-bold rounded-lg border border-zinc-700/50">
                      Slots limit Taken
                    </div>
                  ) : isClaimedByMe ? (
                    <button 
                      disabled={isPending}
                      onClick={() => handleOpenSubmission(task)}
                      className={`px-4 py-2 border text-xs font-bold rounded-xl scroll-smooth transition-all cursor-pointer ${
                        isPending 
                          ? 'border-zinc-850 bg-zinc-950 text-zinc-650 cursor-not-allowed' 
                          : 'border-yellow-500 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500 hover:text-black font-extrabold'
                      }`}
                    >
                      Submit Proof
                    </button>
                  ) : isCooldownActive && !isUserAdmin ? (
                    <button 
                      disabled
                      className="px-4 py-2 bg-zinc-950 border border-zinc-850 text-zinc-500 text-xs font-bold rounded-xl cursor-not-allowed leading-tight"
                    >
                      Cooldown ⏳ {cooldownString || '00:00'}
                    </button>
                  ) : (
                    <button 
                      disabled={isPending || claimLoading === task.id}
                      onClick={() => handleClaimTask(task.id)}
                      className={`px-4 py-2 border text-xs font-bold rounded-xl scroll-smooth transition-all cursor-pointer ${
                        isPending 
                          ? 'border-zinc-850 bg-zinc-950 text-zinc-650 cursor-not-allowed' 
                          : claimLoading === task.id ? 'border-purple-500 bg-purple-500/10 text-white animate-pulse' : 'border-purple-500 bg-purple-600/15 text-purple-400 hover:bg-purple-600 hover:text-white'
                      }`}
                    >
                      {claimLoading === task.id ? 'Claiming...' : 'Claim Task'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal submission proof form */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-900 border border-white/10 p-6 rounded-3xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            {/* Closes */}
            <button 
              onClick={() => setSelectedTask(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer px-2 py-1 bg-zinc-950 rounded-lg text-xs hover:bg-zinc-800 font-bold"
            >
              Cancel
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">Reserve Campaign Slot</span>
              <h2 className="text-lg font-extrabold text-white leading-tight">{selectedTask.title}</h2>
              <span className="text-xs bg-zinc-950 border border-zinc-850 px-2 py-0.5 rounded text-zinc-500 font-bold font-mono">
                payout: ${(selectedTask.reward * settings.globalMultiplier).toFixed(2)} USDT
              </span>
            </div>

            {successSubmission ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-white">Proof Submitted Safely!</h3>
                <p className="text-zinc-500 text-xs">Administrators will audit your Reddit activity inside our Control Panel soon!</p>
              </div>
            ) : (
              <form onSubmit={handleProofSubmit} className="space-y-4 text-xs font-semibold text-zinc-300">
                {errorMessage && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-2 mb-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Left/Right Guideline breakdown */}
                <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4 space-y-2.5">
                  <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-bold">Campaign Guidelines Constraints</span>
                  
                  {selectedTask.type === 'post' ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Target community subreddit:</span>
                        <span className="text-white font-extrabold">{selectedTask.targetSubreddit}</span>
                      </div>
                      <div className="flex justify-between gap-4 font-normal">
                        <span className="shrink-0">Title constraint:</span>
                        <span className="text-white font-mono font-bold text-right text-[11px] select-text">"{selectedTask.requiredPostTitle}"</span>
                      </div>
                      <div className="text-[11px] font-normal text-zinc-400 border-t border-white/5 pt-2 leading-relaxed select-text">
                        <strong>Required keywords:</strong> {selectedTask.postGuidelines || 'Post naturally regarding Layer 2 capabilities.'}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between font-normal gap-4">
                        <span className="shrink-0">Comment target URL:</span>
                        <a 
                          href={selectedTask.postUrlToCommentOn} 
                          target="_blank"  
                          rel="noreferrer" 
                          className="text-blue-400 font-bold hover:underline truncate max-w-[220px]"
                        >
                          Open Campaign Link <ExternalLink className="w-3 h-3 inline pb-0.5" />
                        </a>
                      </div>
                      <div className="text-[11px] font-normal text-zinc-400 border-t border-white/5 pt-2 leading-relaxed select-text">
                        <strong>Required guidelines:</strong> {selectedTask.commentGuidelines || 'Verify details naturally.'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Proof fields */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">Reddit Proof Link</label>
                  <input 
                    type="text" 
                    value={redditProofLink}
                    onChange={(e) => setRedditProofLink(e.target.value)}
                    placeholder="https://reddit.com/r/..." 
                    className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none placeholder-zinc-600"
                  />
                  <p className="text-[10px] text-zinc-500 font-semibold mt-1">Paste the direct link to your Reddit post or comment</p>
                </div>

                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-xs font-black text-white rounded-xl shadow-lg hover:opacity-95 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Transmitting proof payloads...' : 'Submit Proof'}
                </button>
              </form>
            )}
            
          </div>
        </div>
      )}

    </div>
  );
};
