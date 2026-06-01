import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Award, ShieldAlert, Sparkles, TrendingUp, Users, HeartCrack, ChevronRight } from 'lucide-react';

interface LeaderboardAvatarProps {
  fullName?: string | null;
  avatarUrl?: string | null;
  sizeClass?: string; // e.g. "w-14 h-14"
  fontSizeClass?: string; // e.g. "text-lg"
  borderClass?: string; // e.g. "border-2 border-zinc-400"
}

const LeaderboardAvatar: React.FC<LeaderboardAvatarProps> = ({ 
  fullName, 
  avatarUrl, 
  sizeClass = "w-12 h-12",
  fontSizeClass = "text-base",
  borderClass = "border border-white/5"
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = fullName ? fullName.trim().charAt(0).toUpperCase() : 'C';

  React.useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  if (avatarUrl && avatarUrl.trim() !== '' && !imageError) {
    return (
      <img 
        src={avatarUrl} 
        alt={fullName || 'User avatar'} 
        onError={() => setImageError(true)}
        className={`${sizeClass} rounded-full object-cover ${borderClass} bg-zinc-950 p-0.5`}
      />
    );
  }

  return (
    <div 
      className={`${sizeClass} rounded-full ${borderClass} bg-gradient-to-br from-purple-600 to-indigo-850 text-white font-black flex items-center justify-center shadow-inner uppercase tracking-wider ${fontSizeClass} select-none`}
    >
      {initials}
    </div>
  );
};

export const Leaderboard: React.FC = () => {
  const { users, currentUser, submissions } = useApp();
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [leaderboardType, setLeaderboardType] = useState<'earners' | 'karma'>('earners');

  // Filter out admins/banned accounts from leaderboard
  const legitimateUsers = users.filter(u => u.role !== 'admin' && u.status !== 'Banned');

  const isAdmin = currentUser?.role === 'admin';

  // Apply Filter first
  // Keep the ranking calculations unchanged, but tier badges are not shown in UI anymore.
  const filteredUsers = legitimateUsers;

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
    if (rankOrdinal === 1) return { text: '🥇 Gold #1', style: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
    if (rankOrdinal === 2) return { text: '🥈 Silver #2', style: 'bg-zinc-300/10 text-zinc-300 border-zinc-300/20' };
    if (rankOrdinal === 3) return { text: '🥉 Bronze #3', style: 'bg-amber-600/10 text-amber-600 border-amber-600/20' };
    return { text: `#${rankOrdinal}`, style: 'bg-zinc-950 text-zinc-500 border-zinc-850' };
  };

  const getTasksCompletedCount = (userId: string) => {
    return submissions.filter(
      s => s.userId === userId && 
      (s.status === 'Approved' || s.status === 'Client Approved (Payment Released)' || s.status === 'Approved')
    ).length;
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

        {/* Controls: sorting tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto font-semibold">
          
          {/* Sorting tabs */}
          <div className="flex bg-zinc-900 border border-white/5 p-1 rounded-2xl w-full sm:w-auto">
            <button 
              onClick={() => setLeaderboardType('earners')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                leaderboardType === 'earners' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-500 hover:text-white'
              }`}
            >
              Top Earners
            </button>
            <button 
              onClick={() => setLeaderboardType('karma')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                leaderboardType === 'karma' ? 'bg-purple-600 text-white shadow-md' : 'text-zinc-500 hover:text-white'
              }`}
            >
              Alternative Rankings
            </button>
          </div>

        </div>
      </div>

      {/* Podium Grid (Top 3 visual highlight cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
        
        {/* 2nd Place */}
        {podium[1] && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden order-2 md:order-1 flex flex-col items-center text-center space-y-4 shadow-xl">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-400/30"></div>
            <div className="relative">
              <span className="absolute -top-1 -right-1 bg-zinc-400 text-zinc-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-zinc-900 shadow-md">2</span>
              <LeaderboardAvatar 
                fullName={podium[1].fullName} 
                avatarUrl={podium[1].avatarUrl} 
                sizeClass="w-14 h-14" 
                fontSizeClass="text-base"
                borderClass="border-2 border-zinc-400/50" 
              />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white mb-0.5 text-center">
                {podium[1].fullName}
              </h3>
            </div>
            <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-white/5 select-text w-full space-y-2">
              <div>
                <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                  Total Earnings
                </span>
                <span className="text-base font-black text-emerald-400 font-mono leading-none block mt-0.5">
                  ${podium[1].totalEarned.toFixed(2)} USDT
                </span>
              </div>
              <div className="pt-1 border-t border-white/[0.03]">
                <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                  Tasks Completed
                </span>
                <span className="text-xs font-bold text-zinc-300 font-mono">
                  {getTasksCompletedCount(podium[1].id)} Tasks
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 1st Place Champion */}
        {podium[0] && (
          <div className="bg-gradient-to-tr from-purple-950/20 to-blue-950/20 border border-purple-500/30 rounded-3xl p-8 backdrop-blur-md relative overflow-hidden order-1 md:order-2 flex flex-col items-center text-center space-y-5 md:scale-105 shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-blue-500"></div>
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl"></div>
            
            <div className="relative">
              <span className="absolute -top-2.5 right-4 text-2xl animate-bounce">👑</span>
              <span className="absolute -top-1.5 -right-1 bg-yellow-400 text-zinc-950 font-black text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-zinc-950">1</span>
              <LeaderboardAvatar 
                fullName={podium[0].fullName} 
                avatarUrl={podium[0].avatarUrl} 
                sizeClass="w-18 h-18" 
                fontSizeClass="text-lg"
                borderClass="border-2 border-yellow-400/60" 
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-purple-500/30 bg-purple-500/10 rounded-full text-[9px] font-extrabold text-purple-400 uppercase tracking-widest block mb-1.5 select-none mx-auto">
                <Sparkles className="w-3 h-3 text-purple-400" /> Season Champion
              </div>
              <h3 className="font-extrabold text-base text-white mb-0.5 text-center">
                {podium[0].fullName}
              </h3>
            </div>
            
            <div className="p-3 bg-zinc-950/80 rounded-2xl border border-purple-500/10 select-text w-full space-y-2">
              <div>
                <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                  Total Earnings
                </span>
                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-mono leading-none block my-0.5">
                  ${podium[0].totalEarned.toFixed(2)} USDT
                </span>
              </div>
              <div className="pt-1.5 border-t border-white/[0.04]">
                <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                  Tasks Completed
                </span>
                <span className="text-sm font-bold text-zinc-300 font-mono">
                  {getTasksCompletedCount(podium[0].id)} Tasks
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3rd place */}
        {podium[2] && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden order-3 flex flex-col items-center text-center space-y-4 shadow-xl">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-700/30"></div>
            <div className="relative">
              <span className="absolute -top-1 -right-1 bg-amber-600 text-zinc-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-zinc-900 shadow-md">3</span>
              <LeaderboardAvatar 
                fullName={podium[2].fullName} 
                avatarUrl={podium[2].avatarUrl} 
                sizeClass="w-14 h-14" 
                fontSizeClass="text-base"
                borderClass="border-2 border-amber-600/50" 
              />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white mb-0.5 text-center">
                {podium[2].fullName}
              </h3>
            </div>
            <div className="p-2.5 bg-zinc-950/60 rounded-xl border border-white/5 select-text w-full space-y-2">
              <div>
                <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                  Total Earnings
                </span>
                <span className="text-base font-black text-emerald-400 font-mono leading-none block mt-0.5">
                  ${podium[2].totalEarned.toFixed(2)} USDT
                </span>
              </div>
              <div className="pt-1 border-t border-white/[0.03]">
                <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                  Tasks Completed
                </span>
                <span className="text-xs font-bold text-zinc-300 font-mono">
                  {getTasksCompletedCount(podium[2].id)} Tasks
                </span>
              </div>
            </div>
          </div>
        )}

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
                  <th className="py-3 px-2">Rank</th>
                  <th className="py-3 px-2">Display Name</th>
                  <th className="py-3 px-2 text-right">Tasks Completed</th>
                  <th className="py-3 px-2 text-right">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-zinc-300 select-text">
                {remaining.map((item, idx) => {
                  const badgeInfo = getRankBadge(idx + 4);
                  const tasksCount = getTasksCompletedCount(item.id);
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.01]">
                      {/* Rank Column */}
                      <td className="py-4 px-2">
                        <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-extrabold ${badgeInfo.style}`}>
                          {badgeInfo.text}
                        </span>
                      </td>
                      {/* Combined Display Name & Avatar Column */}
                      <td className="py-4 px-2 flex items-center gap-3">
                        <LeaderboardAvatar 
                          fullName={item.fullName} 
                          avatarUrl={item.avatarUrl} 
                          sizeClass="w-8 h-8" 
                          fontSizeClass="text-[10px]"
                          borderClass="border border-white/10" 
                        />
                        <span className="text-white font-black block leading-none">{item.fullName}</span>
                      </td>
                      {/* Tasks Completed Column */}
                      <td className="py-4 px-2 text-right font-mono font-bold text-zinc-300">
                        {tasksCount}
                      </td>
                      {/* Earnings Column */}
                      <td className="py-4 px-2 text-right">
                        <span className="text-sm font-black font-mono text-emerald-400">
                          ${item.totalEarned.toFixed(2)} USDT
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
