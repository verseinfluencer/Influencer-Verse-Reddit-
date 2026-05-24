export interface KarmaTier {
  id: number;
  name: string;
  minKarma: number;
  maxKarma: number;
  emoji: string;
  badge: string;
}

export const KARMA_TIERS: KarmaTier[] = [
  { id: 1, name: "Bronze", minKarma: 400, maxKarma: 999, emoji: "🥉", badge: "🥉 Bronze" },
  { id: 2, name: "Silver", minKarma: 1000, maxKarma: 3000, emoji: "🥈", badge: "🥈 Silver" },
  { id: 3, name: "Gold", minKarma: 3001, maxKarma: 5000, emoji: "⭐", badge: "⭐ Gold" },
  { id: 4, name: "Diamond", minKarma: 5001, maxKarma: 7000, emoji: "💎", badge: "💎 Diamond" },
  { id: 5, name: "Platinum", minKarma: 7001, maxKarma: 9000, emoji: "🔥", badge: "🔥 Platinum" },
  { id: 6, name: "Elite", minKarma: 9001, maxKarma: 11000, emoji: "👑", badge: "👑 Elite" },
  { id: 7, name: "Legend", minKarma: 11001, maxKarma: Infinity, emoji: "🚀", badge: "🚀 Legend" },
];

export function getKarmaTier(karma: number): KarmaTier {
  const k = Math.max(0, karma);
  const tier = KARMA_TIERS.find(t => k >= t.minKarma && k <= t.maxKarma);
  if (tier) return tier;
  if (k < 400) {
    return KARMA_TIERS[0];
  }
  return KARMA_TIERS[6];
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

