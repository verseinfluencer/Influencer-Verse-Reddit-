import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, useInView } from 'motion/react';
import { 
  Sparkles, ArrowRight, ShieldCheck, Zap, Award, CheckCircle2, 
  ChevronDown, ChevronUp, Star, Users, Briefcase, DollarSign, 
  Mail, MessageSquare, ShieldAlert, Coins, HelpCircle, FileText, 
  ArrowUpRight, Heart, BarChart, Check, Lock, Globe, Layers, AlertCircle, TrendingUp
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
        className={`${sizeClass} rounded-full object-cover border border-slate-100 bg-slate-50 p-0.5 shadow-xs`}
      />
    ) : (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white font-extrabold flex items-center justify-center text-xs shadow-inner uppercase tracking-wider select-none`}>
        {initials}
      </div>
    )
  );
};

// Animated count-up counter for SaaS stats with trigger on screen visibility
const AnimatedCounter: React.FC<{ value: number; isCurrency?: boolean; isPercent?: boolean; duration?: number }> = ({ 
  value, 
  isCurrency = false, 
  isPercent = false, 
  duration = 1200 
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (!isInView) return;
    if (value === 0) return;
    
    let start = 0;
    const end = value;
    if (start === end) return;

    const totalMiliseconds = duration;
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
  }, [value, duration, isInView]);

  if (value === 0) {
    return (
      <span className="text-[11px] text-slate-400 font-medium font-sans block mt-1">
        Live platform metrics update as campaigns grow.
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
    <span ref={ref} className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight block font-sans">
      {formatted}
    </span>
  );
};

// Premium Magnetic Wrapper for target buttons
const MagneticButton: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ 
  children, 
  className = "", 
  onClick 
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = clientX - (left + width / 2);
    const y = clientY - (top + height / 2);
    // Soft magnetic pull offset of up to 10px
    setPosition({ x: x * 0.15, y: y * 0.15 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div 
      onMouseMove={handleMouse} 
      onMouseLeave={reset}
      className="inline-block"
    >
      <motion.div
        animate={{ x: position.x, y: position.y }}
        transition={{ type: "spring", stiffness: 180, damping: 14, mass: 0.15 }}
      >
        <motion.button
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={onClick}
          className={`${className} cursor-pointer`}
        >
          {children}
        </motion.button>
      </motion.div>
    </div>
  );
};

// Premium 3D perspective tilt effect on features
const TiltCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = "" 
}) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
    setRotateY(x * 12);  // tilt strength
    setRotateX(-y * 12);
  };

  const reset = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      animate={{ rotateX, rotateY }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      transformTemplate={({ rotateX, rotateY }) => `perspective(800px) rotateX(${rotateX}) rotateY(${rotateY})`}
      className={`${className} cursor-pointer`}
    >
      {children}
    </motion.div>
  );
};

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { tasks, users, submissions, withdrawals, clients, currentUser } = useApp();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Spotlight coordinates on Hero Section
  const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0 });
  const [isSpotlightVisible, setIsSpotlightVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setSpotlightPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Streamlined Professional Copywriting
  const stepsData = [
    {
      num: "01",
      title: "Link Identity",
      desc: "Connect your active Reddit account through our rapid profile verification flow."
    },
    {
      num: "02",
      title: "Browse Campaigns",
      desc: "Explore public promotional tasks with fully transparent guidelines and fixed USDT reward rates."
    },
    {
      num: "03",
      title: "Submit Evidence",
      desc: "Paste your direct Reddit proof URL and optional high-resolution screenshot receipts."
    },
    {
      num: "04",
      title: "Sponsor Verification",
      desc: "Campaign managers automatically and manually review tasks to maintain strict quality standard approvals."
    },
    {
      num: "05",
      title: "Instant Cashout",
      desc: "Receive cleared USDT rewards straight to your Binance Smart Chain (BEP20) wallet."
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

  const creatorFeatures = [
    {
      title: "Verified Reddit creators",
      desc: "Work on transparent micro-campaigns matching your karma tier and profile authorization level.",
      icon: CheckCircle2
    },
    {
      title: "Transparent task tracking",
      desc: "Examine clear submission checklists and view active slots alongside direct real-time audit outcomes.",
      icon: BarChart
    },
    {
      title: "Secure USDT reward flow",
      desc: "Withdraw cleared account earnings instantly directly to any BEP20 wallet. Zero arbitrary delays.",
      icon: WalletIcon
    },
    {
      title: "Client-reviewed submissions",
      desc: "Dispute resolutions and manual check-overs executed professionally by verified active sponsors and admins.",
      icon: ShieldCheck
    }
  ];

  const brandFeatures = [
    {
      title: "Proof-based campaign approvals",
      desc: "Each creator submission is verified dynamically with clickable live links and secure file evidence logs.",
      icon: ShieldCheck
    },
    {
      title: "Client-reviewed submissions",
      desc: "Control payouts easily with full-suite reject, approve, feedback, and moderation dashboards.",
      icon: FileText
    },
    {
      title: "Transparent budget spending",
      desc: "Pre-fund target budgets safely in USDT. Unclaimed slots or rejected submissions release funds back instantly.",
      icon: Coins
    },
    {
      title: "Streamlined campaign configuration",
      desc: "Deploy specific subreddit targets, minimum karma tiers, custom copy panels, and direct instructions with relative ease.",
      icon: Briefcase
    }
  ];

  const faqs = [
    {
      q: "How does the campaign verification system operate?",
      a: "Our system combines automated direct-link verification checks with robust client dashboards. Creators submit direct links to their Reddit posts or comments. Brand managers and portal moderators then approve or reject submissions based on objective quality requirements, ensuring top-tier results before rewards are paid."
    },
    {
      q: "What is the minimum withdrawal limit?",
      a: "The minimum withdrawal limit is strictly $1.00 USDT. Creator rewards are saved instantly to secure ledger balances. You can request cashouts straight to your Binance Smart Chain (BEP20) address or Binance ID whenever you cross this small milestone."
    },
    {
      q: "How long does the profile review process take?",
      a: "To protect the integrity of our sponsors' budgets, every new Reddit profile connection goes through a validation review. Our administrators verify profile authenticity, age, and karma statistics. Reviews are typically processed within 12 to 24 hours."
    },
    {
      q: "Are the statistics transparent and real?",
      a: "Yes. All statistical indicators displayed on our trust center reflect true system-wide data fetched directly from active databases in Firestore. We believe in complete transparency for both creators and brand managers."
    }
  ];

  return (
    <div className="w-full bg-white text-slate-800 font-sans selection:bg-purple-100 selection:text-purple-900 relative overflow-hidden" id="homepage-container">
      
      {/* Dynamic Keyframes Injected as Style Tag for Zero-Lag Clean Animation Performance */}
      <style>{`
        @keyframes text-gradient-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .premium-text-shimmer {
          background-size: 200% auto;
          animation: text-gradient-shimmer 7s ease infinite;
        }
        @keyframes premium-border-pulse {
          0%, 100% { border-color: rgba(99, 102, 241, 0.12); box-shadow: 0 0 0px rgba(99, 102, 241, 0); }
          50% { border-color: rgba(99, 102, 241, 0.45); box-shadow: 0 0 20px rgba(99, 102, 241, 0.15); }
        }
        .animate-border-pulse {
          animation: premium-border-pulse 4s infinite ease-in-out;
        }
        @keyframes premium-shine-effect {
          0% { transform: translateX(-105%); }
          50%, 100% { transform: translateX(105%); }
        }
        .animate-premium-shine {
          animation: premium-shine-effect 3.5s infinite ease-in-out;
        }
        @keyframes flowing-dash {
          to {
            stroke-dashoffset: -40;
          }
        }
        .flowing-dash-line {
          stroke-dasharray: 8 6;
          animation: flowing-dash 2s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .premium-text-shimmer, .animate-border-pulse, .animate-premium-shine, .flowing-dash-line {
            animation: none !important;
          }
        }
      `}</style>

      {/* Dynamic Floating Background Orbs for Premium Subtle Depth */}
      <div className="absolute inset-x-0 top-0 h-[1000px] overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{
            scale: [1, 1.15, 0.92, 1.05, 1],
            x: [0, 50, -30, 20, 0],
            y: [0, -40, 50, -30, 0],
          }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 left-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-200/25 blur-[100px] rounded-full"
        />
        <motion.div 
          animate={{
            scale: [1, 0.9, 1.12, 0.98, 1],
            x: [0, -40, 40, -10, 0],
            y: [0, 50, -30, 30, 0],
          }}
          transition={{
            duration: 19,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/3 right-1/4 -translate-y-1/2 w-[450px] h-[450px] bg-purple-200/15 blur-[110px] rounded-full"
        />
        {/* Subtle dot matrix grid background layout */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#6366f108_1px,transparent_1px),linear-gradient(to_bottom,#6366f108_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_80%,transparent_100%)]"></div>
      </div>

      {/* 1. HERO SECTION WITH MOUSE SPOTLIGHT GLOW & STAGGERED FADE-UP */}
      <section 
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        onMouseEnter={() => setIsSpotlightVisible(true)}
        onMouseLeave={() => setIsSpotlightVisible(false)}
        className="relative pt-24 pb-20 md:pt-36 md:pb-40 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10" 
        id="hero-section"
      >
        {/* Dynamic mouse follow backlight glow spotlight */}
        {isSpotlightVisible && (
          <motion.div
            className="absolute pointer-events-none rounded-full blur-[110px] bg-indigo-500/8 w-[380px] h-[380px] z-0"
            animate={{
              x: spotlightPos.x - 190,
              y: spotlightPos.y - 190,
            }}
            transition={{ type: "spring", damping: 30, stiffness: 120, mass: 0.7 }}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative z-10">
          
          {/* Hero Left Info with Staggered Entrance */}
          <div className="lg:col-span-7 space-y-8 text-left">
            
            {/* Subtle animated badge */}
            <motion.div 
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              className="inline-flex items-center gap-2 px-3.5 py-1 bg-purple-50/80 border border-purple-100 rounded-full select-none shadow-xs"
            >
              <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-ping"></span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-750 font-sans">
                Verified Reddit Influencer Network
              </span>
            </motion.div>

            {/* Premium Headline (Large modern typography with Animated Gradient Text) */}
            <div className="space-y-4">
              <motion.h1 
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.08] font-sans"
              >
                Launch Reddit Campaigns <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-700 premium-text-shimmer">
                  That People Actually Notice.
                </span>
              </motion.h1>
            </div>

            {/* Subheadline */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed font-sans font-medium"
            >
              Influencer Verse connects brands with verified Reddit creators through proof-based campaigns, transparent approvals, and secure USDT rewards.
            </motion.p>

            {/* Magnetic CTA Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-center gap-5 pt-2"
            >
              <MagneticButton 
                onClick={startNowAction}
                className="w-full sm:w-auto px-7 py-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-md shadow-slate-900/10 hover:shadow-lg hover:shadow-purple-500/20 duration-300"
              >
                Start Earning <ArrowRight className="w-4 h-4 text-purple-400" />
              </MagneticButton>

              <MagneticButton 
                onClick={() => onNavigate('client-login')}
                className="w-full sm:w-auto px-7 py-4 bg-white border border-slate-200 hover:border-slate-350 text-slate-700 hover:text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs flex items-center justify-center bg-gradient-to-b from-white to-slate-50/50 duration-300"
              >
                Launch Campaign
              </MagneticButton>
            </motion.div>

            {/* Minimal trust badge info */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="flex items-center gap-6 pt-4 text-xs text-slate-400 font-medium"
            >
              <span className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Verified Accounts only
              </span>
              <span className="flex items-center gap-1.5 hover:text-indigo-605 transition-colors">
                <ShieldCheck className="w-4 h-4 text-indigo-505 shrink-0" /> Dual-Audited Approval
              </span>
            </motion.div>

          </div>

          {/* Hero Right: Live Dashboard Flow Mockup with 4 floating glass-morphic cards */}
          <div className="lg:col-span-5 relative w-full flex justify-center lg:justify-end">
            
            <div className="relative w-full max-w-[420px] h-[480px] bg-slate-50/50 backdrop-blur-md rounded-3xl border border-slate-100 p-6 flex flex-col justify-between overflow-visible shadow-[0_20px_50px_rgba(99,102,241,0.04)] z-10">
              
              {/* Inner connecting progress timeline line */}
              <div className="absolute left-10 top-12 bottom-12 w-0.5 border-l border-dashed border-slate-250 pointer-events-none z-0"></div>

              {/* FLOATING GLASS CARD 1: Task Created */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, y: [0, -5, 0] }}
                transition={{ 
                  opacity: { delay: 0.2 }, 
                  x: { delay: 0.2 }, 
                  y: { duration: 4.5, repeat: Infinity, ease: "easeInOut" } 
                }}
                whileHover={{ scale: 1.025, boxShadow: "0 15px 30px rgba(0,0,0,0.04)" }}
                className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.02)] flex items-center gap-3.5 z-10 transition-all hover:border-emerald-300/60"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 shadow-xs">
                  <Briefcase className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-emerald-600">Stage 1</span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold font-sans">Active</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-805 leading-tight">Task Created</h4>
                  <p className="text-[10px] text-slate-450 leading-snug font-medium tracking-normal">Sponsor configured engagement target rules.</p>
                </div>
              </motion.div>

              {/* FLOATING GLASS CARD 2: Proof Submitted */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, y: [0, 5, 0] }}
                transition={{ 
                  opacity: { delay: 0.35 }, 
                  x: { delay: 0.35 }, 
                  y: { duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 } 
                }}
                whileHover={{ scale: 1.025, boxShadow: "0 15px 30px rgba(0,0,0,0.04)" }}
                className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.02)] flex items-center gap-3.5 z-10 transition-all hover:border-purple-300/60"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-purple-600">Stage 2</span>
                    <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold font-sans">Vetted</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-805 leading-tight">Proof Submitted</h4>
                  <p className="text-[10px] text-slate-450 leading-snug font-medium tracking-normal">Evidence checks matched automated parameters.</p>
                </div>
              </motion.div>

              {/* FLOATING GLASS CARD 3: Client Approved */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, y: [0, -5, 0] }}
                transition={{ 
                  opacity: { delay: 0.5 }, 
                  x: { delay: 0.5 }, 
                  y: { duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.8 } 
                }}
                whileHover={{ scale: 1.025, boxShadow: "0 15px 30px rgba(0,0,0,0.04)" }}
                className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.02)] flex items-center gap-3.5 z-10 transition-all hover:border-indigo-300/60"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-indigo-600">Stage 3</span>
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold font-sans">Double Checked</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-805 leading-tight">Client Approved</h4>
                  <p className="text-[10px] text-slate-450 leading-snug tracking-normal font-medium">Sponsor manual review complete & cleared.</p>
                </div>
              </motion.div>

              {/* FLOATING GLASS CARD 4: Reward Released */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, y: [0, 5, 0] }}
                transition={{ 
                  opacity: { delay: 0.65 }, 
                  x: { delay: 0.65 }, 
                  y: { duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 } 
                }}
                whileHover={{ scale: 1.025, boxShadow: "0 15px 30px rgba(0,0,0,0.04)" }}
                className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.02)] flex items-center gap-3.5 z-10 transition-all hover:border-amber-300/60"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 shadow-xs">
                  <Coins className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-amber-600">Stage 4</span>
                    <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold font-sans">Settled</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-805 leading-tight">Reward Released</h4>
                  <p className="text-[10px] text-slate-450 leading-snug font-medium tracking-normal">USDT transaction finalized over BEP20 network.</p>
                </div>
              </motion.div>

            </div>

          </div>

        </div>
      </section>

      {/* 2. HOW IT WORKS SECTION WITH SCROLL REVEAL & GLOWING PATH CONNECTION */}
      <section className="py-24 md:py-32 bg-slate-50/40 border-y border-slate-100 relative z-10" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-20">
            <span className="text-xs text-purple-600 font-bold uppercase tracking-widest block font-sans">
              Streamlined Campaign Execution
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight font-sans">
              How It Works
            </h2>
            <p className="text-slate-500 text-sm md:text-base max-w-lg mx-auto font-sans font-medium">
              We connect brands directly with verified creators in 5 fully transparent steps.
            </p>
          </div>

          <div className="relative max-w-6xl mx-auto">
            {/* Elegant SVG Glowing flowing line behind steps on large screen layout */}
            <div className="absolute top-10 left-6 right-6 h-1 hidden md:block z-0 pointer-events-none">
              <svg className="w-full h-full overflow-visible" fill="none">
                <path 
                  d="M 12 12 Q 300 -10, 580 12 T 1140 12" 
                  stroke="url(#gradient-line)" 
                  strokeWidth="2.5" 
                  className="flowing-dash-line"
                />
                <defs>
                  <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="50%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Step Grid Cards with staggered viewport view transition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6 text-xs font-semibold relative z-10">
              {stepsData.map((step, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: idx * 0.12, type: "spring", stiffness: 100 }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="bg-white border border-slate-150 p-6 rounded-2xl shadow-xs transition-all flex flex-col justify-between group cursor-pointer hover:border-purple-200 hover:shadow-lg hover:shadow-purple-500/5"
                >
                  <div className="space-y-4 text-left">
                    <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 font-extrabold font-mono text-xs border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                      {step.num}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors font-sans tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-slate-500 font-normal leading-relaxed font-sans text-[11px]">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 3. FOR CREATORS SECTION WITH 3D PERSPECTIVE TILT */}
      <section className="py-24 md:py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10 relative" id="for-creators">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 space-y-6 text-left"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-purple-705 select-none">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Monopolize Your Reddit Reach
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-sans tracking-tight leading-[1.12]">
              Sleek Earning Flow For Reddit Creators
            </h2>
            <p className="text-slate-600 text-sm md:text-base leading-relaxed font-sans font-medium">
              Influencer Verse simplifies monetization campaigns on Reddit. Securely link your profiles, perform direct sponsor instructions, submit verification links, and withdraw US dollar payouts directly.
            </p>
            <div className="pt-2">
              <button 
                onClick={startNowAction}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-700 transition-all group cursor-pointer bg-transparent border-none p-0 focus:outline-none"
              >
                Go to Creator Panel <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* Staggered features list with perspective tilt */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {creatorFeatures.map((f, i) => {
                const Icon = f.icon;
                return (
                  <TiltCard key={i}>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="p-6 bg-white border border-slate-100 shadow-xs rounded-2xl space-y-4 hover:border-purple-200 transition-all text-left"
                    >
                      <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl w-fit border border-purple-100/50">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 block mb-1.5 font-sans tracking-tight group-hover:text-purple-600 transition-colors">
                          {f.title}
                        </h3>
                        <p className="text-slate-500 font-normal text-xs leading-relaxed font-sans">
                          {f.desc}
                        </p>
                      </div>
                    </motion.div>
                  </TiltCard>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* 4. FOR BRANDS SECTION WITH TILT ON HOVER */}
      <section className="py-24 md:py-32 bg-slate-50/40 border-t border-slate-101 z-10 relative" id="for-brands">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Brands Content left on desktop */}
            <div className="lg:col-span-8 order-2 lg:order-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                {brandFeatures.map((f, i) => (
                  <TiltCard key={i}>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="p-6 bg-white border border-slate-101 shadow-xs rounded-2xl space-y-4 hover:border-indigo-200 transition-all"
                    >
                      <div className="p-2.5 bg-indigo-50 text-indigo-605 rounded-xl w-fit border border-indigo-100/50">
                        <f.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-805 block mb-1.5 font-sans tracking-tight">
                          {f.title}
                        </h3>
                        <p className="text-slate-500 font-normal text-xs leading-relaxed font-sans">
                          {f.desc}
                        </p>
                      </div>
                    </motion.div>
                  </TiltCard>
                ))}
              </div>
            </div>

            {/* Brands Headline right on desktop */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-4 order-1 lg:order-2 space-y-6 text-left"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-601">
                <Briefcase className="w-3.5 h-3.5 text-indigo-505" /> Direct Target Campaigns
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 font-sans tracking-tight leading-tight">
                Vetted Campaign Deployments For Brands
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed font-normal">
                Optimize your target marketing. Pre-fund verified campaign limits in USDT securely, configure clear engagement rules, review direct evidence, and confirm payouts directly to creators.
              </p>
              <div className="pt-2">
                <button 
                  onClick={() => onNavigate('client-login')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-all group cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                >
                  Enter Brand Portal <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* 5. TRUST & STATS SECTION WITH COMPREHENSIVE FADE-UP STAGGER */}
      <section className="py-24 md:py-32 bg-white border-t border-slate-100 relative z-10" id="trust-preview">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-3 mb-20">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest block font-sans">
              Verifiable Platform Transparency
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-sans tracking-tight leading-[1.1]">
              Platform Statistics Center
            </h2>
            <p className="text-slate-500 text-sm md:text-base max-w-md mx-auto font-sans font-medium">
              Real-time platform performance data compiled directly from the active verification databases.
            </p>
          </div>

          {/* Staggered Animated metrics count */}
          {users.length === 0 && completedSubmissions.length === 0 && totalEarningsDistributed === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-500 text-sm font-semibold max-w-lg mx-auto">
              Live platform metrics update as campaigns grow.
            </div>
          ) : (
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.12 } }
              }}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto text-left"
            >
              
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 25 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
                }}
                className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/5 transition-all cursor-pointer"
              >
                <Users className="w-5 h-5 text-purple-600 mb-4" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Verified Creators</span>
                <AnimatedCounter value={legitimateCreators.length} />
              </motion.div>

              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 25 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
                }}
                className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-indigo-600 mb-4" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Completed Campaigns</span>
                <AnimatedCounter value={completedSubmissions.length} />
              </motion.div>

              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 25 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
                }}
                className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-500/5 transition-all cursor-pointer"
              >
                <DollarSign className="w-5 h-5 text-emerald-650 mb-4" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Paid Creator Rewards</span>
                <AnimatedCounter value={totalEarningsDistributed} isCurrency={true} />
              </motion.div>

              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 25 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
                }}
                className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5 transition-all cursor-pointer"
              >
                <Globe className="w-5 h-5 text-blue-600 mb-4" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Active Brands Registered</span>
                <AnimatedCounter value={legitimateClients.length} />
              </motion.div>

            </motion.div>
          )}

          {/* Live Recent Payouts with slide-in */}
          {withdrawals.filter(w => w.status === 'Approved').length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-12 max-w-2xl mx-auto bg-slate-50/30 border border-slate-150 rounded-2xl overflow-hidden shadow-xs text-left"
            >
              <div className="p-4 bg-slate-50/80 border-b border-slate-150 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">Verified Cleared Settlements</span>
                <span className="text-[10px] text-emerald-650 font-extrabold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Settled Real-Time
                </span>
              </div>
              <div className="p-4 divide-y divide-slate-100 font-mono text-[11px] text-slate-600">
                {withdrawals
                  .filter(w => w.status === 'Approved')
                  .slice(0, 3)
                  .map((w, idx) => {
                    const rawName = w.userFullName || w.userId || 'Creator';
                    const nameSplit = rawName.split(' ');
                    const maskedName = nameSplit[0] + (nameSplit[1] ? ' ' + nameSplit[1].charAt(0) + '***' : ' ***');
                    return (
                      <div key={w.id || idx} className="py-2.5 flex justify-between items-center bg-transparent">
                        <span className="font-bold text-slate-800">{maskedName}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-600">${Number(w.amount || 0).toFixed(2)} USDT</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(w.requestedAt || Date.now()).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

        </div>
      </section>

      {/* 6. LEADERBOARD PREVIEW SECTION WITH SLIDEOUTS & SHINE EFFECT */}
      <section className="py-24 md:py-32 bg-slate-50/30 border-t border-slate-100 relative z-10" id="leaderboard-preview">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          <div className="text-center space-y-3 mb-20">
            <span className="text-xs text-purple-600 font-bold uppercase tracking-widest block font-sans">
              Top Earnings Rankings
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-sans tracking-tight leading-none">
              Creator Standings
            </h2>
            <p className="text-slate-550 text-sm max-w-sm mx-auto font-sans font-medium">
              See verified creators earning real campaign rewards over our platform network.
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-white border border-slate-150 rounded-2xl p-6 md:p-8 shadow-xs relative overflow-hidden"
          >
            {leaderboardList.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs font-semibold italic">
                Active leaderboards will display as users generate verified payouts.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex border-b border-slate-100 pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                  <div className="w-12 text-center">Rank</div>
                  <div className="flex-1 pl-4">Creator Name</div>
                  <div className="w-32 text-right">Total Earned</div>
                </div>

                <div className="divide-y divide-slate-50 text-sm font-semibold text-slate-800">
                  {leaderboardList.map((item, idx) => {
                    const rank = idx + 1;
                    const rankMedal = `#${rank}`;
                    const isTopOne = rank === 1;
                    
                    return (
                      <motion.div 
                        key={item.id} 
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: idx * 0.1 }}
                        whileHover={{ scale: 1.012, x: 5, backgroundColor: "rgba(99,102,241,0.01)" }}
                        className={`py-3.5 flex items-center justify-between text-left relative overflow-hidden group rounded-lg ${
                          isTopOne ? 'bg-amber-50/10 border-l-2 border-amber-400 pl-1' : ''
                        }`}
                      >
                        {/* Premium custom diagonal shimmer sweep effect for Top Earner Card */}
                        {isTopOne && (
                          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-premium-shine pointer-events-none" />
                        )}

                        {/* Rank indicator with special badge highlights */}
                        <div className="w-12 text-center font-bold font-mono">
                          {isTopOne ? (
                            <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded font-sans uppercase font-extrabold tracking-wider animate-pulse">
                              👑 {rankMedal}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">{rankMedal}</span>
                          )}
                        </div>

                        {/* Avatar & Display Name */}
                        <div className="flex-1 flex items-center gap-3 pl-4">
                          <Avatar fullName={item.fullName} avatarUrl={item.avatarUrl} sizeClass="w-8 h-8" />
                          <span className={`font-bold block ${isTopOne ? 'text-slate-905 font-extrabold' : 'text-slate-800'}`}>
                            {item.fullName}
                          </span>
                        </div>

                        {/* Earnings */}
                        <div className="w-32 text-right font-mono font-bold text-emerald-600">
                          ${(item.totalEarned || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>

        </div>
      </section>

      {/* 7. DISCORD COMMUNITY CTA WITH SOFT PULSATING BORDER & FLOATING ICON */}
      <section className="py-20 md:py-24 bg-white border-t border-slate-100 relative z-10" id="discord-cta">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-indigo-50/15 border border-indigo-100/50 p-8 md:p-14 rounded-[24px] text-center space-y-6 relative overflow-hidden animate-border-pulse"
          >
            {/* Soft pulsing structural background indicator glow */}
            <div className="absolute -top-12 -left-12 w-40 h-40 bg-indigo-400/5 blur-3xl rounded-full" />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-purple-400/5 blur-3xl rounded-full" />

            {/* Suspended floating Discord identity box */}
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md"
            >
              <DiscordIcon className="w-5 h-5" />
            </motion.div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#5865F2] font-sans tracking-tight leading-[1.15]">
              Join Our Partner Discord Community
            </h2>
            <p className="text-slate-600 text-sm max-w-2xl mx-auto leading-relaxed font-sans font-medium">
              Interact directly with active sponsors, campaign validators, and top earners. Swap strategies, check guidelines details, or resolve account issues instantly.
            </p>
            <div className="pt-2">
              <a 
                href="https://discord.gg/fFPT58H9kd" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all duration-350 cursor-pointer font-sans select-none"
              >
                Launch Community Invitation
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 8. FAQ ACCORDION SECTION */}
      <section className="py-24 md:py-32 bg-slate-50/40 border-t border-slate-100 relative z-10" id="faq-preview">
        <div className="max-w-4xl mx-auto px-4">
          
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs text-purple-600 font-bold uppercase tracking-widest block font-sans">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 font-sans tracking-tight leading-[1.1]">
              Information Desk
            </h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto font-sans font-medium">
              We have compiled key answers to help you navigate our Reddit campaign ecosystem.
            </p>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto text-left">
            {faqs.map((f, i) => {
              const isOpen = activeFaq === i;
              return (
                <div 
                  key={i} 
                  className="bg-white border border-slate-150 rounded-2xl overflow-hidden transition-all duration-300"
                >
                  <button 
                    onClick={() => setActiveFaq(isOpen ? null : i)}
                    className="w-full flex justify-between items-center p-5 text-left font-bold text-xs sm:text-sm text-slate-850 focus:outline-none cursor-pointer hover:bg-slate-50/40 transition-colors"
                  >
                    <span>{f.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>
                  
                  {isOpen && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="px-5 pb-5 pt-0 border-t border-slate-50 text-xs text-slate-500 font-normal leading-relaxed"
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

      {/* 9. FINAL CTA SECTION WITH EXPANDING TEXT SHIMMER */}
      <section className="py-24 md:py-32 bg-white border-t border-slate-100 text-center relative z-10" id="final-cta">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 font-sans tracking-tight leading-[1.1] max-w-3xl mx-auto">
            Ready to Begin Earning Reddit Campaign Rewards?
          </h2>

          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-sans font-medium">
            Register your profile, connect your Reddit account format, claim suitable sponsor campaigns, and claim USDT payments securely.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-4">
            <MagneticButton 
              onClick={startNowAction}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all hover:bg-purple-600 duration-300"
            >
              Start Earning Now <ArrowRight className="w-4 h-4 text-purple-450" />
            </MagneticButton>
            
            <MagneticButton 
              onClick={() => onNavigate('client-login')}
              className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-205 text-slate-700 hover:text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs flex items-center justify-center bg-gradient-to-b from-white to-slate-50/50 duration-300"
            >
              Client Portal
            </MagneticButton>
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
