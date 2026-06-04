import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { renderRedditMarkdown } from '../utils/markdownHelper';
import { Task, Submission } from '../types';
import { Search, Filter, ShieldAlert, CheckCircle, Clock, ExternalLink, Calendar, PlusCircle, Sparkles, BookOpen, UserMinus, X, Copy } from 'lucide-react';
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

  // Copy success toast message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    const id = setTimeout(() => {
      setToastMessage(current => current === msg ? null : current);
    }, 2500);
    return id;
  };

  const handleCopyText = async (text: string, successMessage: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        triggerToast(successMessage);
        return;
      }
    } catch (err) {
      console.warn('navigator.clipboard failed, attempting fallback:', err);
    }

    try {
      // Fallback for iframe and older browser environments (including mobile WebView)
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.fontSize = '12pt'; // Prevent auto zoom on iOS
      textArea.style.top = '0';
      textArea.style.left = '-9999px';
      textArea.style.position = 'fixed';
      textArea.setAttribute('readonly', ''); // Prevent keyboard popping up on mobile devices
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, 99999); // Mobile Safari support
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          triggerToast(successMessage);
        } else {
          console.error('Fallback copy was unsuccessful');
        }
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

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
    
    const normalizedType = t.type ? (t.type.toLowerCase().includes('comment') ? 'comment' : 'post') : 'post';
    const matchesType = activeType === 'all' ? true : normalizedType === activeType;
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
      const msg = (err?.message || String(err)).toLowerCase();
      let userFriendlyError = err.message || 'Unable to claim task.';
      
      if (msg.includes('permission') || msg.includes('insufficient') || msg.includes('denied')) {
        userFriendlyError = "You do not currently have permission to claim this task.";
      } else if (msg.includes('already claimed') || msg.includes('claimed_by')) {
        userFriendlyError = "Task already claimed.";
      }
      
      setClaimError(userFriendlyError);
      setTimeout(() => setClaimError(null), 6000);
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

  // Compute Claim Cooldown countdown for active users (3 Hours)
  let isPostCooldownActive = false;
  let postCooldownString = '00:00:00';
  let postCooldownStringDisplay = '0m';

  let isCommentCooldownActive = false;
  let commentCooldownString = '00:00:00';
  let commentCooldownStringDisplay = '0m';

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

  const isUserAdmin = currentUser?.role === 'admin' || currentUser?.role === 'moderator' || currentUser?.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com';

  if (currentUser && !isUserAdmin) {
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

        const displayMins = m === 60 ? 59 : m;
        if (h > 0) {
          postCooldownStringDisplay = `${h}h ${displayMins}m`;
        } else {
          postCooldownStringDisplay = `${displayMins}m`;
        }
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

        const displayMins = m === 60 ? 59 : m;
        if (h > 0) {
          commentCooldownStringDisplay = `${h}h ${displayMins}m`;
        } else {
          commentCooldownStringDisplay = `${displayMins}m`;
        }
      }
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-zinc-850 select-none pb-12" id="marketplace-panel">
      
      {/* Title section */}
      <div className="space-y-1.5 pb-3 border-b border-slate-200/60">
        <span className="text-[10px] text-purple-600 font-extrabold uppercase tracking-widest block mb-1">Reddit Campaigns Desk</span>
        <h1 className="text-2xl md:text-3xl font-black text-zinc-900 font-display">Campaign Marketplace</h1>
        <p className="text-xs text-zinc-500">Discover verified Reddit campaigns and submit proof to earn rewards.</p>
      </div>

      {/* Search & Filter Toolbars */}
      <div className="space-y-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between font-semibold">
          
          {/* Search */}
          <div className="relative w-full md:w-96 select-text">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns by subreddit, title, keywords..." 
              className="w-full text-xs text-zinc-800 bg-slate-50 border border-slate-200 pl-10 pr-10 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none placeholder-zinc-450"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-700 cursor-pointer"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            {/* Type trigger */}
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 text-[11px]">
              <button 
                type="button"
                onClick={() => setActiveType('all')} 
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeType === 'all' ? 'bg-purple-600 text-white font-bold' : 'text-zinc-500 hover:text-purple-600'
                }`}
              >
                All Types
              </button>
              <button 
                type="button"
                onClick={() => setActiveType('post')} 
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeType === 'post' ? 'bg-purple-600 text-white font-bold' : 'text-zinc-500 hover:text-purple-600'
                }`}
              >
                Posts campaigns
              </button>
              <button 
                type="button"
                onClick={() => setActiveType('comment')} 
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeType === 'comment' ? 'bg-purple-600 text-white font-bold' : 'text-zinc-500 hover:text-purple-600'
                }`}
              >
                Comments campaigns
              </button>
            </div>

            {/* Difficulty filter */}
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 text-[11px]">
              <button 
                type="button"
                onClick={() => setActiveDiff('all')} 
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeDiff === 'all' ? 'bg-purple-600 text-white font-bold' : 'text-zinc-505 hover:text-purple-605'
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
                    activeDiff === diff ? 'bg-purple-600 text-white font-bold' : 'text-zinc-505 hover:text-purple-605'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            {/* Tier Requirements Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 p-1 pl-3 rounded-xl border border-slate-200 text-[11px] font-semibold text-zinc-500 select-none">
              <span className="shrink-0 flex items-center gap-1.5 text-zinc-500">
                <Filter className="w-3.5 h-3.5 text-purple-600" />
                <span>Tier Requirements:</span>
              </span>
              <select
                id="tier-requirement-filter"
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-transparent border-0 text-zinc-800 focus:outline-none focus:ring-0 cursor-pointer font-extrabold text-xs p-1 px-2 pr-8"
              >
                <option value="all" className="bg-white text-zinc-805">👑 All Tiers</option>
                <option value="eligible" className="bg-white text-purple-700 font-extrabold">
                  ✅ Eligible For Me {userTier ? `(${userTier.emoji} ${userTier.name})` : ''}
                </option>
                <option value="unlocked" className="bg-white text-zinc-805">🔓 No Tier Required</option>
                <option value="special_only" className="bg-white text-zinc-850">⭐ Special Only</option>
                <option value="bronze" className="bg-white text-zinc-805">🥉 Bronze Required</option>
                <option value="silver" className="bg-white text-zinc-805">🥈 Silver Required</option>
                <option value="gold" className="bg-white text-zinc-805">⭐ Gold Required</option>
                <option value="diamond" className="bg-white text-zinc-805">💎 Diamond Required</option>
                <option value="platinum" className="bg-white text-zinc-805">🔥 Platinum Required</option>
                <option value="elite" className="bg-white text-zinc-805">👑 Elite Required</option>
                <option value="legend" className="bg-white text-zinc-805">🚀 Legend Required</option>
              </select>
            </div>

          </div>

        </div>

        {/* Dynamic real-time quick subreddit suggestions */}
        {uniqueSubreddits.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-2 text-xs shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 select-none mr-2">
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
                      ? 'bg-purple-50 border-purple-355 text-purple-700 font-bold shadow-sm' 
                      : 'bg-white border-slate-200 text-zinc-500 hover:text-purple-650 hover:border-purple-300'
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
                className="text-[10px] text-purple-600 hover:text-purple-700 ml-auto font-bold underline px-1 cursor-pointer"
              >
                Reset Search
              </button>
            )}
          </div>
        )}

        {/* Search & Matches statistics */}
        {searchQuery.trim() && (
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-550 pl-1 animate-fade-in">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" />
            <span>
              Real-time filtered: found <strong className="text-purple-600 font-extrabold">{visibleTasks.length}</strong> campaigns matching <strong className="text-zinc-800">"{searchQuery}"</strong>
            </span>
          </div>
        )}
      </div>

      {/* Block pending users notification if necessary */}
      {isPending && (
        <div className="p-4 bg-amber-50 border border-amber-205 rounded-2xl flex gap-3.5 text-amber-700 text-xs font-semibold leading-relaxed shadow-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500" />
          <div>
            <strong className="block text-amber-800 mb-0.5">Tasks Restricted During Manual Review</strong>
            Your profile is currently undergo manual background reviews. Review limits allow viewing existing market tasks, but submission actions are disabled until your Reddit Username is authenticated!
          </div>
        </div>
      )}

      {/* Cooldown notification banners */}
      {isPostCooldownActive && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between text-purple-700 text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 animate-spin text-purple-600" />
            <span>You are currently on high precision Reddit Post claiming cooldown.</span>
          </div>
          <span className="font-mono bg-purple-100 px-3 py-1 rounded-xl text-purple-700 font-black animate-pulse">
            ⏳ Next Post Claim Available In: <strong className="font-mono font-black ml-1 text-purple-900">{postCooldownString || '00:00:00'}</strong>
          </span>
        </div>
      )}

      {isCommentCooldownActive && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between text-purple-700 text-xs font-semibold shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 animate-spin text-purple-600" />
            <span>You are currently on high precision Reddit Comment claiming cooldown.</span>
          </div>
          <span className="font-mono bg-purple-100 px-3 py-1 rounded-xl text-purple-700 font-black animate-pulse">
            ⏳ Next Comment Claim Available In: <strong className="font-mono font-black ml-1 text-purple-900">{commentCooldownString || '00:00:00'}</strong>
          </span>
        </div>
      )}

      {/* Claim operations general alert */}
      {claimError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex gap-3 text-red-700 text-xs font-bold leading-relaxed shadow-sm">
          <ShieldAlert className="w-5 h-5 shrink-0 text-red-505" />
          <div>
            <span className="block text-red-800 mb-0.5 font-display font-black">Claim Interrupted</span>
            {claimError}
          </div>
        </div>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleTasks.length === 0 ? (
          <div className="col-span-full text-center py-20 text-zinc-405 text-xs font-semibold bg-white border border-slate-205 rounded-3xl shadow-sm">
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
                className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between hover:border-purple-550/45 hover:shadow-lg transition-all duration-300 group shadow-sm relative overflow-hidden"
              >
                {/* Visual lock overlay for low karma influencers */}
                {isLocked && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-[3px] rounded-2xl flex flex-col items-center justify-center p-6 text-center z-10 pointer-events-auto">
                    <span className="p-3 bg-red-50 border border-red-200 text-red-500 rounded-full mb-3">
                      <ShieldAlert className="w-5 h-5" />
                    </span>
                    <h4 className="font-extrabold text-sm text-zinc-900 font-display">🔒 Locked Special Campaign</h4>
                    <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px] leading-normal font-semibold">
                      This premium special task is restricted. Requires <strong className="text-purple-600">{getTierRequirementText(task.minKarmaRequired)}</strong>. Check your dashboard status card!
                    </p>
                    <button className="mt-4 px-4 py-1.5 bg-slate-100 text-zinc-400 text-[10px] font-bold rounded-lg border border-slate-200 cursor-not-allowed uppercase">
                      Locked 🔒
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      task.type === 'post' 
                        ? 'bg-purple-100/60 border border-purple-200 text-purple-700 font-bold' 
                        : 'bg-slate-100 border border-slate-200 text-zinc-600 font-semibold'
                    }`}>
                      Reddit {task.type}
                    </span>
                    {isTaskSpecial && (
                      <span className="bg-amber-50 border border-amber-250 text-amber-600 text-[9px] font-extrabold px-2 py-0.5 rounded-full select-none flex items-center gap-0.5 tracking-wider">
                        ⭐ SPECIAL
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 font-bold">🎯 {task.difficulty}</span>
                </div>

                {task.type === 'post' && task.targetSubreddit && (
                  <div className="mb-2 flex items-center gap-1.5 select-all">
                    <span className="text-[10px] text-zinc-450 uppercase tracking-wider font-bold">Subreddit:</span>
                    <span className="text-purple-705 font-extrabold text-xs bg-purple-50 px-2 py-0.5 rounded-md border border-purple-205">{task.targetSubreddit.startsWith('r/') ? task.targetSubreddit : 'r/' + task.targetSubreddit}</span>
                  </div>
                )}

                <h3 className="text-base font-extrabold text-zinc-900 mb-2 leading-tight group-hover:text-purple-600 transition-all select-text font-display">
                  {renderRedditMarkdown(task.title, true)}
                </h3>
                
                <div className="text-zinc-650 text-xs leading-relaxed line-clamp-3 mb-4 select-text">
                  {renderRedditMarkdown(task.description, true)}
                </div>
                
                {/* Premium Reddit post actions details inside the card */}
                {task.type === 'post' && (
                  <div className="mt-2.5 mb-4 bg-slate-50 border border-slate-200/60 rounded-xl p-3 space-y-2.5 text-[11px] select-text font-semibold text-zinc-700">
                      {task.requiredPostTitle && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-extrabold animate-delay-100">Required Title</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(task.title || '', 'Task title copied');
                              }}
                              className="text-[9px] text-purple-650 hover:text-purple-700 font-extrabold flex items-center gap-1 bg-white hover:bg-purple-50 px-2 py-0.5 rounded transition-all border border-slate-250 cursor-pointer"
                            >
                              <Copy className="w-2.5 h-2.5" /> Copy Title
                            </button>
                          </div>
                          <div className="text-zinc-800 font-mono font-bold leading-normal text-xs break-words">"{renderRedditMarkdown(task.requiredPostTitle, true)}"</div>
                        </div>
                      )}

                      <div className="space-y-1 border-t border-slate-200 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-extrabold animate-delay-100">Post Body / Content</span>
                          <div className="flex gap-1.55">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(task.title || '', 'Title copied successfully.');
                              }}
                              className="text-[9px] text-purple-650 hover:text-purple-700 font-extrabold flex items-center gap-1 bg-white hover:bg-purple-50 px-2 py-0.5 rounded transition-all border border-slate-250 cursor-pointer"
                            >
                              <Copy className="w-2.5 h-2.5" /> Copy Title
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(task.description || '', 'Content copied successfully.');
                              }}
                              className="text-[9px] text-purple-650 hover:text-purple-700 font-extrabold flex items-center gap-1 bg-white hover:bg-purple-50 px-2 py-0.5 rounded transition-all border border-slate-250 cursor-pointer"
                            >
                              <Copy className="w-2.5 h-2.5" /> Copy Body
                            </button>
                          </div>
                        </div>
                        <div className="text-zinc-600 font-normal leading-normal select-text break-words line-clamp-2 hover:line-clamp-none transition-all duration-300">
                          {renderRedditMarkdown(task.description, true)}
                        </div>
                      </div>

                      {task.postGuidelines && (
                        <div className="space-y-1 border-t border-slate-205 pt-2 select-text">
                          <span className="text-[9px] text-zinc-455 uppercase tracking-widest font-extrabold block text-zinc-400">Task Guidelines</span>
                          <div className="text-zinc-500 font-normal leading-relaxed text-[11px] break-words">
                            {renderRedditMarkdown(task.postGuidelines, true)}
                          </div>
                        </div>
                      )}

                      {task.targetSubreddit && (
                        <div className="pt-2 border-t border-slate-200 flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const sub = task.targetSubreddit || '';
                              const cleanSub = sub.startsWith('r/') ? sub.substring(2) : sub;
                              window.open(`https://reddit.com/r/${cleanSub}`, '_blank');
                            }}
                            className="w-full py-1.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-purple-500/25 text-[10px] font-black text-purple-600 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3 text-purple-600 animate-pulse" /> Open Subreddit
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comment tasks experience inside card */}
                  {task.type === 'comment' && (
                    <div className="mt-2.5 mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5 text-[11px] select-text">
                      {task.postUrlToCommentOn && (
                        <div className="space-y-1">
                          <span className="text-[9px] text-zinc-400 uppercase tracking-widest block font-extrabold">Reddit Post Link</span>
                          <div className="flex items-center justify-between gap-3">
                            <a
                              href={task.postUrlToCommentOn}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 font-mono text-[10px] hover:underline truncate max-w-[120px] block font-bold"
                            >
                              {task.postUrlToCommentOn}
                            </a>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(task.postUrlToCommentOn || '', 'Post URL copied');
                              }}
                              className="text-[9px] text-purple-650 hover:text-purple-700 font-extrabold flex items-center gap-1 bg-white hover:bg-purple-50 px-2 py-0.5 rounded transition-all border border-slate-200 cursor-pointer shrink-0"
                            >
                              <Copy className="w-2.5 h-2.5" /> Copy Link
                            </button>
                          </div>
                        </div>
                      )}

                      {task.commentGuidelines && (
                        <div className="space-y-1 border-t border-slate-200 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-extrabold">Comment Text</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyText(task.title || '', 'Title copied successfully.');
                                }}
                                className="text-[9px] text-purple-655 hover:text-purple-700 font-extrabold flex items-center gap-1 bg-white hover:bg-purple-50 px-2 py-0.5 rounded transition-all border border-slate-200 cursor-pointer"
                              >
                                <Copy className="w-2.5 h-2.5" /> Copy Title
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyText(task.commentGuidelines || '', 'Content copied successfully.');
                                }}
                                className="text-[9px] text-purple-655 hover:text-purple-700 font-extrabold flex items-center gap-1 bg-white hover:bg-purple-50 px-2 py-0.5 rounded transition-all border border-slate-200 cursor-pointer"
                              >
                                <Copy className="w-2.5 h-2.5" /> Copy Body
                              </button>
                            </div>
                          </div>
                          <div className="text-zinc-600 font-normal leading-normal select-text break-words line-clamp-2 hover:line-clamp-none transition-all duration-300">
                            {renderRedditMarkdown(task.commentGuidelines, true)}
                          </div>
                        </div>
                      )}

                      {task.postUrlToCommentOn && (
                        <div className="pt-2 border-t border-slate-200 flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(task.postUrlToCommentOn, '_blank');
                            }}
                            className="w-full py-1.5 bg-white border border-slate-205 hover:bg-slate-50 text-[10px] font-black text-purple-600 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3 text-purple-600 animate-pulse" /> Open Post
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5 mb-6 text-[11px] font-semibold text-zinc-500 select-text">
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span>Deadline Date:</span>
                      <span className="text-zinc-650 font-mono">{task.deadline}</span>
                    </div>

                    {isTaskSpecial && !isLocked && (
                      <div className="mt-2.5 text-[9px] text-emerald-600 font-bold tracking-wide flex items-center gap-1 bg-emerald-50 p-1.5 rounded-lg border border-emerald-205 select-none font-sans">
                        <CheckCircle className="w-3.5 h-3.5" /> ⭐ You're eligible for this special task
                      </div>
                    )}

                    {isClaimedByMe && (
                      <div className="mt-3 bg-purple-50 border border-purple-200 text-purple-700 text-[10px] py-2 px-3 rounded-xl flex items-center justify-between font-mono animate-pulse">
                        <span>⏰ Time Remaining to Submit:</span>
                        <span className="font-extrabold text-white font-mono bg-purple-600 px-2 py-0.5 rounded">
                          {formatMinsSecs(secondsRemaining)} mins
                        </span>
                      </div>
                    )}
                  </div>

                <div className="border-t border-slate-100 pt-4 flex justify-between items-center bg-transparent mt-auto select-none">
                  <div>
                    <span className="text-[9px] text-zinc-400 font-bold block uppercase tracking-wider">Earning payout</span>
                    <span className="text-base font-extrabold text-zinc-900 font-mono">
                      ${(task.reward * settings.globalMultiplier).toFixed(2)} USDT
                    </span>
                    {task.isSpecial && (
                      <span className="text-[8px] text-amber-600 block tracking-wider uppercase font-bold text-amber-500">🔒 Requires {getTierRequirementText(task.minKarmaRequired)}</span>
                    )}
                  </div>

                  {userSub ? (
                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${
                      (userSub.status === 'Client Approved (Payment Released)' || userSub.status === 'Approved') ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                      (userSub.status === 'Pending' || userSub.status === 'Under Admin Review') ? 'bg-amber-50 border-amber-200 text-amber-600 animate-pulse' :
                      userSub.status === 'Admin Approved (Waiting for Client Approval)' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold' :
                      'bg-red-50 border-red-250 text-red-500'
                    }`}>
                      {(userSub.status === 'Client Approved (Payment Released)' || userSub.status === 'Approved') && <CheckCircle className="w-3.5 h-3.5" />}
                      {(userSub.status === 'Pending' || userSub.status === 'Under Admin Review') && <Clock className="w-3.5 h-3.5" />}
                      {userSub.status === 'Admin Approved (Waiting for Client Approval)' && <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />}
                      {(userSub.status === 'Client Rejected' || userSub.status === 'Rejected') && <ShieldAlert className="w-3.5 h-3.5" />}
                      {
                        (userSub.status === 'Client Approved (Payment Released)' || userSub.status === 'Approved') ? 'Approved' :
                        (userSub.status === 'Pending' || userSub.status === 'Under Admin Review') ? 'Under Review' :
                        userSub.status === 'Admin Approved (Waiting for Client Approval)' ? 'Pre-Approved' :
                        'Rejected'
                      }
                    </div>
                  ) : slotsLeft === 0 ? (
                    <div className="px-3 py-1.5 bg-slate-100 text-zinc-400 text-[10px] font-bold rounded-lg border border-slate-200">
                      Slots limit Taken
                    </div>
                  ) : isClaimedByMe ? (
                    <button 
                      disabled={isPending}
                      onClick={() => handleOpenSubmission(task)}
                      className={`px-4 py-2 border text-xs font-bold rounded-xl scroll-smooth transition-all cursor-pointer ${
                        isPending 
                          ? 'border-slate-205 bg-slate-100 text-zinc-400 cursor-not-allowed' 
                          : 'border-amber-500 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white font-extrabold'
                      }`}
                    >
                      Submit Proof
                    </button>
                  ) : (((task.type === 'post' ? isPostCooldownActive : isCommentCooldownActive) && !isUserAdmin)) ? (
                    <button 
                      disabled
                      className="px-4 py-2 bg-slate-100 border border-slate-200 text-zinc-400 text-[10px] font-bold rounded-xl cursor-not-allowed leading-tight max-w-[200px]"
                    >
                      {task.type === 'post' 
                        ? `Next post task available in ${postCooldownStringDisplay}` 
                        : `Next comment task available in ${commentCooldownStringDisplay}`}
                    </button>
                  ) : (
                    <button 
                      disabled={isPending || claimLoading === task.id}
                      onClick={() => handleClaimTask(task.id)}
                      className={`px-4 py-2 border text-xs font-bold rounded-xl scroll-smooth transition-all cursor-pointer ${
                        isPending 
                          ? 'border-slate-200 bg-slate-100 text-zinc-400 cursor-not-allowed' 
                          : claimLoading === task.id ? 'border-purple-500 bg-purple-50 text-purple-700 animate-pulse' : 'border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 hover:shadow-sm'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-slate-200 p-6 rounded-3xl space-y-6 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            
            {/* Closes */}
            <button 
              onClick={() => setSelectedTask(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-800 cursor-pointer px-2.5 py-1 bg-slate-100 hover:bg-slate-200/90 rounded-lg text-xs font-bold transition-all"
            >
              Cancel
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest block">Reserve Campaign Slot</span>
              <h2 className="text-lg font-extrabold text-zinc-900 leading-tight font-display">{selectedTask.title}</h2>
              <span className="text-xs bg-purple-50 border border-purple-150 px-2.5 py-0.5 rounded text-purple-700 font-bold font-mono">
                payout: ${(selectedTask.reward * settings.globalMultiplier).toFixed(2)} USDT
              </span>
            </div>

            {successSubmission ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-zinc-900 font-display">Proof Submitted Safely!</h3>
                <p className="text-zinc-500 text-xs font-semibold">Administrators will audit your Reddit activity inside our Control Panel soon!</p>
              </div>
            ) : (
              <form onSubmit={handleProofSubmit} className="space-y-4 text-xs font-semibold text-zinc-700">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center gap-2 mb-2 font-bold animate-pulse">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Left/Right Guideline breakdown */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                  <span className="text-[10px] text-zinc-450 block uppercase tracking-wider font-bold border-b border-slate-200 pb-1.5 font-sans">Campaign Details & Copy Panel</span>
                  
                  {selectedTask.type === 'post' ? (
                    <div className="space-y-3 font-semibold text-zinc-700">
                      {selectedTask.targetSubreddit && (
                        <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-205">
                          <div>
                            <span className="text-[9px] text-zinc-400 block uppercase tracking-widest font-black">Subreddit</span>
                            <span className="text-purple-650 font-extrabold text-xs">
                              {selectedTask.targetSubreddit.startsWith('r/') ? selectedTask.targetSubreddit : 'r/' + selectedTask.targetSubreddit}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const sub = selectedTask.targetSubreddit || '';
                              const cleanSub = sub.startsWith('r/') ? sub.substring(2) : sub;
                              window.open(`https://reddit.com/r/${cleanSub}`, '_blank');
                            }}
                            className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-[10px] font-black text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" /> Open Subreddit
                          </button>
                        </div>
                      )}

                      {selectedTask.requiredPostTitle && (
                        <div className="space-y-1 bg-white border border-slate-205 p-2.5 rounded-xl">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-extrabold">Reddit Post Title</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(selectedTask.title || '', 'Task title copied')}
                              className="text-[9px] text-purple-650 hover:text-purple-700 font-extrabold flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded cursor-pointer transition-all border border-slate-200"
                            >
                              <Copy className="w-2.5 h-2.5" /> Copy Title
                            </button>
                          </div>
                          <div className="text-zinc-850 font-mono font-bold text-[11px] select-text break-words">
                            "{renderRedditMarkdown(selectedTask.requiredPostTitle, true)}"
                          </div>
                        </div>
                      )}

                      <div className="space-y-1 bg-white border border-slate-205 p-2.5 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-extrabold">Post Body / Content</span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyText(selectedTask.title || '', 'Title copied successfully.')}
                              className="text-[9px] text-purple-650 hover:text-purple-700 font-extrabold flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded cursor-pointer transition-all border border-slate-200"
                            >
                              <Copy className="w-2.5 h-2.5" /> Copy Title
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyText(selectedTask.description || '', 'Content copied successfully.')}
                              className="text-[9px] text-purple-650 hover:text-purple-700 font-extrabold flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded cursor-pointer transition-all border border-slate-200"
                            >
                              <Copy className="w-2.5 h-2.5" /> Copy Body
                            </button>
                          </div>
                        </div>
                        <div className="text-zinc-600 font-normal text-[11px] select-text break-words whitespace-pre-wrap leading-relaxed">
                          {renderRedditMarkdown(selectedTask.description, true)}
                        </div>
                      </div>

                      {selectedTask.postGuidelines && (
                        <div className="space-y-1 bg-white border border-slate-205 p-2.5 rounded-xl">
                          <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-extrabold block text-zinc-400">Task Guidelines</span>
                          <div className="text-zinc-500 font-normal text-[11px] select-text break-words whitespace-pre-wrap leading-relaxed">
                            {renderRedditMarkdown(selectedTask.postGuidelines, true)}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 font-semibold text-zinc-700">
                      {selectedTask.postUrlToCommentOn && (
                        <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-205">
                          <div className="min-w-0 flex-1 mr-2">
                            <span className="text-[9px] uppercase tracking-widest text-zinc-400 block font-black">Target Reddit Post</span>
                            <a
                              href={selectedTask.postUrlToCommentOn}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-blue-600 hover:underline truncate block"
                            >
                              {selectedTask.postUrlToCommentOn}
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() => window.open(selectedTask.postUrlToCommentOn, '_blank')}
                            className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-[10px] font-black text-white rounded-lg transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" /> Open Post
                          </button>
                        </div>
                      )}

                      {selectedTask.postUrlToCommentOn && (
                        <div className="space-y-1 bg-white border border-slate-205 p-2.5 rounded-xl">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-extrabold">Post URL Link</span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(selectedTask.postUrlToCommentOn || '', 'Post URL copied')}
                              className="text-[9px] text-purple-650 hover:text-purple-700 font-extrabold flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded cursor-pointer transition-all border border-slate-200"
                            >
                              <Copy className="w-2.5 h-2.5" /> Copy Post URL
                            </button>
                          </div>
                          <p className="text-zinc-800 font-mono text-[10px] select-text break-all">
                            {selectedTask.postUrlToCommentOn}
                          </p>
                        </div>
                      )}

                      {selectedTask.commentGuidelines && (
                        <div className="space-y-1 bg-white border border-slate-205 p-2.5 rounded-xl">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] text-zinc-400 uppercase tracking-widest font-extrabold">Comment Text / Guidelines</span>
                            <div className="flex gap-1.55">
                              <button
                                type="button"
                                onClick={() => handleCopyText(selectedTask.title || '', 'Title copied successfully.')}
                                className="text-[9px] text-purple-650 hover:text-purple-700 font-extrabold flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded cursor-pointer transition-all border border-slate-200 font-sans"
                              >
                                <Copy className="w-2.5 h-2.5" /> Copy Title
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyText(selectedTask.commentGuidelines || '', 'Content copied successfully.')}
                                className="text-[9px] text-purple-650 hover:text-purple-700 font-extrabold flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded cursor-pointer transition-all border border-slate-200"
                              >
                                <Copy className="w-2.5 h-2.5" /> Copy Body
                              </button>
                            </div>
                          </div>
                          <div className="text-zinc-600 text-[11px] select-text break-words whitespace-pre-wrap leading-relaxed">
                            {renderRedditMarkdown(selectedTask.commentGuidelines, true)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Proof fields */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5 font-sans">Reddit Proof Link</label>
                  <input 
                    type="text" 
                    value={redditProofLink}
                    onChange={(e) => setRedditProofLink(e.target.value)}
                    placeholder="https://reddit.com/r/..." 
                    className="w-full text-xs text-zinc-800 bg-slate-50 border border-slate-205 px-3 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none placeholder-zinc-400 font-semibold"
                  />
                  <p className="text-[10px] text-zinc-400 font-semibold mt-1">Paste the direct link to your Reddit post or comment</p>
                </div>

                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-xs font-black text-white rounded-xl shadow-md hover:shadow-lg hover:opacity-95 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {submitting ? 'Transmitting proof payloads...' : 'Submit Proof'}
                </button>
              </form>
            )}
            
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[100] bg-white border border-purple-500/20 text-zinc-900 text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold animate-bounce backdrop-blur-md select-none font-sans">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};
