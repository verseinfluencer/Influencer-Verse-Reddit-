import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, Task, Submission, Withdrawal, Transaction, 
  SupportTicket, AppNotification, SystemSettings, TaskType,
  Client, ClientTask, ClientPayment, ChatMessage, ClientChat,
  DeductionRecord, PayoutRequest, DuplicateGroup, FraudAlert
} from '../types';
import { 
  INITIAL_USERS, INITIAL_TASKS, INITIAL_SUBMISSIONS, 
  INITIAL_WITHDRAWALS, INITIAL_TRANSACTIONS, INITIAL_TICKETS, 
  ALL_NOTIFICATIONS 
} from '../data';
import {
  normalizeEmail,
  generateDeviceFingerprint,
  generateRandomIP,
  generateImageHash,
  getEstimatedLocationByIP,
  getDistanceBetweenCoords,
  COUNTRY_COORDINATES
} from '../utils/securityUtils';

interface AppContextType {
  users: User[];
  currentUser: User | null;
  tasks: Task[];
  submissions: Submission[];
  withdrawals: Withdrawal [];
  transactions: Transaction[];
  tickets: SupportTicket[];
  notifications: AppNotification[];
  settings: SystemSettings;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  
  // Client States
  clients: Client[];
  currentClient: Client | null;
  clientTasks: ClientTask[];
  clientPayments: ClientPayment[];
  clientChats: ClientChat[];
  
