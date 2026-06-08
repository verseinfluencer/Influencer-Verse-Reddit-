import React from 'react';
import { useApp } from '../context/AppContext';
import { getCreatorReputation } from '../utils/reputationHelper';
import { X, Award, Star, Activity, ShieldCheck, Mail, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CreatorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

export const CreatorProfileModal: React.FC<CreatorProfileModalProps> = ({ isOpen, onClose, userId }) => {
  const { users, submissions, creatorReviews } = useApp();

  if (!isOpen || !userId) return null;

  const user = users.find(u => u.id === userId);
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
        <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
          <div className="text-center py-8">
            <p className="text-gray-500 font-medium">Creator profile not found</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate dynamic stats
  const rep = getCreatorReputation(user, submissions, creatorReviews);
  const userSubs = submissions.filter(s => s.userId === userId);
  const approvedCount = userSubs.filter(s => s.status === 'Client Approved (Payment Released)' || s.status === 'Approved' || s.status.includes('Approved')).length;
  const userReviews = creatorReviews.filter(r => r.creatorId === userId);

  // Find approved/verified reddit accounts
  const redditAccounts = user.redditAccounts || [];
  const primaryAccount = redditAccounts.find(acc => acc.isPrimary) || redditAccounts[0];

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header banner */}
        <div className="bg-slate-900 px-6 py-8 text-white relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-all"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar block */}
            <div className="h-20 w-20 rounded-full border-2 border-white/20 bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-3xl font-bold uppercase shadow-lg">
              {user.fullName ? user.fullName.substring(0, 2) : 'CR'}
            </div>

            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 justify-center sm:justify-start">
                <h2 className="text-2xl font-bold tracking-tight">{user.fullName || user.email}</h2>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border ${rep.badgeColor}`}>
                  <Award className="h-3.5 w-3.5" />
                  {rep.level}
                </span>
              </div>
              
              <p className="text-slate-350 text-sm mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Registered {user.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs / Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 text-center">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Reputation Score</p>
              <p className="text-3xl font-black mt-1 text-indigo-600">{rep.score}<span className="text-xs font-normal text-slate-400">/100</span></p>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 text-center">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Average Rating</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <span className="text-3.5 font-bold text-amber-500">{rep.averageRating}</span>
                <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              </div>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 text-center">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Approved Tasks</p>
              <p className="text-3xl font-black mt-1 text-emerald-600">{approvedCount}</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 text-center">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Warnings Issued</p>
              <p className="text-3xl font-black mt-1 text-rose-500">{rep.warningsCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Col - Connected Accounts */}
            <div className="md:col-span-1 space-y-4">
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                Reddit Accounts
              </h3>
              
              <div className="space-y-3">
                {redditAccounts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No Reddit Accounts connected</p>
                ) : (
                  redditAccounts.map((acc, idx) => (
                    <div 
                      key={acc.id || idx} 
                      className="p-3 rounded-lg border border-slate-150 bg-white shadow-xs flex flex-col gap-1.5"
                    >
                      <div className="flex justify-between items-center">
                        <a 
                          href={acc.redditProfileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs font-semibold text-indigo-600 hover:underline truncate max-w-[120px]"
                        >
                          u/{acc.redditUsername}
                        </a>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          acc.status === 'Approved' || acc.status === 'approved' 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {acc.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Karma: {acc.karma}</span>
                        <span>Tier: {acc.tier || 'None'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Col - Reviews list */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                Recent Client Reviews ({userReviews.length})
              </h3>

              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                {userReviews.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-400 font-medium">No reviews received yet</p>
                  </div>
                ) : (
                  [...userReviews]
                    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((rev) => (
                      <div key={rev.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-1.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-semibold text-slate-800">{rev.clientName}</span>
                            <span className="text-[10px] text-slate-400 ml-2">
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {/* Stars */}
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`h-3 w-3 ${
                                  star <= rev.rating 
                                    ? 'text-amber-400 fill-amber-400' 
                                    : 'text-slate-200'
                                }`} 
                              />
                            ))}
                          </div>
                        </div>
                        
                        {rev.comment && (
                          <p className="text-xs text-slate-600 italic bg-white p-2 rounded border border-slate-100">
                            "{rev.comment}"
                          </p>
                        )}
                        <span className="text-[9px] font-mono text-slate-400">
                          Task: {rev.taskTitle}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Warning notes if any */}
          {user.warnings && user.warnings.length > 0 && (
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-150 space-y-2">
              <h4 className="font-bold text-xs text-rose-800 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                Active Account Warnings ({user.warnings.length})
              </h4>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {user.warnings.map((warn, i) => (
                  <div key={warn.id || i} className="text-xs text-rose-700 bg-white/60 p-2 rounded border border-rose-100 flex justify-between">
                    <span>{warn.reason}</span>
                    <span className="text-[10px] text-rose-500">{new Date(warn.date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
