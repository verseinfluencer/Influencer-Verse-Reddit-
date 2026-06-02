import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { 
  Sparkles, ArrowRight, ShieldCheck, Zap, Award, CheckCircle2, 
  ChevronDown, ChevronUp, Star, Users, Briefcase, DollarSign, 
  Mail, MessageSquare, ShieldAlert, Coins, HelpCircle, FileText, 
  ArrowUpRight, Heart, BarChart, Check, Lock, Globe 
} from 'lucide-react';

interface HomeProps {
  onNavigate: (page: string) => void;
}

// Resilient avatar rendering with a initials letter fallback
const Avatar: React.FC<{ fullName?: string; avatarUrl?: string; sizeClass?: string }> = ({ 
  fullName, 
  avatarUrl, 
  sizeClass = "w-10 h-10" 
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = fullName ? fullName.trim().charAt(0).toUpperCase() : 'C';

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  return (
    avatarUrl && avatarUrl.trim() !== '' && !imageError ? (
      <img 
        src={avatarUrl} 
        alt={fullName || 'User avatar'} 
        onError={() => setImageError(true)} 
        className={`${sizeClass} rounded-full object-cover border border-slate-200 bg-slate-50 p-0.5 shadow-sm`}
      />
    ) : (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-xs shadow-inner uppercase tracking-wider select-none`}>
        {initials}
      </div>
    )
  );
};

// Animated count-up counter for SaaS stats
const AnimatedCounter: React.FC<{ value: number; isCurrency?: boolean; isPercent?: boolean; duration?: number }> = ({ 
  value, 
  isCurrency = false, 
  isPercent = false, 
  duration = 1200 
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    let start = 0;
    const end = value;
    if (start === end) return;

    const totalMiliseconds = duration;
    // Cap steps to avoid freezing
    const steps = Math.min(end, 60);
    const stepTime = Math.max(Math.floor(totalMiliseconds / steps), 16);
    const increment = Math.ceil(end / steps);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  if (value === 0) {
    return (
      <span className="text-xs text-slate-400 font-medium italic block py-1">
        Live data will appear as the platform grows.
      </span>
    );
  }

  let formatted = count.toLocaleString();
  if (isCurrency) {
    formatted = `$${count.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
  } else if (isPercent) {
    formatted = `${count}%`;
  }

  return (
    <span className="text-3xl md:text-4xl font-extrabold text-zinc-950 font-display tracking-tight block">
      {formatted}
    </span>
  );
};

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { tasks, users, submissions, withdrawals, clients, currentUser } = useApp();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const stepsData = [
    {
      num: "01",
      title: "Register Account",
      desc: "Sign up and bind your Reddit profile format matching automated formatting parameters cleanly."
    },
    {
      num: "02",
      title: "Claim Task",
      desc: "Browse open tasks on Reddit, reserve an active slot, and perform comment or submission guidelines."
    },
    {
      num: "03",
      title: "Submit Proof",
      desc: "Provide your verifiable URL evidence link and upload clear high-resolution screenshot receipts."
    },
    {
      num: "04",
      title: "Get Approved",
      desc: "Campaign sponsors and administrators review transaction parameters and release funds dynamically."
    },
    {
      num: "05",
      title: "USDT Reward",
      desc: "Withdraw pre-funded campaign earnings directly to your BSC (BEP20) address or Binance ID."
    }
  ];

  // --- Filtering legitimate users & clients following specifications ---
  const legitimateCreators = users.filter(u => {
    const isClient = 
      u.role === 'client' || 
      u.role === 'brand' || 
      u.role === 'agency' || 
      (u as any).accountType === 'client' || 
      (u as any).userType === 'client' || 
      (u as any).isClient === true;
    const isSpecial = u.role === 'admin' || u.role === 'moderator';
    return !isClient && !isSpecial;
  });

  const legitimateClients = (clients || []).filter(c => {
    const role = (c as any).role;
    const isClientRole = role === 'client' || role === 'brand' || role === 'agency';
    const hasClientType = (c as any).accountType === 'client' || (c as any).userType === 'client' || (c as any).isClient === true;
    return isClientRole || hasClientType;
  });

  const completedSubmissions = submissions.filter(s => 
    s.status === 'Approved' || s.status === 'Client Approved (Payment Released)'
  );

  const totalEarningsDistributed = withdrawals
    .filter(w => w.status === 'Approved')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Leaderboard data calculation: Top 5 legitimate earners
  const leaderboardList = [...legitimateCreators]
    .sort((a, b) => (b.totalEarned || 0) - (a.totalEarned || 0))
    .slice(0, 5);

  const startNowAction = () => {
    if (currentUser) {
      if (currentUser.status === 'Pending') {
        onNavigate('profile');
      } else {
        onNavigate('dashboard');
      }
    } else {
      onNavigate('signup');
    }
  };

  // Static clean trust cards data
  const creatorFeatures = [
    {
      title: "Reddit micro-tasks",
      desc: "Browse custom posts or comment tasks. Work on campaigns matching your authorization tier instantly.",
      icon: RssIcon
    },
    {
      title: "Transparent approvals",
      desc: "Submissions get verified by both brand clients and platform moderators via dual check audits.",
      icon: ShieldCheck
    },
    {
      title: "Instant wallet tracking",
      desc: "Check pending balances, live ledger updates, and withdraw instantly with transparent tracking.",
      icon: WalletIcon
    },
    {
      title: "Discord support community",
      desc: "Direct access to official channels. Clear guidelines, dispute resolution panels, and live chats.",
      icon: DiscordIcon
    }
  ];

  const brandFeatures = [
    {
      title: "Launch Reddit campaigns",
      desc: "Deploy custom engagement bounds, specific keyword sets, subreddits lists, and reward structures.",
      icon: Briefcase
    },
    {
      title: "Review work submissions",
      desc: "Comprehensive dashboards load high-resolution screenshot proofs, direct platform links, and timestamps.",
      icon: FileText
    },
    {
      title: "Approve verified work",
      desc: "A single click releases pre-funded campaigns value directly into creator available credit balances.",
      icon: CheckCircle2
    },
    {
      title: "Track budget spending",
      desc: "Real-time analytics for campaign metrics, remaining balances, approved, and rejected submissions.",
      icon: BarChart
    }
  ];

  const faqs = [
    {
      q: "What is the minimum withdrawal amount on Influencer Verse?",
      a: "The minimum withdrawal threshold is strictly $1.00 USDT. We want to ensure micro-influencers can cash out instantly without having to pile up high balances."
    },
    {
      q: "Which crypto networks do you support for cashouts?",
      a: "We support withdrawal to any Binance Smart Chain (BSC BEP20) wallet address, as well as Direct Binance Pay IDs. Always double check your receiving address is set up on the BEP20 network to prevent permanent loss of funds."
    },
    {
      q: "Why is my account status showing Pending Verification?",
      a: "To protect our advertisers, every new profile undergoes a strict manual audit. We check that your Reddit account is active, authentic, and matches the submitted Reddit Username fields. Reviews are completed within 24 hours."
    }
  ];

  return (
    <div className="w-full bg-white text-zinc-900 font-sans selection:bg-purple-100 selection:text-purple-900 relative overflow-hidden" id="homepage-container">
      
      {/* Abstract Grid Mesh Pattern (Linear style background) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      {/* 1. HERO SECTION */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-36 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">
        <div className="text-center space-y-8 max-w-5xl mx-auto">
          
          {/* Subtle animated badge */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-50 border border-purple-100 rounded-full select-none"
          >
            <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 font-sans">Official Web3 Reddit Influencer Network</span>
          </motion.div>

          {/* Premium Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter text-zinc-950 font-display leading-[1.04]"
          >
            Reddit Campaigns. <br className="hidden sm:inline" />
            Real Creators. <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Verified USDT Rewards.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-sans font-medium"
          >
            Influencer Verse connects brands with Reddit creators through verified campaign tasks, proof-based approvals, and transparent reward tracking.
          </motion.p>

          {/* CTA Buttons with hover underline / glows */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startNowAction}
              className="w-full sm:w-auto px-7 py-3.5 bg-zinc-950 hover:bg-zinc-850 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-zinc-900/10 cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              Start Earning <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate('client-login')}
              className="w-full sm:w-auto px-7 py-3.5 bg-white border border-slate-200 text-zinc-800 hover:text-zinc-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm hover:border-slate-350 cursor-pointer flex items-center justify-center gap-1 transition-all"
            >
              Client Portal
            </motion.button>
          </motion.div>

        </div>

        {/* Live Platform Interactive Mockup (Whitespace & Grid styling) */}
        <motion.div 
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="mt-16 md:mt-20 max-w-5xl mx-auto p-4 md:p-6 bg-white border border-slate-100 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] relative z-10"
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-slate-50 border border-slate-150 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-wider shadow-sm z-20">
            Interactive Registry Portal Live Simulation
          </div>
          <div className="bg-slate-50/60 rounded-2xl p-6 border border-slate-100 overflow-hidden relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Creator Mock Block */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Live Pipeline Client Request</span>
                </div>
                <h3 className="text-sm font-bold text-zinc-900 leading-snug">Reddit Comment: Campaign Boost</h3>
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-50">
                  <span className="text-zinc-500 font-semibold">Reward Slot</span>
                  <span className="font-extrabold text-emerald-600 font-mono text-center bg-emerald-50 px-1.5 py-0.5 rounded">$3.50+ USDT</span>
                </div>
              </div>

              {/* Status Audit Proof Block */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-purple-600 bg-purple-50 p-1 rounded">🛡️</span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Screenshot Verification Hash</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg space-y-1 font-mono text-[9px]">
                  <p className="text-zinc-500 overflow-hidden text-ellipsis whitespace-nowrap">HASH: d299b8ac440c9f80a4421b88e0c...</p>
                  <p className="text-zinc-500">TIMESTAMP: 2026-06-02 07:11:24Z</p>
                  <p className="text-purple-600 font-bold">STATUS: METADATA MATCHED</p>
                </div>
              </div>

              {/* Safe Withdrawal Block */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">BSC Settlement Drawer</span>
                  <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded text-[9px] font-bold text-emerald-600 uppercase">Completed</span>
                </div>
                <div className="flex items-baseline gap-1.5 py-1">
                  <span className="text-2xl font-extrabold text-zinc-950 font-display">$42.00</span>
                  <span className="text-xs text-zinc-500 font-bold">USDT</span>
                </div>
                <div className="pt-2 border-t border-slate-50 text-[10px] font-semibold text-zinc-500 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-500" /> Direct Binance Smart Chain (BEP20)
                </div>
              </div>

            </div>
          </div>
        </motion.div>
      </section>

      {/* 2. HOW IT WORKS SECTION */}
      <section className="py-24 md:py-32 bg-slate-50/50 border-y border-slate-100 relative z-10" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-20">
            <span className="text-xs text-purple-600 font-semibold uppercase tracking-widest block font-sans">Fast Operations Protocol</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-950 tracking-tight font-display leading-[1.1]">How It Works</h2>
            <p className="text-slate-505 text-sm md:text-base max-w-lg mx-auto leading-relaxed font-sans font-medium">
              A streamlined, proof-vetted campaign process designed for high accuracy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 max-w-6xl mx-auto text-xs font-semibold relative">
            {stepsData.map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm transition-all flex flex-col justify-between group cursor-pointer"
              >
                <div className="space-y-4">
                  <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 font-extrabold font-mono text-sm border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    {step.num}
                  </div>
                  <h3 className="text-sm md:text-base font-bold text-zinc-900 group-hover:text-purple-600 transition-colors font-display tracking-tight">{step.title}</h3>
                  <p className="text-slate-505 font-normal lg:text-xs text-sm leading-relaxed font-sans">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. FOR CREATORS SECTION */}
      <section className="py-24 md:py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 border border-purple-100 rounded-full text-[11px] font-semibold uppercase tracking-wider text-purple-700 select-none">
              <Sparkles className="w-4 h-4 text-purple-500" /> Decentralized Micro-Influence
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-955 font-display tracking-tight leading-[1.12]">
              A Premium Earning Engine Built For Reddit Creators
            </h2>
            <p className="text-slate-600 text-sm md:text-base leading-relaxed font-sans font-medium">
              Influencer Verse streamlines Reddit monetization campaigns. Easily browse active target tasks, perform instructions, upload dynamic proofs, and trigger instant cryptocurrency payouts with absolute transparency.
            </p>
            <div className="pt-2">
              <button 
                onClick={startNowAction}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 transition-all group cursor-pointer"
              >
                Launch creator portal <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {creatorFeatures.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    whileHover={{ y: -4, scale: 1.015 }}
                    className="p-6 bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl space-y-4 hover:border-slate-150 transition-all cursor-pointer"
                  >
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit border border-purple-100/50">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-bold text-zinc-955 block mb-1.5 font-display tracking-tight">{f.title}</h3>
                      <p className="text-slate-505 font-normal text-xs md:text-sm leading-relaxed font-sans">{f.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* 4. FOR BRANDS SECTION */}
      <section className="py-20 md:py-28 bg-slate-50/50 border-t border-slate-100 z-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-8 order-2 lg:order-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {brandFeatures.map((f, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    whileHover={{ y: -4, scale: 1.015 }}
                    className="p-6 bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl space-y-4 hover:border-slate-150 transition-all cursor-pointer"
                  >
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit border border-indigo-100/50">
                      <f.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-950 block mb-1">{f.title}</h3>
                      <p className="text-zinc-500 font-medium text-xs leading-relaxed">{f.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                <Briefcase className="w-3.5 h-3.5 text-indigo-500" /> Decentralized Advertising
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-950 font-display tracking-tight leading-tight">
                Secure & Vetted Campaign Delivery For Brands
              </h2>
              <p className="text-zinc-650 text-xs sm:text-sm leading-relaxed font-semibold">
                Maximize Reddit marketing efficiency. Create campaigns with pre-funded limits, review exact task submissions with direct screenshots, and automate payout releasing vectors safely.
              </p>
              <div className="pt-2">
                <button 
                  onClick={() => onNavigate('client-login')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-750 transition-all group cursor-pointer"
                >
                  Enter brand client portal <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. TRUST & PAYOUTS PREVIEW (REAL FIREBASE DATA ONLY) */}
      <section className="py-24 md:py-32 bg-white border-t border-slate-100 relative z-10" id="trust-preview">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-20">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest block font-sans">Verifiable On-Chain Settlement Logs</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-950 font-display tracking-tight leading-[1.1]">Trust & Payouts Registry</h2>
            <p className="text-slate-505 text-sm md:text-base max-w-md mx-auto font-sans font-medium">
              Real-time calculations fetched directly from active core platform instances.
            </p>
          </div>

          {/* If there is no real stats or users yet, display specifications message */}
          {users.length === 0 && completedSubmissions.length === 0 && totalEarningsDistributed === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-50 border border-slate-200 text-zinc-500 text-sm font-semibold max-w-lg mx-auto">
              Live data will appear as the platform grows.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
              
              <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all">
                <Users className="w-6 h-6 text-purple-600 mb-4" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Total Verified Creators</span>
                <AnimatedCounter value={legitimateCreators.length} />
              </div>

              <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all">
                <CheckCircle2 className="w-6 h-6 text-indigo-600 mb-4" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Completed Campaigns</span>
                <AnimatedCounter value={completedSubmissions.length} />
              </div>

              <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all">
                <DollarSign className="w-6 h-6 text-emerald-600 mb-4" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Paid Creator Rewards</span>
                <AnimatedCounter value={totalEarningsDistributed} isCurrency={true} />
              </div>

              <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all">
                <Globe className="w-6 h-6 text-blue-600 mb-4" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Active Brands Registered</span>
                <AnimatedCounter value={legitimateClients.length} />
              </div>

            </div>
          )}

          {/* Live Recent Payouts preview snippet */}
          {withdrawals.filter(w => w.status === 'Approved').length > 0 && (
            <div className="mt-12 max-w-2xl mx-auto bg-slate-50/40 border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-100/50 border-b border-slate-150 flex justify-between items-center text-xs">
                <span className="font-bold text-zinc-800">Verified Cashout Ledger Logs</span>
                <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1">🟢 Settled Live</span>
              </div>
              <div className="p-4 divide-y divide-slate-100 font-mono text-[11px] text-zinc-600">
                {withdrawals
                  .filter(w => w.status === 'Approved')
                  .slice(0, 3)
                  .map((w, idx) => {
                    const rawName = w.userFullName || w.userId || 'Micro Influencer';
                    const nameSplit = rawName.split(' ');
                    const maskedName = nameSplit[0] + (nameSplit[1] ? ' ' + nameSplit[1].charAt(0) + '***' : ' ***');
                    return (
                      <div key={w.id || idx} className="py-2.5 flex justify-between items-center bg-transparent">
                        <span className="font-bold text-zinc-800">{maskedName}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-600">${Number(w.amount || 0).toFixed(2)} USDT</span>
                          <span className="text-zinc-400">|</span>
                          <span className="text-[10px] text-zinc-500">{new Date(w.requestedAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* 6. LEADERBOARD PREVIEW SECTION */}
      <section className="py-24 md:py-32 bg-slate-50/50 border-t border-slate-100 relative z-10" id="leaderboard-preview">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          <div className="text-center space-y-3 mb-20">
            <span className="text-xs text-purple-600 font-semibold uppercase tracking-widest block font-sans">Top Earners Ranking</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-950 font-display tracking-tight leading-none">Creator Standings</h2>
            <p className="text-slate-505 text-sm max-w-md mx-auto font-sans font-medium">
              Observe top-tier creators earning verified campaign rewards daily.
            </p>
          </div>

          <div className="bg-white border border-slate-150 rounded-2xl p-6 md:p-8 shadow-sm">
            {leaderboardList.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs font-semibold italic">
                Live data will appear as the platform grows.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex border-b border-slate-100 pb-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <div className="w-12 text-center">Rank</div>
                  <div className="flex-1 pl-4">Creator Identity</div>
                  <div className="w-32 text-right">Total Earnings</div>
                </div>

                <div className="divide-y divide-slate-50 text-sm font-semibold text-zinc-805">
                  {leaderboardList.map((item, idx) => {
                    const rank = idx + 1;
                    const rankMedal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
                    return (
                      <div key={item.id} className="py-3.5 flex items-center justify-between">
                        {/* Rank indicator */}
                        <div className="w-12 text-center font-bold text-zinc-500 font-mono">
                          {rankMedal}
                        </div>
                        {/* Avatar & Display Name ONLY */}
                        <div className="flex-1 flex items-center gap-3 pl-4">
                          <Avatar fullName={item.fullName} avatarUrl={item.avatarUrl} sizeClass="w-8 h-8" />
                          <span className="text-zinc-900 font-bold block">{item.fullName}</span>
                        </div>
                        {/* Earnings ONLY */}
                        <div className="w-32 text-right font-mono font-bold text-emerald-600">
                          ${(item.totalEarned || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </section>

      {/* 7. DISCORD COMMUNITY CTA */}
      <section className="py-20 md:py-24 bg-white border-t border-slate-100 relative z-10" id="discord-cta">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-indigo-50/40 border border-indigo-100 p-8 md:p-12 rounded-[24px] text-center space-y-6"
          >
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <DiscordIcon className="w-6 h-6" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-[#5865F2] font-display tracking-tight leading-[1.1]">Join Our Discord Community</h2>
            <p className="text-slate-655 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-sans font-medium">
              Connect directly with verified campaign organizers, platform moderators, and top earning creators. Share tips, discuss subreddits guidelines, and secure help support instantly.
            </p>
            <div>
              <a 
                href="https://discord.gg/fFPT58H9kd" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer font-sans select-none"
              >
                Join Our Discord
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 8. FAQ ACCORDION SECTION */}
      <section className="py-24 md:py-32 bg-slate-50/50 border-t border-slate-100 relative z-10" id="faq-preview">
        <div className="max-w-4xl mx-auto px-4">
          
          <div className="text-center space-y-3 mb-20">
            <span className="text-xs text-purple-600 font-semibold uppercase tracking-widest block font-sans">Answers Desk</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-zinc-950 font-display tracking-tight leading-[1.1]">Frequently Asked Questions</h2>
            <p className="text-slate-505 text-sm md:text-base max-w-md mx-auto font-sans font-medium">
              Got general platform questions? We have laid down clear, simple guidance.
            </p>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto font-semibold">
            {faqs.map((f, i) => {
              const isOpen = activeFaq === i;
              return (
                <div 
                  key={i} 
                  className="bg-white border border-slate-150 rounded-2xl overflow-hidden transition-all duration-300"
                >
                  <button 
                    onClick={() => setActiveFaq(isOpen ? null : i)}
                    className="w-full flex justify-between items-center p-5 text-left font-bold text-xs sm:text-sm text-zinc-900 focus:outline-none cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <span>{f.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />}
                  </button>
                  
                  {isOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="px-5 pb-5 pt-0 border-t border-slate-50 text-xs text-zinc-500 font-medium leading-relaxed"
                    >
                      {f.a}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 9. FINAL CTA SECTION */}
      <section className="py-24 md:py-32 bg-white border-t border-slate-100 text-center relative z-10" id="final-cta">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-zinc-950 font-display tracking-tight leading-[1.08]">
            Ready to Begin Earning Vetted <br className="hidden sm:inline" />
            Reddit Marketing Rewards?
          </h2>

          <p className="text-slate-505 text-sm sm:text-base max-w-lg mx-auto leading-relaxed font-sans font-medium">
            Register your profile, get certified, complete campaigns, and start cashing out directly onto the Binance Smart Chain.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={startNowAction}
              className="w-full sm:w-auto px-8 py-4 bg-zinc-950 hover:bg-zinc-850 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              Start Earning Now <ArrowRight className="w-4 h-4 text-purple-400" />
            </button>
            <button 
              onClick={() => onNavigate('client-login')}
              className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-zinc-700 hover:text-zinc-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm cursor-pointer flex items-center justify-center transition-all"
            >
              Client Portal
            </button>
          </div>

        </div>
      </section>

    </div>
  );
};

// Custom light inline SVG Icons to prevent custom imports and maintain beautiful light theme styles
function WalletIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></svg>
  );
}

function DiscordIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><path d="M7.5 16.5c2 1 5 1 7 0" /><path d="M8 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0m4 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0" /><path d="M12 2a10 10 0 0 0-7.77 16.27l-.46 1.83a.5.5 0 0 0 .61.6l1.83-.46A10 10 0 1 0 12 2Z" /></svg>
  );
}

function RssIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>
  );
}
