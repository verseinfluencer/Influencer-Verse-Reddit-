import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, Users, FileText, ShieldCheck, Award, Coins, 
  Sparkles, ArrowRight, Play, Pause, RotateCcw, Check, CheckCircle2, AlertCircle, Eye
} from 'lucide-react';

interface CampaignWalkthroughProps {
  onNavigate: (page: string) => void;
  currentUser?: any;
}

// Visual mockup definitions for our Interactive Simulator
const StepsData = [
  {
    id: 1,
    title: "Client launches a campaign",
    desc: "A brand creates a Reddit task with clear instructions, reward amount, and proof requirements.",
    icon: Briefcase,
    color: "from-purple-500 to-indigo-600",
    bgLight: "bg-purple-50/60",
    borderLight: "border-purple-100",
    iconColor: "text-purple-600",
    glowColor: "shadow-purple-500/15"
  },
  {
    id: 2,
    title: "Creator claims the task",
    desc: "Eligible creators pick available campaigns and complete them using their connected Reddit account.",
    icon: Users,
    color: "from-indigo-500 to-violet-600",
    bgLight: "bg-indigo-50/60",
    borderLight: "border-indigo-100",
    iconColor: "text-indigo-600",
    glowColor: "shadow-indigo-500/15"
  },
  {
    id: 3,
    title: "Proof is submitted",
    desc: "Creators upload proof links or screenshots for review inside the platform.",
    icon: FileText,
    color: "from-violet-500 to-fuchsia-600",
    bgLight: "bg-violet-50/60",
    borderLight: "border-violet-100",
    iconColor: "text-violet-600",
    glowColor: "shadow-violet-500/15"
  },
  {
    id: 4,
    title: "Moderator reviews",
    desc: "Admin or moderator verifies the submission before it moves to client approval.",
    icon: ShieldCheck,
    color: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50/60",
    borderLight: "border-blue-100",
    iconColor: "text-blue-600",
    glowColor: "shadow-blue-500/15"
  },
  {
    id: 5,
    title: "Client gives final approval",
    desc: "The client reviews verified proof and confirms the campaign result.",
    icon: Award,
    color: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50/60",
    borderLight: "border-emerald-100",
    iconColor: "text-emerald-700",
    glowColor: "shadow-emerald-500/15"
  },
  {
    id: 6,
    title: "Reward is released",
    desc: "Approved rewards move into the creator wallet and become available for withdrawal.",
    icon: Coins,
    color: "from-amber-400 to-orange-500",
    bgLight: "bg-amber-50/60",
    borderLight: "border-amber-100",
    iconColor: "text-amber-705",
    glowColor: "shadow-amber-500/15"
  }
];

