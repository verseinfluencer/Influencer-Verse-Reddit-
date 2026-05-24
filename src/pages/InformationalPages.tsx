import React from 'react';
import { HelpCircle, Shield, Mail, Globe, Lightbulb, Users, Trophy, MessageSquare } from 'lucide-react';

/* ================== FAQ PAGE ================== */
export const FAQPage: React.FC = () => {
  const faqs = [
    {
      q: "How does the manual audit review process check my linked Reddit profile?",
      a: "Our compliance reviewers manually examine your registered Reddit account during the approval checklist. They review your karma stats, profile age metrics, and history of authenticity. This prevents double-spend duplicates, botting, and spamming."
    },
    {
      q: "How do I claim task reward USDT credits after submitting a screenshot proof?",
      a: "Browse the Marketplace, select an active Reddit campaign, reserve your slot, and follow guidelines. Once completed, insert your comments URL link and upload a clear screenshot proof. Reviews take up to 24 hours to credit your available wallet balance."
    },
    {
      q: "What blockchain network do withdraw cashout operations utilize?",
      a: "Cashouts process strictly on the Binance Smart Chain (BSC BEP-20) network. Alternatively, you can select Binance Pay ID cashout. Standard transactions carry 0% system network transaction processing fees. Verify addresses carefully!"
    },
    {
      q: "How does the Gamification XP system work and what benefits does it bring?",
      a: "Level up your creator tier from Beginner to Legend by completing Reddit tasks and claiming daily streaks. Higher tiers receive priority manual review speeds and eligibility for premium campaign pools."
    },
    {
      q: "What is the minimum withdrawal limit for active micro-influencers?",
      a: "The absolute minimum withdrawal threshold is strictly $1.00 USDT only. This enables even the newest creators to cash out their very first successful Reddit task payoff instantly without arbitrary hurdles!"
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 text-white select-none" id="faq-view-panel">
      <div className="text-center space-y-2">
        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block">Creators Support desk</span>
        <h1 className="text-2xl md:text-3xl font-black">Frequently Asked Questions</h1>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">Get fast answers to key questions about Reddit campaigns, BSC withdrawals, and verification guidelines</p>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto select-text">
        {faqs.map((f, i) => (
          <div key={i} className="p-5 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-2">
            <h3 className="text-sm font-extrabold text-white flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <span>{f.q}</span>
            </h3>
            <p className="text-xs text-zinc-400 font-semibold leading-relaxed pl-6">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
};


/* ================== ABOUT US PAGE ================== */
export const AboutPage: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 text-white select-none animate-fade-in" id="about-us-panel">
      
      <div className="text-center space-y-2">
        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block">Decentralized marketing</span>
        <h1 className="text-2xl md:text-3xl font-black">The Vision Behind Influencer Verse</h1>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">Connecting premium web3 companies directly with organic Reddit micro-influencers globally</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed max-w-3xl mx-auto font-semibold">
        <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-3">
          <Globe className="w-6 h-6 text-purple-400" />
          <h3 className="text-sm font-extrabold text-white">Who We Are</h3>
          <p className="text-zinc-400 font-normal select-text">Influencer Verse was established to resolve the bottleneck in decentralized campaign coordination. Instead of hiring expensive, untrustworthy marketing middle-agencies, platforms create direct, smart tasks where creators complete posts, verify comment threads, and claim instant payoff audits.</p>
        </div>

        <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-3">
          <Lightbulb className="w-6 h-6 text-purple-400" />
          <h3 className="text-sm font-extrabold text-white">Our Mission</h3>
          <p className="text-zinc-400 font-normal select-text">We empower standard Reddit users to capitalize on their account karma and high-authenticity profiles. Creators receive immediate rewards starting at a minimum limit of just $1.00 USDT, backed by manual auditing review safety to bypass sybil exploits.</p>
        </div>
      </div>

      <div className="bg-zinc-900/10 border border-white/10 p-6 rounded-2xl max-w-3xl mx-auto text-center space-y-1">
        <span className="text-sm font-extrabold block text-white">A Startup Funded for Hyper Scale</span>
        <p className="text-xs text-zinc-400">Backed by premium crypto investors to democratize micro-content task flows.</p>
      </div>

      <div className="p-6 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-2xl max-w-3xl mx-auto text-center space-y-3 animate-fade-in">
        <span className="text-sm font-extrabold block text-white">Connect with the Community</span>
        <p className="text-xs text-[#b9bbbe] font-medium max-w-md mx-auto">Have questions, need rapid support, or want to exchange tactics with other micro-influencers? Connect with our team directly.</p>
        <div className="pt-1">
          <a
            id="about-discord-cta"
            href="https://discord.gg/fFPT58H9kd"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-xs font-extrabold uppercase tracking-wider rounded-xl text-white transition-all shadow-lg shadow-[#5865F2]/20 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Join our Discord : https://discord.gg/fFPT58H9kd</span>
          </a>
        </div>
      </div>

    </div>
  );
};


/* ================== CONTACT US PAGE ================== */
export const ContactPage: React.FC = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you! Your message has been safely received. Our partnerships desk will reply via email within 12 business hours.');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 text-white select-none" id="contact-us-panel">
      
      <div className="text-center space-y-2">
        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block">Partnerships & Support</span>
        <h1 className="text-2xl md:text-3xl font-black">Get In Touch</h1>
        <p className="text-xs text-zinc-400 max-w-md mx-auto font-semibold">Connect with our business development or technical auditing teams</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {/* Detail cards */}
        <div className="space-y-4">
          <a 
            href="mailto:verseinfluencer@yahoo.com"
            className="block p-5 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-2 hover:border-purple-400/40 transition-colors group"
          >
            <Mail className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-bold text-white uppercase">Official Support Email</h3>
            <span className="text-xs text-purple-300 font-mono font-bold block select-text">verseinfluencer@yahoo.com</span>
          </a>

          <a 
            href="https://discord.gg/fFPT58H9kd"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-5 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-2 hover:border-blue-400/40 transition-colors group"
          >
            <MessageSquare className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-bold text-white uppercase font-sans">Discord Support Server</h3>
            <span className="text-xs text-blue-300 font-bold block select-none underline">Join Official Discord Support</span>
          </a>
        </div>

        {/* Form */}
        <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Email Address</label>
              <input type="email" placeholder="you@example.com" required className="w-full bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl text-white focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Your Message</label>
              <textarea placeholder="Write partnership proposal or support request..." required className="w-full bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl h-24 text-white focus:outline-none focus:ring-0" />
            </div>
            <button type="submit" className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-xs font-black rounded-xl text-white cursor-pointer transition-colors">
              Submit Dialogue
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
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 text-white select-none animate-fade-in" id="terms-of-service-panel">
      
      <div className="text-center space-y-2">
        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block">Legal Directives</span>
        <h1 className="text-2xl md:text-3xl font-black">Terms of Service & Rules</h1>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">Please read the compliance guidelines before completing campaigns on Reddit</p>
      </div>

      <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 max-w-3xl mx-auto text-xs text-zinc-400 leading-relaxed font-normal select-text">
        
        <div className="space-y-2 border-b border-white/5 pb-4">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 font-sans"><Shield className="w-4 h-4 text-purple-400" /> 1. Reddit Account Age Limits & Karma Policies</h3>
          <p>Creators must link a real, active personal Reddit profile showing at least 400+ total karma and 60+ days account age history. Linking throwaways result in auto-rejection by manual compliance auditing reviewers.</p>
        </div>

        <div className="space-y-2 border-b border-white/5 pb-4">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 font-sans"><Shield className="w-4 h-4 text-purple-400" /> 2. Dual-Submissions & Screenshot Proof Botting</h3>
          <p>Any user submitting duplicated screenshot proofs, synthetic post manipulations, or claiming multiple spots with mock account usernames will be permanently banned. Retain proofs for at least 7 days post campaign lock.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 font-sans"><Shield className="w-4 h-4 text-purple-400" /> 3. Wallet Settlement & Anti-Sybil Checks</h3>
          <p>Withdrawals undergo 24-business hours audit matching. Wrong wallets address format results in complete permanent burning of transmitted crypto. Minimum USDT BEP20 withdrawal is strictly $1.00.</p>
        </div>

      </div>

    </div>
  );
};


/* ================== DETAILED FORUM REFERRAL PLAN PAGE ================== */
export const ReferralProgramInfo: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 text-white select-none" id="referral-plan-panel">
      
      <div className="text-center space-y-2">
        <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block font-bold">Network expansion rewards</span>
        <h1 className="text-2xl md:text-3xl font-black">Multi-Level Channel Affiliation</h1>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">Multiply your USDT passive income commission with 2-tiers of referred sub-networks</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto font-semibold">
        
        {/* Tier Cards */}
        <div className="p-6 bg-purple-950/20 border border-purple-500/20 rounded-2xl space-y-3.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full blur-xl"></div>
          <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block">Direct Level 1 Creators</span>
          <h3 className="text-lg font-black text-white">10% Match Bonus</h3>
          <p className="text-xs text-zinc-400 font-normal leading-relaxed">Earn 10% matching payout commission credits automatically when your referred direct buddies complete manual reviews and cash out tasks.</p>
        </div>

        <div className="p-6 bg-blue-950/20 border border-blue-500/20 rounded-2xl space-y-3.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl"></div>
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Indirect Level 2 Creators</span>
          <h3 className="text-lg font-black text-white">5% Match Bonus</h3>
          <p className="text-xs text-zinc-400 font-normal leading-relaxed">Earn 5% matching commission on sub-tier invite channels. Build massive marketing pipelines easily with multiple tier chains.</p>
        </div>

      </div>

      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 max-w-3xl mx-auto text-xs text-zinc-400 leading-relaxed max-w-md text-center font-normal">
        🔥 <strong>Streak Booster multiplier:</strong> Keep active daily! Multi-day checkins increase matching bonuses by multiplying reward claims globally inside settings.
      </div>

    </div>
  );
};
