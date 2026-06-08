import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getCreatorReputation } from '../utils/reputationHelper';
import { CreatorProfileModal } from '../components/CreatorProfileModal';
import { Award, Sparkles, Trophy, Star, Eye } from 'lucide-react';

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
  const { users, currentUser, submissions, creatorReviews } = useApp();
  const [leaderboardType, setLeaderboardType] = useState<'earners' | 'karma'>('earners');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Filter out admins/banned accounts and clients from leaderboard
  const legitimateUsers = users.filter(u => {
    const isClient = 
      u.role === 'client' || 
      u.role === 'brand' || 
      u.role === 'agency' || 
      (u as any).accountType === 'client' || 
      (u as any).userType === 'client' || 
      (u as any).isClient === true;
    return u.role !== 'admin' && u.status !== 'Banned' && u.status !== 'banned' && !isClient;
  });

  // Sort based on totalEarned or karma
  const getSortedData = () => {
    const list = [...legitimateUsers];
    if (leaderboardType === 'earners') {
      return list.sort((a, b) => b.totalEarned - a.totalEarned);
    } else {
      return list.sort((a, b) => (b.karma || 0) - (a.karma || 0));
    }
  };

  const sortedLeaderboard = getSortedData();

  // Extract Top 3 for podium
  const podium = sortedLeaderboard.slice(0, 3);
  const remaining = sortedLeaderboard.slice(3, 10);

  // Styling helper for rankings
  const getRankBadge = (rankOrdinal: number) => {
    if (rankOrdinal === 1) return { text: 'Gold #1', style: 'bg-amber-50 text-amber-850 border border-amber-250 font-extrabold uppercase tracking-wide text-[9px]' };
    if (rankOrdinal === 2) return { text: 'Silver #2', style: 'bg-slate-100 text-slate-750 border border-slate-200 font-bold uppercase tracking-wide text-[9px]' };
    if (rankOrdinal === 3) return { text: 'Bronze #3', style: 'bg-orange-50 text-orange-850 border border-orange-200 font-bold uppercase tracking-wide text-[9px]' };
    return { text: `# ${rankOrdinal}`, style: 'bg-gray-100 text-gray-500 border border-gray-200 font-mono' };
  };

  const getTasksCompletedCount = (userId: string) => {
    return submissions.filter(
      s => s.userId === userId && 
      (s.status === 'Client Approved (Payment Released)' || s.status === 'Approved' || s.status.includes('Approved'))
    ).length;
  };

  const handleOpenProfile = (uid: string) => {
    setSelectedUserId(uid);
    setIsProfileOpen(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-slate-750 select-none animate-in fade-in duration-200" id="leaderboard-panel">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs text-indigo-600 font-bold uppercase tracking-widest block mb-1">Creators Honor Roll</span>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Platform Leaderboard</h1>
          <p className="text-sm text-slate-500 font-medium">Track and compete against elite micro-influencers ranking up daily</p>
        </div>

        {/* Sorting tabs */}
        <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl">
          <button 
            onClick={() => setLeaderboardType('earners')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              leaderboardType === 'earners' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Top Earners
          </button>
          <button 
            onClick={() => setLeaderboardType('karma')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              leaderboardType === 'karma' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Highest Karma
          </button>
        </div>
      </div>

      {/* Podium Grid (Top 3 visual highlight cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
        
        {/* 2nd Place */}
        {podium[1] && (() => {
          const rep = getCreatorReputation(podium[1], submissions, creatorReviews);
          return (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden order-2 md:order-1 flex flex-col items-center text-center space-y-4 shadow-xs hover:shadow-sm hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-300"></div>
              <div className="relative">
                <span className="absolute -top-1 -right-1 bg-slate-100 text-slate-700 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center border border-slate-300 shadow-xs">2</span>
                <LeaderboardAvatar 
                  fullName={podium[1].fullName} 
                  avatarUrl={podium[1].avatarUrl} 
                  sizeClass="w-14 h-14" 
                  fontSizeClass="text-base"
                  borderClass="border-2 border-slate-300" 
                />
              </div>
              <div className="space-y-1">
                <h3 
                  onClick={() => handleOpenProfile(podium[1].id)}
                  className="font-bold text-slate-900 text-center hover:text-indigo-650 hover:underline cursor-pointer"
                >
                  {podium[1].fullName || podium[1].name}
                </h3>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] border font-medium ${rep.badgeColor}`}>
                  {rep.level}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 select-text w-full space-y-2 text-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Reputation</span>
                  <span className="font-extrabold text-indigo-600 font-mono">{rep.score}/100</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Avg Rating</span>
                  <span className="font-bold text-amber-500 flex items-center gap-0.5 font-mono">
                    {rep.averageRating} <Star className="h-3 w-3 fill-amber-400 text-amber-400 inline" />
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Earnings</span>
                  <span className="font-bold text-slate-900 font-mono">${podium[1].totalEarned.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => handleOpenProfile(podium[1].id)}
                  className="w-full mt-1.5 py-1.5 px-3 rounded-lg border border-slate-200 text-[11px] font-bold text-indigo-600 hover:bg-slate-100 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" /> View Profile
                </button>
              </div>
            </div>
          );
        })()}

        {/* 1st Place Champion */}
        {podium[0] && (() => {
          const rep = getCreatorReputation(podium[0], submissions, creatorReviews);
          return (
            <div className="bg-white border-2 border-indigo-250 rounded-[24px] p-8 relative overflow-hidden order-1 md:order-2 flex flex-col items-center text-center space-y-5 md:scale-105 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-indigo-605"></div>
              
              <div className="relative">
                <Trophy className="absolute -top-7 right-5 w-6 h-6 text-indigo-550 animate-bounce fill-indigo-250" />
                <span className="absolute -top-1.5 -right-1 bg-indigo-500 text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-xs">1</span>
                <LeaderboardAvatar 
                  fullName={podium[0].fullName} 
                  avatarUrl={podium[0].avatarUrl} 
                  sizeClass="w-18 h-18" 
                  fontSizeClass="text-lg"
                  borderClass="border-2 border-indigo-400" 
                />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-indigo-150 bg-indigo-50 rounded-full text-[9px] font-bold text-indigo-750 uppercase tracking-widest block select-none">
                  <Sparkles className="w-3 h-3 text-indigo-500 fill-indigo-500" /> Season Champion
                </div>
                <h3 
                  onClick={() => handleOpenProfile(podium[0].id)}
                  className="font-bold text-slate-900 text-center hover:text-indigo-650 hover:underline cursor-pointer block text-lg"
                >
                  {podium[0].fullName || podium[0].name}
                </h3>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] border font-semibold ${rep.badgeColor}`}>
                  {rep.level}
                </span>
              </div>
              
              <div className="p-3.5 bg-indigo-50/20 rounded-2xl border border-indigo-150 select-text w-full space-y-2 text-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-indigo-100">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Reputation</span>
                  <span className="font-extrabold text-indigo-600 font-mono">{rep.score}/100</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-indigo-100">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Avg Rating</span>
                  <span className="font-bold text-amber-500 flex items-center gap-0.5 font-mono">
                    {rep.averageRating} <Star className="h-3 w-3 fill-amber-400 text-amber-400 inline" />
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-indigo-100">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Earnings</span>
                  <span className="font-bold text-emerald-600 font-mono">${podium[0].totalEarned.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => handleOpenProfile(podium[0].id)}
                  className="w-full mt-1.5 py-2 px-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border shadow-sm border-indigo-600"
                >
                  <Eye className="h-4 w-4" /> View Full Profile
                </button>
              </div>
            </div>
          );
        })()}

        {/* 3rd place */}
        {podium[2] && (() => {
          const rep = getCreatorReputation(podium[2], submissions, creatorReviews);
          return (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden order-3 flex flex-col items-center text-center space-y-4 shadow-xs hover:shadow-sm hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-200"></div>
              <div className="relative">
                <span className="absolute -top-1 -right-1 bg-indigo-50 text-indigo-850 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center border border-indigo-200 shadow-xs">3</span>
                <LeaderboardAvatar 
                  fullName={podium[2].fullName} 
                  avatarUrl={podium[2].avatarUrl} 
                  sizeClass="w-14 h-14" 
                  fontSizeClass="text-base"
                  borderClass="border-2 border-indigo-150" 
                />
              </div>
              <div className="space-y-1">
                <h3 
                  onClick={() => handleOpenProfile(podium[2].id)}
                  className="font-bold text-slate-900 text-center hover:text-indigo-650 hover:underline cursor-pointer"
                >
                  {podium[2].fullName || podium[2].name}
                </h3>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] border font-medium ${rep.badgeColor}`}>
                  {rep.level}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 select-text w-full space-y-2 text-xs">
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Reputation</span>
                  <span className="font-extrabold text-indigo-600 font-mono">{rep.score}/100</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Avg Rating</span>
                  <span className="font-bold text-amber-500 flex items-center gap-0.5 font-mono">
                    {rep.averageRating} <Star className="h-3 w-3 fill-amber-400 text-amber-400 inline" />
                  </span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Earnings</span>
                  <span className="font-bold text-slate-900 font-mono">${podium[2].totalEarned.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => handleOpenProfile(podium[2].id)}
                  className="w-full mt-1.5 py-1.5 px-3 rounded-lg border border-slate-200 text-[11px] font-bold text-indigo-600 hover:bg-slate-100 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" /> View Profile
                </button>
              </div>
            </div>
          );
        })()}

      </div>

      {/* Leaderboard Table List (Ranks 4-10) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-600" /> Leaderboard Standings
        </h2>

        <div className="overflow-x-auto">
          {remaining.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs font-medium">
              No other active verified micro-influencers match criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse font-semibold">
              <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-4">Creator</th>
                  <th className="py-3 px-3 text-center">Reputation Score</th>
                  <th className="py-3 px-3 text-center">Avg Rating</th>
                  <th className="py-3 px-3 text-right">Tasks Completed</th>
                  <th className="py-3 px-3 text-right">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600 select-text">
                {remaining.map((item, idx) => {
                  const badgeInfo = getRankBadge(idx + 4);
                  const tasksCount = getTasksCompletedCount(item.id);
                  const rep = getCreatorReputation(item, submissions, creatorReviews);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                      {/* Rank Column */}
                      <td className="py-4 px-3">
                        <span className={`px-2.5 py-0.5 border rounded-full text-[10px] font-bold ${badgeInfo.style}`}>
                          {badgeInfo.text}
                        </span>
                      </td>
                      {/* Combined Display Name & Avatar Column */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <LeaderboardAvatar 
                            fullName={item.fullName} 
                            avatarUrl={item.avatarUrl} 
                            sizeClass="w-8 h-8" 
                            fontSizeClass="text-[10px]"
                            borderClass="border border-slate-200" 
                          />
                          <div className="flex flex-col">
                            <span 
                              onClick={() => handleOpenProfile(item.id)}
                              className="text-slate-900 font-bold hover:text-indigo-650 hover:underline cursor-pointer"
                            >
                              {item.fullName || item.name || item.email}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
                              Level: {rep.level}
                            </span>
                          </div>
                        </div>
                      </td>
                      {/* Reputation Score & Badge Column */}
                      <td className="py-4 px-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 font-black text-indigo-600 rounded-md font-mono">
                          {rep.score}
                        </span>
                      </td>
                      {/* Rating Column */}
                      <td className="py-4 px-3 text-center">
                        {rep.averageRating === 'N/A' ? (
                          <span className="text-slate-405 italic text-[11px]">N/A</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-500 font-mono">
                            {rep.averageRating}
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          </span>
                        )}
                      </td>
                      {/* Tasks Completed Column */}
                      <td className="py-4 px-3 text-right font-mono font-bold text-slate-600">
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

      {/* Creator Profile public popup modal */}
      <CreatorProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        userId={selectedUserId} 
      />

    </div>
  );
};