export const CampaignWalkthrough: React.FC<CampaignWalkthroughProps> = ({ onNavigate, currentUser }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-play interval logic (5 seconds per step = 30 seconds total!)
  useEffect(() => {
    if (!isPlaying) return;

    const tickTime = 50; // update progress every 50ms
    const totalStepTime = 5000; // 5 seconds per step
    const stepIncrement = (tickTime / totalStepTime) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStep((current) => (current + 1) % 6);
          return 0;
        }
        return prev + stepIncrement;
      });
    }, tickTime);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Handle manual selection
  const handleStepClick = (index: number) => {
    setActiveStep(index);
    setProgress(0);
    setIsPlaying(false); // Pause autoplay on manual interaction
  };

  const handleResetOrPlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setActiveStep(0);
    setProgress(0);
    setIsPlaying(true);
  };

  const handleCtaClick = () => {
    if (currentUser) {
      onNavigate(currentUser.status === 'Pending' ? 'profile' : 'dashboard');
    } else {
      onNavigate('signup');
    }
  };

  return (
    <section 
      ref={scrollRef}
      className="py-24 md:py-32 bg-white border-t border-slate-100 relative z-10 overflow-hidden" 
      id="campaign-works-walkthrough"
    >
      {/* Decorative subtle light purple backdrop blur element */}
      <div className="absolute right-0 top-1/4 -translate-y-1/2 w-96 h-96 bg-indigo-50/30 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute left-0 bottom-1/4 w-80 h-80 bg-purple-50/20 blur-[80px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center space-y-4 mb-16 max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-150 rounded-full text-[10px] font-bold uppercase tracking-wider text-purple-700 select-none shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Complete Campaign Simulator
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight font-sans leading-none"
          >
            See How a Campaign Works in 30 Seconds
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-sans font-medium"
          >
            From campaign launch to verified reward release, every step is tracked with proof, approvals, and transparent records.
          </motion.p>
        </div>

        {/* 30-Second Segment Progress Bar */}
        <div className="max-w-2xl mx-auto mb-14 px-4">
          <div className="flex gap-2 justify-between items-center mb-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span className="text-[11px] tracking-wider uppercase text-slate-700 font-mono">
                {isPlaying ? `Step ${activeStep + 1} of 6 (Simulating)` : "Simulator Paused"}
              </span>
            </div>
            {/* Quick interactive controls */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handleResetOrPlay} 
                className="p-1 px-2.5 rounded-lg border border-slate-200 bg-white shadow-xs text-[10px] uppercase font-bold text-slate-700 flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
                title={isPlaying ? "Pause simulation" : "Play simulation"}
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isPlaying ? "Pause" : "Resume"}
              </button>
              <button 
                onClick={handleRestart} 
                className="p-1 px-2 hover:bg-slate-50 rounded-lg text-slate-500 border border-slate-150 transition-colors"
                title="Restart workflow"
              >
                <RotateCcw className="w-3.0 h-3.0" />
              </button>
            </div>
          </div>
          
          <div className="flex gap-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div 
                key={i} 
                className="flex-1 h-full bg-slate-100 relative cursor-pointer"
                onClick={() => handleStepClick(i)}
              >
                <div 
                  className={`absolute left-0 top-0 h-full rounded-full ${
                    i === activeStep 
                      ? "bg-indigo-600" 
                      : i < activeStep 
                        ? "bg-indigo-600/60" 
                        : "bg-transparent"
                  }`}
                  style={{ 
                    width: i === activeStep ? `${progress}%` : i < activeStep ? "100%" : "0%" 
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Left Mockup/Right Steps Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative select-none">
          
          {/* LEFT COLUMN: Sticky Realistic Workflow Simulator Screen */}
          <div className="lg:col-span-5 lg:sticky lg:top-28 w-full z-20">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-slate-50 rounded-3xl border border-slate-150 p-4 shadow-[0_15px_40px_-15px_rgba(99,102,241,0.06)] relative overflow-hidden flex flex-col h-[400px]"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-indigo-600" />
              
              {/* Device Header */}
              <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 ml-2">portal_simulation_v1.0</span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-mono flex items-center gap-1 select-none shadow-3xs">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span> Live Channel
                </span>
              </div>

              {/* Dynamic Interactive Showrooms */}
              <div className="flex-1 flex flex-col relative justify-center bg-white rounded-2xl border border-slate-150/80 p-5 shadow-3xs overflow-hidden">
                <AnimatePresence mode="out-in">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                    className="h-full flex flex-col justify-between"
                  >
                    <LiveMockupDisplay stepIndex={activeStep} />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Simulator info tag */}
              <div className="mt-3 flex justify-between items-center text-[10px] text-slate-400 font-medium px-1">
                <span>Auto-playing campaign progression loop</span>
                <span className="font-mono text-slate-300">bsc bsc_chain - verify</span>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Interactive Step Cards Timeline */}
          <div className="lg:col-span-7 space-y-5 relative">
            
            {/* Visual connecting timeline track runs underneath the steps */}
            <div className="absolute left-8 top-12 bottom-12 w-0.5 bg-slate-100 -z-0 pointer-events-none">
              <motion.div 
                className="w-full bg-indigo-600 rounded-full"
                style={{ originY: 0 }}
                animate={{ 
                  height: `${(activeStep / 5) * 100}%` 
                }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {StepsData.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === activeStep;
              
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                  whileHover={{ y: -3, scale: 1.012 }}
                  onClick={() => handleStepClick(idx)}
                  className={`p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 cursor-pointer text-left relative overflow-hidden group ${
                    isActive 
                      ? `bg-gradient-to-br from-white to-slate-50 border-indigo-200 shadow-lg ${step.glowColor}` 
                      : "bg-white/60 hover:bg-white border-slate-150 hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  {/* Subtle active state sweeping gradient border */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-600" />
                  )}

                  {/* Step ID Circular container badge with pulsing ring */}
                  <div className="relative shrink-0 z-10 mt-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold font-sans text-xs transition-colors duration-300 border ${
                      isActive 
                        ? `bg-gradient-to-br ${step.color} text-white border-transparent`
                        : `${step.bgLight} ${step.iconColor} ${step.borderLight}`
                    }`}>
                      <StepIcon className="w-4 h-4" />
                    </div>

                    {isActive && (
                      <span className="absolute -inset-1 rounded-xl bg-indigo-500/10 animate-ping -z-10"></span>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 space-y-1 z-10">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm sm:text-base font-extrabold tracking-tight font-sans transition-colors ${
                        isActive ? "text-indigo-900" : "text-slate-800"
                      }`}>
                        {step.title}
                      </h3>
                      <span className="text-[10px] font-mono font-extrabold text-slate-350 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                        0{step.id}
                      </span>
                    </div>
                    <p className={`text-[11px] sm:text-xs font-normal leading-relaxed font-sans ${
                      isActive ? "text-slate-650" : "text-slate-500"
                    }`}>
                      {step.desc}
                    </p>
                  </div>

                  {/* Soft interactive glowing particles inside card active state */}
                  {isActive && (
                    <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-gradient-to-br from-transparent to-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                  )}
                </motion.div>
              );
            })}

          </div>

        </div>

        {/* Sticky Call To Action at the bottom of the simulator */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-16 text-center"
        >
          <button
            onClick={handleCtaClick}
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md hover:shadow-indigo-500/10 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
          >
            Experience Premium Campaigns <ArrowRight className="w-4 h-4 text-purple-400" />
          </button>
        </motion.div>

      </div>
    </section>
  );
};

// UI Mockup Previews inside the simulator panel based on the active step
const LiveMockupDisplay: React.FC<{ stepIndex: number }> = ({ stepIndex }) => {
  const [balance, setBalance] = useState(0);

  // Auto incrementing coin balance for Step 6 simulation payoff
  useEffect(() => {
    if (stepIndex !== 5) {
      setBalance(0);
      return;
    }

    const timer = setTimeout(() => {
      let current = 0;
      const interval = setInterval(() => {
        current += 0.25;
        if (current >= 2.50) {
          setBalance(2.50);
          clearInterval(interval);
        } else {
          setBalance(current);
        }
      }, 60);
      return () => clearInterval(interval);
    }, 400);

    return () => clearTimeout(timer);
  }, [stepIndex]);

  switch (stepIndex) {
    case 0:
      return (
        <div className="space-y-4 my-auto text-left">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
            <span className="text-[11px] font-bold text-slate-700">Campaign Deployer Console</span>
            <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">Client Panel</span>
          </div>

          <div className="space-y-3 font-sans text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Target Subreddit</label>
              <div className="bg-slate-50 border border-slate-150 p-2 rounded-lg font-mono text-[11px] text-slate-700 flex items-center gap-1.5 focus:border-indigo-500">
                <span className="text-red-500 font-bold">r/</span>technology <span className="ml-auto text-[9px] text-emerald-500 bg-emerald-50 px-1 py-0.5 font-sans rounded">680k members</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Min Karma Tier</label>
                <div className="bg-slate-50 border border-slate-150 p-2 rounded-lg text-slate-700 font-mono text-[10.5px]">
                  500+ Karma
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Task Slots Limit</label>
                <div className="bg-slate-50 border border-slate-150 p-2 rounded-lg text-slate-700 font-mono text-[10.5px]">
                  50 Slots
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Campaign Budget</label>
                <div className="bg-slate-50 border border-slate-150 p-2 rounded-lg font-extrabold text-indigo-600 font-mono text-[10.5px]">
                  125.00 USDT
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">USDT Reward Rate</label>
                <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg font-extrabold text-emerald-700 font-mono text-[10.5px]">
                  2.50 USDT
                </div>
              </div>
            </div>

            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-full bg-slate-900 text-white rounded-lg p-2.5 text-center font-bold tracking-wide cursor-pointer flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors mt-2"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400 font-extrabold" />
              <span>Launch Reddit Campaign</span>
            </motion.div>
          </div>
        </div>
      );

    case 1:
      return (
        <div className="space-y-4 my-auto text-left">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
            <span className="text-[11px] font-bold text-slate-700">Creator Campaign Desk</span>
            <span className="text-[9px] bg-purple-50 border border-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono font-bold">Verified</span>
          </div>

          <div className="bg-slate-50 border border-indigo-50 rounded-xl p-3.5 space-y-3 font-sans text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[10px] bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-indigo-700 tracking-wider rounded font-mono">r/technology task</span>
              <span className="text-[11px] font-extrabold text-emerald-600 font-mono">+$2.50 USDT</span>
            </div>
            
            <h4 className="font-extrabold text-slate-800 leading-snug">Post unique constructive discussion regarding tech updates.</h4>
            
            <div className="flex gap-4 text-[10px] text-slate-500 font-medium">
              <span>Slots Available: <b>32 / 50</b></span>
              <span className="text-purple-600">Karma Limit: <b>500+</b></span>
            </div>

            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-indigo-600 text-white font-bold p-2.5 rounded-lg text-center shadow-md flex items-center justify-center gap-2 cursor-pointer hover:bg-indigo-700 transition-all"
            >
              <Users className="w-3.5 h-3.5 text-indigo-200" />
              <span>Claim Available Slot</span>
            </motion.div>

            <div className="bg-amber-50 rounded-lg p-1.5 px-2.5 border border-amber-100 flex items-center gap-1.5 text-[9.5px] text-amber-850 font-medium">
              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
              <span>Claim auto-locks slot for 60m to execute proof</span>
            </div>
          </div>
        </div>
      );

    case 2:
      return (
        <div className="space-y-4 my-auto text-left">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
            <span className="text-[11px] font-bold text-slate-700">Verify Proof Submission</span>
            <span className="text-[9px] bg-violet-50 border border-violet-100 text-violet-700 px-2 py-0.5 rounded font-mono font-bold">In Progress</span>
          </div>

          <div className="space-y-3 font-sans text-xs">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Reddit Proof Link (Required)</label>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg font-mono text-[10.5px] text-slate-705 truncate">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 1.2 }}
                  className="text-violet-650"
                >
                  https://www.reddit.com/r/technology/comments/16gf/best_tech/
                </motion.span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Proof Checklist Requirements</label>
              <div className="space-y-1.5 mt-1.5 text-[10px] text-slate-600 font-semibold">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Correct target subreddit r/technology matched</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Verified Reddit account handle connected</span>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-violet-600 hover:bg-violet-750 text-white font-bold p-2.5 rounded-lg text-center flex items-center justify-center gap-1.5 mt-2 transition-all shadow-md shadow-violet-500/10"
            >
              <FileText className="w-3.5 h-3.5 text-violet-200" />
              <span>Record Proof Evidence</span>
            </motion.button>
          </div>
        </div>
      );

    case 3:
      return (
        <div className="space-y-4 my-auto text-left">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
            <span className="text-[11px] font-bold text-slate-700">Audit Verification Center</span>
            <span className="text-[9.5px] bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> Analyzing
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-3 font-sans text-xs text-slate-700">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-mono text-slate-400">Submission Code ID: #TS_23910</span>
              <span className="text-blue-600 font-extrabold uppercase">Queue: 4th</span>
            </div>

            {/* Simulated automatic scanning parameters */}
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between items-center bg-white p-1.5 px-2.5 rounded-lg border border-slate-150">
                <span className="font-semibold">Reddit Account Verification:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> PASS
                </span>
              </div>
              <div className="flex justify-between items-center bg-white p-1.5 px-2.5 rounded-lg border border-slate-150">
                <span className="font-semibold">Karma Tier Limit Requirement:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> PASS
                </span>
              </div>
              <div className="flex justify-between items-center bg-white p-1.5 px-2.5 rounded-lg border border-slate-150">
                <span className="font-semibold">URL Duplicity Pattern Audit:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> UNIQUE
                </span>
              </div>
            </div>

            <motion.div
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="bg-indigo-50 border border-indigo-150/80 rounded-lg p-2 text-center text-indigo-700 font-bold text-[10px] flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Moderator verification checklist completed</span>
            </motion.div>
          </div>
        </div>
      );

    case 4:
      return (
        <div className="space-y-4 my-auto text-left">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
            <span className="text-[11px] font-bold text-slate-700">Sponsor Final Settlement</span>
            <span className="text-[9px] bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-mono font-bold">Awaiting Release</span>
          </div>

          <div className="space-y-3.5 font-sans text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 space-y-1.5 text-[10px]">
              <span className="block text-slate-400 font-bold uppercase">Submitted proof URL:</span>
              <a href="#" className="text-indigo-605 font-bold truncate underline block">
                reddit.com/r/technology/comments/16gf/best_tech
              </a>
              <div className="border-t border-slate-100 pt-1.5 mt-1.5 flex justify-between items-center text-slate-450 font-semibold">
                <span>Creator: <b>u/Crypto_Karma</b></span>
                <span>Karma: <b>4,250</b></span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button className="bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold p-2.5 rounded-lg text-center flex items-center justify-center gap-1 border border-slate-150">
                <AlertCircle className="w-3 h-3" />
                <span>Reject</span>
              </button>
              
              <motion.button
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold p-2.5 rounded-lg text-center flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Release Funds</span>
              </motion.button>
            </div>
          </div>
        </div>
      );

    case 5:
      return (
        <div className="space-y-4 my-auto text-left relative">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
            <span className="text-[11px] font-bold text-slate-700">Earnings Cleared Ledger</span>
            <span className="text-[9px] bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 rounded font-mono font-bold">Settled Success</span>
          </div>

          {/* Premium custom diagonal shimmer sweep effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-premium-shine pointer-events-none" />

          <div className="space-y-3 font-sans text-xs">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 border border-indigo-850/40 relative overflow-hidden text-center space-y-1.5 shadow-md shadow-indigo-950/20">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Available Creator Balance</span>
              
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-fuchsia-100">
                ${balance.toFixed(2)} USDT
              </div>

              <span className="inline-flex items-center gap-1 text-[9.5px] bg-slate-800/80 border border-slate-700/60 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold select-none">
                <Check className="w-3 h-3 text-emerald-400" /> Settled over BEP20 Network
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150/80 flex items-center justify-between text-[10.5px] text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-[10px] font-mono">
                  Tx
                </div>
                <div>
                  <span className="font-bold block text-slate-800">Payment Released</span>
                  <span className="text-[8.5px] text-slate-400 font-mono">0x68dfa890a8cb...</span>
                </div>
              </div>
              <span className="font-extrabold text-emerald-650 font-mono">+$2.50 USDT</span>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
};
