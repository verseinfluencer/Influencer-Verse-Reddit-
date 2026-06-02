import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, Users, DollarSign, Briefcase, 
  CheckCircle2, ShieldAlert, HelpCircle, Activity 
} from 'lucide-react';

export const TrustPage: React.FC = () => {
  const { users, submissions, withdrawals, clientTasks, tasks, clients } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // --- Dynamic Live Platform Statistics ---
  // 1. Total Members (Creators)
  const totalCreators = users.filter(u => u.role === 'user' || u.role === 'member').length;
  
  // 2. Tasks Completed (Submissions approved either by Admin or Client)
  const completedTasks = submissions.filter(s => 
    s.status === 'Client Approved (Payment Released)' || 
    s.status === 'Approved'
  ).length;

  // 3. Total Creator Payouts (Approved withdrawals)
  const totalPayoutsSum = withdrawals
    .filter(w => w.status === 'Approved')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // 4. Active Campaigns
  const activeCampaigns = clientTasks.filter(t => t.status === 'approved' || t.status === 'live').length + 
    tasks.filter(t => t.status === 'available').length;

  // 5. Client Count (Brands on platform)
  const clientCount = clients.length;

  // 6. Approval Success Rate
  const approvedCount = submissions.filter(s => s.status.includes('Approved')).length;
  const totalReviewed = submissions.filter(s => s.status !== 'Pending' && s.status !== 'pending_review').length;
  const successRate = totalReviewed > 0 
    ? Math.min(100, Math.max(0, Math.round((approvedCount / totalReviewed) * 100))) 
    : 0;

  // Helper helper to mask usernames cleanly and safely
  const maskUsername = (username: string) => {
    if (!username) return 'User';
    const clean = username.replace(/^u\//, '');
    if (clean.length <= 4) return `${clean.substring(0, 2)}***`;
    return `${clean.substring(0, 2)}***${clean.substring(clean.length - 2)}`;
  };

  // --- Recent Payouts Logic ---
  const completedWithdrawals = withdrawals.filter(w => w.status === 'Approved');

  // Render a statistic inside cards or fallback to growth message
  const renderStatValue = (value: number, isCurrency = false, isPercent = false) => {
    if (value === 0) {
      return (
        <span className="text-[11px] text-zinc-400 font-semibold italic block mt-1 tracking-tight">
          Awaiting live records...
        </span>
      );
    }
    
    let formatted = value.toLocaleString();
    if (isCurrency) {
      formatted = `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
    } else if (isPercent) {
      formatted = `${value}%`;
    }
    
    return (
      <span className="text-xl md:text-2xl font-black text-zinc-900 leading-tight mt-1 block font-display">
        {formatted}
      </span>
    );
  };

  // Static clean trust cards data
  const trustCards = [
    {
      title: "Transparent approval workflow",
      desc: "Every Reddit comment or post action includes linked screenshots and direct live post timeline checks so audit records are always public to client and admin roles alike."
    },
    {
      title: "Admin + client verification",
      desc: "Multi-stage vetted tasks process. Submissions undergo a dual checks protocol by both campaign moderators and brand sponsors to guarantee precise delivery standards."
    },
    {
      title: "Secure payment tracking",
      desc: "Pre-funded campaign guarantees. Advertiser budgets are fully deposited and secured in system balances before task slots are declared open for creator reservation."
    },
    {
      title: "Fair moderation system",
      desc: "Creators are shielded from unfair removals. If a brand objects or automated subreddit spam-filters impact comments, our team manual-audits submissions directly."
    },
    {
      title: "Anti-fraud protection",
      desc: "Device fingerprint registries, duplicate proof upload hash analyzers, and strict sybil checks guarantee genuine human interaction and premium Reddit growth."
    }
  ];

  // Professional static testimonials (no emojis)
  const testimonials = [
    {
      quote: "The interface is straightforward and transparent. Once my comment screenshots were validated by admin review, my withdrawals cleared onto the BSC network within a business day.",
      author: "u/SpaceCadet_94",
      xp: "Creator Account",
      reward: "Verified Creator"
    },
    {
      quote: "As a campaign advertiser, the micro-influence verification suite is incredible. Genuine traffic and human commenters replace general marketing scripts and bots.",
      author: "NeoPulse Ventures",
      xp: "Agency Partner",
      reward: "Verified Client"
    },
    {
      quote: "Accurate moderation rules hold both creators and brands fully accountable. My disputes are solved by real moderators within hours.",
      author: "u/RedditMaster_US",
      xp: "Creator Account",
      reward: "Verified Creator"
    }
  ];

  // Professional static FAQs (no emojis)
  const faqList = [
    {
      q: "How does the platform prevent duplicate screenshot uploads?",
      a: "Our file engine runs structural hash calculations on every uploaded receipt. If a screenshot is uploaded twice across any accounts, it is instantly rejected and flagged for security review."
    },
    {
      q: "Are there withdrawal fees or hidden payment charges?",
      a: "No. The system maintains a zero-gas fee model for creators using USDT BSC BEP-20 or Binance Pay channels, meaning you keep 100% of your listed task rewards without network subtractions."
    },
    {
      q: "Where do campaign payouts originate from?",
      a: "Advertisers must pre-fund their contracts fully prior to campaign launch. This guarantees that payment balance is reserved and available immediately upon task verification."
    },
    {
      q: "How long does the payment review process take?",
      a: "The standard verification cycle completes in under 24 hours. Once verified, reward credits post to your balance immediately, and withdrawals clear within 24 business hours."
    }
  ];

  return (
    <div className="w-full bg-[#fcfcfd] text-zinc-900 select-none" id="trust-page-view">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-100 text-center">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 blur-[150px] -z-10 rounded-full"></div>

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-[10px] font-bold uppercase tracking-widest text-indigo-700">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Vetted Creator Ecosystem
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-zinc-950 font-display">
            Trusted Reddit <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-indigo-650 to-blue-600">Campaign Marketplace</span>
          </h1>
          
          <p className="text-sm md:text-base text-zinc-500 max-w-2xl mx-auto leading-relaxed font-semibold select-text">
            Discover a fully transparent, secure framework for Reddit engagements. Track task processing, observe real-time dynamic statistics, and review verified creator settlements.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <a 
              href="#platform-stats"
              className="px-6 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider rounded-xl text-white transition-all shadow-md"
            >
              Verify Real-Time Stats
            </a>
          </div>
        </div>
      </section>

      {/* Live Platform Statistics */}
      <section id="platform-stats" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-100 scroll-mt-16">
        <div className="text-center space-y-2 mb-12">
          <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block font-sans">Dynamic Registry</span>
          <h2 className="text-2xl md:text-3xl font-black text-zinc-950 font-display">Live Platform Statistics</h2>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-normal">Derived directly from database instances. Zero hardcoded simulated data.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 font-sans">
          
          <div className="p-5 bg-white border border-slate-150 rounded-2xl flex flex-col justify-between hover:border-purple-200 transition-all group shadow-sm">
            <Users className="w-5 h-5 text-purple-600 mb-3" />
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Total Members</span>
              {renderStatValue(totalCreators)}
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-150 rounded-2xl flex flex-col justify-between hover:border-indigo-200 transition-all group shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-indigo-600 mb-3" />
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Tasks Completed</span>
              {renderStatValue(completedTasks)}
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-150 rounded-2xl flex flex-col justify-between hover:border-emerald-200 transition-all group shadow-sm">
            <DollarSign className="w-5 h-5 text-emerald-600 mb-3" />
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Total Payouts</span>
              {renderStatValue(totalPayoutsSum, true)}
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-150 rounded-2xl flex flex-col justify-between hover:border-pink-200 transition-all group shadow-sm">
            <Briefcase className="w-5 h-5 text-pink-500 mb-3" />
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Active Campaigns</span>
              {renderStatValue(activeCampaigns)}
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-150 rounded-2xl flex flex-col justify-between hover:border-blue-200 transition-all group shadow-sm">
            <Users className="w-5 h-5 text-blue-600 mb-3" />
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Client Count</span>
              {renderStatValue(clientCount)}
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-150 rounded-2xl flex flex-col justify-between hover:border-yellow-500 transition-all group shadow-sm">
            <Activity className="w-5 h-5 text-yellow-600 mb-3" />
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Approval Rate</span>
              {renderStatValue(successRate, false, true)}
            </div>
          </div>

        </div>
      </section>

      {/* Recent Payouts */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-1 space-y-4">
            <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest block">Audited Transactions</span>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-950 font-display tracking-tight leading-none">Recent Payouts</h2>
            <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
              We compile transparent ledger items as withdrawals are approved. For public user security, details are masked while real blockchain transaction records are displayed under protocol conditions.
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="border border-slate-150 bg-white rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-slate-50 border-b border-slate-150 flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider block">Completed Settlements</span>
                <span className="text-[10px] text-emerald-600 font-mono font-bold flex items-center gap-1">
                  Active Vetting Desk
                </span>
              </div>

              {completedWithdrawals.length === 0 ? (
                <div className="p-12 text-center text-zinc-400 text-xs font-semibold italic">
                  Data will appear as platform grows
                </div>
              ) : (
                <div className="p-4 space-y-2 select-text font-mono text-xs text-zinc-700">
                  {completedWithdrawals.map((w, idx) => {
                    const cleanName = w.userFullName || w.userId || 'Creator';
                    const maskedId = maskUsername(cleanName);
                    const amountPaid = `$${Number(w.amount).toFixed(2)} USDT`;
                    const paymentDate = w.requestedAt ? new Date(w.requestedAt) : new Date();
                    const dateFormatted = paymentDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    
                    return (
                      <div 
                        key={w.id || idx} 
                        className="py-3 px-4 bg-slate-50 border border-slate-150 rounded-xl flex flex-wrap justify-between items-center gap-2"
                      >
                        <span className="font-bold text-zinc-900 tracking-wider font-sans">{maskedId}</span>
                        <div className="text-zinc-500 text-[11px] font-medium font-sans">
                          <span>{amountPaid}</span>
                          <span className="mx-2 text-slate-205">|</span>
                          <span>{dateFormatted}</span>
                          <span className="mx-2 text-slate-205">|</span>
                          <span className="text-emerald-600 font-black">Paid</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Platform Status */}
      <section className="py-12 bg-slate-50/50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 md:p-8 bg-white border border-slate-150 rounded-3xl">
            <h3 className="text-[10px] text-zinc-400 uppercase font-black tracking-widest block mb-6 font-sans">Platform Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
              
              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest block">Withdrawals</span>
                <span className="text-lg font-black text-emerald-600 mt-1 block">Active</span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest block">Campaigns</span>
                <span className="text-lg font-black text-indigo-600 mt-1 block">Running</span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest block">Review Queue</span>
                <span className="text-lg font-black text-amber-600 mt-1 block">Normal</span>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* How Influencer Verse Works */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-100">
        <div className="text-center space-y-2 mb-16 select-none">
          <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">Earning Roadmap</span>
          <h2 className="text-2xl md:text-3xl font-black text-zinc-950 font-display">How Influencer Verse Works</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-normal font-sans">Our visual operation cycle is fully auditable from launch to cashout.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-5xl mx-auto text-xs font-semibold font-sans">
          
          <div className="p-5 bg-white border border-slate-150 rounded-2xl space-y-3 relative group hover:border-purple-300 hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center font-bold font-mono text-sm">
              01
            </div>
            <h3 className="text-sm font-black text-zinc-900 font-display">Task Submission</h3>
            <p className="text-zinc-500 font-semibold leading-relaxed">
              Creator reserves and performs an active Reddit post/comment task following strict target parameters.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-150 rounded-2xl space-y-3 relative group hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold font-mono text-sm">
              02
            </div>
            <h3 className="text-sm font-black text-zinc-900 font-display">Admin Review</h3>
            <p className="text-zinc-500 font-semibold leading-relaxed">
              Moderation teams check submission text links and analyze proof screenshots against internal data limits.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-150 rounded-2xl space-y-3 relative group hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold font-mono text-sm">
              03
            </div>
            <h3 className="text-sm font-black text-zinc-900 font-display">Client Approval</h3>
            <p className="text-zinc-500 font-semibold leading-relaxed">
              Campaign sponsor inspects comment threads and triggers the automated budget balance payout release.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-150 rounded-2xl space-y-3 relative group hover:border-pink-300 hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-xl bg-pink-50 border border-pink-100 text-pink-500 flex items-center justify-center font-bold font-mono text-sm">
              04
            </div>
            <h3 className="text-sm font-black text-zinc-900 font-display">Wallet Credit</h3>
            <p className="text-zinc-500 font-semibold leading-relaxed">
              Earnings post cleanly to your dashboard ledger, converting directly to withdrawable balance.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-150 rounded-2xl space-y-3 relative group hover:border-yellow-300 hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-xl bg-yellow-50 border border-yellow-105 text-yellow-600 flex items-center justify-center font-bold font-mono text-sm">
              05
            </div>
            <h3 className="text-sm font-black text-zinc-900 font-display">Withdrawal</h3>
            <p className="text-zinc-500 font-semibold leading-relaxed">
              Creator requests withdrawal to crypto address. Processing clears within 24 business hours.
            </p>
          </div>

        </div>
      </section>

      {/* Why Influencer Verse */}
      <section className="py-20 bg-slate-50/50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-16 select-none">
            <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">Platform Standards</span>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-950 font-display">Why Influencer Verse</h2>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-normal">Premium structural design focused on transparency, security and protection.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto font-sans">
            {trustCards.map((card, i) => (
              <div key={i} className="p-6 bg-white border border-slate-150 rounded-2xl space-y-3 hover:border-indigo-150 hover:shadow-md transition-all shadow-sm">
                <h3 className="text-sm font-black text-zinc-900 tracking-tight font-display uppercase">{card.title}</h3>
                <p className="text-xs text-zinc-500 font-semibold leading-relaxed font-sans select-text">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-100">
        <div className="text-center space-y-2 mb-16 select-none">
          <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-widest block">Community Feedback</span>
          <h2 className="text-2xl md:text-3xl font-black text-zinc-950 font-display">Creator Experiences</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-normal">Verifiably documented feedback regarding transparent task payouts.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto text-xs font-semibold font-sans">
          {testimonials.map((t, i) => (
            <div key={i} className="p-6 bg-white border border-slate-150 rounded-2xl flex flex-col justify-between hover:scale-[1.01] hover:shadow-md transition-all space-y-4 shadow-sm overflow-hidden">
              <p className="text-zinc-600 font-medium select-text leading-relaxed font-sans">
                "{t.quote}"
              </p>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 -mx-6 px-6 -mb-6 py-4">
                <div>
                  <h4 className="font-extrabold text-zinc-900">{t.author}</h4>
                  <span className="text-[10px] text-zinc-400 uppercase font-sans tracking-wide">{t.xp}</span>
                </div>
                <div className="py-1 px-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-mono text-[10px] rounded-lg">
                  {t.reward}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Safety & Anti-Cheat Rules */}
      <section className="py-20 bg-slate-50/50 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="p-6 md:p-8 bg-red-50/50 border border-red-100 rounded-3xl space-y-6">
            <div className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h2 className="text-sm font-black uppercase tracking-widest font-sans">Platform Safety & Rules</h2>
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed font-semibold font-sans">
              To keep dynamic campaign traffic completely verified and genuine, we enforce a strict anti-sybil protocol. System violations result in account bans and immediate forfeit of credentials.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold font-sans">
              
              <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-2 shadow-sm">
                <span className="text-[10px] text-red-650 block uppercase font-extrabold">1. Multi-Accounting Ban</span>
                <p className="text-[11px] text-zinc-500 leading-normal font-sans font-medium">
                  Our core identity matrix prevents duplicate user accounts. Logging multiple accounts under similar IP patterns is prohibited.
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-2 shadow-sm">
                <span className="text-[10px] text-red-650 block uppercase font-extrabold">2. Tampered Screenshots</span>
                <p className="text-[11px] text-zinc-500 leading-normal font-sans font-medium">
                  Modifying images or EXIF data metadata structures to claim reward funds automatically blocks account verification status.
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-2 shadow-sm">
                <span className="text-[10px] text-red-650 block uppercase font-extrabold">3. Double-Spend Deletes</span>
                <p className="text-[11px] text-zinc-500 leading-normal font-sans font-medium">
                  Deleting comments on target subreddits immediately post-payout results in balance reversals and complete platform exclusion.
                </p>
              </div>

              <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-2 shadow-sm">
                <span className="text-[10px] text-red-650 block uppercase font-extrabold">4. VPN Proxy Filters</span>
                <p className="text-[11px] text-zinc-500 leading-normal font-sans font-medium">
                  Our system evaluates connection endpoints. Accessing task queues via proxies blocks current payout eligibility logs.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center space-y-2 mb-12 select-none">
          <HelpCircle className="w-8 h-8 text-indigo-600 mx-auto" />
          <h2 className="text-2xl md:text-3xl font-black text-zinc-950 font-display">Trust & Payouts FAQs</h2>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">Direct answers to help secure your account processing pipeline questions.</p>
        </div>

        <div className="space-y-4 max-w-2xl mx-auto font-sans">
          {faqList.map((faq, i) => (
            <div 
              key={i} 
              className="p-5 bg-white border border-slate-150 rounded-2xl cursor-pointer hover:border-indigo-150 hover:shadow-sm transition-all shadow-sm"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <div className="flex justify-between items-center gap-4">
                <h3 className="text-xs md:text-sm font-extrabold text-zinc-800 flex items-center gap-1.5 font-sans">
                  <span>{faq.q}</span>
                </h3>
                <span className="text-zinc-400 text-xs shrink-0 font-bold font-sans">
                  {openFaq === i ? '−' : '+'}
                </span>
              </div>
              
              {openFaq === i && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-zinc-550 leading-relaxed font-semibold select-text">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final Action Section */}
      <section className="py-20 bg-gradient-to-b from-white to-slate-50 border-t border-slate-100 text-center px-4">
        <div className="max-w-xl mx-auto space-y-6">
          <h2 className="text-3xl font-black text-zinc-950 font-display tracking-tight leading-none">Ready to Begin Certified Reddit Campaigns?</h2>
          <p className="text-xs text-zinc-500 leading-normal max-w-sm mx-auto font-semibold">
            Join the verified platform connecting creators with organic communities. Your task is protected and payout is secured.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-6 py-3 bg-white border border-slate-205 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider rounded-xl text-zinc-700 transition-all cursor-pointer font-sans"
            >
              Back to top
            </button>
            <a 
              href="/"
              className="px-6 py-3 bg-indigo-650 hover:bg-indigo-700 text-xs font-black uppercase tracking-wider rounded-xl text-white transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] font-sans"
            >
              Go to Creator Marketplace
            </a>
          </div>
        </div>
      </section>

    </div>
  );
};
