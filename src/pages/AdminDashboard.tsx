import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Task, Submission, Withdrawal, User, TaskType, Client, ClientTask, ClientPayment, ChatMessage, ClientChat } from '../types';
import { getKarmaTier } from '../utils/tierHelper';
import { 
  Users, FileText, CheckCircle, Wallet, Sparkles, 
  Trash2, Edit, CheckCircle2, XCircle, AlertCircle, Send, Plus, 
  Settings, Link, ExternalLink, MessageCircle, BarChart2, ShieldAlert,
  Building, CreditCard, MessageSquare, PlusCircle, CheckSquare, Shield, ToggleLeft, ToggleRight, AlertTriangle, Eye, SendHorizontal
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    users, tasks, submissions, withdrawals, transactions, settings,
    adminApproveUser, adminRejectUser, adminBanUser,
    adminCreateTask, adminEditTask, adminDeleteTask,
    adminReviewSubmission, adminReviewWithdrawal,
    adminCreateAnnouncement, adminUpdateSettings,
    resetCooldown, adminUpdateUserKarma, forceUnclaimTask, extendUserDeadline,
    
    // New Client Hooks and Properties from AppContext
    clients, clientTasks, clientPayments, clientChats,
    adminReviewClient, adminToggleTaskUpload, adminToggleGlobalTaskUpload, adminReviewClientTask,
    adminResolveDispute, adminConfirmClientPayment, adminReviewPayout, adminRemoveCompletedTask, adminDeductMember,
    adminSendMessage, adminToggleChatResolution,

    // New Anti-Cheat properties
    blacklistedIPs, duplicateGroups, fraudAlerts, currentSimulatedIP, setCurrentSimulatedIP, currentSimulatedCountry, setCurrentSimulatedCountry,
    blacklistIP, unblacklistIP, adminReviewFraudAction, dismissFraudAlert, deleteDuplicateGroup, mergeDuplicateAccounts, scanForDuplicates
  } = useApp();

  const [activeTab, setActiveTab] = useState<'users' | 'clients' | 'client-tasks' | 'client-payments' | 'client-chats' | 'tasks' | 'submissions' | 'withdrawals' | 'announcements' | 'settings' | 'security' | 'track-data'>('users');

  // Relative timer and manual refresh trigger for "Track Data"
  const [lastRefreshedTrigger, setLastRefreshedTrigger] = useState(0);
  const [secondsSinceRefresh, setSecondsSinceRefresh] = useState(0);

  useEffect(() => {
    setSecondsSinceRefresh(0);
    const interval = setInterval(() => {
      setSecondsSinceRefresh(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastRefreshedTrigger]);

  useEffect(() => {
    if (secondsSinceRefresh >= 60) {
      setLastRefreshedTrigger(prev => prev + 1);
    }
  }, [secondsSinceRefresh]);

  // Local helper states
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [submissionFeedback, setSubmissionFeedback] = useState<{ [key: string]: string }>({});
  
  // Client management local states
  const [clientRejectFeedback, setClientRejectFeedback] = useState<{ [key: string]: string }>({});
  const [selectedClientForPayment, setSelectedClientForPayment] = useState<string>('');
  const [confirmPayAmount, setConfirmPayAmount] = useState<number>(0);
  const [confirmPayNote, setConfirmPayNote] = useState<string>('');
  const [confirmPayReceiptUrl, setConfirmPayReceiptUrl] = useState<string>('');
  const [clientTaskRates, setClientTaskRates] = useState<{ [taskId: string]: number }>({});
  const [openChatId, setOpenChatId] = useState<string>('');
  const [adminReplyMessage, setAdminReplyMessage] = useState<string>('');
  
  // Create Task Form States
  const [taskType, setTaskType] = useState<TaskType>('post');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskReward, setTaskReward] = useState<number>(1.50);
  const [taskDifficulty, setTaskDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy');
  const [taskDeadline, setTaskDeadline] = useState('2026-06-30');
  const [taskMaxSubmissions, setTaskMaxSubmissions] = useState<number>(50);
  // Special task specific configurations
  const [isSpecialTask, setIsSpecialTask] = useState(false);
  const [minKarmaRequired, setMinKarmaRequired] = useState<number>(1000);
  const [specialLabel, setSpecialLabel] = useState('⭐ SPECIAL');

  // Post specific
  const [subreddit, setSubreddit] = useState('');
  const [requiredTitle, setRequiredTitle] = useState('');
  const [postGuidelines, setPostGuidelines] = useState('');
  // Comment specific
  const [commentPostUrl, setCommentPostUrl] = useState('');
  const [commentGuidelines, setCommentGuidelines] = useState('');

  // Announcement Form States
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annSuccessMsg, setAnnSuccessMsg] = useState(false);

  // Settings Form States
  const [globalMultiplier, setGlobalMultiplier] = useState(settings.globalMultiplier);
  const [dailyTaskLimit, setDailyTaskLimit] = useState(settings.dailyTaskLimit);
  const [referralBonus, setReferralBonus] = useState(settings.referralBonus);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [selectedAdminTierFilter, setSelectedAdminTierFilter] = useState<string>('all');
  const [selectedAdminStatusFilter, setSelectedAdminStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected' | 'Banned'>('all');

  const filteredUsersForAdmin = users.filter(u => {
    // 1. Status filter
    if (selectedAdminStatusFilter !== 'all' && u.status !== selectedAdminStatusFilter) {
      return false;
    }
    // 2. Tier filter
    if (selectedAdminTierFilter !== 'all' && getKarmaTier(u.karma).name.toLowerCase() !== selectedAdminTierFilter.toLowerCase()) {
      return false;
    }
    return true;
  });

  // Overview metrics
  const pendingVerificationsCount = users.filter(u => u.status === 'Pending').length;
  const pendingSubmissionsCount = submissions.filter(s => s.status === 'Pending').length;
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'Pending').length;
  const totalPayoutAmt = withdrawals.filter(w => w.status === 'Approved').reduce((acc, curr) => acc + curr.amount, 0);

  // Client Specific Overview metrics
  const pendingClientsCount = (clients || []).filter(c => c.status === 'pending').length;
  const pendingClientTasksCount = (clientTasks || []).filter(t => t.status === 'pending').length;
  const unresolvedChatsCount = (clientChats || []).filter(chat => chat.resolvedStatus === 'unresolved').length;
  const outstandingDuesCount = (clients || []).filter(c => c.payAgencyBalance > 0).length;

  // 1. Submit Create Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDescription || !taskReward || !taskMaxSubmissions) {
      alert('Please fill out general task fields.');
      return;
    }

    const baseTask = {
      title: taskTitle,
      description: taskDescription,
      type: taskType,
      reward: Number(taskReward),
      difficulty: taskDifficulty,
      deadline: taskDeadline + ' 23:59',
      maxSubmissions: Number(taskMaxSubmissions),
      proofRequired: taskType === 'post' ? 'Screenshot of the live post showing u/username clearly.' : 'Screenshot of comment + Permalink URL',
      isSpecial: isSpecialTask,
      minKarmaRequired: isSpecialTask ? Number(minKarmaRequired) : 0,
      specialLabel: isSpecialTask ? specialLabel : ''
    };

    let extendedTask = {};
    if (taskType === 'post') {
      extendedTask = {
        ...baseTask,
        targetSubreddit: subreddit,
        requiredPostTitle: requiredTitle,
        postGuidelines: postGuidelines
      };
    } else {
      extendedTask = {
        ...baseTask,
        postUrlToCommentOn: commentPostUrl,
        commentGuidelines: commentGuidelines
      };
    }

    adminCreateTask(extendedTask as any);
    alert('Task Created & Broadcast is Complete! A Notification has been published.');
    
    // Reset Form
    setTaskTitle('');
    setTaskDescription('');
    setTaskReward(1.50);
    setSubreddit('');
    setRequiredTitle('');
    setPostGuidelines('');
    setCommentPostUrl('');
    setCommentGuidelines('');
    setIsSpecialTask(false);
    setMinKarmaRequired(1000);
    setSpecialLabel('⭐ SPECIAL');
  };

  // 2. Submit announcement
  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annMessage) return;
    adminCreateAnnouncement(annTitle, annMessage);
    setAnnSuccessMsg(true);
    setAnnTitle('');
    setAnnMessage('');
    setTimeout(() => setAnnSuccessMsg(false), 3000);
  };

  // 3. Submit settings updates
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    adminUpdateSettings({
      globalMultiplier: Number(globalMultiplier),
      dailyTaskLimit: Number(dailyTaskLimit),
      referralBonus: 0.00
    });
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 3000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-white select-none" id="admin-dashboard-container">
      
      {/* Upper Brand Control Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-white/5">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 block mb-1">Administrative Center</span>
          <h1 className="text-2xl md:text-3xl font-black">Admin Panel Controls</h1>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap gap-1 bg-zinc-900 grid-cols-2 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto">
          {[
            { id: 'users', label: 'Users Map', count: pendingVerificationsCount },
            { id: 'clients', label: 'Clients Registry', count: pendingClientsCount },
            { id: 'client-tasks', label: 'Client Approvals', count: pendingClientTasksCount },
            { id: 'client-payments', label: 'Agency Payments', count: outstandingDuesCount },
            { id: 'client-chats', label: 'Client Support', count: unresolvedChatsCount },
            { id: 'tasks', label: 'Tasks Desk', count: null },
            { id: 'submissions', label: 'Task Submits', count: pendingSubmissionsCount },
            { id: 'withdrawals', label: 'Withdraw Desk', count: pendingWithdrawalsCount },
            { id: 'track-data', label: '📊 Track Data', count: null },
            { id: 'security', label: '🛡️ Security Center', count: (fraudAlerts || []).filter(a => a.status === 'pending').length },
            { id: 'announcements', label: 'Publish Feed', count: null }
          ].map(tab => (
            <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                 activeTab === tab.id 
                   ? 'bg-purple-600 text-white shadow-md' 
                   : 'text-zinc-400 hover:text-white hover:bg-white/5'
               }`}
            >
               {tab.label}
               {tab.count !== null && tab.count > 0 && (
                 <span className="px-1.5 py-0.5 bg-red-600 text-[9px] font-black rounded-full text-white animate-pulse">
                   {tab.count}
                 </span>
               )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Render Grid */}
      <div className="bg-zinc-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-md shadow-2xl">
        
        {/* ================= CLIENTS REGISTRY TAB ================= */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/5">
              <div>
                <h2 className="text-base font-black flex items-center gap-2 text-indigo-400">
                  <Building className="w-5 h-5" /> Brand Clients Management Registry
                </h2>
                <p className="text-xs text-zinc-500 mt-1">Review onboarding requirements, toggle upload privileges, or suspend brand campaigns.</p>
              </div>
              
              {/* Global Disable Client Upload Switch */}
              <div className="bg-zinc-950 p-3 rounded-2xl border border-white/5 flex items-center gap-4">
                <div>
                  <span className="text-xs font-bold text-white block">Global Task Lock</span>
                  <span className="text-[10px] text-zinc-500 font-medium">Block all brand uploads instantly</span>
                </div>
                <button
                  onClick={() => adminToggleGlobalTaskUpload(!settings.disableAllClientUploads)}
                  className={`p-1.5 rounded-xl border flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    settings.disableAllClientUploads
                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {settings.disableAllClientUploads ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-red-400" /> Uploads Blocked
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-emerald-400" /> Uploads Allowed
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Clients Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-2">Client Brand</th>
                    <th className="py-3 px-2">Country Code</th>
                    <th className="py-3 px-2">Contacts (Gmail / WhatsApp)</th>
                    <th className="py-3 px-2">Payment Terms / Budget</th>
                    <th className="py-3 px-2">Owed Dues</th>
                    <th className="py-3 px-2">Upload Link</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {(clients || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-500 font-semibold italic">
                        No clients registered under the system yet.
                      </td>
                    </tr>
                  ) : (
                    (clients || []).map(c => {
                      return (
                        <tr key={c.id} className="hover:bg-white/[0.02] tracking-wide">
                          <td className="py-4 px-2 space-y-0.5">
                            <p className="font-extrabold text-white text-sm">{c.name}</p>
                            <span className="text-[10px] text-zinc-400 font-bold bg-zinc-950 px-2 py-0.5 rounded border border-white/5 inline-block">{c.company}</span>
                          </td>
                          <td className="py-4 px-2 font-bold text-zinc-300">
                            {c.country}
                          </td>
                          <td className="py-4 px-2 space-y-1">
                            <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                              <span className="font-mono text-xs">{c.whatsapp}</span>
                              <a 
                                href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase border border-emerald-500/20"
                              >
                                Ping WhatsApp
                              </a>
                            </div>
                            <div className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
                              <span>{c.gmail}</span>
                              {c.gmailVerified ? (
                                <span className="text-[8px] bg-purple-500/20 text-purple-400 font-black px-1 rounded">Verified</span>
                              ) : (
                                <span className="text-[8px] bg-zinc-800 text-zinc-500 font-black px-1 rounded">Unverified</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-2 space-y-1">
                            <span className="text-zinc-300 block font-bold text-[11px]">{c.paymentMethod}</span>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              Est: <span className="text-zinc-400 font-bold">{c.budget || 'None'}</span>
                              {c.paymentNotes && <p className="text-[9px] font-sans text-zinc-500 max-w-sm truncate" title={c.paymentNotes}>"{c.paymentNotes}"</p>}
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <span className={`font-mono text-sm font-black ${c.payAgencyBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              ${c.payAgencyBalance.toFixed(2)} USDT
                            </span>
                          </td>
                          <td className="py-4 px-2">
                            <span className={`px-2 py-1 rounded text-[10px] font-black ${
                              c.taskUploadEnabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {c.taskUploadEnabled ? 'ENABLED' : 'DISABLED'}
                            </span>
                          </td>
                          <td className="py-4 px-2 select-none">
                            <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider ${
                              c.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                              c.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' :
                              c.status === 'rejected' ? 'bg-zinc-800 text-zinc-400' : 'bg-red-500/10 text-red-500'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-right space-y-2 min-w-[210px] select-none">
                            {c.status === 'pending' && (
                              <div className="space-y-1.5">
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => adminReviewClient(c.id, 'approved')}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black rounded text-white cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      const fb = clientRejectFeedback[c.id] || 'Brand submission failed identity and payment verification standards.';
                                      adminReviewClient(c.id, 'rejected', fb);
                                    }}
                                    className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600 hover:text-white border border-red-500/20 text-red-400 text-[10px] font-black rounded cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={clientRejectFeedback[c.id] || ''}
                                  onChange={(e: any) => setClientRejectFeedback({ ...clientRejectFeedback, [c.id]: e.target.value })}
                                  placeholder="Feedback/Rejection details..."
                                  className="w-full text-[10px] bg-zinc-950 border border-white/5 rounded px-2 py-1 text-white text-right"
                                />
                              </div>
                            )}

                            {c.status === 'approved' && (
                              <div className="flex gap-1.5 justify-end flex-wrap">
                                <button
                                  onClick={() => adminToggleTaskUpload(c.id, !c.taskUploadEnabled)}
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                                    c.taskUploadEnabled 
                                      ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' 
                                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                                  }`}
                                >
                                  {c.taskUploadEnabled ? 'Block Upload' : 'Allow Upload'}
                                </button>
                                <button
                                  onClick={() => adminReviewClient(c.id, 'suspended', 'Suspended for platform policy violations')}
                                  className="px-2 py-0.5 bg-zinc-850 hover:bg-zinc-700 text-zinc-300 text-[9px] font-bold rounded cursor-pointer"
                                >
                                  Hold Client
                                </button>
                              </div>
                            )}

                            {c.status === 'suspended' && (
                              <button
                                onClick={() => adminReviewClient(c.id, 'approved')}
                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black rounded text-white cursor-pointer"
                              >
                                Activate Profile
                              </button>
                            )}

                            {c.status === 'rejected' && (
                              <p className="text-[10px] text-zinc-500 italic max-w-[200px] text-right ml-auto">
                                rejected: "{c.rejectionReason}"
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= CLIENT TASK APPROVALS TAB ================= */}
        {activeTab === 'client-tasks' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-white/5">
              <h2 className="text-base font-black text-indigo-400 flex items-center gap-2">
                <CheckSquare className="w-5 h-5" /> Brand Campaigns Audit & Review Panel
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Audit campaigns proposed by brand clients. Specify payout multipliers before publishing them live to the creator marketplace.</p>
            </div>

            <div className="space-y-4">
              {(clientTasks || []).filter(t => t.status === 'pending').length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs italic bg-zinc-950/30 rounded-2xl border border-white/5">
                  Great! No proposed client tasks are pending editorial verification.
                </div>
              ) : (
                (clientTasks || []).filter(t => t.status === 'pending').map((t) => {
                  const rate = clientTaskRates[t.id] ?? (t.agencyPay * 0.70); // default user reward is 70% of client payout
                  return (
                    <div key={t.id} className="p-4 bg-zinc-950/50 border border-indigo-500/20 rounded-2xl flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1 space-y-3 font-semibold">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-black tracking-widest bg-indigo-600/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded uppercase">PROPOSED</span>
                          <span className="text-xs text-zinc-400 font-bold">Brand: {t.clientName || 'Unlabeled client'}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">({t.type})</span>
                        </div>
                        <h3 className="text-base text-white font-extrabold">{t.title}</h3>
                        <p className="text-xs text-zinc-400 font-normal leading-relaxed">{t.description}</p>
                        
                        <div className="p-3 bg-zinc-950 rounded-xl border border-white/5 text-xs text-zinc-400 font-normal space-y-1 select-text">
                          {t.targetSubreddit && <p><span className="font-bold text-zinc-300">Target Subreddit:</span> {t.targetSubreddit}</p>}
                          {t.postUrlToCommentOn && <p><span className="font-bold text-zinc-300">Comments URL:</span> <a href={t.postUrlToCommentOn} target="_blank" rel="noreferrer" className="text-blue-400 underline">{t.postUrlToCommentOn}</a></p>}
                          <p><span className="font-bold text-zinc-300">Brand Guidelines:</span> {t.guidelines}</p>
                          {t.notes && <p><span className="font-bold text-zinc-300">Client Private Notes:</span> {t.notes}</p>}
                          <p className="pt-2"><span className="font-bold text-emerald-400 font-mono">Proposed Agency Pay: ${t.agencyPay.toFixed(2)} USDT</span></p>
                        </div>
                      </div>

                      {/* Approval pricing tool */}
                      <div className="md:w-80 flex flex-col justify-between p-4 bg-zinc-900 border border-white/5 rounded-2xl select-none">
                        <div className="space-y-3">
                          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider block">Set Creator Rewards</span>
                          
                          <div>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="text-zinc-500">Agency Earns:</span>
                              <span className="font-mono text-zinc-200">${t.agencyPay.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-purple-400 font-bold">User Reward (USDT):</span>
                              <span className="font-bold font-mono text-emerald-400">${Number(rate).toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <input
                              type="range"
                              min={0.10}
                              max={t.agencyPay}
                              step={0.05}
                              value={rate}
                              onChange={(e: any) => setClientTaskRates({ ...clientTaskRates, [t.id]: Number(e.target.value) })}
                              className="w-full accent-purple-600 cursor-pointer h-1 bg-zinc-850 rounded"
                            />
                            <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                              <span>Min: $0.10</span>
                              <span>Agency Fee Margin: {(((t.agencyPay - rate) / t.agencyPay) * 100).toFixed(0)}%</span>
                              <span>Max: ${t.agencyPay.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex gap-2 items-center">
                            <span className="text-[10px] text-zinc-400 font-mono">Manual: $</span>
                            <input
                              type="number"
                              step="0.01"
                              value={rate}
                              onChange={(e: any) => setClientTaskRates({ ...clientTaskRates, [t.id]: Math.min(t.agencyPay, Number(e.target.value)) })}
                              className="w-20 bg-zinc-950 border border-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-white text-center"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-white/5 mt-4">
                          <button
                            onClick={() => adminReviewClientTask(t.id, 'publish', rate)}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 font-black text-xs rounded-xl text-white cursor-pointer transition-colors"
                          >
                            Publish Campaign
                          </button>
                          <button
                            onClick={() => adminReviewClientTask(t.id, 'reject')}
                            className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-extrabold text-xs rounded-xl cursor-pointer transition-colors"
                          >
                            Revert
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. Active Campaigns and Audits Desk */}
            <div className="pt-8 border-t border-white/5 space-y-4">
              <div>
                <h3 className="text-sm font-black text-rose-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Shield className="w-4 h-4" /> Live Campaigns Audit & Dispute Resolution Desk
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Manage live claims, resolve member-raised disputes, or initiate audit removals with automated wallet balance adjustments.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      <th className="py-2.5 px-2">Campaign Title / Brand</th>
                      <th className="py-2.5 px-2">Claimant</th>
                      <th className="py-2.5 px-2">Reward Values</th>
                      <th className="py-2.5 px-2">Dispute Status</th>
                      <th className="py-2.5 px-2">Execution State</th>
                      <th className="py-2.5 px-2 text-right">Audit Action Desk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(clientTasks || []).filter(t => t.status !== 'pending').length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500 italic font-semibold">
                          No active or audit-ready brand campaigns live yet.
                        </td>
                      </tr>
                    ) : (
                      (clientTasks || []).filter(t => t.status !== 'pending').map((t) => {
                        const isDisputed = t.disputeRaised;
                        const isRemoved = t.status === 'removed';
                        const isClientPaid = clients.find(c => c.id === t.clientId)?.payAgencyHistory?.some(pay => pay.tasksIncluded.includes(t.id)) || false;

                        return (
                          <tr key={t.id} className="hover:bg-white/[0.01]">
                            <td className="py-3 px-2 space-y-0.5 max-w-xs select-text">
                              <p className="font-extrabold text-white text-sm truncate" title={t.title}>{t.title}</p>
                              <div className="flex gap-2 text-[10px] text-zinc-400 font-bold">
                                <span>Brand: {t.clientName || 'N/A'}</span>
                                <span className="font-mono text-zinc-500">({t.type})</span>
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              {t.claimedBy ? (
                                <div className="space-y-0.5">
                                  <span className="font-extrabold text-zinc-200 block font-mono text-[11px]">{t.claimedBy}</span>
                                  {t.proofLink && (
                                    <a 
                                      href={t.proofLink} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="text-[9px] text-blue-400 hover:underline flex items-center gap-0.5"
                                    >
                                      Proof <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-zinc-500 italic">None Assigned</span>
                              )}
                            </td>
                            <td className="py-3 px-2 space-y-0.5 font-mono text-[11px]">
                              <p className="text-zinc-400 font-medium">Agency: <span className="text-zinc-200 font-bold">${t.agencyPay.toFixed(2)}</span></p>
                              <p className="text-purple-400 font-bold">User Pay: <span className="text-purple-300">${(t.memberPay || 0).toFixed(2)}</span></p>
                            </td>
                            <td className="py-3 px-2 select-none">
                              {isDisputed ? (
                                <div className="space-y-1">
                                  <span className="px-1.5 py-0.5 bg-red-600/20 text-red-400 font-black text-[9px] uppercase border border-red-500/20 rounded animate-pulse inline-block">
                                    Disputed 🚩
                                  </span>
                                  {t.disputeReason && (
                                    <p className="text-[10px] text-zinc-400 font-normal italic select-text max-w-[150px] truncate" title={t.disputeReason}>
                                      "{t.disputeReason}"
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-zinc-500 italic">No Disputes</span>
                              )}
                            </td>
                            <td className="py-3 px-2 select-none">
                              <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wide ${
                                t.status === 'live' ? 'bg-indigo-500/10 text-indigo-400' :
                                t.status === 'claimed' ? 'bg-amber-500/10 text-amber-500' :
                                t.status === 'submitted' ? 'bg-yellow-500/10 text-yellow-500' :
                                t.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                t.status === 'removed' ? 'bg-zinc-800 text-zinc-400 line-through' : 'bg-zinc-850 text-zinc-400'
                              }`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right space-y-1.5 select-none min-w-[200px]">
                              {isDisputed && (
                                <div className="flex gap-1 justify-end">
                                  <button
                                    onClick={() => {
                                      if (confirm('Verify Dispute: Force Approve and credit the creator with their full pay?')) {
                                        adminResolveDispute(t.id, 'force_approved');
                                        alert('Dispute Resolved: Mark approved!');
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black rounded text-white cursor-pointer"
                                  >
                                    Force Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Verify Dispute: Upheld rejection and reverse submission states?')) {
                                        adminResolveDispute(t.id, 'upheld');
                                        alert('Dispute Resolved: Rejection stands!');
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-red-650 hover:bg-red-600 text-[10px] font-black rounded text-white cursor-pointer"
                                  >
                                    Upheld Rejection
                                  </button>
                                </div>
                              )}

                              {!isRemoved && (t.status === 'completed' || t.status === 'submitted' || t.status === 'claimed') && (
                                <button
                                  onClick={() => {
                                    const feeStatusMsg = isClientPaid 
                                      ? "Warning: Client has already marked invoice paid for this campaign.\nThis will apply a standard post-payment balance deduction of $" + (t.memberPay || 0) + " USDT from the user's wallet."
                                      : "This task was removed prior to payment.\nIt will be returned back to the Live Pool. No creator balance penalties apply.";
                                    
                                    if (confirm("Initiate campaign audit and removal process for: \"" + t.title + "\"?\n\n" + feeStatusMsg)) {
                                      adminRemoveCompletedTask(t.id);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-red-600/10 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white font-black text-[10px] rounded cursor-pointer transition-colors inline-block"
                                >
                                  🛡️ Audit & Remove
                                </button>
                              )}

                              {isRemoved && (
                                <span className="text-[10px] text-zinc-500 italic font-semibold">
                                  {t.removedAfterPayment ? 'Deducted Post-Payment Audit' : 'Relisted / Audit Removed'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ================= CLIENT PAYMENT DESK TAB ================= */}
        {activeTab === 'client-payments' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Form panel */}
              <div className="space-y-6 lg:border-r lg:border-white/5 lg:pr-8">
                <h2 className="text-base font-black text-emerald-400 border-b border-white/5 pb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" /> Mark Invoice Paid
                </h2>

                <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 text-xs text-zinc-400 font-normal space-y-2">
                  <p>✨ Select an onboarding client with outstanding dues below to log their Crypto or Bank transfer receipt.</p>
                  <p>✨ Receipt confirmations immediately deduct from their agency balance and notify them inside their brand profile.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Select Owed Client</label>
                    <select
                      value={selectedClientForPayment}
                      onChange={(e: any) => {
                        const cid = e.target.value;
                        setSelectedClientForPayment(cid);
                        const cl = clients.find(c => c.id === cid);
                        setConfirmPayAmount(cl ? cl.payAgencyBalance : 0);
                      }}
                      className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none bg-zinc-900"
                    >
                      <option value="">-- Choose Client Profile --</option>
                      {(clients || []).filter(c => c.payAgencyBalance > 0).map(c => (
                        <option key={c.id} value={c.id}>
                          {c.company} ({c.name}) - ${c.payAgencyBalance.toFixed(2)} USDT Owed
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Receipt Clearing Amount (USDT)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={confirmPayAmount}
                      onChange={(e: any) => setConfirmPayAmount(Number(e.target.value))}
                      placeholder="e.g. 150.00"
                      className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Notes / Transaction Hash Reference</label>
                    <input
                      type="text"
                      value={confirmPayNote}
                      onChange={(e: any) => setConfirmPayNote(e.target.value)}
                      placeholder="e.g. USDT BEP20 TxHash: 0x47a9ff..."
                      className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Receipt Screenshot / PDF URL</label>
                    <input
                      type="text"
                      value={confirmPayReceiptUrl}
                      onChange={(e: any) => setConfirmPayReceiptUrl(e.target.value)}
                      placeholder="https://ipfs.io/... or transaction image url"
                      className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500 font-mono"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (!selectedClientForPayment || confirmPayAmount <= 0) {
                        alert('Pick a client and specify a payment clearance value.');
                        return;
                      }
                      adminConfirmClientPayment(selectedClientForPayment, confirmPayAmount, confirmPayNote, confirmPayReceiptUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=ReceiptPaid');
                      alert('Receipt logged! Client account dues cleared of outstanding balance.');
                      // Reset fields
                      setSelectedClientForPayment('');
                      setConfirmPayAmount(0);
                      setConfirmPayNote('');
                      setConfirmPayReceiptUrl('');
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer"
                  >
                    Clear Dues & Broadcast Receipt
                  </button>
                </div>
              </div>

              {/* History list */}
              <div className="lg:col-span-2 space-y-6">
                <h2 className="text-base font-black border-b border-white/5 pb-3">History of Paid Client Receipts</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <th className="py-2 px-1">Brand Name</th>
                        <th className="py-2 px-1">Clearing Value</th>
                        <th className="py-2 px-1">Receipt Ref</th>
                        <th className="py-2 px-1">Log Date</th>
                        <th className="py-2 px-1 text-right">Proof</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(clientPayments || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-500 italic font-semibold">
                            No agency payment audits logged yet.
                          </td>
                        </tr>
                      ) : (
                        (clientPayments || []).map(p => (
                          <tr key={p.id} className="hover:bg-white/[0.01]">
                            <td className="py-3 px-1 font-bold text-white">
                              {p.clientName}
                            </td>
                            <td className="py-3 px-1 font-mono font-black text-emerald-400">
                              ${p.amount.toFixed(2)} USDT
                            </td>
                            <td className="py-3 px-1 font-mono text-[10px] text-zinc-400 select-text max-w-xs truncate" title={p.referenceNote}>
                              {p.referenceNote}
                            </td>
                            <td className="py-3 px-1 text-zinc-500 font-mono">
                              {new Date(p.paidAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-1 text-right">
                              <a
                                href={p.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] bg-zinc-950 hover:bg-white/10 px-2 py-1 rounded inline-flex items-center gap-1 border border-white/5 hover:text-white"
                              >
                                View Doc <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CLIENT SUPPORT CHAT DESK TAB ================= */}
        {activeTab === 'client-chats' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-white/5">
              <h2 className="text-base font-black text-indigo-400 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Brand Support Direct Inbox
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Resolve outstanding support inquiries submitted by onboarding brand managers. Unread messages show real-time double checkticks.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[500px]">
              
              {/* Inbox lists left */}
              <div className="space-y-3 bg-zinc-950/30 p-4 border border-white/5 rounded-2xl select-none">
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider block border-b border-white/5 pb-2">Conversations</span>
                
                <div className="space-y-2 max-h-[450px] overflow-y-auto">
                  {(clientChats || []).length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 italic text-xs">
                      No customer chat logs detected.
                    </div>
                  ) : (
                    (clientChats || []).map(chat => {
                      const latestMessage = chat.messages[chat.messages.length - 1];
                      const snippet = latestMessage ? latestMessage.text : 'Opened support stream';
                      const isOpened = openChatId === chat.clientId;
                      const hasUnread = chat.resolvedStatus === 'unresolved';

                      return (
                        <div
                          key={chat.id}
                          onClick={() => setOpenChatId(chat.clientId)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 relative ${
                            isOpened 
                              ? 'bg-indigo-600/15 border-indigo-500/30' 
                              : 'bg-zinc-900 border-zinc-950 hover:bg-zinc-800'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-extrabold text-xs text-white block truncate">{chat.clientName}</span>
                            {hasUnread && (
                              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1 animate-pulse"></span>
                            )}
                          </div>
                          
                          <p className="text-[11px] text-zinc-400 font-normal mt-1 leading-snug line-clamp-1">{snippet}</p>
                          
                          <div className="flex justify-between items-center text-[9px] text-zinc-500 font-mono mt-2 pt-1 border-t border-white/[0.03]">
                            <span>Status: {chat.resolvedStatus === 'resolved' ? '✅ Resolved' : '🛠️ Open'}</span>
                            <span>{new Date(chat.lastMessageTimestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Chat screen helper right */}
              <div className="lg:col-span-2 bg-zinc-950/50 rounded-2xl border border-white/5 flex flex-col justify-between overflow-hidden">
                {!openChatId ? (
                  <div className="m-auto text-center py-20 pointer-events-none select-none">
                    <MessageCircle className="w-12 h-12 text-zinc-600 mx-auto opacity-40 mb-3" />
                    <p className="text-zinc-500 text-xs font-bold">Pick an active client thread from the sidebar list to chat.</p>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    {(() => {
                      const activeChat = (clientChats || []).find(ch => ch.clientId === openChatId);
                      if (!activeChat) return null;
                      return (
                        <div className="p-4 bg-zinc-900 border-b border-white/5 flex justify-between items-center select-none">
                          <div>
                            <span className="font-black text-xs text-white">{activeChat.clientName} Profile Stream</span>
                            <span className="block text-[10px] text-zinc-500 mt-0.5">Status: <span className={activeChat.resolvedStatus === 'resolved' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{activeChat.resolvedStatus?.toUpperCase() || 'UNRESOLVED'}</span></span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const nextStat = activeChat.resolvedStatus === 'resolved' ? 'unresolved' : 'resolved';
                                adminToggleChatResolution(openChatId, nextStat);
                              }}
                              className="px-2.5 py-1 text-[10px] uppercase font-black tracking-wide border border-white/10 hover:border-white/20 hover:bg-white/5 text-zinc-300 rounded cursor-pointer transition-colors"
                            >
                              Toggle {activeChat.resolvedStatus === 'resolved' ? 'Open' : 'Resolved'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Messages Body */}
                    <div className="flex-1 p-4 space-y-3.5 overflow-y-auto max-h-[350px]">
                      {(() => {
                        const activeChat = (clientChats || []).find(ch => ch.clientId === openChatId);
                        if (!activeChat) return null;
                        return activeChat.messages.map((m) => {
                          const isAdmin = m.senderId === 'admin';
                          return (
                            <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                              <div className={`p-3 rounded-2xl max-w-sm text-xs font-normal leading-relaxed ${
                                isAdmin 
                                  ? 'bg-indigo-600 text-white rounded-br-none' 
                                  : 'bg-zinc-800 text-zinc-200 rounded-bl-none'
                              }`}>
                                <span className="block text-[9px] text-[#A5B4FC] font-extrabold pb-0.5 uppercase tracking-wide">
                                  {m.senderName}
                                </span>
                                
                                <p className="text-white font-medium select-text">{m.text}</p>
                                
                                {m.fileUrl && (
                                  <div className="mt-2 text-[10px] bg-black/20 p-1.5 rounded flex items-center gap-1 select-all">
                                    <span className="truncate flex-1 font-mono text-[9px]">{m.fileUrl}</span>
                                    <a href={m.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-200 hover:underline font-bold shrink-0">Open ↗</a>
                                  </div>
                                )}

                                <div className="text-[8px] opacity-70 text-right mt-1.5 font-mono flex items-center justify-end gap-1 select-none">
                                  <span>{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  {isAdmin && (
                                    <span className="text-indigo-300 tracking-tight font-extrabold" title="Double checktick status">✓✓</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Compose Footer */}
                    <div className="p-3 bg-zinc-900 border-t border-white/5 flex gap-2 select-none">
                      <input
                        type="text"
                        value={adminReplyMessage}
                        onChange={(e) => setAdminReplyMessage(e.target.value)}
                        placeholder="Type response to brand client..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && adminReplyMessage.trim()) {
                            adminSendMessage(openChatId, adminReplyMessage);
                            setAdminReplyMessage('');
                          }
                        }}
                        className="flex-1 bg-zinc-950 border border-white/10 px-3 py-2 rounded-xl text-xs focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          if (!adminReplyMessage.trim()) return;
                          adminSendMessage(openChatId, adminReplyMessage);
                          setAdminReplyMessage('');
                        }}
                        className="p-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center"
                      >
                        <SendHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ================= USERS TAB ================= */}
        {activeTab === 'users' && (
          <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
                <div className="space-y-1">
                  <h2 className="text-base font-black">User Management</h2>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-semibold uppercase">
                    <span>Total registered creators: {users.length}</span>
                    {selectedAdminTierFilter !== 'all' && (
                      <span className="text-purple-400 font-bold">• Filtered by: {selectedAdminTierFilter} Tier ({filteredUsersForAdmin.length} matching)</span>
                    )}
                    {selectedAdminStatusFilter !== 'all' && (
                      <span className="text-yellow-400 font-bold">• Status: {selectedAdminStatusFilter} ({filteredUsersForAdmin.length} matching)</span>
                    )}
                  </div>
                </div>

                {/* Tier filter dropdown */}
                <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-xl border border-white/5 font-semibold text-xs text-zinc-400 select-none">
                  <span>Filter by Custom Tier:</span>
                  <select
                    value={selectedAdminTierFilter}
                    onChange={(e) => setSelectedAdminTierFilter(e.target.value)}
                    className="bg-zinc-900 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-0 cursor-pointer text-xs font-black p-1 px-2"
                  >
                    <option value="all">👑 All Tiers</option>
                    <option value="bronze">🥉 Bronze</option>
                    <option value="silver">🥈 Silver</option>
                    <option value="gold">⭐ Gold</option>
                    <option value="diamond">💎 Diamond</option>
                    <option value="platinum">🔥 Platinum</option>
                    <option value="elite">👑 Elite</option>
                    <option value="legend">🚀 Legend</option>
                  </select>
                </div>
              </div>

              {/* Users sub-tabs for User Management */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 bg-zinc-950/40 border border-white/5 rounded-2xl select-none">
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'all', label: '👥 All Users', count: users.length },
                    { id: 'Pending', label: '⏳ Pending', count: users.filter(u => u.status === 'Pending').length },
                    { id: 'Approved', label: '✅ Approved', count: users.filter(u => u.status === 'Approved').length },
                    { id: 'Rejected', label: '❌ Rejected', count: users.filter(u => u.status === 'Rejected').length },
                    { id: 'Banned', label: '🚫 Suspended', count: users.filter(u => u.status === 'Banned').length },
                  ].map((sTab) => (
                    <button
                      key={sTab.id}
                      type="button"
                      id={`users-tab-${sTab.id.toLowerCase()}`}
                      onClick={() => setSelectedAdminStatusFilter(sTab.id as any)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedAdminStatusFilter === sTab.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{sTab.label}</span>
                      {sTab.count > 0 ? (
                        <span className={`px-1.5 py-0.2 select-none font-extrabold text-[9px] rounded-full ${
                          selectedAdminStatusFilter === sTab.id
                            ? 'bg-purple-800 text-purple-100'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {sTab.count}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-650 font-normal">0</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-purple-400/80 font-black uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                  <span>Real-time listener active</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      <th className="py-3 px-2">Core Profile</th>
                      <th className="py-3 px-2">Reddit username</th>
                      <th className="py-3 px-2">Reddit Karma / Badge</th>
                      <th className="py-3 px-2">Audit Link</th>
                      <th className="py-3 px-2">Current Status</th>
                      <th className="py-3 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredUsersForAdmin.map(u => {
                      const isCooldownActive = u.cooldown_expires_at && new Date(u.cooldown_expires_at) > new Date();
                      const ut = getKarmaTier(u.karma);
                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02]">
                          <td className="py-4 px-2 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-extrabold text-white text-sm">{u.fullName}</p>
                              <span className="px-1.5 py-0.2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-extrabold text-[9px] uppercase tracking-wider select-none">
                                {ut.emoji} {ut.name}
                              </span>
                            </div>
                            <p className="text-zinc-500 font-mono font-bold text-[10px]">{u.email}</p>
                            {/* Display private gender field strictly to admin */}
                            <p className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Private Gender:</span>
                              <span className="text-zinc-300 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5 inline-block">{u.gender || "Not specified"}</span>
                            </p>
                          </td>
                        <td className="py-4 px-2">
                          <span className="text-purple-400 font-bold">{u.redditUsername}</span>
                        </td>
                        <td className="py-4 px-2">
                          <div className="text-[11px] space-y-0.5 min-w-[120px] select-text">
                            <div className="font-extrabold text-white flex items-center gap-1.5">
                              <span>{(u.karma || 0).toLocaleString()}</span>
                              <span className="text-[8px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.2 rounded font-black uppercase tracking-wider">{u.karmaBadge || 'Bronze'}</span>
                            </div>
                            {u.karmaYesterday !== undefined && (
                              <div className={`text-[9px] font-bold font-mono ${(u.karma || 0) - (u.karmaYesterday || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {(u.karma || 0) - (u.karmaYesterday || 0) >= 0 ? '▲ +' : '▼ '}
                                {((u.karma || 0) - (u.karmaYesterday || 0)).toLocaleString()} yesterday
                              </div>
                            )}
                            {/* Easy buttons to adjust Karma for admin sandbox testing */}
                            {u.role !== 'admin' && (
                              <div className="flex gap-1.5 items-center pt-1.5 select-none pointer-events-auto">
                                <button 
                                  onClick={() => adminUpdateUserKarma(u.id, (u.karma || 0) + 1000)}
                                  className="text-[8px] font-extrabold text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-white/5 hover:text-white"
                                  title="Add 1,000 Karma"
                                >
                                  +1K
                                </button>
                                <button 
                                  onClick={() => adminUpdateUserKarma(u.id, Math.max(0, (u.karma || 0) - 1000))}
                                  className="text-[8px] font-extrabold text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-white/5 hover:text-white"
                                  title="Subtract 1,000 Karma"
                                >
                                  -1K
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <a 
                            href={u.redditProfileLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-blue-400 hover:underline font-bold inline-flex items-center gap-1"
                          >
                            Manual Review Link <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                        <td className="py-4 px-2">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            u.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                            u.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' :
                            u.status === 'Rejected' ? 'bg-zinc-800 text-zinc-400 font-semibold' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {u.status}
                          </span>
                          {isCooldownActive && (
                            <span className="block mt-1 bg-yellow-500/10 border border-yellow-500/25 px-1.5 py-0.5 rounded text-[9px] font-black text-yellow-400 font-mono w-max animate-pulse">
                              ⏳ ON COOLDOWN
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-2 text-right space-y-1.5 min-w-[200px]">
                          {/* If on cooldown, allow administrator to instantly reset it */}
                          {isCooldownActive && u.role !== 'admin' && (
                            <div className="pb-1.5">
                              <button 
                                onClick={() => resetCooldown(u.id)}
                                className="w-full py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500 hover:text-black font-extrabold text-[9px] rounded transition-all cursor-pointer"
                              >
                                Reset Claim Cooldown ⏳
                              </button>
                            </div>
                          )}

                          {u.status === 'Pending' && (
                          <div className="space-y-2">
                            <div className="flex gap-1.5 justify-end">
                              <button 
                                onClick={() => adminApproveUser(u.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black rounded text-white cursor-pointer"
                              >
                                Approve User
                              </button>
                              <button 
                                onClick={() => {
                                  const reason = rejectReason[u.id] || 'Reddit profile failed minimum age/authenticity check';
                                  adminRejectUser(u.id, reason);
                                }}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black rounded text-zinc-300 cursor-pointer"
                              >
                                Reject User
                              </button>
                            </div>
                            <input 
                              type="text"
                              value={rejectReason[u.id] || ''}
                              onChange={(e) => setRejectReason({ ...rejectReason, [u.id]: e.target.value })}
                              placeholder="Reason for rejection description..."
                              className="w-full text-[10px] bg-zinc-950 border border-white/5 rounded px-2 py-1 text-white text-right"
                            />
                          </div>
                        )}
                        {u.status === 'Approved' && u.role !== 'admin' && (
                          <button 
                            onClick={() => adminBanUser(u.id, 'Violating guidelines or posting duplicate spam proofs.')}
                            className="px-2 py-0.5 bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white text-[10px] font-bold rounded cursor-pointer"
                          >
                            Ban Account
                          </button>
                        )}
                        {u.status === 'Banned' && (
                          <p className="text-[10px] text-zinc-500 italic max-w-[180px] ml-auto">
                            Suspended: {u.rejectionReason}
                          </p>
                        )}
                        {u.role === 'admin' && (
                          <span className="text-[10px] text-zinc-500 font-extrabold uppercase">Platform Admin Locked</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TASKS TAB ================= */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Create form col */}
            <div className="space-y-6 lg:border-r lg:border-white/5 lg:pr-8">
              <h2 className="text-base font-black border-b border-white/5 pb-3 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" /> Spawn New Reddit Task
              </h2>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Campaign Category Type</label>
                  <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl">
                    <button 
                      type="button" 
                      onClick={() => setTaskType('post')}
                      className={`py-1 rounded-lg text-xs font-bold transition-all ${
                        taskType === 'post' ? 'bg-purple-600 text-white' : 'text-zinc-400'
                      }`}
                    >
                      Reddit Post Task
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setTaskType('comment')}
                      className={`py-1 rounded-lg text-xs font-bold transition-all ${
                        taskType === 'comment' ? 'bg-purple-600 text-white' : 'text-zinc-400'
                      }`}
                    >
                      Reddit Comment Task
                    </button>
                  </div>
                </div>

                {/* Special Task Switch */}
                <div className="p-3 bg-zinc-950 rounded-xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black text-white block">⭐ Special Task Campaign</span>
                      <span className="text-[9px] text-zinc-500 block">Restricted to high karma creators</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isSpecialTask}
                        onChange={(e) => setIsSpecialTask(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  {isSpecialTask && (
                    <div className="space-y-3 pt-1.5 border-t border-white/5">
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Minimum Reddit Karma Required</label>
                        <input 
                          type="number" 
                          value={minKarmaRequired}
                          onChange={(e) => setMinKarmaRequired(Number(e.target.value))}
                          className="w-full text-xs text-white bg-zinc-900 border border-white/10 px-2.5 py-1.5 rounded-lg focus:border-purple-500 font-mono"
                          placeholder="e.g. 1000"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Special Badge Label</label>
                        <input 
                          type="text" 
                          value={specialLabel}
                          onChange={(e) => setSpecialLabel(e.target.value)}
                          className="w-full text-xs text-white bg-zinc-900 border border-white/10 px-2.5 py-1.5 rounded-lg focus:border-purple-500 font-bold"
                          placeholder="e.g. ⭐ SPECIAL"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Task Title</label>
                  <input 
                    type="text" 
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g., Post scaling thread in r/cryptocurrency" 
                    className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Task Description</label>
                  <textarea 
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Provide overview of the campaign purpose." 
                    className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl h-20 focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Reward (USDT Base)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={taskReward}
                      onChange={(e) => setTaskReward(Number(e.target.value))}
                      className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2 rounded-xl focus:border-purple-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Diff Level</label>
                    <select 
                      value={taskDifficulty}
                      onChange={(e: any) => setTaskDifficulty(e.target.value)}
                      className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2 rounded-xl focus:border-purple-500 focus:outline-none bg-zinc-900"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                {/* Post specific fields */}
                {taskType === 'post' ? (
                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">Target Subreddit</label>
                      <input 
                        type="text" 
                        value={subreddit}
                        onChange={(e) => setSubreddit(e.target.value)}
                        placeholder="e.g., r/personalfinance" 
                        className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">Required Post Title</label>
                      <input 
                        type="text" 
                        value={requiredTitle}
                        onChange={(e) => setRequiredTitle(e.target.value)}
                        placeholder="Must match title exactly" 
                        className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">Guidelines/Required keywords</label>
                      <textarea 
                        value={postGuidelines}
                        onChange={(e) => setPostGuidelines(e.target.value)}
                        placeholder="e.g. Must write copy minimum 150 words. Do not refer to spam URLs." 
                        className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2 rounded-xl h-16 focus:border-purple-500"
                      />
                    </div>
                  </div>
                ) : (
                  /* Comment specific fields */
                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">Target Reddit Post URL to comment on</label>
                      <input 
                        type="text" 
                        value={commentPostUrl}
                        onChange={(e) => setCommentPostUrl(e.target.value)}
                        placeholder="https://reddit.com/r/.../best_thread" 
                        className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">Comment Guidelines/Required keywords</label>
                      <textarea 
                        value={commentGuidelines}
                        onChange={(e) => setCommentGuidelines(e.target.value)}
                        placeholder="e.g. Must comment about 'high gas fees' or 'zero scalability benefits'. Minimum 2 sentences." 
                        className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2 rounded-xl h-20 focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Max slots limit</label>
                    <input 
                      type="number" 
                      value={taskMaxSubmissions}
                      onChange={(e) => setTaskMaxSubmissions(Number(e.target.value))}
                      className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2 rounded-xl focus:border-purple-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Deadline Date</label>
                    <input 
                      type="date" 
                      value={taskDeadline}
                      onChange={(e) => setTaskDeadline(e.target.value)}
                      className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2 rounded-xl focus:border-purple-500 focus:outline-none select-none"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-xs font-black text-white hover:opacity-95 shadow-md shadow-purple-500/10 rounded-xl cursor-pointer"
                >
                  Confirm & Broadcast Campaign
                </button>
              </form>
            </div>

            {/* View current tasks list */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-base font-black border-b border-white/5 pb-3 flex justify-between items-center">
                <span>Active Live Task Desk</span>
                <span className="text-xs text-zinc-500">Total active: {tasks.length} campaigns</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      <th className="py-2 px-1">Campaign Info</th>
                      <th className="py-2 px-1">Type</th>
                      <th className="py-2 px-1">Karma Required</th>
                      <th className="py-2 px-1">Claimed By</th>
                      <th className="py-2 px-1">Claim Time</th>
                      <th className="py-2 px-1">Deadline</th>
                      <th className="py-2 px-1">Status</th>
                      <th className="py-2 px-1 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-[11px]">
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-zinc-500 font-semibold select-text">
                          No active campaigns created yet. Deploy the first one!
                        </td>
                      </tr>
                    ) : (
                      tasks.map(t => {
                        const claimedUser = t.claimed_by ? users.find(u => u.id === t.claimed_by) : null;
                        const isSpecial = t.isSpecial;
                        const isClaimed = t.status === 'claimed';

                        return (
                          <tr key={t.id} className="hover:bg-white/[0.01]">
                            <td className="py-3 px-1 space-y-0.5">
                              <p className="font-bold text-white text-xs">{t.title}</p>
                              <div className="flex gap-2 text-[9px] font-bold text-zinc-500 font-mono">
                                <span>Slots: {t.completedSubmissionsCount} / {t.maxSubmissions}</span>
                                <span className="text-rose-400 font-black">${t.reward.toFixed(2)} USDT</span>
                              </div>
                            </td>
                            <td className="py-3 px-1">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                {t.type}
                              </span>
                            </td>
                            <td className="py-3 px-1 select-text">
                              {isSpecial ? (
                                <span className="text-amber-400 font-extrabold flex items-center gap-0.5 font-mono">
                                  ⭐ {t.minKarmaRequired?.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-zinc-500 font-semibold">None (Regular)</span>
                              )}
                            </td>
                            <td className="py-3 px-1 select-text">
                              {claimedUser ? (
                                <div>
                                  <p className="font-extrabold text-purple-400 text-xs">{claimedUser.fullName}</p>
                                  <p className="text-[9px] text-zinc-500 font-mono font-bold">{claimedUser.redditUsername}</p>
                                </div>
                              ) : (
                                <span className="text-zinc-500 italic">None</span>
                              )}
                            </td>
                            <td className="py-3 px-1 font-mono text-[10px] text-zinc-400 select-text">
                              {isClaimed && t.claimed_at ? (
                                <span>{new Date(t.claimed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              ) : (
                                <span className="text-zinc-600">-</span>
                              )}
                            </td>
                            <td className="py-3 px-1 font-mono text-[10px] select-text">
                              {isClaimed && t.claim_expires_at ? (
                                <span className="text-rose-400 font-black">
                                  {new Date(t.claim_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : (
                                <span className="text-zinc-400 text-[10px]">{t.deadline.split(' ')[0]}</span>
                              )}
                            </td>
                            <td className="py-3 px-1 select-none">
                              {isClaimed ? (
                                <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-black text-[9px] uppercase tracking-wider animate-pulse">
                                  Claimed
                                </span>
                              ) : t.completedSubmissionsCount >= t.maxSubmissions ? (
                                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 font-bold text-[9px] uppercase tracking-wider">
                                  Slots Full
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold text-[9px] uppercase tracking-wider">
                                  Available
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-1 text-right space-y-1">
                              {/* Admin actions: Force unclaim, extend deadline */}
                              {isClaimed && (
                                <div className="flex gap-1.5 justify-end">
                                  <button 
                                    onClick={() => {
                                      if (confirm('Forcibly release this user reservation and return task to general pool?')) {
                                        forceUnclaimTask(t.id);
                                        alert('Claim released successfully!');
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white text-[9px] font-black rounded cursor-pointer transition-colors"
                                    title="Force Unclaim"
                                  >
                                    Force Unclaim 🔓
                                  </button>
                                  <button 
                                    onClick={() => {
                                      extendUserDeadline(t.id);
                                      alert('Extended user submission window by +30 minutes!');
                                    }}
                                    className="px-2 py-0.5 bg-purple-600/20 hover:bg-purple-600 border border-purple-500/25 text-purple-400 hover:text-white text-[9px] font-black rounded cursor-pointer transition-colors"
                                    title="Extend 30 Minutes"
                                  >
                                    +30m ⏰
                                  </button>
                                </div>
                              )}
                              
                              <div className="flex justify-end pt-1">
                                <button 
                                  onClick={() => {
                                    if (confirm('Are you sure you want to permanently delete this campaign?')) {
                                      adminDeleteTask(t.id);
                                    }
                                  }}
                                  className="p-1 px-[5px] bg-zinc-950 border border-red-500/10 text-red-500 hover:bg-red-600 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-all"
                                  title="Delete campaign"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ================= SUBMISSIONS TAB ================= */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <h2 className="text-base font-black">Reddit Proof Submissions Desk</h2>
              <span className="text-xs text-zinc-500 font-semibold">Under review queue: {pendingSubmissionsCount}</span>
            </div>

            <div className="space-y-6">
              {submissions.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs text-balance">
                  Awesome! There are no submissions awaiting administrative checks in your queue.
                </div>
              ) : (
                submissions.map((sub) => {
                  const subUser = users.find(u => u.id === sub.userId);
                  const subUserTier = subUser ? getKarmaTier(subUser.karma) : null;
                  return (
                    <div 
                      key={sub.id} 
                      className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between gap-6 ${
                        sub.status === 'Pending' 
                          ? 'bg-purple-600/[0.03] border-purple-500/25' 
                          : 'bg-zinc-950 border-white/5'
                      }`}
                    >
                      {/* Submission Details */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">{sub.taskType} Audit</span>
                          <span className="text-sm font-extrabold text-white">{sub.taskTitle}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            sub.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                            sub.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {sub.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-zinc-950/60 p-3 rounded-xl border border-white/5 text-xs font-semibold">
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Creator Account</span>
                            <span className="text-white font-extrabold block flex items-center gap-1.5 flex-wrap">
                              <span>{sub.userFullName}</span>
                              {subUserTier && (
                                <span className="px-1.5 py-0.2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-[9px] font-extrabold uppercase">
                                  {subUserTier.emoji} {subUserTier.name}
                                </span>
                              )}
                            </span>
                            <span className="text-purple-400 font-bold tracking-wide text-[11px] block">{sub.redditUsername}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Earning payout</span>
                            <span className="text-white font-mono font-black text-sm block">${sub.reward.toFixed(2)} USDT</span>
                            <span className="text-[9px] text-zinc-500 block">Submitted {new Date(sub.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                      {/* Comment URL if comments */}
                      {sub.submissionLink && (
                        <div className="text-xs">
                          <span className="text-zinc-500 block font-bold uppercase tracking-wider text-[10px]">Comment permalink url</span>
                          <a 
                            href={sub.submissionLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-blue-400 hover:underline font-bold inline-flex items-center gap-1 mt-0.5 break-all max-w-md"
                          >
                            Browse Reddit Comment Link <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}

                      {/* Screenshot proof preview */}
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider mb-1.5">Submitted Screenshot Proof</span>
                        <a href={sub.proofUrl} target="_blank" rel="noreferrer" className="inline-block relative group">
                          <img 
                            src={sub.proofUrl} 
                            alt="Proof Screenshot" 
                            className="w-48 h-32 object-cover rounded-xl border border-white/10 hover:border-purple-500/40 transition-colors"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-transparent group-hover:bg-zinc-950/20 rounded-xl transition-all flex items-center justify-center">
                            <span className="text-[10px] bg-zinc-950/80 px-2 py-1 rounded text-white hidden group-hover:inline-block font-extrabold">Open Screenshot</span>
                          </div>
                        </a>
                      </div>
                    </div>

                    {/* Review Action area */}
                    <div className="md:w-64 flex flex-col justify-between items-stretch md:border-l md:border-white/5 md:pl-6 shrink-0">
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">Audit Action Panel</span>
                        
                        {sub.status === 'Pending' ? (
                          <div className="space-y-2.5">
                            <button 
                              onClick={() => adminReviewSubmission(sub.id, 'Approved', submissionFeedback[sub.id])}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white rounded-xl shadow-md cursor-pointer"
                            >
                              Approve & Pay Creator
                            </button>
                            <button 
                              onClick={() => adminReviewSubmission(sub.id, 'Rejected', submissionFeedback[sub.id] || 'Guidelines not met')}
                              className="w-full py-2 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-xs font-extrabold text-zinc-300 rounded-xl cursor-pointer"
                            >
                              Reject Proof Submission
                            </button>

                            <input 
                              type="text"
                              value={submissionFeedback[sub.id] || ''}
                              onChange={(e) => setSubmissionFeedback({ ...submissionFeedback, [sub.id]: e.target.value })}
                              placeholder="Feedback / Rejection Reason description..."
                              className="w-full text-[10px] bg-zinc-950 border border-white/5 px-2.5 py-1.5 rounded-lg text-white"
                            />
                          </div>
                        ) : (
                          <div className="p-3 bg-zinc-950/60 rounded-xl text-[11px] font-semibold text-zinc-500 border border-white/5">
                            <span className="text-zinc-400 block font-bold mb-0.5">Audit complete</span>
                            Reviewed and verified by Administrator. {sub.feedback && <span className="block mt-1 text-[10px] italic">Feedback: "{sub.feedback}"</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>
        )}

        {/* ================= WITHDRAWALS TAB ================= */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <h2 className="text-base font-black">Earning Withdrawal Desk</h2>
              <span className="text-xs text-zinc-500 font-semibold">Cashouts queue: {pendingWithdrawalsCount} pending</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-2">Influencer Core</th>
                    <th className="py-3 px-2">Method Type</th>
                    <th className="py-3 px-2">Recipient Address / BinPay ID</th>
                    <th className="py-3 px-2">Amount Requested</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {withdrawals.map(w => {
                    const wUser = users.find(u => u.id === w.userId);
                    const t = wUser ? getKarmaTier(wUser.karma) : null;
                    return (
                      <tr key={w.id} className="hover:bg-white/[0.02]">
                        <td className="py-4 px-2 space-y-0.5">
                          <p className="font-extrabold text-white text-sm flex items-center gap-1">
                            {w.userFullName}
                            {t && <span className="text-xs" title={`${t.name} Tier`}>{t.emoji}</span>}
                          </p>
                          <p className="text-zinc-500 font-mono font-bold text-[10px]">{w.email}</p>
                        </td>
                      <td className="py-4 px-2 leading-none">
                        <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-850 rounded text-xs text-purple-400 font-bold font-mono">
                          {w.withdrawalMethod === 'USDT_BEP20' ? 'USDT BEP20 (BSC)' : 'Binance Pay ID'}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <span className="font-mono text-zinc-400 font-bold text-wrap select-text break-all tracking-wide">{w.paymentAddress}</span>
                      </td>
                      <td className="py-4 px-2">
                        <span className="font-mono font-extrabold text-white text-sm">${w.amount.toFixed(2)} USDT</span>
                      </td>
                      <td className="py-4 px-2 select-none">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          w.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                          w.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        {w.status === 'Pending' ? (
                          <div className="flex gap-1.5 justify-end">
                            <button 
                              onClick={() => adminReviewWithdrawal(w.id, 'Approved')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black rounded text-white cursor-pointer"
                            >
                              Approve & Cashout
                            </button>
                            <button 
                              onClick={() => adminReviewWithdrawal(w.id, 'Rejected')}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-black rounded text-zinc-300 cursor-pointer"
                            >
                              Reject Request
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-500 italic block">Processed</span>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= 📊 TRACK DATA TAB ================= */}
        {activeTab === 'track-data' && (
          <div className="space-y-8 py-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 block mb-1">Telemetry Overview</span>
              <h2 className="text-xl font-black text-white">Platform Health & Telemetry Metrics</h2>
              <p className="text-xs text-zinc-400 mt-1">Monitor real-time system ledger balances, verification queues, and withdrawal statuses.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-zinc-900/30 border border-white/10 p-5 rounded-2xl">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Pending Verifications</span>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-black text-yellow-500 font-mono">{pendingVerificationsCount}</span>
                  <Users className="w-6 h-6 text-yellow-500" />
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-white/10 p-5 rounded-2xl">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Unreviewed Submissions</span>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-black text-purple-400 font-mono">{pendingSubmissionsCount}</span>
                  <FileText className="w-6 h-6 text-purple-400" />
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-white/10 p-5 rounded-2xl">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Pending Cashouts</span>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-black text-rose-500 font-mono">{pendingWithdrawalsCount}</span>
                  <Wallet className="w-6 h-6 text-rose-500" />
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-white/10 p-5 rounded-2xl">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Total Paid Out</span>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-black text-emerald-400 font-mono">${totalPayoutAmt.toFixed(2)}</span>
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-4 pt-4 border-t border-white/5">
              <button
                onClick={() => {
                  setLastRefreshedTrigger(prev => prev + 1);
                }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-xs font-black text-white rounded-xl shadow-md cursor-pointer transition-colors active:scale-95"
              >
                Refresh Now
              </button>
              
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  Last updated: <span className="font-bold text-white">{secondsSinceRefresh === 0 || secondsSinceRefresh < 10 ? 'just now' : `${secondsSinceRefresh} seconds ago`}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= 🛡️ ANTI-CHEAT SECURITY CENTER ================= */}
        {activeTab === 'security' && (
          <div className="space-y-8 font-semibold">
            {/* Header and Simulator margin panel config */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Anti-cheat explanation */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-400">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Platform Anti-Cheat & Security Desk</h2>
                    <p className="text-xs text-zinc-400 font-semibold mt-0.5">Enforce real-time multi-account controls, device fingerprints, and automated Reddit post audit checks.</p>
                  </div>
                </div>

                {/* Fraud score policy explanation legend */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 pt-2">
                  {[
                    { title: 'Verified (Clean)', range: '0 - 20', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', action: 'Standard accounts' },
                    { title: 'Watchlist', range: '21 - 40', color: 'bg-amber-500/10 text-amber-400 border-amber-500/25', action: 'Flagged, telemetry log' },
                    { title: 'High Risk', range: '41 - 60', color: 'bg-orange-500/10 text-orange-400 border-orange-500/25', action: 'Manual submission checks' },
                    { title: 'Auto-Suspended', range: '61 - 80', color: 'bg-red-500/10 text-red-400 border-red-500/25', action: 'Deactivated immediately' },
                    { title: 'Banned (Permanent)', range: '81 - 100', color: 'bg-zinc-900 border-zinc-700 text-zinc-400', action: 'Locked from login/earnings' },
                  ].map(sec => (
                    <div key={sec.title} className={`p-3 rounded-2xl border ${sec.color} space-y-1 text-center`}>
                      <span className="text-[10px] font-black block tracking-wider uppercase">{sec.title}</span>
                      <span className="text-sm font-extrabold font-mono block">{sec.range}</span>
                      <span className="text-[8px] font-normal leading-tight block text-zinc-400">{sec.action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SIMULATION REAL-TIME IP CONTROL PANEL */}
              <div className="bg-zinc-950 p-5 rounded-2xl border border-white/5 space-y-4">
                <span className="text-[10px] font-black tracking-widest text-purple-400 uppercase block">Simulator Control Panel</span>
                <p className="text-[11px] text-zinc-400 leading-normal font-normal">Change your current simulated network details to test bypass restrictions or automated location travel blocks!</p>
                
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[9px] font-extrabold uppercase tracking-wide text-zinc-400 block mb-1">Simulated IP Address</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={currentSimulatedIP}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setCurrentSimulatedIP(val);
                        }}
                        className="w-full text-xs font-mono text-white bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-wrap"
                        placeholder="e.g. 192.168.1.50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-extrabold uppercase tracking-wide text-zinc-400 block mb-1">Simulated Country Origin</label>
                    <select
                      value={currentSimulatedCountry}
                      onChange={(e) => setCurrentSimulatedCountry(e.target.value)}
                      className="w-full text-xs text-white bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 font-bold"
                    >
                      <option value="United States">🇺🇸 United States</option>
                      <option value="India">🇮🇳 India</option>
                      <option value="Germany">🇩🇪 Germany</option>
                      <option value="Brazil">🇧🇷 Brazil</option>
                      <option value="Russia">🇷🇺 Russia</option>
                      <option value="Japan">🇯🇵 Japan</option>
                      <option value="Australia">🇦🇺 Australia</option>
                    </select>
                  </div>
                  
                  <div className="pt-2 text-center">
                    <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/25 rounded text-[8px] font-black text-purple-400 animate-pulse inline-block">
                      🎯 ACTIVE TELEMETRY SIMULATION
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Core alert feed list and Blacklist */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Alert Feed Col (Takes 2 segments) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">🚨 Fraud Alerts Detection Stream</h3>
                  <button 
                    onClick={() => {
                      scanForDuplicates();
                      alert('Security re-scan completed. All user IP nodes, fingerprints and GMail dot addresses audited!');
                    }}
                    className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[10px] rounded-lg transition-colors border border-white/5 cursor-pointer text-zinc-300"
                  >
                    Force Re-Scan Duplicate Maps
                  </button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {(fraudAlerts || []).length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 italic font-normal bg-zinc-950/20 rounded-2xl border border-white/5">
                      No fraud alerts or suspicious activities intercepted yet. Platform is fully verified.
                    </div>
                  ) : (
                    (fraudAlerts || []).map(alertItem => (
                      <div key={alertItem.id} className={`p-4 rounded-2xl border space-y-3.5 transition-all ${
                        alertItem.status === 'resolved' ? 'bg-zinc-950/20 border-white/5 opacity-60' :
                        alertItem.status === 'dismissed' ? 'bg-zinc-950/10 border-white/5 line-through opacity-45' :
                        'bg-red-500/[0.03] border-red-500/15'
                      }`}>
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-red-650/15 rounded text-[9px] font-black tracking-wide text-red-500 uppercase">{alertItem.type}</span>
                              <span className="text-[10px] text-zinc-500 font-semibold">{new Date(alertItem.timestamp).toLocaleTimeString()} · {new Date(alertItem.timestamp).toLocaleDateString()}</span>
                            </div>
                            <h4 className="text-sm font-extrabold text-white">{alertItem.userName} ({alertItem.userEmail})</h4>
                          </div>

                          <div className="flex items-center gap-1.5 font-mono text-[11px] bg-zinc-950 px-2.5 py-1 rounded bg-zinc-900 border border-white/5">
                            <span className="text-zinc-500 font-bold uppercase text-[9px]">SUSPICION INDEX:</span>
                            <span className={`font-black ${
                              alertItem.fraudScore >= 80 ? 'text-red-500 font-black' :
                              alertItem.fraudScore >= 60 ? 'text-orange-500 font-bold' :
                              'text-yellow-400 font-bold'
                            }`}>{alertItem.fraudScore}/100</span>
                          </div>
                        </div>

                        <p className="text-xs font-normal text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-xl border border-white/5 select-text">{alertItem.details}</p>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <span className="text-[10px] font-bold text-zinc-400 block">Recommended Action: <strong className="text-purple-400">{alertItem.recommendedAction}</strong></span>

                          {alertItem.status === 'pending' && (
                            <div className="flex flex-wrap gap-1.5 shrink-0 select-none">
                              <button 
                                onClick={() => {
                                  adminReviewFraudAction(alertItem.id, 'dismiss');
                                  alert('Alert dismissed. Suspicion score reduced slightly.');
                                }}
                                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[10px] text-zinc-300 rounded border border-white/5 cursor-pointer"
                              >
                                Dismiss
                              </button>
                              <button 
                                onClick={() => {
                                  adminReviewFraudAction(alertItem.id, 'warn');
                                  alert('Warning sent to user inbox.');
                                }}
                                className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 text-[10px] rounded cursor-pointer"
                              >
                                Send Warning
                              </button>
                              <button 
                                onClick={() => {
                                  adminReviewFraudAction(alertItem.id, 'suspend');
                                  alert('User has been Auto-Suspended.');
                                }}
                                className="px-2 py-1 bg-red-650 hover:bg-red-600 text-[10px] text-white rounded cursor-pointer animate-pulse"
                              >
                                Suspend Account
                              </button>
                              <button 
                                onClick={() => {
                                  adminReviewFraudAction(alertItem.id, 'ban');
                                  alert('User has been banned.');
                                }}
                                className="px-2 py-1 bg-zinc-900 border border-zinc-750 hover:bg-zinc-800 text-[10px] text-red-400 rounded cursor-pointer font-black"
                              >
                                Permanent Ban ⛔
                              </button>
                              <button 
                                onClick={() => {
                                  adminReviewFraudAction(alertItem.id, 'freeze');
                                  alert('Earnings frozen and user suspended.');
                                }}
                                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] text-zinc-350 border border-zinc-700 rounded cursor-pointer font-bold"
                              >
                                Freeze Profits ❄️
                              </button>
                            </div>
                          )}

                          {alertItem.status === 'resolved' && (
                            <span className="text-[10px] text-zinc-500 italic font-semibold">Processed Action Applied</span>
                          )}
                          {alertItem.status === 'dismissed' && (
                            <span className="text-[10px] text-zinc-500 italic font-semibold">Dismissed</span>
                          )}
                        </div>

                      </div>
                    ))
                  )}
                </div>

                {/* Duplicates Groups Master List Rendering */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">🔗 Duplicate Identity Registry Groupings</h3>
                  <p className="text-xs text-zinc-500 font-semibold mt-0.5 font-normal">Below are accounts linked by physical IP nodes, shared browser fingerprints, or email aliasing tricks.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(duplicateGroups || []).length === 0 ? (
                      <div className="col-span-2 p-6 text-center text-zinc-500 italic font-normal bg-zinc-950/20 rounded-2xl border border-white/5">
                        No duplicate account match groupings registered yet.
                      </div>
                    ) : (
                      (duplicateGroups || []).map(group => {
                        const linkedUsers = users.filter(u => group.accounts.includes(u.id));
                        return (
                          <div key={group.id} className="p-4 bg-zinc-900 rounded-2xl border border-white/5 space-y-3.5 text-xs text-zinc-400 font-normal">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                              <div>
                                <span className="text-[9px] font-black uppercase text-purple-400 block tracking-wider">Matched Identifier ({group.type})</span>
                                <span className="text-xs font-bold text-white font-mono select-all break-all">{group.sharedIdentifier}</span>
                              </div>
                              <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded font-bold text-[9px] text-red-400">
                                {group.accounts.length} Accounts
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {linkedUsers.map(lu => (
                                <div key={lu.id} className="flex justify-between items-center text-xs p-1.5 rounded bg-zinc-950">
                                  <div>
                                    <span className="font-extrabold text-white block">{lu.fullName}</span>
                                    <span className="text-[9px] text-zinc-400 block">Reddit: {lu.redditUsername} · Score: {lu.fraudScore || 0}</span>
                                  </div>
                                  <span className={`px-1.5 py-0.5 text-[8px] rounded font-black ${
                                    lu.isBanned || lu.status === 'Banned' ? 'bg-zinc-800 text-zinc-500' :
                                    lu.isSuspended ? 'bg-red-500/15 text-red-400 animate-pulse' :
                                    'bg-emerald-500/10 text-emerald-400'
                                  }`}>
                                    {lu.isBanned || lu.status === 'Banned' ? 'Banned' : lu.isSuspended ? 'Suspended' : 'Clean'}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="pt-2 border-t border-white/5 overflow-hidden flex flex-col gap-2 select-none">
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Primary Target Profile:</label>
                              <div className="flex items-center gap-2">
                                <select 
                                  id={`merge-select-${group.id}`} 
                                  className="text-[10px] bg-zinc-950 border border-white/10 rounded px-2 py-1.5 hover:border-purple-500 focus:outline-none flex-grow"
                                >
                                  {linkedUsers.map(lu => (
                                    <option key={lu.id} value={lu.id}>{lu.redditUsername}</option>
                                  ))}
                                </select>
                                <button 
                                  onClick={() => {
                                    const selectEl = document.getElementById(`merge-select-${group.id}`) as HTMLSelectElement;
                                    if (selectEl) {
                                      const primaryId = selectEl.value;
                                      const primaryUserObj = linkedUsers.find(l => l.id === primaryId);
                                      if (confirm(`⚠️ Profile Merge Actions:\nYou are about to transfer all balances, referral credits, pending claims, and telemetry history of ${group.accounts.length - 1} secondary duplicate profiles into the master profile: "${primaryUserObj?.redditUsername}".\n\nAll secondary profiles will be deactivated and banned automatically.`)) {
                                        mergeDuplicateAccounts(group.id, primaryId);
                                        alert('Profile merges completed. Values consolidated into Master profile!');
                                      }
                                    }
                                  }}
                                  className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-[10px] rounded text-white cursor-pointer transition-colors"
                                >
                                  Merge Profiles 🔗
                                </button>
                              </div>
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Blacklist Control Pane (Takes 1 segment) */}
              <div className="space-y-6">
                <h3 className="text-sm font-black text-white border-b border-white/5 pb-2">🛡️ IP Blacklist Directory</h3>
                
                <div className="bg-zinc-950 p-4.5 rounded-2xl border border-white/5 space-y-4 text-xs font-normal">
                  <div className="space-y-2 select-none">
                    <label className="text-[10px] font-black tracking-widest uppercase text-zinc-400 block">Ban IP Address Node</label>
                    <div className="relative flex gap-1.5">
                      <input 
                        type="text" 
                        id="new-blacklist-ip"
                        placeholder="e.g. 203.0.113.195"
                        className="text-xs text-white bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 font-mono flex-grow"
                      />
                      <button 
                        onClick={() => {
                          const val = (document.getElementById('new-blacklist-ip') as HTMLInputElement)?.value.trim();
                          if (val) {
                            blacklistIP(val);
                            (document.getElementById('new-blacklist-ip') as HTMLInputElement).value = '';
                            alert(`IP ${val} blocked. Active sessions registered on this IP node are terminated.`);
                          }
                        }}
                        className="px-3 bg-red-650 hover:bg-red-600 text-xs font-black rounded-xl text-white cursor-pointer"
                      >
                        Banish IP
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pr-1.5 max-h-[300px] overflow-y-auto pt-2 border-t border-white/5">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Blacklisted IP Address Nodes:</span>
                    {(blacklistedIPs || []).length === 0 ? (
                      <span className="text-[10px] italic text-zinc-600 font-semibold block">No IP addresses blacklisted.</span>
                    ) : (
                      (blacklistedIPs || []).map(ip => (
                        <div key={ip} className="flex justify-between items-center p-2 bg-white/[0.01] rounded text-[11px] font-mono hover:bg-white/[0.03]">
                          <span className="text-zinc-300 font-bold">{ip}</span>
                          <button 
                            onClick={() => {
                              unblacklistIP(ip);
                              alert(`IP ${ip} is unblocked.`);
                            }}
                            className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            Unban
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ================= ANNOUNCEMENTS TAB ================= */}
        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 font-semibold">
            
            <div className="space-y-6">
              <h2 className="text-base font-black border-b border-white/5 pb-3">Trigger Global Platform-wide Alert</h2>
              
              {annSuccessMsg && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Announcement published to all creator feeds!
                </div>
              )}

              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Alert Title</label>
                  <input 
                    type="text" 
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="📢 1.25x Payout weekend is active!" 
                    className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Message Description</label>
                  <textarea 
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    placeholder="Admins have increased comment base rewards by 25%. Submit high quality posts!" 
                    className="w-full text-xs text-white bg-zinc-950 border border-white/5 px-3 py-2.5 rounded-xl h-24 focus:border-purple-500"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-xs font-black text-white rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  Broadcast Alert <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            <div className="space-y-6 md:border-l md:border-white/5 md:pl-10">
              <h2 className="text-base font-black border-b border-white/5 pb-3">Active Announcement Rules</h2>
              <div className="p-4 bg-zinc-950 rounded-2xl space-y-4 text-xs text-zinc-400 leading-relaxed font-normal">
                <p>🚩 Platform alerts appear directly in the notifications panel of every signed-in influencer instantly.</p>
                <p>🚩 Direct referral commissions, streak bonus boosts, or system-wide maintenance notices should be posted here.</p>
                <p>🚩 Limit title lengths to under 50 characters to prevent overflow on mobile. Keep descriptions informative & action-oriented.</p>
              </div>
            </div>

          </div>
        )}



      </div>

    </div>
  );
};
