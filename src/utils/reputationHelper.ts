import { User, Submission, CreatorReview } from '../types';

export function getCreatorReputation(
  user: User,
  allSubmissions: Submission[] = [],
  allReviews: CreatorReview[] = []
) {
  // Baseline start is 75 (Trusted Creator territory)
  let score = 75;

  const userSubs = allSubmissions.filter(s => s.userId === user.id);
  const approvedCount = userSubs.filter(s => s.status === 'Client Approved (Payment Released)' || s.status === 'Approved' || s.status === 'pending_review' || s.status.includes('Approved')).length;
  const rejectedCount = userSubs.filter(s => s.status === 'Client Rejected' || s.status === 'Rejected').length;

  // Positive: Approved Tasks (+2 each)
  score += approvedCount * 2;

  // Positive: High Approval Rate
  const totalCompleted = approvedCount + rejectedCount;
  if (totalCompleted > 0) {
    const rate = approvedCount / totalCompleted;
    if (rate >= 0.9) {
      score += 15;
    } else if (rate >= 0.8) {
      score += 10;
    } else if (rate < 0.5) {
      score -= 15; // Penalty for very low quality completion rates
    }
  }

  // Positive: Long Account Age (Reddit connection age / standard indicator)
  if (user.redditAccountAge) {
    score += Math.min(10, Math.floor(user.redditAccountAge / 2));
  }

  // Positive: Verified Reddit Accounts (+5 each)
  const verifiedAccounts = (user.redditAccounts || []).filter(a => a.status === 'approved' || a.status === 'Approved').length;
  score += verifiedAccounts * 5;

  // Positive: Client Reviews
  const userReviews = allReviews.filter(r => r.creatorId === user.id);
  const positiveReviews = userReviews.filter(r => r.rating >= 4).length;
  score += positiveReviews * 2;

  // Negative: Rejected Proofs (-5 each)
  score -= rejectedCount * 5;

  // Negative: Warnings (-10 per warning)
  const warningsCount = (user.warnings || []).length;
  score -= warningsCount * 10;

  // Manual Adjustments from Admins (offset)
  score += user.reputationAdjustment || 0;

  // Lock within [0, 100] scale
  const finalScore = Math.max(0, Math.min(100, score));

  // Levels:
  // 90-100 = Elite Creator
  // 75-89 = Trusted Creator
  // 60-74 = Verified Creator
  // 40-59 = Standard Creator
  // 0-39 = New Creator
  let level: 'Elite Creator' | 'Trusted Creator' | 'Verified Creator' | 'Standard Creator' | 'New Creator' = 'New Creator';
  let badgeColor = 'bg-slate-50 border-slate-200 text-slate-500';

  if (finalScore >= 90) {
    level = 'Elite Creator';
    badgeColor = 'bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold shadow-sm';
  } else if (finalScore >= 75) {
    level = 'Trusted Creator';
    badgeColor = 'bg-blue-50 border border-blue-200 text-blue-700 font-semibold';
  } else if (finalScore >= 60) {
    level = 'Verified Creator';
    badgeColor = 'bg-emerald-50 border border-emerald-250 text-emerald-700 font-medium';
  } else if (finalScore >= 40) {
    level = 'Standard Creator';
    badgeColor = 'bg-amber-50 border border-amber-250 text-amber-700';
  } else {
    level = 'New Creator';
    badgeColor = 'bg-slate-50 border border-slate-200 text-slate-500';
  }

  // Calculate Average Rating
  let averageRating = 'N/A';
  if (userReviews.length > 0) {
    const totalRating = userReviews.reduce((sum, r) => sum + r.rating, 0);
    averageRating = (totalRating / userReviews.length).toFixed(1);
  }

  return {
    score: finalScore,
    level,
    badgeColor,
    badgeLabel: level,
    totalCompleted,
    approvedCount,
    rejectedCount,
    warningsCount,
    averageRating,
    totalReviews: userReviews.length
  };
}
