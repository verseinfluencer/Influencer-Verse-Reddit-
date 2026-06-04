export interface User {
  id: string;
  fullName: string;
  email: string;
  redditUsername: string; // e.g. "u/some_user" or just "some_user"
  redditProfileLink: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Banned' | 'Suspended' | 'banned' | 'suspended' | 'pending';
  rejectionReason?: string | null;
  referralCode: string;
  referredBy?: string | null;
  streak: number;
  lastLoginDate?: string | null; // for streak check
  xp: number;
  balance: number; // Available USDT
  totalEarned: number; // Sum of all approved earnings
  pendingBalance: number; // Under review task submissions
  withdrawn: number; // Sum of completed withdrawals
  joinDate: string;
  avatarUrl?: string | null;
  role: 'user' | 'member' | 'moderator' | 'admin' | 'client';
  gender?: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say' | null;
  emailVerified?: boolean;
  gmailVerified?: boolean;
  
  // Karma fields (Private to public users - only admins and self can see)
  karma: number;
  karmaYesterday: number;
  karmaBadge?: string | null;
  karmaLastSynced?: string | null; // ISO string for when Reddit karma was last updated
  redditKarma?: number;
  commentKarma?: number;
  postKarma?: number;
  lastRedditSync?: string | null;
  karmaTier?: string | null;

  // Task Claiming & Cooldown fields (Firebase / Server state mirror)
  last_claimed_at?: string | null; // ISO timestamp
  lastClaimedAt?: any; // Firebase Server Timestamp or ISO timestamp
  cooldown_expires_at?: any; // Firebase Server Timestamp, Date or ISO timestamp
  active_task_id?: string | null;
  lastPostClaimedAt?: any; // Firebase Server Timestamp or ISO timestamp
  postCooldownExpiresAt?: any; // Firebase Server Timestamp, Date or ISO timestamp
  lastCommentClaimedAt?: any; // Firebase Server Timestamp or ISO timestamp
  commentCooldownExpiresAt?: any; // Firebase Server Timestamp, Date or ISO timestamp

  // New Member Payout & Deduction fields
  deductionHistory?: DeductionRecord[] | null;
  lastPayoutRequestDate?: string | null;
  payoutRequests?: PayoutRequest[] | null;

  // Anti-Cheat tracking fields
  ipHistory?: { ip: string; timestamp: string; location: string; isSimulated?: boolean; }[] | null;
  deviceFingerprints?: string[] | null;
  fraudScore?: number | null; // 0-100
  fraudFlags?: { type: string; timestamp: string; details: string; }[] | null;
  submissionHashes?: string[] | null;
  loginHistory?: { ip: string; country: string; timestamp: string; isSimulated?: boolean; }[] | null;
  isSuspended?: boolean | null;
  suspensionReason?: string | null;
  isBanned?: boolean | null;
  banReason?: string | null;
  isSimulatedData?: boolean;
  lastWalletUpdate?: string | null;
  discordVerified?: boolean;
  discordUserId?: string;
  discordUsername?: string;
  discordVerifiedAt?: string | null;
}

export type TaskType = 'post' | 'comment';

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  reward: number; // USDT
  difficulty: 'Easy' | 'Medium' | 'Hard';
  deadline: string;
  maxSubmissions: number;
  completedSubmissionsCount: number;
  // Specific to Post tasks:
  targetSubreddit?: string;
  requiredPostTitle?: string;
  postGuidelines?: string;
  // Specific to Comment tasks:
  postUrlToCommentOn?: string;
  commentGuidelines?: string;
  // Proof info required:
  proofRequired: string; // e.g., "screenshot" or "screenshot + comment URL"

  // Special tasks parameters
  isSpecial?: boolean;
  minKarmaRequired?: number;
  specialLabel?: string; // e.g. "⭐ Special Task"

  // Claiming mechanism
  claimed_by?: string | null; // userId or null
  claimed_at?: string | null; // ISO timestamp or null
  claim_expires_at?: string | null; // ISO timestamp or null
  status: 'available' | 'claimed' | 'completed' | 'expired';
}

