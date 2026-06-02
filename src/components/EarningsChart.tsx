import React, { useState } from 'react';
import { Calendar, Percent, TrendingUp, Sparkles, CheckCircle2, Users as UsersIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getKarmaProgressBar } from '../utils/tierHelper';

interface EarningsChartProps {
  earningsData?: number[];
  labels?: string[];
}

export const EarningsChart: React.FC<EarningsChartProps> = ({ 
  earningsData = [0, 0],
  labels = ['Start', 'No activity']
}) => {
  const [activeTab, setActiveTab] = useState<'earnings' | 'tasks'>('earnings');
  const { currentUser, submissions, users } = useApp();

  // Hardcode data for high fidelity demo aesthetics
  const earningsPoints = earningsData;
  const maxValue = Math.max(...earningsPoints, 10);
  
  // Tasks completion indicators
  const userSubmissions = currentUser ? submissions.filter(s => s.userId === currentUser.id) : [];
  const approvedCount = userSubmissions.filter(s => s.status === 'Approved').length;
  const pendingCount = userSubmissions.filter(s => s.status === 'Pending').length;
  const totalSubmissions = userSubmissions.length;
  const successRate = totalSubmissions > 0 ? Number(((approvedCount / totalSubmissions) * 100).toFixed(1)) : 0;

  const stats = {
    totalSubmissions,
    approved: approvedCount,
    pending: pendingCount,
    successRate,
  };

  // 1. Avg Earnings/Week
  let avgEarningsPerWeek = 0;
  if (currentUser) {
    const joinTimestamp = new Date(currentUser.joinDate || Date.now()).getTime();
    const currentTimestamp = Date.now();
    const diffTime = currentTimestamp - joinTimestamp;
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const diffWeeks = Math.max(1, diffDays / 7);
    avgEarningsPerWeek = currentUser.totalEarned / diffWeeks;
  }

  // 2. Peak Earnings
  const approvedSubmissions = userSubmissions.filter(s => s.status === 'Approved');
  const peakEarning = approvedSubmissions.length > 0 
    ? Math.max(...approvedSubmissions.map(s => s.reward)) 
    : 0;

  // 3. Milestone Progress
  const karmaBar = currentUser ? getKarmaProgressBar(currentUser.karma) : null;
  const milestoneText = karmaBar ? (karmaBar.needed > 0 ? `Level Up in ${karmaBar.needed} Karma` : "Max Level Unlocked!") : "0 Karma";

  // 4. Referred Friends count
  const totalReferredCount = currentUser ? users.filter(u => u.referredBy === currentUser.referralCode).length : 0;

  // Convert earnings to SVG path
  const width = 500;
  const height = 150;
  const padding = 20;

  const pointsCount = earningsPoints.length;
  const widthStep = pointsCount > 1 ? (width - padding * 2) / (pointsCount - 1) : 0;

  const coordinates = earningsPoints.map((value, index) => {
    const x = padding + index * widthStep;
    // scale to height
    const y = height - padding - ((value / maxValue) * (height - padding * 2));
    return { x, y, value };
  });

  // SVG Area path definition
  const linePath = coordinates.length > 0 
    ? `M ${coordinates[0].x} ${coordinates[0].y} ` + coordinates.slice(1).map(c => `L ${c.x} ${c.y}`).join(' ')
    : '';

  const areaPath = coordinates.length > 0
    ? `${linePath} L ${coordinates[coordinates.length - 1].x} ${height - padding} L ${coordinates[0].x} ${height - padding} Z`
    : '';

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm select-none" id="earnings-chart-wrapper">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Performance Analytics
          </h3>
          <p className="text-xs text-zinc-500">Track your influencer progress and reward status</p>
        </div>

        {/* Tab triggers */}
        <div className="flex border border-slate-200 bg-slate-50 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('earnings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'earnings' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-zinc-500 hover:text-purple-600'
            }`}
          >
            <TrendingUp className="w-3 h-3" /> Earnings Over Time
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'tasks' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-zinc-500 hover:text-purple-600'
            }`}
          >
            <Percent className="w-3 h-3" /> Completion Stats
          </button>
        </div>
      </div>

      {activeTab === 'earnings' ? (
        <div className="space-y-4">
          {/* SVG Area Chart */}
          <div className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl relative p-2 overflow-hidden">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(0,0,0,0.02)" strokeWidth="1" />
              <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="rgba(0,0,0,0.02)" strokeWidth="1" />
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(0,0,0,0.06)" strokeWidth="1" />

              {/* Filled area */}
              {areaPath && <path d={areaPath} fill="url(#chartGlow)" />}

              {/* Stroke line */}
              {linePath && (
                <path 
                  d={linePath} 
                  fill="none" 
                  stroke="url(#lineGlow)" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
              )}

              {/* Glowing anchor dots & Labels */}
              {coordinates.map((c, i) => (
                <g key={i}>
                  <circle 
                    cx={c.x} 
                    cy={c.y} 
                    r="5" 
                    fill="#ffffff" 
                    stroke="#7C3AED" 
                    strokeWidth="3" 
                  />
                  <circle 
                    cx={c.x} 
                    cy={c.y} 
                    r="10" 
                    fill="#7C3AED" 
                    fillOpacity="0.1" 
                    className="hover:scale-150 transition-transform cursor-pointer"
                  />
                </g>
              ))}
            </svg>
          </div>

          {/* Labels & Details */}
          <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono px-1">
            {labels.map((lbl, idx) => (
              <span key={idx} className="font-semibold">{lbl}</span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
              <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Avg Earnings/Week</span>
              <span className="text-sm font-extrabold text-zinc-800">${avgEarningsPerWeek.toFixed(2)} USDT</span>
            </div>
            <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
              <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Peak Task Reward</span>
              <span className="text-sm font-extrabold text-zinc-800">${peakEarning.toFixed(2)} USDT</span>
            </div>
            <div className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl">
              <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">Milestone Progress</span>
              <span className="text-sm font-extrabold text-purple-600">{milestoneText}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Circle progress indicators */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-xl border border-slate-100 relative">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="rgba(0,0,0,0.03)" 
                  strokeWidth="8" 
                  fill="transparent" 
                />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="url(#lineGlow)" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (251.2 * stats.successRate) / 100} 
                  strokeLinecap="round" 
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-lg font-black text-zinc-800">{stats.successRate}%</span>
                <span className="text-[9px] text-zinc-400 block font-bold leading-none">APPROVALS</span>
              </div>
            </div>
            <p className="text-xs font-semibold text-zinc-500 mt-3 text-center">High completion compliance record</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl">
              <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Approved submissions
              </span>
              <span className="text-sm font-extrabold text-zinc-800 font-mono">{stats.approved}</span>
            </div>

            <div className="flex justify-between items-center bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl">
              <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-500 animate-pulse" /> Pending verification
              </span>
              <span className="text-sm font-extrabold text-zinc-800 font-mono">{stats.pending}</span>
            </div>

            <div className="flex justify-between items-center bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl">
              <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
                <UsersIcon className="w-4 h-4 text-blue-500" /> Referred Affiliates
              </span>
              <span className="text-sm font-extrabold text-zinc-800 font-mono">{totalReferredCount} signups</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
