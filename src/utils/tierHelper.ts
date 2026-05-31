export interface KarmaTier {
  id: number;
  name: string;
  minKarma: number;
  maxKarma: number;
  emoji: string;
  badge: string;
  multiplier: number;
}

export const KARMA_TIERS: KarmaTier[] = [
  { id: 1, name: "Bronze", minKarma: 400, maxKarma: 999, emoji: "🥉", badge: "🥉 Bronze", multiplier: 1.00 },
  { id: 2, name: "Silver", minKarma: 1000, maxKarma: 4999, emoji: "🥈", badge: "🥈 Silver", multiplier: 1.10 },
  { id: 3, name: "Gold", minKarma: 5000, maxKarma: 9999, emoji: "⭐", badge: "⭐ Gold", multiplier: 1.25 },
  { id: 4, name: "Platinum", minKarma: 10000, maxKarma: Infinity, emoji: "💎", badge: "💎 Platinum", multiplier: 1.50 },
];

export function getKarmaTier(karma: number): KarmaTier {
  const k = Math.max(0, karma);
  const tier = KARMA_TIERS.find(t => k >= t.minKarma && k <= t.maxKarma);
  if (tier) return tier;
  if (k < 400) {
    return KARMA_TIERS[0];
  }
  return KARMA_TIERS[KARMA_TIERS.length - 1];
}

export function getKarmaProgressBar(karma: number) {
  const currentTier = getKarmaTier(karma);
  const nextTier = KARMA_TIERS.find(t => t.id === currentTier.id + 1);
  
  if (!nextTier) {
    return {
      needed: 0,
      percent: 100,
      bar: "▓▓▓▓▓▓▓▓▓▓",
      text: "Maxed Legend Tier 🚀"
    };
  }

  const needed = nextTier.minKarma - karma;
  const progressInTier = Math.max(0, karma - currentTier.minKarma);
  const tierRange = nextTier.minKarma - currentTier.minKarma;
  const percent = Math.min(100, Math.max(0, Math.round((progressInTier / tierRange) * 100)));
  
  const blocks = Math.round(percent / 10);
  const bar = "▓".repeat(blocks) + "░".repeat(10 - blocks);
  
  const text = `${needed.toLocaleString()} karma to next tier ${bar} ${percent}%`;
  
  return {
    needed,
    percent,
    bar,
    text
  };
}

export function getTierRequirementText(minKarma: number | undefined): string {
  if (!minKarma) return 'Any Tier';
  const tier = getKarmaTier(minKarma);
  return `${tier.emoji} ${tier.name} Tier or above`;
}

