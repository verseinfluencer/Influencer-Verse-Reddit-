import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Award, CheckCircle2, ChevronDown, ChevronUp, Star, Users, Briefcase, DollarSign, Rss, Mail, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { tasks, currentUser, login } = useApp();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // How it works items
  const steps = [
    {
      num: "01",
      title: "Register & Submit Profile",
      desc: "Sign up and link your Reddit account. Our automated checking ensures your username and profile match format requirements instantly.",
      badge: "Fast Approval"
    },
    {
      num: "02",
      title: "Select Active Tasks",
      desc: "Browse Reddit Post or Comment tasks filtering by reward, difficulty, and guidelines. Reserve a slot and execute.",
      badge: "8+ Live Campaigns"
    },
    {
      num: "03",
      title: "Earn Secure USDT Payouts",
      desc: "Submit your screenshot and comment URL proof. Admin audits are instant. Claim rewards straight into your BSC BEP20 wallet.",
      badge: "Min $1.00 Cashout"
    }
  ];

  // Why choose us points
  const benefits = [
    {
      title: "Guaranteed Instant Audits & Approval",
      desc: "No more waiting weeks for payouts. Admin reviews are processed dynamically, assuring quick updates to your available balance.",
      icon: Zap
    },
    {
      title: "Zero Fee BSC (BEP20) Cashouts",
      desc: "Receive your rewards in USDT (BEP20) or straight to your Binance ID. High security, near-zero chain gas fee, max speed.",
      icon: ShieldCheck
    },
    {
      title: "Level Up Gamification",
      desc: "Complete tasks and earn XP points to tier-up from Beginner to Legend. Higher tiers unlock dynamic rank custom rewards and personalized benefits.",
      icon: Award
    }
  ];

  // FAQs
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

  // Slice featured tasks
  const featuredTasks = tasks.slice(0, 3);

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

  return (
    <div className="w-full text-white bg-[#050505] font-sans select-none" id="homepage-container">
      {/* 1. Hero Section & Bento Wrapper */}
      <section className="relative overflow-hidden py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Bento Grid for landing page */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Bento Block 1: Large Display Hero */}
          <div className="lg:col-span-8 bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-[32px] p-8 md:p-12 flex flex-col justify-center relative overflow-hidden backdrop-blur-md">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-bento-purple/15 blur-[100px] rounded-full"></div>
            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full select-none animate-pulse">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <span className="text-[10px] uppercase font-black tracking-widest text-bento-blue">Active Campaigns: {tasks.length} Live Tasks</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black leading-[1.1] tracking-tight">
                The Reddit Economy <br/>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-bento-purple to-bento-blue">Starts Here.</span>
              </h1>
              
              <p className="text-sm md:text-base text-white/50 max-w-xl leading-relaxed font-semibold">
                Monetize your Reddit influence. Complete high-value campaigns, boost community engagement, and claim instant BEP20 USDT cash rewards.
              </p>
              
              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
                <button 
                  onClick={startNowAction}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-bento-purple to-bento-blue text-xs font-black uppercase tracking-wider rounded-full text-white hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Start Earning Now &rarr;
                </button>
                <button 
                  onClick={() => onNavigate('faq')}
                  className="w-full sm:w-auto px-6 py-3.5 border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-wider rounded-full text-zinc-300 hover:text-white transition-all cursor-pointer"
                >
                  How it works
                </button>
              </div>


            </div>
          </div>

          {/* Bento Block 2: Support & Discord Community */}
          <div className="lg:col-span-4 bg-white/5 border border-white/10 rounded-[32px] p-6 flex flex-col justify-between" id="bento-support-block">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D8B4FE]">Official Help Desk</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              </div>
              
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Need Support?</h3>
                <p className="text-zinc-400 text-xs mt-1 leading-normal font-semibold">
                  Get in touch with our partnerships or technical team instantly 24/7. We are ready to help with audits, verification & submissions.
                </p>
              </div>

              <div className="space-y-3">
                {/* Official Email */}
                <a 
                  href="mailto:verseinfluencer@yahoo.com" 
                  className="flex items-center gap-3 p-3 bg-black/40 hover:bg-[#7C3AED]/10 border border-white/5 rounded-2xl transition-all group"
                >
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 group-hover:scale-105 transition-transform duration-300">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-[9px] text-zinc-500 font-extrabold block uppercase tracking-wider">Email Us</span>
                    <span className="text-xs font-bold text-white block select-text font-mono truncate group-hover:text-purple-300 transition-colors">
                      verseinfluencer@yahoo.com
                    </span>
                  </div>
                </a>

                {/* Discord Community */}
                <a 
                  href="https://discord.gg/fFPT58H9kd" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-3 p-3 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 border border-[#5865F2]/20 rounded-2xl transition-all group"
                >
                  <div className="p-2 bg-[#5865F2]/20 border border-[#5865F2]/30 rounded-xl text-white group-hover:scale-105 transition-transform duration-300">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] text-blue-300 font-extrabold block uppercase tracking-wider">Join Server</span>
                    <span className="text-xs font-bold text-white block group-hover:underline">
                      Official Discord Support
                    </span>
                  </div>
                </a>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 text-center mt-6 lg:mt-0">
              <span className="text-[10px] text-zinc-500 font-extrabold tracking-wide uppercase">Response within 12 hours guaranteed</span>
            </div>
          </div>

        </div>

        {/* Bottom Bento Row with interactive cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          
          <div className="bg-bento-purple/15 border border-bento-purple/35 rounded-[32px] p-8 flex flex-col justify-between min-h-[160px] hover:border-bento-purple/60 transition-all cursor-pointer" onClick={startNowAction}>
            <div className="w-12 h-12 bg-bento-purple rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">Create Profile</h4>
              <p className="text-xs text-white/50 mt-0.5 font-semibold">Link Reddit <strong className="text-purple-300">u/username</strong> instantly and trigger verification</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 flex flex-col justify-between min-h-[160px] hover:border-white/20 transition-all cursor-pointer" onClick={() => onNavigate('wallet')}>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-base font-black text-white">Earn USDT</h4>
              <p className="text-xs text-white/50 mt-0.5 font-semibold">Earn direct rewards & withdraw. Minimum is strictly $1.00 USDT.</p>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Three Simple Steps Section */}
      <section className="py-16 border-t border-white/5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-1 mb-12">
          <span className="text-[10px] text-bento-purple font-black uppercase tracking-widest block font-display">Workflow</span>
          <h2 className="text-2xl md:text-3xl font-black text-white">Three Simple Steps to Earn</h2>
          <p className="text-zinc-500 text-xs max-w-md mx-auto font-semibold">Get verified, perform missions, check audits & claim rewards.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, idx) => (
            <div key={idx} className="bento-card-gradient group">
              <div className="flex justify-between items-center mb-6">
                <span className="text-4xl font-black text-bento-purple/35 group-hover:text-bento-purple transition-colors">{s.num}</span>
                <span className="text-[10px] font-black px-2.5 py-1 bg-bento-purple/10 border border-bento-purple/20 rounded-full text-bento-purple">{s.badge}</span>
              </div>
              <h3 className="text-base font-black text-white mb-2 leading-none">{s.title}</h3>
              <p className="text-zinc-400 text-xs leading-normal font-semibold">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Why Choose Us */}
      <section className="py-16 border-t border-white/5 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          <div className="lg:col-span-12 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-bento-blue/10 border border-bento-blue/20 rounded-full text-[10px] font-black uppercase tracking-wider text-bento-blue">
              <ShieldCheck className="w-3.5 h-3.5" /> Direct BEP20 Smart Withdrawals
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              Designed For High-Performance Creators
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed font-semibold">
              Influencer Verse eliminates middleman bottlenecks. By introducing dedicated admin reviews, verified Reddit profile mapping, and blockchain-native BEP20 USDT smart withdrawals, users maximize their earning yield with absolute safety.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {benefits.map((b, idx) => {
                const Icon = b.icon;
                return (
                  <div key={idx} className="flex gap-4 items-start p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <div className="p-2.5 rounded-xl bg-bento-purple/10 border border-bento-purple/20 text-bento-purple shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white mb-0.5">{b.title}</h4>
                      <p className="text-zinc-400 text-[11px] leading-relaxed font-semibold">{b.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>



      {/* 5. FAQ accordion */}
      <section className="py-16 border-t border-white/5 max-w-4xl mx-auto px-4">
        <div className="text-center mb-12 space-y-1">
          <span className="text-[10px] text-bento-purple font-black uppercase tracking-widest block font-display">Knowledgebase</span>
          <h2 className="text-2xl md:text-3xl font-black text-white">Frequently Asked Questions</h2>
          <p className="text-zinc-500 text-xs font-semibold">Learn more about Reddit audits and blockchain cashouts.</p>
        </div>

        <div className="space-y-4 font-semibold">
          {faqs.map((f, i) => (
            <div 
              key={i} 
              className="bg-zinc-900/10 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300"
            >
              <button 
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                className="w-full flex justify-between items-center p-5 text-left font-black text-xs sm:text-sm text-white focus:outline-none cursor-pointer hover:bg-white/5"
              >
                <span>{f.q}</span>
                {activeFaq === i ? <ChevronUp className="w-4 h-4 text-bento-purple shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
              </button>
              
              {activeFaq === i && (
                <div className="p-5 pt-0 border-t border-white/5 text-xs text-zinc-400 leading-relaxed bg-[#050505]/40 select-text">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
