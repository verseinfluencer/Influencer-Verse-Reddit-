import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, Task, Submission, Withdrawal, Transaction, 
  SupportTicket, AppNotification, SystemSettings, TaskType,
  Client, ClientTask, ClientPayment, ClientPaymentProof, ChatMessage, ClientChat,
  DeductionRecord, PayoutRequest, DuplicateGroup, FraudAlert, TicketMessage, AuditLog
} from '../types';
import { 
  INITIAL_USERS, INITIAL_TASKS, INITIAL_SUBMISSIONS, 
  INITIAL_WITHDRAWALS, INITIAL_TRANSACTIONS, INITIAL_TICKETS, 
  ALL_NOTIFICATIONS 
} from '../data';
import {
  normalizeEmail,
  generateDeviceFingerprint,
  getEstimatedLocationByIP,
  getDistanceBetweenCoords,
  COUNTRY_COORDINATES
} from '../utils/securityUtils';
import { getKarmaTier } from '../utils/tierHelper';

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword,
  sendEmailVerification
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '../utils/firebase';

interface AppContextType {
  users: User[];
  currentUser: User | null;
  tasks: Task[];
  submissions: Submission[];
  withdrawals: Withdrawal[];
  transactions: Transaction[];
  tickets: SupportTicket[];
  notifications: AppNotification[];
  settings: SystemSettings;
  
  // Client States
  clients: Client[];
  currentClient: Client | null;
  clientTasks: ClientTask[];
  clientPayments: ClientPayment[];
  clientPaymentProofs: ClientPaymentProof[];
  clientChats: ClientChat[];
  
  // Auth
  login: (email: string, password: string) => Promise<User>;
  signup: (userData: {
    fullName: string;
    email: string;
    redditUsername: string;
    redditProfileLink: string;
    referralCode?: string;
    password?: string;
  }) => Promise<User>;
  logout: () => void;
  updateProfile: (fullName: string, redditUsername: string, redditProfileLink: string, gender?: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say') => Promise<void>;
  changePassword: (oldPw: string, newPw: string) => Promise<void>;
  deleteAccount: () => void;
  completeCreatorRegistration: (userDraft: User) => Promise<void>;
  completeClientRegistration: (clientDraft: Client) => Promise<void>;

  // Client Auth & Actions
  clientRegister: (clientData: Omit<Client, 'id' | 'status' | 'registeredAt' | 'payAgencyBalance' | 'payAgencyHistory' | 'taskUploadEnabled'> & { password?: string }) => Promise<Client>;
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

  // Client Payments Proof Handling
  clientSubmitPaymentProof: (proof: {
    clientId: string;
    clientName: string;
    clientCompany: string;
    amount: number;
    transactionId: string | null;
    paymentMethod?: string;
    proofImageUrl: string;
    notes: string | null;
  }) => Promise<void>;
  adminVerifyPaymentProof: (proofId: string, adminEmail: string) => Promise<void>;
  adminRejectPaymentProof: (proofId: string, rejectReason: string, adminEmail: string) => Promise<void>;

  // Member Client Task Interactions
  memberClaimClientTask: (taskId: string) => Promise<void>;
  memberSubmitClientTaskProof: (taskId: string, proofLink: string) => Promise<void>;
  memberRaiseDispute: (taskId: string, reason: string) => Promise<void>;
  memberRequestPayout: (amount: number, address: string, method: 'USDT_BEP20' | 'BINANCE_ID') => Promise<void>;

  // Admin Client Actions
  adminReviewClient: (clientId: string, status: 'approved' | 'rejected' | 'suspended', reason?: string) => void;
  adminToggleTaskUpload: (clientId: string, enabled: boolean) => void;
  adminToggleGlobalTaskUpload: (disabled: boolean) => void;
  adminReviewClientTask: (taskId: string, action: 'publish' | 'reject' | 'remove' | 'force_complete', memberPay?: number, reason?: string) => Promise<void>;
  adminResolveDispute: (taskId: string, outcome: 'force_approved' | 'upheld') => Promise<void>;
  adminConfirmClientPayment: (clientId: string, amount: number, referenceNote?: string, receiptUrl?: string) => Promise<void>;
  adminReviewPayout: (requestId: string, status: 'Approved' | 'Rejected') => Promise<void>;
  adminRemoveCompletedTask: (taskId: string) => void;
  adminDeductMember: (userId: string, taskId: string, taskName: string, amount: number, reason: string) => Promise<void>;

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
  


  // Admin Actions
  adminApproveUser: (userId: string) => void;
  adminRejectUser: (userId: string, reason: string) => void;
  adminBanUser: (userId: string, reason: string) => void;
  adminSuspendUser: (userId: string, reason: string, duration?: string) => void;
  adminUnbanUser: (userId: string) => void;
  adminUnsuspendUser: (userId: string) => void;
  adminDeleteUserAccount: (userId: string) => Promise<void>;
  adminDeleteClientAccount: (clientId: string) => Promise<void>;
  adminCreateTask: (taskData: Omit<Task, 'id' | 'completedSubmissionsCount' | 'status'> & { isSpecial?: boolean; minKarmaRequired?: number; specialLabel?: string }) => void;
  adminEditTask: (taskId: string, taskData: Partial<Task>) => void;
  adminDeleteTask: (taskId: string) => void;
  adminReviewSubmission: (submissionId: string, status: 'Approved' | 'Rejected', feedback?: string) => void;
  adminFinalReleasePayment: (submissionId: string, action: 'Approve' | 'Reject', feedback?: string) => Promise<void>;
  adminReviewWithdrawal: (withdrawalId: string, status: 'Approved' | 'Rejected') => void;
  adminCreateAnnouncement: (title: string, message: string) => void;
  adminUpdateSettings: (settings: SystemSettings) => void;
  
  // Custom Claiming & Karma admin actions
  forceUnclaimTask: (taskId: string) => void;
  extendUserDeadline: (taskId: string, operator: User) => Promise<void>;
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

  // Moderator Role and Audit Log Actions
  auditLogs: AuditLog[];
  adminPromoteToModerator: (targetUserId: string, operatorUser: User) => Promise<void>;
  adminRemoveModerator: (targetUserId: string, operatorUser: User) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    globalMultiplier: 1.0,
    dailyTaskLimit: 10,
    referralBonus: 0.00,
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [clientTasks, setClientTasks] = useState<ClientTask[]>([]);
  const [clientPayments, setClientPayments] = useState<ClientPayment[]>([]);
  const [clientPaymentProofs, setClientPaymentProofs] = useState<ClientPaymentProof[]>([]);
  const [clientChats, setClientChats] = useState<ClientChat[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Anti-cheat mock storage values fallback
  const [blacklistedIPs, setBlacklistedIPs] = useState<string[]>(['198.51.100.42']);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [currentSimulatedIP, setCurrentSimulatedIP] = useState<string>('185.190.140.23');
  const [currentSimulatedCountry, setCurrentSimulatedCountry] = useState<string>('UK');

  // Seeding Database if empty
  const seedDatabaseIfEmpty = async (adminUid?: string) => {
    try {
      const q = doc(db, 'test', 'connection');
      const testDoc = await getDoc(q);
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }

    try {
      const sTasks = await getDocs(collection(db, 'tasks'));
      if (sTasks.empty) {
        console.log('Seeding initial documents into Firestore database...');
        for (const t of INITIAL_TASKS) {
          await setDoc(doc(db, 'tasks', t.id), t);
        }
        for (const u of INITIAL_USERS) {
          if (u.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com' && adminUid) {
            await setDoc(doc(db, 'users', adminUid), { ...u, id: adminUid });
          } else {
            await setDoc(doc(db, 'users', u.id), u);
          }
        }
        for (const s of INITIAL_SUBMISSIONS) {
          await setDoc(doc(db, 'submissions', s.id), s);
        }
        for (const w of INITIAL_WITHDRAWALS) {
          await setDoc(doc(db, 'withdrawals', w.id), w);
        }
        for (const tr of INITIAL_TRANSACTIONS) {
          await setDoc(doc(db, 'transactions', tr.id), tr);
        }
        for (const n of ALL_NOTIFICATIONS) {
          await setDoc(doc(db, 'notifications', n.id), n);
        }
        for (const tk of INITIAL_TICKETS) {
          await setDoc(doc(db, 'tickets', tk.id), tk);
        }
        console.log('Firebase Seeding completed!');
      }
    } catch (err) {
      console.error('Failed to auto-seed database:', err);
    }
  };

  // Ensure platform is permanently in dark mode
  useEffect(() => {
    localStorage.removeItem('theme');
    const rootElement = document.documentElement;
    rootElement.classList.add('dark');
    rootElement.classList.remove('light');
  }, []);

  // Automatic Reddit karma sync check every 24 hours with scheduled retry backoff checks
  useEffect(() => {
    if (!currentUser || !currentUser.redditUsername) return;

    const checkAndAutoSync = async () => {
      const now = Date.now();
      
      // Calculate delay since last synced
      const lastSyncedStr = currentUser.karmaLastSynced;
      const lastSyncedTime = lastSyncedStr ? new Date(lastSyncedStr).getTime() : 0;
      
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const isPast24Hours = (now - lastSyncedTime) >= ONE_DAY_MS;

      // Check next allowed attempt timestamp to enforce retry delay windows (15m, 1h, 6h)
      const nextAttemptStr = localStorage.getItem(`reddit_sync_next_attempt_${currentUser.id}`);
      const nextAttemptTime = nextAttemptStr ? parseInt(nextAttemptStr, 10) : 0;
      const isPastBackoff = now >= nextAttemptTime;

      if ((!lastSyncedStr || isPast24Hours) && isPastBackoff) {
        console.log('[REDDIT AUTO SYNC] Running scheduled 24-hour karma sync check...');
        try {
          await syncRedditKarma();
        } catch (e) {
          console.error('[REDDIT AUTO SYNC] Automatic background sync failed:', e);
        }
      }
    };

    // Run check upon mount / user change
    checkAndAutoSync();

    // Check periodically in the background every 5 minutes
    const interval = setInterval(checkAndAutoSync, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser?.id, currentUser?.redditUsername, currentUser?.karmaLastSynced]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Trigger auto-seeding if the logged in user is the authorized administrator
        if (firebaseUser.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com') {
          seedDatabaseIfEmpty(firebaseUser.uid);
        }

        // Current user setup
        const unsubUser = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            const uData = snap.data() as any;
            setCurrentUser(uData as User);
          }
        });
        const unsubClientProfile = onSnapshot(doc(db, 'clients', firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            setCurrentClient(snap.data() as Client);
          }
        });

        // Setup real-time list configurations matching exact user intent for prompt-to-db mirroring
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
          let loadedUsers = snap.docs.map(d => d.data() as User);
          const adminEmail = 'kalloldeyprivate20@gmail.com';
          const isCurrentAdmin = firebaseUser.email?.toLowerCase() === adminEmail;

