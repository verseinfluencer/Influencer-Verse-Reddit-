import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Award, ShieldAlert, Sparkles, TrendingUp, Users, HeartCrack, ChevronRight } from 'lucide-react';
import { getKarmaTier } from '../utils/tierHelper';

export const Leaderboard: React.FC = () => {
  const { users, currentUser } = useApp();
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [leaderboardType, setLeaderboardType] = useState<'earners' | 'karma'>('earners');

  // Filter out admins/banned accounts from leaderboard
  const legitimateUsers = users.filter(u => u.role !== 'admin' && u.status !== 'Banned');

  const isAdmin = currentUser?.role === 'admin';

  // Apply Tier Filter first
  const filteredUsers = selectedTierFilter === 'all'
    ? legitimateUsers
    : legitimateUsers.filter(u => getKarmaTier(u.karma).name.toLowerCase() === selectedTierFilter.toLowerCase());

  // Get dynamic sorting data
  const getSortedData = () => {
    const list = [...filteredUsers];
    if (leaderboardType === 'earners') {
      return list.sort((a, b) => b.totalEarned - a.totalEarned);
    } else {
      return list.sort((a, b) => (b.karma || 0) - (a.karma || 0));
    }
  };

  const sortedLeaderboard = getSortedData();

  // Extract Top 3 for special visual podium representation
  const podium = sortedLeaderboard.slice(0, 3);
  const remaining = sortedLeaderboard.slice(3, 10);

  // Styling helper for rankings
  const getRankBadge = (rankOrdinal: number) => {
    if (rankOrdinal === 1) return { text: '🥇 Gold', style: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
    if (rankOrdinal === 2) return { text: '🥈 Silver', style: 'bg-zinc-300/10 text-zinc-300 border-zinc-300/20' };
    if (rankOrdinal === 3) return { text: '🥉 Bronze', style: 'bg-amber-600/10 text-amber-600 border-amber-600/20' };
    return { text: `#${rankOrdinal}`, style: 'bg-zinc-950 text-zinc-500 border-zinc-850' };
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-white select-none" id="leaderboard-panel">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-2">
        <div>
          <span className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest block mb-1">Creators Honor Roll</span>
          <h1 className="text-2xl md:text-3xl font-black">Platform Leaderboard</h1>
          <p className="text-xs text-zinc-400">Track and compete against elite micro-influencers ranking up daily</p>
        </div>

        {/* Controls: Tier Filter & sorting tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto font-semibold">
          
          {/* Dropdown for Filter by Tier */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 py-1.5 px-3 rounded-2xl">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-extrabold">Filter by Tier:</span>
            <select
              value={selectedTierFilter}
              onChange={(e) => setSelectedTierFilter(e.target.value)}
              className="text-xs bg-zinc-950 text-purple-400 border-0 focus:outline-none focus:ring-0 cursor-pointer pr-4 font-black"
            >
              <option value="all">All Tiers</option>
              <option value="bronze">🥉 Bronze</option>
              <option value="silver">🥈 Silver</option>
              <option value="gold">⭐ Gold</option>
              <option value="diamond">💎 Diamond</option>
              <option value="platinum">🔥 Platinum</option>
              <option value="elite">👑 Elite</option>
              <option value="legend">🚀 Legend</option>
            </select>
          </div>

          {/* Sorting tabs */}
          <div className="flex bg-zinc-900 border border-white/5 p-1 rounded-2xl">
            <button 
              onClick={() => setLeaderboardType('earners')}
              className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                leaderboardType === 'earners' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-500 hover:text-white'
              }`}
            >
              Top Earners
            </button>
            <button 
              onClick={() => setLeaderboardType('karma')}
              className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                leaderboardType === 'karma' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-500 hover:text-white'
              }`}
            >
              Reddit Tier Board
            </button>
          </div>

        </div>
      </div>

      {/* Podium Grid (Top 3 visual highlight cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        
        {/* 2nd Place */}
        {podium[1] && (() => {
          const t = getKarmaTier(podium[1].karma);
          return (
            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden order-2 md:order-1 flex flex-col items-center text-center space-y-4">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-400/30"></div>
              <div className="relative">
                <span className="absolute -top-1 -right-1 bg-zinc-400 text-zinc-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">2</span>
                <img src={podium[1].avatarUrl} alt="Avatar" className="w-14 h-14 rounded-full border-2 border-zinc-400 p-0.5 bg-zinc-950" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white mb-0.5 flex items-center gap-1.5 justify-center">
                  {podium[1].fullName}
                  <span className="text-xs" title={`${t.name} Tier`}>{t.emoji}</span>
                </h3>
                <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">{podium[1].redditUsername}</p>
                <span className="text-[9px] mt-1 inline-block px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/10 font-bold">
                  {t.emoji} {t.name} Tier
                </span>
              </div>
              <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-white/5 select-text w-full">
                <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                  {leaderboardType === 'earners' ? 'Total Rewards Earned' : 'Reddit Karma Standing'}
                </span>
                <span className="text-base font-black text-white font-mono leading-none">
                  {leaderboardType === 'earners' ? `$${podium[1].totalEarned.toFixed(2)} USDT` : (
                    (isAdmin || currentUser?.id === podium[1].id) 
                      ? `${podium[1].karma?.toLocaleString() || 0} Karma` 
                      : `${t.name} Level`
                  )}
                </span>
              </div>
            </div>
          );
        })()}

        {/* 1st Place Champion */}
        {podium[0] && (() => {
          const t = getKarmaTier(podium[0].karma);
          return (
            <div className="bg-gradient-to-tr from-purple-950/20 to-blue-950/20 border border-purple-500/30 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden order-1 md:order-2 flex flex-col items-center text-center space-y-5 md:scale-105 shadow-2xl">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-blue-500"></div>
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl"></div>
              
              <div className="relative">
                <span className="absolute -top-2.5 right-4 text-2xl animate-bounce">👑</span>
                <span className="absolute -top-1.5 -right-1 bg-yellow-500 text-zinc-950 font-black text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-zinc-950">1</span>
                <img src={podium[0].avatarUrl} alt="Avatar" className="w-18 h-18 rounded-full border-2 border-yellow-500 p-0.5 bg-zinc-950" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-purple-500/30 bg-purple-500/10 rounded-full text-[9px] font-extrabold text-purple-400 uppercase tracking-widest block mb-1 select-none">
                  <Sparkles className="w-3 h-3 text-purple-400" /> Season Champion
                </div>
                <h3 className="font-extrabold text-base text-white mb-0.5 flex items-center gap-1.5 justify-center">
                  {podium[0].fullName}
                  <span className="text-sm" title={`${t.name} Tier`}>{t.emoji}</span>
                </h3>
                <p className="text-purple-400 text-xs font-bold uppercase tracking-wider">{podium[0].redditUsername}</p>
                <span className="text-[10px] mt-1.5 inline-block px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20 font-black">
                  {t.emoji} {t.name} Tier
                </span>
              </div>
              
              <div className="p-3 bg-zinc-950/80 rounded-2xl border border-purple-500/10 select-text w-full">
                <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                  {leaderboardType === 'earners' ? 'Total Rewards Earned' : 'Reddit Karma Standing'}
                </span>
                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 font-mono leading-none">
                  {leaderboardType === 'earners' ? `$${podium[0].totalEarned.toFixed(2)} USDT` : (
                    (isAdmin || currentUser?.id === podium[0].id) 
                      ? `${podium[0].karma?.toLocaleString() || 0} Karma` 
                      : `${t.name} Level`
                  )}
                </span>
              </div>
            </div>
          );
        })()}

        {/* 3rd place */}
        {podium[2] && (() => {
          const t = getKarmaTier(podium[2].karma);
          return (
            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden order-3 flex flex-col items-center text-center space-y-4">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-700/30"></div>
              <div className="relative">
                <span className="absolute -top-1 -right-1 bg-amber-700 text-zinc-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">3</span>
                <img src={podium[2].avatarUrl} alt="Avatar" className="w-14 h-14 rounded-full border-2 border-amber-700 p-0.5 bg-zinc-950" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white mb-0.5 flex items-center gap-1.5 justify-center">
                  {podium[2].fullName}
                  <span className="text-xs" title={`${t.name} Tier`}>{t.emoji}</span>
                </h3>
                <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">{podium[2].redditUsername}</p>
                <span className="text-[9px] mt-1 inline-block px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/10 font-bold">
                  {t.emoji} {t.name} Tier
                </span>
              </div>
              <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-white/5 select-text w-full">
                <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                  {leaderboardType === 'earners' ? 'Total Rewards Earned' : 'Reddit Karma Standing'}
                </span>
                <span className="text-base font-black text-white font-mono leading-none">
                  {leaderboardType === 'earners' ? `$${podium[2].totalEarned.toFixed(2)} USDT` : (
                    (isAdmin || currentUser?.id === podium[2].id) 
                      ? `${podium[2].karma?.toLocaleString() || 0} Karma` 
                      : `${t.name} Level`
                  )}
                </span>
              </div>
            </div>
          );
        })()}

      </div>

      {/* Leaderboard Table List (Ranks 4-10) */}
      <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-2xl">
        <h2 className="text-sm font-black uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-purple-400" /> Competitors Standings
        </h2>

        <div className="overflow-x-auto">
          {remaining.length === 0 ? (
            <div className="text-center py-6 text-zinc-500 text-xs font-semibold">
              No other active verified micro-influencers match criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse font-semibold">
              <thead className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5">
                <tr>
                  <th className="py-3 px-2">Rank Placement</th>
                  <th className="py-3 px-2">Reddit username</th>
                  <th className="py-3 px-2">Tier Badge</th>
                  <th className="py-3 px-2 text-right">Earning stats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-zinc-300 select-text">
                {remaining.map((item, idx) => {
                  const badgeInfo = getRankBadge(idx + 4);
                  const t = getKarmaTier(item.karma);
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.01]">
                      <td className="py-4 px-2">
                        <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-extrabold ${badgeInfo.style}`}>
                          {badgeInfo.text}
                        </span>
                      </td>
                      <td className="py-4 px-2 flex items-center gap-3">
                        <img src={item.avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full bg-zinc-950 p-0.5 border border-white/5" />
                        <div>
                          <span className="text-white font-black block leading-none">{item.fullName}</span>
                          <span className="text-purple-400 text-[10px]">{item.redditUsername}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <span className="px-2.5 py-1 bg-zinc-950/60 border border-white/5 rounded-xl text-[10px] text-zinc-300 font-extrabold select-none inline-flex items-center gap-1">
                          <span>{t.emoji}</span>
                          <span>{t.name}</span>
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <span className="text-sm font-black font-mono text-white">
                          {leaderboardType === 'earners' ? `$${item.totalEarned.toFixed(2)} USDT` : (
                            (isAdmin || currentUser?.id === item.id) 
                              ? `${item.karma?.toLocaleString() || 0} Karma` 
                              : `${t.emoji} ${t.name} Level`
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};
