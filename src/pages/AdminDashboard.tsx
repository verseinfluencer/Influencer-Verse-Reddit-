import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Task, Submission, Withdrawal, User, TaskType, Client, ClientTask, ClientPayment, ClientPaymentProof, ChatMessage, ClientChat, ArchivedApprovedTask, ArchivedWithdrawal } from '../types';
import { getKarmaTier } from '../utils/tierHelper';
import { db } from '../utils/firebase';
import { renderRedditMarkdown, validateRedditMarkdownLinks } from '../utils/markdownHelper';
import { collection, doc, deleteDoc, setDoc, getDocs, onSnapshot, query, orderBy, where, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Users, FileText, CheckCircle, Wallet, Sparkles, 
  Trash2, Edit, CheckCircle2, XCircle, AlertCircle, Send, Plus, 
  Settings, Link, ExternalLink, MessageCircle, BarChart2, ShieldAlert,
  Building, CreditCard, MessageSquare, PlusCircle, CheckSquare, Shield, ToggleLeft, ToggleRight, AlertTriangle, Eye, SendHorizontal,
  Archive, Search, ArrowUpDown, Coins, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminDashboard: React.FC = () => {
  const { 
    currentUser,
    users: rawUsers, tasks, submissions, withdrawals, transactions, settings,
    adminApproveUser, adminRejectUser, adminBanUser, adminSuspendUser, adminUnbanUser, adminUnsuspendUser,
    adminDeleteUserAccount, adminDeleteClientAccount,
    adminCreateTask, adminEditTask, adminDeleteTask,
    adminReviewSubmission, adminFinalReleasePayment, adminReviewWithdrawal,
    adminCreateAnnouncement, adminUpdateSettings,
    resetCooldown, adminUpdateUserKarma, adminAdjustUserBalance, forceUnclaimTask, extendUserDeadline,
    
    // New Client Hooks and Properties from AppContext
    clients: rawClients, clientTasks, clientPayments, clientPaymentProofs, clientChats,
    adminReviewClient, adminToggleTaskUpload, adminToggleGlobalTaskUpload, adminReviewClientTask,
    adminResolveDispute, adminConfirmClientPayment, adminVerifyPaymentProof, adminRejectPaymentProof, adminReviewPayout, adminRemoveCompletedTask, adminDeductMember,
    adminSendMessage, adminToggleChatResolution,

    // New Anti-Cheat properties
    blacklistedIPs, duplicateGroups, fraudAlerts, currentSimulatedIP, setCurrentSimulatedIP, currentSimulatedCountry, setCurrentSimulatedCountry,
    blacklistIP, unblacklistIP, adminReviewFraudAction, dismissFraudAlert, deleteDuplicateGroup, mergeDuplicateAccounts, scanForDuplicates,

    auditLogs,
    adminPromoteToModerator,
    adminRemoveModerator,
    notifications,
    tickets
  } = useApp();

  const users = (rawUsers || []).filter(u => {
    const isClient = 
      u.role === 'client' || 
      u.role === 'brand' || 
      u.role === 'agency' || 
      (u as any).accountType === 'client' || 
      (u as any).userType === 'client' || 
      (u as any).isClient === true;
    return !isClient;
  });

  const clients = (rawClients || []).filter(c => {
    const role = (c as any).role;
    const isMemberOrAdmin = role === 'user' || role === 'member' || role === 'moderator' || role === 'admin';
    
    const roleIsClient = role === 'client' || role === 'brand' || role === 'agency';
    const hasClientType = (c as any).accountType === 'client' || (c as any).userType === 'client' || (c as any).isClient === true;
    
    return (roleIsClient || hasClientType || !isMemberOrAdmin);
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'clients' | 'client-tasks' | 'client-payments' | 'client-chats' | 'tasks' | 'submissions' | 'withdrawals' | 'announcements' | 'settings' | 'security' | 'track-data' | 'audit-log' | 'deleted-tasks' | 'live-wallet' | 'deleted-history'>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showPermissionRestrictedModal, setShowPermissionRestrictedModal] = useState<string | null>(null);

  // Deleted tasks list & filter states
  const [deletedTasks, setDeletedTasks] = useState<any[]>([]);
  const [deletedFilterClient, setDeletedFilterClient] = useState('');
  const [deletedFilterDate, setDeletedFilterDate] = useState('');

  // Permanent task deletion confirmation modal state
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);
  const [deletionReason, setDeletionReason] = useState('');

  // Real-time listener for permanently deleted tasks
  useEffect(() => {
    const q = query(collection(db, 'deleted_tasks'), orderBy('deletedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setDeletedTasks(list);
    }, (error) => {
      console.error("Error reading deleted tasks snapshot:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleClearDeletedHistory = async () => {
    if (confirm("Are you sure you want to CLEAR ALL permanently deleted task records from the history? This cannot be undone.")) {
      try {
        const querySnapshot = await getDocs(collection(db, 'deleted_tasks'));
        for (const docItem of querySnapshot.docs) {
          await deleteDoc(doc(db, 'deleted_tasks', docItem.id));
        }
        alert("Deleted task history has been successfully cleared!");
      } catch (e) {
        console.error("Error clearing deleted tasks history:", e);
        alert("Error: " + e);
      }
    }
  };

  // Visited tabs tracking for premium pending animation dismissal
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>(() => {
    return { 'users': true };
  });

  useEffect(() => {
    if (activeTab) {
      setVisitedTabs(prev => ({ ...prev, [activeTab]: true }));
    }
  }, [activeTab]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
      const footerElement = document.getElementById('global-dashboard-footer') || document.getElementById('global-light-footer') || document.querySelector('footer');
      if (footerElement) {
        footerElement.style.display = 'none';
      }
    } else {
      document.body.style.overflow = '';
      const footerElement = document.getElementById('global-dashboard-footer') || document.getElementById('global-light-footer') || document.querySelector('footer');
      if (footerElement) {
        footerElement.style.display = '';
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      const footerElement = document.getElementById('global-dashboard-footer') || document.getElementById('global-light-footer') || document.querySelector('footer');
      if (footerElement) {
        footerElement.style.display = '';
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const shouldPulse = (tabId: string, count: number) => {
    if (!count || count <= 0) return false;
    const targetTabs = ['users', 'clients', 'client-tasks', 'submissions', 'withdrawals', 'client-chats'];
    if (!targetTabs.includes(tabId)) return false;
    if (activeTab === tabId) return false;
    if (visitedTabs[tabId]) return false;
    return true;
  };

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
  
  // Client payment review helper states
  const [proofFilterStatus, setProofFilterStatus] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [proofRejectionId, setProofRejectionId] = useState<string | null>(null);
  const [proofRejectionReasonInput, setProofRejectionReasonInput] = useState<string>('');

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
  const [specialLabel, setSpecialLabel] = useState('SPECIAL');

  // Post specific
  const [subreddit, setSubreddit] = useState('');
  const [requiredTitle, setRequiredTitle] = useState('');
  const [postGuidelines, setPostGuidelines] = useState('');
  // Comment specific
  const [commentPostUrl, setCommentPostUrl] = useState('');
  const [commentGuidelines, setCommentGuidelines] = useState('');

  // Task assignment/visibility creator states
  const [taskVisibility, setTaskVisibility] = useState<'public' | 'assigned'>('public');
  const [assignedMembers, setAssignedMembers] = useState<string[]>([]);
  const [isExclusiveTask, setIsExclusiveTask] = useState(false);
  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);

  // Edit Campaign Modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editVisibility, setEditVisibility] = useState<'public' | 'assigned'>('public');
  const [editAssignedMembers, setEditAssignedMembers] = useState<string[]>([]);
  const [editIsExclusive, setEditIsExclusive] = useState(false);
  const [editSearchMemberQuery, setEditSearchMemberQuery] = useState('');
  const [editMemberDropdownOpen, setEditMemberDropdownOpen] = useState(false);

  const filteredCreatorsToInvite = users.filter(u => {
    if (assignedMembers.includes(u.id)) return false;
    const q = searchMemberQuery.toLowerCase();
    const redditUser = (u.redditUsername || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const fullName = (u.fullName || '').toLowerCase();
    return redditUser.includes(q) || email.includes(q) || fullName.includes(q);
  });

  const filteredCreatorsToEditInvite = users.filter(u => {
    if (editAssignedMembers.includes(u.id)) return false;
    const q = editSearchMemberQuery.toLowerCase();
    const redditUser = (u.redditUsername || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const fullName = (u.fullName || '').toLowerCase();
    return redditUser.includes(q) || email.includes(q) || fullName.includes(q);
  });

  const handleStartEditTask = (task: Task) => {
    setEditingTask(task);
    setEditVisibility(task.visibility || 'public');
    setEditAssignedMembers(task.assignedMembers || []);
    setEditIsExclusive(task.isExclusive || false);
    setEditSearchMemberQuery('');
    setEditMemberDropdownOpen(false);
  };

  const handleSaveTaskEdits = async () => {
    if (!editingTask) return;
    try {
      await adminEditTask(editingTask.id, {
        visibility: editVisibility,
        assignedMembers: editVisibility === 'assigned' ? editAssignedMembers : [],
        isExclusive: editVisibility === 'assigned' ? editIsExclusive : false
      });
      alert('Campaign visibility settings updated successfully!');
      setEditingTask(null);
    } catch (e) {
      console.error(e);
      alert('Error updating campaign assignments.');
    }
  };

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
  const [selectedAdminStatusFilter, setSelectedAdminStatusFilter] = useState<string>('active_pending');
  const [selectedAdminRoleFilter, setSelectedAdminRoleFilter] = useState<string>('all');
  
  // Client management status filter & search states
  const [selectedClientStatusFilter, setSelectedClientStatusFilter] = useState<string>('active_pending');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Manual edit states for user's Karma and Tier
  const [editingUsers, setEditingUsers] = useState<{[key: string]: { karma: number, tier: string }}>({});

  const handleSaveUserKarmaAndTier = async (userId: string, karmaVal: number, tierVal: string) => {
    try {
      const uRef = doc(db, 'users', userId);
      await updateDoc(uRef, {
        karma: karmaVal,
        redditKarma: karmaVal,
        karmaTier: tierVal,
        karmaBadge: tierVal,
        total_karma: karmaVal
      });
      // Also update local editing state
      setEditingUsers(prev => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
    } catch (err: any) {
      console.error("[ADMIN UPDATE ERROR]", err);
      alert("Error updating user: " + err.message);
    }
  };
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Permanent account deletion state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeletingInProgress, setIsDeletingInProgress] = useState(false);
  
  // Ban/Suspend confirmation values
  const [banTargetUser, setBanTargetUser] = useState<User | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');

  const [suspendTargetUser, setSuspendTargetUser] = useState<User | null>(null);
  const [suspendReasonInput, setSuspendReasonInput] = useState('');
  const [suspendDuration, setSuspendDuration] = useState('1 day');

  // Moderator promotion/demotion confirmation values
  const [promoteTargetUser, setPromoteTargetUser] = useState<User | null>(null);
  const [demoteTargetUser, setDemoteTargetUser] = useState<User | null>(null);

  // Balance deduction state values
  const [deductTargetUser, setDeductTargetUser] = useState<User | null>(null);
  const [deductAmountInput, setDeductAmountInput] = useState<string>('');
  const [deductReasonInput, setDeductReasonInput] = useState<string>('');
  const [deductTaskNameInput, setDeductTaskNameInput] = useState<string>('');
  const [deductionHistoryUser, setDeductionHistoryUser] = useState<User | null>(null);
  const [adjustTargetUser, setAdjustTargetUser] = useState<User | null>(null);
  const [adjustAmountInput, setAdjustAmountInput] = useState<string>('');

  // Live Wallet balances states
  const [walletSearchQuery, setWalletSearchQuery] = useState('');
  const [walletSortBy, setWalletSortBy] = useState<'highest' | 'lowest' | 'recently'>('highest');
  const [walletFilterStatus, setWalletFilterStatus] = useState<'all' | 'active' | 'suspended' | 'zero' | 'nonzero'>('all');

  // Task extension custom states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [disabledExtensionTasks, setDisabledExtensionTasks] = useState<Record<string, boolean>>({});

  // Deleted History States & Effects
  const [archivedTasks, setArchivedTasks] = useState<ArchivedApprovedTask[]>([]);
  const [archivedWithdrawals, setArchivedWithdrawals] = useState<ArchivedWithdrawal[]>([]);
  const [activeDeletedHistoryTab, setActiveDeletedHistoryTab] = useState<'approved_tasks' | 'withdrawals' | 'deleted_submissions'>('approved_tasks');

  // Deletion logic hooks
  const [submissionToDelete, setSubmissionToDelete] = useState<Submission | null>(null);
  const [isDeletingSubmission, setIsDeletingSubmission] = useState(false);

  const formatDeletedDate = (ts: any) => {
    if (!ts) return 'N/A';
    if (typeof ts === 'string') return new Date(ts).toLocaleString();
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    if (ts.toDate) return ts.toDate().toLocaleString();
    return new Date(ts).toLocaleString();
  };

  const handleDeleteSubmissionConfirm = async () => {
    if (!submissionToDelete || !currentUser) return;
    try {
      setIsDeletingSubmission(true);
      
      const subId = submissionToDelete.id;
      const originalStatus = submissionToDelete.status;
      const operatorId = currentUser.id;
      const operatorName = currentUser.fullName;
      const operatorRole = currentUser.role;

      // 1. Update the submission document
      await updateDoc(doc(db, 'submissions', subId), {
        deleted: true,
        deletedBy: operatorId,
        deletedAt: serverTimestamp()
      });

      // 2. Add an Audit Log
      const logId = `del-sub-log-${subId}-${Date.now()}`;
      await setDoc(doc(db, 'audit_logs', logId), {
        id: logId,
        action: 'Delete Submission',
        targetUserId: submissionToDelete.userId,
        targetUserName: submissionToDelete.userFullName,
        operatorId,
        operatorName,
        operatorRole,
        timestamp: new Date().toISOString(),
        submissionId: subId,
        originalStatus,
        details: `Deleted submission ID: ${subId}, original status: ${originalStatus}`
      });

      setToastMessage("Submission successfully moved to Deleted History.");
      setSubmissionToDelete(null);
    } catch (err: any) {
      console.error("Error deleting submission:", err);
      alert("Error deleting submission: " + (err.message || err));
    } finally {
      setIsDeletingSubmission(false);
    }
  };

  const handleRestoreDeletedSubmission = async (sub: Submission) => {
    try {
      await updateDoc(doc(db, 'submissions', sub.id), {
        deleted: false,
        deletedBy: null,
        deletedAt: null
      });

      // Log restoration in audit logs
      const logId = `restore-sub-log-${sub.id}-${Date.now()}`;
      await setDoc(doc(db, 'audit_logs', logId), {
        id: logId,
        action: 'Restore Submission',
        targetUserId: sub.userId,
        targetUserName: sub.userFullName,
        operatorId: currentUser?.id,
        operatorName: currentUser?.fullName,
        operatorRole: currentUser?.role,
        timestamp: new Date().toISOString(),
        submissionId: sub.id,
        details: `Restored submission ID: ${sub.id}`
      });

      setToastMessage("Submission restored to active list successfully!");
    } catch (err: any) {
      console.error("Error restoring submission:", err);
      alert("Error restoring submission: " + (err.message || err));
    }
  };

  const handlePermanentDeleteDeletedSubmission = async (sub: Submission) => {
    const isOwner = currentUser?.role === 'admin' || currentUser?.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com';
    if (!isOwner) {
      alert("Super Admin authorization required for permanent deletion.");
      return;
    }

    const confirm = window.confirm("This action cannot be undone.\nFinancial records, payouts, and audit logs will remain preserved.\n\nAre you sure you want to PERMANENTLY delete this submission?");
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, 'submissions', sub.id));

      // Log permanent deletion in audit logs
      const logId = `perm-del-sub-log-${sub.id}-${Date.now()}`;
      await setDoc(doc(db, 'audit_logs', logId), {
        id: logId,
        action: 'Permanent Delete Submission',
        targetUserId: sub.userId,
        targetUserName: sub.userFullName,
        operatorId: currentUser?.id,
        operatorName: currentUser?.fullName,
        operatorRole: currentUser?.role,
        timestamp: new Date().toISOString(),
        submissionId: sub.id,
        details: `Permanently deleted submission ID: ${sub.id}`
      });

      setToastMessage("Submission permanently deleted.");
    } catch (err: any) {
      console.error("Error permanently deleting submission:", err);
      alert("Error permanently deleting submission: " + (err.message || err));
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'deleted_history', 'approved_tasks', 'records'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: ArchivedApprovedTask[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as ArchivedApprovedTask);
      });
      setArchivedTasks(list);
    }, (error) => {
      console.error("Error fetching archived tasks", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'deleted_history', 'withdrawals', 'records'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list: ArchivedWithdrawal[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as ArchivedWithdrawal);
      });
      setArchivedWithdrawals(list);
    }, (error) => {
      console.error("Error fetching archived withdrawals", error);
    });
    return () => unsubscribe();
  }, []);

  const handleArchiveSubmission = async (sub: Submission) => {
    if (!currentUser) return;
    const confirm = window.confirm("Are you sure you want to Archive this Completed Submission? It will be hidden from the active list but all financial states & creator history remain preserved.");
    if (!confirm) return;
    try {
      const actorName = currentUser.fullName || currentUser.email || 'Admin/Moderator';
      const archiveRef = doc(db, 'deleted_history', 'approved_tasks', 'records', sub.id);
      await setDoc(archiveRef, {
        id: sub.id,
        originalData: sub,
        archivedBy: actorName,
        archivedAt: new Date().toISOString()
      });
      
      const subRef = doc(db, 'submissions', sub.id);
      await updateDoc(subRef, {
        archived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: actorName
      });
      alert("Submission record archived successfully!");
    } catch (err: any) {
      console.error("Error archiving submission:", err);
      alert("Error archiving submission: " + (err.message || err));
    }
  };

  const handleArchiveWithdrawal = async (w: Withdrawal) => {
    if (!currentUser) return;
    const confirm = window.confirm("Are you sure you want to Archive this Approved Withdrawal? It will be hidden from the active list but all accounting logs and balance releases remain preserved.");
    if (!confirm) return;
    try {
      const actorName = currentUser.fullName || currentUser.email || 'Admin/Moderator';
      const archiveRef = doc(db, 'deleted_history', 'withdrawals', 'records', w.id);
      await setDoc(archiveRef, {
        id: w.id,
        originalData: w,
        archivedBy: actorName,
        archivedAt: new Date().toISOString()
      });
      
      const wRef = doc(db, 'withdrawals', w.id);
      await updateDoc(wRef, {
        archived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: actorName
      });
      alert("Withdrawal record archived successfully!");
    } catch (err: any) {
      console.error("Error archiving withdrawal:", err);
      alert("Error archiving withdrawal: " + (err.message || err));
    }
  };

  const handleRestoreSubmission = async (item: ArchivedApprovedTask) => {
    try {
      await deleteDoc(doc(db, 'deleted_history', 'approved_tasks', 'records', item.id));
      await updateDoc(doc(db, 'submissions', item.id), {
        archived: false
      });
      alert("Submission restored to active list successfully!");
    } catch (err: any) {
      console.error("Error restoring submission:", err);
      alert("Error restoring submission: " + (err.message || err));
    }
  };

  const handleRestoreWithdrawal = async (item: ArchivedWithdrawal) => {
    try {
      await deleteDoc(doc(db, 'deleted_history', 'withdrawals', 'records', item.id));
      await updateDoc(doc(db, 'withdrawals', item.id), {
        archived: false
      });
      alert("Withdrawal restored to active list successfully!");
    } catch (err: any) {
      console.error("Error restoring withdrawal:", err);
      alert("Error restoring withdrawal: " + (err.message || err));
    }
  };

  const handlePermanentDeleteSubmission = async (item: ArchivedApprovedTask) => {
    const confirm = window.confirm("CRITICAL WARNING:\nAre you sure you want to PERMANENTLY DELETE this archived tracking item?\nThis will remove the tracking record from the Deleted History registry forever. All completed financial states, payouts, and user histories will NOT be modified or lost.");
    if (!confirm) return;
    try {
      await deleteDoc(doc(db, 'deleted_history', 'approved_tasks', 'records', item.id));
      alert("Archived submission record permanently deleted from Deleted History.");
    } catch (err: any) {
      console.error("Error deleting archived submission:", err);
      alert("Error deleting archived submission: " + (err.message || err));
    }
  };

  const handlePermanentDeleteWithdrawal = async (item: ArchivedWithdrawal) => {
    const confirm = window.confirm("CRITICAL WARNING:\nAre you sure you want to PERMANENTLY DELETE this archived tracking item?\nThis will remove the tracking record from the Deleted History registry forever. All completed member wallet cashouts and accounting ledger entries will NOT be modified or lost.");
    if (!confirm) return;
    try {
      await deleteDoc(doc(db, 'deleted_history', 'withdrawals', 'records', item.id));
      alert("Archived withdrawal record permanently deleted from Deleted History.");
    } catch (err: any) {
      console.error("Error deleting archived withdrawal:", err);
      alert("Error deleting archived withdrawal: " + (err.message || err));
    }
  };

  useEffect(() => {
    if (toastMessage) {
      const timeout = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [toastMessage]);

  const [adminTaskFilter, setAdminTaskFilter] = useState<'All' | 'Pending' | 'Live' | 'Submitted' | 'Completed' | 'Removed'>('All');
  const [adminTaskAuditReason, setAdminTaskAuditReason] = useState<Record<string, string>>({});
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Bulk selection and batch deletion to the REMOVED tab
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [batchDeletionReason, setBatchDeletionReason] = useState('');

  // Clear selections when tab or filter changes
  useEffect(() => {
    setSelectedTaskIds([]);
  }, [adminTaskFilter, activeTab]);

  const visibleRemovedTasks = (clientTasks || []).filter(t => (t.status || '').toLowerCase() === 'removed');

  const filteredUsersForAdmin = users.filter(u => {
    // 0. Search filter
    if (userSearchQuery.trim() !== '') {
      const q = userSearchQuery.toLowerCase();
      const name = (u.fullName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const reddit = (u.redditUsername || '').toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !reddit.includes(q)) {
        return false;
      }
    }

    // 1. Status filter
    if (selectedAdminStatusFilter === 'active_pending') {
      const uStatusLower = (u.status || '').toLowerCase();
      if (uStatusLower === 'rejected') {
        return false;
      }
    } else if (selectedAdminStatusFilter !== 'all') {
      const uStatusLower = (u.status || '').toLowerCase();
      const filterLower = selectedAdminStatusFilter.toLowerCase();
      if (filterLower === 'deleted') {
        return false;
      } else if (filterLower === 'banned') {
        if (uStatusLower !== 'banned' && !u.isBanned) {
          return false;
        }
      } else if (filterLower === 'suspended') {
        if (uStatusLower !== 'suspended' && !u.isSuspended) {
          return false;
        }
      } else if (uStatusLower !== filterLower) {
        return false;
      }
    }
    // 2. Tier filter
    if (selectedAdminTierFilter !== 'all' && getKarmaTier(u.karma).name.toLowerCase() !== selectedAdminTierFilter.toLowerCase()) {
      return false;
    }
    // 3. Role filter
    if (selectedAdminRoleFilter !== 'all') {
      const uRole = u.role || 'user';
      if (selectedAdminRoleFilter === 'moderators' && uRole !== 'moderator') {
        return false;
      }
      if (selectedAdminRoleFilter === 'admins' && uRole !== 'admin') {
        return false;
      }
      if (selectedAdminRoleFilter === 'members' && (uRole !== 'user' && uRole !== 'member')) {
        return false;
      }
    }
    return true;
  });

  const filteredClientsForAdmin = (clients || []).filter(c => {
    // 0. Search filter
    if (clientSearchQuery.trim() !== '') {
      const q = clientSearchQuery.toLowerCase();
      const name = (c.name || '').toLowerCase();
      const company = (c.company || '').toLowerCase();
      const gmail = (c.gmail || '').toLowerCase();
      const whatsapp = (c.whatsapp || '').toLowerCase();
      if (!name.includes(q) && !company.includes(q) && !gmail.includes(q) && !whatsapp.includes(q)) {
        return false;
      }
    }

    // 1. Status filter
    const cStatusLower = (c.status || '').toLowerCase();
    if (selectedClientStatusFilter === 'active_pending') {
      return cStatusLower === 'approved' || cStatusLower === 'pending';
    }
    if (selectedClientStatusFilter !== 'all') {
      return cStatusLower === selectedClientStatusFilter;
    }
    return true;
  });

  // Overview metrics
  const pendingVerificationsCount = users.filter(u => u.status === 'Pending').length;
  const pendingSubmissionsCount = submissions.filter(s => (s.status === 'Pending' || s.status === 'Under Admin Review') && !s.deleted).length;
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'Pending').length;
  const totalPayoutAmt = withdrawals.filter(w => w.status === 'Approved').reduce((acc, curr) => acc + curr.amount, 0);

  // Client Specific Overview metrics
  const pendingClientsCount = (clients || []).filter(c => c.status === 'pending').length;
  const pendingClientTasksCount = (clientTasks || []).filter(t => t.status === 'pending').length;
  const unresolvedChatsCount = (clientChats || []).filter(chat => chat.resolvedStatus === 'unresolved').length;
  const outstandingDuesCount = (clients || []).filter(c => c.payAgencyBalance > 0).length;

  // React-side unread/viewed tracking with local storage fallback for persistence across refresh
  const [lastViewedTime, setLastViewedTime] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('admin_last_viewed_tabs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Keep timestamps dynamically connected for real-time unread bubble triggers
  const lastTicketTime = tickets.length > 0
    ? Math.max(...tickets.map(t => new Date(t.createdAt).getTime()))
    : 0;

  const lastClientMessageTime = clientChats.length > 0
    ? Math.max(...clientChats.map(c => new Date(c.lastMessageTimestamp).getTime()))
    : 0;

  const lastSubmissionTimeVal = submissions.length > 0
    ? Math.max(...submissions.map(s => new Date(s.submittedAt).getTime()))
    : 0;

  const lastUserJoinTime = users.length > 0
    ? Math.max(...users.map(u => new Date(u.joinDate).getTime()))
    : 0;

  const lastClientJoinTime = clients.length > 0
    ? Math.max(...clients.map(c => new Date(c.registeredAt).getTime()))
    : 0;

  const lastPaymentTime = clientPaymentProofs.length > 0
    ? Math.max(...clientPaymentProofs.map(p => new Date(p.submittedAt).getTime()))
    : 0;

  const lastWithdrawalTime = withdrawals.length > 0
    ? Math.max(...withdrawals.map(w => new Date(w.requestedAt).getTime()))
    : 0;

  const lastSecurityAlertTime = (fraudAlerts || []).length > 0
    ? Math.max(...fraudAlerts.map(a => new Date(a.timestamp).getTime()))
    : 0;

  const lastAuditLogTime = (auditLogs || []).length > 0
    ? Math.max(...auditLogs.map(l => new Date(l.timestamp).getTime()))
    : 0;

  const lastAnnouncementTime = (notifications || []).length > 0
    ? Math.max(...notifications.filter(n => n.type === 'announcement').map(n => new Date(n.timestamp).getTime()))
    : 0;

  useEffect(() => {
    setLastViewedTime(prev => {
      const next = { ...prev, [activeTab]: Date.now() };
      localStorage.setItem('admin_last_viewed_tabs', JSON.stringify(next));
      return next;
    });
  }, [
    activeTab,
    lastTicketTime,
    lastClientMessageTime,
    lastSubmissionTimeVal,
    lastUserJoinTime,
    lastClientJoinTime,
    lastPaymentTime,
    lastWithdrawalTime,
    lastSecurityAlertTime,
    lastAuditLogTime,
    lastAnnouncementTime
  ]);

  // Helper for parsing task ID times
  const getTaskTimestamp = (taskId: string) => {
    const parts = taskId.split('-');
    if (parts.length >= 2) {
      const ts = Number(parts[1]);
      if (!isNaN(ts)) return ts;
    }
    return 0;
  };

  // Section-by-section dynamic badges logic
  const usersBadgeCount = users.filter(u => 
    u.status === 'Pending' || 
    (new Date(u.joinDate).getTime() > (lastViewedTime['users'] || 0)) ||
    (u.fraudScore !== undefined && u.fraudScore && u.fraudScore > 50 && u.status === 'Pending')
  ).length;

  const clientsBadgeCount = (clients || []).filter(c => 
    c.status === 'pending' || 
    (new Date(c.registeredAt).getTime() > (lastViewedTime['clients'] || 0))
  ).length;

  const clientTasksBadgeCount = (clientTasks || []).filter(t => 
    t.status === 'pending_review' || 
    t.status === 'pending' ||
    (t.createdAt && new Date(t.createdAt).getTime() > (lastViewedTime['client-tasks'] || 0))
  ).length;

  const paymentsBadgeCount = (clientPaymentProofs || []).filter(p => 
    p.status === 'pending' || 
    (new Date(p.submittedAt).getTime() > (lastViewedTime['client-payments'] || 0))
  ).length + (clients || []).filter(c => c.payAgencyBalance > 0).length;

  const clientSupportBadgeCount = 
    (tickets || []).filter(t => t.status === 'Open').length +
    (clientChats || []).filter(chat => chat.resolvedStatus === 'unresolved').length +
    (clientChats || []).filter(c => c.messages.some(m => m.senderId !== 'admin' && (!lastViewedTime['client-chats'] || new Date(m.timestamp).getTime() > lastViewedTime['client-chats']))).length;

  const tasksBadgeCount = tasks.filter(t => {
    const ts = getTaskTimestamp(t.id);
    const isNew = ts > (lastViewedTime['tasks'] || 0);
    return isNew || t.status === 'available';
  }).length;

  const submissionsBadgeCount = submissions.filter(s => 
    !s.deleted && !s.archived && (
      s.status === 'Pending' || 
      s.status === 'Under Admin Review' ||
      (s.submittedAt && new Date(s.submittedAt).getTime() > (lastViewedTime['submissions'] || 0))
    )
  ).length;

  const withdrawalsBadgeCount = withdrawals.filter(w => 
    !w.archived && (
      w.status === 'Pending' ||
      (w.requestedAt && new Date(w.requestedAt).getTime() > (lastViewedTime['withdrawals'] || 0))
    )
  ).length;

  const trackDataBadgeCount = 
    (duplicateGroups || []).length +
    submissions.filter(s => s.isFlagged).length +
    users.filter(u => u.fraudScore && u.fraudScore > 75 && u.status === 'Pending').length;

  const securityBadgeCount = (fraudAlerts || []).filter(a => 
    a.status === 'pending' ||
    (new Date(a.timestamp).getTime() > (lastViewedTime['security'] || 0))
  ).length;

  const announcementsBadgeCount = (notifications || []).filter(n => 
    n.type === 'announcement' &&
    new Date(n.timestamp).getTime() > (lastViewedTime['announcements'] || 0)
  ).length;

  const auditLogsBadgeCount = (auditLogs || []).filter(log => 
    new Date(log.timestamp).getTime() > (lastViewedTime['audit-log'] || 0)
  ).length;

  // 1. Submit Create Task
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDescription || !taskReward || !taskMaxSubmissions) {
      alert('Please fill out general task fields.');
      return;
    }

    // Validate Reddit markdown links for security
    const titleCheck = validateRedditMarkdownLinks(taskTitle);
    if (!titleCheck.isValid) {
      alert(`Title links validation failed:\n${titleCheck.error}`);
      return;
    }
    const descCheck = validateRedditMarkdownLinks(taskDescription);
    if (!descCheck.isValid) {
      alert(`Description links validation failed:\n${descCheck.error}`);
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
      specialLabel: isSpecialTask ? specialLabel : '',
      visibility: taskVisibility,
      assignedMembers: taskVisibility === 'assigned' ? assignedMembers : [],
      isExclusive: taskVisibility === 'assigned' ? isExclusiveTask : false
    };

    let extendedTask = {};
    if (taskType === 'post') {
      const titleReqCheck = validateRedditMarkdownLinks(requiredTitle);
      if (!titleReqCheck.isValid) {
        alert(`Required post title links validation failed:\n${titleReqCheck.error}`);
        return;
      }
      const postGuideCheck = validateRedditMarkdownLinks(postGuidelines);
      if (!postGuideCheck.isValid) {
        alert(`Post guidelines links validation failed:\n${postGuideCheck.error}`);
        return;
      }

      extendedTask = {
        ...baseTask,
        targetSubreddit: subreddit,
        requiredPostTitle: requiredTitle,
        postGuidelines: postGuidelines
      };
    } else {
      const commentGuideCheck = validateRedditMarkdownLinks(commentGuidelines);
      if (!commentGuideCheck.isValid) {
        alert(`Comment guidelines links validation failed:\n${commentGuideCheck.error}`);
        return;
      }

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
    setSpecialLabel('SPECIAL');
    setTaskVisibility('public');
    setAssignedMembers([]);
    setIsExclusiveTask(false);
    setSearchMemberQuery('');
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

  const isMod = currentUser?.role === 'moderator';

  const menuGroups = [
    {
      title: "Navigation",
      color: "border-indigo-600",
      items: [
        { id: 'dashboard', label: 'Control Center', icon: BarChart2, count: null }
      ]
    },
    {
      title: "User Management",
      color: "border-emerald-500",
      items: [
        { id: 'users', label: 'Users Map', icon: Users, count: usersBadgeCount },
        { id: 'clients', label: 'Clients Registry', icon: Building, count: clientsBadgeCount },
        { id: 'client-tasks', label: 'Client Approvals', icon: CheckSquare, count: clientTasksBadgeCount }
      ]
    },
    {
      title: "Task Operations",
      color: "border-blue-500",
      items: [
        { id: 'tasks', label: 'Tasks Desk', icon: FileText, count: tasksBadgeCount },
        { id: 'submissions', label: 'Task Submits', icon: CheckCircle2, count: submissionsBadgeCount },
        { id: 'deleted-tasks', label: 'Deleted Tasks', icon: Trash2, count: 0 }
      ]
    },
    ...(!isMod ? [{
      title: "Finance",
      color: "border-amber-500",
      items: [
        { id: 'live-wallet', label: 'Wallet Balances', icon: Wallet, count: null },
        { id: 'withdrawals', label: 'Withdraw Desk', icon: Coins, count: withdrawalsBadgeCount },
        { id: 'client-payments', label: 'Agency Payments', icon: CreditCard, count: paymentsBadgeCount }
      ]
    }] : [{
      title: "Finance",
      color: "border-amber-500",
      items: [
        { id: 'withdrawals', label: 'Withdraw Desk', icon: Coins, count: withdrawalsBadgeCount }
      ]
    }]),
    {
      title: "Security & Logs",
      color: "border-red-500",
      items: [
        { id: 'security', label: 'Security Center', icon: Shield, count: securityBadgeCount },
        { id: 'track-data', label: 'Track Data', icon: BarChart2, count: trackDataBadgeCount },
        { id: 'audit-log', label: 'Audit Logs', icon: Archive, count: auditLogsBadgeCount },
        { id: 'deleted-history', label: 'Deleted History', icon: Archive, count: archivedTasks.length + archivedWithdrawals.length + submissions.filter(s => s.deleted).length }
      ]
    },
    {
      title: "Communication",
      color: "border-indigo-500",
      items: [
        { id: 'client-chats', label: 'Client Support', icon: MessageSquare, count: clientSupportBadgeCount },
        { id: 'announcements', label: 'Publish Feed', icon: SendHorizontal, count: announcementsBadgeCount }
      ]
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-slate-800" id="admin-dashboard-container">
      
      {/* Upper Brand Control Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-5 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-650 block mb-1">
            {currentUser?.role === 'moderator' ? 'Moderator Control Center' : 'Administrative Center'}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Control Center
          </h1>
        </div>

        {/* Profile Avatar & Three-line Hamburger Button */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end select-none" id="admin-header-nav">
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 p-1.5 pl-2.5 pr-4 rounded-xl">
            <img 
              src={currentUser?.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=Admin"} 
              alt="Avatar" 
              className="w-8 h-8 rounded-full border border-indigo-500/20 object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="text-left leading-none">
              <span className="text-xs text-indigo-700 font-extrabold block truncate max-w-[130px]">
                {currentUser?.fullName}
              </span>
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
                {currentUser?.role === 'moderator' ? 'Moderator' : 'Administrator'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center justify-center p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer transition hover:scale-105 active:scale-95 border border-indigo-500/10 font-bold font-sans text-sm gap-1.5"
            aria-label="Open Navigation Drawer"
            id="admin-hamburger-btn"
          >
            <span className="text-base leading-none">☰</span>
            <span className="text-[10px] uppercase font-black tracking-wider hidden sm:inline">Menu</span>
          </button>
        </div>
      </div>

      {/* Main Tab Render Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        
        {/* ================= CONTROL CENTER HOMEPAGE ================= */}
        {activeTab === 'dashboard' && (() => {
          const creatorsCount = users.length;
          const activeClientsCount = clients.length;
          const activeTasksCount = tasks.filter(t => t.status === 'Active' || t.status === 'active' || !t.archived).length;
          const pendingReviewsCount = submissions.filter(s => (s.status === 'Pending' || s.status?.toLowerCase().includes('review') || s.status === 'Under Admin Review') && !s.deleted).length;
          const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'Pending').length;
          const openTicketsCount = (tickets || []).filter(t => t.status === 'Open').length;

          const totalPaidOutAmt = withdrawals.filter(w => w.status === 'Approved').reduce((sum, w) => sum + (w.amount || 0), 0);
          const totalPendingPayouts = withdrawals.filter(w => w.status === 'Pending').reduce((sum, w) => sum + (w.amount || 0), 0);
          const totalOutstandingDues = (clientPaymentProofs || []).filter(p => p.status === 'Pending').reduce((sum, p) => sum + (p.amount || 0), 0);

          const recentActivitiesList = (() => {
            const list: any[] = [];
            (submissions || []).forEach(s => {
              if (s.submittedAt) {
                list.push({
                  id: `sub-${s.id}`,
                  text: `u/${s.redditUsername} submitted proof for campaign "${s.taskTitle}"`,
                  date: new Date(s.submittedAt),
                  badgeStr: 'Proof Submitted',
                  badgeClass: 'bg-amber-50 text-amber-700 border border-amber-250'
                });
              }
            });
            (withdrawals || []).forEach(w => {
              const ts = w.requestedAt || w.date;
              if (ts) {
                list.push({
                  id: `wth-${w.id}`,
                  text: `${w.userFullName || 'A creator'} requested a withdrawal of $${w.amount} USDT`,
                  date: new Date(ts),
                  badgeStr: 'Withdrawal Req',
                  badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200'
                });
              }
            });
            (tasks || []).forEach(t => {
              const ts = t.createdAt || t.timestamp;
              if (ts) {
                list.push({
                  id: `tsk-${t.id}`,
                  text: `Campaign "${t.title}" was published (Reward: $${t.reward} USDT)`,
                  date: new Date(ts),
                  badgeStr: 'Campaign Created',
                  badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200'
                });
              }
            });
            (tickets || []).forEach(ticket => {
              const ts = ticket.createdAt || ticket.timestamp;
              if (ts) {
                list.push({
                  id: `tkt-${ticket.id}`,
                  text: `New support ticket opened: "${ticket.subject || 'Inquiry'}" by ${ticket.clientName || 'Brand Owner'}`,
                  date: new Date(ts),
                  badgeStr: 'Ticket Opened',
                  badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                });
              }
            });
            (auditLogs || []).forEach(log => {
              const ts = log.timestamp;
              if (ts) {
                list.push({
                  id: `log-${log.id}`,
                  text: `Operator ${log.operatorName || 'Admin'} performed action: ${log.action}`,
                  date: new Date(ts),
                  badgeStr: 'Audit Log',
                  badgeClass: 'bg-slate-50 text-slate-700 border border-slate-200'
                });
              }
            });
            return list
              .filter(item => !isNaN(item.date.getTime()))
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .slice(0, 8);
          })();

          // Filter matching list based on searchQuery input
          const filteredUsers = (users || []).filter(u => 
            u.fullName?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            u.redditUsername?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(globalSearchQuery.toLowerCase())
          );

          const filteredClientsList = (clients || []).filter(c => 
            c.fullName?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            c.companyName?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            c.email?.toLowerCase().includes(globalSearchQuery.toLowerCase())
          );

          const filteredTasksList = (tasks || []).filter(t => 
            t.title?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            t.id?.toLowerCase().includes(globalSearchQuery.toLowerCase())
          );

          const filteredWithdrawalsList = (withdrawals || []).filter(w => 
            w.userFullName?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            w.redditUsername?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            w.status?.toLowerCase().includes(globalSearchQuery.toLowerCase())
          );

          const filteredTicketsList = (tickets || []).filter(t => 
            t.subject?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            t.message?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
            t.status?.toLowerCase().includes(globalSearchQuery.toLowerCase())
          );

          return (
            <div className="space-y-8 text-left font-sans animate-fade-in" id="admin-control-center-home">
              
              {/* Global Search Interface */}
              <div className="space-y-3">
                <div className="relative font-sans">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    placeholder="Search users, clients, tasks, tickets, withdrawals..."
                    className="block w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-indigo-100 transition shadow-xs"
                  />
                  {globalSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setGlobalSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-650"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {globalSearchQuery && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4 animate-fade-in font-sans">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-450 font-mono">Matched Records across Platform</span>
                      <button 
                        onClick={() => setGlobalSearchQuery('')} 
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold"
                      >
                        Close Results
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredUsers.slice(0, 3).map(u => (
                        <div key={u.id} onClick={() => { setActiveTab('users'); setGlobalSearchQuery(''); }} className="p-3 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl cursor-pointer transition flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-emerald-500" />
                            <div className="text-left font-sans leading-none">
                              <span className="block text-slate-800 truncate max-w-[120px]">{u.fullName}</span>
                              <span className="block text-[9px] text-slate-450 font-mono mt-0.5">u/{u.redditUsername}</span>
                            </div>
                          </div>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded">User Map</span>
                        </div>
                      ))}

                      {filteredClientsList.slice(0, 3).map(c => (
                        <div key={c.id} onClick={() => { setActiveTab('clients'); setGlobalSearchQuery(''); }} className="p-3 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl cursor-pointer transition flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-indigo-500" />
                            <div className="text-left font-sans leading-none">
                              <span className="block text-slate-800 truncate max-w-[125px]">{c.fullName}</span>
                              <span className="block text-[9px] text-slate-450 font-mono mt-0.5">{c.companyName || 'Brand Owner'}</span>
                            </div>
                          </div>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">Clients</span>
                        </div>
                      ))}

                      {filteredTasksList.slice(0, 3).map(t => (
                        <div key={t.id} onClick={() => { setActiveTab('tasks'); setGlobalSearchQuery(''); }} className="p-3 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl cursor-pointer transition flex items-center justify-between text-xs font-bold font-sans">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            <div className="text-left leading-none font-sans">
                              <span className="block text-slate-800 truncate max-w-[130px]">{t.title}</span>
                              <span className="block text-[9px] text-slate-450 font-semibold mt-0.5">${t.reward} USDT</span>
                            </div>
                          </div>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-mono">Tasks</span>
                        </div>
                      ))}

                      {filteredWithdrawalsList.slice(0, 3).map(w => (
                        <div key={w.id} onClick={() => { setActiveTab('withdrawals'); setGlobalSearchQuery(''); }} className="p-3 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl cursor-pointer transition flex items-center justify-between text-xs font-bold font-sans">
                          <div className="flex items-center gap-2">
                            <Coins className="w-4 h-4 text-amber-500" />
                            <div className="text-left leading-none font-sans">
                              <span className="block text-slate-800 truncate max-w-[130px]">{w.userFullName || 'Unknown'}</span>
                              <span className="block text-[9px] text-slate-450 font-semibold mt-0.5">${w.amount} USDT ({w.status})</span>
                            </div>
                          </div>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">Withdrawals</span>
                        </div>
                      ))}

                      {filteredTicketsList.slice(0, 3).map(ticket => (
                        <div key={ticket.id} onClick={() => { setActiveTab('client-chats'); setGlobalSearchQuery(''); }} className="p-3 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl cursor-pointer transition flex items-center justify-between text-xs font-bold font-sans">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-rose-500" />
                            <div className="text-left leading-none font-sans">
                              <span className="block text-slate-800 truncate max-w-[130px]">{ticket.subject || ticket.clientName}</span>
                              <span className="block text-[9px] text-slate-450 font-bold mt-0.5">{ticket.status}</span>
                            </div>
                          </div>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded">Support</span>
                        </div>
                      ))}
                    </div>

                    {filteredUsers.length === 0 && filteredClientsList.length === 0 && filteredTasksList.length === 0 && filteredWithdrawalsList.length === 0 && filteredTicketsList.length === 0 && (
                      <div className="p-6 text-center text-slate-450 text-[11px] font-semibold">
                        No records found matching "{globalSearchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* TOP KPI CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <div onClick={() => setActiveTab('users')} className="bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl p-4 cursor-pointer hover:shadow-md transition text-left select-none space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono">Total Creators</span>
                    <Users className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <span className="text-xl md:text-2xl font-black text-slate-900 block font-mono">{creatorsCount}</span>
                    <span className="text-[9px] text-slate-400 font-bold block">Onboarded Members</span>
                  </div>
                </div>

                <div onClick={() => setActiveTab('clients')} className="bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl p-4 cursor-pointer hover:shadow-md transition text-left select-none space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono">Active Clients</span>
                    <Building className="w-5 h-5 text-indigo-505" />
                  </div>
                  <div>
                    <span className="text-xl md:text-2xl font-black text-slate-900 block font-mono">{activeClientsCount}</span>
                    <span className="text-[9px] text-slate-400 font-bold block">Vetted Brands</span>
                  </div>
                </div>

                <div onClick={() => setActiveTab('tasks')} className="bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl p-4 cursor-pointer hover:shadow-md transition text-left select-none space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono">Active Tasks</span>
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <span className="text-xl md:text-2xl font-black text-slate-900 block font-mono">{activeTasksCount}</span>
                    <span className="text-[9px] text-slate-400 font-bold block">Live Campaigns</span>
                  </div>
                </div>

                <div onClick={() => setActiveTab('submissions')} className="bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl p-4 cursor-pointer hover:shadow-md transition text-left select-none space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono font-sans">Reviews</span>
                    <CheckCircle2 className="w-5 h-5 text-amber-500 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xl md:text-2xl font-black text-amber-600 block font-mono">{pendingReviewsCount}</span>
                    <span className="text-[9px] text-amber-600/90 font-black block">Action Required</span>
                  </div>
                </div>

                <div onClick={() => setActiveTab('withdrawals')} className="bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl p-4 cursor-pointer hover:shadow-md transition text-left select-none space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono font-sans">Withdrawals</span>
                    <Coins className="w-5 h-5 text-rose-500 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xl md:text-2xl font-black text-rose-600 block font-mono">{pendingWithdrawalsCount}</span>
                    <span className="text-[9px] text-rose-600/90 font-black block">Pending Claims</span>
                  </div>
                </div>

                <div onClick={() => setActiveTab('client-chats')} className="bg-white border border-slate-200 hover:border-indigo-500 rounded-2xl p-4 cursor-pointer hover:shadow-md transition text-left select-none space-y-2 animate-pulse-slow">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider font-mono font-sans">Open Tickets</span>
                    <MessageSquare className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <span className="text-xl md:text-2xl font-black text-slate-900 block font-mono">{openTicketsCount}</span>
                    <span className="text-[9px] text-slate-400 font-bold block">Support Requests</span>
                  </div>
                </div>
              </div>

              {/* ACTION REQUIRED HIGHLIGHTED WIDGETS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="w-1.5 h-3.5 bg-amber-500 rounded-full" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-650 font-mono">Action Required Items</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div 
                    onClick={() => setActiveTab('submissions')}
                    className="p-4 bg-amber-50 border border-amber-200 hover:border-amber-300 rounded-2xl cursor-pointer hover:shadow-sm transition space-y-2 text-left"
                  >
                    <div className="flex items-center gap-2 text-amber-800">
                      <CheckCircle2 className="w-4 h-4 text-amber-600 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wide font-mono">Pending Submissions</span>
                    </div>
                    <p className="text-[11px] text-amber-700 font-semibold leading-relaxed m-0">
                      There are <strong className="font-extrabold">{pendingReviewsCount}</strong> submission files awaiting review. Inspect uploaded proof assets to approve.
                    </p>
                    <span className="inline-block pt-1.5 text-[9px] font-black uppercase text-amber-800 tracking-wider">Inspect Proofs &rarr;</span>
                  </div>

                  <div 
                    onClick={() => setActiveTab('withdrawals')}
                    className="p-4 bg-rose-50 border border-rose-200 hover:border-rose-300 rounded-2xl cursor-pointer hover:shadow-sm transition space-y-2 text-left"
                  >
                    <div className="flex items-center gap-2 text-rose-800">
                      <Coins className="w-4 h-4 text-rose-600 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wide font-mono">Pending Withdrawals</span>
                    </div>
                    <p className="text-[11px] text-rose-700 font-semibold leading-relaxed m-0">
                      There are <strong className="font-extrabold">{pendingWithdrawalsCount}</strong> user withdrawals in loop. Verify balance and trigger payouts.
                    </p>
                    <span className="inline-block pt-1.5 text-[9px] font-black uppercase text-rose-800 tracking-wider">Authorize Claims &rarr;</span>
                  </div>

                  <div 
                    onClick={() => setActiveTab('client-tasks')}
                    className="p-4 bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-2xl cursor-pointer hover:shadow-sm transition space-y-2 text-left"
                  >
                    <div className="flex items-center gap-2 text-blue-800">
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                      <span className="text-[10px] font-black uppercase tracking-wide font-mono">Client Approvals</span>
                    </div>
                    <p className="text-[11px] text-blue-700 font-semibold leading-relaxed m-0">
                      Onboard new corporate client accounts, verify campaign briefs, and authorize deposit credentials.
                    </p>
                    <span className="inline-block pt-1.5 text-[9px] font-black uppercase text-blue-800 tracking-wider">Onboarding Desk &rarr;</span>
                  </div>

                  <div 
                    onClick={() => setActiveTab('client-chats')}
                    className="p-4 bg-purple-50 border border-purple-200 hover:border-purple-300 rounded-2xl cursor-pointer hover:shadow-sm transition space-y-2 text-left"
                  >
                    <div className="flex items-center gap-2 text-purple-800">
                      <MessageSquare className="w-4 h-4 text-purple-600" />
                      <span className="text-[10px] font-black uppercase tracking-wide font-mono">Open Support Tickets</span>
                    </div>
                    <p className="text-[11px] text-purple-700 font-semibold leading-relaxed m-0">
                      Currently resolving <strong className="font-extrabold">{openTicketsCount}</strong> client tickets. Provide live assistance and process responses.
                    </p>
                    <span className="inline-block pt-1.5 text-[9px] font-black uppercase text-purple-800 tracking-wider">Answer Helpdesk &rarr;</span>
                  </div>
                </div>
              </div>

              {/* QUICK ACTIONS & FINANCIAL OVERVIEW & PLATFORM HEALTH */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Panel 1: Quick Actions */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 font-mono m-0">Quick Action Deck</h4>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('tasks')}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer transition text-center flex items-center justify-between shadow-xs uppercase tracking-wide"
                    >
                      <span>Create New Task</span>
                      <PlusCircle className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('clients')}
                      className="w-full py-2.5 px-4 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition text-center flex items-center justify-between uppercase tracking-wide"
                    >
                      <span>Setup Client Profile</span>
                      <Building className="w-4 h-4 text-slate-450" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('announcements')}
                      className="w-full py-2.5 px-4 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition text-center flex items-center justify-between uppercase tracking-wide"
                    >
                      <span>Publish Announcement</span>
                      <SendHorizontal className="w-4 h-4 text-slate-450" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('users')}
                      className="w-full py-2.5 px-4 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition text-center flex items-center justify-between uppercase tracking-wide"
                    >
                      <span>Add/Promote Moderator</span>
                      <Users className="w-4 h-4 text-slate-450" />
                    </button>
                  </div>
                </div>

                {/* Panel 2: Financial Overview */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <CreditCard className="w-4.5 h-4.5 text-indigo-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 font-mono m-0">Financial Overview</h4>
                  </div>
                  
                  <div className="space-y-3.5 pt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Total Paid Out</span>
                      <span className="font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg font-mono">
                        ${totalPaidOutAmt.toFixed(2)} USDT
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Pending Withdrawals</span>
                      <span className="font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg font-mono">
                        ${totalPendingPayouts.toFixed(2)} USDT
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Outstanding Client Dues</span>
                      <span className="font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg font-mono">
                        ${totalOutstandingDues.toFixed(2)} USDT
                      </span>
                    </div>

                    <div className="text-[10px] font-bold text-slate-400 bg-white border border-slate-150 p-2 rounded-xl text-center font-mono">
                      USDT Vault Address: ERC-20 Verified
                    </div>
                  </div>
                </div>

                {/* Panel 3: Platform Health Monitor */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Shield className="w-4.5 h-4.5 text-indigo-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 font-mono m-0">Platform Infrastructure Status</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Website Status</span>
                      <div className="flex items-center gap-1.5 uppercase font-black text-[9px] font-mono text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        Online
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Firebase Realtime Sync</span>
                      <div className="flex items-center gap-1.5 uppercase font-black text-[9px] font-mono text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        Online
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Discord Verification Hook</span>
                      <div className="flex items-center gap-1.5 uppercase font-black text-[9px] font-mono text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        Online
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-500">Email Gateway (SMTP)</span>
                      <div className="flex items-center gap-1.5 uppercase font-black text-[9px] font-mono text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                        Online
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* RECENT LIVE ACTIVITY FEED */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-indigo-600 rounded-full" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-650 font-mono">Recent Live Platform Feed</h3>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-extrabold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">Real-time Stream</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {recentActivitiesList.length === 0 ? (
                    <p className="p-8 text-center text-slate-450 font-bold text-xs">No recent platform activities logged yet.</p>
                  ) : (
                    recentActivitiesList.map(activity => (
                      <div key={activity.id} className="p-3.5 hover:bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition">
                        <div className="flex items-start gap-3 text-left">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wide rounded-md shrink-0 font-mono ${activity.badgeClass}`}>
                            {activity.badgeStr}
                          </span>
                          <span className="text-xs font-bold text-slate-700 leading-snug">{activity.text}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold font-mono whitespace-nowrap shrink-0">
                          {activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ({activity.date.toLocaleDateString()})
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          );
        })()}

        {/* ================= CLIENTS REGISTRY TAB ================= */}
        {activeTab === 'clients' && (
          <div className="space-y-6 text-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2 text-indigo-600">
                  <Building className="w-5 h-5 text-indigo-600" /> Brand Clients Management Registry
                </h2>
                <p className="text-xs text-slate-500 mt-1">Review onboarding requirements, toggle upload privileges, or suspend brand campaigns.</p>
              </div>
              
              {/* Global Disable Client Upload Switch */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Global Task Lock</span>
                  <span className="text-[10px] text-slate-500 font-medium">Block all brand uploads instantly</span>
                </div>
                <button
                  onClick={() => {
                    if (currentUser?.role === 'moderator') {
                      setShowPermissionRestrictedModal("Toggling the global task lock or modifying core brand settings is restricted to Platform Administrators.");
                      return;
                    }
                    adminToggleGlobalTaskUpload(!settings.disableAllClientUploads);
                  }}
                  className={`p-1.5 rounded-xl border flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    settings.disableAllClientUploads
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  {settings.disableAllClientUploads ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-rose-600" /> Uploads Blocked
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-emerald-600" /> Uploads Allowed
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Search and Status Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              {/* Search Bar */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Search Brand Clients</label>
                <div className="relative">
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder="Search by name, company, email..."
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />
                  {clientSearchQuery && (
                    <button 
                      onClick={() => setClientSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-850 text-[10px] uppercase font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter Sub-Tabs */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status Registry View</label>
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'active_pending', label: 'Active & Pending' },
                    { id: 'approved', label: 'Approved' },
                    { id: 'pending', label: 'Pending Approval' },
                    { id: 'rejected', label: 'Rejected Brands' },
                    { id: 'all', label: 'All Brands' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedClientStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                        selectedClientStatusFilter === tab.id
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clients Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-550 bg-slate-50 uppercase tracking-wider">
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
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredClientsForAdmin.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-500 font-semibold italic">
                        No clients matching current filters found in database.
                      </td>
                    </tr>
                  ) : (
                    filteredClientsForAdmin.map(c => {
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/75 border-b border-slate-100 transition duration-150">
                          <td className="py-4 px-2 space-y-0.5">
                            <p className="font-extrabold text-slate-900 text-sm">{c.name}</p>
                            <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">{c.company}</span>
                          </td>
                          <td className="py-4 px-2 font-bold text-slate-700">
                            {c.country}
                          </td>
                          <td className="py-4 px-2 space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-850 font-semibold">
                              <span className="font-mono text-xs">{c.whatsapp}</span>
                              <a 
                                href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-[9px] bg-emerald-50 text-emerald-750 px-1.5 py-0.5 rounded font-bold uppercase border border-emerald-200 block w-max"
                              >
                                Ping WhatsApp
                              </a>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                              <span>{c.gmail}</span>
                            </div>
                            {/* Explicit Email/Phone verification flags requested */}
                            <div className="space-y-1 mt-1 font-sans text-[11px] font-bold">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 uppercase tracking-wider text-[9px]">Email:</span>
                                {c.gmailVerified ? (
                                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-extrabold select-none">Verified</span>
                                ) : (
                                  <span className="text-rose-700 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-extrabold select-none">Not Verified</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-500 uppercase tracking-wider text-[9px]">Phone:</span>
                                {c.phoneVerified ? (
                                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-extrabold select-none">Verified: {c.phoneNumber || 'N/A'}</span>
                                ) : (
                                  <span className="text-rose-705 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-extrabold select-none">Not verified</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2 space-y-1">
                            <span className="text-slate-800 block font-bold text-[11px]">{c.paymentMethod}</span>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Est: <span className="text-slate-650 font-bold">{c.budget || 'None'}</span>
                              {c.paymentNotes && <p className="text-[9px] font-sans text-slate-450 max-w-sm truncate" title={c.paymentNotes}>"{c.paymentNotes}"</p>}
                            </div>
                          </td>
                          <td className="py-4 px-2">
                            <span className={`font-mono text-sm font-black ${c.payAgencyBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              ${c.payAgencyBalance.toFixed(2)} USDT
                            </span>
                          </td>
                          <td className="py-4 px-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              c.taskUploadEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'
                            }`}>
                              {c.taskUploadEnabled ? 'ENABLED' : 'DISABLED'}
                            </span>
                          </td>
                          <td className="py-4 px-2 select-none">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider border ${
                              c.status === 'approved' ? 'bg-emerald-50 border-emerald-250 text-emerald-700' :
                              c.status === 'pending' ? 'bg-amber-50 border-amber-250 text-amber-700 animate-pulse' :
                              c.status === 'rejected' ? 'bg-slate-100 border-slate-250 text-slate-500' : 'bg-rose-50 border-rose-250 text-rose-700'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-right space-y-2 min-w-[210px] select-none">
                            {c.status === 'pending' && (
                              <div className="space-y-1.5">
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => {
                                      if (!(c.gmailVerified || c.emailVerified)) {
                                        const proceed = window.confirm("⚠️ Email not verified yet");
                                        if (!proceed) return;
                                      }
                                      adminReviewClient(c.id, 'approved');
                                    }}
                                    className="px-2.5 py-1 text-[10px] font-bold rounded text-white cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      const fb = clientRejectFeedback[c.id] || 'Brand submission failed identity and payment verification standards.';
                                      adminReviewClient(c.id, 'rejected', fb);
                                    }}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold rounded cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={clientRejectFeedback[c.id] || ''}
                                  onChange={(e: any) => setClientRejectFeedback({ ...clientRejectFeedback, [c.id]: e.target.value })}
                                  placeholder="Feedback/Rejection details..."
                                  className="w-full text-[10px] bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 focus:outline-none focus:border-indigo-500 text-right"
                                />
                              </div>
                            )}

                            {c.status === 'approved' && (
                              <div className="flex gap-1.5 justify-end flex-wrap">
                                <button
                                  onClick={() => adminToggleTaskUpload(c.id, !c.taskUploadEnabled)}
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                                    c.taskUploadEnabled 
                                      ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' 
                                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                >
                                  {c.taskUploadEnabled ? 'Block Upload' : 'Allow Submissions'}
                                </button>
                                <button
                                  onClick={() => adminReviewClient(c.id, 'suspended', 'Suspended for platform policy violations')}
                                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold rounded border border-slate-200 cursor-pointer"
                                >
                                  Hold Client
                                </button>
                              </div>
                            )}

                            {c.status === 'suspended' && (
                              <button
                                onClick={() => {
                                  if (!(c.gmailVerified || c.emailVerified)) {
                                    const proceed = window.confirm("⚠️ Email not verified yet");
                                    if (!proceed) return;
                                  }
                                  adminReviewClient(c.id, 'approved');
                                }}
                                className="px-2.5 py-1.5 text-[10px] font-bold rounded text-white cursor-pointer bg-indigo-600 hover:bg-indigo-550"
                              >
                                Activate Profile
                              </button>
                            )}

                            {c.status === 'rejected' && (
                              <div className="space-y-1.5 text-right">
                                <p className="text-[10px] text-slate-500 italic max-w-[200px] text-right ml-auto">
                                  Reason: "{c.rejectionReason || 'No reason specified'}"
                                </p>
                                <button
                                  type="button"
                                  onClick={() => adminReviewClient(c.id, 'approved')}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-lg cursor-pointer inline-block transition"
                                >
                                  Restore Brand
                                </button>
                              </div>
                            )}

                            {(currentUser?.role === 'admin' || currentUser?.role === 'moderator') && (
                              <div className="pt-2 border-t border-slate-200 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (currentUser?.role === 'moderator') {
                                      setShowPermissionRestrictedModal("Permanently deleting client brand profiles is restricted to senior Platform Administrators.");
                                      return;
                                    }
                                    setClientToDelete(c);
                                  }}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] font-bold uppercase rounded-lg cursor-pointer bg-red-50 hover:bg-red-650 border border-red-200 text-red-600 hover:text-white select-none transition-all shadow-xs"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete Account
                                </button>
                              </div>
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
          <div className="space-y-6 text-slate-800">
            <div className="pb-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-indigo-600 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-600" /> Brand Campaigns Audit & Review Panel
              </h2>
              <p className="text-xs text-slate-500 mt-1">Audit, approve, force-complete, or remove campaigns proposed by brand clients. Specify payout multipliers before publishing them live to the creator marketplace.</p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 items-center justify-between shadow-xs">
              <div className="flex flex-wrap gap-1.5">
                {(['All', 'Pending', 'Live', 'Submitted', 'Completed', 'Removed'] as const).map(f => {
                  const matchedCount = (clientTasks || []).filter(t => {
                    const s = (t.status || '').toLowerCase();
                    if (f === 'Pending') return s === 'pending' || s === 'pending_review';
                    if (f === 'Live') return s === 'approved/live' || s === 'claimed';
                    if (f === 'Submitted') return s === 'submitted';
                    if (f === 'Completed') return s === 'completed';
                    if (f === 'Removed') return s === 'removed';
                    return s !== 'removed' && s !== 'deleted';
                  }).length;

                  return (
                    <button
                      key={f}
                      onClick={() => setAdminTaskFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition uppercase tracking-wider cursor-pointer flex items-center gap-1.5 border ${
                        adminTaskFilter === f
                          ? 'bg-indigo-600 border-indigo-550 text-white shadow-sm'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      <span>{f}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        adminTaskFilter === f ? 'bg-black/15 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>{matchedCount}</span>
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] font-mono text-slate-500 mr-2 uppercase flex items-center gap-2 font-semibold">
                {adminTaskFilter === 'Removed' && selectedTaskIds.length > 0 && (
                  <span className="bg-purple-50 border border-purple-200 text-purple-700 font-bold normal-case px-2.5 py-1 rounded inline-flex items-center gap-1 animate-pulse select-none shadow-sm">
                    💜 {selectedTaskIds.length} {selectedTaskIds.length === 1 ? 'task' : 'tasks'} selected
                  </span>
                )}
                <span>Real-Time Sync active</span>
              </span>
            </div>

            {/* Campaigns Ledger Table */}
            <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 animate-fade-in shadow-sm">
              <table className="w-full text-left border-collapse text-xs min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50/75">
                    {adminTaskFilter === 'Removed' && (
                      <th className="py-4 px-4 w-12 text-center select-none">
                        <input
                          type="checkbox"
                          checked={visibleRemovedTasks.length > 0 && visibleRemovedTasks.every(t => selectedTaskIds.includes(t.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTaskIds(visibleRemovedTasks.map(t => t.id));
                            } else {
                              setSelectedTaskIds([]);
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-650 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
                        />
                      </th>
                    )}
                    <th className="py-4 px-4">Campaign & Client</th>
                    <th className="py-4 px-4">Type</th>
                    <th className="py-4 px-4">Visibility / Assigned</th>
                    <th className="py-4 px-4 text-right">Proposed Agency Pay</th>
                    <th className="py-4 px-4 text-center">Creator Pay Set</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4">Claimant / Submissions</th>
                    <th className="py-4 px-4 text-right">Execution Controls & Action Desk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(clientTasks || []).filter(t => {
                    const s = (t.status || '').toLowerCase();
                    if (adminTaskFilter === 'Pending') return s === 'pending' || s === 'pending_review';
                    if (adminTaskFilter === 'Live') return s === 'approved/live' || s === 'claimed';
                    if (adminTaskFilter === 'Submitted') return s === 'submitted';
                    if (adminTaskFilter === 'Completed') return s === 'completed';
                    if (adminTaskFilter === 'Removed') return s === 'removed';
                    return s !== 'removed' && s !== 'deleted';
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={adminTaskFilter === 'Removed' ? 9 : 8} className="py-12 text-center text-slate-500 italic font-semibold">
                        No campaign tasks match the "{adminTaskFilter}" filter criteria.
                      </td>
                    </tr>
                  ) : (
                    (clientTasks || []).filter(t => {
                      const s = (t.status || '').toLowerCase();
                      if (adminTaskFilter === 'Pending') return s === 'pending' || s === 'pending_review';
                      if (adminTaskFilter === 'Live') return s === 'approved/live' || s === 'claimed';
                      if (adminTaskFilter === 'Submitted') return s === 'submitted';
                      if (adminTaskFilter === 'Completed') return s === 'completed';
                      if (adminTaskFilter === 'Removed') return s === 'removed';
                      return s !== 'removed' && s !== 'deleted';
                    }).map((t) => {
                      const s = (t.status || '').toLowerCase();
                      const rate = clientTaskRates[t.id] ?? (t.memberPay || t.agencyPay * 0.70);
                      const isDisputed = t.disputeRaised;
                      const hasSub = t.proofLink;
                      const isSelected = selectedTaskIds.includes(t.id);

                      return (
                        <React.Fragment key={t.id}>
                          <tr className={`transition-colors border-b border-slate-100 ${
                            adminTaskFilter === 'Removed' && isSelected
                              ? 'bg-purple-50/50 border-l-4 border-l-purple-500'
                              : 'hover:bg-slate-50/75'
                          }`}>
                            {adminTaskFilter === 'Removed' && (
                              <td className="py-4 px-4 text-center select-none w-12">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedTaskIds(prev => [...prev, t.id]);
                                    } else {
                                      setSelectedTaskIds(prev => prev.filter(id => id !== t.id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-650 focus:ring-indigo-500 cursor-pointer accent-indigo-500"
                                />
                              </td>
                            )}
                            <td className="py-4 px-4 select-text max-w-xs">
                              <div className="font-extrabold text-slate-900 text-sm truncate" title={t.title}>{t.title}</div>
                              <div className="flex gap-2 items-center text-[10px] text-slate-500 mt-1">
                                <span className="text-slate-705 font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                  Brand: {t.clientName || 'Unlabeled'}
                                </span>
                                <span className="text-slate-450 font-mono">ID: {t.id}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-[10px] rounded text-slate-700 font-bold uppercase tracking-wider font-mono">
                                {t.type}
                              </span>
                            </td>
                            <td className="py-4 px-4 max-w-xs">
                              {t.visibility === 'assigned' ? (
                                <div className="space-y-1">
                                  <span className="inline-block bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    Private
                                  </span>
                                  {t.isExclusive && (
                                    <span className="inline-block bg-indigo-50 border border-indigo-150 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ml-1">
                                      Exclusive
                                    </span>
                                  )}
                                  <div className="text-[10px] text-slate-500 font-mono mt-1" title={t.assignedMembers ? t.assignedMembers.map(uid => users.find(u => u.id === uid)?.redditUsername).join(', ') : ''}>
                                      Members: {t.assignedMembers && t.assignedMembers.length > 0 
                                        ? `${t.assignedMembers.length} assigned`
                                        : 'None assigned'}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-block bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Public
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right font-mono font-bold text-slate-800 text-sm">
                              ${t.agencyPay.toFixed(2)}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-col items-center gap-1.5">
                                {s === 'pending' || s === 'pending_review' ? (
                                  <div className="flex items-center gap-2 select-none">
                                    <span className="text-[10px] text-slate-500 font-mono font-bold">$</span>
                                    <input
                                      type="number"
                                      step="0.05"
                                      placeholder="Reward"
                                      value={rate}
                                      onChange={(e) => setClientTaskRates({ ...clientTaskRates, [t.id]: Math.min(t.agencyPay, Number(e.target.value)) })}
                                      className="w-16 bg-white border border-slate-200 px-1 py-0.5 rounded text-xs text-slate-800 text-center font-bold font-mono focus:border-indigo-500 outline-none"
                                    />
                                    <span className="text-[9px] text-slate-400 font-mono">({((1 - (rate / t.agencyPay)) * 100).toFixed(0)}% fee)</span>
                                  </div>
                                ) : (
                                  <span className="font-mono font-bold text-emerald-600 text-sm">
                                    ${(t.memberPay || 0).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center select-none">
                              <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider border ${
                                s === 'pending' || s === 'pending_review' ? 'bg-amber-50 text-amber-705 border-amber-200' :
                                s === 'approved/live' ? 'bg-emerald-50 text-emerald-700 border-emerald-250 animate-pulse' :
                                s === 'claimed' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                s === 'submitted' ? 'bg-sky-50 border-sky-200 text-sky-700' :
                                s === 'completed' ? 'bg-emerald-50 border-emerald-250 text-emerald-750' :
                                s === 'revision' ? 'bg-purple-50 border-purple-200 text-purple-705' :
                                'bg-slate-100 text-slate-500 border-slate-250'
                              }`}>
                                {s === 'approved/live' ? 'Live' : s}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              {t.claimedBy ? (
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-800 font-mono select-text">u/{t.claimedBy}</p>
                                  {hasSub && (
                                    <a
                                      href={t.proofLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-[9px] font-bold text-indigo-650 rounded hover:bg-slate-100 flex items-center gap-1 w-fit mt-1 animate-fade-in"
                                    >
                                      <span>Proof Link</span>
                                      <ExternalLink className="w-2.5 h-2.5 text-indigo-600" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic select-none">Unclaimed</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right space-y-2 min-w-[280px]">
                              <div className="flex gap-1.5 justify-end items-center">
                                {/* Details Toggle */}
                                <button
                                  onClick={() => setExpandedTaskId(expandedTaskId === t.id ? null : t.id)}
                                  className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-850 text-[10px] font-bold rounded cursor-pointer border border-slate-200 transition"
                                >
                                  {expandedTaskId === t.id ? 'Hide Specs' : 'View Specs'}
                                </button>

                                {/* Edit Visibility & Assignments */}
                                <button
                                  onClick={() => handleStartEditTask(t)}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-205 text-indigo-700 font-bold text-[10px] rounded cursor-pointer transition uppercase flex items-center gap-1.5"
                                  title="Edit Campaign visibility / invite members"
                                >
                                  <Edit className="w-3 h-3 text-indigo-650" /> Edit Assigned
                                </button>

                                {/* Action: Publish/Approve Pending */}
                                {(s === 'pending' || s === 'pending_review') && (
                                  <>
                                    <button
                                      onClick={async () => {
                                        await adminReviewClientTask(t.id, 'publish', rate);
                                        alert('Campaign approved and published successfully!');
                                      }}
                                      className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95 font-bold text-[10px] text-white rounded cursor-pointer transition uppercase tracking-wider shadow-xs"
                                    >
                                      Approve Campaign
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const reason = prompt('Specify rejection revision notes to client:', adminTaskAuditReason[t.id] || '');
                                        if (reason !== null) {
                                          await adminReviewClientTask(t.id, 'reject', undefined, reason);
                                          alert('Proposal sent to client revisions.');
                                        }
                                      }}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-[10px] text-rose-700 rounded cursor-pointer transition uppercase"
                                    >
                                      Revert
                                    </button>
                                  </>
                                )}

                                {/* Action: Force Complete Live Submitted Claims */}
                                {s !== 'completed' && s !== 'removed' && s !== 'pending' && s !== 'pending_review' && (
                                  <button
                                    onClick={async () => {
                                      if (confirm(`Are you sure you want to FORCE COMPLETE and credit the creator for campaign: "${t.title}"?`)) {
                                        await adminReviewClientTask(t.id, 'force_complete');
                                        alert('Campaign force credited and marked completed!');
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-gradient-to-r from-emerald-650 to-teal-600 hover:opacity-95 text-white font-bold text-[10px] rounded cursor-pointer transition uppercase shadow-sm"
                                  >
                                    Force Complete
                                  </button>
                                )}

                                {/* Action: Audit & Remove for active tasks */}
                                {s === 'removed' && (
                                  <button
                                    onClick={() => {
                                      setTaskToDelete({
                                        id: t.id,
                                        title: t.title,
                                        clientName: t.clientName || 'Unlabeled',
                                        type: t.type,
                                        agencyPay: t.agencyPay || 0,
                                        memberPay: t.memberPay || rate || 0
                                      });
                                      setDeletionReason('');
                                    }}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded cursor-pointer transition uppercase flex items-center gap-1 shadow-xs"
                                  >
                                    <Trash2 className="w-3 h-3 text-white" /> Delete Permanently
                                  </button>
                                )}
                                {s !== 'removed' && (
                                  <button
                                    onClick={async () => {
                                      const note = prompt('Enter audit removal reason (notifies client and creator):', adminTaskAuditReason[t.id] || '');
                                      if (note !== null) {
                                        await adminReviewClientTask(t.id, 'remove', undefined, note);
                                        alert('Campaign has been audited and removed.');
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-150 border border-rose-200 text-rose-750 font-bold text-[10px] rounded cursor-pointer transition uppercase"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded detail specifications */}
                          {expandedTaskId === t.id && (
                            <tr className="bg-slate-50/70">
                              <td colSpan={adminTaskFilter === 'Removed' ? 9 : 8} className="p-4 px-6 border-l-4 border-l-indigo-650 text-xs text-slate-655 leading-relaxed font-normal">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-text py-1">
                                  <div className="space-y-2">
                                    <h4 className="font-bold text-indigo-600 uppercase tracking-wider text-[10px]">Campaign Guidelines & Description</h4>
                                    <p className="bg-white p-3 rounded-lg border border-slate-200 text-slate-705 whitespace-pre-wrap shadow-xs">{t.description || 'No description provided.'}</p>
                                    {t.guidelines && <p className="bg-white p-3 rounded-lg border border-slate-200 text-slate-705 whitespace-pre-wrap shadow-xs"><strong className="text-slate-500 font-bold block mb-1">Brand Guidelines:</strong>{t.guidelines}</p>}
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="font-bold text-indigo-600 uppercase tracking-wider text-[10px]">Target Specifications & Private Notes</h4>
                                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-705 space-y-1.5 font-mono text-[10px] shadow-xs">
                                      {t.targetSubreddit && <p><strong>Target Subreddit:</strong> <span className="bg-slate-100 px-1 py-0.5 rounded text-slate-805">r/{t.targetSubreddit.replace(/^r\//, '')}</span></p>}
                                      {t.postUrlToCommentOn && <p><strong>Post URL to comment on:</strong> <a href={t.postUrlToCommentOn} target="_blank" rel="noreferrer" className="text-indigo-650 hover:underline">{t.postUrlToCommentOn}</a></p>}
                                      <p><strong>Proposed Agency Payout:</strong> ${t.agencyPay.toFixed(2)} USDT</p>
                                      <p><strong>Creator Reward set:</strong> ${rate ? Number(rate).toFixed(2) : 'N/A'}</p>
                                      {t.notes && <p className="font-sans whitespace-pre-wrap text-slate-600"><strong className="text-slate-500 block mb-1 font-mono">Brand Private Notes:</strong> {t.notes}</p>}
                                      {t.revisionNote && <p className="font-sans text-amber-700 bg-amber-50 p-2 border border-amber-200 rounded"><strong className="block mb-1 font-mono">Revision Note / Feedback:</strong> {t.revisionNote}</p>}
                                    </div>
                                    <div className="flex gap-4 text-[10px] text-slate-400 pt-1 font-mono">
                                      <span>Proposed: {t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A'}</span>
                                      {t.approvedAt && <span>Approved: {new Date(t.approvedAt).toLocaleString()}</span>}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

         {/* ================= CLIENT PAYMENT DESK TAB ================= */}
        {activeTab === 'client-payments' && (
          currentUser?.role !== 'admin' ? (
            <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-200 max-w-2xl mx-auto space-y-4 my-8 font-sans shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-650">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Shield Guard: Restricted Access</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-semibold">
                Agency payment proofs, financial configurations, incoming invoice channels, and accounting logs require senior Platform Administrator clearance.
              </p>
              <div className="pt-2 text-[10px] text-slate-450 font-mono font-bold uppercase tracking-wider">
                Role Context: Moderator Level II Desk
              </div>
            </div>
          ) : (
            <div className="space-y-10">
            {/* STYLED SUMMARY STATS STRIP FOR ADMINISTRATORS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block mb-1">Pending Proof Queue</span>
                <span className="text-3xl font-black font-mono text-amber-600">
                  {(clientPaymentProofs || []).filter(p => p.status === 'pending').length}
                </span>
                <span className="text-[10px] text-slate-500 mt-2">Proofs awaiting approval verification</span>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block mb-1">Owed Client Balances</span>
                <span className="text-3xl font-black font-mono text-indigo-600">
                  ${(clients || []).reduce((acc, curr) => acc + (curr.payAgencyBalance || 0), 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 mt-2">Combined outstanding dues across all brands</span>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block mb-1">Total Settled Invoices</span>
                <span className="text-3xl font-black font-mono text-emerald-600">
                  ${(clientPayments || []).reduce((acc, curr) => acc + curr.amount, 0).toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 mt-2">Officially confirmed settled value</span>
              </div>
            </div>

            {/* 1. BRAND DEPOSIT PROOFS PIPELINE SECTION */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-indigo-600" /> Confirm Deposit Verification Proofs
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Audit transaction proofs dispatched by agency clients. Approving credentials automatically credits outstanding dues.</p>
                </div>

                {/* Filter Selector */}
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-semibold text-slate-500 font-sans">Filter status:</span>
                  <select
                    value={proofFilterStatus}
                    onChange={(e: any) => setProofFilterStatus(e.target.value)}
                    className="text-xs text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All Submissions</option>
                    <option value="pending">Pending Review</option>
                    <option value="verified">Verified Deposited</option>
                    <option value="rejected">Rejected Proofs</option>
                  </select>
                </div>
              </div>

              {/* TABLE LIST */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                      <th className="py-3 px-3">Brand Manager / Company</th>
                      <th className="py-3 px-3 text-right">Amount Submitted</th>
                      <th className="py-3 px-3">Tx Hash Reference</th>
                      <th className="py-3 px-3">Log Dates</th>
                      <th className="py-3 px-3">Proof Document</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Moderator Audit Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!clientPaymentProofs || clientPaymentProofs.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400 italic font-semibold">
                          No deposit proofs submitted by clients yet.
                        </td>
                      </tr>
                    ) : (
                      clientPaymentProofs
                        .filter(proof => {
                          if (proofFilterStatus === 'all') return true;
                          return proof.status === proofFilterStatus;
                        })
                        .map(proof => (
                          <tr key={proof.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-4 px-3">
                              <span className="font-bold text-slate-900 block">{proof.clientCompany}</span>
                              <span className="text-[10px] text-slate-500">{proof.clientName} (ID: {proof.clientId.substring(0, 8)})</span>
                            </td>
                            <td className="py-4 px-3 text-right font-mono font-black text-emerald-600">
                              ${proof.amount.toFixed(2)} USDT
                            </td>
                            <td className="py-4 px-3 select-all truncate max-w-[150px]" title={proof.transactionId || 'None'}>
                              <span className="text-[10px] text-slate-700 font-mono">
                                {proof.transactionId || 'N/A'}
                              </span>
                              {proof.paymentMethod && (
                                <span className="text-[9px] text-indigo-600 font-bold block uppercase mt-0.5 font-mono">
                                  Method: {proof.paymentMethod.replace('_', ' ')}
                                </span>
                              )}
                              {proof.notes && (
                                <span className="text-[9px] text-slate-500 block italic leading-none truncate mt-1">{proof.notes}</span>
                              )}
                            </td>
                            <td className="py-4 px-3 text-slate-500 font-mono text-[10px]">
                              <p>Sub: {new Date(proof.submittedAt).toLocaleDateString()}</p>
                              {proof.verifiedAt && (
                                <p className="text-[9px] text-slate-400 font-sans">Ver: {new Date(proof.verifiedAt).toLocaleDateString()}</p>
                              )}
                            </td>
                            <td className="py-4 px-3">
                              {proof.proofImageUrl && (
                                <a
                                  href={proof.proofImageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-indigo-600 hover:underline font-bold inline-flex items-center gap-1"
                                >
                                  View Receipt <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </td>
                            <td className="py-4 px-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                proof.status === 'verified'
                                  ? 'bg-emerald-50 border-emerald-250 text-emerald-705'
                                  : proof.status === 'rejected'
                                  ? 'bg-red-50 border-red-200 text-red-700'
                                  : 'bg-amber-50 border-amber-250 text-amber-700'
                              }`}>
                                {proof.status}
                              </span>
                            </td>
                            <td className="py-4 px-3 text-right">
                              {proof.status === 'pending' ? (
                                <div className="space-y-2">
                                  {proofRejectionId === proof.id ? (
                                    <div className="flex flex-col items-end gap-2 bg-red-50/50 p-3 rounded-lg border border-red-150">
                                      <input
                                        type="text"
                                        placeholder="Reason for rejection..."
                                        value={proofRejectionReasonInput}
                                        onChange={(e) => setProofRejectionReasonInput(e.target.value)}
                                        className="w-full text-xs text-slate-800 bg-white border border-red-200 p-1.5 rounded-md focus:outline-none placeholder-slate-400 focus:ring-1 focus:ring-red-500"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            setProofRejectionId(null);
                                            setProofRejectionReasonInput('');
                                          }}
                                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] rounded font-bold uppercase cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (!proofRejectionReasonInput.trim()) {
                                              alert('Specify a rejection reason.');
                                              return;
                                            }
                                            adminRejectPaymentProof(proof.id, proofRejectionReasonInput.trim(), 'admin@socialpanel.com');
                                            setProofRejectionId(null);
                                            setProofRejectionReasonInput('');
                                          }}
                                          className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] rounded font-bold uppercase transition cursor-pointer"
                                        >
                                          Confirm Reject
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => {
                                          setProofRejectionId(proof.id);
                                          setProofRejectionReasonInput('');
                                        }}
                                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] rounded-lg font-bold uppercase transition cursor-pointer"
                                      >
                                        Reject Proof
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (confirm(`Approve settlement payment of $${proof.amount.toFixed(2)} and credit outstanding balance?`)) {
                                            adminVerifyPaymentProof(proof.id, 'admin@socialpanel.com');
                                          }
                                        }}
                                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] rounded-lg font-bold uppercase transition cursor-pointer"
                                      >
                                        Verify & Credit
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {proof.status === 'verified' ? (
                                    <p>Verified by {proof.verifiedBy || 'Admin'}</p>
                                  ) : (
                                    <div className="text-right">
                                      <p className="text-red-600 font-bold text-[9px] uppercase">Reason of rejection:</p>
                                      <p className="text-slate-500 italic max-w-[200px] inline-block font-sans">{proof.rejectionReason}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. MANUAL BILLING INVOICES SETTLER ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Form panel */}
              <div className="space-y-6 lg:border-r lg:border-slate-200 lg:pr-8">
                <h2 className="text-sm font-black uppercase text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2 font-sans tracking-wide">
                  <CreditCard className="w-4 h-4 text-emerald-605" /> Mark Invoice Paid (Manual)
                </h2>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 font-normal space-y-2">
                  <p>✨ Select an onboarding client with outstanding dues below to log their Crypto or Bank transfer receipt manually without their submission.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Select Owed Client</label>
                    <select
                      value={selectedClientForPayment}
                      onChange={(e: any) => {
                        const cid = e.target.value;
                        setSelectedClientForPayment(cid);
                        const cl = clients.find(c => c.id === cid);
                        setConfirmPayAmount(cl ? cl.payAgencyBalance : 0);
                      }}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-3 py-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
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
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Receipt Clearing Amount (USDT)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={confirmPayAmount}
                      onChange={(e: any) => setConfirmPayAmount(Number(e.target.value))}
                      placeholder="e.g. 150.00"
                      className="w-full text-xs text-slate-900 bg-white border border-slate-200 px-3 py-2.5 rounded-xl focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Notes / Transaction Hash Reference</label>
                    <input
                      type="text"
                      value={confirmPayNote}
                      onChange={(e: any) => setConfirmPayNote(e.target.value)}
                      placeholder="e.g. USDT BEP20 TxHash: 0x47a9ff..."
                      className="w-full text-xs text-slate-900 bg-white border border-slate-200 px-3 py-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Receipt Screenshot / PDF URL</label>
                    <input
                      type="text"
                      value={confirmPayReceiptUrl}
                      onChange={(e: any) => setConfirmPayReceiptUrl(e.target.value)}
                      placeholder="https://ipfs.io/... or transaction image url"
                      className="w-full text-xs text-slate-900 bg-white border border-slate-200 px-3 py-2.5 rounded-xl focus:border-indigo-500 font-mono focus:outline-none"
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
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md cursor-pointer text-center uppercase tracking-widest"
                  >
                    Clear Dues & Broadcast Receipt
                  </button>
                </div>
              </div>

              {/* History list */}
              <div className="lg:col-span-2 space-y-6">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-250 pb-3">History of Paid Client Receipts</h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                        <th className="py-3 px-3">Brand Name</th>
                        <th className="py-3 px-3 text-right">Clearing Value</th>
                        <th className="py-3 px-3">Receipt Ref</th>
                        <th className="py-3 px-3">Log Date</th>
                        <th className="py-3 px-3 text-right">Proof</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(clientPayments || []).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 italic font-semibold">
                            No agency payment audits logged yet.
                          </td>
                        </tr>
                      ) : (
                        (clientPayments || []).map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-3 font-bold text-slate-900">
                              {p.clientName}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-emerald-600">
                              ${p.amount.toFixed(2)} USDT
                            </td>
                            <td className="py-3 px-3 font-mono text-[10px] text-slate-600 select-text max-w-xs truncate" title={p.referenceNote}>
                              {p.referenceNote}
                            </td>
                            <td className="py-3 px-3 text-slate-500 font-mono">
                              {new Date(p.paidAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <a
                                href={p.receiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded inline-flex items-center gap-1 border border-slate-200 text-slate-700 transition"
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
          )
        )}

        {/* ================= CLIENT SUPPORT CHAT DESK TAB ================= */}
        {activeTab === 'client-chats' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-slate-200">
              <h2 className="text-base font-black text-indigo-600 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" /> Brand Support Direct Inbox
              </h2>
              <p className="text-xs text-slate-500 mt-1">Resolve outstanding support inquiries submitted by onboarding brand managers. Unread messages show real-time double checkticks.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[500px]">
              
              {/* Inbox lists left */}
              <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-2xl select-none shadow-sm font-sans">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block border-b border-slate-100 pb-2">Conversations</span>
                
                <div className="space-y-2 max-h-[450px] overflow-y-auto">
                  {(clientChats || []).length === 0 ? (
                    <div className="text-center py-10 text-slate-400 italic text-xs">
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
                              ? 'bg-indigo-50/80 border-indigo-200 shadow-sm' 
                              : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className={`font-extrabold text-xs block truncate ${isOpened ? 'text-indigo-950' : 'text-slate-900'}`}>{chat.clientName}</span>
                            {hasUnread && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1 animate-pulse"></span>
                            )}
                          </div>
                          
                          <p className={`text-[11px] font-normal mt-1 leading-snug line-clamp-1 ${isOpened ? 'text-slate-700' : 'text-slate-500'}`}>{snippet}</p>
                          
                          <div className="flex justify-between items-center text-[9px] text-slate-405 font-mono mt-2 pt-1 border-t border-slate-200/50">
                            <span className="flex items-center gap-1 select-none">
                              Status: 
                              {chat.resolvedStatus === 'resolved' ? (
                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded text-[8px] font-bold uppercase font-sans">Resolved</span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-150 rounded text-[8px] font-bold uppercase font-sans">Open</span>
                              )}
                            </span>
                            <span>{new Date(chat.lastMessageTimestamp).toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Chat screen helper right */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 flex flex-col justify-between overflow-hidden shadow-sm">
                {!openChatId ? (
                  <div className="m-auto text-center py-20 pointer-events-none select-none">
                    <MessageCircle className="w-12 h-12 text-slate-300 mx-auto opacity-60 mb-3" />
                    <p className="text-slate-400 text-xs font-bold">Pick an active client thread from the sidebar list to chat.</p>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    {(() => {
                      const activeChat = (clientChats || []).find(ch => ch.clientId === openChatId);
                      if (!activeChat) return null;
                      return (
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center select-none">
                          <div>
                            <span className="font-extrabold text-xs text-slate-800">{activeChat.clientName} Profile Stream</span>
                            <span className="block text-[10px] text-slate-500 mt-1">Status: <span className={activeChat.resolvedStatus === 'resolved' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>{activeChat.resolvedStatus?.toUpperCase() || 'UNRESOLVED'}</span></span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const nextStat = activeChat.resolvedStatus === 'resolved' ? 'unresolved' : 'resolved';
                                adminToggleChatResolution(openChatId, nextStat);
                              }}
                              className="px-2.5 py-1 text-[10px] uppercase font-black tracking-wide border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded cursor-pointer transition-colors shadow-sm"
                            >
                              Toggle {activeChat.resolvedStatus === 'resolved' ? 'Open' : 'Resolved'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Messages Body */}
                    <div className="flex-1 p-4 space-y-3.5 overflow-y-auto max-h-[350px] bg-slate-50/50">
                      {(() => {
                        const activeChat = (clientChats || []).find(ch => ch.clientId === openChatId);
                        if (!activeChat) return null;
                        return activeChat.messages.map((m) => {
                          const isAdmin = m.senderId === 'admin';
                          return (
                            <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                              <div className={`p-3 rounded-2xl max-w-sm text-xs font-normal leading-relaxed shadow-sm ${
                                isAdmin 
                                  ? 'bg-indigo-650 text-white rounded-br-none' 
                                  : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'
                              }`}>
                                <span className={`block text-[9px] font-extrabold pb-0.5 uppercase tracking-wide ${isAdmin ? 'text-[#C7D2FE]' : 'text-slate-500'}`}>
                                  {m.senderName}
                                </span>
                                
                                <p className={`font-medium select-text ${isAdmin ? 'text-white' : 'text-slate-900'}`}>{m.text}</p>
                                
                                {m.fileUrl && (
                                  <div className={`mt-2 text-[10px] p-2 rounded flex items-center gap-1 select-all ${isAdmin ? 'bg-indigo-805/42' : 'bg-slate-100 border border-slate-150'}`}>
                                    <span className="truncate flex-1 font-mono text-[9px]">{m.fileUrl}</span>
                                    <a href={m.fileUrl} target="_blank" rel="noreferrer" className={`font-black shrink-0 ${isAdmin ? 'text-indigo-200 hover:text-white' : 'text-indigo-600 hover:underline'}`}>Open ↗</a>
                                  </div>
                                )}

                                <div className={`text-[8px] opacity-70 text-right mt-1.5 font-mono flex items-center justify-end gap-1 select-none ${isAdmin ? 'text-indigo-200' : 'text-slate-400'}`}>
                                  <span>{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  {isAdmin && (
                                    <span className="text-indigo-350 tracking-tight font-extrabold" title="Double checktick status">✓✓</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Compose Footer */}
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2 select-none">
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
                        className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => {
                          if (!adminReplyMessage.trim()) return;
                          adminSendMessage(openChatId, adminReplyMessage);
                          setAdminReplyMessage('');
                        }}
                        className="p-2.5 px-3.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center shadow-sm"
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-slate-900">User Management</h2>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold uppercase">
                    <span>Total registered creators: {users.length}</span>
                    {selectedAdminRoleFilter !== 'all' && (
                      <span className="text-emerald-600 font-bold">• Role: {selectedAdminRoleFilter}</span>
                    )}
                    {selectedAdminTierFilter !== 'all' && (
                      <span className="text-purple-600 font-bold">• Filtered by: {selectedAdminTierFilter} Tier ({filteredUsersForAdmin.length} matching)</span>
                    )}
                    {selectedAdminStatusFilter !== 'all' && (
                      <span className="text-yellow-600 font-bold">• Status: {selectedAdminStatusFilter} ({filteredUsersForAdmin.length} matching)</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Role filter dropdown */}
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-semibold text-xs text-slate-650 select-none shadow-sm">
                    <span>Role:</span>
                    <select
                      value={selectedAdminRoleFilter}
                      onChange={(e) => setSelectedAdminRoleFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:outline-none focus:ring-0 cursor-pointer text-xs font-black p-1 px-2"
                    >
                      <option value="all">All Roles</option>
                      <option value="members">Members</option>
                      <option value="moderators">Moderators</option>
                      <option value="admins">Admins</option>
                    </select>
                  </div>

                  {/* Tier filter dropdown */}
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-semibold text-xs text-slate-650 select-none shadow-sm">
                    <span>Filter by Custom Tier:</span>
                    <select
                      value={selectedAdminTierFilter}
                      onChange={(e) => setSelectedAdminTierFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:outline-none focus:ring-0 cursor-pointer text-xs font-black p-1 px-2"
                    >
                      <option value="all">All Tiers</option>
                      <option value="bronze">Bronze</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="diamond">Diamond</option>
                      <option value="platinum">Platinum</option>
                      <option value="elite">Elite</option>
                      <option value="legend">Legend</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Creator Search Bar */}
              <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Search Members & Creators</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search by full name, email, reddit username..."
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    {userSearchQuery && (
                      <button 
                        type="button"
                        onClick={() => setUserSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] uppercase font-black"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Users sub-tabs for User Management */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl select-none">
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'active_pending', label: 'Active & Pending', count: users.filter(u => (u.status || '').toLowerCase() !== 'rejected').length },
                    { id: 'all', label: 'All Users', count: users.length },
                    { id: 'Pending', label: 'Pending Approval', count: users.filter(u => u.status === 'Pending' || u.status === 'pending').length },
                    { id: 'Approved', label: 'Approved Only', count: users.filter(u => u.status === 'Approved' || u.status === 'approved').length },
                    { id: 'Rejected', label: 'Rejected Only', count: users.filter(u => u.status === 'Rejected' || u.status === 'rejected').length },
                    { id: 'banned', label: 'Banned', count: users.filter(u => u.status === 'banned' || u.status === 'Banned' || u.isBanned).length },
                    { id: 'suspended', label: 'Suspended', count: users.filter(u => u.status === 'suspended' || u.status === 'Suspended' || u.isSuspended).length },
                  ].map((sTab) => (
                    <button
                      key={sTab.id}
                      type="button"
                      id={`users-tab-${sTab.id.toLowerCase()}`}
                      onClick={() => setSelectedAdminStatusFilter(sTab.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedAdminStatusFilter === sTab.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-550 hover:text-slate-800 hover:bg-slate-200/50'
                      }`}
                    >
                      <span>{sTab.label}</span>
                      {sTab.count > 0 ? (
                        <span className={`px-1.5 py-0.2 select-none font-extrabold text-[9px] rounded-full ${
                          selectedAdminStatusFilter === sTab.id
                            ? 'bg-indigo-800 text-indigo-100'
                            : 'bg-slate-200 text-slate-550'
                        }`}>
                          {sTab.count}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal">0</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-black uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-450 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-550"></span>
                  </span>
                  <span>Real-time listener active</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-550 uppercase tracking-wider bg-slate-50">
                      <th className="py-3 px-3">Core Profile</th>
                      <th className="py-3 px-3">Reddit username</th>
                      <th className="py-3 px-3">Reddit Karma / Badge</th>
                      <th className="py-3 px-3">Audit Link</th>
                      <th className="py-3 px-3">Current Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredUsersForAdmin.map(u => {
                      const isCooldownActive = u.cooldown_expires_at && new Date(u.cooldown_expires_at) > new Date();
                      const ut = getKarmaTier(u.karma);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/55 transition">
                          <td className="py-4 px-3 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-extrabold text-slate-900 text-sm">{u.fullName}</p>
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-extrabold text-[9px] uppercase tracking-wider select-none">
                                {ut.name}
                              </span>
                              {(u.role === 'admin') ? (
                                <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-extrabold text-[9px] uppercase tracking-wider select-none">
                                  Admin
                                </span>
                              ) : (u.role === 'moderator' || (u.role as string) === 'Moderator') ? (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-255 rounded font-extrabold text-[9px] uppercase tracking-wider select-none">
                                  Moderator
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200/80 rounded font-extrabold text-[9px] uppercase tracking-wider select-none">
                                  Member
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 font-mono font-bold text-[10px]">{u.email}</p>
                             <div className="flex items-center gap-1.5 text-[10px] font-bold mt-1">
                              {(u.emailVerified || u.gmailVerified || u.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com') ? (
                                <span className="text-emerald-650 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider select-none font-extrabold flex items-center gap-1">Email Verified</span>
                              ) : (
                                <span className="text-rose-650 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider select-none font-extrabold flex items-center gap-1">Email Unverified</span>
                              )}
                            </div>
                            {/* Display private gender field strictly to admin */}
                            <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Private Gender:</span>
                              <span className="text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">{u.gender || "Not specified"}</span>
                            </p>
                          </td>
                        <td className="py-4 px-3">
                          <span className="text-indigo-600 font-extrabold font-mono">{u.redditUsername}</span>
                        </td>
                        <td className="py-4 px-3">
                          {editingUsers[u.id] ? (
                            <div className="space-y-1.5 min-w-[130px] p-2 bg-slate-50 rounded-lg border border-slate-200 shadow-sm">
                              <div>
                                <label className="text-[9px] text-slate-500 font-bold block">KARMA</label>
                                <input 
                                  type="number"
                                  value={editingUsers[u.id].karma}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setEditingUsers(prev => ({
                                      ...prev,
                                      [u.id]: { ...prev[u.id], karma: val }
                                    }));
                                  }}
                                  className="bg-white text-[10px] text-slate-850 p-1.5 rounded border border-slate-200 w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-500 font-bold block">TIER</label>
                                <select
                                  value={editingUsers[u.id].tier}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditingUsers(prev => ({
                                      ...prev,
                                      [u.id]: { ...prev[u.id], tier: val }
                                    }));
                                  }}
                                  className="bg-white text-[10px] text-slate-850 p-1.5 rounded border border-slate-200 w-full focus:outline-none cursor-pointer font-sans"
                                >
                                  <option value="Bronze">Bronze</option>
                                  <option value="Silver">Silver</option>
                                  <option value="Gold">Gold</option>
                                  <option value="Platinum">Platinum</option>
                                </select>
                              </div>
                              <div className="flex gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveUserKarmaAndTier(u.id, editingUsers[u.id].karma, editingUsers[u.id].tier)}
                                  className="text-[9px] px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded flex-1 transition-all cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUsers(prev => {
                                      const copy = { ...prev };
                                      delete copy[u.id];
                                      return copy;
                                    });
                                  }}
                                  className="text-[9px] px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded transition-all cursor-pointer"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] space-y-0.5 min-w-[120px] select-text">
                              <div className="font-extrabold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                <span>{(u.karma || 0).toLocaleString()}</span>
                                <span className="text-[8px] bg-indigo-50 text-indigo-700 border border-indigo-150 px-1.5 py-0.2 rounded font-black uppercase tracking-wider">{u.karmaBadge || u.karmaTier || 'Bronze'}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUsers(prev => ({
                                      ...prev,
                                      [u.id]: { karma: u.karma || 0, tier: u.karmaBadge || u.karmaTier || 'Bronze' }
                                    }));
                                  }}
                                  className="text-[10px] text-indigo-650 hover:text-indigo-500 ml-1 cursor-pointer font-sans"
                                  title="Edit Karma and Tier manually"
                                >
                                  ✏️ Edit
                                </button>
                              </div>
                              {u.karmaYesterday !== undefined && (
                                <div className={`text-[9px] font-bold font-mono ${(u.karma || 0) - (u.karmaYesterday || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {(u.karma || 0) - (u.karmaYesterday || 0) >= 0 ? '▲ +' : '▼ '}
                                  {((u.karma || 0) - (u.karmaYesterday || 0)).toLocaleString()} yesterday
                                </div>
                              )}
                              {u.role !== 'admin' && (
                                <div className="flex gap-1.5 items-center pt-1.5 select-none pointer-events-auto">
                                  <button 
                                    type="button"
                                    onClick={() => handleSaveUserKarmaAndTier(u.id, (u.karma || 0) + 1000, getKarmaTier((u.karma || 0) + 1000).name)}
                                    className="text-[8px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-200 cursor-pointer"
                                    title="Add 1,000 Karma"
                                  >
                                    +1K
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => handleSaveUserKarmaAndTier(u.id, Math.max(0, (u.karma || 0) - 1000), getKarmaTier(Math.max(0, (u.karma || 0) - 1000)).name)}
                                    className="text-[8px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-200 cursor-pointer"
                                    title="Subtract 1,000 Karma"
                                  >
                                    -1K
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-3">
                          <a 
                            href={u.redditProfileLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-indigo-600 hover:underline font-bold inline-flex items-center gap-1"
                          >
                            Review Link <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                        <td className="py-4 px-3">
                          <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase border tracking-wider inline-block ${
                            u.status === 'Approved' ? 'bg-emerald-50 border-emerald-250 text-emerald-705' :
                            (u.status === 'Pending' || u.status === 'pending') ? 'bg-amber-50 border-amber-250 text-amber-700 animate-pulse' :
                            (u.status === 'Rejected' || u.status === 'rejected') ? 'bg-slate-100 border-slate-200 text-slate-500 font-semibold' :
                            (u.status === 'Suspended' || u.status === 'suspended' || u.isSuspended) ? 'bg-yellow-50 border-yellow-250 text-yellow-700 font-semibold' :
                            'bg-red-50 border-red-200 text-red-700' // Banned / banned
                          }`}>
                            {u.status === 'Approved' ? 'Approved' :
                             (u.status === 'Pending' || u.status === 'pending') ? 'Pending' :
                             (u.status === 'Rejected' || u.status === 'rejected') ? 'Rejected' :
                             (u.status === 'Suspended' || u.status === 'suspended' || u.isSuspended) ? 'Suspended' : 'Banned'}
                          </span>
                          {isCooldownActive && (
                            <span className="block mt-1 bg-amber-50 border border-amber-250 px-1.5 py-0.5 rounded text-[9px] font-black text-amber-700 font-mono w-max animate-pulse">
                              ON COOLDOWN
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-3 text-right space-y-1.5 min-w-[200px]">
                          {/* If on cooldown, allow administrator to instantly reset it */}
                          {isCooldownActive && u.role !== 'admin' && (
                            <div className="pb-1.5">
                              <button 
                                onClick={() => resetCooldown(u.id)}
                                className="w-full py-1.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                              >
                                Reset Claim Cooldown
                              </button>
                            </div>
                          )}

                          {u.status === 'Pending' && (
                          <div className="space-y-2">
                            <div className="flex gap-1.5 justify-end">
                              <button 
                                onClick={() => adminApproveUser(u.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold rounded-lg text-white cursor-pointer transition shadow-xs"
                              >
                                Approve User
                              </button>
                              <button 
                                onClick={() => {
                                  const reason = rejectReason[u.id] || 'Reddit profile failed minimum age/authenticity check';
                                  adminRejectUser(u.id, reason);
                                }}
                                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-[10px] font-bold rounded-lg text-slate-700 cursor-pointer transition"
                              >
                                Reject User
                              </button>
                            </div>
                            <input 
                              type="text"
                              value={rejectReason[u.id] || ''}
                              onChange={(e) => setRejectReason({ ...rejectReason, [u.id]: e.target.value })}
                              placeholder="Reason for rejection description..."
                              className="w-full text-[10px] bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-800 text-right focus:border-indigo-500 focus:outline-none placeholder-slate-400 font-medium"
                            />
                          </div>
                        )}
                        {u.status === 'Approved' && u.role !== 'admin' && (
                          <div className="flex gap-1.5 justify-end">
                            <button 
                              onClick={() => {
                                setSuspendTargetUser(u);
                                setSuspendReasonInput('');
                                setSuspendDuration('1 day');
                              }}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-705 text-[10px] font-bold rounded-lg cursor-pointer transition shadow-xs"
                            >
                              Suspend
                            </button>
                            <button 
                              onClick={() => {
                                setBanTargetUser(u);
                                setBanReasonInput('');
                              }}
                              className="px-2.5 py-1.5 bg-white border border-red-200 text-red-650 hover:bg-red-50 text-[10px] font-bold rounded-lg cursor-pointer transition shadow-xs"
                            >
                              Ban
                            </button>
                          </div>
                        )}
                        {(u.status === 'banned' || u.status === 'Banned' || u.isBanned) && u.role !== 'admin' && (
                          <div className="space-y-1.5 text-right">
                            <p className="text-[10px] text-slate-500 italic max-w-[180px] ml-auto font-medium">
                              Ban Reason: {u.banReason || 'None specified'}
                            </p>
                            <button 
                              onClick={() => adminUnbanUser(u.id)}
                              className="px-2.5 py-1.5 bg-white border border-slate-250 text-slate-700 hover:bg-slate-50 text-[10px] font-bold rounded-lg cursor-pointer inline-block transition shadow-xs"
                            >
                              Unban
                            </button>
                          </div>
                        )}
                        {(u.status === 'suspended' || u.status === 'Suspended' || u.isSuspended) && u.role !== 'admin' && (
                          <div className="space-y-1.5 text-right">
                            <p className="text-[10px] text-slate-500 italic max-w-[180px] ml-auto font-medium">
                              Suspension: {u.suspensionReason || u.banReason || 'None specified'} ({u.suspensionDuration || 'permanent'})
                            </p>
                            <button 
                              onClick={() => adminUnsuspendUser(u.id)}
                              className="px-2.5 py-1.5 bg-white border border-slate-250 text-slate-700 hover:bg-slate-50 text-[10px] font-bold rounded-lg cursor-pointer inline-block transition shadow-xs"
                            >
                              Unsuspend
                            </button>
                          </div>
                        )}
                        {(u.status === 'Rejected' || u.status === 'rejected') && (
                          <div className="space-y-1.5 text-right pb-1.5">
                            <p className="text-[10px] text-slate-500 italic max-w-[180px] ml-auto font-medium">
                              Reason: "{u.rejectionReason || 'identity check failed'}"
                            </p>
                            <button 
                              type="button"
                              onClick={() => adminApproveUser(u.id)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg cursor-pointer inline-block transition shadow-xs"
                            >
                              Restore & Approve User
                            </button>
                          </div>
                        )}

                        {u.role !== 'admin' && (
                          <div className="pt-2 flex gap-1.5 justify-end flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setDeductionHistoryUser(u);
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-205 text-slate-700 hover:text-slate-900 text-[10px] font-extrabold rounded-lg cursor-pointer transition-all uppercase tracking-wider inline-flex items-center gap-1 shadow-xs"
                            >
                              <FileText className="w-3 h-3 text-slate-550" /> History ({u.deductionHistory?.length || 0})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (currentUser?.role === 'moderator') {
                                  setShowPermissionRestrictedModal("Adjusting user balances or deducting credits is restricted to senior Platform Administrators.");
                                  return;
                                }
                                setDeductTargetUser(u);
                                setDeductAmountInput('');
                                setDeductReasonInput('');
                                setDeductTaskNameInput('');
                              }}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-extrabold text-[10px] rounded-lg cursor-pointer transition-all uppercase tracking-wider inline-flex items-center gap-1"
                            >
                              <Coins className="w-3 h-3 text-red-500" /> Deduct Balance
                            </button>
                          </div>
                        )}
                        {u.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com' ? (
                          <span className="text-[10px] text-emerald-700 font-extrabold uppercase bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 tracking-wider">Protected Owner Account</span>
                        ) : u.role === 'admin' ? (
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase bg-slate-100 px-2.5 py-1 rounded-md">Platform Admin Locked</span>
                        ) : null}
                        {(currentUser?.role === 'admin' || currentUser?.role === 'moderator') && u.role !== 'admin' && (
                          <div className="pt-2 border-t border-slate-200 flex gap-1.5 justify-end flex-wrap">
                            {u.role === 'moderator' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (currentUser?.role === 'moderator') {
                                    setShowPermissionRestrictedModal("Demoting moderators or changing user privileges is restricted to Platform Administrators.");
                                    return;
                                  }
                                  setDemoteTargetUser(u);
                                }}
                                className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[10.5px] font-black rounded-lg cursor-pointer transition-all uppercase tracking-wider shadow-sm"
                              >
                                Remove Moderator
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (currentUser?.role === 'moderator') {
                                    setShowPermissionRestrictedModal("Promoting users to moderator or changing privileges is restricted to Platform Administrators.");
                                    return;
                                  }
                                  setPromoteTargetUser(u);
                                }}
                                className="px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-600 text-white text-[10.5px] font-black rounded-lg cursor-pointer transition-all uppercase tracking-wider shadow-sm"
                              >
                                Promote to Moderator
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (currentUser?.role === 'moderator') {
                                  setShowPermissionRestrictedModal("Permanently deleting member profiles is restricted to senior Platform Administrators.");
                                  return;
                                  }
                                  setUserToDelete(u);
                              }}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-650 border border-red-200 text-red-600 hover:text-white text-[10.5px] font-black rounded-lg cursor-pointer transition-all uppercase tracking-wider inline-flex items-center gap-1 shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete Account
                            </button>
                          </div>
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

        {/* ================= LIVE WALLET BALANCES SECTION ================= */}
        {activeTab === 'live-wallet' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-black flex items-center gap-2 text-indigo-600">
                  <CreditCard className="w-5 h-5 text-indigo-600" /> Live Wallet Balances
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time auditing of current available user balances. No transactions or lifetime records are exposed here.
                </p>
              </div>

              {/* Action/Indicator card */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="bg-white px-4 py-2.5 border border-slate-200 rounded-2xl flex flex-col justify-center min-w-[160px] shadow-sm">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Total Network Holding</span>
                  <span className="text-sm font-black text-slate-900 font-mono">
                    ${(users || []).reduce((sum, u) => sum + (u.balance || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                  </span>
                </div>

                {currentUser?.role === 'admin' && (
                  <div className="bg-slate-50 px-4 py-2.5 border border-slate-200 rounded-2xl flex items-center justify-between gap-4 min-w-[280px]">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Mod Wallet Edit</span>
                      <span className="text-[10px] text-slate-405 font-medium font-sans">Allow moderators to edit balances</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        adminUpdateSettings({
                          ...settings,
                          allowModeratorsEditWallets: !settings?.allowModeratorsEditWallets
                        });
                        setToastMessage(settings?.allowModeratorsEditWallets ? "Disabled moderator wallet modifications" : "Enabled moderator wallet modifications");
                      }}
                      className={`p-1.5 px-3 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        settings?.allowModeratorsEditWallets
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-slate-200 text-slate-500 border-slate-350'
                      }`}
                    >
                      {settings?.allowModeratorsEditWallets ? 'Allowed' : 'Locked'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-4 rounded-2xl border border-slate-200 items-center shadow-sm">
              {/* Search input */}
              <div className="md:col-span-5 space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Search Members</label>
                <div className="relative">
                  <input
                    type="text"
                    value={walletSearchQuery}
                    onChange={(e) => setWalletSearchQuery(e.target.value)}
                    placeholder="Search by name, email, account ID..."
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  {walletSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setWalletSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Sort by selection */}
              <div className="md:col-span-3 space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Sort By</label>
                <select
                  value={walletSortBy}
                  onChange={(e: any) => setWalletSortBy(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="highest">Highest Balance</option>
                  <option value="lowest">Lowest Balance</option>
                  <option value="recently">Recently Updated</option>
                </select>
              </div>

              {/* Filtering selection */}
              <div className="md:col-span-4 space-y-1">
                <label className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block">Account status / Balance level</label>
                <select
                  value={walletFilterStatus}
                  onChange={(e: any) => setWalletFilterStatus(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">All Network Members</option>
                  <option value="active">Active Members Only</option>
                  <option value="suspended">Suspended/Banned Members</option>
                  <option value="zero font-sans">Zero Balance ($0.00)</option>
                  <option value="nonzero font-sans">Non-Zero Balance (&gt; $0.00)</option>
                </select>
              </div>
            </div>

            {/* Results Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[9px] tracking-widest uppercase text-slate-500 font-extrabold">
                    <th className="px-5 py-3">Member Name</th>
                    <th className="px-5 py-3">Email Address</th>
                    <th className="px-5 py-3">User ID</th>
                    <th className="px-5 py-3 text-right">Available Balance</th>
                    <th className="px-5 py-3 text-center">Last Wallet Update</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const filtered = (users || [])
                      .filter(u => {
                        const q = walletSearchQuery.toLowerCase().trim();
                        const matchSearch = !q || 
                          (u.fullName || '').toLowerCase().includes(q) ||
                          (u.email || '').toLowerCase().includes(q) ||
                          (u.id || '').toLowerCase().includes(q);

                        let matchFilter = true;
                        if (walletFilterStatus === 'active') {
                          matchFilter = !u.isSuspended && !u.isBanned;
                        } else if (walletFilterStatus === 'suspended') {
                          matchFilter = !!u.isSuspended || !!u.isBanned;
                        } else if (walletFilterStatus === 'zero') {
                          matchFilter = (u.balance || 0) === 0;
                        } else if (walletFilterStatus === 'nonzero') {
                          matchFilter = (u.balance || 0) > 0;
                        }
                        return matchSearch && matchFilter;
                      })
                      .sort((a, b) => {
                        if (walletSortBy === 'highest') {
                          return (b.balance || 0) - (a.balance || 0);
                        } else if (walletSortBy === 'lowest') {
                          return (a.balance || 0) - (b.balance || 0);
                        } else if (walletSortBy === 'recently') {
                          const dateA = a.lastWalletUpdate ? new Date(a.lastWalletUpdate).getTime() : 0;
                          const dateB = b.lastWalletUpdate ? new Date(b.lastWalletUpdate).getTime() : 0;
                          return dateB - dateA;
                        }
                        return 0;
                      });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-normal italic">
                            No member available available balances matching the selected criteria.
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map(u => {
                      const isOwner = u.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com';
                      const isSuspended = !!u.isSuspended;
                      const isBanned = !!u.isBanned;
                      let statusBadge = (
                        <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-black tracking-wide uppercase border bg-emerald-50 border-emerald-250 text-emerald-700">
                          Active
                        </span>
                      );
                      if (isBanned) {
                        statusBadge = (
                          <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-black tracking-wide uppercase border bg-red-50 border-red-200 text-red-600">
                            Banned
                          </span>
                        );
                      } else if (isSuspended) {
                        statusBadge = (
                          <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-black tracking-wide uppercase border bg-yellow-50 border-yellow-250 text-yellow-700">
                            Suspended
                          </span>
                        );
                      }

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-150 text-[9px] font-black uppercase text-indigo-700 flex items-center justify-center">
                                {(u.fullName || 'C')[0]}
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-800 block">{u.fullName || 'Anonymous Account'}</span>
                                <span className="text-[8px] text-slate-400 uppercase tracking-widest font-black">Member Node</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-600 max-w-[180px] truncate font-medium">{u.email}</td>
                          <td className="px-5 py-3 text-slate-400 font-mono text-[9px]">{u.id}</td>
                          <td className="px-5 py-3 text-right font-extrabold text-slate-800 text-xs font-mono">
                            ${(u.balance || 0).toFixed(2)} USDT
                          </td>
                          <td className="px-5 py-3 text-center text-slate-500 font-mono text-[9px]">
                            {u.lastWalletUpdate ? new Date(u.lastWalletUpdate).toLocaleString() : 'Never Updated'}
                          </td>
                          <td className="px-5 py-3 text-center">{statusBadge}</td>
                          <td className="px-5 py-3 text-center">
                            {isOwner ? (
                              <span className="text-[8px] font-black text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded border border-emerald-250">
                                Protected
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (currentUser?.role === 'moderator' && !settings?.allowModeratorsEditWallets) {
                                    setShowPermissionRestrictedModal("Adjusting user available balances requires senior Platform Administrator privileges or explicit permission enabling.");
                                    return;
                                  }
                                  setAdjustTargetUser(u);
                                  setAdjustAmountInput(String(u.balance || 0));
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-600 text-[9px] font-extrabold rounded-lg cursor-pointer transition shadow-xs uppercase tracking-wider flex items-center gap-1 mx-auto"
                              >
                                ✏️ Adjust Balance
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TASKS TAB ================= */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Create form col */}
            <div className="space-y-6 lg:border-r lg:border-slate-200 lg:pr-8">
              <h2 className="text-base font-black border-b border-slate-200 pb-3 flex items-center gap-2 text-indigo-600">
                <Plus className="w-5 h-5 text-indigo-650" /> Spawn New Reddit Task
              </h2>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Campaign Category Type</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button 
                      type="button" 
                      onClick={() => setTaskType('post')}
                      className={`py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        taskType === 'post' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      Reddit Post Task
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setTaskType('comment')}
                      className={`py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        taskType === 'comment' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      Reddit Comment Task
                    </button>
                  </div>
                </div>

                {/* Special Task Switch */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-black text-slate-800 block">Special Task Campaign</span>
                      <span className="text-[9px] text-slate-500 block">Restricted to high karma creators</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isSpecialTask}
                        onChange={(e) => setIsSpecialTask(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  {isSpecialTask && (
                    <div className="space-y-3 pt-1.5 border-t border-slate-200">
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Minimum Reddit Karma Required</label>
                        <input 
                          type="number" 
                          value={minKarmaRequired}
                          onChange={(e) => setMinKarmaRequired(Number(e.target.value))}
                          className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg focus:border-indigo-500 font-mono"
                          placeholder="e.g. 1000"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Special Badge Label</label>
                        <input 
                          type="text" 
                          value={specialLabel}
                          onChange={(e) => setSpecialLabel(e.target.value)}
                          className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg focus:border-indigo-500 font-bold"
                          placeholder="e.g. SPECIAL"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Task Visibility and Assignment Selection */}
                <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-150 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block mb-1.5">Task Visibility & Access</label>
                    <div className="flex bg-white p-1 rounded-lg border border-slate-205 text-xs gap-1 select-none">
                      <button
                        type="button"
                        onClick={() => setTaskVisibility('public')}
                        className={`flex-1 px-3 py-1.5 rounded transition font-bold ${
                          taskVisibility === 'public' ? 'bg-indigo-650 text-white font-black shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Public Task
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskVisibility('assigned')}
                        className={`flex-1 px-3 py-1.5 rounded transition font-bold ${
                          taskVisibility === 'assigned' ? 'bg-indigo-650 text-white font-black shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Private / Assigned
                      </button>
                    </div>
                  </div>

                  {taskVisibility === 'assigned' && (
                    <div className="space-y-3 pt-0.5 animate-fade-in text-xs">
                      {/* Exclusive Campaign Toggle */}
                      <div className="flex items-center justify-between bg-white px-3 py-2.5 rounded-xl border border-slate-200">
                        <div className="space-y-0.5 max-w-[85%]">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 block">Exclusive Assigned Task</label>
                          <p className="text-[9px] text-slate-450 font-medium leading-tight">If enabled, the first assigned member to CLAIM the task gains exclusive rights and blocks other invitees.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isExclusiveTask}
                          onChange={(e) => setIsExclusiveTask(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-slate-300 grid place-content-center bg-white rounded focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                        />
                      </div>

                      {/* Select/Search Assigned Members */}
                      <div className="relative">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Select Members (Fuzzy Search)</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Type username, email, or Reddit username..."
                            value={searchMemberQuery}
                            onChange={(e) => setSearchMemberQuery(e.target.value)}
                            onFocus={() => setMemberDropdownOpen(true)}
                            className="w-full text-xs text-slate-800 bg-white border border-slate-200 pl-8 pr-3 py-2 rounded-xl focus:border-indigo-550 focus:outline-none"
                          />
                        </div>

                        {/* Dropdown with filtered matches */}
                        {memberDropdownOpen && (
                          <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                            <div className="flex justify-between items-center bg-slate-50 p-1.5 px-3 text-[9px] text-slate-400 font-bold select-none">
                              <span>MATCHING USER BASE</span>
                              <button
                                type="button"
                                onClick={() => setMemberDropdownOpen(false)}
                                className="text-rose-500 hover:text-rose-700 font-extrabold cursor-pointer hover:underline border-none bg-transparent"
                              >
                                CLOSE ✕
                              </button>
                            </div>
                            {filteredCreatorsToInvite.length === 0 ? (
                              <div className="p-3 text-center text-slate-400 italic text-[11px] select-none">
                                {searchMemberQuery ? 'No matching users found' : 'Type to search members...'}
                              </div>
                            ) : (
                              filteredCreatorsToInvite.slice(0, 15).map(m => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    if (!assignedMembers.includes(m.id)) {
                                      setAssignedMembers(prev => [...prev, m.id]);
                                    }
                                    setSearchMemberQuery('');
                                    setMemberDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-xs transition border-0 outline-none cursor-pointer leading-tight bg-transparent"
                                >
                                  <div className="text-left">
                                    <span className="font-extrabold text-slate-800 block text-left leading-tight">{m.fullName || m.name || 'Anonymous User'}</span>
                                    <span className="text-[9px] text-indigo-650 font-mono block text-left">u/{m.redditUsername || 'None'} • {m.email}</span>
                                  </div>
                                  <span className="text-[10px] bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded text-indigo-700 font-black font-mono">➕ ADD</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Removable Tag Pills */}
                      {assignedMembers.length > 0 && (
                        <div className="space-y-1 pt-1 animate-fade-in">
                          <label className="text-[9px] font-black uppercase text-slate-405 tracking-wider">Assigned Members ({assignedMembers.length})</label>
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white border border-slate-205 rounded-xl">
                            {assignedMembers.map(uid => {
                              const m = users.find(u => u.id === uid);
                              return (
                                <span key={uid} className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-lg font-mono">
                                  <span>u/{m?.redditUsername || m?.email || uid}</span>
                                  <button
                                    type="button"
                                    onClick={() => setAssignedMembers(prev => prev.filter(id => id !== uid))}
                                    className="text-indigo-400 hover:text-indigo-800 cursor-pointer font-black border-0 bg-transparent text-[11px] ml-0.5 p-0"
                                  >
                                    ✕
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Task Title</label>
                  <input 
                    type="text" 
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g., Post scaling thread in r/cryptocurrency" 
                    className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-3 py-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Task Description/Markdown Requirements</label>
                  <textarea 
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    placeholder="Provide overview of the campaign purpose." 
                    className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-3 py-2.5 rounded-xl h-20 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Reward (USDT Base)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={taskReward}
                      onChange={(e) => setTaskReward(Number(e.target.value))}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-3 py-2 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Diff Level</label>
                    <select 
                      value={taskDifficulty}
                      onChange={(e: any) => setTaskDifficulty(e.target.value)}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-3 py-2 rounded-xl focus:border-indigo-500 focus:outline-none"
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
                      <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-650 block mb-1">Target Subreddit</label>
                      <input 
                        type="text" 
                        value={subreddit}
                        onChange={(e) => setSubreddit(e.target.value)}
                        placeholder="e.g., r/personalfinance" 
                        className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-3 py-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-650 block mb-1">Required Post Title</label>
                      <input 
                        type="text" 
                        value={requiredTitle}
                        onChange={(e) => setRequiredTitle(e.target.value)}
                        placeholder="Must match title exactly" 
                        className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-3 py-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-650 block mb-1">Guidelines/Required keywords</label>
                      <textarea 
                        value={postGuidelines}
                        onChange={(e) => setPostGuidelines(e.target.value)}
                        placeholder="e.g. Must write copy minimum 150 words. Do not refer to spam URLs." 
                        className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-3 py-2 rounded-xl h-16 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  /* Comment specific fields */
                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-650 block mb-1">Target Reddit Post URL to comment on</label>
                      <input 
                        type="text" 
                        value={commentPostUrl}
                        onChange={(e) => setCommentPostUrl(e.target.value)}
                        placeholder="https://reddit.com/r/.../best_thread" 
                        className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-3 py-2.5 rounded-xl focus:border-indigo-550 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-650 block mb-1">Comment Guidelines/Required keywords</label>
                      <textarea 
                        value={commentGuidelines}
                        onChange={(e) => setCommentGuidelines(e.target.value)}
                        placeholder="e.g. Must comment about 'high gas fees' or 'zero scalability benefits'. Minimum 2 sentences." 
                        className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-3 py-2 rounded-xl h-20 focus:border-indigo-550 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Max slots limit</label>
                    <input 
                      type="number" 
                      value={taskMaxSubmissions}
                      onChange={(e) => setTaskMaxSubmissions(Number(e.target.value))}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-3 py-2 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Deadline Date</label>
                    <input 
                      type="date" 
                      value={taskDeadline}
                      onChange={(e) => setTaskDeadline(e.target.value)}
                      className="w-full text-xs text-slate-800 bg-white border border-slate-200 px-3 py-2.5 rounded-xl focus:border-indigo-500 focus:outline-none select-none font-bold"
                    />
                  </div>
                </div>

                {/* Reddit Markdown Preview section */}
                <div className="border border-slate-200 bg-slate-50 rounded-xl p-3.5 space-y-2.5 shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700">Reddit Markdown Preview</span>
                    <span className="text-[9px] bg-indigo-50 border border-indigo-150 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase">Live Render</span>
                  </div>
                  
                  <div className="space-y-2 text-[11px] leading-relaxed">
                    {taskTitle && (
                      <div>
                        <span className="text-[8px] text-slate-450 font-extrabold uppercase block tracking-wider font-mono">Title Preview</span>
                        <div className="text-slate-850 font-extrabold">{renderRedditMarkdown(taskTitle)}</div>
                      </div>
                    )}
                    {taskDescription && (
                      <div className="border-t border-slate-150 pt-1.5">
                        <span className="text-[8px] text-slate-455 font-extrabold uppercase block tracking-wider font-mono">Description/Instructions Preview</span>
                        <div className="text-slate-705">{renderRedditMarkdown(taskDescription)}</div>
                      </div>
                    )}
                    {taskType === 'post' ? (
                      <>
                        {requiredTitle && (
                          <div className="border-t border-slate-150 pt-1.5">
                            <span className="text-[8px] text-slate-450 font-extrabold uppercase block tracking-wider font-mono">Required Title Preview</span>
                            <div className="text-slate-705">"{renderRedditMarkdown(requiredTitle)}"</div>
                          </div>
                        )}
                        {postGuidelines && (
                          <div className="border-t border-slate-150 pt-1.5">
                            <span className="text-[8px] text-slate-450 font-extrabold uppercase block tracking-wider font-mono">Guidelines Preview</span>
                            <div className="text-slate-705">{renderRedditMarkdown(postGuidelines)}</div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {commentGuidelines && (
                          <div className="border-t border-slate-150 pt-1.5">
                            <span className="text-[8px] text-slate-450 font-extrabold uppercase block tracking-wider font-mono">Comment Description/Guidelines Preview</span>
                            <div className="text-slate-705">{renderRedditMarkdown(commentGuidelines)}</div>
                          </div>
                        )}
                      </>
                    )}
                    {!taskTitle && !taskDescription && !requiredTitle && !postGuidelines && !commentGuidelines && (
                      <p className="text-slate-400 italic font-medium">No task content provided to render preview. Start typing to see results...</p>
                    )}
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-indigo-650 hover:bg-indigo-600 text-xs font-black text-white rounded-xl cursor-pointer shadow-sm shadow-indigo-100 transition uppercase tracking-wider"
                >
                  Confirm & Broadcast Campaign
                </button>
              </form>
            </div>

            {/* View current tasks list */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-base font-black border-b border-slate-200 pb-3 flex justify-between items-center text-slate-800">
                <span>Active Live Task Desk</span>
                <span className="text-xs text-slate-500 font-medium">Total active: {tasks.length} campaigns</span>
              </h2>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50">
                      <th className="py-3 px-3">Campaign Info</th>
                      <th className="py-3 px-1">Type</th>
                      <th className="py-3 px-1">Visibility</th>
                      <th className="py-3 px-1">Karma Required</th>
                      <th className="py-3 px-1">Claimed By</th>
                      <th className="py-3 px-1">Claim Time</th>
                      <th className="py-3 px-1">Deadline</th>
                      <th className="py-3 px-1">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-[11px]">
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 font-semibold select-text">
                          No active campaigns created yet. Deploy the first one!
                        </td>
                      </tr>
                    ) : (
                      tasks.map(t => {
                        const claimedUser = t.claimed_by ? users.find(u => u.id === t.claimed_by) : null;
                        const isSpecial = t.isSpecial;
                        const isClaimed = t.status === 'claimed';

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3.5 px-3 space-y-0.5">
                              <p className="font-extrabold text-slate-800 text-xs">{t.title}</p>
                              <div className="flex gap-2 text-[9px] font-bold text-slate-450 font-mono">
                                <span>Slots: {t.completedSubmissionsCount} / {t.maxSubmissions}</span>
                                <span className="text-indigo-650 font-black">${t.reward.toFixed(2)} USDT</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-1 col-span-1">
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest font-mono">
                                {t.type}
                              </span>
                            </td>
                            <td className="py-3.5 px-1">
                              {t.visibility === 'assigned' ? (
                                <div className="space-y-0.5">
                                  <span className="inline-block bg-rose-50 border border-rose-150 text-rose-700 text-[9px] font-black px-1 rounded uppercase tracking-wider">
                                    Private ({t.assignedMembers?.length || 0})
                                  </span>
                                  {t.isExclusive && (
                                    <span className="block text-[8px] text-indigo-700 font-extrabold font-sans uppercase">
                                      Exclusive
                                    </span>
                                  )}
                                  </div>
                              ) : (
                                <span className="inline-block bg-emerald-50 border border-emerald-150 text-emerald-700 text-[9px] font-bold px-1 rounded uppercase tracking-wider">
                                  Public
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-1 select-text">
                              {isSpecial ? (
                                <span className="text-amber-600 font-extrabold flex items-center gap-0.5 font-mono">
                                  <Sparkles className="w-3 h-3 text-amber-550 fill-amber-300" /> {t.minKarmaRequired?.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-semibold">None (Regular)</span>
                              )}
                            </td>
                            <td className="py-3 px-1 select-text">
                              {claimedUser ? (
                                <div>
                                  <p className="font-extrabold text-indigo-600 text-xs">{claimedUser.fullName}</p>
                                  <p className="text-[9px] text-slate-450 font-mono font-bold">u/{claimedUser.redditUsername}</p>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">None</span>
                              )}
                            </td>
                            <td className="py-3 px-1 font-mono text-[10px] text-slate-500 select-text">
                              {isClaimed && t.claimed_at ? (
                                <span>{new Date(t.claimed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-1 font-mono text-[10px] select-text">
                              {isClaimed && t.claim_expires_at ? (() => {
                                const expires = new Date(t.claim_expires_at).getTime();
                                const now = Date.now();
                                const diff = expires - now;
                                if (diff <= 0) {
                                  return <span className="text-red-500 font-extrabold text-[10px]">EXPIRED</span>;
                                }
                                const totalSecs = Math.floor(diff / 1000);
                                const m = Math.floor(totalSecs / 60);
                                const s = totalSecs % 60;
                                return (
                                  <div className="space-y-0.5">
                                    <p className="text-rose-600 font-black text-xs animate-pulse">
                                      {m}:{s < 10 ? '0' : ''}{s} mins
                                    </p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">
                                      Ends: {new Date(t.claim_expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                );
                              })() : (
                                <span className="text-slate-400 text-[10px]">{t.deadline.split(' ')[0]}</span>
                              )}
                            </td>
                            <td className="py-3 px-1 select-none">
                              {isClaimed ? (
                                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-705 border border-purple-200 font-bold text-[9px] uppercase tracking-wider animate-pulse">
                                  Claimed
                                </span>
                              ) : t.completedSubmissionsCount >= t.maxSubmissions ? (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-205 font-bold text-[9px] uppercase tracking-wider">
                                  Slots Full
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-705 border border-emerald-250 font-bold text-[9px] uppercase tracking-wider">
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
                                    className="px-2 py-1 bg-red-50 hover:bg-red-650 border border-red-200 text-red-600 hover:text-white text-[9px] font-black rounded cursor-pointer transition shadow-xs"
                                    title="Force Unclaim"
                                  >
                                    Force Unclaim 🔓
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (!currentUser) return;
                                      if (disabledExtensionTasks[t.id]) return;

                                      // Temporarily disable button for 2 seconds to prevent spam clicking
                                      setDisabledExtensionTasks(prev => ({ ...prev, [t.id]: true }));
                                      setTimeout(() => {
                                        setDisabledExtensionTasks(prev => ({ ...prev, [t.id]: false }));
                                      }, 2000);

                                      try {
                                        await extendUserDeadline(t.id, currentUser);
                                        setToastMessage("30 minutes added successfully");
                                      } catch (err) {
                                        console.error(err);
                                        alert("Failed to extend task deadline");
                                      }
                                    }}
                                    disabled={disabledExtensionTasks[t.id]}
                                    className={`px-2 py-1 border text-[9px] font-black rounded transition cursor-pointer ${
                                      disabledExtensionTasks[t.id]
                                        ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                        : "bg-indigo-50 hover:bg-indigo-650 border-indigo-200 text-indigo-700 hover:text-white"
                                    }`}
                                    title="Extend 30 Minutes"
                                  >
                                    {disabledExtensionTasks[t.id] ? "Wait..." : "+30m ⏰"}
                                  </button>
                                </div>
                              )}
                              
                              <div className="flex justify-end pt-1 gap-1.5">
                                <button
                                  onClick={() => handleStartEditTask(t)}
                                  className="p-1 px-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-650 hover:text-white rounded cursor-pointer transition shadow-xs flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider"
                                  title="Edit Campaign visibility / invitees"
                                >
                                  <Edit className="w-3 h-3" /> Edit Assigned
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm('Are you sure you want to permanently delete this campaign?')) {
                                      adminDeleteTask(t.id);
                                    }
                                  }}
                                  className="p-1.5 px-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-650 hover:text-white rounded cursor-pointer transition shadow-xs"
                                  title="Delete campaign"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <h2 className="text-base font-black text-slate-800">Reddit Proof Submissions Desk</h2>
              <span className="text-xs text-slate-500 font-semibold bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">Under review queue: {pendingSubmissionsCount}</span>
            </div>

            <div className="space-y-6">
              {submissions.filter(s => !s.archived && !s.deleted).length === 0 ? (
                <div className="text-center py-10 text-slate-450 text-xs text-balance bg-white rounded-2xl border border-slate-200">
                  Awesome! There are no submissions awaiting administrative checks in your queue.
                </div>
              ) : (
                submissions.filter(s => !s.archived && !s.deleted).map((sub) => {
                  const subUser = users.find(u => u.id === sub.userId);
                  const subUserTier = subUser ? getKarmaTier(subUser.karma) : null;
                  return (
                    <div 
                      key={sub.id} 
                      className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between gap-6 transition ${
                        (sub.status === 'Pending' || sub.status === 'Under Admin Review') 
                          ? 'bg-amber-50/30 border-amber-200' 
                          : sub.status === 'Admin Approved (Waiting for Client Approval)'
                          ? 'bg-indigo-50/20 border-indigo-200'
                          : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      {/* Submission Details */}
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-indigo-650 uppercase tracking-wider">{sub.taskType} Audit</span>
                          <span className="text-sm font-extrabold text-slate-850">{sub.taskTitle}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            sub.status === 'Client Approved (Payment Released)' || sub.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            (sub.status === 'Pending' || sub.status === 'Under Admin Review') ? 'bg-amber-50 text-amber-705 border border-amber-200 animate-pulse' :
                            sub.status === 'Admin Approved (Waiting for Client Approval)' ? 'bg-indigo-50 text-indigo-705 border border-indigo-200 font-bold' :
                            'bg-rose-50 text-rose-705 border border-rose-200'
                          }`}>
                            {sub.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs font-semibold">
                          <div>
                            <span className="text-[10px] text-slate-450 font-bold block uppercase tracking-wider">Creator Account</span>
                            <span className="text-slate-800 font-extrabold block flex items-center gap-1.5 flex-wrap">
                              <span>{sub.userFullName}</span>
                              {subUserTier && (
                                <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-600 border border-indigo-150 rounded text-[9px] font-extrabold uppercase">
                                  {subUserTier.emoji} {subUserTier.name}
                                </span>
                              )}
                            </span>
                            <span className="text-indigo-600 font-bold tracking-wide text-[11px] block select-text">u/{sub.redditUsername}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-450 font-bold block uppercase tracking-wider">Earning payout</span>
                            <span className="text-indigo-650 font-mono font-black text-sm block">${sub.reward.toFixed(2)} USDT</span>
                            <span className="text-[9px] text-slate-450 block">Submitted {new Date(sub.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Proof display (handles link / screenshots gracefully) */}
                        <div className="pt-1">
                          {((sub.proofUrl || '').toLowerCase().includes('reddit.com') || (sub.submissionLink || '').toLowerCase().includes('reddit.com')) ? (
                            <div className="p-3 bg-white border border-slate-200 rounded-xl">
                              <span className="text-[10px] text-slate-450 font-bold block uppercase tracking-wider mb-1">Submitted Reddit Proof Link</span>
                              <a 
                                href={sub.submissionLink || sub.proofUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-indigo-600 hover:text-indigo-500 font-black inline-flex items-center gap-1 mt-0.5 break-all max-w-md font-mono text-xs cursor-pointer"
                              >
                                Browse Reddit Proof Link <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <span className="text-[10px] text-slate-400 block truncate max-w-xs mt-1 select-text">{sub.submissionLink || sub.proofUrl}</span>
                            </div>
                          ) : (
                            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3">
                              {sub.submissionLink && (
                                <div className="text-xs">
                                  <span className="text-slate-450 block font-bold uppercase tracking-wider text-[10px]">Comment permalink url</span>
                                  <a 
                                    href={sub.submissionLink} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-indigo-600 hover:text-indigo-500 font-black inline-flex items-center gap-1 mt-0.5 break-all max-w-md cursor-pointer"
                                  >
                                    Browse Reddit Comment Link <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              )}
                              <div>
                                <span className="text-[10px] text-slate-450 font-bold block uppercase tracking-wider mb-1.5">Submitted Screenshot Proof</span>
                                <a href={sub.proofUrl} target="_blank" rel="noreferrer" className="inline-block relative group cursor-pointer">
                                  <img 
                                    src={sub.proofUrl} 
                                    alt="Proof Screenshot" 
                                    className="w-48 h-32 object-cover rounded-xl border border-slate-200 hover:border-indigo-500 transition-colors"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-transparent group-hover:bg-slate-900/10 rounded-xl transition-all flex items-center justify-center">
                                    <span className="text-[10px] bg-slate-900/90 px-2 py-1 rounded text-white hidden group-hover:inline-block font-extrabold shadow-sm">Open Screenshot</span>
                                  </div>
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Review Action area */}
                      <div className="md:w-64 flex flex-col justify-between items-stretch md:border-l md:border-slate-200 md:pl-6 shrink-0 space-y-4 md:space-y-0">
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 font-mono">Audit Action Panel</span>
                          
                          {(sub.status === 'Pending' || sub.status === 'Under Admin Review') ? (
                            <div className="space-y-2.5">
                              <button 
                                onClick={() => adminReviewSubmission(sub.id, 'Approved', submissionFeedback[sub.id])}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-550 text-xs font-black text-white rounded-xl shadow-xs cursor-pointer transition uppercase tracking-wider text-center"
                              >
                                Pass Admin pre-review
                              </button>
                              <button 
                                onClick={() => adminReviewSubmission(sub.id, 'Rejected', submissionFeedback[sub.id] || 'Guidelines not met')}
                                className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-extrabold text-slate-700 rounded-xl cursor-pointer transition uppercase tracking-wider text-center"
                              >
                                Admin Reject Proof
                              </button>

                              <input 
                                type="text"
                                value={submissionFeedback[sub.id] || ''}
                                onChange={(e) => setSubmissionFeedback({ ...submissionFeedback, [sub.id]: e.target.value })}
                                placeholder="Feedback / Rejection Reason description..."
                                className="w-full text-[10px] bg-white border border-slate-200 px-2.5 py-2 rounded-lg text-slate-800 placeholder-slate-400 block outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          ) : sub.status === 'Admin Approved (Waiting for Client Approval)' ? (
                            <div className="space-y-2.5">
                              <span className="text-[10px] text-indigo-600 block font-bold mb-1">Pre-review Passed! Awaiting Client final action.</span>
                              <button 
                                onClick={() => adminFinalReleasePayment(sub.id, 'Approve', submissionFeedback[sub.id])}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-555 text-xs font-black text-white rounded-xl shadow-xs cursor-pointer transition uppercase tracking-wider text-center"
                              >
                                Force Approve & Pay
                              </button>
                              <button 
                                onClick={() => adminFinalReleasePayment(sub.id, 'Reject', submissionFeedback[sub.id] || 'Rejected')}
                                className="w-full py-2 bg-red-600 hover:bg-red-550 text-xs font-black text-white rounded-xl shadow-xs cursor-pointer transition uppercase tracking-wider text-center"
                              >
                                Force Reject
                              </button>

                              <input 
                                type="text"
                                value={submissionFeedback[sub.id] || ''}
                                onChange={(e) => setSubmissionFeedback({ ...submissionFeedback, [sub.id]: e.target.value })}
                                placeholder="Override Note / Feedback..."
                                className="w-full text-[10px] bg-white border border-slate-200 px-2.5 py-2 rounded-lg text-slate-800 placeholder-slate-400 block outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50 rounded-xl text-[11px] font-semibold text-slate-550 border border-slate-200">
                              <span className="text-slate-500 block font-bold mb-0.5">Audit complete</span>
                              Reviewed status: <strong className="text-indigo-600 uppercase tracking-widest text-[10px] block mt-1">{sub.status}</strong>
                              {sub.feedback && <span className="block mt-1.5 text-[10px] italic">Feedback: "{sub.feedback}"</span>}
                              {(sub.status === 'Approved' || sub.status === 'Client Approved (Payment Released)') && (
                                <button
                                  onClick={() => handleArchiveSubmission(sub)}
                                  className="mt-2.5 w-full py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase rounded-lg transition cursor-pointer"
                                >
                                  Archive Record
                                </button>
                              )}
                            </div>
                          )}
                          <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
                            <button
                              type="button"
                              onClick={() => setSubmissionToDelete(sub)}
                              className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-350 text-rose-700 text-[10px] font-extrabold uppercase rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                            >
                              🗑 Delete Submission
                            </button>
                          </div>
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
          currentUser?.role !== 'admin' ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-rose-205 max-w-2xl mx-auto space-y-4 my-8 font-sans shadow-xs">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto text-red-650">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Shield Guard: Restricted Access</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed font-semibold">
                Earning payouts, creator cashout ledgers, direct wallet transfers, and financial transaction sheets require senior Administrator clearance.
              </p>
              <div className="pt-2 text-[10px] text-slate-450 font-mono font-bold uppercase tracking-wider">
                Role Context: Moderator Level II Desk
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                <h2 className="text-base font-black text-slate-805">Earning Withdrawal Desk</h2>
                <span className="text-xs text-indigo-705 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold">Cashouts queue: {pendingWithdrawalsCount} pending</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-2">Influencer Core</th>
                      <th className="py-3.5 px-2">Method Type</th>
                      <th className="py-3.5 px-2">Recipient Address / BinPay ID</th>
                      <th className="py-3.5 px-2">Amount Requested</th>
                      <th className="py-3.5 px-2">Status</th>
                      <th className="py-3.5 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {withdrawals.filter(w => !w.archived).map(w => {
                      const wUser = users.find(u => u.id === w.userId);
                      const t = wUser ? getKarmaTier(wUser.karma) : null;
                      return (
                        <tr key={w.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-2 space-y-0.5">
                            <p className="font-extrabold text-slate-800 text-sm flex items-center gap-1">
                              {w.userFullName}
                              {t && <span className="text-xs animate-bounce" title={`${t.name} Tier`}>{t.emoji}</span>}
                            </p>
                            <p className="text-slate-400 font-mono font-bold text-[10px]">{w.email}</p>
                          </td>
                          <td className="py-4 px-2 leading-none">
                            <span className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-650 font-bold font-mono">
                              {w.withdrawalMethod === 'USDT_BEP20' ? 'USDT BEP20' : 'Binance Pay ID'}
                            </span>
                          </td>
                          <td className="py-4 px-2">
                            <span className="font-mono text-slate-550 font-bold text-wrap select-text break-all tracking-wide">{w.paymentAddress}</span>
                          </td>
                          <td className="py-4 px-2">
                            <span className="font-mono font-black text-indigo-650 text-sm">${w.amount.toFixed(2)} USDT</span>
                          </td>
                          <td className="py-4 px-2 select-none">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              w.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              w.status === 'Pending' ? 'bg-amber-50 text-amber-705 border border-amber-200 animate-pulse' : 'bg-rose-50 text-rose-705 border border-rose-200'
                            }`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="py-4 px-2 text-right">
                            {w.status === 'Pending' ? (
                              <div className="flex gap-1.5 justify-end">
                                <button 
                                  onClick={() => adminReviewWithdrawal(w.id, 'Approved')}
                                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-550 text-[10px] font-black rounded-lg text-white shadow-xs cursor-pointer transition uppercase tracking-wider"
                                >
                                  Approve & Cashout
                                </button>
                                <button 
                                  onClick={() => adminReviewWithdrawal(w.id, 'Rejected')}
                                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-[10px] font-bold text-slate-700 rounded-lg shadow-xs cursor-pointer transition uppercase"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-1.5 justify-end">
                                <span className="text-[10px] text-slate-400 italic font-bold">Processed</span>
                                {w.status === 'Approved' && (
                                  <button
                                    onClick={() => handleArchiveWithdrawal(w)}
                                    className="px-2 py-1 bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded text-[10px] uppercase font-bold cursor-pointer transition shadow-xs"
                                  >
                                    Archive Record
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )})}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* ================= 📊 TRACK DATA TAB ================= */}
        {activeTab === 'track-data' && (
          <div className="space-y-8 py-4 text-slate-800">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-650 block mb-1">Telemetry Overview</span>
              <h2 className="text-xl font-black text-slate-900">Platform Health & Telemetry Metrics</h2>
              <p className="text-xs text-slate-500 mt-1">Monitor real-time system ledger balances, verification queues, and withdrawal statuses.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Total Users</span>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-black text-yellow-600 font-mono">{users.length}</span>
                  <Users className="w-6 h-6 text-yellow-600" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Active Tasks</span>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-black text-purple-600 font-mono">{tasks.length}</span>
                  <CheckSquare className="w-6 h-6 text-purple-600" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Completed Tasks</span>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-black text-rose-600 font-mono">{submissions.filter(s => s.status === 'Approved').length}</span>
                  <CheckCircle className="w-6 h-6 text-rose-600" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Total Paid Out</span>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-black text-emerald-600 font-mono">${totalPayoutAmt.toFixed(2)}</span>
                  <Wallet className="w-6 h-6 text-emerald-600" />
                </div>
              </div>

            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setLastRefreshedTrigger(prev => prev + 1);
                }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-xs font-black text-white rounded-xl shadow-md cursor-pointer transition-colors active:scale-95"
              >
                Refresh Now
              </button>
              
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  Last updated: <span className="font-bold text-slate-800">{secondsSinceRefresh === 0 || secondsSinceRefresh < 10 ? 'just now' : `${secondsSinceRefresh} seconds ago`}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= 🛡️ ANTI-CHEAT SECURITY CENTER ================= */}
        {activeTab === 'security' && (() => {
          const isRealIpTrackingActive = (users || []).some(u => 
            u.ipHistory && u.ipHistory.some(history => 
              history.ip && 
              history.ip !== '185.190.140.23' && 
              history.ip !== currentSimulatedIP && 
              history.ip !== '127.0.0.1' && 
              !history.isSimulated
            )
          );

          return (
            <div className="space-y-8 font-semibold text-slate-800">
              {/* Header and Simulator margin panel config */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-600">
                    <ShieldAlert className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Platform Anti-Cheat & Security Desk</h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5 font-normal">Enforce real-time multi-account controls, device fingerprints, and automated Reddit post audit checks.</p>
                  </div>
                </div>

                {/* Fraud score policy explanation legend */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 pt-2">
                  {[
                    { title: 'Verified (Clean)', range: '0 - 20', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', action: 'Standard accounts' },
                    { title: 'Watchlist', range: '21 - 40', color: 'bg-amber-500/10 text-amber-700 border-amber-500/25', action: 'Flagged, telemetry log' },
                    { title: 'High Risk', range: '41 - 60', color: 'bg-orange-500/10 text-orange-700 border-orange-500/25', action: 'Manual submission checks' },
                    { title: 'Flagged for Review', range: '61 - 80', color: 'bg-red-500/10 text-red-650 border-red-500/25', action: 'Manual Review Required' },
                    { title: 'Banned (Permanent)', range: '81 - 100', color: 'bg-slate-100 border-slate-300 text-slate-705', action: 'Locked from login/earnings' },
                  ].map(sec => (
                    <div key={sec.title} className={`p-3 rounded-2xl border ${sec.color} space-y-1 text-center`}>
                      <span className="text-[10px] font-black block tracking-wider uppercase">{sec.title}</span>
                      <span className="text-sm font-extrabold font-mono block">{sec.range}</span>
                      <span className="text-[8px] font-normal leading-tight block text-slate-500">{sec.action}</span>
                    </div>
                  ))}
                </div>
              </div>

            {/* Core alert feed list and Blacklist */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Alert Feed Col (Takes 2 segments) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">🚨 Fraud Alerts Detection Stream</h3>
                    {!isRealIpTrackingActive && (
                      <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[8px] font-black tracking-wider text-amber-600 uppercase">
                        ⚠️ IP tracking not configured
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => {
                      if (currentUser?.role === 'moderator') {
                        setShowPermissionRestrictedModal("Executing platform security audits and duplicate accounts mapping is restricted to senior Platform Administrators.");
                        return;
                      }
                      scanForDuplicates();
                      alert('Security re-scan completed. All user IP nodes, fingerprints and GMail dot addresses audited!');
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] rounded-lg transition-colors border border-slate-300 cursor-pointer text-slate-700"
                  >
                    Force Re-Scan Duplicate Maps
                  </button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {(fraudAlerts || []).length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic font-normal bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                      No fraud alerts or suspicious activities intercepted yet. Platform is fully verified.
                    </div>
                  ) : (
                    (fraudAlerts || []).map(alertItem => (
                      <div key={alertItem.id} className={`p-4 rounded-2xl border space-y-3.5 transition-all ${
                        alertItem.status === 'resolved' ? 'bg-slate-100/50 border-slate-200 opacity-60' :
                        alertItem.status === 'dismissed' ? 'bg-slate-100/30 border-slate-200 line-through opacity-45' :
                        'bg-red-500/[0.03] border-red-500/15'
                      }`}>
                        
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                           <div className="space-y-0.5">
                             <div className="flex items-center gap-2">
                               <span className="px-2 py-0.5 bg-red-650/15 rounded text-[9px] font-black tracking-wide text-red-500 uppercase">{alertItem.type}</span>
                               <span className="text-[10px] text-slate-500 font-semibold">{new Date(alertItem.timestamp).toLocaleTimeString()} · {new Date(alertItem.timestamp).toLocaleDateString()}</span>
                             </div>
                             <h4 className="text-sm font-extrabold text-slate-900">{alertItem.userName} ({alertItem.userEmail})</h4>
                           </div>

                           <div className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                             <span className="text-slate-500 font-bold uppercase text-[9px]">SUSPICION INDEX:</span>
                             <span className={`font-black ${
                               alertItem.fraudScore >= 80 ? 'text-red-600 font-black' :
                               alertItem.fraudScore >= 60 ? 'text-orange-600 font-bold' :
                               'text-amber-600 font-bold'
                             }`}>{alertItem.fraudScore}/100</span>
                           </div>
                         </div>

                        <p className="text-xs font-normal text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 select-text font-medium">{alertItem.details}</p>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-500 block font-normal">
                            Recommended Action: <strong className="text-purple-650 font-bold">
                              {alertItem.recommendedAction
                                ?.replace(/Auto[- ]?Ban/gi, 'Manual Review Required')
                                ?.replace(/Auto[- ]?Suspend(ed)?/gi, 'Flagged for Review')
                                ?.replace(/Ban Accounts/gi, 'Manual Review Required')
                                ?.replace(/Freeze Accounts/gi, 'Manual Review Required')}
                            </strong>
                          </span>

                          {alertItem.status === 'pending' && (
                            <div className="flex flex-wrap gap-1.5 shrink-0 select-none">
                              <button 
                                onClick={() => {
                                  adminReviewFraudAction(alertItem.id, 'dismiss');
                                  alert(isMod ? 'Alert marked as reviewed.' : 'Alert dismissed. Suspicion score reduced slightly.');
                                }}
                                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-[10px] text-slate-650 rounded border border-slate-300 cursor-pointer"
                              >
                                {isMod ? 'Mark as Reviewed' : 'Dismiss'}
                              </button>
                              <button 
                                onClick={() => {
                                  adminReviewFraudAction(alertItem.id, 'warn');
                                  alert('Warning sent to user inbox.');
                                }}
                                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-700 text-[10px] rounded cursor-pointer"
                              >
                                Send Warning
                              </button>
                              {!isMod && (
                                <>
                                  <button 
                                    onClick={() => {
                                      adminReviewFraudAction(alertItem.id, 'suspend');
                                      alert('User suspended manually.');
                                    }}
                                    className="px-2 py-1 bg-red-600 hover:bg-red-550 text-[10px] text-white rounded cursor-pointer font-bold shadow-xs"
                                  >
                                    Suspend Account
                                  </button>
                                  <button 
                                    onClick={() => {
                                      adminReviewFraudAction(alertItem.id, 'ban');
                                      alert('User banned manually.');
                                    }}
                                    className="px-2 py-1 bg-red-50 border border-red-200 hover:bg-red-100 text-[10px] text-red-650 rounded cursor-pointer font-black"
                                  >
                                    Permanent Ban ⛔
                                  </button>
                                  <button 
                                    onClick={() => {
                                      adminReviewFraudAction(alertItem.id, 'freeze');
                                      alert('Earnings frozen manually.');
                                    }}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 border border-slate-350 rounded cursor-pointer font-bold"
                                  >
                                    Freeze Profits ❄️
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {alertItem.status === 'resolved' && (
                            <span className="text-[10px] text-slate-500 italic font-semibold">Processed Action Applied</span>
                          )}
                          {alertItem.status === 'dismissed' && (
                            <span className="text-[10px] text-slate-500 italic font-semibold">
                              {isMod ? 'Reviewed' : 'Dismissed'}
                            </span>
                          )}
                        </div>

                      </div>
                    ))
                  )}
                </div>

                {/* Duplicates Groups Master List Rendering */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">🔗 Duplicate Identity Registry Groupings</h3>
                    {!isRealIpTrackingActive && (
                      <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[8px] font-black tracking-wider text-amber-600 uppercase">
                        ⚠️ IP tracking not configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5 font-normal">Below are accounts linked by physical IP nodes, shared browser fingerprints, or email aliasing tricks.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(duplicateGroups || []).length === 0 ? (
                      <div className="col-span-2 p-6 text-center text-slate-500 italic font-normal bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                        No duplicate account match groupings registered yet.
                      </div>
                    ) : (
                      (duplicateGroups || []).map(group => {
                        const linkedUsers = users.filter(u => group.accounts.includes(u.id));
                        return (
                          <div key={group.id} className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3.5 text-xs text-slate-600 font-normal shadow-xs">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                              <div>
                                <span className="text-[9px] font-black uppercase text-purple-650 block tracking-wider">Matched Identifier ({group.type})</span>
                                <span className="text-xs font-bold text-slate-900 font-mono select-all break-all">{group.sharedIdentifier}</span>
                              </div>
                              <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded font-bold text-[9px] text-red-600">
                                {group.accounts.length} Accounts
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {linkedUsers.map(lu => (
                                <div key={lu.id} className="flex justify-between items-center text-xs p-1.5 rounded bg-slate-50 border border-slate-100">
                                  <div>
                                    <span className="font-extrabold text-slate-900 block">{lu.fullName}</span>
                                    <span className="text-[9px] text-slate-500 block">Reddit: {lu.redditUsername} · Score: {lu.fraudScore || 0}</span>
                                  </div>
                                  <span className={`px-1.5 py-0.5 text-[8px] rounded font-black ${
                                    lu.isBanned || lu.status === 'Banned' ? 'bg-slate-200 text-slate-500' :
                                    lu.isSuspended ? 'bg-red-500/15 text-red-600' :
                                    'bg-emerald-500/10 text-emerald-600'
                                  }`}>
                                    {lu.isBanned || lu.status === 'Banned' ? 'Banned' : lu.isSuspended ? 'Suspended' : 'Clean'}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="pt-2 border-t border-slate-200 overflow-hidden flex flex-col gap-2 select-none">
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5 font-normal">Primary Target Profile:</label>
                              <div className="flex items-center gap-2">
                                <select 
                                  id={`merge-select-${group.id}`} 
                                  className="text-[10px] bg-white text-slate-900 border border-slate-350 rounded px-2 py-1.5 hover:border-purple-500 focus:outline-none flex-grow"
                                >
                                  {linkedUsers.map(lu => (
                                    <option key={lu.id} value={lu.id}>{lu.redditUsername}</option>
                                  ))}
                                </select>
                                <button 
                                  onClick={() => {
                                    if (currentUser?.role === 'moderator') {
                                      setShowPermissionRestrictedModal("Consolidating database accounts or merging duplicate profiles is restricted to senior Administrators.");
                                      return;
                                    }
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
                                  Merge Profiles
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
                <h3 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-slate-700" /> IP Blacklist Directory
                </h3>
                
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200 space-y-4 text-xs font-normal shadow-xs">
                  <div className="space-y-2 select-none">
                    <label className="text-[10px] font-black tracking-widest uppercase text-slate-550 block">Ban IP Address Node</label>
                    <div className="relative flex gap-1.5">
                      <input 
                        type="text" 
                        id="new-blacklist-ip"
                        placeholder="e.g. 203.0.113.195"
                        className="text-xs text-slate-900 bg-white border border-slate-350 rounded-xl px-3 py-2 font-mono flex-grow focus:outline-none focus:border-red-500"
                      />
                      <button 
                        onClick={() => {
                          if (currentUser?.role === 'moderator') {
                            setShowPermissionRestrictedModal("Banning network IP nodes or blacklisting subnets is restricted to Platform Administrators.");
                            return;
                          }
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

                  <div className="space-y-2 pr-1.5 max-h-[300px] overflow-y-auto pt-2 border-t border-slate-200">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Blacklisted IP Address Nodes:</span>
                    {(blacklistedIPs || []).length === 0 ? (
                      <span className="text-[10px] italic text-slate-500 font-semibold block font-normal">No IP addresses blacklisted.</span>
                    ) : (
                      (blacklistedIPs || []).map(ip => (
                        <div key={ip} className="flex justify-between items-center p-2 bg-slate-50 hover:bg-slate-105 border border-slate-200 rounded text-[11px] font-mono">
                          <span className="text-slate-800 font-bold">{ip}</span>
                          <button 
                            onClick={() => {
                              if (currentUser?.role === 'moderator') {
                                setShowPermissionRestrictedModal("Lifting IP blocks or unbanning subnets is restricted to Platform Administrators.");
                                return;
                              }
                              unblacklistIP(ip);
                              alert(`IP ${ip} is unblocked.`);
                            }}
                            className="text-[10px] text-red-600 hover:text-red-550 cursor-pointer font-bold"
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

            {/* PLATFORM ADMIN TESTING MODE (SIMULATOR TOOLS) */}
            {currentUser?.role === 'admin' && (
              <div className="mt-8 pt-8 border-t border-slate-250 space-y-4">
                <div className="bg-purple-50/45 p-6 rounded-2xl border border-purple-200/60 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-md text-[9px] font-black text-purple-650">
                          ⚙️ Testing Mode (Simulator Tools)
                        </span>
                        <span className="px-2.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-[9px] font-black text-yellow-700 uppercase tracking-wider">
                          Simulation Mode - Not Real User Data
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900">Administrative Network Simulation Engine</h3>
                      <p className="text-xs text-slate-500 font-normal mt-0.5">
                        Simulate alternative incoming network endpoints to perform compliance test paths. Simulated values do not affect real production metrics or user risk scores, ban status, suspension, fraud alerts, or duplicate groups.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-550 block mb-1">Simulated IP Address</label>
                      <input 
                        type="text" 
                        value={currentSimulatedIP}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setCurrentSimulatedIP(val);
                        }}
                        className="w-full text-xs font-mono text-slate-900 bg-white border border-slate-350 rounded-xl px-3 py-2.5 focus:outline-none"
                        placeholder="e.g. 192.168.1.50"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-wide text-slate-550 block mb-1">Simulated Country Origin</label>
                      <select
                        value={currentSimulatedCountry}
                        onChange={(e) => setCurrentSimulatedCountry(e.target.value)}
                        className="w-full text-xs text-slate-900 bg-white border border-slate-350 rounded-xl px-3 py-2.5 font-bold"
                      >
                        <option value="United States">🇺🇸 United States</option>
                        <option value="India">🇮🇳 India</option>
                        <option value="Germany">🇩🇪 Germany</option>
                        <option value="Brazil">🇧🇷 Brazil</option>
                        <option value="Russia">🇷🇺 Russia</option>
                        <option value="Japan">🇯🇵 Japan</option>
                        <option value="Australia">🇦🇺 Australia</option>
                        <option value="UK">🇬🇧 UK</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
         );
       })()}

        {/* ================= ANNOUNCEMENTS TAB ================= */}
        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 font-semibold text-slate-800">
            
            <div className="space-y-6">
              <h2 className="text-base font-black border-b border-slate-200 pb-3 text-slate-900">Trigger Global Platform-wide Alert</h2>
              
              {annSuccessMsg && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Announcement published to all creator feeds!
                </div>
              )}

              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Alert Title</label>
                  <input 
                    type="text" 
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="📢 1.25x Payout weekend is active!" 
                    className="w-full text-xs text-slate-800 bg-white border border-slate-350 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Message Description</label>
                  <textarea 
                    value={annMessage}
                    onChange={(e) => setAnnMessage(e.target.value)}
                    placeholder="Admins have increased comment base rewards by 25%. Submit high quality posts!" 
                    className="w-full text-xs text-slate-800 bg-white border border-slate-350 px-3 py-2.5 rounded-xl h-24 focus:outline-none focus:ring-1 focus:ring-purple-500"
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

            <div className="space-y-6 md:border-l md:border-slate-200 md:pl-10">
              <h2 className="text-base font-black border-b border-slate-200 pb-3 text-slate-900">Active Announcement Rules</h2>
              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-4 text-xs text-slate-600 leading-relaxed font-normal">
                <p>🚩 Platform alerts appear directly in the notifications panel of every signed-in influencer instantly.</p>
                <p>🚩 Direct referral commissions, streak bonus boosts, or system-wide maintenance notices should be posted here.</p>
                <p>🚩 Limit title lengths to under 50 characters to prevent overflow on mobile. Keep descriptions informative & action-oriented.</p>
              </div>
            </div>

          </div>
        )}

        {/* ================= ROLE AUDIT LOG PANEL ================= */}
        {activeTab === 'audit-log' && (
          <div className="space-y-6 text-slate-800 font-semibold">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
              <div className="space-y-1">
                <h2 className="text-base font-black text-slate-900">Role Promotion & Demotion Audit Logs</h2>
                <p className="text-xs text-slate-500 font-semibold uppercase">
                  Historical tracking of all moderator actions and role changes
                </p>
              </div>
            </div>

            <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-xs">
              {(!auditLogs || auditLogs.length === 0) ? (
                <div className="text-center py-12 text-slate-500 space-y-2 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                  <p className="font-bold text-sm text-slate-700">📜 No role audits logged yet</p>
                  <p className="text-xs text-slate-500">Promotions and demotions will be securely recorded here in real-time.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                        <th className="py-3 px-3">Operator</th>
                        <th className="py-3 px-3">Action / Event</th>
                        <th className="py-3 px-3">Target User</th>
                        <th className="py-3 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-mono text-slate-705">
                      {[...auditLogs]
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map(log => {
                          const targetUser = users.find(u => u.id === log.targetUserId);
                          return (
                            <tr key={log.id} className="hover:bg-slate-50/50">
                              <td className="py-3 px-3">
                                <span className="font-bold text-slate-900">{log.operatorName}</span>
                                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-red-50 text-red-600 font-sans uppercase font-bold border border-red-100">
                                  {log.operatorRole}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] tracking-wide uppercase ${
                                  log.action?.includes('Promote') 
                                    ? 'bg-purple-500/10 text-purple-700 border border-purple-500/20' 
                                    : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                                }`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                {targetUser ? (
                                  <span className="text-purple-700 font-sans font-bold">
                                    {targetUser.fullName} (@{targetUser.redditUsername})
                                  </span>
                                ) : (
                                  <span className="text-slate-500">ID: {log.targetUserId}</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-slate-500 font-semibold font-sans">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= 🗄️ DELETED HISTORY SYSTEM ================= */}
        {activeTab === 'deleted-history' && (
          <div className="space-y-6 text-slate-800 font-semibold">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-black flex items-center gap-2 text-purple-650">
                  <Archive className="w-5 h-5 animate-pulse" /> Deleted History Registry
                </h2>
                <p className="text-slate-500 text-[11px] mt-1 font-normal">
                  View and manage archived financial records. Archiving completed transactions hides them from active queues while strictly preserving audit trails, user ledger sheets, and platform accounting integrity.
                </p>
              </div>

              {/* Subtabs selection */}
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 select-none">
                <button
                  type="button"
                  onClick={() => setActiveDeletedHistoryTab('approved_tasks')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeDeletedHistoryTab === 'approved_tasks'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Archived Approved Tasks ({archivedTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDeletedHistoryTab('withdrawals')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeDeletedHistoryTab === 'withdrawals'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Archived Withdrawals ({archivedWithdrawals.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDeletedHistoryTab('deleted_submissions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeDeletedHistoryTab === 'deleted_submissions'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Deleted Submissions ({submissions.filter(s => s.deleted).length})
                </button>
              </div>
            </div>

            {/* TAB CONTENT: Archived Approved Tasks */}
            {activeDeletedHistoryTab === 'approved_tasks' && (
              <div className="space-y-4">
                {archivedTasks.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500 text-xs">
                    No archived approved task submissions found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {archivedTasks.map((item) => {
                      const data = item.originalData;
                      if (!data) return null;
                      return (
                        <div key={item.id} className="p-4 bg-white border border-slate-205 rounded-2xl space-y-4 relative hover:shadow-xs transition">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <span className="text-[9px] px-2 py-0.5 bg-purple-500/10 text-purple-700 border border-purple-500/20 rounded font-bold uppercase tracking-wider">
                                {data.taskType || 'Task'} submission
                              </span>
                              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mt-1">{data.taskTitle}</h3>
                              <p className="text-[10px] text-slate-500 font-mono">ID: {item.id}</p>
                            </div>
                            <span className="text-right text-xs font-extrabold text-emerald-600 font-mono">
                              +${data.reward ? data.reward.toFixed(2) : '0.00'} USDT
                            </span>
                          </div>

                          {/* Record info */}
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[10px]">
                            <div>
                              <span className="text-slate-500 block font-normal">Creator Member</span>
                              <span className="font-extrabold text-slate-800">{data.userFullName || 'Unknown'}</span>
                              <span className="text-purple-650 block font-mono">@{data.redditUsername}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-normal">Submitted At</span>
                              <span className="font-extrabold text-slate-800 leading-none">
                                {data.submittedAt ? new Date(data.submittedAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            {data.targetSubreddit && (
                              <div>
                                <span className="text-slate-500 block font-normal">Subreddit</span>
                                <span className="font-extrabold text-indigo-650">r/{data.targetSubreddit}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-500 block font-normal">Proof URL/Permalink</span>
                              {data.proofUrl && (
                                <a
                                  href={data.proofUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-purple-600 font-bold hover:underline flex items-center gap-0.5 break-all line-clamp-1"
                                >
                                  Open Proof <ExternalLink className="w-2.5 h-2.5 inline" />
                                </a>
                              )}
                              {data.submissionLink && (
                                <a
                                  href={data.submissionLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5 break-all line-clamp-1 mt-0.5"
                                >
                                  Permalink <ExternalLink className="w-2.5 h-2.5 inline" />
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Archive/Audit trails metadata */}
                          <div className="border-t border-slate-150 pt-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-[10px] select-none">
                            <div className="space-y-0.5 text-slate-500 font-normal">
                              <p>Archived By: <strong className="text-slate-700 font-bold">{item.archivedBy}</strong></p>
                              <p>Archived At: <span className="font-mono text-slate-500 font-semibold">{item.archivedAt ? new Date(item.archivedAt).toLocaleString() : 'N/A'}</span></p>
                            </div>
                            
                            <div className="flex gap-2 w-full md:w-auto justify-end">
                              <button
                                type="button"
                                onClick={() => handleRestoreSubmission(item)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-350 text-purple-700 hover:text-purple-900 rounded-lg text-[10px] font-black cursor-pointer transition"
                              >
                                Restore Record
                              </button>
                              {(currentUser?.role === 'admin' || currentUser?.email === 'kalloldeyprivate20@gmail.com') && (
                                <button
                                  type="button"
                                  onClick={() => handlePermanentDeleteSubmission(item)}
                                  className="px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-605 rounded-lg text-[10px] font-black cursor-pointer transition"
                                >
                                  Permanent Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Archived Withdrawals */}
            {activeDeletedHistoryTab === 'withdrawals' && (
              <div className="space-y-4">
                {archivedWithdrawals.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500 text-xs">
                    No archived withdrawal cashouts found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {archivedWithdrawals.map((item) => {
                      const data = item.originalData;
                      if (!data) return null;
                      return (
                        <div key={item.id} className="p-4 bg-white border border-slate-205 rounded-2xl space-y-4 relative hover:shadow-xs transition">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <span className="text-[9px] px-2 py-0.5 bg-slate-100 border border-slate-200 text-purple-700 rounded font-bold uppercase tracking-wider font-mono">
                                {data.withdrawalMethod === 'USDT_BEP20' ? 'USDT BEP20 (BSC)' : 'Binance Pay ID'}
                              </span>
                              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mt-1">{data.userFullName || 'Unknown'}</h3>
                              <p className="text-[10px] text-slate-500 font-mono">ID: {item.id}</p>
                            </div>
                            <span className="text-right text-xs font-extrabold text-purple-650 font-mono">
                              ${data.amount ? data.amount.toFixed(2) : '0.00'} USDT
                            </span>
                          </div>

                          {/* Record info */}
                          <div className="grid grid-cols-2 gap-y-2 gap-x-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[10px]">
                            <div>
                              <span className="text-slate-500 block font-normal">Recipient Address</span>
                              <span className="font-extrabold text-slate-900 select-all break-all tracking-wide font-mono">{data.paymentAddress}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-normal">Requested At</span>
                              <span className="font-extrabold text-slate-900 leading-none font-mono">
                                {data.requestedAt ? new Date(data.requestedAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-normal">User Email</span>
                              <span className="text-slate-650 font-mono leading-none font-semibold">{data.email}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-normal">Completed Status</span>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-extrabold uppercase text-[9px] font-sans">
                                Approved & Paid
                              </span>
                            </div>
                          </div>

                          {/* Archive/Audit trails metadata */}
                          <div className="border-t border-slate-150 pt-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 text-[10px] select-none">
                            <div className="space-y-0.5 text-slate-500 font-normal">
                              <p>Archived By: <strong className="text-slate-700 font-bold">{item.archivedBy}</strong></p>
                              <p>Archived At: <span className="font-mono text-slate-500 font-semibold">{item.archivedAt ? new Date(item.archivedAt).toLocaleString() : 'N/A'}</span></p>
                            </div>
                            
                            <div className="flex gap-2 w-full md:w-auto justify-end">
                              <button
                                type="button"
                                onClick={() => handleRestoreWithdrawal(item)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-255 border border-slate-350 text-purple-700 hover:text-purple-900 rounded-lg text-[10px] font-black cursor-pointer transition"
                              >
                                Restore Record
                              </button>
                              {(currentUser?.role === 'admin' || currentUser?.email === 'kalloldeyprivate20@gmail.com') && (
                                <button
                                  type="button"
                                  onClick={() => handlePermanentDeleteWithdrawal(item)}
                                  className="px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-650 rounded-lg text-[10px] font-black cursor-pointer transition"
                                >
                                  Permanent Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Deleted Submissions */}
            {activeDeletedHistoryTab === 'deleted_submissions' && (
              <div className="space-y-4">
                {submissions.filter(s => s.deleted).length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500 text-xs font-normal">
                    No deleted task submissions found in the cleanup history.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {submissions.filter(s => s.deleted).map((item) => {
                      const deletedByAdmin = users.find(u => u.id === item.deletedBy);
                      return (
                        <div key={item.id} className="p-4 bg-white border border-slate-205 rounded-xl space-y-4 relative hover:shadow-xs transition font-sans">
                          <div className="flex justify-between items-start font-sans">
                            <div className="space-y-1 font-sans">
                              <span className="text-[9px] px-2 py-0.5 bg-red-100 text-red-750 border border-red-200 rounded font-bold uppercase tracking-wider font-mono">
                                Deleted {item.taskType || 'Task'} Submission
                              </span>
                              <h3 className="text-sm font-extrabold text-slate-905 tracking-tight mt-1">{item.taskTitle}</h3>
                              <p className="text-[10px] text-slate-500 font-mono">ID: {item.id} | Task ID: {item.taskId}</p>
                            </div>
                            <span className="text-right text-xs font-extrabold text-rose-600 font-mono">
                              ${item.reward ? item.reward.toFixed(2) : '0.00'} USDT
                            </span>
                          </div>

                          {/* Record info */}
                          <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[10px] font-semibold font-sans">
                            <div>
                              <span className="text-slate-550 block font-normal text-[9px]">Creator Profile</span>
                              <span className="font-extrabold text-slate-805 block truncate max-w-[150px]">{item.userFullName || 'Unknown'}</span>
                              <span className="text-purple-650 block font-mono text-[9px]">u/{item.redditUsername}</span>
                            </div>
                            <div>
                              <span className="text-slate-550 block font-normal text-[9px]">Submission Status</span>
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-sans font-extrabold uppercase mt-0.5 ${
                                item.status.includes('Approved') ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                                item.status.includes('Pending') || item.status.includes('review') ? 'bg-amber-50 text-amber-700 border border-amber-150' :
                                'bg-rose-50 text-rose-700 border border-rose-150'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-550 block font-normal text-[9px]">Deleted By</span>
                              <span className="font-extrabold text-rose-700 block truncate max-w-[150px]">
                                {deletedByAdmin ? `${deletedByAdmin.fullName}` : 'Administrator'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-550 block font-normal text-[9px]">Date Deleted</span>
                              <span className="font-extrabold text-slate-805 font-mono text-[9px] block">
                                {formatDeletedDate(item.deletedAt)}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="border-t border-slate-150 pt-3 flex items-center justify-end gap-2 text-[10px] select-none font-sans">
                            <button
                              type="button"
                              onClick={() => handleRestoreDeletedSubmission(item)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-205 border border-slate-350 text-purple-700 hover:text-purple-900 rounded-lg text-[10px] font-black cursor-pointer transition"
                            >
                              Restore Submission
                            </button>
                            {(currentUser?.role === 'admin' || currentUser?.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com') && (
                              <button
                                type="button"
                                onClick={() => handlePermanentDeleteDeletedSubmission(item)}
                                className="px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-655 rounded-lg text-[10px] font-black cursor-pointer transition"
                              >
                                Permanent Delete
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= DELETED TASKS REGISTER ================= */}
        {activeTab === 'deleted-tasks' && (
          <div className="space-y-6 text-slate-800 font-semibold">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
              <div className="space-y-1">
                <h2 className="text-base font-black flex items-center gap-2 text-red-650">
                  <Trash2 className="w-5 h-5 text-red-650 animate-pulse" /> Permanently Deleted Campaigns Registry
                </h2>
                <p className="text-xs text-slate-500 font-semibold uppercase">
                  Historical permanent deletion logs and administrative audit trail
                </p>
              </div>

              {deletedTasks.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (currentUser?.role === 'moderator') {
                      setShowPermissionRestrictedModal("Clearing platform historical logs is an owner-only action restricted to Platform Administrators.");
                      return;
                    }
                    handleClearDeletedHistory();
                  }}
                  className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-black rounded-lg cursor-pointer transition uppercase"
                >
                  Clear History
                </button>
              )}
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 select-none">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Filter by Client Name
                </label>
                <input
                  type="text"
                  value={deletedFilterClient}
                  onChange={(e) => setDeletedFilterClient(e.target.value)}
                  placeholder="e.g., Brand Client Co..."
                  className="w-full text-xs text-slate-900 bg-white border border-slate-350 px-3 py-2.5 rounded-xl focus:ring-1 focus:ring-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Filter by Deletion Date
                </label>
                <input
                  type="date"
                  value={deletedFilterDate}
                  onChange={(e) => setDeletedFilterDate(e.target.value)}
                  className="w-full text-xs text-slate-900 bg-white border border-slate-350 px-3 py-2.5 rounded-xl focus:ring-1 focus:ring-red-500 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Results Table */}
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
              {deletedTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                  <Trash2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-sm text-slate-700">No permanently deleted tasks recorded</p>
                  <p className="text-xs text-slate-500">Any campaign that is permanently deleted from the Removed tab will show up in this register.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50/50">
                        <th className="py-4 px-3">Task / ID</th>
                        <th className="py-4 px-3">Client Name</th>
                        <th className="py-4 px-3">Type</th>
                        <th className="py-4 px-3 text-right font-normal">Agency Pay</th>
                        <th className="py-4 px-3 text-right font-normal">Member Pay</th>
                        <th className="py-4 px-3">Deleted Date</th>
                        <th className="py-4 px-3">Deleted By</th>
                        <th className="py-4 px-3">Reason / Log Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-705">
                      {deletedTasks
                        .filter(item => {
                          if (deletedFilterClient) {
                            const cn = (item.clientName || '').toLowerCase();
                            if (!cn.includes(deletedFilterClient.toLowerCase())) return false;
                          }
                          if (deletedFilterDate) {
                            const dPart = (item.deletedAt || '').substring(0, 10);
                            if (dPart !== deletedFilterDate) return false;
                          }
                          return true;
                        })
                        .map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-4 px-3 select-text max-w-xs">
                              <div className="font-extrabold text-slate-900 text-sm truncate" title={item.title}>{item.title}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-1">ID: {item.id}</div>
                            </td>
                            <td className="py-4 px-3">
                              <span className="text-slate-750 font-bold bg-slate-50 border border-slate-250 px-1.5 py-0.5 rounded">
                                {item.clientName || 'N/A'}
                              </span>
                            </td>
                            <td className="py-4 px-3">
                              <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-205 text-[10px] rounded text-slate-600 font-extrabold uppercase tracking-wider font-mono">
                                {item.type}
                              </span>
                            </td>
                            <td className="py-4 px-3 text-right font-mono font-bold text-slate-805">
                              ${Number(item.agencyPay || 0).toFixed(2)}
                            </td>
                            <td className="py-4 px-3 text-right font-mono font-bold text-emerald-600">
                              ${Number(item.memberPay || 0).toFixed(2)}
                            </td>
                            <td className="py-4 px-3 text-slate-500 font-semibold font-mono">
                              {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'N/A'}
                              <span className="text-slate-400 block text-[9px] mt-0.5 select-none font-sans">
                                {item.deletedAt ? new Date(item.deletedAt).toLocaleTimeString() : ''}
                              </span>
                            </td>
                            <td className="py-4 px-3 text-slate-700 font-bold font-sans">
                              {item.deletedBy || 'Admin'}
                            </td>
                            <td className="py-4 px-3 text-left max-w-xs break-words text-slate-500 font-semibold italic">
                              "{item.reason || 'No reason specified'}"
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Ban Confirmation Modal Overlay */}
      {banTargetUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in">
          <div className="bg-white border border-slate-205 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div>
              <h3 className="text-lg font-black text-slate-800">🚫 Ban User?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Are you absolutely sure you want to ban <span className="text-red-655 font-extrabold">{banTargetUser.redditUsername || banTargetUser.fullName}</span>? They will be signed out instantly and permanently blocked from logging in or claiming tasks.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block font-mono">
                Reason for Ban (Required)
              </label>
              <input
                type="text"
                placeholder="e.g., Submitting duplicate spam links, multi-accounting..."
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-805 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-semibold"
              />
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setBanTargetUser(null);
                  setBanReasonInput('');
                }}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-205 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black cursor-pointer transition shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!banReasonInput.trim()}
                onClick={async () => {
                  if (!banReasonInput.trim()) return;
                  await adminBanUser(banTargetUser.id, banReasonInput.trim());
                  setBanTargetUser(null);
                  setBanReasonInput('');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white cursor-pointer transition-all shadow-xs ${
                  banReasonInput.trim() 
                    ? 'bg-red-650 hover:bg-red-600' 
                    : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal Overlay */}
      {suspendTargetUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div>
              <h3 className="text-lg font-black text-slate-800">⚠️ Suspend User?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Are you absolutely sure you want to suspend <span className="text-amber-650 font-extrabold">{suspendTargetUser.redditUsername || suspendTargetUser.fullName}</span>? They will be force-signed out immediately and blocked from accessing protected actions.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-405 block font-mono">
                Suspension Duration
              </label>
              <select
                value={suspendDuration}
                onChange={(e) => setSuspendDuration(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded-xl cursor-pointer font-bold focus:outline-none focus:border-indigo-550 focus:ring-1 focus:ring-indigo-550"
              >
                <option value="1 day">1 Day</option>
                <option value="3 days">3 Days</option>
                <option value="7 days">7 Days</option>
                <option value="30 days">30 Days</option>
                <option value="permanent">Permanent</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-405 block font-mono">
                Reason for Suspension (Required)
              </label>
              <input
                type="text"
                placeholder="e.g., Failed to submit correct proof links twice..."
                value={suspendReasonInput}
                onChange={(e) => setSuspendReasonInput(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-semibold"
              />
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setSuspendTargetUser(null);
                  setSuspendReasonInput('');
                }}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black cursor-pointer transition shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!suspendReasonInput.trim()}
                onClick={async () => {
                  if (!suspendReasonInput.trim()) return;
                  await adminSuspendUser(suspendTargetUser.id, suspendReasonInput.trim(), suspendDuration);
                  setSuspendTargetUser(null);
                  setSuspendReasonInput('');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white cursor-pointer transition-all shadow-xs ${
                  suspendReasonInput.trim() 
                    ? 'bg-amber-600 hover:bg-amber-550' 
                    : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Confirm Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promote to Moderator Confirmation Modal Overlay */}
      {promoteTargetUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div>
              <h3 className="text-lg font-black text-slate-800">🔰 Promote User to Moderator?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Are you sure you want to promote <span className="text-indigo-650 font-extrabold">{promoteTargetUser.fullName} (@{promoteTargetUser.redditUsername})</span>? They will gain access to the Moderator Control Panel with permissions to review/moderate tasks, submissions and members.
              </p>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => setPromoteTargetUser(null)}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black cursor-pointer transition shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!currentUser) return;
                  await adminPromoteToModerator(promoteTargetUser.id, currentUser);
                  setPromoteTargetUser(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 rounded-xl text-xs font-black text-white cursor-pointer transition shadow-xs"
              >
                Confirm Promotion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demote Moderator Confirmation Modal Overlay */}
      {demoteTargetUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div>
              <h3 className="text-lg font-black text-slate-800">Remove Moderator Privileges?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Are you sure you want to demote <span className="text-amber-605 font-extrabold">{demoteTargetUser.fullName}</span>? They will lose all Moderator Control Panel access and be reverted to a standard member.
              </p>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDemoteTargetUser(null)}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black cursor-pointer transition shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!currentUser) return;
                  await adminRemoveModerator(demoteTargetUser.id, currentUser);
                  setDemoteTargetUser(null);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-550 rounded-xl text-xs font-black text-white cursor-pointer transition shadow-xs"
              >
                Confirm Demotion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deduction History Modal Overlay */}
      {deductionHistoryUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  📋 Wallet Deduction History
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Viewing full list of balance deductions for <span className="text-red-600 font-extrabold">{deductionHistoryUser.fullName} (u/{deductionHistoryUser.redditUsername})</span>. Total deductions recorded: <span className="text-slate-800 font-bold">{deductionHistoryUser.deductionHistory?.length || 0}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeductionHistoryUser(null)}
                className="text-slate-500 hover:text-slate-705 text-xs font-bold bg-slate-100 border border-slate-200 hover:bg-slate-150 px-3 py-1.5 rounded-lg cursor-pointer transition uppercase"
              >
                Close
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <div className="max-h-[350px] overflow-y-auto select-text font-sans">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/80 uppercase font-black text-slate-500 tracking-wider text-[9px] select-none">
                      <th className="p-3">Date</th>
                      <th className="p-3">Associated Task</th>
                      <th className="p-3 text-right pr-6 md:text-left">Amount</th>
                      <th className="p-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {!deductionHistoryUser.deductionHistory || deductionHistoryUser.deductionHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 italic select-none">
                          No wallet deductions exist for this user.
                        </td>
                      </tr>
                    ) : (
                      deductionHistoryUser.deductionHistory.map((history) => (
                        <tr key={history.id} className="hover:bg-slate-100/50 transition">
                          <td className="p-3 font-medium whitespace-nowrap text-slate-500">
                            {new Date(history.date).toLocaleDateString()} {new Date(history.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3 font-semibold text-slate-800">
                            {history.taskName || 'Manual deduction'}
                          </td>
                          <td className="p-3 font-bold text-red-650 whitespace-nowrap text-right pr-6 md:text-left">
                            -${parseFloat(history.amount as any).toFixed(2)} USDT
                          </td>
                          <td className="p-3 leading-relaxed max-w-[200px] break-words text-slate-500 font-normal">
                            {history.reason}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeductionHistoryUser(null)}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black cursor-pointer transition shadow-xs"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deduct Balance Modal Overlay */}
      {deductTargetUser && (() => {
        const amt = parseFloat(deductAmountInput);
        const isExceeding = !isNaN(amt) && amt > (deductTargetUser.balance || 0);
        const isNegativeOrZero = !isNaN(amt) && amt <= 0 && deductAmountInput !== '';
        const isInputError = isExceeding || isNegativeOrZero;
        const canSubmit = deductReasonInput.trim() && deductAmountInput && !isNaN(amt) && amt > 0 && !isExceeding;

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  💸 Deduct Wallet Balance
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You are about to deduct funds from <span className="text-red-600 font-extrabold">{deductTargetUser.fullName} (u/{deductTargetUser.redditUsername})</span>. Their current balance is <span className="text-emerald-700 font-bold">${(deductTargetUser.balance || 0).toFixed(2)} USDT</span>.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">
                    Amount to Deduct (USDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g., 5.00"
                    value={deductAmountInput}
                    onChange={(e) => setDeductAmountInput(e.target.value)}
                    className={`w-full bg-white border text-slate-800 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-semibold ${
                      isInputError ? 'border-red-550' : 'border-slate-200'
                    }`}
                  />
                  {isNegativeOrZero && (
                    <p className="text-[10px] text-red-650 font-black tracking-wide animate-pulse mt-1.5 uppercase">
                      ⚠️ Deduct amount must be greater than zero USDT
                    </p>
                  )}
                  {isExceeding && (
                    <p className="text-[10px] text-red-656 font-black tracking-wide animate-pulse mt-1.5 uppercase">
                      ⚠️ Outstanding balance is insufficient (User has ${(deductTargetUser.balance || 0).toFixed(2)} USDT)
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">
                    Reason for Deduction (Required)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Incomplete post body in Reddit submission..."
                    value={deductReasonInput}
                    onChange={(e) => setDeductReasonInput(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-505 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">
                    Associated Task Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Crypto Promo Reddit Post"
                    value={deductTaskNameInput}
                    onChange={(e) => setDeductTaskNameInput(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-semibold"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeductTargetUser(null);
                    setDeductAmountInput('');
                    setDeductReasonInput('');
                    setDeductTaskNameInput('');
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-55 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black cursor-pointer transition shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={async () => {
                    if (isExceeding) {
                      alert("Deduction amount exceeds user's current balance.");
                      return;
                    }
                    if (isNaN(amt) || amt <= 0) {
                      alert("Please enter a valid deduction amount.");
                      return;
                    }
                    if (!deductReasonInput.trim()) {
                      alert("Deduction reason is required.");
                      return;
                    }

                    try {
                      const taskNameVal = deductTaskNameInput.trim() || "Manual deduction";
                      await adminDeductMember(
                        deductTargetUser.id,
                        "manual-ded-task", // taskId
                        taskNameVal,
                        amt,
                        deductReasonInput.trim()
                      );
                      setToastMessage(`Successfully deducted $${amt.toFixed(2)} USDT from user.`);
                      setDeductTargetUser(null);
                      setDeductAmountInput('');
                      setDeductReasonInput('');
                      setDeductTaskNameInput('');
                    } catch (err: any) {
                      console.error("Error deducting balance", err);
                      alert(`Failed to deduct balance: ${err.message || err}`);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black text-white cursor-pointer transition shadow-xs ${
                    canSubmit
                      ? 'bg-red-600 hover:bg-red-550'
                      : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Confirm Deduction
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Adjust Wallet Balance Modal Overlay */}
      {adjustTargetUser && (() => {
        const amt = parseFloat(adjustAmountInput);
        const isNegative = !isNaN(amt) && amt < 0;
        const isInputError = isNegative || adjustAmountInput === '';
        const canSubmit = adjustAmountInput.trim() !== '' && !isNaN(amt) && amt >= 0;

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-600" /> Adjust Available Balance
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You are manually setting a brand-new Available Balance for <span className="text-indigo-650 font-extrabold">{adjustTargetUser.fullName}</span>. Their current available balance is <span className="text-emerald-700 font-bold">${(adjustTargetUser.balance || 0).toFixed(2)} USDT</span>.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-mono">
                    New Wallet Balance (USDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 25.50"
                    value={adjustAmountInput}
                    onChange={(e) => setAdjustAmountInput(e.target.value)}
                    className={`w-full bg-white border text-slate-850 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-indigo-505 focus:ring-1 focus:ring-indigo-500 font-semibold font-mono ${
                      isInputError ? 'border-red-550' : 'border-slate-205'
                    }`}
                  />
                  {isNegative && (
                    <p className="text-[10px] text-red-650 font-black tracking-wide animate-pulse mt-1.5 uppercase">
                      ⚠️ Balance cannot be negative
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustTargetUser(null);
                    setAdjustAmountInput('');
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black cursor-pointer transition shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={async () => {
                    if (isNaN(amt) || amt < 0) {
                      alert("Please enter a valid balance.");
                      return;
                    }

                    try {
                      await adminAdjustUserBalance(adjustTargetUser.id, amt);
                      setToastMessage(`Successfully set balance to $${amt.toFixed(2)} USDT for user.`);
                      setAdjustTargetUser(null);
                      setAdjustAmountInput('');
                    } catch (err: any) {
                      console.error("Error adjusting balance", err);
                      alert(`Failed to adjust balance: ${err.message || err}`);
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-black text-white cursor-pointer transition shadow-xs ${
                    canSubmit
                      ? 'bg-indigo-600 hover:bg-indigo-550'
                      : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Save New Balance
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Member/User Account Permanent Deletion Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in">
          <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl relative">
            <div className="flex items-center gap-3 text-red-600">
              <Trash2 className="w-6 h-6 animate-pulse" />
              <h3 className="text-lg font-black tracking-tight text-slate-800">Confirm Permanent Deletion</h3>
            </div>
            
            <p className="text-xs text-slate-650 leading-relaxed font-semibold">
              This action will permanently delete this account and associated data. This cannot be undone.
            </p>

            <div className="bg-red-50 border border-red-100 p-3.5 rounded-xl font-sans">
              <p className="text-[10px] text-red-650 font-extrabold uppercase tracking-wider mb-1">Target Creator Profile:</p>
              <p className="text-xs text-slate-805 font-extrabold">{userToDelete.fullName || userToDelete.redditUsername || 'Creator'}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{userToDelete.email}</p>
              <ul className="text-[9px] text-slate-500 list-disc pl-4 space-y-1 mt-2.5">
                <li>Remove credentials from Auth directory</li>
                <li>Clear creator profile, wallets & payout history</li>
                <li>Erase task histories, referrals & notifications</li>
                <li>Archive backup index records for security logs</li>
              </ul>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                disabled={isDeletingInProgress}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black cursor-pointer transition shadow-xs disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingInProgress}
                onClick={async () => {
                  try {
                    setIsDeletingInProgress(true);
                    await adminDeleteUserAccount(userToDelete.id);
                    setUserToDelete(null);
                  } catch (err: any) {
                    alert(`Deletion failed: ${err.message || err}`);
                  } finally {
                    setIsDeletingInProgress(false);
                  }
                }}
                className="px-4 py-2 bg-red-605 hover:bg-red-550 rounded-xl text-xs font-black text-white cursor-pointer transition shadow-xs disabled:opacity-40"
              >
                {isDeletingInProgress ? 'Processing Cleanup...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Brand Account Permanent Deletion Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in font-sans">
          <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl relative">
            <div className="flex items-center gap-3 text-red-650">
              <Trash2 className="w-6 h-6 animate-pulse" />
              <h3 className="text-lg font-black tracking-tight text-slate-805">Confirm Permanent Deletion</h3>
            </div>
            
            <p className="text-xs text-slate-650 leading-relaxed font-semibold">
              This action will permanently delete this account and associated data. This cannot be undone.
            </p>

            <div className="bg-red-50 border border-red-105 p-3.5 rounded-xl">
              <p className="text-[10px] text-red-650 font-extrabold uppercase tracking-wider mb-1">Target Brand Company:</p>
              <p className="text-xs text-slate-800 font-extrabold">{clientToDelete.name} ({clientToDelete.company})</p>
              <p className="text-[10px] text-slate-550 font-mono mt-0.5">{clientToDelete.gmail}</p>
              <ul className="text-[9px] text-slate-500 list-disc pl-4 space-y-1 mt-2.5">
                <li>Remove credentials from Auth directory</li>
                <li>Clear brand metadata, billing lists & payment proofs</li>
                <li>Erase upload configurations & active campaigns</li>
                <li>Archive key database registers safely</li>
              </ul>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                disabled={isDeletingInProgress}
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black cursor-pointer transition shadow-xs disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingInProgress}
                onClick={async () => {
                  try {
                    setIsDeletingInProgress(true);
                    await adminDeleteClientAccount(clientToDelete.id);
                    setClientToDelete(null);
                  } catch (err: any) {
                    alert(`Deletion failed: ${err.message || err}`);
                  } finally {
                    setIsDeletingInProgress(false);
                  }
                }}
                className="px-4 py-2 bg-red-650 hover:bg-red-550 rounded-xl text-xs font-black text-white cursor-pointer transition shadow-xs disabled:opacity-40"
              >
                {isDeletingInProgress ? 'Processing Cleanup...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Deletion Confirmation Modal Overlay */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-fade-in text-slate-800 font-sans">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-650 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-805">Permanently delete this campaign?</h3>
                <p className="text-xs text-slate-500">
                  This will completely remove <span className="font-bold text-slate-800">"{taskToDelete.title}"</span> from the Firestore database. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-sans">
                Reason for deletion (optional)
              </label>
              <textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Enter a removal audit note or explanation..."
                className="w-full text-xs text-slate-800 bg-white border border-slate-200 p-2.5 px-3 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none h-20 placeholder:text-slate-400 font-sans"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 transition text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    // Save to deleted_tasks collection
                    const record = {
                      id: taskToDelete.id,
                      title: taskToDelete.title,
                      clientName: taskToDelete.clientName,
                      type: taskToDelete.type,
                      agencyPay: Number(taskToDelete.agencyPay),
                      memberPay: Number(taskToDelete.memberPay),
                      deletedAt: new Date().toISOString(),
                      deletedBy: currentUser?.fullName || currentUser?.email || 'admin',
                      reason: deletionReason.trim() || 'No reason specified'
                    };
                    await setDoc(doc(db, 'deleted_tasks', taskToDelete.id), record);

                    // Delete from tasks
                    await deleteDoc(doc(db, 'tasks', taskToDelete.id));

                    // Delete from client_tasks
                    await deleteDoc(doc(db, 'client_tasks', taskToDelete.id));

                    alert('Campaign was permanently deleted and logged!');
                    setTaskToDelete(null);
                  } catch (e) {
                    console.error("Deletion failed:", e);
                    alert("Failed to delete: " + e);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-650 hover:bg-red-600 transition text-white flex items-center gap-1.5 cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BATCH PERMANENT DELETION CONFIRMATION MODAL ================= */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-slate-800 font-sans">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-655 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-805">Permanently delete {selectedTaskIds.length} tasks?</h3>
                <p className="text-xs text-slate-500">
                  This will completely remove all <span className="font-bold text-slate-805">{selectedTaskIds.length} select campaigns</span> from the Firestore database. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-sans">
                Reason for deletion (optional)
              </label>
              <textarea
                value={batchDeletionReason}
                onChange={(e) => setBatchDeletionReason(e.target.value)}
                placeholder="Reason for deletion (applies to all selected tasks)"
                className="w-full text-xs text-slate-800 bg-white border border-slate-200 p-2.5 px-3 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none h-20 placeholder:text-slate-400 font-sans shadow-inner"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 transition text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const promises = selectedTaskIds.map(async (taskId) => {
                      const t = (clientTasks || []).find(item => item.id === taskId);
                      if (!t) return;
                      const record = {
                        id: t.id,
                        title: t.title,
                        clientName: t.clientName || 'Unlabeled',
                        type: t.type,
                        agencyPay: Number(t.agencyPay || 0),
                        memberPay: Number(t.memberPay || t.agencyPay * 0.70),
                        deletedAt: new Date().toISOString(),
                        deletedBy: currentUser?.fullName || currentUser?.email || 'admin',
                        reason: batchDeletionReason.trim() || 'No reason specified'
                      };
                      await setDoc(doc(db, 'deleted_tasks', t.id), record);
                      await deleteDoc(doc(db, 'tasks', t.id));
                      await deleteDoc(doc(db, 'client_tasks', t.id));
                    });

                    await Promise.all(promises);
                    setToastMessage(`✅ ${selectedTaskIds.length} tasks permanently deleted`);
                    setSelectedTaskIds([]);
                    setBulkDeleteModalOpen(false);
                  } catch (e) {
                    console.error("Batch deletion failed:", e);
                    alert("Batch deletion failed: " + e);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-550 transition text-white flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FLOATING BULK ACTION BAR ================= */}
      {adminTaskFilter === 'Removed' && selectedTaskIds.length > 0 && !bulkDeleteModalOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white border border-red-200 text-slate-800 rounded-2xl p-4 px-6 shadow-xl flex items-center gap-6 font-sans min-w-[320px] md:min-w-[450px] justify-between">
          <div className="flex items-center gap-2.5 select-none">
            <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
              {selectedTaskIds.length} {selectedTaskIds.length === 1 ? 'task' : 'tasks'} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedTaskIds([])}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-205 font-bold text-xs rounded-xl transition cursor-pointer select-none uppercase tracking-wider"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={() => {
                setBatchDeletionReason('');
                setBulkDeleteModalOpen(true);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-550 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* ⚠️ Restricted Permission Modal Overlay */}
      {showPermissionRestrictedModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in font-sans">
          <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl relative text-left text-slate-800">
            <div className="flex items-center gap-3 text-red-605">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <h3 className="text-lg font-black tracking-tight text-slate-805 m-0">Restricted Permission</h3>
            </div>
            
            <p className="text-xs text-slate-650 leading-relaxed font-semibold m-0">
              {showPermissionRestrictedModal}
            </p>

            <div className="bg-red-50 border border-red-100 p-3.5 rounded-xl font-sans text-[11px] text-slate-550 space-y-1">
              <p className="text-[10px] text-red-656 font-extrabold uppercase tracking-wider mb-1 m-0 font-mono">🛡️ MODERATOR DELEGATION LEVEL:</p>
              <p className="m-0 leading-normal">As a platform Moderator, you are authorized to manage content submissions, review proof files, view support tickets, and resolve task disputes.</p>
              <p className="font-extrabold text-slate-700 mt-1.5 m-0 leading-normal">Master settings, permanent deletion, server routing, and financial disbursements are restricted to owner/admin roles.</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPermissionRestrictedModal(null)}
                className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-205 text-slate-700 rounded-xl text-xs font-black cursor-pointer transition active:scale-95 shadow-xs"
              >
                Acknowledge Restricted State
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔒 Edit Campaign Visibility & Assignments Modal Overlay */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in font-sans">
          <div className="bg-white border border-slate-205 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl relative text-left text-slate-800">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 mb-2">
              <div className="flex items-center gap-2.5 text-indigo-650">
                <Edit className="w-5 h-5" />
                <h3 className="text-base font-black tracking-tight text-slate-900 m-0">Edit Campaign Visibility & Access</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-slate-705 bg-transparent border-0 font-extrabold cursor-pointer text-sm"
              >
                ✕ CLOSE
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-wider uppercase text-slate-450 block">CAMPAIGN TITLE:</span>
              <p className="text-xs font-extrabold text-slate-800 bg-slate-50 border p-3 rounded-xl m-0 leading-tight">{editingTask.title}</p>
            </div>

            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">Task Visibility & Access</label>
              <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs gap-1 select-none">
                <button
                  type="button"
                  onClick={() => setEditVisibility('public')}
                  className={`flex-1 px-3 py-1.5 rounded transition font-bold ${
                    editVisibility === 'public' ? 'bg-indigo-650 text-white font-black shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Public Task
                </button>
                <button
                  type="button"
                  onClick={() => setEditVisibility('assigned')}
                  className={`flex-1 px-3 py-1.5 rounded transition font-bold ${
                    editVisibility === 'assigned' ? 'bg-indigo-650 text-white font-black shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Private / Assigned Only
                </button>
              </div>
            </div>

            {editVisibility === 'assigned' && (
              <div className="space-y-3 animate-fade-in text-xs">
                {/* Exclusive Option */}
                <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border border-slate-150 rounded-xl">
                  <div className="space-y-0.5 max-w-[85%] text-slate-700">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider block">Exclusive Task Claiming</label>
                    <p className="text-[9px] text-slate-500 leading-tight">First list invitee to claim gets full, exclusive rights to the campaign slots.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={editIsExclusive}
                    onChange={(e) => setEditIsExclusive(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer accent-indigo-600 bg-white"
                  />
                </div>

                {/* Search Assigned Members */}
                <div className="relative">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Select Members (Fuzzy Search)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type username, email, or Reddit username..."
                      value={editSearchMemberQuery}
                      onChange={(e) => setEditSearchMemberQuery(e.target.value)}
                      onFocus={() => setEditMemberDropdownOpen(true)}
                      className="w-full text-xs text-slate-850 bg-white border border-slate-200 pl-8 pr-3 py-2 rounded-xl focus:border-indigo-550 focus:outline-none"
                    />
                  </div>

                  {/* Dropdown with filtered matches */}
                  {editMemberDropdownOpen && (
                    <div className="absolute z-35 mt-1 w-full bg-white border border-slate-205 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                      <div className="flex justify-between items-center bg-slate-50 p-1.5 px-3 text-[9px] text-slate-400 font-bold select-none">
                        <span>MATCHING USER BASE</span>
                        <button
                          type="button"
                          onClick={() => setEditMemberDropdownOpen(false)}
                          className="text-rose-500 hover:text-rose-700 font-extrabold cursor-pointer border-none bg-transparent"
                        >
                          CLOSE ✕
                        </button>
                      </div>
                      {filteredCreatorsToEditInvite.length === 0 ? (
                        <div className="p-3 text-center text-slate-400 italic text-[11px] select-none">
                          {editSearchMemberQuery ? 'No matching users found' : 'Type to search members...'}
                        </div>
                      ) : (
                        filteredCreatorsToEditInvite.slice(0, 10).map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              if (!editAssignedMembers.includes(m.id)) {
                                setEditAssignedMembers(prev => [...prev, m.id]);
                              }
                              setEditSearchMemberQuery('');
                              setEditMemberDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between text-xs transition border-0 outline-none cursor-pointer bg-transparent"
                          >
                            <div className="text-left">
                              <span className="font-extrabold text-slate-800 block leading-tight text-left">{m.fullName || m.name || 'Anonymous User'}</span>
                              <span className="text-[9px] text-indigo-650 font-mono block text-left">u/{m.redditUsername || 'None'} • {m.email}</span>
                            </div>
                            <span className="text-[10px] bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded text-indigo-700 font-black font-mono">➕ ADD</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Removable Tag Pills */}
                {editAssignedMembers.length > 0 && (
                  <div className="space-y-1 pt-1 animate-fade-in">
                    <label className="text-[9px] font-black uppercase text-slate-405 tracking-wider">Assigned Members ({editAssignedMembers.length})</label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-xl">
                      {editAssignedMembers.map(uid => {
                        const m = users.find(u => u.id === uid);
                        return (
                          <span key={uid} className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-lg font-mono">
                            <span>u/{m?.redditUsername || m?.email || uid}</span>
                            <button
                              type="button"
                              onClick={() => setEditAssignedMembers(prev => prev.filter(id => id !== uid))}
                              className="text-indigo-400 hover:text-indigo-800 cursor-pointer font-black border-0 bg-transparent text-[11px] ml-0.5 p-0"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-250 text-slate-705 rounded-xl text-xs font-bold cursor-pointer transition select-none uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTaskEdits}
                className="px-5 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-black cursor-pointer transition uppercase"
              >
                Save & Broadcast Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑 Delete Submission Confirmation Modal */}
      {submissionToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-fade-in font-sans">
          <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl relative text-left text-slate-800">
            <div className="flex items-center gap-2.5 text-rose-600">
              <Trash2 className="w-5 h-5 animate-pulse" />
              <h3 className="text-base font-black tracking-tight text-slate-900 m-0">Confirm Delete Submission</h3>
            </div>
            
            <p className="text-xs text-slate-650 leading-relaxed font-semibold">
              Delete this submission from the review desk?
              <br className="mb-2" />
              <span className="text-rose-600 font-extrabold">This action will not affect payments, wallet balances, audit logs, or completed transactions.</span>
            </p>

            <div className="bg-slate-50 border p-3.5 rounded-xl space-y-1.5 text-xs font-semibold">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-450 block font-mono">Submission Details:</span>
              <p className="m-0 text-[11px] text-slate-800 font-extrabold">Task: {submissionToDelete.taskTitle}</p>
              <p className="m-0 text-[11px] text-slate-650 font-medium">Creator: {submissionToDelete.userFullName} (u/{submissionToDelete.redditUsername})</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSubmissionToDelete(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-250 text-slate-705 rounded-xl text-xs font-bold cursor-pointer transition select-none uppercase tracking-wider"
                disabled={isDeletingSubmission}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmissionConfirm}
                className="px-5 py-2 bg-rose-650 hover:bg-rose-600 text-white rounded-xl text-xs font-black cursor-pointer transition uppercase flex items-center gap-1.5"
                disabled={isDeletingSubmission}
              >
                {isDeletingSubmission ? 'Deleting...' : 'Delete Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Overlay backdrop and slide panel */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[9999] font-sans" id="admin-nav-drawer-overlay">
            {/* Backdrop panel */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
            />

            {/* Slide Drawer body */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="absolute right-0 top-0 h-screen w-full sm:w-[390px] bg-white text-slate-800 shadow-2xl flex flex-col border-l border-slate-200/60"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-black text-slate-905 uppercase tracking-wider m-0 font-sans">Navigation Deck</h2>
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest m-0 block mt-0.5">
                      Control Center
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-lg transition"
                >
                  <X className="w-5 h-5 pointer-events-none" />
                </button>
              </div>

              {/* Scrollable group section */}
              <div className="flex-1 overflow-y-auto p-5 space-y-7 scrollbar-thin scrollbar-slate-200">
                {/* Operator summary */}
                <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl flex items-center gap-3">
                  <img 
                    src={currentUser?.avatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=Admin"} 
                    alt="Operator Avatar" 
                    className="w-10 h-10 rounded-full border border-indigo-100 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-left font-sans">
                    <span className="text-xs text-slate-900 font-black block leading-snug">
                      {currentUser?.fullName}
                    </span>
                    <span className="text-[10px] text-slate-450 font-bold block leading-none mt-0.5">
                      {currentUser?.role === 'moderator' ? 'Moderator Role' : 'Administrator Role'}
                    </span>
                  </div>
                </div>

                {/* Iterate through groups */}
                {menuGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-2 font-sans">
                    <div className="flex items-center gap-2 pl-1 select-none">
                      <span className="w-1 h-2 bg-indigo-650 rounded-full" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-405 font-mono">
                        {group.title}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {group.items.map((tab) => {
                        const TabIcon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(tab.id as any);
                              setIsMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
                              isActive
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                                : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100 border-transparent hover:border-slate-100 text-left'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <TabIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                              <span>{tab.label}</span>
                            </div>

                            {/* Badges representation */}
                            {tab.count !== null && tab.count > 0 && (
                              <span className={`px-1.5 py-0.5 text-[9px] font-black font-mono rounded ${
                                isActive 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-rose-50 text-rose-600'
                              }`}>
                                {tab.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Status footer inside drawer */}
              <div className="p-4 bg-slate-50 border-t border-slate-105 text-center select-none font-mono">
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">
                  Platform Admin Panel v2.0
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Animated Toast Feedback Container */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 text-slate-800 rounded-2xl p-4 shadow-xl flex items-center gap-3.5 animate-slide-up-fade-in font-bold text-xs select-none">
          <span className="p-2 bg-indigo-50 text-indigo-650 border border-indigo-150 rounded-xl font-bold font-mono">APP UPDATE</span>
          <span>{toastMessage}</span>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="text-slate-450 hover:text-slate-850 ml-2 cursor-pointer transition p-1"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
};