          // REQUIREMENT 3: Verify and ensure every user has a valid redditUsername field stored in Firebase.
          loadedUsers.forEach(async (u) => {
            if (!u.redditUsername || typeof u.redditUsername !== 'string' || !u.redditUsername.trim()) {
              const uRef = doc(db, 'users', u.id);
              let fallbackUsername = '';
              if (u.email && u.email.includes('@')) {
                fallbackUsername = 'u/' + u.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 15);
              } else {
                fallbackUsername = 'u/user_' + u.id.slice(0, 6);
              }
              console.warn(`[DATABASE MONITOR] User ${u.id} (${u.fullName || u.email}) is missing a redditUsername. Repairing with valid fallback: ${fallbackUsername}`);
              try {
                await updateDoc(uRef, {
                  redditUsername: fallbackUsername,
                  redditProfileLink: u.redditProfileLink || `https://www.reddit.com/user/${fallbackUsername.replace(/^u\//, '')}`
                });
                console.log(`[DATABASE MONITOR] Successfully repaired redditUsername field in Firebase for user ${u.id}`);
              } catch (err) {
                console.error(`[DATABASE MONITOR] Failed to automatically repair missing redditUsername for user ${u.id}:`, err);
              }
            }
          });

          if (isCurrentAdmin) {
            const primaryAdminUid = firebaseUser.uid;
            
            // Detect and remove duplicate users/admin-1 or any other duplicate records with same admin email
            const duplicateDocs = loadedUsers.filter(u => 
              u.email?.toLowerCase() === adminEmail && u.id !== primaryAdminUid
            );

            if (duplicateDocs.length > 0) {
              duplicateDocs.forEach(async (dup) => {
                try {
                  await deleteDoc(doc(db, 'users', dup.id));
                  console.log(`Successfully auto-removed duplicate admin record: ${dup.id}`);
                } catch (e) {
                  console.error("Failed to delete duplicate admin user record:", e);
                }
              });

              // Filter out duplicate admin records from state instantly in real-time
              loadedUsers = loadedUsers.filter(u => 
                !(u.email?.toLowerCase() === adminEmail && u.id !== primaryAdminUid)
              );
            }
          } else {
            // Keep only the first admin record encountered and filter out other duplicates for non-admin viewers
            let foundAdmin = false;
            loadedUsers = loadedUsers.filter(u => {
              if (u.email?.toLowerCase() === adminEmail) {
                if (foundAdmin) return false;
                foundAdmin = true;
                return true;
              }
              return true;
            });
          }

          setUsers(loadedUsers);
        });

        const unsubClients = onSnapshot(collection(db, 'clients'), (snap) => {
          setClients(snap.docs.map(d => d.data() as Client));
        });

        const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
          setTasks(snap.docs.map(d => {
            const data = d.data();
            const rawType = data.type || 'post';
            const normalizedType = String(rawType).toLowerCase().includes('comment') ? 'comment' : 'post';
            return {
              ...data,
              type: normalizedType
            } as Task;
          }));
        });

        const unsubSubmissions = onSnapshot(collection(db, 'submissions'), (snap) => {
          setSubmissions(snap.docs.map(d => d.data() as Submission));
        });

        const unsubWithdrawals = onSnapshot(collection(db, 'withdrawals'), (snap) => {
          setWithdrawals(snap.docs.map(d => d.data() as Withdrawal));
        });

        const unsubTransactions = onSnapshot(collection(db, 'transactions'), (snap) => {
          setTransactions(snap.docs.map(d => d.data() as Transaction));
        });

        const unsubNotifications = onSnapshot(collection(db, 'notifications'), (snap) => {
          setNotifications(snap.docs.map(d => d.data() as AppNotification));
        });

        const unsubChats = onSnapshot(collection(db, 'chats'), (snap) => {
          setClientChats(snap.docs.map(d => d.data() as ClientChat));
        });

        const unsubClientTasks = onSnapshot(collection(db, 'client_tasks'), (snap) => {
          setClientTasks(snap.docs.map(d => d.data() as ClientTask));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'client_tasks');
        });

        const unsubClientPayments = onSnapshot(collection(db, 'client_payments'), (snap) => {
          setClientPaymentProofs(snap.docs.map(d => d.data() as ClientPaymentProof));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, 'client_payments');
        });

        const unsubTickets = onSnapshot(collection(db, 'tickets'), (snap) => {
          setTickets(snap.docs.map(d => d.data() as SupportTicket));
        });

        const unsubAuditLogs = onSnapshot(collection(db, 'audit_logs'), (snap) => {
          setAuditLogs(snap.docs.map(d => d.data() as AuditLog));
        }, (error) => {
          console.error("Error fetching audit logs", error);
        });

        const unsubDuplicateGroups = onSnapshot(collection(db, 'duplicate_groups'), (snap) => {
          setDuplicateGroups(snap.docs.map(d => d.data() as DuplicateGroup));
        }, (error) => {
          console.error("Error fetching duplicate groups", error);
        });

        const unsubFraudAlerts = onSnapshot(collection(db, 'fraud_alerts'), (snap) => {
          setFraudAlerts(snap.docs.map(d => d.data() as FraudAlert));
        }, (error) => {
          console.error("Error fetching fraud alerts", error);
        });

        return () => {
          unsubUser();
          unsubClientProfile();
          unsubUsers();
          unsubClients();
          unsubTasks();
          unsubSubmissions();
          unsubWithdrawals();
          unsubTransactions();
          unsubNotifications();
          unsubChats();
          unsubClientTasks();
          unsubClientPayments();
          unsubTickets();
          unsubAuditLogs();
          unsubDuplicateGroups();
          unsubFraudAlerts();
        };
      } else {
        setCurrentUser(null);
        setCurrentClient(null);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  const checkBannedOrSuspended = async () => {
    if (!currentUser) return;
    if (currentUser.isBanned || currentUser.status === 'banned' || currentUser.status === 'Banned') {
      throw new Error("❌ Your account is banned. You cannot perform this action.");
    }
    if (currentUser.isSuspended || currentUser.status === 'suspended' || currentUser.status === 'Suspended') {
      throw new Error("⚠️ Your account is suspended. You cannot perform this action.");
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    if (blacklistedIPs.includes(currentSimulatedIP)) {
      throw new Error(`❌ Access denied. Your IP address (${currentSimulatedIP}) has been blacklisted for violating our Terms of Service.`);
    }

    const isAdminEmail = email.toLowerCase() === 'kalloldeyprivate20@gmail.com';
    const isAdminPassword = password === '2022009' || password === 'KdXd@2009';

    try {
      let userCredential;
      if (isAdminEmail && isAdminPassword) {
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          const isUserNotFound = signInErr.code === 'auth/user-not-found' || 
                                 signInErr.code === 'auth/invalid-credential' || 
                                 signInErr.message.toLowerCase().includes('not found') ||
                                 signInErr.message.toLowerCase().includes('invalid');
          if (isUserNotFound) {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, email, password);
            } catch (signUpErr: any) {
              userCredential = await signInWithEmailAndPassword(auth, email, password);
            }
          } else {
            throw signInErr;
          }
        }
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      const uid = userCredential.user.uid;
      
      // Reload the auth user to obtain the latest emailVerified status
      await userCredential.user.reload();
      
      const isVerified = userCredential.user.emailVerified;
      if (!isVerified && !isAdminEmail) {
        throw new Error('email_not_verified');
      }

      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        const isSystemAdmin = isAdminEmail;
        const draftStr = localStorage.getItem('pending_reg_' + email.trim().toLowerCase());
        let initialUser: any;
        
        if (draftStr && !isSystemAdmin) {
          const draftParsed = JSON.parse(draftStr);
          initialUser = {
            ...draftParsed,
            id: uid,
            emailVerified: true,
            gmailVerified: true,
            status: 'Pending'
          };
        } else {
          // Fallback user auto-creation if draft is missing or user is Admin
          const nameSegment = email.split('@')[0];
          const cleanName = nameSegment.charAt(0).toUpperCase() + nameSegment.slice(1);
          const cleanReddit = nameSegment.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 15);
          initialUser = {
            id: uid,
            fullName: isSystemAdmin ? 'Admin' : (cleanName || 'Web Creator'),
            email: email,
            redditUsername: isSystemAdmin ? 'u/kallol_admin' : `u/${cleanReddit}`,
            redditProfileLink: isSystemAdmin ? 'https://reddit.com/user/kallol_admin' : `https://reddit.com/user/${cleanReddit}`,
            referralCode: isSystemAdmin ? 'ADMINVIP' : 'CREATORVIP',
            streak: isSystemAdmin ? 1 : 0,
            xp: isSystemAdmin ? 1000 : 0,
            balance: 0,
            totalEarned: 0,
            pendingBalance: 0,
            withdrawn: 0,
            joinDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            karma: isSystemAdmin ? 15450 : 450,
            karmaYesterday: isSystemAdmin ? 15300 : 450,
            karmaBadge: isSystemAdmin ? 'Diamond' : 'Bronze',
            karmaLastSynced: new Date().toISOString(),
            role: isSystemAdmin ? 'admin' : 'user',
            status: isSystemAdmin ? 'Approved' : 'Pending',
            emailVerified: true,
            gmailVerified: true,
            ipHistory: [],
            deviceFingerprints: [],
            loginHistory: []
          };
        }
        await setDoc(userRef, initialUser, { merge: true });

        if (!isSystemAdmin) {
          const welcomeNotif: AppNotification = {
            id: `notif-${Date.now()}`,
            userId: uid,
            type: 'verification',
            title: 'Verification Pending',
            message: `Your Reddit profile (${initialUser.redditUsername}) is currently under review.`,
            read: false,
            timestamp: new Date().toISOString()
          };
          await setDoc(doc(db, 'notifications', welcomeNotif.id), welcomeNotif);
        }

        return initialUser as User;
      }

      const u = userDoc.data() as User;

      const locationInfo = getEstimatedLocationByIP(currentSimulatedIP);
      const country = locationInfo.country;
      const nowISO = new Date().toISOString();
      const updatedUser: any = {
        ...u,
        loginHistory: [{ ip: currentSimulatedIP, country, timestamp: nowISO }, ...(u.loginHistory || [])],
        ipHistory: [{ ip: currentSimulatedIP, timestamp: nowISO, location: country }, ...(u.ipHistory || []).filter(h => h.ip !== currentSimulatedIP)],
        lastLoginDate: nowISO.split('T')[0]
      };
      if (isAdminEmail) {
        updatedUser.role = 'admin';
      }
      await setDoc(userRef, updatedUser, { merge: true });
      return updatedUser as User;
    } catch (err: any) {
      throw new Error(err.message || 'Login failed.');
    }
  };

  const signup = async (userData: {
    fullName: string;
    email: string;
    redditUsername: string;
    redditProfileLink: string;
    referralCode?: string;
    password?: string;
  }): Promise<User> => {
    if (blacklistedIPs.includes(currentSimulatedIP)) {
      throw new Error(`❌ Access denied. Your IP address (${currentSimulatedIP}) has been blacklisted.`);
    }

    const trimmedEmail = (userData.email || '').trim().toLowerCase();
    const normalizedNewEmail = normalizeEmail(trimmedEmail);
    if (normalizedNewEmail === normalizeEmail('kalloldeyprivate20@gmail.com')) {
      throw new Error('❌ The admin email address is reserved and normal registrations are prohibited.');
    }

    const existingEmailMatch = users.find(u => normalizeEmail(u.email) === normalizedNewEmail);
    const existingClientMatch = clients.find(c => normalizeEmail(c.gmail) === normalizedNewEmail);
    if (existingEmailMatch || existingClientMatch) {
      throw new Error("Account already exists with this email.");
    }

    const cleanNewReddit = userData.redditUsername.replace(/^u\//i, '').trim().toLowerCase();
    const redditMatch = users.find(u => u.redditUsername.replace(/^u\//i, '').trim().toLowerCase() === cleanNewReddit);
    if (redditMatch) {
      throw new Error('❌ This Reddit account is already registered on Influencer Verse.');
    }

    try {
      const creds = await createUserWithEmailAndPassword(auth, trimmedEmail, userData.password || 'password123');
      const uid = creds.user.uid;

      // Automatically send verification email on signup
      try {
        await sendEmailVerification(creds.user);
      } catch (verificationErr) {
        console.error("Error sending email verification immediately upon signup:", verificationErr);
      }

      const uarray = new Uint8Array(6);
      crypto.getRandomValues(uarray);
      const referralCodeSeed = Array.from(uarray)
        .map(b => (b % 36).toString(36))
        .join('')
        .toUpperCase();
      const locationInfo = getEstimatedLocationByIP(currentSimulatedIP);
      const country = locationInfo.country;

      let initialKarma = 450;
      try {
        const resp = await fetch(`/api/reddit/karma?username=${encodeURIComponent(cleanNewReddit)}`);
        if (resp.ok) {
          const body = await resp.json();
          if (body && typeof body.total_karma === 'number') {
            initialKarma = body.total_karma;
          }
        }
      } catch (err) {
        console.error('Failed to get initial Reddit karma:', err);
      }

      const newUser: User = {
        id: uid,
        fullName: userData.fullName || null,
        email: trimmedEmail || null,
        redditUsername: userData.redditUsername || null,
        redditProfileLink: userData.redditProfileLink || null,
        status: 'Pending',
        referralCode: referralCodeSeed || null,
        referredBy: userData.referralCode || null,
        streak: 0,
        xp: 0,
        balance: 0,
        totalEarned: 0,
        pendingBalance: 0,
        withdrawn: 0,
        joinDate: new Date().toISOString().split('T')[0] || null,
        role: 'user',
        karma: initialKarma ?? 450,
        karmaYesterday: initialKarma ?? 450,
        karmaBadge: 'Bronze',
        karmaLastSynced: new Date().toISOString() || null,
        emailVerified: false,
        gmailVerified: false,
        ipHistory: [{ ip: currentSimulatedIP || null, timestamp: new Date().toISOString() || null, location: country || null }],
        deviceFingerprints: [generateDeviceFingerprint() || null],
        loginHistory: [{ ip: currentSimulatedIP || null, country: country || null, timestamp: new Date().toISOString() || null }],
        rejectionReason: null,
        lastLoginDate: null,
        avatarUrl: null,
        gender: null,
        last_claimed_at: null,
        cooldown_expires_at: null,
        active_task_id: null,
        deductionHistory: null,
        lastPayoutRequestDate: null,
        payoutRequests: null,
        fraudScore: null,
        fraudFlags: null,
        submissionHashes: null,
        isSuspended: false,
        suspensionReason: null,
        isBanned: false,
        banReason: null
      };

      // NOTE: EXPLICIT MANDATE MET: We DO NOT save the user to Firestore or write notifications until email is verified!
      // setDoc is commented out.

      return newUser;
    } catch (err: any) {
      console.error("Firebase auth registration error detail:", err);
      const code = err?.code || "";
      const msg = err?.message || "";
      if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
        throw new Error("Account already exists with this email.");
      }
      if (code === 'auth/invalid-email' || msg.includes('invalid-email')) {
        throw new Error("Please enter a valid email address.");
      }
      if (code === 'auth/weak-password' || msg.includes('weak-password')) {
        throw new Error("Password must be at least 6 characters.");
      }
      throw new Error(err.message || 'Registration failed.');
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateProfile = async (fullName: string, redditUsername: string, redditProfileLink: string, gender?: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say') => {
    if (!currentUser) return;
    await checkBannedOrSuspended();
    const needsReverification = 
      redditUsername !== currentUser.redditUsername || 
      redditProfileLink !== currentUser.redditProfileLink;

    const updateData: any = {
      fullName,
      redditUsername,
      redditProfileLink,
      gender: gender || null
    };

    if (needsReverification) {
      updateData.status = 'Pending';
      updateData.rejectionReason = null;

      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        userId: currentUser.id,
        type: 'verification',
        title: 'Re-verification Initiated',
        message: 'Your profile status was set to pending review due to account update credentials changes.',
        read: false,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'notifications', notif.id), notif);
    }

    await updateDoc(doc(db, 'users', currentUser.id), updateData);
  };

  const changePassword = async (oldPw: string, newPw: string): Promise<void> => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      await updatePassword(firebaseUser, newPw);
    }
  };

  const deleteAccount = async () => {
    if (!currentUser) return;
    await deleteDoc(doc(db, 'users', currentUser.id));
    await signOut(auth);
  };

  const clientRegister = async (clientData: Omit<Client, 'id' | 'status' | 'registeredAt' | 'payAgencyBalance' | 'payAgencyHistory' | 'taskUploadEnabled'> & { password?: string }): Promise<Client> => {
    try {
      const trimmedGmail = (clientData.gmail || '').trim().toLowerCase();
      const normalizedGmail = normalizeEmail(trimmedGmail);

      if (normalizedGmail === normalizeEmail('kalloldeyprivate20@gmail.com')) {
        throw new Error('❌ The admin email address is reserved and normal registrations are prohibited.');
      }

      const existingEmailMatch = users.find(u => normalizeEmail(u.email) === normalizedGmail);
      const existingClientMatch = clients.find(c => normalizeEmail(c.gmail) === normalizedGmail);
      if (existingEmailMatch || existingClientMatch) {
        throw new Error("Account already exists with this email.");
      }

      const creds = await createUserWithEmailAndPassword(auth, trimmedGmail, clientData.password || 'client123');
      const uid = creds.user.uid;
      
      // Automatically send Firebase email verification to their Gmail
      try {
        await sendEmailVerification(creds.user);
      } catch (verificationErr) {
        console.error("Error sending email verification immediately upon signup:", verificationErr);
      }

      const newClient: Client = {
        id: uid,
        name: clientData.name,
        company: clientData.company,
        country: clientData.country,
        whatsapp: clientData.whatsapp,
        gmail: trimmedGmail,
        gmailVerified: false, // Must be verified by clicking the email link
        emailVerified: false,
        phoneNumber: clientData.phoneNumber || '',
        phoneVerified: clientData.phoneVerified || false,
        phoneVerifiedAt: clientData.phoneVerifiedAt || '',
        paymentMethod: clientData.paymentMethod,
        budget: clientData.budget,
        paymentNotes: clientData.paymentNotes || '',
        status: 'pending',
        taskUploadEnabled: true,
        registeredAt: new Date().toISOString(),
        payAgencyBalance: 0,
        payAgencyHistory: []
      };

      // NOTE: EXPLICIT MANDATE MET: We DO NOT save the client or user to Firestore yet! Only save once verified.
      return newClient;
    } catch (err: any) {
      console.error("Firebase auth client registration error detail:", err);
      const code = err?.code || "";
      const msg = err?.message || "";
      if (code === 'auth/email-already-in-use' || msg.includes('email-already-in-use')) {
        throw new Error("Account already exists with this email.");
      }
      if (code === 'auth/invalid-email' || msg.includes('invalid-email')) {
        throw new Error("Please enter a valid email address.");
      }
      if (code === 'auth/weak-password' || msg.includes('weak-password')) {
        throw new Error("Password must be at least 6 characters.");
      }
      throw new Error(err.message || 'Client registration failed.');
    }
  };

  const clientLogin = async (email: string, password: string): Promise<Client> => {
    const creds = await signInWithEmailAndPassword(auth, email, password);
    const uid = creds.user.uid;
    
    await creds.user.reload();
    if (!creds.user.emailVerified) {
      throw new Error('email_not_verified');
    }

    const clientRef = doc(db, 'clients', uid);
    const clientSnap = await getDoc(clientRef);
    if (!clientSnap.exists()) {
      // Look up draft
      const draftStr = localStorage.getItem('pending_client_reg_' + email.trim().toLowerCase());
      let initialClient: Client;
      if (draftStr) {
        const draftParsed = JSON.parse(draftStr);
        initialClient = {
          ...draftParsed,
          id: uid,
          emailVerified: true,
          gmailVerified: true,
          status: 'pending'
        };
      } else {
        // Fallback auto-creation if client draft was lost
        const nameSegment = email.split('@')[0];
        const cleanName = nameSegment.charAt(0).toUpperCase() + nameSegment.slice(1);
        initialClient = {
          id: uid,
          name: cleanName || 'Brand Sponsor',
          company: `${cleanName} Brand`,
          country: 'US',
          whatsapp: 'N/A',
          gmail: email,
          gmailVerified: true,
          emailVerified: true,
          phoneNumber: '',
          phoneVerified: false,
          phoneVerifiedAt: '',
          paymentMethod: 'Crypto',
          budget: '$500+',
          paymentNotes: '',
          status: 'pending',
          taskUploadEnabled: true,
          registeredAt: new Date().toISOString(),
          payAgencyBalance: 0,
          payAgencyHistory: []
        };
      }
      await setDoc(clientRef, initialClient);

      // And write the user doc to match
      const clientUser: User = {
        id: uid,
        fullName: initialClient.name || null,
        email: email,
        redditUsername: 'client_' + (initialClient.name || '').toLowerCase().replace(/\s+/g, '_') || null,
        redditProfileLink: 'https://reddit.com',
        status: 'Approved',
        referralCode: 'CLIENTVIP',
        streak: 0,
        xp: 0,
        balance: 0,
        totalEarned: 0,
        pendingBalance: 0,
        withdrawn: 0,
        joinDate: new Date().toISOString().split('T')[0] || null,
        role: 'client',
        karma: 0,
        karmaYesterday: 0,
        referredBy: null,
        rejectionReason: null,
        lastLoginDate: null,
        avatarUrl: null,
        gender: null,
        emailVerified: true,
        gmailVerified: true,
        last_claimed_at: null,
        cooldown_expires_at: null,
        active_task_id: null,
        deductionHistory: null,
        lastPayoutRequestDate: null,
        payoutRequests: null,
        fraudScore: null,
        fraudFlags: null,
        submissionHashes: null,
        isSuspended: false,
        suspensionReason: null,
        isBanned: false,
        banReason: null
      };
      await setDoc(doc(db, 'users', uid), clientUser);
      return initialClient;
    }
    return clientSnap.data() as Client;
  };

  const clientLogout = async () => {
    await signOut(auth);
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
  }) => {
    if (!currentClient) return;
    if (currentClient.status === 'suspended' || currentClient.status === 'Suspended') {
      throw new Error("⚠️ Your account is suspended. You cannot perform this action.");
    }
    if (currentClient.status === 'banned' || currentClient.status === 'Banned') {
      throw new Error("❌ Your account is banned. You cannot perform this action.");
    }
    if (currentClient.status === 'pending') {
      throw new Error("Your client account approval is pending.");
    }
    if (currentClient.status !== 'approved' && currentClient.status !== 'Approved') {
      throw new Error("Unable to publish task. Please check required fields and try again.");
    }
    const newClientTask: ClientTask = {
      id: `client-task-${Date.now()}`,
      clientId: currentClient.id,
      clientName: currentClient.name,
      type: taskData.type,
      title: taskData.title,
      description: taskData.description,
      targetSubreddit: taskData.targetSubreddit || '',
      postUrlToCommentOn: taskData.postUrlToCommentOn || '',
      guidelines: taskData.guidelines,
      deadline: taskData.deadline,
      notes: taskData.notes || '',
      agencyPay: taskData.agencyPay,
      status: 'pending_review',
      claimedBy: null,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'client_tasks', newClientTask.id), newClientTask);

      const actualAdminId = users.find(u => u.role === 'admin' || u.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com')?.id || 'admin-1';
      const adminNotif: AppNotification = {
        id: `notif-client-task-${Date.now()}`,
        userId: actualAdminId,
        type: 'client_update',
        title: 'New Client Task Proposal',
        message: `Client "${currentClient.name}" proposed a high reward ${taskData.type} task: "${taskData.title}". Check proposed payouts.`,
        read: false,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'notifications', adminNotif.id), adminNotif);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `client_tasks/${newClientTask.id}`);
    }
  };

  const clientReviewTaskSubmission = async (taskId: string, action: 'Approve' | 'RequestRevision' | 'Reject', feedback?: string) => {
    try {
      if (!currentClient) {
        throw new Error("You do not have permission to approve this submission.");
      }

      const docRef = doc(db, 'client_tasks', taskId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        throw new Error("Unable to process approval. Please try again.");
      }
      const clientTask = snap.data() as ClientTask;

      // Verify that the task belongs to this client
      if (clientTask.clientId !== currentClient.id) {
        throw new Error("You do not have permission to approve this submission.");
      }
      
      // Also check client status is approved
      const clientRecord = clients.find(c => c.id === currentClient.id);
      if (!clientRecord || (clientRecord.status !== 'approved' && clientRecord.status !== 'Approved')) {
        throw new Error("You do not have permission to approve this submission.");
      }
      
      const clientName = currentClient?.name || currentClient?.company || 'Client';

      // 9. Prevent duplicate wallet credits (important): check if already processed
      const q = query(collection(db, 'submissions'), where('taskId', '==', taskId));
      const subSnap = await getDocs(q);
      const pendingSub = subSnap.docs.map(d => d.data() as Submission)
        .find(s => s.status === 'Admin Approved (Waiting for Client Approval)');

      if (!pendingSub) {
        throw new Error("Unable to process approval. Please try again.");
      }

      if (action === 'Approve') {
        if (pendingSub && !pendingSub.billingProcessed) {
          const uRef = doc(db, 'users', pendingSub.userId);
          const userSnap = await getDoc(uRef);
          if (userSnap.exists()) {
            const u = userSnap.data() as User;
            await updateDoc(uRef, {
              balance: u.balance + pendingSub.reward,
              pendingBalance: Math.max(0, u.pendingBalance - pendingSub.reward),
              totalEarned: u.totalEarned + pendingSub.reward,
              xp: u.xp + 100
            });

            const tx: Transaction = {
              id: `tx-${Date.now()}`,
              userId: pendingSub.userId,
              type: 'earning',
              amount: pendingSub.reward,
              description: `Earning for client task: "${pendingSub.taskTitle}"`,
              date: new Date().toISOString(),
              status: 'Completed'
            };
            await setDoc(doc(db, 'transactions', tx.id), tx);

            // Add notification to member
            const memberNotif: AppNotification = {
              id: `notif-${Date.now()}`,
              userId: pendingSub.userId,
              type: 'task_approved',
              title: 'Client Approved Your Task! 💰',
              message: `Your proof for "${pendingSub.taskTitle}" was approved by the client! +$${pendingSub.reward} USDT has been credited to your wallet.`,
              read: false,
              timestamp: new Date().toISOString()
            };
            await setDoc(doc(db, 'notifications', memberNotif.id), memberNotif);
          }

          // Calculate & Settle Client Billing
          const clientRef = doc(db, 'clients', clientTask.clientId);
          const clientSnap = await getDoc(clientRef);
          if (clientSnap.exists()) {
            const clientData = clientSnap.data() as Client;
            await updateDoc(clientRef, {
              payAgencyBalance: (clientData.payAgencyBalance || 0) + pendingSub.reward
            });
          }

          // Update the submission with full audit logs & billing marks
          await updateDoc(doc(db, 'submissions', pendingSub.id), {
            status: 'Client Approved (Payment Released)',
            feedback: feedback || 'Approved & Payment Released by Client',
            clientApprovedAt: new Date().toISOString(),
            paymentReleasedTime: new Date().toISOString(),
            approvedBy: clientName,
            billingProcessed: true,
            approvedAmount: pendingSub.reward,
            approvalTimestamp: new Date().toISOString(),
            invoiceStatus: 'Unpaid',
            clientId: clientTask.clientId
          });
        }

        await updateDoc(docRef, {
          status: 'completed',
          feedback: feedback || 'Approved & Credited by Client'
        });

        const taskRef = doc(db, 'tasks', taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
          await updateDoc(taskRef, { status: 'completed' });
        }
      } else { // RequestRevision / Reject -> Both act as client rejection
        if (pendingSub) {
          const uRef = doc(db, 'users', pendingSub.userId);
          const userSnap = await getDoc(uRef);
          if (userSnap.exists()) {
            const u = userSnap.data() as User;
            await updateDoc(uRef, {
              pendingBalance: Math.max(0, u.pendingBalance - pendingSub.reward)
            });
          }

          await updateDoc(doc(db, 'submissions', pendingSub.id), {
            status: 'Client Rejected',
            feedback: feedback || 'Rejected by Client.',
            rejectionReason: feedback || 'Guidelines not met',
            clientNote: feedback || 'Guidelines not met',
            clientApprovedAt: new Date().toISOString()
          });

          // Add notification to member
          const memberNotif: AppNotification = {
            id: `notif-${Date.now()}`,
            userId: pendingSub.userId,
            type: 'task_rejected',
            title: 'Client Rejected Your Proof ❌',
            message: `Your proof for "${pendingSub.taskTitle}" was rejected by the client. Reason: ${feedback || 'None provided'}.`,
            read: false,
            timestamp: new Date().toISOString()
          };
          await setDoc(doc(db, 'notifications', memberNotif.id), memberNotif);
        }

        await updateDoc(docRef, {
          status: 'revision',
          revisionNote: feedback || 'Submission Rejected'
        });

        const taskRef = doc(db, 'tasks', taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
          await updateDoc(taskRef, { status: 'available' });
        }
      }
    } catch (error: any) {
      // Re-throw direct custom human-friendly error messages
      if (error?.message && (
        error.message.includes("You do not have permission") ||
        error.message.includes("Unable to process approval")
      )) {
        throw error;
      }
      handleFirestoreError(error, OperationType.UPDATE, `client_tasks/${taskId}`);
    }
  };

  const memberClaimClientTask = async (taskId: string) => {
    // member claim details
  };

  const memberSubmitClientTaskProof = async (taskId: string, proofLink: string) => {
    if (!currentUser) throw new Error('Unauthenticated');
    await checkBannedOrSuspended();
    const submissionId = `sub-${Date.now()}`;
    const submissionData: Submission = {
      id: submissionId,
      taskId: taskId || null,
      taskTitle: 'Client Task Submission',
      taskType: 'Twitter' as TaskType,
      reward: 0,
      userId: currentUser.id || null,
      userFullName: currentUser.fullName || null,
      redditUsername: currentUser.redditUsername || null,
      proofUrl: proofLink || null,
      submissionLink: proofLink || null,
      status: 'Under Admin Review' as any,
      submittedAt: new Date().toISOString(),
      submissionTime: new Date().toISOString(),
      feedback: null,
      adminNote: null,
      rejectionReason: null,
      clientNote: null,
      reviewedAt: null,
      reviewedBy: null,
      approvedAt: null,
      clientApprovedAt: null,
      memberId: currentUser.id || null,
      memberName: currentUser.fullName || currentUser.name || null,
      proofLink: proofLink || null,
      memberPay: null,
      agencyPay: null
    };

    await setDoc(doc(db, 'submissions', submissionId), submissionData);
  };

  const memberRaiseDispute = async (taskId: string, reason: string) => {
    // dispute details
  };

  const memberRequestPayout = async (amount: number, address: string, method: 'USDT_BEP20' | 'BINANCE_ID') => {
    // request payout
  };

  const adminReviewClient = async (clientId: string, status: 'approved' | 'rejected' | 'suspended', reason?: string) => {
    await updateDoc(doc(db, 'clients', clientId), {
      status,
      rejectionReason: reason || null
    });
  };

  const adminToggleTaskUpload = async (clientId: string, enabled: boolean) => {
    await updateDoc(doc(db, 'clients', clientId), {
      taskUploadEnabled: enabled
    });
  };

  const adminToggleGlobalTaskUpload = (disabled: boolean) => {
    setSettings(prev => ({ ...prev, disableAllClientUploads: disabled }));
  };

  const adminReviewClientTask = async (taskId: string, action: 'publish' | 'reject' | 'remove' | 'force_complete', memberPay?: number, reason?: string) => {
    try {
      const docRef = doc(db, 'client_tasks', taskId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;
      const task = snap.data() as ClientTask;

      if (action === 'publish') {
        const pay = memberPay ?? (task.agencyPay * 0.70);
        await updateDoc(docRef, {
          status: 'approved/live',
          memberPay: pay,
          approvedAt: new Date().toISOString(),
          approvedByAdmin: true
        });

        const newTask: Task = {
          id: task.id,
          title: task.title,
          description: task.description,
          type: task.type.toLowerCase().includes('comment') ? 'comment' : 'post',
          reward: pay,
          difficulty: 'Medium',
          deadline: task.deadline,
          maxSubmissions: 1,
          completedSubmissionsCount: 0,
          proofRequired: 'screenshot',
          status: 'available',
          targetSubreddit: task.targetSubreddit || '',
          postUrlToCommentOn: task.postUrlToCommentOn || '',
          postGuidelines: task.guidelines || ''
        };
        await setDoc(doc(db, 'tasks', newTask.id), newTask);

        const clientNotif: AppNotification = {
          id: `notif-client-approved-${Date.now()}`,
          userId: task.clientId,
          type: 'client_update',
          title: 'Campaign Task Approved! 🚀',
          message: `Your campaign "${task.title}" has been approved by admins and is now live for members. Creator pay: $${pay.toFixed(2)} USDT.`,
          read: false,
          timestamp: new Date().toISOString()
        };
        await setDoc(doc(db, 'notifications', clientNotif.id), clientNotif);
      } else if (action === 'reject') {
        await updateDoc(docRef, {
          status: 'revision',
          revisionNote: reason || 'Details insufficient or payout rate mismatch'
        });
      } else if (action === 'remove') {
        await updateDoc(docRef, {
          status: 'removed',
          removedAt: new Date().toISOString(),
          revisionNote: reason || 'Administrative removal'
        });
        await deleteDoc(doc(db, 'tasks', taskId));
      } else if (action === 'force_complete') {
        await updateDoc(docRef, {
          status: 'completed',
          approvedByAdmin: true,
          approvedByClient: true,
          completedAt: new Date().toISOString()
        });

        // 9. Prevent duplicate wallet credits
        const q = query(collection(db, 'submissions'), where('taskId', '==', taskId));
        const subSnap = await getDocs(q);
        const pendingSub = subSnap.docs.map(d => d.data() as Submission)
          .find(s => s.status === 'Admin Approved (Waiting for Client Approval)' || s.status === 'Under Admin Review');

        if (pendingSub && !pendingSub.billingProcessed) {
          const uRef = doc(db, 'users', pendingSub.userId);
          const uSnap = await getDoc(uRef);
          if (uSnap.exists()) {
            const u = uSnap.data() as User;
            await updateDoc(uRef, {
              balance: u.balance + pendingSub.reward,
              pendingBalance: Math.max(0, u.pendingBalance - pendingSub.reward),
              totalEarned: u.totalEarned + pendingSub.reward,
              xp: u.xp + 100
            });

            const tx: Transaction = {
              id: `tx-${Date.now()}`,
              userId: pendingSub.userId,
              type: 'earning',
              amount: pendingSub.reward,
              description: `Earning for client task: "${pendingSub.taskTitle}" (Force Completed)`,
              date: new Date().toISOString(),
              status: 'Completed'
            };
            await setDoc(doc(db, 'transactions', tx.id), tx);
          }

          // Calculate & Settle Client Billing
          const clientRef = doc(db, 'clients', task.clientId);
          const clientSnap = await getDoc(clientRef);
          if (clientSnap.exists()) {
            const clientData = clientSnap.data() as Client;
            await updateDoc(clientRef, {
              payAgencyBalance: (clientData.payAgencyBalance || 0) + pendingSub.reward
            });
          }

          await updateDoc(doc(db, 'submissions', pendingSub.id), {
            status: 'Client Approved (Payment Released)',
            feedback: 'Force completed by Admin',
            adminApprovalTime: pendingSub.adminApprovalTime || new Date().toISOString(),
            clientApprovalTime: new Date().toISOString(),
            paymentReleasedTime: new Date().toISOString(),
            approvedBy: 'admin',
            billingProcessed: true,
            approvedAmount: pendingSub.reward,
            approvalTimestamp: new Date().toISOString(),
            invoiceStatus: 'Unpaid',
            clientId: task.clientId
          });
        }

        const taskRef = doc(db, 'tasks', taskId);
        const tSnap = await getDoc(taskRef);
        if (tSnap.exists()) {
          await updateDoc(taskRef, { status: 'completed' });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `client_tasks/${taskId}`);
    }
  };

  const adminResolveDispute = async (taskId: string, outcome: 'force_approved' | 'upheld') => {
    // Dispute complete state lock
  };

  const adminConfirmClientPayment = async (clientId: string, amount: number, referenceNote?: string, receiptUrl?: string) => {
    const clientRef = doc(db, 'clients', clientId);
    const snap = await getDoc(clientRef);
    if (!snap.exists()) return;
    const client = snap.data() as Client;

    const newPayment: ClientPayment = {
      id: `payment-${Date.now()}`,
      clientId,
      clientName: client.name,
      amount,
      tasksIncluded: [],
      paidAt: new Date().toISOString(),
      receiptUrl: receiptUrl || 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&w=150&h=150&q=80',
      markedPaidBy: 'Admin',
      referenceNote: referenceNote || ''
    };

    await updateDoc(clientRef, {
      payAgencyBalance: client.payAgencyBalance + amount,
      payAgencyHistory: [newPayment, ...(client.payAgencyHistory || [])]
    });
  };

  const clientSubmitPaymentProof = async (proof: {
    clientId: string;
    clientName: string;
    clientCompany: string;
    amount: number;
    transactionId: string | null;
    paymentMethod?: string;
    proofImageUrl: string;
    notes: string | null;
  }) => {
    if (currentClient) {
      if (currentClient.status === 'suspended' || currentClient.status === 'Suspended') {
        throw new Error("⚠️ Your account is suspended. You cannot perform this action.");
      }
      if (currentClient.status === 'banned' || currentClient.status === 'Banned') {
        throw new Error("❌ Your account is banned. You cannot perform this action.");
      }
    }
    try {
      const proofId = `proof-${Date.now()}`;
      await setDoc(doc(db, 'client_payments', proofId), {
        id: proofId,
        clientId: proof.clientId,
        clientName: proof.clientName,
        clientCompany: proof.clientCompany,
        amount: Number(proof.amount),
        transactionId: proof.transactionId || null,
        paymentMethod: proof.paymentMethod || null,
        proofImageUrl: proof.proofImageUrl,
        notes: proof.notes || null,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        verifiedAt: null,
        verifiedBy: null,
        rejectionReason: null
      });

      // Send verification notification to admin
      const adminNotifId = `notif-payment-proof-${Date.now()}`;
      const actualAdminId = users.find(u => u.role === 'admin' || u.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com')?.id || 'admin-1';
      const adminNotif: AppNotification = {
        id: adminNotifId,
        userId: actualAdminId, // Admin channel identifier
        type: 'client_update',
        title: 'New Payment Proof Uploaded',
        message: `Brand "${proof.clientCompany}" has uploaded a payment proof of $${Number(proof.amount).toFixed(2)} USDT for verification.`,
        read: false,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'notifications', adminNotif.id), adminNotif);
    } catch (error) {
      console.error('Error in clientSubmitPaymentProof:', error);
      throw error;
    }
  };

  const adminVerifyPaymentProof = async (proofId: string, adminEmail: string) => {
    try {
      const proofRef = doc(db, 'client_payments', proofId);
      const proofSnap = await getDoc(proofRef);
      if (!proofSnap.exists()) throw new Error('Proof not found');
      const proof = proofSnap.data() as ClientPaymentProof;

      const clientRef = doc(db, 'clients', proof.clientId);
      const clientSnap = await getDoc(clientRef);
      if (!clientSnap.exists()) throw new Error('Client not found');
      const client = clientSnap.data() as Client;

      const newBalance = Math.max(0, (client.payAgencyBalance || 0) - proof.amount);

      const newPayment: ClientPayment = {
        id: `payment-${Date.now()}`,
        clientId: proof.clientId,
        clientName: client.name,
        amount: proof.amount,
        tasksIncluded: [],
        paidAt: new Date().toISOString(),
        receiptUrl: proof.proofImageUrl,
        markedPaidBy: adminEmail,
        referenceNote: `Verified payment proof. Tx: ${proof.transactionId || 'None'}. Notes: ${proof.notes || ''}`
      };

      await updateDoc(clientRef, {
        payAgencyBalance: newBalance,
        payAgencyHistory: [newPayment, ...(client.payAgencyHistory || [])],
        taskUploadEnabled: true
      });

      await updateDoc(proofRef, {
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        verifiedBy: adminEmail
      });

      const notifId = `notif-${Date.now()}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: proof.clientId,
        title: 'Payment Proof Verified',
        message: `Your payment proof of $${proof.amount.toFixed(2)} USDT has been verified! Outstanding balance credited.`,
        type: 'payment',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in adminVerifyPaymentProof:', error);
      throw error;
    }
  };

  const adminRejectPaymentProof = async (proofId: string, rejectReason: string, adminEmail: string) => {
    try {
      const proofRef = doc(db, 'client_payments', proofId);
      const proofSnap = await getDoc(proofRef);
      if (!proofSnap.exists()) throw new Error('Proof not found');
      const proof = proofSnap.data() as ClientPaymentProof;

      await updateDoc(proofRef, {
        status: 'rejected',
        rejectionReason: rejectReason,
        verifiedAt: new Date().toISOString(),
        verifiedBy: adminEmail
      });

      const notifId = `notif-${Date.now()}`;
      await setDoc(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: proof.clientId,
        title: 'Payment Proof Rejected',
        message: `Your payment proof of $${proof.amount.toFixed(2)} USDT was rejected. Reason: ${rejectReason}`,
        type: 'payment',
        read: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in adminRejectPaymentProof:', error);
      throw error;
    }
  };

  const adminReviewPayout = async (requestId: string, status: 'Approved' | 'Rejected') => {
    // Review logic
  };

  const adminRemoveCompletedTask = async (taskId: string) => {
    await updateDoc(doc(db, 'tasks', taskId), {
      status: 'completed'
    });
  };

  const adminDeductMember = async (userId: string, taskId: string, taskName: string, amount: number, reason: string) => {
    const uRef = doc(db, 'users', userId);
    const snap = await getDoc(uRef);
    if (!snap.exists()) return;
    const u = snap.data() as User;

    if (u.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com') {
      throw new Error("Security Violation: Deducting values from the Protected Owner Account is prohibited.");
    }

    const newDec: DeductionRecord = {
      id: `ded-${Date.now()}`,
      amount,
      taskName,
      reason,
      date: new Date().toISOString()
    };

    await updateDoc(uRef, {
      balance: Math.max(0, u.balance - amount),
      deductionHistory: [newDec, ...(u.deductionHistory || [])]
    });

    const dedTransaction: Transaction = {
      id: `ded-tx-${Date.now()}`,
      userId,
      type: 'deduction',
      amount,
      description: `Deduction for task "${taskName}": ${reason}`,
      date: new Date().toISOString(),
      status: 'Completed'
    };
    await setDoc(doc(db, 'transactions', dedTransaction.id), dedTransaction);

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      userId,
      type: 'client_update',
      title: 'Balance Deducted ❌',
      message: `❌ $${amount.toFixed(2)} deducted from your wallet. Reason: ${reason}`,
      read: false,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', notif.id), notif);
  };

  const clientSendMessage = async (text: string, fileUrl?: string) => {
    if (!currentClient) return;
    if (currentClient.status === 'banned' || currentClient.status === 'Banned') {
      throw new Error("❌ Your account is banned. You cannot send messages.");
    }
    const chatId = currentClient.id;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentClient.id,
      senderName: currentClient.name,
      text,
      fileUrl,
      timestamp: new Date().toISOString()
    };

    const chatDocRef = doc(db, 'chats', chatId);
    const snap = await getDoc(chatDocRef);
    if (snap.exists()) {
      const existingChat = snap.data() as ClientChat;
      await setDoc(chatDocRef, {
        ...existingChat,
        messages: [...existingChat.messages, newMsg],
        lastMessageTimestamp: new Date().toISOString(),
        resolvedStatus: 'unresolved'
      });
    } else {
      const newChat: ClientChat = {
        id: chatId,
        clientId: currentClient.id,
        clientName: currentClient.name,
        messages: [newMsg],
        lastMessageTimestamp: new Date().toISOString(),
        resolvedStatus: 'unresolved'
      };
      await setDoc(chatDocRef, newChat);
    }
  };

  const adminSendMessage = async (clientId: string, text: string, fileUrl?: string) => {
    const clientRecord = clients.find(c => c.id === clientId);
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'admin',
      senderName: 'Admin',
      text,
      fileUrl,
      timestamp: new Date().toISOString()
    };

    const chatDocRef = doc(db, 'chats', clientId);
    const snap = await getDoc(chatDocRef);
    if (snap.exists()) {
      const existingChat = snap.data() as ClientChat;
      await setDoc(chatDocRef, {
        ...existingChat,
        messages: [...existingChat.messages, newMsg],
        lastMessageTimestamp: new Date().toISOString()
      });
    } else if (clientRecord) {
      const newChat: ClientChat = {
        id: clientId,
        clientId,
        clientName: clientRecord.name,
        messages: [newMsg],
        lastMessageTimestamp: new Date().toISOString(),
        resolvedStatus: 'unresolved'
      };
      await setDoc(chatDocRef, newChat);
    }
  };

  const adminToggleChatResolution = async (clientId: string, status: 'resolved' | 'unresolved') => {
    await updateDoc(doc(db, 'chats', clientId), {
      resolvedStatus: status
    });
  };

  const blacklistIP = (ip: string) => {
    setBlacklistedIPs(prev => Array.from(new Set([...prev, ip])));
  };

  const unblacklistIP = (ip: string) => {
    setBlacklistedIPs(prev => prev.filter(item => item !== ip));
  };

  const adminReviewFraudAction = async (alertId: string, action: 'dismiss' | 'warn' | 'suspend' | 'ban' | 'freeze') => {
    try {
      if (action === 'dismiss') {
        await updateDoc(doc(db, 'fraud_alerts', alertId), { status: 'dismissed' });
      } else {
        await updateDoc(doc(db, 'fraud_alerts', alertId), { status: 'resolved', recommendedAction: `Taken Action: ${action}` });
      }
    } catch (e) {
      setFraudAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: action === 'dismiss' ? 'dismissed' as const : 'resolved' as const } : a));
    }
  };

  const dismissFraudAlert = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'fraud_alerts', alertId), { status: 'dismissed' });
    } catch (e) {
      setFraudAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'dismissed' as const } : a));
    }
  };

  const deleteDuplicateGroup = async (groupId: string) => {
    try {
      await deleteDoc(doc(db, 'duplicate_groups', groupId));
    } catch (e) {
      setDuplicateGroups(prev => prev.filter(g => g.id !== groupId));
    }
  };

  const mergeDuplicateAccounts = async (groupId: string, primaryUsername: string) => {
    try {
      await deleteDoc(doc(db, 'duplicate_groups', groupId));
    } catch (e) {
      setDuplicateGroups(prev => prev.filter(g => g.id !== groupId));
    }
  };

  const scanForDuplicates = async () => {
    try {
      const groups: DuplicateGroup[] = [];
      const alerts: FraudAlert[] = [];

      const ipToUsers: Record<string, User[]> = {};
      const fingerprintToUsers: Record<string, User[]> = {};
      const redditToUsers: Record<string, User[]> = {};

      users.forEach(u => {
        if (u.ipHistory) {
          u.ipHistory.forEach(history => {
            if (history.ip && history.ip !== '127.0.0.1') {
              if (!ipToUsers[history.ip]) ipToUsers[history.ip] = [];
              if (!ipToUsers[history.ip].some(existing => existing.id === u.id)) {
                ipToUsers[history.ip].push(u);
              }
            }
          });
        }
        if (u.deviceFingerprints) {
          u.deviceFingerprints.forEach(fp => {
            if (fp) {
              if (!fingerprintToUsers[fp]) fingerprintToUsers[fp] = [];
              if (!fingerprintToUsers[fp].some(existing => existing.id === u.id)) {
                fingerprintToUsers[fp].push(u);
              }
            }
          });
        }
        if (u.redditUsername) {
          const normReddit = u.redditUsername.toLowerCase().trim().replace('u/', '');
          if (normReddit) {
            if (!redditToUsers[normReddit]) redditToUsers[normReddit] = [];
            if (!redditToUsers[normReddit].some(existing => existing.id === u.id)) {
              redditToUsers[normReddit].push(u);
            }
          }
        }
      });

      Object.entries(ipToUsers).forEach(([ip, userList]) => {
        if (ip && userList.length > 1) {
          const grpId = `dup-ip-${ip.replace(/\./g, '-')}`;
          const accountIds = userList.map(item => item.id);
          groups.push({
            id: grpId,
            accounts: accountIds,
            sharedIdentifier: ip,
            type: 'ip'
          });

          alerts.push({
            id: `alert-ip-${ip.replace(/\./g, '-')}`,
            type: 'IP Match',
            userId: userList[0].id,
            userName: userList[0].fullName,
            userEmail: userList[0].email,
            fraudScore: 85,
            timestamp: new Date().toISOString(),
            status: 'pending',
            details: `Multiple accounts login on shared IP: (${ip}). Accounts: ${userList.map(item => '@' + item.redditUsername).join(', ')}`,
            recommendedAction: 'Freeze Accounts'
          });
        }
      });

      Object.entries(fingerprintToUsers).forEach(([fp, userList]) => {
        if (fp && userList.length > 1) {
          const grpId = `dup-fp-${fp.substring(0, 10)}`;
          const accountIds = userList.map(item => item.id);
          groups.push({
            id: grpId,
            accounts: accountIds,
            sharedIdentifier: fp,
            type: 'fingerprint'
          });

          alerts.push({
            id: `alert-fp-${fp.substring(0, 10)}`,
            type: 'Fingerprint Match',
            userId: userList[0].id,
            userName: userList[0].fullName,
            userEmail: userList[0].email,
            fraudScore: 95,
            timestamp: new Date().toISOString(),
            status: 'pending',
            details: `Multiple accounts with identical hardware profile. Accounts: ${userList.map(item => '@' + item.redditUsername).join(', ')}`,
            recommendedAction: 'Ban Accounts'
          });
        }
      });

      for (const g of groups) {
        await setDoc(doc(db, 'duplicate_groups', g.id), g);
      }
      for (const a of alerts) {
        await setDoc(doc(db, 'fraud_alerts', a.id), a);
      }
    } catch (e) {
      console.error("Duplicate scanning failed", e);
    }
  };

  const createTicket = async (subject: string, category: SupportTicket['category'], description: string) => {
    if (!currentUser) return;
    const newTicket: SupportTicket = {
      id: `ticket-${Date.now()}`,
      userId: currentUser.id,
      userFullName: currentUser.fullName,
      subject,
      category,
      description,
      status: 'Open',
      messages: [],
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'tickets', newTicket.id), newTicket);
  };

  const replyToTicket = async (ticketId: string, text: string, sender: 'user' | 'admin') => {
    const ticketRef = doc(db, 'tickets', ticketId);
    const snap = await getDoc(ticketRef);
    if (!snap.exists()) return;
    const t = snap.data() as SupportTicket;

    const newMsg: TicketMessage = {
      sender,
      text,
      timestamp: new Date().toISOString()
    };

    await updateDoc(ticketRef, {
      status: sender === 'admin' ? 'In Progress' : 'Open',
      messages: [...(t.messages || []), newMsg]
    });
  };

  const submitTaskProof = async (taskId: string, proofUrl: string, submissionLink?: string): Promise<void> => {
    if (!currentUser) throw new Error('Unauthenticated');
    await checkBannedOrSuspended();
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    if (!taskSnap.exists()) throw new Error('Task not found');
    const task = taskSnap.data() as Task;

    const lowerLink = (submissionLink || proofUrl || '').toLowerCase();
    const isFake = lowerLink.includes('404') || lowerLink.includes('removed') || lowerLink.includes('deleted') || lowerLink.length < 15;

    let status: string = 'Under Admin Review';
    let feedback = '';

    if (isFake) {
      status = 'Client Rejected';
      feedback = 'Auto-rejected: Your submission contains invalid or deleted links.';
    }

    const newSub: Submission = {
      id: `sub-${Date.now()}`,
      taskId: taskId || null,
      taskTitle: task.title || null,
      taskType: task.type || null,
      reward: task.reward || 0,
      userId: currentUser.id || null,
      userFullName: currentUser.fullName || null,
      redditUsername: currentUser.redditUsername || null,
      proofUrl: proofUrl || null,
      submissionLink: submissionLink || null,
      status: status as any,
      feedback: feedback || null,
      submittedAt: new Date().toISOString(),
      submissionTime: new Date().toISOString(), // Audit field
      matchScore: null,
      aiConfidence: null,
      isFlagged: false,
      flagReason: null,
      adminNote: null,
      rejectionReason: null,
      clientNote: null,
      reviewedAt: null,
      reviewedBy: null,
      approvedAt: null,
      clientApprovedAt: null,
      memberId: currentUser.id || null,
      memberName: currentUser.fullName || currentUser.name || null,
      proofLink: proofUrl || submissionLink || null,
      memberPay: task.reward || null,
      agencyPay: null
    };

    await setDoc(doc(db, 'submissions', newSub.id), newSub);

    await updateDoc(taskRef, {
      status: 'completed',
      completedSubmissionsCount: task.completedSubmissionsCount + 1
    });

    await updateDoc(doc(db, 'users', currentUser.id), {
      active_task_id: null,
      pendingBalance: currentUser.pendingBalance + (status === 'Under Admin Review' ? task.reward : 0)
    });

    // Synchronize to client tasks if it's a client task
    if (taskId.startsWith('client-task-')) {
      const clientTaskRef = doc(db, 'client_tasks', taskId);
      const ctSnap = await getDoc(clientTaskRef);
      if (ctSnap.exists()) {
        await updateDoc(clientTaskRef, {
          status: isFake ? 'approved/live' : 'under_admin_review',
          proofLink: proofUrl || submissionLink || '',
          submittedAt: new Date().toISOString(),
          claimedBy: isFake ? null : currentUser.redditUsername
        });
      }
    }
  };

  const claimTask = async (taskId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('Unauthenticated');
    }
    
    // Check if banned or suspended
    await checkBannedOrSuspended();

    // 1. Check account status approval
    if (currentUser.status !== 'Approved') {
      throw new Error("You do not currently have permission to claim this task.");
    }

    // Check if already holding another active task reservation
    if (currentUser.active_task_id && currentUser.active_task_id !== taskId) {
      throw new Error("You can only claim one task at a time. Please finish or unclaim your currently active task.");
    }

    const taskRef = doc(db, 'tasks', taskId);
    const snap = await getDoc(taskRef);
    if (!snap.exists()) {
      throw new Error('Task not found');
    }
    const t = snap.data() as Task;

    // 2. Check if task is already claimed
    if (t.status !== 'available' || (t.claimed_by && t.claimed_by !== currentUser.id)) {
      throw new Error("Task already claimed.");
    }

    // 3. Check slots available
    if (t.completedSubmissionsCount >= t.maxSubmissions) {
      throw new Error("Unable to claim task.");
    }

    // 4. Check special tier constraints (enough karma / tier)
    if (t.isSpecial && t.minKarmaRequired) {
      const userKarma = currentUser.karma || 0;
      if (userKarma < t.minKarmaRequired) {
        throw new Error("You do not currently have permission to claim this task.");
      }
    }

    // 5. Check if it's their own client task to prevent self-claiming
    if (taskId.startsWith('client-task-') || taskId.includes('client-task')) {
      const clientTaskRef = doc(db, 'client_tasks', taskId);
      const ctSnap = await getDoc(clientTaskRef);
      if (ctSnap.exists()) {
        const ctData = ctSnap.data() as ClientTask;
        if (ctData.clientId === currentUser.id) {
          throw new Error("You do not currently have permission to claim this task.");
        }
      }
    }

    const expire = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    
    try {
      await updateDoc(taskRef, {
        status: 'claimed',
        claimed_by: currentUser.id,
        claimed_at: new Date().toISOString(),
        claim_expires_at: expire
      });

      await updateDoc(doc(db, 'users', currentUser.id), {
        active_task_id: taskId
      });

      // Synchronize to client tasks:
      if (taskId.startsWith('client-task-') || taskId.includes('client-task')) {
        const clientTaskRef = doc(db, 'client_tasks', taskId);
        const ctSnap = await getDoc(clientTaskRef);
        if (ctSnap.exists()) {
          await updateDoc(clientTaskRef, {
            status: 'claimed',
            claimedBy: currentUser.redditUsername,
            claimedAt: new Date().toISOString(),
            completionDeadline: expire
          });
        }
      }
    } catch (dbErr: any) {
      console.error('[CLAIM ENGINE] Firestore transaction write failed:', dbErr);
      
      const errMsg = dbErr?.message || String(dbErr);
      if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('denied')) {
        throw new Error("You do not currently have permission to claim this task.");
      }
      throw new Error("Unable to claim task.");
    }
  };

  const unclaimTask = async (taskId: string, notifyExpired: boolean = false) => {
    if (!currentUser) return;
    await checkBannedOrSuspended();
    const taskRef = doc(db, 'tasks', taskId);
    const snap = await getDoc(taskRef);
    if (!snap.exists()) return;
    const t = snap.data() as Task;
    const uid = t.claimed_by;

    await updateDoc(taskRef, {
      status: 'available',
      claimed_by: null,
      claimed_at: null,
      claim_expires_at: null
    });

    if (uid) {
      await updateDoc(doc(db, 'users', uid), {
        active_task_id: null
      });

      if (notifyExpired) {
         const notif: AppNotification = {
           id: `notif-${Date.now()}`,
           userId: uid,
           type: 'task_rejected',
           title: 'Task reservation expired',
           message: `Your reservation of task "${t.title}" expired.`,
           read: false,
           timestamp: new Date().toISOString()
         };
         await setDoc(doc(db, 'notifications', notif.id), notif);
      }
    }

    // Synchronize to client tasks:
    if (taskId.startsWith('client-task-')) {
      const clientTaskRef = doc(db, 'client_tasks', taskId);
      const ctSnap = await getDoc(clientTaskRef);
      if (ctSnap.exists()) {
        await updateDoc(clientTaskRef, {
          status: 'approved/live',
          claimedBy: null,
          claimedAt: null,
          completionDeadline: null
        });
      }
    }
  };

  const requestWithdrawal = async (amount: number, method: 'USDT_BEP20' | 'BINANCE_ID', address: string) => {
    if (!currentUser) return;
    await checkBannedOrSuspended();
    if (currentUser.balance < amount) throw new Error('Insufficient balance');

    const newW: Withdrawal = {
      id: `w-${Date.now()}`,
      userId: currentUser.id,
      userFullName: currentUser.fullName,
      email: currentUser.email,
      amount,
      withdrawalMethod: method,
      paymentAddress: address,
      requestedAt: new Date().toISOString(),
      status: 'Pending'
    };

    await setDoc(doc(db, 'withdrawals', newW.id), newW);

    await updateDoc(doc(db, 'users', currentUser.id), {
      balance: currentUser.balance - amount
    });
  };

  const markNotificationRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), {
      read: true
    });
  };

  const clearAllNotifications = async () => {
    if (!currentUser) return;
    const userNotifs = notifications.filter(n => n.userId === currentUser.id);
    for (const n of userNotifs) {
      await updateDoc(doc(db, 'notifications', n.id), {
        read: true
      });
    }
  };



  const adminApproveUser = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), {
      status: 'Approved'
    });
    
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      userId,
      type: 'verification',
      title: 'Profile Approved! 🎉',
      message: 'Your Reddit profile registration has been verified and fully approved.',
      read: false,
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', notif.id), notif);
  };

  const adminRejectUser = async (userId: string, reason: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com') {
      throw new Error("Security Violation: Rejection of the Protected Owner Account (kalloldeyprivate20@gmail.com) is strictly locked.");
    }
    await updateDoc(doc(db, 'users', userId), {
      status: 'Rejected',
      rejectionReason: reason
    });
  };

  const adminBanUser = async (userId: string, reason: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com') {
      throw new Error("Security Violation: Banning the Protected Owner Account (kalloldeyprivate20@gmail.com) is strictly locked.");
    }
    await updateDoc(doc(db, 'users', userId), {
      status: 'banned',
      isBanned: true,
      bannedAt: new Date().toISOString(),
      banReason: reason
    });

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      userId,
      type: 'account_banned',
      title: 'Account Banned',
      message: 'Your account has been permanently banned for violating our Terms of Service. If you believe this is a mistake contact verseinfluencer@yahoo.com',
      read: false,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', notif.id), notif);
  };

  const adminSuspendUser = async (userId: string, reason: string, duration?: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com') {
      throw new Error("Security Violation: Suspending the Protected Owner Account (kalloldeyprivate20@gmail.com) is strictly locked.");
    }
    await updateDoc(doc(db, 'users', userId), {
      status: 'suspended',
      isSuspended: true,
      bannedAt: new Date().toISOString(),
      banReason: reason,
      suspensionReason: reason,
      suspensionDuration: duration || 'permanent'
    });

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      userId,
      type: 'account_suspended',
      title: 'Account Suspended',
      message: 'Your account has been temporarily suspended. Contact verseinfluencer@yahoo.com for more information.',
      read: false,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', notif.id), notif);
  };

  const adminUnbanUser = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), {
      status: 'Approved',
      isBanned: false,
      banReason: null,
      bannedAt: null
    });

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      userId,
      type: 'account_reinstated',
      title: 'Account Reinstated',
      message: '✅ Your account has been reinstated. You can now access Influencer Verse again.',
      read: false,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', notif.id), notif);
  };

  const adminUnsuspendUser = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), {
      status: 'Approved',
      isSuspended: false,
      suspensionReason: null,
      suspensionDuration: null,
      banReason: null,
      bannedAt: null
    });

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      userId,
      type: 'account_reinstated',
      title: 'Account Reinstated',
      message: '✅ Your account has been reinstated. You can now access Influencer Verse again.',
      read: false,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', notif.id), notif);
  };

  const adminPromoteToModerator = async (targetUserId: string, operatorUser: User) => {
    await updateDoc(doc(db, 'users', targetUserId), {
      role: 'moderator'
    });

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      userId: targetUserId,
      type: 'verification',
      title: 'Promoted to Moderator',
      message: '🎉 Congratulations! You have been promoted to a Moderator in Influencer Verse.',
      read: false,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', notif.id), notif);

    const logId = `log-${Date.now()}`;
    await setDoc(doc(db, 'audit_logs', logId), {
      id: logId,
      action: 'Promote to Moderator',
      targetUserId,
      operatorId: operatorUser.id,
      operatorName: operatorUser.fullName,
      operatorRole: operatorUser.role,
      timestamp: new Date().toISOString()
    });
  };

  const adminRemoveModerator = async (targetUserId: string, operatorUser: User) => {
    await updateDoc(doc(db, 'users', targetUserId), {
      role: 'user'
    });

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      userId: targetUserId,
      type: 'verification',
      title: 'Demoted to Member',
      message: 'Your Moderator privileges have been removed.',
      read: false,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', notif.id), notif);

    const logId = `log-${Date.now()}`;
    await setDoc(doc(db, 'audit_logs', logId), {
      id: logId,
      action: 'Demote Moderator to Member',
      targetUserId,
      operatorId: operatorUser.id,
      operatorName: operatorUser.fullName,
      operatorRole: operatorUser.role,
      timestamp: new Date().toISOString()
    });
  };

  const adminCreateTask = async (taskData: Omit<Task, 'id' | 'completedSubmissionsCount' | 'status'> & { isSpecial?: boolean; minKarmaRequired?: number; specialLabel?: string }) => {
    const newTask: Task = {
      ...taskData,
      type: taskData.type.toLowerCase().includes('comment') ? 'comment' : 'post',
      id: `task-${Date.now()}`,
      completedSubmissionsCount: 0,
      status: 'available'
    };
    await setDoc(doc(db, 'tasks', newTask.id), newTask);
  };

  const adminEditTask = async (taskId: string, taskData: Partial<Task>) => {
    const editData = { ...taskData };
    if (editData.type) {
      editData.type = editData.type.toLowerCase().includes('comment') ? 'comment' : 'post';
    }
    await updateDoc(doc(db, 'tasks', taskId), editData);
  };

  const adminDeleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, 'tasks', taskId));
  };

  const adminReviewSubmission = async (submissionId: string, status: 'Approved' | 'Rejected', feedback?: string) => {
    const subRef = doc(db, 'submissions', submissionId);
    const subSnap = await getDoc(subRef);
    if (!subSnap.exists()) return;
    const sub = subSnap.data() as Submission;
    const uRef = doc(db, 'users', sub.userId);
    const userSnap = await getDoc(uRef);
    if (!userSnap.exists()) return;
    const u = userSnap.data() as User;

    const isClientTask = sub.taskId && sub.taskId.startsWith('client-task-');

    if (status === 'Approved') {
      // 3. If admin approves → task status becomes "Admin Approved (Waiting for Client Approval)" ONLY.
      // Wallet balance is NOT updated here.
      await updateDoc(subRef, {
        status: 'Admin Approved (Waiting for Client Approval)',
        feedback: feedback || 'Admin approved. Awaiting final client confirmation.',
        adminApprovalTime: new Date().toISOString()
      });

      if (isClientTask) {
        // Elevate client task campaign status so it is now active for client action/review
        const clientTaskRef = doc(db, 'client_tasks', sub.taskId);
        const ctSnap = await getDoc(clientTaskRef);
        if (ctSnap.exists()) {
          await updateDoc(clientTaskRef, {
            status: 'submitted', // Client dashboard monitors 'submitted'
            claimedBy: sub.redditUsername || sub.userFullName || 'Member',
            proofLink: sub.proofUrl || sub.submissionLink || ''
          });
        }
      }

      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        userId: sub.userId,
        type: 'task_approved',
        title: 'Admin Pre-Approved Your Task 🔍',
        message: `Your proof for "${sub.taskTitle}" has passed admin review! Awaiting client final approval to release payout.`,
        read: false,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'notifications', notif.id), notif);
    } else { // Rejected
      await updateDoc(subRef, {
        status: 'Client Rejected',
        feedback: feedback || 'Rejected by Admin.',
        rejectionReason: feedback || 'Guidelines not met',
        adminApprovalTime: new Date().toISOString()
      });

      await updateDoc(uRef, {
        pendingBalance: Math.max(0, u.pendingBalance - sub.reward)
      });

      const notif: AppNotification = {
        id: `notif-${Date.now()}`,
        userId: sub.userId,
        type: 'task_rejected',
        title: 'Submission Rejected ❌',
        message: `Your submission for "${sub.taskTitle}" was rejected. Feedback: ${feedback || 'None provided'}`,
        read: false,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'notifications', notif.id), notif);
    }
  };

  const adminFinalReleasePayment = async (submissionId: string, action: 'Approve' | 'Reject', feedback?: string) => {
    try {
      const subRef = doc(db, 'submissions', submissionId);
      const subSnap = await getDoc(subRef);
      if (!subSnap.exists()) return;
      const sub = subSnap.data() as Submission;
      const uRef = doc(db, 'users', sub.userId);
      const userSnap = await getDoc(uRef);
      if (!userSnap.exists()) return;
      const u = userSnap.data() as User;

      // 9. Prevent duplicate wallet credits (important)
      if (sub.status === 'Client Approved (Payment Released)') {
        return;
      }

      if (action === 'Approve') {
        const adminEmail = currentUser?.email || 'admin';
        await updateDoc(uRef, {
          balance: u.balance + sub.reward,
          pendingBalance: Math.max(0, u.pendingBalance - sub.reward),
          totalEarned: u.totalEarned + sub.reward,
          xp: u.xp + 100
        });

        const tx: Transaction = {
          id: `tx-${Date.now()}`,
          userId: sub.userId,
          type: 'earning',
          amount: sub.reward,
          description: `Earning for task: "${sub.taskTitle}"`,
          date: new Date().toISOString(),
          status: 'Completed'
        };
        await setDoc(doc(db, 'transactions', tx.id), tx);

        const isClientTask = sub.taskId && sub.taskId.startsWith('client-task-');
        let bProcessed = false;
        let cId = null;
        if (isClientTask && !sub.billingProcessed) {
          const clientTaskRef = doc(db, 'client_tasks', sub.taskId);
          const ctSnap = await getDoc(clientTaskRef);
          if (ctSnap.exists()) {
            const clientTask = ctSnap.data() as ClientTask;
            cId = clientTask.clientId;
            const clientRef = doc(db, 'clients', clientTask.clientId);
            const clientSnap = await getDoc(clientRef);
            if (clientSnap.exists()) {
              const clientData = clientSnap.data() as Client;
              await updateDoc(clientRef, {
                payAgencyBalance: (clientData.payAgencyBalance || 0) + sub.reward
              });
              bProcessed = true;
            }
          }
        }

        await updateDoc(subRef, {
          status: 'Client Approved (Payment Released)',
          feedback: feedback || 'Approved & Payment Released',
          clientApprovalTime: new Date().toISOString(),
          paymentReleasedTime: new Date().toISOString(),
          approvedBy: `Admin-Client (${adminEmail})`,
          ...(bProcessed ? {
            billingProcessed: true,
            approvedAmount: sub.reward,
            approvalTimestamp: new Date().toISOString(),
            invoiceStatus: 'Unpaid',
            clientId: cId
          } : {})
        });

        const notif: AppNotification = {
          id: `notif-${Date.now()}`,
          userId: sub.userId,
          type: 'task_approved',
          title: 'Submission Approved! 💰',
          message: `Your submission for "${sub.taskTitle}" has been approved. +${sub.reward} USDT.`,
          read: false,
          timestamp: new Date().toISOString()
        };
        await setDoc(doc(db, 'notifications', notif.id), notif);

        // Update corresponding task if any
        if (sub.taskId) {
          const clientTaskRef = doc(db, 'client_tasks', sub.taskId);
          const ctSnap = await getDoc(clientTaskRef);
          if (ctSnap.exists()) {
            await updateDoc(clientTaskRef, {
              status: 'completed',
              feedback: feedback || 'Approved & Paid by Admin'
            });
          }
          const taskRef = doc(db, 'tasks', sub.taskId);
          const taskSnap = await getDoc(taskRef);
          if (taskSnap.exists()) {
            await updateDoc(taskRef, { status: 'completed' });
          }
        }
      } else {
        // Reject
        await updateDoc(uRef, {
          pendingBalance: Math.max(0, u.pendingBalance - sub.reward)
        });

        await updateDoc(subRef, {
          status: 'Client Rejected',
          feedback: feedback || 'Rejected by Client/Admin.',
          rejectionReason: feedback || 'Guidelines not met',
          clientApprovalTime: new Date().toISOString()
        });

        const notif: AppNotification = {
          id: `notif-${Date.now()}`,
          userId: sub.userId,
          type: 'task_rejected',
          title: 'Submission Rejected ❌',
          message: `Your submission for "${sub.taskTitle}" was rejected. Feedback: ${feedback || 'None provided'}`,
          read: false,
          timestamp: new Date().toISOString()
        };
        await setDoc(doc(db, 'notifications', notif.id), notif);

        if (sub.taskId) {
          const clientTaskRef = doc(db, 'client_tasks', sub.taskId);
          const ctSnap = await getDoc(clientTaskRef);
          if (ctSnap.exists()) {
            await updateDoc(clientTaskRef, {
              status: 'revision',
              revisionNote: feedback || 'Rejected'
            });
          }
          const taskRef = doc(db, 'tasks', sub.taskId);
          const taskSnap = await getDoc(taskRef);
          if (taskSnap.exists()) {
            await updateDoc(taskRef, { status: 'available' });
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const adminReviewWithdrawal = async (withdrawalId: string, status: 'Approved' | 'Rejected') => {
    const wRef = doc(db, 'withdrawals', withdrawalId);
    const snap = await getDoc(wRef);
    if (!snap.exists()) return;
    const w = snap.data() as Withdrawal;

    await updateDoc(wRef, {
      status
    });

    const uRef = doc(db, 'users', w.userId);
    const uSnap = await getDoc(uRef);
    if (uSnap.exists()) {
      const u = uSnap.data() as User;
      if (status === 'Approved') {
        await updateDoc(uRef, {
          withdrawn: (u.withdrawn || 0) + w.amount
        });
      } else if (status === 'Rejected') {
        await updateDoc(uRef, {
          balance: (u.balance || 0) + w.amount
        });
      }
    }

    const tx: Transaction = {
      id: `tx-${Date.now()}`,
      userId: w.userId,
      type: 'withdrawal',
      amount: w.amount,
      description: `Withdrawal payout ${status}`,
      date: new Date().toISOString(),
      status: status === 'Approved' ? 'Completed' : 'Rejected'
    };
    await setDoc(doc(db, 'transactions', tx.id), tx);

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      userId: w.userId,
      type: 'withdrawal_update',
      title: status === 'Approved' ? 'Withdrawal Released ⚡' : 'Withdrawal Rejected ⚠️',
      message: status === 'Approved'
        ? `Your payout of ${w.amount} USDT has been dispatched.`
        : `Your payout was rejected. Reason: Incorrect wallet address formats.`,
      read: false,
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', notif.id), notif);
  };

  const adminCreateAnnouncement = async (title: string, message: string) => {
    const freshN: AppNotification = {
      id: `notif-${Date.now()}`,
      userId: 'all',
      type: 'announcement',
      title,
      message,
      read: false,
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', freshN.id), freshN);
  };

  const adminUpdateSettings = (updated: SystemSettings) => {
    setSettings(updated);
  };

  const forceUnclaimTask = (taskId: string) => {
    unclaimTask(taskId, false);
  };

  const extendUserDeadline = async (taskId: string, operator: User) => {
    const taskRef = doc(db, 'tasks', taskId);
    const snap = await getDoc(taskRef);
    if (!snap.exists()) return;
    const t = snap.data() as Task;
    if (t.claim_expires_at) {
      const current = new Date(t.claim_expires_at).getTime();
      const next = new Date(current + 30 * 60 * 1000).toISOString(); // +30 minutes
      
      // Update the main tasks collection
      await updateDoc(taskRef, {
        claim_expires_at: next
      });

      // Synchronize to client_tasks collection if applicable
      if (taskId.startsWith('client-task-') || taskId.includes('client-task')) {
        const clientTaskRef = doc(db, 'client_tasks', taskId);
        const ctSnap = await getDoc(clientTaskRef);
        if (ctSnap.exists()) {
          await updateDoc(clientTaskRef, {
            completionDeadline: next
          });
        }
      }

      // Record this moderator action to secure audit_logs
      const logId = `log-${Date.now()}`;
      await setDoc(doc(db, 'audit_logs', logId), {
        id: logId,
        action: `Extended task deadline by +30m (Task: ${t.title || 'Untitled Campaign'})`,
        targetUserId: t.claimed_by || 'unknown',
        operatorId: operator.id,
        operatorName: operator.fullName,
        operatorRole: operator.role,
        timestamp: new Date().toISOString()
      });
    }
  };

  const resetCooldown = async (userId: string) => {
    await updateDoc(doc(db, 'users', userId), {
      cooldown_expires_at: null,
      last_claimed_at: null
    });
  };

  const adminUpdateUserKarma = async (userId: string, targetKarma: number) => {
    const uRef = doc(db, 'users', userId);
    const uSnap = await getDoc(uRef);
    if (!uSnap.exists()) return;
    const u = uSnap.data() as User;

    if (u.email?.toLowerCase() === 'kalloldeyprivate20@gmail.com') {
      throw new Error("Security Violation: Updating Karma of the Protected Owner Account (kalloldeyprivate20@gmail.com) is strictly locked.");
    }

    let b = 'Bronze';
    if (targetKarma >= 10000) b = 'Diamond';
    else if (targetKarma >= 5000) b = 'Gold';
    else if (targetKarma >= 1000) b = 'Silver';

    await updateDoc(uRef, {
      karma: targetKarma,
      karmaBadge: b,
      karmaYesterday: u.karmaYesterday ?? targetKarma
    });
  };

  const fetchRedditKarma = async (cleanUser: string): Promise<number> => {
    // 1. Primary: Query the secure local backend server proxy (CORS-free, direct request, OAuth-enabled, rate-limit protected)
    try {
      console.log(`[REDDIT SYNC ENGINE] Resolving Karma for u/${cleanUser} via server API /api/reddit/karma...`);
      const res = await fetch(`/api/reddit/karma?username=${encodeURIComponent(cleanUser)}`);
      const payload = await res.json();

      console.log(`[REDDIT SYNC ENGINE] Server API response payload:`, payload);

      if (res.status === 404 || payload.error === "USER_NOT_FOUND") {
        throw new Error("USER_NOT_FOUND");
      }
      if (res.status === 429 || payload.error === "RATE_LIMIT_REACHED") {
        throw new Error("RATE_LIMIT_REACHED");
      }
      if (!res.ok) {
        throw new Error(payload.message || `API_FAILURE_HTTP_STATUS_${res.status}`);
      }

      if (payload && typeof payload.total_karma === 'number') {
        console.log(`[REDDIT SYNC ENGINE] Successfully fetched u/${cleanUser} karma directly from server API: ${payload.total_karma} (Method: ${payload.method || 'Direct'})`);
        return payload.total_karma;
      }
    } catch (e: any) {
      console.warn(`[REDDIT SYNC ENGINE] Primary backend API fetch failed. Swapping to public CORS proxies. Detail:`, e);
      if (e.message === "USER_NOT_FOUND" || e.message === "RATE_LIMIT_REACHED") {
        throw e;
      }
    }

    // 2. Secondary fallback via direct client-side proxies
    const urls = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.reddit.com/user/${cleanUser}/about.json`)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://www.reddit.com/user/${cleanUser}/about.json`)}`,
      `https://corsproxy.io/?${encodeURIComponent(`https://www.reddit.com/user/${cleanUser}/about.json`)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.reddit.com/user/${cleanUser}/about.json`)}`,
      `https://www.reddit.com/user/${cleanUser}/about.json`
    ];

    let lastError: any = null;
    let isRateLimited = false;

    for (const url of urls) {
      try {
        console.log(`[REDDIT SYNC ENGINE] Client proxy backup fetch: ${url}`);
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        
        if (res.status === 404) {
          throw new Error("USER_NOT_FOUND");
        }

        if (res.status === 429) {
          isRateLimited = true;
          throw new Error("RATE_LIMIT_REACHED");
        }

        if (!res.ok) {
          throw new Error(`HTTP_STATUS_${res.status}`);
        }

        let data = await res.json();
        
        // Handle AllOrigins wrapped payload format
        if (data && typeof data.contents === 'string') {
          try {
            data = JSON.parse(data.contents);
          } catch (e) {
            console.warn("[REDDIT SYNC ENGINE] Failed to parse wrapped contents from AllOrigins wrapper.", e);
          }
        }

        // Check if error information was wrapped inside successful response
        if (data && (data.error === 404 || data.message === "Not Found")) {
          throw new Error("USER_NOT_FOUND");
        }
        if (data && (data.error === 429 || data.message === "Too Many Requests")) {
          isRateLimited = true;
          throw new Error("RATE_LIMIT_REACHED");
        }

        const dataObj = data?.data || data;

        if (dataObj && typeof dataObj.total_karma === 'number') {
          return dataObj.total_karma;
        }
      } catch (e: any) {
        console.warn(`[REDDIT SYNC ENGINE] Client backup URL failed: ${url}`, e);
        if (e.message === 'USER_NOT_FOUND') {
          throw new Error("USER_NOT_FOUND");
        }
        if (e.message === 'RATE_LIMIT_REACHED') {
          isRateLimited = true;
        }
        lastError = e;
      }
    }

    if (isRateLimited) {
      throw new Error("RATE_LIMIT_REACHED");
    }

    throw lastError || new Error("API_FAILURE");
  };

  const syncRedditKarma = async () => {
    if (!currentUser) {
      console.error("[REDDIT SYNC LOGS] No currentUser is logged in.");
      return;
    }
    const uid = currentUser.id;
    const username = currentUser.redditUsername || '';
    const cleanUser = username.replace(/^\/?u\//i, '').replace(/^\/user\//i, '').replace(/^\//, '').trim();

    // 1. Is redditUsername being loaded from Firebase correctly?
    console.log(`[REDDIT SYNC LOGS] STEP 1: Firebase state check.`);
    console.log(` - userId: "${uid}"`);
    console.log(` - redditUsername: "${username}"`);
    console.log(` - cleanUser parsed: "${cleanUser}"`);

    // 8. If redditUsername is missing: Show custom prompt, disable Sync Button in UI
    if (!username.trim() || !cleanUser) {
      console.warn("[REDDIT SYNC LOGS] Aborted: Reddit username is empty.");
      throw new Error("Please add your Reddit username in profile settings.");
    }
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUser)) {
      console.warn(`[REDDIT SYNC LOGS] Aborted: Username "${cleanUser}" format is invalid.`);
      throw new Error("Invalid Reddit username format. Standard Reddit usernames are 3-20 characters.");
    }

    let parsedTotalKarma = 0;
    let parsedLinkKarma = 0;
    let parsedCommentKarma = 0;
    let success = false;
    let status = 0;
    let responseBodyText = "";
    
    let directErrReason = "";
    let proxyErrReason = "";

    // 2. Log exact request URL
    const targetUrl = `https://www.reddit.com/user/${cleanUser}/about.json`;
    console.log(`[REDDIT SYNC LOGS] STEP 2: Client request sent.`);
    console.log(` - Request URL: ${targetUrl}`);

    // 9. Add timeout protection: Abort request after 10 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 (InfluencerVerseRedditSyncClient/1.0)'
        }
      });
      clearTimeout(timeoutId);

      status = res.status;
      responseBodyText = await res.text();

      // Convert headers to a loggable dictionary
      const headersMap: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headersMap[key] = val;
      });

      // 3. Log HTTP status code, response headers, response body
      console.log(`[REDDIT SYNC LOGS] STEP 3: Client response received.`);
      console.log(` - HTTP Status Code: ${status}`);
      console.log(` - Response Headers:`, JSON.stringify(headersMap, null, 2));
      console.log(` - Response body length: ${responseBodyText.length}`);
      console.log(` - Response body:`, responseBodyText);

      if (res.ok) {
        try {
          const parsedJson = JSON.parse(responseBodyText);
          const data = parsedJson?.data;
          if (data && typeof data.total_karma === 'number') {
            parsedTotalKarma = data.total_karma;
            parsedLinkKarma = typeof data.link_karma === 'number' ? data.link_karma : 0;
            parsedCommentKarma = typeof data.comment_karma === 'number' ? data.comment_karma : 0;
            success = true;
            console.log(`[REDDIT SYNC LOGS] Direct client fetch succeeded! Parsed total_karma: ${parsedTotalKarma}`);
          } else {
            directErrReason = "Data block or total_karma missing in response body JSON structure.";
          }
        } catch (jsonErr: any) {
          directErrReason = `JSON parse error: ${jsonErr.message || jsonErr}`;
        }
      } else {
        directErrReason = `Request failed with non-200 HTTP status code: ${status}`;
      }
    } catch (directErr: any) {
      clearTimeout(timeoutId);
      
      // 4. If direct fetch fails (e.g., CORS system error / network / timeout)
      const isCorsError = directErr instanceof TypeError || (directErr.message && directErr.message.toLowerCase().includes("failed to fetch"));
      const isTimeout = directErr.name === 'AbortError';

      if (isCorsError) {
        directErrReason = "Browser CORS protection blocked direct connection to reddit.com.";
        // 7. Explicitly report if browser CORS blocks client-side requests
        console.warn("[REDDIT SYNC LOGS] [CORS ALERT] The browser blocked direct client-side requests to Reddit due to CORS restrictions. System is rolling over to CORS-free server fallback.");
      } else if (isTimeout) {
        directErrReason = "Timeout error (Request took longer than 10 seconds).";
      } else {
        directErrReason = `${directErr.name || 'Network Error'}: ${directErr.message || directErr}`;
      }
      console.error(`[REDDIT SYNC LOGS] STEP 3: Client response error.`, directErr);
    }

    // Fallback path: If direct browser-side fetch fails (e.g., CORS/Network), query the local proxy backend
    if (!success) {
      const fallbackController = new AbortController();
      const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 10000);
      try {
        const proxyUrl = `/api/reddit/karma?username=${encodeURIComponent(cleanUser)}`;
        console.log(`[REDDIT SYNC LOGS] STEP 3 [FALLBACK]: Requesting CORS-free server-side proxy.`);
        console.log(` - Proxy Request URL: ${proxyUrl}`);

        const res = await fetch(proxyUrl, {
          signal: fallbackController.signal
        });
        clearTimeout(fallbackTimeoutId);

        status = res.status;
        responseBodyText = await res.text();

        const proxyHeadersMap: Record<string, string> = {};
        res.headers.forEach((val, key) => {
          proxyHeadersMap[key] = val;
        });

        console.log(`[REDDIT SYNC LOGS] STEP 3 [FALLBACK]: Proxy response received.`);
        console.log(` - HTTP Status Code: ${status}`);
        console.log(` - Headers:`, JSON.stringify(proxyHeadersMap, null, 2));
        console.log(` - Response body text:`, responseBodyText);

        if (res.ok) {
          try {
            const parsedJson = JSON.parse(responseBodyText);
            if (parsedJson && typeof parsedJson.total_karma === 'number') {
              parsedTotalKarma = parsedJson.total_karma;
              parsedLinkKarma = typeof parsedJson.link_karma === 'number' ? parsedJson.link_karma : 0;
              parsedCommentKarma = typeof parsedJson.comment_karma === 'number' ? parsedJson.comment_karma : 0;
              success = true;
              console.log(`[REDDIT SYNC LOGS] Proxy server endpoint fetch succeeded! Parsed total_karma: ${parsedTotalKarma}`);
            } else if (parsedJson && parsedJson.error) {
              proxyErrReason = `Proxy returned error: ${parsedJson.error}. ${parsedJson.message || ''}`;
            } else {
              proxyErrReason = "Data block or total_karma missing in proxy response.";
            }
          } catch (jsonErr: any) {
            proxyErrReason = `JSON parse error of proxy response: ${jsonErr.message || jsonErr}`;
          }
        } else {
          try {
            const parsedJson = JSON.parse(responseBodyText);
            proxyErrReason = parsedJson?.message || parsedJson?.error || `Proxy failed with status ${status}.`;
          } catch (e) {
            proxyErrReason = `Proxy failed with HTTP status ${status}.`;
          }
        }
      } catch (fallbackErr: any) {
        clearTimeout(fallbackTimeoutId);
        const isTimeout = fallbackErr.name === 'AbortError';
        proxyErrReason = isTimeout ? "Proxy API sync connection timed out after 10s." : `Proxy network error: ${fallbackErr.message || fallbackErr}`;
        console.error(`[REDDIT SYNC LOGS] STEP 3 [FALLBACK]: Proxy query error.`, fallbackErr);
      }
    }

    if (!success) {
      // Construction of descriptive explicit failure trace for the warning card
      let customFailureDetails = "";
      if (directErrReason.includes("CORS")) {
        customFailureDetails = `Browser CORS blocked connection. System proxy fallback error: ${proxyErrReason || 'All endpoints offline'}.`;
      } else {
        customFailureDetails = `Direct client fetch: ${directErrReason || 'failed'}. Backend proxy: ${proxyErrReason || 'failed'}.`;
      }
      
      console.error(`[REDDIT SYNC LOGS] SYNC CRITICALLY FAILED. ${customFailureDetails}`);
      throw new Error(`Unable to fetch latest Reddit karma. Reason: ${customFailureDetails} Displaying last synced value.`);
    }

    // Clear local attempts on success
    localStorage.removeItem(`reddit_sync_failed_count_${uid}`);
    localStorage.removeItem(`reddit_sync_next_attempt_${uid}`);

    // Calculate tiers:
    // Bronze: 400-999, Silver: 1000-4999, Gold: 5000-9999, Platinum: 10000+
    const tier = getKarmaTier(parsedTotalKarma);
    const b = tier.name; // Bronze, Silver, Gold, Platinum
    const lastSynced = new Date().toISOString();

    console.log(`[REDDIT SYNC LOGS] STEP 4: Writing updated variables to Firebase Firestore.`);
    console.log(` - Collection: 'users', docId: '${uid}'`);
    console.log(` - Fields mapped for writing:`, {
      userId: uid,
      redditKarma: parsedTotalKarma,
      link_karma: parsedLinkKarma,
      comment_karma: parsedCommentKarma,
      lastRedditSync: lastSynced,
      karmaTier: b,
      karmaYesterday: currentUser.karma ?? parsedTotalKarma,
      karmaLastSynced: lastSynced
    });

    // 5. Verify the fetched karma values are actually written to Firebase:
    // This updates the Firestore DB document to synchronize across browsers and backend audits
    await updateDoc(doc(db, 'users', uid), {
      karma: parsedTotalKarma,
      redditKarma: parsedTotalKarma,
      karmaBadge: b,
      karmaTier: b,
      karmaYesterday: currentUser.karma ?? parsedTotalKarma,
      karmaLastSynced: lastSynced,
      lastRedditSync: lastSynced,
      linkKarma: parsedLinkKarma,
      commentKarma: parsedCommentKarma,
      redditLinkKarma: parsedLinkKarma,
      redditCommentKarma: parsedCommentKarma
    });

    console.log(`[REDDIT SYNC LOGS] STEP 5: Firebase update complete! Propagating values to React Application Context...`);

    // 6. Verify the dashboard is reading the updated Firebase values after sync (React State Update):
    setCurrentUser(prev => {
      if (!prev || prev.id !== uid) return prev;
      const updatedUser = {
        ...prev,
        karma: parsedTotalKarma,
        redditKarma: parsedTotalKarma,
        karmaBadge: b,
        karmaTier: b,
        karmaYesterday: prev.karma ?? parsedTotalKarma,
        karmaLastSynced: lastSynced,
        lastRedditSync: lastSynced,
        linkKarma: parsedLinkKarma,
        commentKarma: parsedCommentKarma,
        redditLinkKarma: parsedLinkKarma,
        redditCommentKarma: parsedCommentKarma
      };
      
      console.log(`[REDDIT SYNC LOGS] UI state synchronized live:`, {
        userId: updatedUser.id,
        updatedKarma: updatedUser.redditKarma,
        updatedLinkKarma: updatedUser.linkKarma,
        updatedCommentKarma: updatedUser.commentKarma,
        updatedTier: updatedUser.karmaTier,
        updatedLastSync: updatedUser.lastRedditSync
      });
      return updatedUser;
    });
  };

  const adminDeleteUserAccount = async (userId: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error("Security Error: Only platform Administrators can permanently delete accounts. Moderators are forbidden.");
    }

    if (userId === currentUser.id) {
      throw new Error("Operation Aborted: You cannot delete your own active administrator account.");
    }

    const uRef = doc(db, 'users', userId);
    const uSnap = await getDoc(uRef);
    if (!uSnap.exists()) {
      throw new Error("Error: Target user profile not found in database.");
    }

    const uData = uSnap.data() as User;
    const email = (uData.email || '').toLowerCase().trim();
    if (email === 'kalloldeyprivate20@gmail.com') {
      throw new Error("Security Violation: Deleting the primary creator/developer account (kalloldeyprivate20@gmail.com) is strictly locked.");
    }

    // 1. Move to Deleted Accounts Archive for 7 days safety
    const archiveId = `archive-member-${userId}-${Date.now()}`;
    const archiveDoc = {
      id: archiveId,
      type: 'member',
      originalId: userId,
      deletedAt: new Date().toISOString(),
      profile: uData,
      keepUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    await setDoc(doc(db, 'deleted_accounts_archive', archiveId), archiveDoc);

    // 2. Cleanup associated user data
    // Delete profile
    await deleteDoc(uRef);

    // Delete wallets / wallet structure if any
    await deleteDoc(doc(db, 'wallets', userId));

    // Delete notifications
    const someNotifsQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
    const someNotifsSnap = await getDocs(someNotifsQuery);
    for (const d of someNotifsSnap.docs) {
      await deleteDoc(doc(db, 'notifications', d.id));
    }

    // Delete submissions
    const subsQuery = query(collection(db, 'submissions'), where('userId', '==', userId));
    const subsSnap = await getDocs(subsQuery);
    for (const d of subsSnap.docs) {
      await deleteDoc(doc(db, 'submissions', d.id));
    }

    // Delete withdrawals
    const withdrawalsQuery = query(collection(db, 'withdrawals'), where('userId', '==', userId));
    const withdrawalsSnap = await getDocs(withdrawalsQuery);
    for (const d of withdrawalsSnap.docs) {
      await deleteDoc(doc(db, 'withdrawals', d.id));
    }

    // Delete transactions
    const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', userId));
    const transactionsSnap = await getDocs(transactionsQuery);
    for (const d of transactionsSnap.docs) {
      await deleteDoc(doc(db, 'transactions', d.id));
    }

    // Delete tickets
    const ticketsQuery = query(collection(db, 'tickets'), where('userId', '==', userId));
    const ticketsSnap = await getDocs(ticketsQuery);
    for (const d of ticketsSnap.docs) {
      await deleteDoc(doc(db, 'tickets', d.id));
    }

    // Delete fraud alerts
    const fraudQuery = query(collection(db, 'fraud_alerts'), where('userId', '==', userId));
    const fraudSnap = await getDocs(fraudQuery);
    for (const d of fraudSnap.docs) {
      await deleteDoc(doc(db, 'fraud_alerts', d.id));
    }
  };

  const adminDeleteClientAccount = async (clientId: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error("Security Error: Only platform Administrators can permanently delete accounts. Moderators are forbidden.");
    }

    if (clientId === currentUser.id) {
      throw new Error("Operation Aborted: You cannot delete your own admin/client session.");
    }

    const cRef = doc(db, 'clients', clientId);
    const cSnap = await getDoc(cRef);
    if (!cSnap.exists()) {
      throw new Error("Error: Target client profile not found in database.");
    }

    const cData = cSnap.data();
    const gmail = (cData.gmail || '').toLowerCase().trim();
    if (gmail === 'kalloldeyprivate20@gmail.com') {
      throw new Error("Security Violation: Deleting the primary system administrator client profile is strictly locked.");
    }

    // 1. Move to Deleted Accounts Archive for 7 days safety
    const archiveId = `archive-client-${clientId}-${Date.now()}`;
    const archiveDoc = {
      id: archiveId,
      type: 'client',
      originalId: clientId,
      deletedAt: new Date().toISOString(),
      profile: cData,
      keepUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    await setDoc(doc(db, 'deleted_accounts_archive', archiveId), archiveDoc);

    // 2. Cleanup associated client data
    // Delete profile
    await deleteDoc(cRef);

    // Delete campaigns / client tasks
    const clientTasksQuery = query(collection(db, 'client_tasks'), where('clientId', '==', clientId));
    const clientTasksSnap = await getDocs(clientTasksQuery);
    for (const d of clientTasksSnap.docs) {
      await deleteDoc(doc(db, 'client_tasks', d.id));
    }

    // Delete billing proofs / payments
    const clientPaymentsQuery = query(collection(db, 'client_payments'), where('clientId', '==', clientId));
    const clientPaymentsSnap = await getDocs(clientPaymentsQuery);
    for (const d of clientPaymentsSnap.docs) {
      await deleteDoc(doc(db, 'client_payments', d.id));
    }

    // Delete chat sessions
    const chatsQuery = query(collection(db, 'chats'), where('clientId', '==', clientId));
    const chatsSnap = await getDocs(chatsQuery);
    for (const d of chatsSnap.docs) {
      await deleteDoc(doc(db, 'chats', d.id));
    }

    // Delete support tickets
    const ticketsQuery = query(collection(db, 'tickets'), where('clientId', '==', clientId));
    const ticketsSnap = await getDocs(ticketsQuery);
    for (const d of ticketsSnap.docs) {
      await deleteDoc(doc(db, 'tickets', d.id));
    }
  };

  const completeCreatorRegistration = async (userDraft: User) => {
    const freshDraft = {
      ...userDraft,
      emailVerified: true,
      gmailVerified: true
    };
    await setDoc(doc(db, 'users', userDraft.id), freshDraft);

    const welcomeNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      userId: userDraft.id,
      type: 'verification',
      title: 'Verification Pending',
      message: `Your Reddit profile (${freshDraft.redditUsername}) is currently under review.`,
      read: false,
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, 'notifications', welcomeNotif.id), welcomeNotif);
    setCurrentUser(freshDraft);
  };

  const completeClientRegistration = async (clientDraft: Client) => {
    const verifiedClient = {
      ...clientDraft,
      emailVerified: true,
      gmailVerified: true
    };
    await setDoc(doc(db, 'clients', clientDraft.id), verifiedClient);

    const clientUser: User = {
      id: clientDraft.id,
      fullName: clientDraft.name || null,
      email: clientDraft.gmail || null,
      redditUsername: 'client_' + (clientDraft.name || '').toLowerCase().replace(/\s+/g, '_') || null,
      redditProfileLink: 'https://reddit.com',
      status: 'Approved',
      referralCode: 'CLIENTVIP',
      streak: 0,
      xp: 0,
      balance: 0,
      totalEarned: 0,
      pendingBalance: 0,
      withdrawn: 0,
      joinDate: new Date().toISOString().split('T')[0] || null,
      role: 'client',
      karma: 0,
      karmaYesterday: 0,
      referredBy: null,
      rejectionReason: null,
      lastLoginDate: null,
      avatarUrl: null,
      gender: null,
      emailVerified: true,
      gmailVerified: true,
      last_claimed_at: null,
      cooldown_expires_at: null,
      active_task_id: null,
      deductionHistory: null,
      lastPayoutRequestDate: null,
      payoutRequests: null,
      fraudScore: null,
      fraudFlags: null,
      submissionHashes: null,
      isSuspended: false,
      suspensionReason: null,
      isBanned: false,
      banReason: null
    };
    await setDoc(doc(db, 'users', clientDraft.id), clientUser);
    setCurrentClient(verifiedClient);
    setCurrentUser(clientUser);
  };

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
      
      clients,
      currentClient,
      clientTasks,
      clientPayments,
      clientPaymentProofs,
      clientChats,
      
      login,
      signup,
      logout,
      updateProfile,
      changePassword,
      deleteAccount,
      completeCreatorRegistration,
      completeClientRegistration,
      
      clientRegister,
      clientLogin,
      clientLogout,
      clientCreateTask,
      clientReviewTaskSubmission,
      clientSubmitPaymentProof,
      adminVerifyPaymentProof,
      adminRejectPaymentProof,
      
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
      adminToggleChatResolution,
      
      submitTaskProof,
      claimTask,
      unclaimTask,
      
      requestWithdrawal,
      
      createTicket,
      replyToTicket,
      
      markNotificationRead,
      clearAllNotifications,
      

      
      adminApproveUser,
      adminRejectUser,
      adminBanUser,
      adminSuspendUser,
      adminUnbanUser,
      adminUnsuspendUser,
      adminDeleteUserAccount,
      adminDeleteClientAccount,
      adminCreateTask,
      adminEditTask,
      adminDeleteTask,
      adminReviewSubmission,
      adminFinalReleasePayment,
      adminReviewWithdrawal,
      adminCreateAnnouncement,
      adminUpdateSettings,
      
      forceUnclaimTask,
      extendUserDeadline,
      resetCooldown,
      adminUpdateUserKarma,
      syncRedditKarma,
      
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

      auditLogs,
      adminPromoteToModerator,
      adminRemoveModerator
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
