import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Award, ShieldAlert, Sparkles, TrendingUp, Users, HeartCrack, ChevronRight, Trophy } from 'lucide-react';

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
  borderClass = "border border-gray-200"
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
        className={`${sizeClass} rounded-full object-cover ${borderClass} bg-white p-0.5`}
      />
    );
  }

  return (
    <div 
      className={`${sizeClass} rounded-full ${borderClass} bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center shadow-inner uppercase tracking-wider ${fontSizeClass} select-none`}
    >
      {initials}
    </div>
  );
};

export const Leaderboard: React.FC = () => {
  const { users, currentUser, submissions } = useApp();
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [leaderboardType, setLeaderboardType] = useState<'earners' | 'karma'>('earners');

  // Filter out admins/banned accounts and clients from leaderboard
  const legitimateUsers = users.filter(u => {
    const isClient = 
      u.role === 'client' || 
      u.role === 'brand' || 
      u.role === 'agency' || 
      (u as any).accountType === 'client' || 
      (u as any).userType === 'client' || 
      (u as any).isClient === true;
    return u.role !== 'admin' && u.status !== 'Banned' && !isClient;
  });

  const isAdmin = currentUser?.role === 'admin';

  // Apply Filter first
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
    if (rankOrdinal === 1) return { text: 'Gold #1', style: 'bg-amber-50 text-amber-800 border border-amber-200 font-extrabold uppercase tracking-wide text-[9px]' };
    if (rankOrdinal === 2) return { text: 'Silver #2', style: 'bg-gray-50 text-gray-700 border border-gray-200 font-bold uppercase tracking-wide text-[9px]' };
    if (rankOrdinal === 3) return { text: 'Bronze #3', style: 'bg-amber-50 text-amber-700 border border-amber-200 font-bold uppercase tracking-wide text-[9px]' };
    return { text: `# ${rankOrdinal}`, style: 'bg-gray-100 text-gray-500 border border-gray-200 font-mono' };
  };

  const getTasksCompletedCount = (userId: string) => {
    return submissions.filter(
      s => s.userId === userId && 
      (s.status === 'Approved' || s.status === 'Client Approved (Payment Released)' || s.status === 'Approved')
    ).length;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-gray-700 select-none" id="leaderboard-panel">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-4 border-b border-gray-200">
        <div>
          <span className="text-xs text-purple-600 font-bold uppercase tracking-widest block mb-1">Creators Honor Roll</span>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Platform Leaderboard</h1>
          <p className="text-sm text-gray-500">Track and compete against elite micro-influencers ranking up daily</p>
        </div>

        {/* Controls: sorting tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto font-semibold">
          
          {/* Sorting tabs */}
          <div className="flex bg-gray-100 border border-gray-200 p-1 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => setLeaderboardType('earners')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                leaderboardType === 'earners' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Top Earners
            </button>
            <button 
              onClick={() => setLeaderboardType('karma')}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                leaderboardType === 'karma' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
          <div className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden order-2 md:order-1 flex flex-col items-center text-center space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gray-300"></div>
            <div className="relative">
              <span className="absolute -top-1 -right-1 bg-gray-100 text-gray-700 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center border border-gray-300 shadow-sm">2</span>
              <LeaderboardAvatar 
                fullName={podium[1].fullName} 
                avatarUrl={podium[1].avatarUrl} 
                sizeClass="w-14 h-14" 
                fontSizeClass="text-base"
                borderClass="border-2 border-slate-300" 
              />
            </div>
            <div>
              <h3 className="font-bold text-gray-950 mb-0.5 text-center">
                {podium[1].fullName}
              </h3>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 select-text w-full space-y-2">
              <div>
                <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider font-display">
                  Total Earnings
                </span>
                <span className="text-base font-bold text-gray-900 font-mono leading-none block mt-0.5">
                  ${podium[1].totalEarned.toFixed(2)} USDT
                </span>
              </div>
              <div className="pt-1.5 border-t border-gray-200">
                <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider font-display">
                  Tasks Completed
                </span>
                <span className="text-xs font-bold text-gray-700 font-mono">
                  {getTasksCompletedCount(podium[1].id)} Tasks
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 1st Place Champion */}
        {podium[0] && (
          <div className="bg-white border-2 border-amber-300 rounded-[24px] p-8 relative overflow-hidden order-1 md:order-2 flex flex-col items-center text-center space-y-5 md:scale-105 shadow-md hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-yellow-500"></div>
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-amber-500/5 rounded-full blur-2xl"></div>
            
            <div className="relative">
              <Trophy className="absolute -top-7 right-5 w-6 h-6 text-amber-500 animate-bounce fill-amber-300" />
              <span className="absolute -top-1.5 -right-1 bg-amber-400 text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">1</span>
              <LeaderboardAvatar 
                fullName={podium[0].fullName} 
                avatarUrl={podium[0].avatarUrl} 
                sizeClass="w-18 h-18" 
                fontSizeClass="text-lg"
                borderClass="border-2 border-amber-400" 
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-amber-200 bg-amber-50 rounded-full text-[10px] font-bold text-amber-800 uppercase tracking-widest block mb-1.5 select-none mx-auto">
                <Sparkles className="w-3 h-3 text-amber-550 fill-amber-500" /> Season Champion
              </div>
              <h3 className="font-bold text-gray-950 text-wrap text-center">
                {podium[0].fullName}
              </h3>
            </div>
            
            <div className="p-3.5 bg-amber-50/40 rounded-2xl border border-amber-200 select-text w-full space-y-2">
              <div>
                <span className="text-[10px] text-amber-800 font-bold block uppercase tracking-wider font-display">
                  Total Earnings
                </span>
                <span className="text-lg font-bold text-amber-600 font-mono leading-none block my-1">
                  ${podium[0].totalEarned.toFixed(2)} USDT
                </span>
              </div>
              <div className="pt-2 border-t border-amber-200/50">
                <span className="text-[10px] text-amber-700 font-bold block uppercase tracking-wider font-display">
                  Tasks Completed
                </span>
                <span className="text-sm font-bold text-gray-800 font-mono">
                  {getTasksCompletedCount(podium[0].id)} Tasks
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3rd place */}
        {podium[2] && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden order-3 flex flex-col items-center text-center space-y-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-600/30"></div>
            <div className="relative">
              <span className="absolute -top-1 -right-1 bg-amber-50 text-amber-800 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center border border-amber-300 shadow-sm">3</span>
              <LeaderboardAvatar 
                fullName={podium[2].fullName} 
                avatarUrl={podium[2].avatarUrl} 
                sizeClass="w-14 h-14" 
                fontSizeClass="text-base"
                borderClass="border-2 border-amber-600/50" 
              />
            </div>
            <div>
              <h3 className="font-bold text-gray-950 mb-0.5 text-center">
                {podium[2].fullName}
              </h3>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 select-text w-full space-y-2">
              <div>
                <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider font-display">
                  Total Earnings
                </span>
                <span className="text-base font-bold text-gray-900 font-mono leading-none block mt-0.5">
                  ${podium[2].totalEarned.toFixed(2)} USDT
                </span>
              </div>
              <div className="pt-1.5 border-t border-gray-200">
                <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-wider font-display">
                  Tasks Completed
                </span>
                <span className="text-xs font-bold text-gray-700 font-mono">
                  {getTasksCompletedCount(podium[2].id)} Tasks
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Leaderboard Table List (Ranks 4-10) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-purple-600" /> Competitors Standings
        </h2>

        <div className="overflow-x-auto">
          {remaining.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs">
              No other active verified micro-influencers match criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse font-semibold">
              <thead className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Display Name</th>
                  <th className="py-3 px-3 text-right">Tasks Completed</th>
                  <th className="py-3 px-3 text-right">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-600 select-text">
                {remaining.map((item, idx) => {
                  const badgeInfo = getRankBadge(idx + 4);
                  const tasksCount = getTasksCompletedCount(item.id);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                      {/* Rank Column */}
                      <td className="py-4 px-3">
                        <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold ${badgeInfo.style}`}>
                          {badgeInfo.text}
                        </span>
                      </td>
                      {/* Combined Display Name & Avatar Column */}
                      <td className="py-4 px-3 flex items-center gap-3">
                        <LeaderboardAvatar 
                          fullName={item.fullName} 
                          avatarUrl={item.avatarUrl} 
                          sizeClass="w-8 h-8" 
                          fontSizeClass="text-[10px]"
                          borderClass="border border-gray-200" 
                        />
                        <span className="text-gray-900 font-bold block leading-none">{item.fullName}</span>
                      </td>
                      {/* Tasks Completed Column */}
                      <td className="py-4 px-3 text-right font-mono font-bold text-gray-600">
                        {tasksCount}
                      </td>
                      {/* Earnings Column */}
                      <td className="py-4 px-3 text-right">
                        <span className="text-sm font-bold font-mono text-emerald-600">
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
