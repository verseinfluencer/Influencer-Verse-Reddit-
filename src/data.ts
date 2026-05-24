import { User, Task, Submission, Withdrawal, Transaction, SupportTicket, AppNotification } from './types';

// Let's create realistic dates in 2026
const d = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0] + ' ' + date.toTimeString().split(' ')[0].substring(0, 5);
};

export const INITIAL_USERS: User[] = [
  // Admin definition
  {
    id: 'admin-1',
    fullName: 'Kallol Dey',
    email: 'kalloldeyprivate20@gmail.com',
    redditUsername: 'u/kallol_admin',
    redditProfileLink: 'https://www.reddit.com/user/kallol_admin',
    status: 'Approved',
    referralCode: 'ADMINVIP',
    streak: 0,
    xp: 0,
    balance: 0,
    totalEarned: 0,
    pendingBalance: 0,
    withdrawn: 0,
    joinDate: d(0),
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    karma: 15450,
    karmaYesterday: 15300,
    karmaBadge: 'Diamond',
    karmaLastSynced: new Date(Date.now() - 3600000 * 4).toISOString() // 4 hours ago
  }
];

export const INITIAL_TASKS: Task[] = [];

export const INITIAL_SUBMISSIONS: Submission[] = [];

export const INITIAL_WITHDRAWALS: Withdrawal[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_TICKETS: SupportTicket[] = [];

export const ALL_NOTIFICATIONS: AppNotification[] = [];