export interface Submission {
  id: string;
  taskId: string;
  taskTitle: string;
  taskType: TaskType;
  reward: number;
  userId: string;
  userFullName: string;
  redditUsername: string;
  proofUrl: string; // base64 or placeholder url
  submissionLink?: string; // comment url if comment task
  status: 'Pending' | 'Approved' | 'Rejected' | 'pending_review' | 'Under Admin Review' | 'Admin Approved (Waiting for Client Approval)' | 'Client Approved (Payment Released)' | 'Client Rejected';
  feedback?: string | null;
  submittedAt: string;
  submissionTime?: string | null;
  adminApprovalTime?: string | null;
  clientApprovalTime?: string | null;
  paymentReleasedTime?: string | null;
  approvedBy?: string | null;
  matchScore?: number | null;
  aiConfidence?: string | null;
  isFlagged?: boolean;
  flagReason?: string | null;
  adminNote?: string | null;
  rejectionReason?: string | null;
  clientNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  approvedAt?: string | null;
  clientApprovedAt?: string | null;
  memberId?: string | null;
  memberName?: string | null;
  proofLink?: string | null;
  memberPay?: number | null;
  agencyPay?: number | null;
  billingProcessed?: boolean;
  approvedAmount?: number;
  approvalTimestamp?: string;
  invoiceStatus?: string;
  clientId?: string;
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

export interface ArchivedApprovedTask {
  id: string;
  originalData: Submission;
  archivedBy: string;
  archivedAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userFullName: string;
  email: string;
  amount: number;
  withdrawalMethod: 'USDT_BEP20' | 'BINANCE_ID';
  paymentAddress: string;
  requestedAt: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

export interface ArchivedWithdrawal {
  id: string;
  originalData: Withdrawal;
  archivedBy: string;
  archivedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'earning' | 'withdrawal' | 'referral_bonus' | 'deduction' | 'balance_adjustment';
  amount: number;
  description: string;
  date: string;
  status: 'Completed' | 'Pending' | 'Rejected';
}

export interface TicketMessage {
  sender: 'user' | 'admin';
  text: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userFullName: string;
  subject: string;
  category: 'Billing' | 'Tasks' | 'Account' | 'Technical' | 'Other';
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Awaiting Response' | 'Closed';
  messages: TicketMessage[];
  createdAt: string;
  closedAt?: string;
  closedBy?: string;
  deleted?: boolean;
  deletedAt?: string;
  assignedModeratorId?: string;
  assignedModeratorName?: string;
}

export interface AppNotification {
  id: string;
  userId: string; // clientId, memberId or 'all'
  type: 'task_approved' | 'task_rejected' | 'withdrawal_update' | 'verification' | 'new_task' | 'announcement' | 'referral_bonus' | 'client_update' | 'dispute' | 'message' | 'account_banned' | 'account_suspended' | 'account_reinstated';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  createdAt?: string;
}

export interface SystemSettings {
  globalMultiplier: number;
  dailyTaskLimit: number;
  referralBonus: number; // USDT for inviter
  disableAllClientUploads?: boolean; // Global block toggle
  allowModeratorsEditWallets?: boolean;
}

// Client specific types
export interface Client {
  id: string;
  name: string;
  company: string;
  country: string;
  whatsapp: string;
  gmail: string;
  gmailVerified: boolean;
  emailVerified?: boolean;
  phoneNumber?: string;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  paymentMethod: 'Crypto' | 'Bank Transfer' | 'Other';
  budget: string;
  paymentNotes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  rejectionReason?: string;
  taskUploadEnabled: boolean;
  registeredAt: string;
  approvedAt?: string;
  payAgencyBalance: number;
  payAgencyHistory: ClientPayment[];
  password?: string;
}

export interface ClientTask {
  id: string;
  clientId: string;
  clientName?: string;
  type: TaskType;
  title: string;
  description: string;
  targetSubreddit?: string;
  postUrlToCommentOn?: string;
  guidelines: string;
  deadline: string;
  notes?: string;
  agencyPay: number; // set by client, visible to client & admin
  memberPay?: number; // set by admin, visible to member & admin
  status: 'pending_review' | 'approved/live' | 'claimed' | 'submitted' | 'client_review' | 'completed' | 'revision' | 'removed';
  claimedBy?: string | null; // memberId (User) or null
  claimedAt?: string | null;
  completionDeadline?: string | null;
  proofLink?: string | null;
  submittedAt?: string | null;
  approvedByAdmin?: boolean;
  approvedByClient?: boolean;
  revisionNote?: string | null;
  disputeRaised?: boolean;
  disputeReason?: string | null;
  disputeOutcome?: 'force_approved' | 'upheld' | null;
  removedAt?: string | null;
  removedAfterPayment?: boolean;
  createdAt?: string;
  approvedAt?: string;
}

export interface ClientPayment {
  id: string;
  clientId: string;
  clientName?: string;
  amount: number;
  tasksIncluded: string[];
  paidAt: string;
  receiptUrl: string; // admin uploaded receipt image/PDF
  markedPaidBy: string; // adminName / email
  referenceNote?: string;
}

export interface ClientPaymentProof {
  id: string;
  clientId: string;
  clientName: string;
  clientCompany: string;
  amount: number;
  transactionId: string | null;
  paymentMethod?: string;
  proofImageUrl: string;
  notes: string | null;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
}

export interface ChatMessage {
  id: string;
  senderId: string; // clientId or 'admin'
  senderName: string;
  text: string;
  fileUrl?: string; // base64 / media url
  timestamp: string;
  readAt?: string | null;
}

export interface ClientChat {
  id: string; // matches clientId
  clientId: string;
  clientName: string;
  messages: ChatMessage[];
  lastMessageTimestamp: string;
  resolvedStatus?: 'resolved' | 'unresolved';
}

export interface DeductionRecord {
  id: string;
  amount: number;
  taskName: string;
  reason: string;
  date: string;
}

export interface PayoutRequest {
  id: string;
  amount: number;
  address: string;
  method: 'USDT_BEP20' | 'BINANCE_ID';
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface DuplicateGroup {
  id: string;
  accounts: string[]; // List of userIds of duplicate profiles
  sharedIdentifier: string; // e.g., dual IP address, fingerprint string, normalized email or duplicate reddit handler
  type: 'ip' | 'fingerprint' | 'reddit' | 'gmail';
}

export interface FraudAlert {
  id: string;
  type: string; // "IP Match" | "Fingerprint Match" | "Reddit Duplicate" | "Fake Reddit Link" | "Wrong Reddit Author" | "Suspicious Speed" | "Duplicate Screenshot" | "Suspicious Login Pattern" | "Honeypot Trigger" | "Threshold Trigger"
  userId: string;
  userName: string;
  userEmail: string;
  fraudScore: number;
  timestamp: string;
  status: 'pending' | 'dismissed' | 'resolved';
  details: string;
  recommendedAction: string;
}

export interface AuditLog {
  id: string;
  action: string;
  targetUserId: string;
  targetUserName?: string;
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  timestamp: string;
}

