import React from 'react';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Logo } from './Logo';

interface FooterProps {
  onNavigate: (page: string) => void;
  isLightPage?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, isLightPage = false }) => {
  // Reusable hover animate classes satisfying: text transition, small upward movement, smooth 300ms transitions
  const linkClass = "hover:text-indigo-600 hover:-translate-y-0.5 transform transition-all duration-300 text-xs text-zinc-500 font-semibold cursor-pointer inline-block text-left";

  if (isLightPage) {
    return (
      <footer className="bg-white border-t border-slate-200 text-zinc-500 text-sm mt-auto select-none font-sans relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
            
            {/* Column 1 - Brand Info */}
            <div className="md:col-span-4 space-y-4">
              <div 
                onClick={() => onNavigate('home')} 
                className="cursor-pointer inline-block" 
                id="footer-logo"
              >
                <Logo size="sm" withText={true} textClassName="text-zinc-905 font-black" />
              </div>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed font-sans font-medium">
                The premier Web3 Reddit influencer network where Reddit micro-influencers connect directly with decentralized brands. Earn USDT rewards securely via instant BEP20 payouts.
              </p>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-125 rounded-full text-[10px] font-bold text-indigo-600 w-fit">
                <ShieldCheck className="w-3.5 h-3.5" /> Direct BEP20 BSC Instant Payouts
              </div>
            </div>

            {/* Column 2 - Platform */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-extrabold text-[11px] tracking-wider text-zinc-900 uppercase font-sans">Platform</h3>
              <ul className="space-y-3 font-sans">
                <li>
                  <button onClick={() => onNavigate('marketplace')} className={linkClass}>
                    Task Marketplace
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('leaderboard')} className={linkClass}>
                    Leaderboard
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('faq')} className={linkClass}>
                    How It Works
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('faq')} className={linkClass}>
                    FAQ
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3 - Company */}
            <div className="md:col-span-3 space-y-4">
              <h3 className="font-extrabold text-[11px] tracking-wider text-zinc-900 uppercase font-sans">Company</h3>
              <ul className="space-y-3 font-sans">
                <li>
                  <button onClick={() => onNavigate('about')} className={linkClass}>
                    About Us
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('trust')} className={linkClass}>
                    Trust & Payouts
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('contact')} className={linkClass}>
                    Contact
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('terms')} className={linkClass}>
                    Terms
                  </button>
                </li>
                <li>
                  <button onClick={() => onNavigate('terms')} className={linkClass}>
                    Privacy
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4 - Community */}
            <div className="md:col-span-3 space-y-4">
              <h3 className="font-extrabold text-[11px] tracking-wider text-zinc-900 uppercase font-sans">Community</h3>
              <ul className="space-y-3 font-sans">
                <li>
                  <a 
                    href="https://discord.gg/fFPT58H9kd" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={linkClass}
                  >
                    Discord
                  </a>
                </li>
                <li>
                  <button onClick={() => onNavigate('contact')} className={linkClass}>
                    Support
                  </button>
                </li>
                <li>
                  <a href="mailto:verseinfluencer@yahoo.com" className={linkClass}>
                    Email Contact
                  </a>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom Copyright Section */}
          <div className="border-t border-slate-100 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-400 font-sans">
            <div className="font-medium text-zinc-450">
              &copy; 2026 Influencer Verse. All rights reserved.
            </div>
            <div className="flex gap-4 font-semibold">
              <button onClick={() => onNavigate('terms')} className="hover:text-indigo-650 transition-colors duration-200 cursor-pointer">Privacy Policy</button>
              <span className="text-zinc-200">&middot;</span>
              <button onClick={() => onNavigate('terms')} className="hover:text-indigo-650 transition-colors duration-200 cursor-pointer">Terms of Service</button>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // Fallback dark dashboard page footer
  return (
    <footer className="bg-[#050505] border-t border-white/5 text-zinc-400 text-sm mt-auto select-none relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div 
              onClick={() => onNavigate('home')} 
              className="cursor-pointer inline-block" 
              id="footer-logo"
            >
              <Logo size="sm" withText={true} textClassName="text-white font-black" />
            </div>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              The premier Web3 Reddit influencer network where Reddit micro-influencers connect directly with decentralized brands. Earn USDT rewards securely via instant BEP20 payouts.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-600/10 border border-purple-500/20 rounded-full text-[11px] font-semibold text-purple-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Direct BEP20 BSC Instant Payouts
              </div>
            </div>
          </div>

          {/* Quick Navigations */}
          <div>
            <h3 className="font-extrabold text-xs tracking-wider text-zinc-200 uppercase mb-4">Earning Center</h3>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <button onClick={() => onNavigate('marketplace')} className="hover:text-purple-400 flex items-center gap-0.5 cursor-pointer transition-colors text-left">
                  Tasks Marketplace <ArrowUpRight className="w-3 h-3 text-zinc-650" />
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('leaderboard')} className="hover:text-purple-400 flex items-center gap-0.5 cursor-pointer transition-colors text-left">
                  Earning Leaderboard <ArrowUpRight className="w-3 h-3 text-zinc-650" />
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-purple-400 cursor-pointer transition-colors text-left">
                  How It Works & FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Platform Info */}
          <div>
            <h3 className="font-extrabold text-xs tracking-wider text-zinc-200 uppercase mb-4">Company Info</h3>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-purple-400 cursor-pointer transition-colors text-left">
                  About Our Team
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('trust')} className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors text-left">
                  Trust, Audits & Safety
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-purple-400 cursor-pointer transition-colors text-left">
                  Contact Support
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('terms')} className="hover:text-purple-400 cursor-pointer transition-colors text-left">
                  Terms of Service & Privacy Statement
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
          <div>
            &copy; 2026 Influencer Verse. Built for Reddit Task Optimization. All rights reserved.
          </div>
          <div className="flex gap-4">
            <button onClick={() => onNavigate('terms')} className="hover:text-zinc-305 transition-colors">Privacy Policy</button>
            <span>&middot;</span>
            <button onClick={() => onNavigate('terms')} className="hover:text-zinc-305 transition-colors">Terms of Service</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

