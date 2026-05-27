import React from 'react';
import { Mail, Shield, ShieldCheck, Cpu, Terminal, Twitter, ArrowUpRight } from 'lucide-react';
import { Logo } from './Logo';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#050505] border-t border-white/5 text-zinc-400 text-sm mt-auto select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div 
              onClick={() => onNavigate('home')} 
              className="cursor-pointer" 
              id="footer-logo"
            >
              <Logo size="sm" withText={true} />
            </div>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              The premier Web3 Reddit influencer network where Reddit micro-influencers connect directly with decentralized brands. Earn USDT rewards securely via instant BEP20 payouts.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="p-2 bg-zinc-900 rounded-lg hover:bg-zinc-800 text-white transition-colors duration-200">
                <Twitter className="w-4 h-4 text-purple-400" />
              </a>
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
                <button onClick={() => onNavigate('marketplace')} className="hover:text-purple-400 flex items-center gap-0.5 cursor-pointer transition-colors">
                  Tasks Marketplace <ArrowUpRight className="w-3 h-3 text-zinc-600" />
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('leaderboard')} className="hover:text-purple-400 flex items-center gap-0.5 cursor-pointer transition-colors">
                  Earning Leaderboard <ArrowUpRight className="w-3 h-3 text-zinc-600" />
                </button>
              </li>

              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-purple-400 cursor-pointer transition-colors">
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
                <button onClick={() => onNavigate('about')} className="hover:text-purple-400 cursor-pointer transition-colors">
                  About Our Team
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('trust')} className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors">
                  Trust, Audits & Safety
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-purple-400 cursor-pointer transition-colors">
                  Contact Support
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('terms')} className="hover:text-purple-400 cursor-pointer transition-colors">
                  Terms of Service & Privacy Statement
                </button>
              </li>
              <li>
                <div className="text-zinc-600 flex items-center gap-1.5 text-[10px] uppercase font-mono mt-2">
                  <Terminal className="w-3 h-3" /> Core System Online
                </div>
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
            <button onClick={() => onNavigate('terms')} className="hover:text-zinc-300 transition-colors">Privacy Policy</button>
            <span>&middot;</span>
            <button onClick={() => onNavigate('terms')} className="hover:text-zinc-300 transition-colors">Terms of Service</button>
          </div>
        </div>
      </div>
    </footer>
  );
};
