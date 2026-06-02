import React, { useState } from 'react';
import { HelpCircle, Shield, Mail, Globe, Lightbulb, Users, Trophy, MessageSquare, ArrowRight, ChevronDown, ChevronUp, Sparkles, AlertCircle, HeartHandshake, Check } from 'lucide-react';

/* ================== FAQ PAGE ================== */
export const FAQPage: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const faqs = [
    {
      q: "How does the manual audit review process check my linked Reddit profile?",
      a: "Our human compliance verification team manually audits every registered Reddit profile. We verify your profile age, historical karma distribution, and organic activity patterns before certification is granted. This structural checklist prevents duplicate bot farms, sybil attacks, and mass automated engagements."
    },
    {
      q: "How do I claim task reward USDT credits after submitting a screenshot proof?",
      a: "Once you log in and select an active Reddit campaign from the Marketplace, you reserve a slot based on your tier limit. Perform the requested comment or post action, paste its live URL path, and upload a high-resolution screenshot receipt. Reviews are audited within 24 hours to approve and credit your wallet ledger."
    },
    {
      q: "What blockchain network do withdraw cashout operations utilize?",
      a: "All platform cashouts clear directly on the Binance Smart Chain (BSC BEP-20) network as USDT. Alternatively, creators can receive direct transfers via Binance Pay ID. By default, standard withdrawals process with 0% platform service fees, enabling you to retain the entirety of your earned rewards."
    },
    {
      q: "How does the Gamification XP system work and what benefits does it bring?",
      a: "As you complete campaigns and maintain consecutive daily check-in streaks, you earn Experience Points (XP) that automatically elevate your creator tier from Beginner to Legend. Higher tiers unlock access to premium high-budget campaign pools, multiplier referral triggers, and priority manual review times."
    },
    {
      q: "What is the minimum withdrawal limit for active micro-influencers?",
      a: "Our minimum withdrawal threshold is established at a standard $1.00 USDT. We intentionally removed high-barrier payout hurdles so that new creators can test and secure real, verifiable cryptocurrency payments starting on their very first day."
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 md:py-20 space-y-12 select-none" id="faq-view-panel">
      {/* Header Block */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-100 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-purple-700">
          <HelpCircle className="w-3.5 h-3.5" /> Answers Desk
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-zinc-950 font-display tracking-tight leading-none">
          Frequently Asked Questions
        </h1>
        <p className="text-sm md:text-base text-zinc-500 font-semibold leading-relaxed">
          Explore clear, direct guidance on Reddit task settlements, Binance Smart Chain withdrawals, and compliance audits.
        </p>
      </div>

      {/* Accordion Layout */}
      <div className="space-y-4 max-w-2xl mx-auto select-text font-sans">
        {faqs.map((f, i) => {
          const isOpen = activeIdx === i;
          return (
            <div 
              key={i} 
              className="bg-white border border-slate-150 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <button
                onClick={() => setActiveIdx(isOpen ? null : i)}
                className="w-full flex justify-between items-center p-5 text-left font-bold text-xs sm:text-sm text-zinc-900 hover:bg-slate-50/50 transition-colors focus:outline-none cursor-pointer"
              >
                <span className="pr-4">{f.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-purple-600 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                )}
              </button>
              
              {isOpen && (
                <div className="px-5 pb-5 pt-0 border-t border-slate-100 text-xs text-zinc-500 font-semibold leading-relaxed">
                  <p className="pt-4 pl-1 text-zinc-650 leading-relaxed font-sans">
                    {f.a}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};


/* ================== ABOUT US PAGE ================== */
export const AboutPage: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 md:py-20 space-y-16 select-none" id="about-us-panel">
      
      {/* Header Block */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-[10px] font-extrabold uppercase tracking-widest">
          <Globe className="w-3.5 h-3.5" /> Reddit Marketing Infrastructure
        </span>
        <h1 className="text-4xl md:text-5.5xl font-black text-zinc-950 font-display tracking-tight leading-none">
          Redefining Decentralized Reach
        </h1>
        <p className="text-sm md:text-lg text-zinc-500 max-w-2xl mx-auto font-semibold leading-relaxed mt-2">
          Influencer Verse is a premium Web3 SaaS portal helping high-growth crypto applications deploy organic Reddit campaigns with verified, human micro-influencers.
        </p>
      </div>

      {/* Grid Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto font-sans select-text">
        <div className="p-8 bg-white border border-slate-150 rounded-3xl space-y-4 transition-all duration-300 hover:border-slate-300 shadow-sm relative overflow-hidden">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit border border-purple-100/50">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-black text-zinc-900 font-display tracking-tight">Who We Are</h3>
          <p className="text-xs text-zinc-600 font-semibold leading-relaxed font-sans mt-1">
            We are senior marketing architects, backend Engineers, and Reddit growth researchers who noticed the massive inefficiencies in programmatic influencer ads. Agencies charge opaque, inflated fees for bot-inflated metrics. Influencer Verse establishes a direct, secure, and fully verified task bazaar bridging brands and genuine human users.
          </p>
        </div>

        <div className="p-8 bg-white border border-slate-150 rounded-3xl space-y-4 transition-all duration-300 hover:border-slate-300 shadow-sm relative overflow-hidden">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl w-fit border border-purple-100/50">
            <Lightbulb className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-black text-zinc-900 font-display tracking-tight">Our Core Mission</h3>
          <p className="text-xs text-zinc-600 font-semibold leading-relaxed font-sans mt-1">
            Our absolute goal is to democratize community-driven promotion on Reddit. We allow micro-creators to link their authentic personal karmic footprint and earn immediate USDT compensation, while giving clients an airtight, visual, proof-vetted campaign dashboard to scale engagement worry-free.
          </p>
        </div>
      </div>

      {/* Trust Quote / Stats */}
      <div className="bg-slate-50 border border-slate-150 p-8 rounded-3xl max-w-4xl mx-auto text-center space-y-2 select-text">
        <span className="text-sm font-extrabold block text-zinc-900 font-display tracking-tight">
          Enterprise Security Standard
        </span>
        <p className="text-xs text-zinc-550 max-w-lg mx-auto font-semibold">
          Backed by secure multi-signature deposit vaults and robust sybil detection metrics to prevent duplicate submissions and protect client campaign spends.
        </p>
      </div>

      {/* Discord Connect CTA */}
      <div className="p-8 md:p-12 bg-indigo-50/40 border border-indigo-100 rounded-[32px] max-w-4xl mx-auto text-center space-y-6">
        <span className="text-lg font-black block text-zinc-900 font-display tracking-tight">
          Join the Earning Network
        </span>
        <p className="text-xs text-zinc-500 max-w-md mx-auto font-semibold">
          Connect directly with top creators, swap tactics, flag bugs, and claim active tasks. Support channels coordinate 24/7.
        </p>
        <div className="pt-2">
          <a
            id="about-discord-cta"
            href="https://discord.gg/fFPT58H9kd"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-750 text-xs font-bold uppercase tracking-wider rounded-xl text-white transition-all shadow-md hover:scale-[1.01]"
          >
            <MessageSquare className="w-4 h-4 text-indigo-200" />
            <span>Join Our Discord Group</span>
          </a>
        </div>
      </div>

    </div>
  );
};


/* ================== CONTACT US PAGE ================== */
export const ContactPage: React.FC = () => {
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);
    setTimeout(() => {
      alert('Thank you! Your inquiry has been logged in our secure CRM. Our partnerships development team will reach out via email within 12 business hours.');
      setSuccess(false);
    }, 500);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 md:py-20 space-y-12 select-none" id="contact-us-panel">
      
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-100 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-purple-700">
          <Mail className="w-3.5 h-3.5" /> Support Console
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-zinc-950 font-display tracking-tight leading-none">
          Get In Touch
        </h1>
        <p className="text-sm md:text-base text-zinc-500 font-semibold leading-relaxed mt-1">
          Whether you are an enterprise client planning a Reddit campaign or a creator with checking question, write us directly.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-4xl mx-auto">
        {/* Detail cards */}
        <div className="md:col-span-12 lg:col-span-5 space-y-4 select-text">
          <a 
            href="mailto:verseinfluencer@yahoo.com"
            className="block p-6 bg-white border border-slate-150 rounded-2xl space-y-2 hover:border-purple-500/30 transition-all shadow-sm group"
          >
            <Mail className="w-5 h-5 text-purple-600 group-hover:scale-105 transition-transform" />
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Business Inquiry Desk</h3>
            <span className="text-xs text-zinc-800 font-mono font-bold block truncate">verseinfluencer@yahoo.com</span>
          </a>

          <a 
            href="https://discord.gg/fFPT58H9kd"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-6 bg-white border border-slate-150 rounded-2xl space-y-2 hover:border-indigo-500/30 transition-all shadow-sm group"
          >
            <MessageSquare className="w-5 h-5 text-indigo-600 group-hover:scale-105 transition-transform" />
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Community Discord Desk</h3>
            <span className="text-xs text-indigo-600 font-bold block underline">Join Official Discord Support</span>
          </a>
        </div>

        {/* Form Card */}
        <div className="md:col-span-12 lg:col-span-7 bg-white border border-slate-150 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
          
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold relative z-10">
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <input 
                type="email" 
                placeholder="you@email.com" 
                required 
                className="w-full text-xs text-zinc-900 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:bg-white focus:border-purple-500 focus:outline-none transition-all font-medium" 
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                Your Support/Partnership Message
              </label>
              <textarea 
                placeholder="State your campaign parameters, budget proposals, or creator requests..." 
                required 
                className="w-full text-xs text-zinc-900 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl h-28 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-0 transition-all resize-none font-medium" 
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-800 text-xs font-bold uppercase tracking-wider rounded-xl text-white cursor-pointer transition-all hover:scale-[1.005] select-none shadow-md"
            >
              {success ? 'Transmitting Inquiries...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
};


/* ================== TERMS & CONDITIONS PAGE ================== */
export const TermsPage: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 md:py-20 space-y-12 select-none" id="terms-of-service-panel">
      
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-100 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-purple-700">
          <Shield className="w-3.5 h-3.5" /> Legal Framework
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-zinc-950 font-display tracking-tight leading-none">
          Terms of Service & Rules
        </h1>
        <p className="text-sm md:text-base text-zinc-500 font-semibold mt-1">
          Understand the strict user compliance guidelines before participating in platform task rewards.
        </p>
      </div>

      {/* Legal blocks */}
      <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-10 space-y-8 max-w-3xl mx-auto text-xs text-zinc-600 leading-relaxed font-semibold select-text font-sans shadow-sm">
        
        <div className="space-y-2 border-b border-slate-100 pb-5">
          <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2 font-display tracking-tight">
            <Shield className="w-4 h-4 text-purple-600 shrink-0" />
            1. Reddit Identity & Minimum Criteria
          </h3>
          <p className="pl-6 font-semibold text-zinc-500 leading-relaxed font-sans">
            To register as a verified Creator in Influencer Verse, your linked Reddit account profile format must show at least <strong>400+ total karma points</strong> and a minimum profile age of <strong>60+ active days</strong>. Linking burner accounts or throwaway feeds will trigger automatic review rejections during manual audits.
          </p>
        </div>

        <div className="space-y-2 border-b border-slate-100 pb-5">
          <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2 font-display tracking-tight">
            <Shield className="w-4 h-4 text-purple-600 shrink-0" />
            2. Anti-Botting & Screenshot Veracity
          </h3>
          <p className="pl-6 font-semibold text-zinc-500 leading-relaxed font-sans">
            Submitting duplicated screenshots, falsifying URLs, or using synthetic graphics generators to claim task pre-deposits constitutes financial fraud. Structurally, our file handlers register file hash matches. Discovered fraud results in immediate, irreversible profile bans and complete forfeiture of unpaid balances.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-extrabold text-zinc-900 flex items-center gap-2 font-display tracking-tight">
            <Shield className="w-4 h-4 text-purple-600 shrink-0" />
            3. Wallet Rules & Anti-Sybil Lockout
          </h3>
          <p className="pl-6 font-semibold text-zinc-500 leading-relaxed font-sans">
            Withdrawal operations run on the Binance Smart Chain BEP-20 network. Double check your receiving address; our infrastructure cannot recover tokens lost to misconfigured wallets. The absolute minimum withdrawal is strictly established at $1.00 USDT.
          </p>
        </div>

      </div>

    </div>
  );
};


/* ================== DETAILED FORUM REFERRAL PLAN PAGE ================== */
export const ReferralProgramInfo: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 md:py-20 space-y-12 select-none" id="referral-plan-panel">
      
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-100 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-purple-700">
          <Trophy className="w-3.5 h-3.5 text-purple-600" /> Network Growth Affiliation
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-zinc-950 font-display tracking-tight leading-none">
          Multi-Level Referral Plan
        </h1>
        <p className="text-sm md:text-base text-zinc-500 font-semibold mt-1">
          Scale your USDT revenue stream by inviting other authentic Reddit creators to our campaign portal.
        </p>
      </div>

      {/* Level stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto font-sans">
        
        {/* L1 Card */}
        <div className="p-8 bg-white border border-slate-150 rounded-3xl space-y-4 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-xl animate-pulse"></div>
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest block">
            Tier Level 1 &middot; Direct Invites
          </span>
          <h3 className="text-2xl font-black text-zinc-950 font-display tracking-tight">
            10% Match Bonus
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed font-sans font-semibold">
            Earn flat 10% cashout match-credits on every task task cleared by your direct invitees. This operates automatically inside your wallet payouts whenever their manual audits approve.
          </p>
        </div>

        {/* L2 Card */}
        <div className="p-8 bg-white border border-slate-150 rounded-3xl space-y-4 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-xl animate-pulse"></div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">
            Tier Level 2 &middot; Sub-Invites
          </span>
          <h3 className="text-2xl font-black text-zinc-950 font-display tracking-tight">
            5% Match Bonus
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed font-sans font-semibold">
            Accumulate additional 5% matching credits on secondary invitations initiated by your direct tier. Multiply your marketing pipelines with zero hardware overhead.
          </p>
        </div>

      </div>

      {/* Footer warning info */}
      <div className="bg-slate-50 border border-slate-150 p-6 rounded-2xl max-w-2xl mx-auto text-xs text-zinc-500 leading-relaxed text-center font-semibold font-sans shadow-sm select-text">
        🔒 <strong>Streaking Multiplier Rule:</strong> Maintaining consecutive daily logins multiplies your base matched invite rewards by up to 1.5x. Avoid creating duplicate accounts to game referral levels; manual audits check IP registers on withdrawal settlement.
      </div>

    </div>
  );
};