  // Auth
  login: (email: string, password: string) => Promise<User>;
  signup: (userData: {
    fullName: string;
    email: string;
    redditUsername: string;
    redditProfileLink: string;
    referralCode?: string;
  }) => Promise<User>;
  logout: () => void;
  updateProfile: (fullName: string, redditUsername: string, redditProfileLink: string, gender?: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say') => void;
  changePassword: (oldPw: string, newPw: string) => Promise<void>;
  deleteAccount: () => void;

  // Client Auth & Actions
  clientRegister: (clientData: Omit<Client, 'id' | 'status' | 'registeredAt' | 'payAgencyBalance' | 'payAgencyHistory' | 'taskUploadEnabled'>) => Promise<Client>;
  clientLogin: (email: string, password: string) => Promise<Client>;
  clientLogout: () => void;
  clientCreateTask: (taskData: {
    type: TaskType;
    title: string;
    description: string;
    targetSubreddit?: string;
    postUrlToCommentOn?: string;
    guidelines: string;
    deadline: string;
    notes?: string;
    agencyPay: number;
  }) => Promise<void>;
  clientReviewTaskSubmission: (taskId: string, action: 'Approve' | 'RequestRevision' | 'Reject', feedback?: string) => Promise<void>;

  // Member Client Task Interactions
  memberClaimClientTask: (taskId: string) => Promise<void>;
  memberSubmitClientTaskProof: (taskId: string, proofLink: string) => Promise<void>;
  memberRaiseDispute: (taskId: string, reason: string) => Promise<void>;
  memberRequestPayout: (amount: number, address: string, method: 'USDT_BEP20' | 'BINANCE_ID') => Promise<void>;

  // Admin Client Actions
  adminReviewClient: (clientId: string, status: 'approved' | 'rejected' | 'suspended', reason?: string) => void;
  adminToggleTaskUpload: (clientId: string, enabled: boolean) => void;
  adminToggleGlobalTaskUpload: (disabled: boolean) => void;
  adminReviewClientTask: (taskId: string, action: 'publish' | 'reject', memberPay?: number) => void;
  adminResolveDispute: (taskId: string, outcome: 'force_approved' | 'upheld') => Promise<void>;
  adminConfirmClientPayment: (clientId: string, amount: number, referenceNote?: string, receiptUrl?: string) => Promise<void>;
  adminReviewPayout: (requestId: string, status: 'Approved' | 'Rejected') => Promise<void>;
  adminRemoveCompletedTask: (taskId: string) => void;
  adminDeductMember: (userId: string, taskId: string, taskName: string, amount: number, reason: string) => void;

  // Chats
  clientSendMessage: (text: string, fileUrl?: string) => Promise<void>;
  adminSendMessage: (clientId: string, text: string, fileUrl?: string) => Promise<void>;
  adminToggleChatResolution: (clientId: string, status: 'resolved' | 'unresolved') => void;

  // Task Actions
  submitTaskProof: (taskId: string, proofUrl: string, submissionLink?: string) => Promise<void>;
  claimTask: (taskId: string) => Promise<void>;
  unclaimTask: (taskId: string, notifyExpired?: boolean) => void;
  
  // Wallet & Withdraw
  requestWithdrawal: (amount: number, method: 'USDT_BEP20' | 'BINANCE_ID', address: string) => Promise<void>;

  // Tickets
  createTicket: (subject: string, category: SupportTicket['category'], description: string) => void;
  replyToTicket: (ticketId: string, text: string, sender: 'user' | 'admin') => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Daily Streak
  claimDailyStreak: () => void;

  // Admin Actions
  adminApproveUser: (userId: string) => void;
  adminRejectUser: (userId: string, reason: string) => void;
  adminBanUser: (userId: string, reason: string) => void;
  adminCreateTask: (taskData: Omit<Task, 'id' | 'completedSubmissionsCount' | 'status'> & { isSpecial?: boolean; minKarmaRequired?: number; specialLabel?: string }) => void;
  adminEditTask: (taskId: string, taskData: Partial<Task>) => void;
  adminDeleteTask: (taskId: string) => void;
  adminReviewSubmission: (submissionId: string, status: 'Approved' | 'Rejected', feedback?: string) => void;
  adminReviewWithdrawal: (withdrawalId: string, status: 'Approved' | 'Rejected') => void;
  adminCreateAnnouncement: (title: string, message: string) => void;
  adminUpdateSettings: (settings: SystemSettings) => void;
  
  // Custom Claiming & Karma admin actions
  forceUnclaimTask: (taskId: string) => void;
  extendUserDeadline: (taskId: string) => void;
  resetCooldown: (userId: string) => void;
  adminUpdateUserKarma: (userId: string, targetKarma: number) => void;
  syncRedditKarma: () => Promise<void>;

  // Anti-Cheat tracking states and actions
  blacklistedIPs: string[];
  duplicateGroups: DuplicateGroup[];
  fraudAlerts: FraudAlert[];
  currentSimulatedIP: string;
  setCurrentSimulatedIP: (ip: string) => void;
  currentSimulatedCountry: string;
  setCurrentSimulatedCountry: (country: string) => void;
  blacklistIP: (ip: string) => void;
  unblacklistIP: (ip: string) => void;
  adminReviewFraudAction: (alertId: string, action: 'dismiss' | 'warn' | 'suspend' | 'ban' | 'freeze') => void;
  dismissFraudAlert: (alertId: string) => void;
  deleteDuplicateGroup: (groupId: string) => void;
  mergeDuplicateAccounts: (groupId: string, primaryUsername: string) => void;
  scanForDuplicates: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state from local storage or fall back to INITIAL values
  const [users, setUsers] = useState<User[]>(() => {
    const local = localStorage.getItem('iv_users');
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.some((u: any) => u.id === 'user-1')) {
        localStorage.removeItem('iv_users');
        localStorage.removeItem('iv_currentUser');
        localStorage.removeItem('iv_tasks');
        localStorage.removeItem('iv_submissions');
        localStorage.removeItem('iv_withdrawals');
        localStorage.removeItem('iv_transactions');
        localStorage.removeItem('iv_tickets');
        localStorage.removeItem('iv_notifications');
        return INITIAL_USERS;
      }
      return parsed;
    }
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const local = localStorage.getItem('iv_currentUser');
    return local ? JSON.parse(local) : null;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const local = localStorage.getItem('iv_tasks');
    return local ? JSON.parse(local) : INITIAL_TASKS;
  });

  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    const local = localStorage.getItem('iv_submissions');
    return local ? JSON.parse(local) : INITIAL_SUBMISSIONS;
  });

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>(() => {
    const local = localStorage.getItem('iv_withdrawals');
    return local ? JSON.parse(local) : INITIAL_WITHDRAWALS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const local = localStorage.getItem('iv_transactions');
    return local ? JSON.parse(local) : INITIAL_TRANSACTIONS;
  });

  const [tickets, setTickets] = useState<SupportTicket[]>(() => {
    const local = localStorage.getItem('iv_tickets');
    return local ? JSON.parse(local) : INITIAL_TICKETS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const local = localStorage.getItem('iv_notifications');
    return local ? JSON.parse(local) : ALL_NOTIFICATIONS;
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const local = localStorage.getItem('iv_settings');
    return local ? JSON.parse(local) : {
      globalMultiplier: 1.0,
      dailyTaskLimit: 10,
      referralBonus: 0.00,
    };
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const local = localStorage.getItem('iv_clients');
    return local ? JSON.parse(local) : [];
  });

  const [currentClient, setCurrentClient] = useState<Client | null>(() => {
    const local = localStorage.getItem('iv_currentClient');
    return local ? JSON.parse(local) : null;
  });

  const [clientTasks, setClientTasks] = useState<ClientTask[]>(() => {
    const local = localStorage.getItem('iv_clientTasks');
    return local ? JSON.parse(local) : [];
  });

  const [clientPayments, setClientPayments] = useState<ClientPayment[]>(() => {
    const local = localStorage.getItem('iv_clientPayments');
    return local ? JSON.parse(local) : [];
  });

  const [clientChats, setClientChats] = useState<ClientChat[]>(() => {
    const local = localStorage.getItem('iv_clientChats');
    return local ? JSON.parse(local) : [];
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const local = localStorage.getItem('iv_theme');
    return (local as 'dark' | 'light') || 'dark';
  });

  const [warningSentTasks, setWarningSentTasks] = useState<Record<string, boolean>>({});

  // Anti-Cheat and Security states
  const [blacklistedIPs, setBlacklistedIPs] = useState<string[]>(() => {
    const local = localStorage.getItem('iv_blacklistedIPs');
    return local ? JSON.parse(local) : ['198.51.100.42']; // Default seed blacklisted IP
  });

  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>(() => {
    const local = localStorage.getItem('iv_duplicateGroups');
    return local ? JSON.parse(local) : [];
  });

  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>(() => {
    const local = localStorage.getItem('iv_fraudAlerts');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        return Array.isArray(parsed) ? parsed.filter((a: any) => a.id !== 'alert-mock-1' && a.userName !== 'Sophia Martinez') : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [currentSimulatedIP, setCurrentSimulatedIP] = useState<string>(() => {
    const local = localStorage.getItem('iv_currentSimulatedIP');
    return local || '185.190.140.23';
  });

  const [currentSimulatedCountry, setCurrentSimulatedCountry] = useState<string>(() => {
    const local = localStorage.getItem('iv_currentSimulatedCountry');
    return local || 'UK';
  });

  // Sync state to local storage on changes
  useEffect(() => {
    localStorage.setItem('iv_users', JSON.stringify(users));
  }, [users]);

  // Real-time storage listener for instantaneous synchronization across admin panels and registration forms
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'iv_users' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setUsers(parsed);
        } catch (err) {
          console.error('Real-time database listener sync failed:', err);
        }
      }
      if (e.key === 'iv_currentUser' && e.newValue) {
        try {
          setCurrentUser(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('iv_currentUser', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('iv_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('iv_submissions', JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem('iv_withdrawals', JSON.stringify(withdrawals));
  }, [withdrawals]);

  useEffect(() => {
    localStorage.setItem('iv_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('iv_tickets', JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    localStorage.setItem('iv_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('iv_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('iv_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('iv_currentClient', JSON.stringify(currentClient));
  }, [currentClient]);

  useEffect(() => {
    localStorage.setItem('iv_clientTasks', JSON.stringify(clientTasks));
  }, [clientTasks]);

  useEffect(() => {
    localStorage.setItem('iv_clientPayments', JSON.stringify(clientPayments));
  }, [clientPayments]);

  useEffect(() => {
    localStorage.setItem('iv_clientChats', JSON.stringify(clientChats));
  }, [clientChats]);

  useEffect(() => {
    localStorage.setItem('iv_blacklistedIPs', JSON.stringify(blacklistedIPs));
  }, [blacklistedIPs]);

  useEffect(() => {
    localStorage.setItem('iv_duplicateGroups', JSON.stringify(duplicateGroups));
  }, [duplicateGroups]);

  useEffect(() => {
    localStorage.setItem('iv_fraudAlerts', JSON.stringify(fraudAlerts));
  }, [fraudAlerts]);

  useEffect(() => {
    localStorage.setItem('iv_currentSimulatedIP', currentSimulatedIP);
  }, [currentSimulatedIP]);

  useEffect(() => {
    localStorage.setItem('iv_currentSimulatedCountry', currentSimulatedCountry);
  }, [currentSimulatedCountry]);

  useEffect(() => {
    localStorage.setItem('iv_theme', theme);
    // Add/remove class from physical document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Helper inside context to save updated admin / user state easily
  const syncUserToCurrent = (userId: string, updatedUsersList: User[]) => {
    if (currentUser && currentUser.id === userId) {
      const updated = updatedUsersList.find(u => u.id === userId);
      if (updated) {
        setCurrentUser(updated);
      }
    }
  };

  // ================= ANTI-CHEAT CORE SYSTEM =================

  const triggerFraudFlag = (userId: string, type: string, details: string, scoreAdd: number) => {
    // We update users state
    setUsers(prevUsers => {
      const updated = prevUsers.map(u => {
        if (u.id === userId) {
          const prevScore = u.fraudScore || 0;
          const nextScore = Math.min(100, prevScore + scoreAdd);
          
          const flags = u.fraudFlags || [];
          const newFlag = { type, timestamp: new Date().toISOString(), details };
          const nextFlags = [newFlag, ...flags];

          let isSuspended = u.isSuspended || false;
          let suspensionReason = u.suspensionReason || '';
          let isBanned = u.isBanned || false;
          let banReason = u.banReason || '';
          let status = u.status;

          // Check threshold transitions
          if (nextScore >= 81 && !isBanned) {
            isBanned = true;
            status = 'Banned';
            banReason = `Fraud score reached ${nextScore} (Banned - Permanent)`;
          } else if (nextScore >= 61 && !isSuspended && !isBanned) {
            isSuspended = true;
            suspensionReason = `Fraud score reached ${nextScore} (Auto-Suspended)`;
          }

          return {
            ...u,
            fraudScore: nextScore,
            fraudFlags: nextFlags,
            isSuspended,
            suspensionReason,
            isBanned,
            banReason,
            status
          };
        }
        return u;
      });

      // Send notifications for threshold alerts if triggered or score triggers
      const matchedUser = updated.find(u => u.id === userId);
      if (matchedUser) {
        // Create a new Fraud Alert item
        const newAlert: FraudAlert = {
          id: `alert-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type,
          userId,
          userName: matchedUser.fullName,
          userEmail: matchedUser.email,
          fraudScore: matchedUser.fraudScore || 0,
          timestamp: new Date().toISOString(),
          status: 'pending' as const,
          details: `⚠️ ${type}: ${details}`,
          recommendedAction: getRecommendedSecurityAction(type, matchedUser.fraudScore || 0)
        };
        
        setFraudAlerts(prev => [newAlert, ...prev]);

        // Create Admin Notification
        const notifMsg = `🚨 Anti-Cheat: ${type} detected for user "${matchedUser.fullName}". Current Fraud Score: ${matchedUser.fraudScore}`;
        const adminNotif: AppNotification = {
          id: `notif-fraud-${Date.now()}`,
          userId: 'admin-1', // admin user
          type: 'verification',
          title: `Anti-Cheat Event: ${type}`,
          message: notifMsg,
          read: false,
          timestamp: new Date().toISOString()
        };
        setNotifications(prev => [adminNotif, ...prev]);

        // Also add notifications to users if banned or suspended
        if (matchedUser.isBanned) {
          const userNotif: AppNotification = {
            id: `notif-ban-${Date.now()}`,
            userId: matchedUser.id,
            type: 'verification',
            title: 'Account Banned Permanently',
            message: 'Your account has been permanently banned for violating our Terms of Service.',
            read: false,
            timestamp: new Date().toISOString()
          };
          setNotifications(prev => [userNotif, ...prev]);
        } else if (matchedUser.isSuspended) {
          const userNotif: AppNotification = {
            id: `notif-sus-${Date.now()}`,
            userId: matchedUser.id,
            type: 'verification',
            title: 'Account Suspended',
            message: 'Your account has been suspended. Please contact support at verseinfluencer@yahoo.com for assistance.',
            read: false,
            timestamp: new Date().toISOString()
          };
          setNotifications(prev => [userNotif, ...prev]);
        }
      }

      return updated;
    });
  };

  const getRecommendedSecurityAction = (type: string, score: number): string => {
    if (score >= 81) return "⛔ Permanent ban. Freezing all user earnings.";
    if (score >= 61) return "🔴 Suspend creator. Requires manual administrative review.";
    if (score >= 41) return "🟠 Manual Approval: Enforce manual verification for all task submissions.";
    if (score >= 21) return "🟡 Watch: High risk activities, monitor claimant timeline closely.";
    return "✅ Keep clean. No action required.";
  };

  const runSuspiciousLoginChecks = (userId: string, history: any[]) => {
    if (history.length < 2) return;
    const now = new Date(history[0].timestamp).getTime();
    
    // Country and IP counters in last 24h
    const last24h = history.filter(h => {
      const diff = now - new Date(h.timestamp).getTime();
      return diff <= 24 * 3600 * 1000;
    });

    const uniqueIPs = new Set(last24h.map(h => h.ip));
    if (uniqueIPs.size > 5) {
      triggerFraudFlag(userId, "Suspicious Login Pattern", `More than 5 different IPs (${uniqueIPs.size}) used in 24 hours.`, 10);
      return;
    }

    // Check consecutive country logins for travel speed
    const currentLogin = history[0];
    const prevLogin = history[1];
    
    if (currentLogin && prevLogin && currentLogin.country !== prevLogin.country) {
      const timeDiffMinutes = (new Date(currentLogin.timestamp).getTime() - new Date(prevLogin.timestamp).getTime()) / 60000;
      
      if (timeDiffMinutes <= 60) {
        triggerFraudFlag(userId, "Suspicious Login Pattern", `Logins from different countries (${prevLogin.country} & ${currentLogin.country}) within ${Math.ceil(timeDiffMinutes)} minutes.`, 10);
      } else {
        const coord1 = COUNTRY_COORDINATES[currentLogin.country] || COUNTRY_COORDINATES['Unknown'] || { lat: 0, lng: 0 };
        const coord2 = COUNTRY_COORDINATES[prevLogin.country] || COUNTRY_COORDINATES['Unknown'] || { lat: 0, lng: 0 };
        if (coord1.lat !== 0 && coord2.lat !== 0) {
          const distKm = getDistanceBetweenCoords(coord1.lat, coord1.lng, coord2.lat, coord2.lng);
          const timeDiffHours = timeDiffMinutes / 60;
          const speedKmh = distKm / timeDiffHours;
          if (speedKmh > 1000) { // faster than jet speed
            triggerFraudFlag(userId, "Suspicious Login Pattern", `Impossible travel speed detected. Crossed ${Math.ceil(distKm)} km at ${Math.ceil(speedKmh)} km/h between ${prevLogin.country} and ${currentLogin.country}.`, 10);
          }
        }
      }
    }
  };

  const addOrCreateDuplicateGroup = (userIds: string[], sharedIdentifier: string, type: 'ip' | 'fingerprint' | 'reddit' | 'gmail') => {
    setDuplicateGroups(prev => {
      const exists = prev.find(g => g.sharedIdentifier === sharedIdentifier && g.type === type);
      if (exists) {
        const mergedAccounts = Array.from(new Set([...exists.accounts, ...userIds]));
        return prev.map(g => g.id === exists.id ? { ...g, accounts: mergedAccounts } : g);
      } else {
        const newGroup: DuplicateGroup = {
          id: `group-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          accounts: userIds,
          sharedIdentifier,
          type
        };
        return [newGroup, ...prev];
      }
    });
  };

  // Login implementation
  const login = async (email: string, password: string): Promise<User> => {
    // 1. Check IP blacklist
    if (blacklistedIPs.includes(currentSimulatedIP)) {
      throw new Error(`❌ Access denied. Your IP address (${currentSimulatedIP}) has been blacklisted for violating our Terms of Service.`);
    }

    // Check admin credentials
    if (email === 'kalloldeyprivate20@gmail.com' && password === 'KdXd@2009') {
      let adminUser = users.find(u => u.email === email && u.role === 'admin');
      if (!adminUser) {
        // Double check admin isn't created, otherwise make it
        adminUser = {
          id: 'admin-1',
          fullName: 'Kallol Dey',
          email: 'kalloldeyprivate20@gmail.com',
          redditUsername: 'u/kallol_admin',
          redditProfileLink: 'https://reddit.com/user/kallol_admin',
          status: 'Approved',
          referralCode: 'ADMINVIP',
          streak: 1,
          xp: 1000,
          balance: 0,
          totalEarned: 0,
          pendingBalance: 0,
          withdrawn: 0,
          joinDate: new Date().toISOString(),
          avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
          role: 'admin',
          karma: 15450,
          karmaYesterday: 15300,
          karmaBadge: 'Diamond',
          karmaLastSynced: new Date(Date.now() - 3600000 * 4).toISOString(),
          last_claimed_at: null,
          cooldown_expires_at: null,
          active_task_id: null
        };
        const newUsers = [adminUser, ...users];
        setUsers(newUsers);
      }
      setCurrentUser(adminUser);
      return adminUser;
    }

    // Standard user credentials check
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('No user found with this email. Note: If trying to log in as admin, use the official admin email/password.');
    }

    if (user.status === 'Banned' || user.isBanned) {
      throw new Error(`Your account has been permanently banned. Reason: ${user.banReason || 'Violation of platform anti-cheat policies.'}`);
    }

    if (user.isSuspended) {
      throw new Error(`Your account has been temporarily suspended. Reason: ${user.suspensionReason || 'Audit investigation pending.'}`);
    }

    // Login successful: Log login history & IP history
    const locationInfo = getEstimatedLocationByIP(currentSimulatedIP);
    const country = locationInfo.country;
    const nowISO = new Date().toISOString();

    const prevHistory = user.loginHistory || [];
    const newLoginRecord = { ip: currentSimulatedIP, country, timestamp: nowISO };
    const updatedLoginHistory = [newLoginRecord, ...prevHistory];

    const currentIPHistory = user.ipHistory || [];
    const hasIPInHistory = currentIPHistory.some(h => h.ip === currentSimulatedIP);
    const updatedIPHistory = hasIPInHistory 
      ? currentIPHistory 
      : [{ ip: currentSimulatedIP, timestamp: nowISO, location: country }, ...currentIPHistory];

    // Device Fingerprinting:
    const finger = generateDeviceFingerprint();
    const updatedFingerprints = Array.from(new Set([finger, ...(user.deviceFingerprints || [])]));

    const updatedUser: User = {
      ...user,
      loginHistory: updatedLoginHistory,
      ipHistory: updatedIPHistory,
      deviceFingerprints: updatedFingerprints,
      lastLoginDate: nowISO.split('T')[0]
    };

    let finalUsersList = users.map(u => u.id === user.id ? updatedUser : u);
    setUsers(finalUsersList);
    setCurrentUser(updatedUser);

    // Run Security Checks on login
    // Check duplicate accounts by same IP
    const otherAccountsWithSameIP = users.filter(u => u.id !== user.id && (u.ipHistory || []).some(h => h.ip === currentSimulatedIP));
    if (otherAccountsWithSameIP.length > 0) {
      addOrCreateDuplicateGroup([user.id, ...otherAccountsWithSameIP.map(o => o.id)], currentSimulatedIP, 'ip');
      
      const otherNames = otherAccountsWithSameIP.map(u => u.redditUsername).join(', ');
      triggerFraudFlag(user.id, "IP Match", `Multiple accounts detected from same IP: ${currentSimulatedIP}. Shared with: ${otherNames}`, 10);

      // Auto-suspend newer account immediately
      const allAccs = [updatedUser, ...otherAccountsWithSameIP].sort((a, b) => b.joinDate.localeCompare(a.joinDate));
      const newest = allAccs[0];
      
      if (newest.id === user.id) {
        throw new Error(`Your account has been suspended. Reason: Multiple accounts detected login from same IP address: ${currentSimulatedIP}`);
      } else {
        // Suspend the other newly logged account
        setUsers(prev => prev.map(u => {
          if (u.id === newest.id) {
            return {
              ...u,
              isSuspended: true,
              suspensionReason: `Multiple accounts logging from same IP address: ${currentSimulatedIP}`
            };
          }
          return u;
        }));
      }
    }

    // Check duplicate device fingerprint matches
    const otherAccountsWithSameFingerprint = users.filter(u => u.id !== user.id && (u.deviceFingerprints || []).includes(finger));
    if (otherAccountsWithSameFingerprint.length > 0) {
      addOrCreateDuplicateGroup([user.id, ...otherAccountsWithSameFingerprint.map(o => o.id)], finger, 'fingerprint');
      
      const otherNames = otherAccountsWithSameFingerprint.map(u => u.redditUsername).join(', ');
      triggerFraudFlag(user.id, "Fingerprint Match", `Same device fingerprint (${finger}) detected on multiple accounts. Matches: ${otherNames}`, 15);
    }

    // Log travel speed checks
    runSuspiciousLoginChecks(user.id, updatedLoginHistory);

    return updatedUser;
  };

  // Signup implementation
  const signup = async (userData: {
    fullName: string;
    email: string;
    redditUsername: string;
    redditProfileLink: string;
    referralCode?: string;
    honeypotFilled?: boolean; // Hidden bot trap field
  }): Promise<User> => {
    // 1. IP Blacklist check
    if (blacklistedIPs.includes(currentSimulatedIP)) {
      throw new Error(`❌ Access denied. Your IP address (${currentSimulatedIP}) has been blacklisted for violating our Terms of Service.`);
    }

    // 2. Honeypot check
    if (userData.honeypotFilled) {
      const honeypotAlert: FraudAlert = {
        id: `alert-bot-${Date.now()}`,
        type: 'Honeypot Trigger',
        userId: 'bot-attempt',
        userName: userData.fullName,
        userEmail: userData.email,
        fraudScore: 100,
        timestamp: new Date().toISOString(),
        status: 'resolved',
        details: '❌ Attempted automated registration: Bot completed hidden honeypot captcha fields.',
        recommendedAction: 'Verify IP origin and block range'
      };
      setFraudAlerts(prev => [honeypotAlert, ...prev]);
      throw new Error('❌ CAPTCHA verification failed. Bot behavior detected.');
    }

    // 3. Email Normalization Check (dot tricks and plus trick)
    const normalizedNewEmail = normalizeEmail(userData.email);
    const existingEmailMatch = users.find(u => normalizeEmail(u.email) === normalizedNewEmail);
    if (existingEmailMatch) {
      throw new Error('❌ This email address is already registered on Influencer Verse.');
    }

    // 4. Reddit Account Cross-Check (blocks registration instantly regardless of profile status)
    const cleanNewReddit = userData.redditUsername.replace(/^u\//i, '').trim().toLowerCase();
    const redditMatch = users.find(u => u.redditUsername.replace(/^u\//i, '').trim().toLowerCase() === cleanNewReddit);
    if (redditMatch) {
      throw new Error('❌ This Reddit account is already registered on Influencer Verse.');
    }

    const referralCodeSeed = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Fetch live Reddit karma on registration - absolutely no fakes or Math.random
    let initialKarma = 0;
    try {
      const resp = await fetch(`https://www.reddit.com/user/${cleanNewReddit}/about.json`);
      if (resp.ok) {
        const body = await resp.json();
        if (body && body.data && typeof body.data.total_karma === 'number') {
          initialKarma = body.data.total_karma;
        }
      }
    } catch (err) {
      console.error('Failed to get initial Reddit karma:', err);
    }
    const initialYesterday = initialKarma;
    const badge = getKarmaBadge(initialKarma);

    // Duplicate IP registrations checker on creation
    const otherAccsIP = users.filter(u => (u.ipHistory || []).some(h => h.ip === currentSimulatedIP));
    const locationInfo = getEstimatedLocationByIP(currentSimulatedIP);
    const country = locationInfo.country;
    const finger = generateDeviceFingerprint();

    let startSuspended = false;
    let startSuspensionReason = '';
    let startFraudScore = 0;
    let startFlags: any[] = [];

    if (otherAccsIP.length > 0) {
      startSuspended = true;
      startSuspensionReason = `Auto-suspended: Multiple accounts detected from same IP address: ${currentSimulatedIP}`;
      startFraudScore += 10;
      startFlags.push({
        type: 'IP Match',
        timestamp: new Date().toISOString(),
        details: `Multiple accounts registered from same IP address: ${currentSimulatedIP}. Shared with: ${otherAccsIP.map(o => o.redditUsername).join(', ')}`
      });
    }

    const otherAccsFinger = users.filter(u => (u.deviceFingerprints || []).includes(finger));
    if (otherAccsFinger.length > 0) {
      startFraudScore += 15;
      startFlags.push({
        type: 'Fingerprint Match',
        timestamp: new Date().toISOString(),
        details: `Same device fingerprint (${finger}) detected on registration. Matches: ${otherAccsFinger.map(o => o.redditUsername).join(', ')}`
      });
    }

    // Create new pending user
    const newUser: User = {
      id: `user-${Date.now()}`,
      fullName: userData.fullName,
      email: userData.email,
      redditUsername: userData.redditUsername,
      redditProfileLink: userData.redditProfileLink,
      status: startSuspended ? 'Banned' : 'Pending', // Starts pre-suspended if flag limits are breached
      referralCode: referralCodeSeed,
      referredBy: userData.referralCode || undefined,
      streak: 0,
      xp: 0,
      balance: 0,
      totalEarned: 0,
      pendingBalance: 0,
      withdrawn: 0,
      joinDate: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0].substring(0, 5),
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${userData.redditUsername}`,
      role: 'user',
      karma: initialKarma,
      karmaYesterday: initialYesterday,
      karmaBadge: badge,
      karmaLastSynced: new Date().toISOString(),
      last_claimed_at: null,
      cooldown_expires_at: null,
      active_task_id: null,
      
      // Security fields
      ipHistory: [{ ip: currentSimulatedIP, timestamp: new Date().toISOString(), location: country }],
      deviceFingerprints: [finger],
      fraudScore: startFraudScore,
      fraudFlags: startFlags,
      submissionHashes: [],
      loginHistory: [{ ip: currentSimulatedIP, country, timestamp: new Date().toISOString() }],
      isSuspended: startSuspended,
      suspensionReason: startSuspensionReason,
      isBanned: false,
      banReason: ''
    };

    const newUsers = [...users, newUser];
    setUsers(newUsers);
    
    // Trigger Duplicate group maps on signup if matches are detected
    if (otherAccsIP.length > 0) {
      addOrCreateDuplicateGroup([newUser.id, ...otherAccsIP.map(o => o.id)], currentSimulatedIP, 'ip');
      // Raise instant alerts for admin review
      const alertItem: FraudAlert = {
        id: `alert-${Date.now()}-ip`,
        type: 'IP Match',
        userId: newUser.id,
        userName: newUser.fullName,
        userEmail: newUser.email,
        fraudScore: 10,
        timestamp: new Date().toISOString(),
        status: 'pending' as const,
        details: `⚠️ IP Match during registration: Shared IP ${currentSimulatedIP} with ${otherAccsIP.length} accounts. Active auto-suspension.`,
        recommendedAction: 'Verify identity or merge profile logs'
      };
      setFraudAlerts(prev => [alertItem, ...prev]);
    }

    if (otherAccsFinger.length > 0) {
      addOrCreateDuplicateGroup([newUser.id, ...otherAccsFinger.map(o => o.id)], finger, 'fingerprint');
      const alertItem: FraudAlert = {
        id: `alert-${Date.now()}-fp`,
        type: 'Fingerprint Match',
        userId: newUser.id,
        userName: newUser.fullName,
        userEmail: newUser.email,
        fraudScore: 15,
        timestamp: new Date().toISOString(),
        status: 'pending' as const,
        details: `⚠️ Fingerprint Match during registration: Same hardware profile detected on registration matching ${otherAccsFinger.length} duplicate(s).`,
        recommendedAction: 'Check manual telemetry'
      };
      setFraudAlerts(prev => [alertItem, ...prev]);
    }

    // Add verification pending notification
    const verificationNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      userId: newUser.id,
      type: 'verification',
      title: startSuspended ? 'Account Suspended ⚠️' : 'Verification Pending',
      message: startSuspended 
        ? `Your account was automatically suspended because of multiple profiles matching current IP address ${currentSimulatedIP}.`
        : `Your Reddit profile (${newUser.redditUsername}) is currently under review. Verification typically takes up to 24 hours.`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [verificationNotif, ...prev]);

    setCurrentUser(newUser);
    return newUser;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const updateProfile = (fullName: string, redditUsername: string, redditProfileLink: string, gender?: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say') => {
    if (!currentUser) return;

    const needsReverification = 
      redditUsername !== currentUser.redditUsername || 
      redditProfileLink !== currentUser.redditProfileLink;

    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          fullName,
          redditUsername,
          redditProfileLink,
          gender, // Keep gender stored
          status: needsReverification ? ('Pending' as const) : u.status,
          rejectionReason: needsReverification ? undefined : u.rejectionReason
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    
    const updated = updatedUsers.find(u => u.id === currentUser.id)!;
    setCurrentUser(updated);

    if (needsReverification) {
      // Notify about re-verification
      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        userId: currentUser.id,
        type: 'verification',
        title: 'Re-verification Initiated',
        message: 'Your profile is back in Pending review status because your Reddit username or link was modified.',
        read: false,
        timestamp: new Date().toISOString()
      };
      setNotifications(prev => [notif, ...prev]);
    }
  };

  const changePassword = async (oldPw: string, newPw: string): Promise<void> => {
    // Standard mock change password
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 500);
    });
  };

  const deleteAccount = () => {
    if (!currentUser) return;
    setUsers(prev => prev.filter(u => u.id !== currentUser.id));
    setCurrentUser(null);
  };

  // Submit proof
  const submitTaskProof = async (taskId: string, proofUrl: string, submissionLink?: string): Promise<void> => {
    if (!currentUser) throw new Error('Unauthenticated');
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');

    // Anti-Cheat validation blocks
    let subStatus: 'Pending' | 'Rejected' = 'Pending';
    let feedback = '';
    let matchScore = 100;
    let aiConfidence = 'Match Score: 100% ✅ — Keywords found, correct subreddit, correct author';
    let isFlagged = false;
    let flagReason = '';

    // 1. IP blacklist check
    if (blacklistedIPs.includes(currentSimulatedIP)) {
      throw new Error(`❌ Submission rejected. Your IP address (${currentSimulatedIP}) has been blacklisted for violating our Terms of Service.`);
    }

    // 2. Duplicate screenshot detection (Image Hash)
    const imgHash = generateImageHash(proofUrl);
    // Search in previous submissions (including other users)
    const duplicateScreenshotSub = submissions.find(s => s.proofUrl && generateImageHash(s.proofUrl) === imgHash);
    if (duplicateScreenshotSub) {
      subStatus = 'Rejected';
      feedback = 'Auto-rejected: Duplicate screenshot detected. Please take your own original screenshot.';
      isFlagged = true;
      flagReason = 'Duplicate screenshot detected';

      // Alert Admin
      triggerFraudFlag(currentUser.id, "Duplicate Screenshot", `Duplicate screenshot uploaded. Matches submission ID: ${duplicateScreenshotSub.id}, originally uploaded by: ${duplicateScreenshotSub.redditUsername}`, 15);
    }

    // 3. Reddit URL Validator (run if no duplicate screenshot yet, or always for safety)
    const lowerUrl = (submissionLink || proofUrl || '').toLowerCase().trim();
    const isRedditLink = lowerUrl.includes('reddit.com') || lowerUrl.includes('redd.it');

    // Simulate Reddit API 404/deleted state or completely wrong link
    const isFakeLink = lowerUrl.includes('404') || lowerUrl.includes('removed') || lowerUrl.includes('deleted') || !isRedditLink || lowerUrl.length < 15;

    if (isFakeLink && subStatus === 'Pending') {
      subStatus = 'Rejected';
      feedback = 'Auto-rejected: Your submission was rejected. Reddit link does not exist (404 or Removed).';
      isFlagged = true;
      flagReason = 'Fake / deleted Reddit link submitted';
      
      triggerFraudFlag(currentUser.id, "Fake Reddit Link", `Member submitted a non-existent or deleted Reddit link for task "${task.title}": ${submissionLink || proofUrl}`, 20);
    }

    // Task type rule validation (Post Task vs. Comment Task)
    if (subStatus === 'Pending') {
      const isPostTask = task.type === 'post';
      // Comment link typically has extra deep segments after /comments/ID/title/
      const isCommentUrlRule = lowerUrl.includes('/comments/') && (lowerUrl.split('/comments/')[1]?.split('/').filter(Boolean).length > 2 || lowerUrl.includes('?comment=') || lowerUrl.includes('&comment='));
      const isPostUrlRule = lowerUrl.includes('/comments/') && !isCommentUrlRule;

      if (isPostTask && isCommentUrlRule) {
        subStatus = 'Rejected';
        feedback = 'Auto-rejected: Submitted a comment link on a Post task.';
        isFlagged = true;
        flagReason = 'Wrong task type submitted (Comment link for Post task)';
      } else if (!isPostTask && isPostUrlRule) {
        subStatus = 'Rejected';
        feedback = 'Auto-rejected: Submitted a post link on a Comment task.';
        isFlagged = true;
        flagReason = 'Wrong task type submitted (Post link for Comment task)';
      }
    }

    // Reddit Post Content Check (Subreddit, keywords, author)
    if (subStatus === 'Pending') {
      // A. Correct subreddit verification
      if (task.targetSubreddit) {
        const cleanSub = task.targetSubreddit.toLowerCase().replace(/^r\//, '').trim();
        const isInUrl = lowerUrl.includes(`/r/${cleanSub}`) || lowerUrl.includes(`r/${cleanSub}/`);
        const hasWrongSubFilter = lowerUrl.includes('wrongsubreddit');
        if (!isInUrl || hasWrongSubFilter) {
          subStatus = 'Rejected';
          feedback = `Auto-rejected: Submitted post is NOT in the correct subreddit. Required: r/${cleanSub}.`;
          isFlagged = true;
          flagReason = 'Wrong subreddit mismatch';
          triggerFraudFlag(currentUser.id, "Wrong Subreddit", `Member submitted post in incorrect subreddit for task "${task.title}": ${submissionLink || proofUrl}`, 10);
        }
      }
    }

    // B. Correct Author Crosscheck
    if (subStatus === 'Pending') {
      const cleanUser = currentUser.redditUsername.toLowerCase().replace(/^u\//, '').trim();
      const isWrongAuthorSim = lowerUrl.includes('wrong_author') || lowerUrl.includes('differentuser') || lowerUrl.includes('someoneelse');
      if (isWrongAuthorSim) {
        subStatus = 'Rejected';
        feedback = 'Auto-rejected: Reddit post author does not match your registered Reddit username.';
        isFlagged = true;
        flagReason = 'Wrong Reddit author mismatch';
        
        triggerFraudFlag(currentUser.id, "Wrong Reddit Author", `Member submitted someone else's post for task "${task.title}": ${submissionLink || proofUrl}`, 20);
      }
    }

    // Compute mock/simulated match score
    if (subStatus === 'Pending') {
      let score = 100;
      let reasons = [];
      
      const containsSimKeywordsError = lowerUrl.includes('missingkeywords');
      if (containsSimKeywordsError) {
        score -= 15;
        reasons.push('Some task guideline keywords are missing from description');
      }

      matchScore = score;
      if (score === 100) {
        aiConfidence = 'Match Score: 100% ✅ — Keywords found, correct subreddit, correct author';
      } else {
        aiConfidence = `Match Score: ${score}% 🟡 — Warnings: ${reasons.join(', ')}`;
      }
    } else {
      matchScore = 0;
      aiConfidence = `Match Score: 0% ❌ — Failed verification: ${flagReason}`;
    }

    // 4. Submission Speed Check
    let speedFlagged = false;
    if (task.claimed_at) {
      const claimTime = new Date(task.claimed_at).getTime();
      const submitTime = Date.now();
      const elapsedMinutes = (submitTime - claimTime) / 60000;

      // Under 2 minutes is suspicious speed
      if (elapsedMinutes < 2) {
        isFlagged = true;
        flagReason = flagReason ? `${flagReason}, Suspicious claim-to-submit speed` : '⚠️ Suspiciously fast submission';
        speedFlagged = true;
        // Member is NOT notified of the speed flag directly, status remains Pending if not already rejected, but is flagged for admin review
        triggerFraudFlag(currentUser.id, "Suspicious Speed", `Submitted campaign proof in extremely short time (${elapsedMinutes.toFixed(1)} minutes) after claiming.`, 10);
      }
    }

    // Create submission record
    const newSub: Submission = {
      id: `sub-${Date.now()}`,
      taskId: task.id,
      taskTitle: task.title,
      taskType: task.type,
      reward: task.reward * settings.globalMultiplier,
      userId: currentUser.id,
      userFullName: currentUser.fullName,
      redditUsername: currentUser.redditUsername,
      proofUrl,
      submissionLink,
      status: subStatus,
      feedback: feedback || undefined,
      submittedAt: new Date().toISOString(),
      matchScore,
      aiConfidence,
      isFlagged: isFlagged || speedFlagged,
      flagReason: flagReason || undefined
    };

    // Increment completed counts and update status to completed (claimed is now submitted and under review)
    // If auto-rejected, we return task claiming parameters to let them/others retry.
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          completedSubmissionsCount: subStatus === 'Rejected' ? t.completedSubmissionsCount : t.completedSubmissionsCount + 1,
          status: subStatus === 'Rejected' ? ('available' as const) : ('completed' as const),
          claimed_by: subStatus === 'Rejected' ? null : t.claimed_by,
          claimed_at: subStatus === 'Rejected' ? null : t.claimed_at,
          claim_expires_at: subStatus === 'Rejected' ? null : t.claim_expires_at
        };
      }
      return t;
    });

    // Update current user's pending balance and remove claim lock (cooldown is left active)
    const payout = task.reward * settings.globalMultiplier;
    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        const prevPending = u.pendingBalance || 0;
        return {
          ...u,
          pendingBalance: subStatus === 'Rejected' ? prevPending : Number((prevPending + payout).toFixed(2)),
          xp: 0, // Gain XP for submitting successfully (unless auto-rejected)
          active_task_id: null
        };
      }
      return u;
    });

    setSubmissions(prev => [newSub, ...prev]);
    setTasks(updatedTasks);
    setUsers(updatedUsers);
    syncUserToCurrent(currentUser.id, updatedUsers);

    // If auto-rejected, explain why in frontend alert!
    if (subStatus === 'Rejected') {
      throw new Error(`⚠️ Auto-rejected: ${feedback}`);
    }
  };

  // Request withdrawal
  const requestWithdrawal = async (amount: number, method: 'USDT_BEP20' | 'BINANCE_ID', address: string): Promise<void> => {
    if (!currentUser) throw new Error('Unauthenticated');
    if (currentUser.balance < amount) throw new Error('Insufficient available balance');
    if (amount < 1.00) throw new Error('Minimum withdrawal is 1.00 USDT');

    const newWithdrawal: Withdrawal = {
      id: `with-${Date.now()}`,
      userId: currentUser.id,
      userFullName: currentUser.fullName,
      email: currentUser.email,
      amount,
      withdrawalMethod: method,
      paymentAddress: address,
      requestedAt: new Date().toISOString(),
      status: 'Pending'
    };

    const newTx: Transaction = {
      id: `tx-with-${Date.now()}`,
      userId: currentUser.id,
      type: 'withdrawal',
      amount,
      description: `${method === 'USDT_BEP20' ? 'USDT BEP-20' : 'Binance ID'} Withdrawal`,
      date: new Date().toISOString(),
      status: 'Pending'
    };

    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          balance: Number((u.balance - amount).toFixed(2)),
          // We don't change 'withdrawn' until approved
        };
      }
      return u;
    });

    setWithdrawals(prev => [newWithdrawal, ...prev]);
    setTransactions(prev => [newTx, ...prev]);
    setUsers(updatedUsers);
    syncUserToCurrent(currentUser.id, updatedUsers);
  };

  // Create ticket
  const createTicket = (subject: string, category: SupportTicket['category'], description: string) => {
    if (!currentUser) return;

    const newTicket: SupportTicket = {
      id: `ticket-${Date.now()}`,
      userId: currentUser.id,
      userFullName: currentUser.fullName,
      subject,
      category,
      description,
      status: 'Open',
      messages: [
        {
          sender: 'user',
          text: description,
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString()
    };

    setTickets(prev => [newTicket, ...prev]);
  };

  // Reply ticket
  const replyToTicket = (ticketId: string, text: string, sender: 'user' | 'admin') => {
    setTickets(prev => prev.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: sender === 'admin' ? ('In Progress' as const) : ('Open' as const),
          messages: [
            ...t.messages,
            {
              sender,
              text,
              timestamp: new Date().toISOString()
            }
          ]
        };
      }
      return t;
    }));
  };

  // Handle Notifications
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAllNotifications = () => {
    if (!currentUser) return;
    setNotifications(prev => prev.filter(n => n.userId !== currentUser.id && n.userId !== 'all'));
  };

  // Claim Daily Streak
  const claimDailyStreak = () => {
    if (!currentUser) return;
    
    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        const nextStreak = u.streak + 1;
        const rewardBonus = Number((0.05 * nextStreak).toFixed(2)); // $0.05 per streak tier
        return {
          ...u,
          streak: nextStreak,
          balance: Number((u.balance + rewardBonus).toFixed(2)),
          totalEarned: Number((u.totalEarned + rewardBonus).toFixed(2)),
          xp: 0,
          lastLoginDate: new Date().toISOString().split('T')[0]
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    syncUserToCurrent(currentUser.id, updatedUsers);

    // Create notification
    const dailyBonus = Number((0.05 * (currentUser.streak + 1)).toFixed(2));
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      userId: currentUser.id,
      type: 'referral_bonus',
      title: 'Daily Streak Claimed! 🔥',
      message: `You earned active tier reward +$${dailyBonus} USDT and +25 XP. Keep your streak going!`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [notif, ...prev]);
  };

  // ================= ADMIN ACTIONS =================

  // 1. Approve signup
  const adminApproveUser = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    let updatedUsers = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'Approved' as const
        };
      }
      return u;
    });



    setUsers(updatedUsers);
    syncUserToCurrent(userId, updatedUsers);

    // Notify approved user
    const appNotif: AppNotification = {
      id: `notif-app-${Date.now()}`,
      userId,
      type: 'verification',
      title: 'Account Approved!',
      message: 'Your Reddit profile review is complete. Welcome! You now have unrestricted access to tasks, the wallet, and the marketplace.',
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [appNotif, ...prev]);
  };

  // 2. Reject verification
  const adminRejectUser = (userId: string, reason: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'Rejected' as const,
          rejectionReason: reason
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    syncUserToCurrent(userId, updatedUsers);

    // Notify rejected user
    const appNotif: AppNotification = {
      id: `notif-rej-${Date.now()}`,
      userId,
      type: 'verification',
      title: 'Verification Rejected',
      message: `Your registration could not be approved. Reason: "${reason}". Please update profile and trigger re-verification.`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [appNotif, ...prev]);
  };

  // 3. Ban profile
  const adminBanUser = (userId: string, reason: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'Banned' as const,
          rejectionReason: reason
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    
    // If current logged-in user is banned, log them out automatically
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(null);
    }
  };

  // 4. Create Task
  const adminCreateTask = (taskData: Omit<Task, 'id' | 'completedSubmissionsCount' | 'status'> & { isSpecial?: boolean; minKarmaRequired?: number; specialLabel?: string }) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      completedSubmissionsCount: 0,
      status: 'available' as const
    };

    setTasks(prev => [newTask, ...prev]);

    // Broadcast announcement (alert everyone a new task is up)
    const alertNotif: AppNotification = {
      id: `notif-task-${Date.now()}`,
      userId: 'all',
      type: 'new_task',
      title: 'New High-Paying Reddit Task!',
      message: `Task: "${newTask.title}" pays $${newTask.reward.toFixed(2)} USDT. Limit of ${newTask.maxSubmissions} slots available. Complete now!`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [alertNotif, ...prev]);
  };

  // 5. Edit Task
  const adminEditTask = (taskId: string, updatedData: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updatedData } : t));
  };

  // 6. Delete Task
  const adminDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // 7. Approve or Reject Submissions
  const adminReviewSubmission = (submissionId: string, status: 'Approved' | 'Rejected', feedback?: string) => {
    const sub = submissions.find(s => s.id === submissionId);
    if (!sub) return;

    // Update submission
    setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, status, feedback } : s));

    const payout = sub.reward;
    const updatedUsers = users.map(u => {
      if (u.id === sub.userId) {
        const nextPending = Math.max(0, Number((u.pendingBalance - payout).toFixed(2)));
        
        let nextBalance = u.balance;
        let nextTotalEarned = u.totalEarned;
        let nextXp = 0;

        if (status === 'Approved') {
          nextBalance = Number((u.balance + payout).toFixed(2));
          nextTotalEarned = Number((u.totalEarned + payout).toFixed(2));
          nextXp = 0; // Extra XP for approved complete!
        }

        return {
          ...u,
          balance: nextBalance,
          totalEarned: nextTotalEarned,
          pendingBalance: nextPending,
          xp: 0
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    syncUserToCurrent(sub.userId, updatedUsers);

    // Create Notification & Transaction
    const alertNotif: AppNotification = {
      id: `notif-rev-${Date.now()}`,
      userId: sub.userId,
      type: status === 'Approved' ? 'task_approved' : 'task_rejected',
      title: status === 'Approved' ? 'Task Submission Approved! 🎉' : 'Submission Rejected ⚠️',
      message: status === 'Approved' 
        ? `Great job! Your submission for "${sub.taskTitle}" is approved. +$${payout.toFixed(2)} USDT credited.` 
        : `Your submission for "${sub.taskTitle}" was rejected. Feedback: "${feedback || 'No guidelines met'}".`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [alertNotif, ...prev]);

    const proofTx: Transaction = {
      id: `tx-rev-${Date.now()}`,
      userId: sub.userId,
      type: 'earning',
      amount: payout,
      description: `Task complete: ${sub.taskTitle}`,
      date: new Date().toISOString(),
      status: status === 'Approved' ? 'Completed' : 'Rejected'
    };
    setTransactions(prev => [proofTx, ...prev]);
  };

  // 8. Review Withdrawal Requests
  const adminReviewWithdrawal = (withdrawalId: string, status: 'Approved' | 'Rejected') => {
    const w = withdrawals.find(item => item.id === withdrawalId);
    if (!w) return;

    setWithdrawals(prev => prev.map(item => item.id === withdrawalId ? { ...item, status } : item));

    const amount = w.amount;
    const updatedUsers = users.map(u => {
      if (u.id === w.userId) {
        let nextBalance = u.balance;
        let nextWithdrawn = u.withdrawn;

        if (status === 'Approved') {
          nextWithdrawn = Number((u.withdrawn + amount).toFixed(2));
        } else {
          // If rejected, fund goes back to available balance!
          nextBalance = Number((u.balance + amount).toFixed(2));
        }

        return {
          ...u,
          balance: nextBalance,
          withdrawn: nextWithdrawn
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    syncUserToCurrent(w.userId, updatedUsers);

    // Update withdrawal transactions in global transactions state
    setTransactions(prev => prev.map(tx => {
      // Find matching withdrawal transaction
      if (tx.userId === w.userId && tx.type === 'withdrawal' && tx.amount === amount && tx.status === 'Pending') {
        return {
          ...tx,
          status: status === 'Approved' ? 'Completed' as const : 'Rejected' as const
        };
      }
      return tx;
    }));

    // Alert User
    const wNotif: AppNotification = {
      id: `notif-with-${Date.now()}`,
      userId: w.userId,
      type: 'withdrawal_update',
      title: status === 'Approved' ? 'Withdrawal Successful' : 'Withdrawal Rejected',
      message: status === 'Approved'
        ? `Your cashout of $${amount.toFixed(2)} USDT has been successfully processed to ${w.paymentAddress}.`
        : `Your cashout of $${amount.toFixed(2)} USDT was rejected. Funds returned to wallet.`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [wNotif, ...prev]);
  };

  // 9. Platform Announcements
  const adminCreateAnnouncement = (title: string, message: string) => {
    const newAnn: AppNotification = {
      id: `ann-${Date.now()}`,
      userId: 'all',
      type: 'announcement',
      title,
      message,
      read: false,
      timestamp: new Date().toISOString()
    };

    setNotifications(prev => [newAnn, ...prev]);
  };

  const adminUpdateSettings = (updated: SystemSettings) => {
    setSettings(updated);
  };

  const getKarmaBadge = (karmaValue: number): 'Bronze' | 'Silver' | 'Gold' | 'Diamond' => {
    if (karmaValue < 1000) return 'Bronze';
    if (karmaValue < 5000) return 'Silver';
    if (karmaValue < 10000) return 'Gold';
    return 'Diamond';
  };

  // 1. Claim Task
  const claimTask = async (taskId: string): Promise<void> => {
    if (!currentUser) throw new Error('Unauthenticated');
    if (currentUser.status !== 'Approved') throw new Error('Your account is not approved yet.');
    
    const now = new Date();
    
    // Admin is completely exempt from cooldown rules, but standard user is not
    if (currentUser.role !== 'admin') {
      if (currentUser.cooldown_expires_at) {
        const cooldownDate = new Date(currentUser.cooldown_expires_at);
        if (cooldownDate > now) {
          const diffMs = cooldownDate.getTime() - now.getTime();
          const diffMins = Math.ceil(diffMs / 60000);
          throw new Error(`You are on cooldown. Next claim available in ${diffMins} minutes.`);
        }
      }
      if (currentUser.active_task_id) {
        throw new Error('You already have an active claimed task. Submit proof or let it expire first.');
      }
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    if (task.status !== 'available') throw new Error('This task is already claimed or completed');

    // Karma condition for Special Tasks
    if (task.isSpecial && task.minKarmaRequired) {
      if (currentUser.karma < task.minKarmaRequired) {
        throw new Error('You do not meet the karma requirement for this Special Task.');
      }
    }

    const claimExpires = new Date();
    claimExpires.setHours(claimExpires.getHours() + 1); // 1 hour deadline

    const cooldownExpires = new Date();
    cooldownExpires.setMinutes(cooldownExpires.getMinutes() + 30); // 30 minute cooldown starts now

    // Update task
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'claimed' as const,
          claimed_by: currentUser.id,
          claimed_at: now.toISOString(),
          claim_expires_at: claimExpires.toISOString()
        };
      }
      return t;
    });

    // Update current user
    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          active_task_id: taskId,
          last_claimed_at: now.toISOString(),
          cooldown_expires_at: currentUser.role === 'admin' ? null : cooldownExpires.toISOString()
        };
      }
      return u;
    });

    setTasks(updatedTasks);
    setUsers(updatedUsers);
    syncUserToCurrent(currentUser.id, updatedUsers);

    // Notification
    const notif: AppNotification = {
      id: `notif-claim-${Date.now()}`,
      userId: currentUser.id,
      type: 'new_task',
      title: 'Task Claimed Successfully! ✅',
      message: `You claimed "${task.title}". Submit proof within 1 hour or it will be returned.`,
      read: false,
      timestamp: now.toISOString()
    };
    setNotifications(prev => [notif, ...prev]);
  };

  // 2. Unclaim Task
  const unclaimTask = (taskId: string, notifyExpired: boolean = false) => {
    // Find task
    let claimantId: string | null = null;
    let taskTitle = '';
    
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        claimantId = t.claimed_by || null;
        taskTitle = t.title;
        return {
          ...t,
          status: 'available' as const,
          claimed_by: null,
          claimed_at: null,
          claim_expires_at: null
        };
      }
      return t;
    });

    setTasks(updatedTasks);

    if (claimantId) {
      const updatedUsers = users.map(u => {
        if (u.id === claimantId) {
          return {
            ...u,
            active_task_id: null,
            // If expired, reset cooldown as a fair penalty
            cooldown_expires_at: notifyExpired ? null : u.cooldown_expires_at
          };
        }
        return u;
      });
      setUsers(updatedUsers);
      syncUserToCurrent(claimantId, updatedUsers);

      if (notifyExpired) {
        const notif: AppNotification = {
          id: `notif-expiry-${Date.now()}`,
          userId: claimantId,
          type: 'task_rejected',
          title: 'Claim Expired ❌',
          message: `Your claim on "${taskTitle}" expired. Task returned to available pool.`,
          read: false,
          timestamp: new Date().toISOString()
        };
        setNotifications(prev => [notif, ...prev]);
      }
    }
  };

  // 3. Admin force unclaim
  const forceUnclaimTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const claimantId = task.claimed_by;
    
    unclaimTask(taskId, false);

    if (claimantId) {
      const notif: AppNotification = {
        id: `notif-force-unclaim-${Date.now()}`,
        userId: claimantId,
        type: 'task_rejected',
        title: 'Task Unclaimed by Admin ⚠️',
        message: `Your claim on "${task.title}" was manually released by an administrator.`,
        read: false,
        timestamp: new Date().toISOString()
      };
      setNotifications(prev => [notif, ...prev]);
    }
  };

  // 4. Admin extend user deadline (by 30 mins)
  const extendUserDeadline = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.claim_expires_at) {
        const currentExp = new Date(t.claim_expires_at);
        currentExp.setMinutes(currentExp.getMinutes() + 30);
        
        if (t.claimed_by) {
          const notif: AppNotification = {
            id: `notif-extend-${Date.now()}`,
            userId: t.claimed_by,
            type: 'verification',
            title: 'Deadline Extended! ⏰',
            message: `An admin has extended your submission deadline for "${t.title}" by 30 minutes!`,
            read: false,
            timestamp: new Date().toISOString()
          };
          setNotifications(prevNotifs => [notif, ...prevNotifs]);
        }

        return {
          ...t,
          claim_expires_at: currentExp.toISOString()
        };
      }
      return t;
    }));
  };

  // 5. Admin Reset Cooldown
  const resetCooldown = (userId: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          cooldown_expires_at: null
        };
      }
      return u;
    });
    setUsers(updatedUsers);
    syncUserToCurrent(userId, updatedUsers);

    const notif: AppNotification = {
      id: `notif-reset-cooldown-${Date.now()}`,
      userId: userId,
      type: 'verification',
      title: 'Cooldown Reset! ⏳',
      message: 'Your claiming cooldown was manually reset by an admin. You can claim another task immediately!',
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [notif, ...prev]);
  };

  // 6. Admin Update User Karma
  const adminUpdateUserKarma = (userId: string, targetKarma: number) => {
    let triggeredThresholdNotification = false;
    
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        const badge = getKarmaBadge(targetKarma);
        
        // Threshold check
        const thresholds = [1000, 5000, 10000];
        const crossedNow = thresholds.some(t => u.karma < t && targetKarma >= t);
        if (crossedNow) {
          triggeredThresholdNotification = true;
        }

        return {
          ...u,
          karma: targetKarma,
          karmaBadge: badge,
          karmaYesterday: u.karmaYesterday ?? targetKarma
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    syncUserToCurrent(userId, updatedUsers);

    if (triggeredThresholdNotification) {
      const notif: AppNotification = {
        id: `notif-karma-eligible-${Date.now()}`,
        userId: userId,
        type: "verification",
        title: "Eligible for Special Tasks! ⭐",
        message: "You're now eligible for Special Tasks! Check the task board for unlocked high-paying campaigns.",
        read: false,
        timestamp: new Date().toISOString()
      };
      setNotifications(prev => [notif, ...prev]);
    }
  };

  const syncRedditKarma = async () => {
    if (!currentUser) return;

    const cleanUser = currentUser.redditUsername.replace(/^u\//i, '').trim();
    const oldKarma = currentUser.karma || 0;

    try {
      const response = await fetch(`https://www.reddit.com/user/${cleanUser}/about.json`);
      if (!response.ok) {
        throw new Error(`Reddit API returned status ${response.status}`);
      }
      const data = await response.json();
      if (!data || !data.data || typeof data.data.total_karma !== 'number') {
        throw new Error('Invalid response structure from Reddit API');
      }

      const realKarma = data.data.total_karma;
      const badge = getKarmaBadge(realKarma);

      const updatedUsers = users.map(u => {
        if (u.id === currentUser.id) {
          return {
            ...u,
            karma: realKarma,
            karmaYesterday: u.karma, // Set previous karma to yesterday’s karma baseline securely
            karmaBadge: badge,
            karmaLastSynced: new Date().toISOString()
          };
        }
        return u;
      });

      setUsers(updatedUsers);
      syncUserToCurrent(currentUser.id, updatedUsers);

      const notif: AppNotification = {
        id: `notif-reddit-sync-${Date.now()}`,
        userId: currentUser.id,
        type: 'verification',
        title: 'Reddit Karma Synced! 🔄',
        message: `Your Reddit account was successfully synced. Karma updated: ${oldKarma.toLocaleString()} ➔ ${realKarma.toLocaleString()}.`,
        read: false,
        timestamp: new Date().toISOString()
      };
      setNotifications(prev => [notif, ...prev]);

    } catch (err) {
      console.error('Reddit karma sync failed:', err);
      // Keep last known karma value unchanged, never modify stored karma on failed sync, and throw error
      throw new Error("Sync failed — showing last known karma");
    }
  };

  // ================= CLIENT CORE LOGIC IMPLEMENTATION =================

  const clientRegister = async (clientData: Omit<Client, 'id' | 'status' | 'registeredAt' | 'payAgencyBalance' | 'payAgencyHistory' | 'taskUploadEnabled'>): Promise<Client> => {
    const existing = clients.find(c => c.gmail.toLowerCase() === clientData.gmail.toLowerCase());
    if (existing) {
      throw new Error('This Gmail address is already registered.');
    }

    const newClient: Client = {
      ...clientData,
      id: `client-${Date.now()}`,
      status: 'pending',
      taskUploadEnabled: true,
      registeredAt: new Date().toISOString(),
      payAgencyBalance: 0,
      payAgencyHistory: []
    };

    setClients(prev => [...prev, newClient]);
    
    // Create admin notification
    const adminNotif: AppNotification = {
      id: `notif-client-reg-${Date.now()}`,
      userId: 'admin-1',
      type: 'client_update',
      title: '🆕 New Client Registered',
      message: `${newClient.name} from ${newClient.company} (${newClient.country}) registered. Gmail verified: ✅. Status: Pending review.`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [adminNotif, ...prev]);

    return newClient;
  };

  const clientLogin = async (email: string, password: string): Promise<Client> => {
    const client = clients.find(c => c.gmail.toLowerCase() === email.toLowerCase());
    if (!client) {
      throw new Error('No client account found with this email.');
    }

    if (client.status === 'suspended') {
      throw new Error('This client account has been suspended by an administrator.');
    }

    if (client.password && client.password !== password) {
      throw new Error('Invalid password.');
    }

    setCurrentClient(client);
    
    // Set a matching User object inside currentUser to enable general profile state references
    const clientUser: User = {
      id: client.id,
      fullName: client.name,
      email: client.gmail,
      redditUsername: `client_${client.id}`,
      redditProfileLink: '',
      status: client.status === 'approved' ? 'Approved' : client.status === 'rejected' ? 'Rejected' : client.status === 'suspended' ? 'Banned' : 'Pending',
      referralCode: '',
      streak: 0,
      xp: 0,
      balance: 0,
      totalEarned: 0,
      pendingBalance: 0,
      withdrawn: 0,
      joinDate: client.registeredAt,
      role: 'client',
      karma: 0,
      karmaYesterday: 0
    };
    setCurrentUser(clientUser);

    return client;
  };

  const clientLogout = () => {
    setCurrentClient(null);
    setCurrentUser(null);
  };

  const clientCreateTask = async (taskData: {
    type: TaskType;
    title: string;
    description: string;
    targetSubreddit?: string;
    postUrlToCommentOn?: string;
    guidelines: string;
    deadline: string;
    notes?: string;
    agencyPay: number;
  }): Promise<void> => {
    if (!currentClient) throw new Error('Unauthenticated');
    if (settings.disableAllClientUploads) {
      throw new Error('Task upload is temporarily disabled globally.');
    }
    const clientRecord = clients.find(c => c.id === currentClient.id);
    if (clientRecord && !clientRecord.taskUploadEnabled) {
      throw new Error('Task upload is temporarily disabled for your profile.');
    }

    const newTask: ClientTask = {
      ...taskData,
      id: `ctask-${Date.now()}`,
      clientId: currentClient.id,
      clientName: currentClient.name,
      status: 'pending',
      disputeRaised: false
    };

    setClientTasks(prev => [newTask, ...prev]);

    const adminNotif: AppNotification = {
      id: `notif-client-task-${Date.now()}`,
      userId: 'admin-1',
      type: 'client_update',
      title: '📋 Client Uploaded Campaign Review',
      message: `Client "${currentClient.name}" uploaded task "${newTask.title}" for $${newTask.agencyPay.toFixed(2)} USDT.`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [adminNotif, ...prev]);
  };

  const clientReviewTaskSubmission = async (taskId: string, action: 'Approve' | 'RequestRevision' | 'Reject', feedback?: string): Promise<void> => {
    setClientTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const isApprove = action === 'Approve';
        const isRevision = action === 'RequestRevision';
        
        if (t.claimedBy) {
          const mNotif: AppNotification = {
            id: `notif-client-review-${Date.now()}`,
            userId: t.claimedBy,
            type: isApprove ? 'task_approved' : 'task_rejected',
            title: isApprove ? 'Task Approved by Client! 🎉' : isRevision ? '🔄 Revision Requested for Task' : '❌ Task Submission Rejected by Client',
            message: isApprove 
              ? `Your submission for "${t.title}" was approved by the client. $${(t.memberPay || 0).toFixed(2)} USDT credited.` 
              : isRevision 
                ? `The client requested a revision for "${t.title}". Note: "${feedback || 'Please follow guidelines'}". Resubmit within 1 hour.`
                : `Your submission for "${t.title}" was rejected by the client. Reason: "${feedback || 'No instructions followed'}". You can raise a dispute in your dashboard.`,
            read: false,
            timestamp: new Date().toISOString()
          };
          setNotifications(prevNotifs => [mNotif, ...prevNotifs]);
        }

        if (isApprove) {
          const mPay = t.memberPay || 0;
          const aPay = t.agencyPay;
          
          if (t.claimedBy) {
            setUsers(prevUsers => prevUsers.map(u => {
              if (u.id === t.claimedBy) {
                const nextBalance = Number((u.balance + mPay).toFixed(2));
                const nextTotalEarned = Number((u.totalEarned + mPay).toFixed(2));
                const nextPending = Math.max(0, Number((u.pendingBalance - mPay).toFixed(2)));
                
                return {
                  ...u,
                  balance: nextBalance,
                  totalEarned: nextTotalEarned,
                  pendingBalance: nextPending,
                  xp: 0
                };
              }
              return u;
            }));

            const earningTx: Transaction = {
              id: `tx-client-earn-${Date.now()}`,
              userId: t.claimedBy,
              type: 'earning',
              amount: mPay,
              description: `Completed client campaign: ${t.title}`,
              date: new Date().toISOString(),
              status: 'Completed'
            };
            setTransactions(prevTxs => [earningTx, ...prevTxs]);
          }

          setClients(prevClients => prevClients.map(c => {
            if (c.id === t.clientId) {
              return {
                ...c,
                payAgencyBalance: Number((c.payAgencyBalance + aPay).toFixed(2))
              };
            }
            return c;
          }));

          const adminBalanceNotif: AppNotification = {
            id: `notif-client-due-${Date.now()}`,
            userId: 'admin-1',
            type: 'client_update',
            title: '💰 Client Balance Outstanding Update',
            message: `Client "${t.clientName}" completed a task, adding $${aPay.toFixed(2)} USDT to their balance.`,
            read: false,
            timestamp: new Date().toISOString()
          };
          setNotifications(prevNotifs => [adminBalanceNotif, ...prevNotifs]);

          return {
            ...t,
            status: 'completed',
            approvedByClient: true,
            approvedByAdmin: true
          };
        } else if (isRevision) {
          return {
            ...t,
            status: 'revision',
            revisionNote: feedback ?? 'Revision requested'
          };
        } else {
          return {
            ...t,
            approvedByClient: false,
            revisionNote: feedback ?? 'Rejected by client'
          };
        }
      }
      return t;
    }));
  };

  const memberClaimClientTask = async (taskId: string): Promise<void> => {
    if (!currentUser) throw new Error('Unauthenticated');
    if (currentUser.status !== 'Approved') throw new Error('Your account is not approved yet.');
    
    const now = new Date();
    if (currentUser.role !== 'admin') {
      if (currentUser.cooldown_expires_at) {
        const cooldownDate = new Date(currentUser.cooldown_expires_at);
        if (cooldownDate > now) {
          const diffMs = cooldownDate.getTime() - now.getTime();
          const diffMins = Math.ceil(diffMs / 60000);
          throw new Error(`You are on cooldown. Next claim available in ${diffMins} minutes.`);
        }
      }
      if (currentUser.active_task_id) {
        throw new Error('You already have an active claimed task.');
      }
    }

    const t = clientTasks.find(ct => ct.id === taskId);
    if (!t) throw new Error('Task not found');
    if (t.status !== 'live') throw new Error('This task is not available for claiming.');

    const claimExp = new Date();
    claimExp.setHours(claimExp.getHours() + 1);
    const cooldownExp = new Date();
    cooldownExp.setMinutes(cooldownExp.getMinutes() + 30);

    setClientTasks(prev => prev.map(item => {
      if (item.id === taskId) {
        return {
          ...item,
          status: 'claimed',
          claimedBy: currentUser.id,
          claimedAt: now.toISOString(),
          completionDeadline: claimExp.toISOString()
        };
      }
      return item;
    }));

    setUsers(prevUsers => prevUsers.map(u => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          active_task_id: taskId,
          last_claimed_at: now.toISOString(),
          cooldown_expires_at: currentUser.role === 'admin' ? null : cooldownExp.toISOString()
        };
      }
      return u;
    }));
    
    if (currentUser) {
      setCurrentUser(prevUser => prevUser ? {
        ...prevUser,
        active_task_id: taskId,
        last_claimed_at: now.toISOString(),
        cooldown_expires_at: currentUser.role === 'admin' ? null : cooldownExp.toISOString()
      } : null);
    }

    const notif: AppNotification = {
      id: `notif-client-claim-${Date.now()}`,
      userId: currentUser.id,
      type: 'new_task',
      title: 'Campaign Claimed! ✅',
      message: `You claimed "${t.title}". Please submit your proof within 1 hour limit.`,
      read: false,
      timestamp: now.toISOString()
    };
    setNotifications(prev => [notif, ...prev]);
  };

  const memberSubmitClientTaskProof = async (taskId: string, proofLink: string): Promise<void> => {
    if (!currentUser) throw new Error('Unauthenticated');
    const t = clientTasks.find(ct => ct.id === taskId);
    if (!t) throw new Error('Task not found');

    const mPay = t.memberPay || 0;

    setClientTasks(prev => prev.map(item => {
      if (item.id === taskId) {
        return {
          ...item,
          status: 'submitted',
          proofLink,
          submittedAt: new Date().toISOString()
        };
      }
      return item;
    }));

    setUsers(prevUsers => prevUsers.map(u => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          active_task_id: null,
          pendingBalance: Number((u.pendingBalance + mPay).toFixed(2)),
          xp: 0
        };
      }
      return u;
    }));

    if (currentUser) {
      setCurrentUser(prevUser => prevUser ? {
        ...prevUser,
        active_task_id: null,
        pendingBalance: Number((prevUser.pendingBalance + mPay).toFixed(2)),
        xp: 0
      } : null);
    }

    const clientNotif: AppNotification = {
      id: `notif-client-proof-${Date.now()}`,
      userId: t.clientId,
      type: 'client_update',
      title: '🔗 Proof Submitted for Review',
      message: `Creator "${currentUser.fullName}" submitted proof for task "${t.title}". Review is outstanding.`,
      read: false,
      timestamp: new Date().toISOString()
    };
    const adminNotif: AppNotification = {
      id: `notif-admin-proof-${Date.now()}`,
      userId: 'admin-1',
      type: 'client_update',
      title: '🔗 Member Proof Submitted',
      message: `Member "${currentUser.fullName}" submitted proof for client task "${t.title}".`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [clientNotif, adminNotif, ...prev]);
  };

  const memberRaiseDispute = async (taskId: string, reason: string): Promise<void> => {
    if (!currentUser) throw new Error('Unauthenticated');
    const t = clientTasks.find(ct => ct.id === taskId);
    if (!t) throw new Error('Task not found');

    setClientTasks(prev => prev.map(item => {
      if (item.id === taskId) {
        return {
          ...item,
          disputeRaised: true,
          disputeReason: reason
        };
      }
      return item;
    }));

    const adminNotif: AppNotification = {
      id: `notif-admin-dispute-${Date.now()}`,
      userId: 'admin-1',
      type: 'dispute',
      title: '🚩 Member Raised Task Dispute',
      message: `Member "${currentUser.fullName}" raised dispute on task: "${t.title}". Reason: "${reason}".`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [adminNotif, ...prev]);
  };

  const memberRequestPayout = async (amount: number, address: string, method: 'USDT_BEP20' | 'BINANCE_ID'): Promise<void> => {
    if (!currentUser) throw new Error('Unauthenticated');
    if (currentUser.balance < amount) throw new Error('Insufficient wallet balance.');
    if (amount < 1.00) throw new Error('Minimum withdrawal is 1.00 USDT.');

    // Timezone IST validation (UTC+5:30)
    const localTime = new Date();
    const utcTime = localTime.getTime() + localTime.getTimezoneOffset() * 60000;
    const istTime = new Date(utcTime + 330 * 60000); 
    const day = istTime.getDay(); // 0 = Sunday
    if (day !== 0) {
      throw new Error('Payout requests can only be submitted on Sundays IST timezone (UTC+5:30).');
    }

    const newRequest: PayoutRequest = {
      id: `payout-${Date.now()}`,
      amount,
      address,
      method,
      date: new Date().toISOString(),
      status: 'Pending'
    };

    setUsers(prevUsers => prevUsers.map(u => {
      if (u.id === currentUser.id) {
        const reqs = u.payoutRequests ? [newRequest, ...u.payoutRequests] : [newRequest];
        return {
          ...u,
          balance: Number((u.balance - amount).toFixed(2)),
          lastPayoutRequestDate: new Date().toISOString(),
          payoutRequests: reqs
        };
      }
      return u;
    }));

    if (currentUser) {
      setCurrentUser(prevUser => prevUser ? {
        ...prevUser,
        balance: Number((prevUser.balance - amount).toFixed(2)),
        lastPayoutRequestDate: new Date().toISOString(),
        payoutRequests: prevUser.payoutRequests ? [newRequest, ...prevUser.payoutRequests] : [newRequest]
      } : null);
    }

    const notif: AppNotification = {
      id: `notif-payout-req-${Date.now()}`,
      userId: currentUser.id,
      type: 'withdrawal_update',
      title: 'Payout Request Placed',
      message: `Your withdrawal request of $${amount.toFixed(2)} USDT Sunday disbursement is submitted successfully.`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [notif, ...prev]);

    const adminWithdrawal: Withdrawal = {
      id: `mwith-${Date.now()}`,
      userId: currentUser.id,
      userFullName: currentUser.fullName,
      email: currentUser.email,
      amount,
      withdrawalMethod: method,
      paymentAddress: address,
      requestedAt: new Date().toISOString(),
      status: 'Pending'
    };
    setWithdrawals(prev => [adminWithdrawal, ...prev]);
  };

  const adminReviewClient = (clientId: string, status: 'approved' | 'rejected' | 'suspended', reason?: string) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const cNotif: AppNotification = {
          id: `notif-client-status-${Date.now()}`,
          userId: clientId,
          type: 'client_update',
          title: status === 'approved' ? '✅ Client Account Approved' : status === 'rejected' ? '❌ Client Account Rejected' : '🚫 Client Account Suspended',
          message: status === 'approved' 
            ? 'Access your full campaigns client dashboard, customize targets and manage influencer payments!'
            : status === 'rejected'
              ? `Your client request was rejected. Reason: "${reason || 'Refined details required'}".`
              : `Your account was temporarily suspended by an administrator. Please contact support at verseinfluencer@yahoo.com.`,
          read: false,
          timestamp: new Date().toISOString()
        };
        setNotifications(prevNotifs => [cNotif, ...prevNotifs]);

        return {
          ...c,
          status,
          rejectionReason: reason,
          approvedAt: status === 'approved' ? new Date().toISOString() : c.approvedAt
        };
      }
      return c;
    }));
  };

  const adminToggleTaskUpload = (clientId: string, enabled: boolean) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const cNotif: AppNotification = {
          id: `notif-client-upload-${Date.now()}`,
          userId: clientId,
          type: 'client_update',
          title: enabled ? '⬆️ Task Upload Re-enabled' : '⬇️ Task Upload Disabled',
          message: enabled ? 'Task upload has been re-enabled for your profile!' : 'Your brand has been restricted from launching new tasks. Contact admin.',
          read: false,
          timestamp: new Date().toISOString()
        };
        setNotifications(prevNotifs => [cNotif, ...prevNotifs]);
        return {
          ...c,
          taskUploadEnabled: enabled
        };
      }
      return c;
    }));
  };

  const adminToggleGlobalTaskUpload = (disabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      disableAllClientUploads: disabled
    }));

    clients.forEach(c => {
      const cNotif: AppNotification = {
        id: `notif-client-global-${Date.now()}-${c.id}`,
        userId: c.id,
        type: 'client_update',
        title: disabled ? '⬇️ Task Upload Suspended Globally' : '⬆️ Task Upload Active Globally',
        message: disabled ? 'Task upload has been temporarily disabled globally by administrator.' : 'Global uploads are active again.',
        read: false,
        timestamp: new Date().toISOString()
      };
      setNotifications(prevNotifs => [cNotif, ...prevNotifs]);
    });
  };

  const adminReviewClientTask = (taskId: string, action: 'publish' | 'reject', memberPay?: number) => {
    setClientTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const isPublish = action === 'publish';
        const finalMemberPay = memberPay || (t.agencyPay * 0.85);
        
        const cNotif: AppNotification = {
          id: `notif-client-task-status-${Date.now()}`,
          userId: t.clientId,
          type: 'client_update',
          title: isPublish ? '📋 Your Campaign is Live!' : '❌ Client Task Rejected',
          message: isPublish 
            ? `Your task "${t.title}" was verified and published. Live campaigns page available.`
            : `Your task "${t.title}" was not approved by moderator. Refine guidelines and re-upload.`,
          read: false,
          timestamp: new Date().toISOString()
        };
        setNotifications(prevNotifs => [cNotif, ...prevNotifs]);

        if (isPublish) {
          const mNotif: AppNotification = {
            id: `notif-mem-client-task-${Date.now()}`,
            userId: 'all',
            type: 'new_task',
            title: t.title,
            message: `New brand mission live: "${t.title}". Complete comments or posts to earn high rewards!`,
            read: false,
            timestamp: new Date().toISOString()
          };
          setNotifications(prevNotifs => [mNotif, ...prevNotifs]);

          return {
            ...t,
            status: 'live',
            memberPay: finalMemberPay
          };
        } else {
          return {
            ...t,
            status: 'removed'
          };
        }
      }
      return t;
    }));
  };

  const adminResolveDispute = async (taskId: string, outcome: 'force_approved' | 'upheld'): Promise<void> => {
    setClientTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const isForce = outcome === 'force_approved';
        
        if (t.claimedBy) {
          const mNotif: AppNotification = {
            id: `notif-dispute-outcome-${Date.now()}`,
            userId: t.claimedBy,
            type: 'dispute',
            title: isForce ? '🚩 Dispute Resolved: Force Approved! 🎉' : '❌ Dispute Resolved: Rejection Upheld',
            message: isForce 
              ? `Your dispute on "${t.title}" was approved by an admin. $${(t.memberPay || 0).toFixed(2)} USDT credited.` 
              : `The admin upheld the client's rejection of your proof for "${t.title}". No payout applied.`,
            read: false,
            timestamp: new Date().toISOString()
          };
          setNotifications(prevNotifs => [mNotif, ...prevNotifs]);
        }

        const cNotif: AppNotification = {
          id: `notif-dispute-client-${Date.now()}`,
          userId: t.clientId,
          type: 'dispute',
          title: isForce ? '🔄 Admin Force Approved Disputed Task' : '✅ Dispute Outcome: Rejection Upheld',
          message: isForce 
            ? `Admin force approved task "${t.title}" in favor of the creator. $${t.agencyPay.toFixed(2)} added to pay balance.`
            : `Admin upheld your rejection of "${t.title}". No action required.`,
          read: false,
          timestamp: new Date().toISOString()
        };
        setNotifications(prevNotifs => [cNotif, ...prevNotifs]);

        if (isForce) {
          const mPay = t.memberPay || 0;
          const aPay = t.agencyPay;
          
          if (t.claimedBy) {
            setUsers(prevUsers => prevUsers.map(u => {
              if (u.id === t.claimedBy) {
                return {
                  ...u,
                  balance: Number((u.balance + mPay).toFixed(2)),
                  totalEarned: Number((u.totalEarned + mPay).toFixed(2)),
                  pendingBalance: Math.max(0, Number((u.pendingBalance - mPay).toFixed(2)))
                };
              }
              return u;
            }));

            const earningTx: Transaction = {
              id: `tx-force-approve-${Date.now()}`,
              userId: t.claimedBy,
              type: 'earning',
              amount: mPay,
              description: `Dispute Approved Client Campaign: ${t.title}`,
              date: new Date().toISOString(),
              status: 'Completed'
            };
            setTransactions(prevTxs => [earningTx, ...prevTxs]);
          }

          setClients(prevClients => prevClients.map(c => {
            if (c.id === t.clientId) {
              return {
                ...c,
                payAgencyBalance: Number((c.payAgencyBalance + aPay).toFixed(2))
              };
            }
            return c;
          }));

          return {
            ...t,
            status: 'completed',
            approvedByAdmin: true,
            approvedByClient: true,
            disputeOutcome: 'force_approved'
          };
        } else {
          if (t.claimedBy) {
            setUsers(prevUsers => prevUsers.map(u => {
              if (u.id === t.claimedBy) {
                return {
                  ...u,
                  pendingBalance: Math.max(0, Number((u.pendingBalance - (t.memberPay || 0)).toFixed(2)))
                };
              }
              return u;
            }));
          }
          return {
            ...t,
            status: 'removed',
            disputeOutcome: 'upheld'
          };
        }
      }
      return t;
    }));
  };

  const adminConfirmClientPayment = async (clientId: string, amount: number, referenceNote?: string, receiptUrl?: string): Promise<void> => {
    const paymentId = `pay-${Date.now()}`;
    const newPayment: ClientPayment = {
      id: paymentId,
      clientId,
      clientName: clients.find(c => c.id === clientId)?.name || 'Client',
      amount,
      tasksIncluded: clientTasks.filter(t => t.clientId === clientId && t.status === 'completed').map(t => t.id),
      paidAt: new Date().toISOString(),
      receiptUrl: receiptUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=300&h=400&q=80',
      markedPaidBy: 'kalloldeyprivate20@gmail.com',
      referenceNote
    };

    setClientPayments(prev => [newPayment, ...prev]);

    setClients(prevClients => prevClients.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          payAgencyBalance: 0,
          payAgencyHistory: [newPayment, ...(c.payAgencyHistory || [])]
        };
      }
      return c;
    }));

    const cNotif: AppNotification = {
      id: `notif-receipt-upload-${Date.now()}`,
      userId: clientId,
      type: 'client_update',
      title: 'Payment Confirmed ✅',
      message: `Receipt confirmed for $${amount.toFixed(2)} USDT by moderator. Your balance has been reset. Receipt details available.`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [cNotif, ...prev]);
  };

  const adminReviewPayout = async (requestId: string, status: 'Approved' | 'Rejected'): Promise<void> => {
    setWithdrawals(prev => prev.map(w => {
      if (w.id === requestId) {
        return { ...w, status };
      }
      return w;
    }));

    setUsers(prevUsers => prevUsers.map(u => {
      if (u.payoutRequests?.some(r => r.id === requestId)) {
        const nextReqs = u.payoutRequests.map(r => {
          if (r.id === requestId) {
            return { ...r, status };
          }
          return r;
        });

        const targetReq = u.payoutRequests.find(r => r.id === requestId)!;
        let nextBalance = u.balance;
        let nextWithdrawn = u.withdrawn;
        
        if (status === 'Approved') {
          nextWithdrawn = Number((u.withdrawn + targetReq.amount).toFixed(2));
        } else {
          nextBalance = Number((u.balance + targetReq.amount).toFixed(2));
        }

        return {
          ...u,
          balance: nextBalance,
          withdrawn: nextWithdrawn,
          payoutRequests: nextReqs
        };
      }
      return u;
    }));
  };

  const adminDeductMember = (userId: string, taskId: string, taskName: string, amount: number, reason: string) => {
    const decRecord: DeductionRecord = {
      id: `deduct-${Date.now()}`,
      amount,
      taskName,
      reason,
      date: new Date().toISOString()
    };

    setUsers(prevUsers => prevUsers.map(u => {
      if (u.id === userId) {
        const history = u.deductionHistory ? [decRecord, ...u.deductionHistory] : [decRecord];
        const nextBalance = Number((u.balance - amount).toFixed(2));
        
        return {
          ...u,
          balance: nextBalance,
          deductionHistory: history
        };
      }
      return u;
    }));

    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prevUser => prevUser ? {
        ...prevUser,
        balance: Number((prevUser.balance - amount).toFixed(2)),
        deductionHistory: prevUser.deductionHistory ? [decRecord, ...prevUser.deductionHistory] : [decRecord]
      } : null);
    }

    const negTx: Transaction = {
      id: `tx-deduct-${Date.now()}`,
      userId,
      type: 'deduction',
      amount,
      description: `Deduction: ${taskName} - ${reason}`,
      date: new Date().toISOString(),
      status: 'Completed'
    };
    setTransactions(prev => [negTx, ...prev]);

    const mNotif: AppNotification = {
      id: `notif-deduction-${Date.now()}`,
      userId,
      type: 'task_rejected',
      title: '❌ Balance Deduction Applied',
      message: `❌ $${amount.toFixed(2)} USDT deducted from your wallet. Reason: Task "${taskName}" was removed after client payment confirmation.`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [mNotif, ...prev]);
  };

  const adminRemoveCompletedTask = (taskId: string) => {
    setClientTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const isClientPaid = clients.find(c => c.id === t.clientId)?.payAgencyHistory?.some(pay => pay.tasksIncluded.includes(taskId)) || false;
        
        if (!isClientPaid) {
          // Scenario A — Removed BEFORE client pays
          if (t.claimedBy) {
            const mNotif: AppNotification = {
              id: `notif-relist-${Date.now()}`,
              userId: t.claimedBy,
              type: 'new_task',
              title: 'Task Relisted by Admin',
              message: `Task "${t.title}" was removed prior to payment and relisted. No balance deductions applied.`,
              read: false,
              timestamp: new Date().toISOString()
            };
            setNotifications(prevNotifs => [mNotif, ...prevNotifs]);
            
            // Revert member rewards from completed status
            setUsers(prevUsers => prevUsers.map(u => {
              if (u.id === t.claimedBy) {
                return {
                  ...u,
                  balance: Math.max(0, Number((u.balance - (t.memberPay || 0)).toFixed(2))),
                  totalEarned: Math.max(0, Number((u.totalEarned - (t.memberPay || 0)).toFixed(2)))
                };
              }
              return u;
            }));
          }

          return {
            ...t,
            status: 'live',
            claimedBy: null,
            proofLink: null,
            submittedAt: null,
            approvedByAdmin: false,
            approvedByClient: false
          } as ClientTask;
        } else {
          // Scenario B — Removed AFTER client pays
          if (t.claimedBy) {
            adminDeductMember(t.claimedBy, taskId, t.title, t.memberPay || 0, 'Completed campaign audit removal post-payment');
          }
          return {
            ...t,
            status: 'removed',
            removedAt: new Date().toISOString(),
            removedAfterPayment: true
          } as ClientTask;
        }
      }
      return t;
    }));
  };

  const clientSendMessage = async (text: string, fileUrl?: string): Promise<void> => {
    if (!currentClient) throw new Error('Unauthenticated');
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentClient.id,
      senderName: currentClient.name,
      text,
      fileUrl,
      timestamp: new Date().toISOString(),
      readAt: null
    };

    setClientChats(prev => {
      const existingIdx = prev.findIndex(chat => chat.clientId === currentClient.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          messages: [...updated[existingIdx].messages, msg],
          lastMessageTimestamp: msg.timestamp,
          resolvedStatus: 'unresolved'
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: currentClient.id,
            clientId: currentClient.id,
            clientName: currentClient.name,
            messages: [msg],
            lastMessageTimestamp: msg.timestamp,
            resolvedStatus: 'unresolved'
          }
        ];
      }
    });

    const adminNotif: AppNotification = {
      id: `notif-msg-${Date.now()}`,
      userId: 'admin-1',
      type: 'message',
      title: '💬 New Message from Client',
      message: `${currentClient.name}: "${text.substring(0, 32)}${text.length > 32 ? '...' : ''}"`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [adminNotif, ...prev]);
  };

  const adminSendMessage = async (clientId: string, text: string, fileUrl?: string): Promise<void> => {
    const clientRecord = clients.find(c => c.id === clientId);
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'admin',
      senderName: 'Administrator',
      text,
      fileUrl,
      timestamp: new Date().toISOString()
    };

    setClientChats(prev => {
      const existingIdx = prev.findIndex(chat => chat.clientId === clientId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          messages: [...updated[existingIdx].messages, msg],
          lastMessageTimestamp: msg.timestamp
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: clientId,
            clientId,
            clientName: clientRecord?.name || 'Client',
            messages: [msg],
            lastMessageTimestamp: msg.timestamp,
            resolvedStatus: 'unresolved'
          }
        ];
      }
    });

    const cNotif: AppNotification = {
      id: `notif-client-msg-${Date.now()}`,
      userId: clientId,
      type: 'message',
      title: '💬 Support Reply from Admin',
      message: `Admin: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
      read: false,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [cNotif, ...prev]);
  };

  const adminToggleChatResolution = (clientId: string, status: 'resolved' | 'unresolved') => {
    setClientChats(prev => prev.map(chat => {
      if (chat.clientId === clientId) {
        return {
          ...chat,
          resolvedStatus: status
        };
      }
      return chat;
    }));
  };

  // ================= SECURITY CENTER ADMINISTRATIVE ACTION FUNCTIONS =================

  const blacklistIP = (ip: string) => {
    if (!blacklistedIPs.includes(ip)) {
      const nextBlacklist = [...blacklistedIPs, ip];
      setBlacklistedIPs(nextBlacklist);
      
      // Auto-ban matches: suspension for any users with this IP
      setUsers(prevUsers => prevUsers.map(u => {
        const hasIP = (u.ipHistory || []).some(h => h.ip === ip);
        if (hasIP && !u.isBanned) {
          return {
            ...u,
            isBanned: true,
            status: 'Banned',
            banReason: `IP address ${ip} was blacklisted by admin.`
          };
        }
        return u;
      }));
    }
  };

  const unblacklistIP = (ip: string) => {
    setBlacklistedIPs(prev => prev.filter(item => item !== ip));
  };

  const adminReviewFraudAction = (alertId: string, action: 'dismiss' | 'warn' | 'suspend' | 'ban' | 'freeze') => {
    const alert = fraudAlerts.find(a => a.id === alertId);
    if (!alert) return;

    setFraudAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'resolved' as const } : a));

    setUsers(prevUsers => prevUsers.map(u => {
      if (u.id === alert.userId) {
        let isSuspended = u.isSuspended || false;
        let isBanned = u.isBanned || false;
        let status = u.status;
        let banReason = u.banReason || '';
        let suspensionReason = u.suspensionReason || '';
        let balance = u.balance;
        let fraudScore = u.fraudScore || 0;

        if (action === 'dismiss') {
          fraudScore = Math.max(0, fraudScore - 20);
        } else if (action === 'warn') {
          const warningNotif: AppNotification = {
            id: `notif-warn-msg-${Date.now()}`,
            userId: u.id,
            type: 'verification',
            title: '⚠️ Platform Policy Warning',
            message: `Admin issued an anti-cheat compliance warning regarding activity matching: "${alert.type}". Please adhere to community rules.`,
            read: false,
            timestamp: new Date().toISOString()
          };
          setNotifications(prev => [warningNotif, ...prev]);
        } else if (action === 'suspend') {
          isSuspended = true;
          suspensionReason = `Administrative action connected to ${alert.type} investigation.`;
        } else if (action === 'ban') {
          isBanned = true;
          status = 'Banned';
          banReason = `Permanent ban connected to administrative anti-cheat violation: ${alert.type}.`;
        } else if (action === 'freeze') {
          balance = 0;
          isSuspended = true;
          suspensionReason = `Earnings frozen and profile suspended due to extreme fraud alert: ${alert.type}.`;
        }

        return {
          ...u,
          isSuspended,
          isBanned,
          status,
          banReason,
          suspensionReason,
          balance,
          fraudScore
        };
      }
      return u;
    }));
  };

  const dismissFraudAlert = (alertId: string) => {
    setFraudAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'dismissed' as const } : a));
  };

  const deleteDuplicateGroup = (groupId: string) => {
    setDuplicateGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const mergeDuplicateAccounts = (groupId: string, primaryUserId: string) => {
    const group = duplicateGroups.find(g => g.id === groupId);
    if (!group) return;

    const secondaryUserIds = group.accounts.filter(id => id !== primaryUserId);
    if (secondaryUserIds.length === 0) return;

    const primaryUser = users.find(u => u.id === primaryUserId);
    if (!primaryUser) return;

    let mergedBalance = primaryUser.balance || 0;
    let mergedTotalEarned = primaryUser.totalEarned || 0;
    let mergedPendingBalance = primaryUser.pendingBalance || 0;
    let mergedXp = 0;

    const secondaryUsers = users.filter(u => secondaryUserIds.includes(u.id));
    secondaryUsers.forEach(s => {
      mergedBalance += s.balance || 0;
      mergedTotalEarned += s.totalEarned || 0;
      mergedPendingBalance += s.pendingBalance || 0;
      mergedXp = 0;
    });

    setUsers(prevUsers => prevUsers.map(u => {
      if (u.id === primaryUserId) {
        return {
          ...u,
          balance: Number(mergedBalance.toFixed(2)),
          totalEarned: Number(mergedTotalEarned.toFixed(2)),
          pendingBalance: Number(mergedPendingBalance.toFixed(2)),
          xp: mergedXp,
          ipHistory: Array.from(new Set([
            ...(u.ipHistory || []),
            ...secondaryUsers.flatMap(s => s.ipHistory || [])
          ])),
          deviceFingerprints: Array.from(new Set([
            ...(u.deviceFingerprints || []),
            ...secondaryUsers.flatMap(s => s.deviceFingerprints || [])
          ]))
        };
      } else if (secondaryUserIds.includes(u.id)) {
        return {
          ...u,
          balance: 0,
          pendingBalance: 0,
          isBanned: true,
          status: 'Banned',
          banReason: `Merged into primary account: ${primaryUser.redditUsername}.`
        };
      }
      return u;
    }));

    setDuplicateGroups(prev => prev.filter(g => g.id !== groupId));
    
    const mergeAlert: FraudAlert = {
      id: `alert-merge-${Date.now()}`,
      type: 'Accounts Merged',
      userId: primaryUserId,
      userName: primaryUser.fullName,
      userEmail: primaryUser.email,
      fraudScore: 0,
      timestamp: new Date().toISOString(),
      status: 'resolved',
      details: `Merged ${secondaryUsers.length} accounts into master profile: ${primaryUser.redditUsername}. Earnings transferred safely.`,
      recommendedAction: 'Verify other profiles'
    };
    setFraudAlerts(prev => [mergeAlert, ...prev]);
  };

  const scanForDuplicates = () => {
    const ipGroupsMap: Record<string, string[]> = {};
    const fpGroupsMap: Record<string, string[]> = {};
    const redditGroupsMap: Record<string, string[]> = {};
    const emailGroupsMap: Record<string, string[]> = {};

    users.forEach(u => {
      (u.ipHistory || []).forEach(h => {
        if (!ipGroupsMap[h.ip]) ipGroupsMap[h.ip] = [];
        ipGroupsMap[h.ip].push(u.id);
      });

      (u.deviceFingerprints || []).forEach(fp => {
        if (!fpGroupsMap[fp]) fpGroupsMap[fp] = [];
        fpGroupsMap[fp].push(u.id);
      });

      const cleanReddit = u.redditUsername.replace(/^u\//i, '').trim().toLowerCase();
      if (!redditGroupsMap[cleanReddit]) redditGroupsMap[cleanReddit] = [];
      redditGroupsMap[cleanReddit].push(u.id);

      const cleanEmail = normalizeEmail(u.email);
      if (!emailGroupsMap[cleanEmail]) emailGroupsMap[cleanEmail] = [];
      emailGroupsMap[cleanEmail].push(u.id);
    });

    const newGroups: DuplicateGroup[] = [];

    Object.entries(ipGroupsMap).forEach(([ip, ids]) => {
      const uniqueIds = Array.from(new Set(ids));
      if (uniqueIds.length > 1) {
        newGroups.push({
          id: `group-ip-${ip.replace(/\./g, '-')}`,
          accounts: uniqueIds,
          sharedIdentifier: ip,
          type: 'ip'
        });
      }
    });

    Object.entries(fpGroupsMap).forEach(([fp, ids]) => {
      const uniqueIds = Array.from(new Set(ids));
      if (uniqueIds.length > 1) {
        newGroups.push({
          id: `group-fp-${fp}`,
          accounts: uniqueIds,
          sharedIdentifier: fp,
          type: 'fingerprint'
        });
      }
    });

    Object.entries(redditGroupsMap).forEach(([reddit, ids]) => {
      const uniqueIds = Array.from(new Set(ids));
      if (uniqueIds.length > 1) {
        newGroups.push({
          id: `group-red-${reddit}`,
          accounts: uniqueIds,
          sharedIdentifier: `u/${reddit}`,
          type: 'reddit'
        });
      }
    });

    Object.entries(emailGroupsMap).forEach(([email, ids]) => {
      const uniqueIds = Array.from(new Set(ids));
      if (uniqueIds.length > 1) {
        newGroups.push({
          id: `group-em-${email.replace(/@/g, '-')}`,
          accounts: uniqueIds,
          sharedIdentifier: email,
          type: 'gmail'
        });
      }
    });

    setDuplicateGroups(newGroups);
  };

  // Run initial scan to make sure duplicates show up
  useEffect(() => {
    scanForDuplicates();
  }, [users.length]);

  // ================= END CLIENT CORE LOGIC =================

  // Real-time expiry countdown runner
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      
      tasks.forEach(t => {
        if (t.status === 'claimed' && t.claim_expires_at) {
          const exp = new Date(t.claim_expires_at);
          if (exp <= now) {
            unclaimTask(t.id, true);
          } else {
            const diffMs = exp.getTime() - now.getTime();
            const diffMins = diffMs / 60000;
            if (diffMins <= 15 && !warningSentTasks[t.id]) {
              setWarningSentTasks(prev => ({ ...prev, [t.id]: true }));
              if (t.claimed_by) {
                const notif: AppNotification = {
                  id: `notif-warning-${Date.now()}`,
                  userId: t.claimed_by,
                  type: 'verification',
                  title: 'Deadline Approaching! ⏰',
                  message: `⏰ 15 minutes left to submit proof for "${t.title}"! Don't miss your deadline.`,
                  read: false,
                  timestamp: new Date().toISOString()
                };
                setNotifications(prevNotifs => [notif, ...prevNotifs]);
              }
            }
          }
        }
      });
    }, 5000); // Check every 5s for precision and minimal overhead

    return () => clearInterval(interval);
  }, [tasks, warningSentTasks]);

  return (
    <AppContext.Provider value={{
      users,
      currentUser,
      tasks,
      submissions,
      withdrawals,
      transactions,
      tickets,
      notifications,
      settings,
      theme,
      toggleTheme,
      
      login,
      signup,
      logout,
      updateProfile,
      changePassword,
      deleteAccount,
      
      submitTaskProof,
      claimTask,
      unclaimTask,
      requestWithdrawal,
      createTicket,
      replyToTicket,
      markNotificationRead,
      clearAllNotifications,
      claimDailyStreak,

      adminApproveUser,
      adminRejectUser,
      adminBanUser,
      adminCreateTask,
      adminEditTask,
      adminDeleteTask,
      adminReviewSubmission,
      adminReviewWithdrawal,
      adminCreateAnnouncement,
      adminUpdateSettings,
      
      forceUnclaimTask,
      extendUserDeadline,
      resetCooldown,
      adminUpdateUserKarma,
      syncRedditKarma,

      // Anti-Cheat tracking states and actions
      blacklistedIPs,
      duplicateGroups,
      fraudAlerts,
      currentSimulatedIP,
      setCurrentSimulatedIP,
      currentSimulatedCountry,
      setCurrentSimulatedCountry,
      blacklistIP,
      unblacklistIP,
      adminReviewFraudAction,
      dismissFraudAlert,
      deleteDuplicateGroup,
      mergeDuplicateAccounts,
      scanForDuplicates,

      // Expose Client states & functions
      clients,
      currentClient,
      clientTasks,
      clientPayments,
      clientChats,
      
      clientRegister,
      clientLogin,
      clientLogout,
      clientCreateTask,
      clientReviewTaskSubmission,
      
      memberClaimClientTask,
      memberSubmitClientTaskProof,
      memberRaiseDispute,
      memberRequestPayout,
      
      adminReviewClient,
      adminToggleTaskUpload,
      adminToggleGlobalTaskUpload,
      adminReviewClientTask,
      adminResolveDispute,
      adminConfirmClientPayment,
      adminReviewPayout,
      adminRemoveCompletedTask,
      adminDeductMember,

      clientSendMessage,
      adminSendMessage,
      adminToggleChatResolution
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return context;
};
