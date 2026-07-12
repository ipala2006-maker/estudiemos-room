export const FOCUS_ECONOMY_STORAGE_KEY = 'estudiemos-room-focus-economy';
export const FOCUS_ECONOMY_VERSION = 2;

export const FOCUS_REWARD_CONFIG = {
  idleMs: 3 * 60 * 1000,
  tickMaxMs: 5 * 1000,
  rewardIntervalMs: 10 * 60 * 1000,
  rewardCoins: 1,
  bonusIntervalMs: 60 * 60 * 1000,
  bonusCoins: 3,
  deepBonusIntervalMs: 5 * 60 * 60 * 1000,
  deepBonusCoins: 10,
  dailyBonusCoins: 2,
  resetProgressDevFlag: false
};

export const SKIN_COST_TABLE = {
  common: {
    label: 'Comun',
    purchase: 50,
    upgrades: {
      1: 75,
      2: 125,
      3: 200,
      4: 350,
      5: 600,
      6: 1000
    }
  },
  rare: {
    label: 'Rara',
    purchase: 200,
    upgrades: {
      1: 300,
      2: 500,
      3: 850,
      4: 1400,
      5: 2200,
      6: 3500
    }
  },
  legendary: {
    label: 'Legendaria',
    purchase: 750,
    upgrades: {
      1: 1000,
      2: 1600,
      3: 2600,
      4: 4200,
      5: 6500,
      6: 10000
    }
  }
};

export const SKIN_RANKS = [
  { rank: 1, label: 'Base' },
  { rank: 2, label: 'Color mejorado' },
  { rank: 3, label: 'Detalles visuales' },
  { rank: 4, label: 'Variante avanzada' },
  { rank: 5, label: 'Efecto suave' },
  { rank: 6, label: 'Variante premium' },
  { rank: 7, label: 'Version legendaria' }
];

export const DACHSHUND_SKINS = [
  {
    id: 'classic',
    name: 'Salchicha Clasico',
    tier: 'common',
    rarity: 'Comun inicial',
    description: 'La mascota base de Estudiemos: simpatica, clara y lista para acompanarte.',
    colors: {
      body: '#b46d3c',
      belly: '#f3c391',
      ear: '#743b27',
      accent: '#2a6f64',
      glow: '#e0c47a'
    }
  },
  {
    id: 'cyber',
    name: 'Salchicha Cyber Focus',
    tier: 'rare',
    rarity: 'Rara',
    description: 'Un look futurista para sesiones largas con visor, neon y energia limpia.',
    colors: {
      body: '#323f46',
      belly: '#8ed7d2',
      ear: '#1a2329',
      accent: '#35d9cc',
      glow: '#8ed7d2'
    }
  },
  {
    id: 'engineer',
    name: 'Salchicha Ingeniero',
    tier: 'legendary',
    rarity: 'Legendaria',
    description: 'Casco, herramientas y espiritu de resolver problemas paso a paso.',
    colors: {
      body: '#a45f33',
      belly: '#f1bf85',
      ear: '#5d2f22',
      accent: '#d6a541',
      glow: '#d7c28a'
    }
  }
];

export const DEFAULT_FOCUS_PROGRESS = {
  economyVersion: FOCUS_ECONOMY_VERSION,
  coins: 0,
  totalActiveMs: 0,
  totalValidContentMs: 0,
  sessionValidContentMs: 0,
  dailyValidContentMs: 0,
  activeIntervalMs: 0,
  bonusIntervalMs: 0,
  deepBonusIntervalMs: 0,
  sessionEarned: 0,
  dailyEarned: 0,
  purchasedSkins: {
    classic: true
  },
  skinRanks: {
    classic: 1,
    cyber: 0,
    engineer: 0
  },
  equippedSkin: 'classic',
  lastSessionDate: '',
  lastValidBonusDate: '',
  lastEarningDate: '',
  lastRewardAt: 0,
  streak: 0
};

export function getFocusDateValue(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function sanitizeFocusProgress(value) {
  const current = value && typeof value === 'object' ? value : {};
  const isCurrentEconomy = Number(current.economyVersion ?? 0) >= FOCUS_ECONOMY_VERSION;
  const today = getFocusDateValue();
  const purchasedSkins = { ...DEFAULT_FOCUS_PROGRESS.purchasedSkins, ...(current.purchasedSkins ?? {}) };
  const skinRanks = { ...DEFAULT_FOCUS_PROGRESS.skinRanks, ...(current.skinRanks ?? {}) };

  DACHSHUND_SKINS.forEach((skin) => {
    skinRanks[skin.id] = clampRank(Number(skinRanks[skin.id] ?? 0));
    purchasedSkins[skin.id] = Boolean(purchasedSkins[skin.id] || skinRanks[skin.id] > 0);
    if (skin.id === 'classic') {
      purchasedSkins[skin.id] = true;
      skinRanks[skin.id] = Math.max(1, skinRanks[skin.id]);
    }
  });

  const equippedSkin = purchasedSkins[current.equippedSkin] ? current.equippedSkin : 'classic';
  const lastEarningDate = String(current.lastEarningDate ?? '');

  return {
    ...DEFAULT_FOCUS_PROGRESS,
    ...current,
    economyVersion: FOCUS_ECONOMY_VERSION,
    coins: Math.max(0, Math.floor(Number(current.coins ?? 0))),
    totalActiveMs: Math.max(0, Number(current.totalActiveMs ?? 0)),
    totalValidContentMs: Math.max(0, Number(current.totalValidContentMs ?? 0)),
    sessionValidContentMs: 0,
    dailyValidContentMs: isCurrentEconomy && lastEarningDate === today ? Math.max(0, Number(current.dailyValidContentMs ?? 0)) : 0,
    activeIntervalMs: isCurrentEconomy ? clampInterval(current.activeIntervalMs, FOCUS_REWARD_CONFIG.rewardIntervalMs) : 0,
    bonusIntervalMs: isCurrentEconomy ? clampInterval(current.bonusIntervalMs, FOCUS_REWARD_CONFIG.bonusIntervalMs) : 0,
    deepBonusIntervalMs: isCurrentEconomy ? clampInterval(current.deepBonusIntervalMs, FOCUS_REWARD_CONFIG.deepBonusIntervalMs) : 0,
    sessionEarned: 0,
    dailyEarned: isCurrentEconomy && lastEarningDate === today ? Math.max(0, Math.floor(Number(current.dailyEarned ?? 0))) : 0,
    purchasedSkins,
    skinRanks,
    equippedSkin,
    lastSessionDate: String(current.lastSessionDate ?? ''),
    lastValidBonusDate: String(current.lastValidBonusDate ?? ''),
    lastEarningDate,
    lastRewardAt: Math.max(0, Number(current.lastRewardAt ?? 0)),
    streak: Math.max(0, Math.floor(Number(current.streak ?? 0)))
  };
}

export function getSkinDefinition(skinId) {
  return DACHSHUND_SKINS.find((skin) => skin.id === skinId) ?? DACHSHUND_SKINS[0];
}

export function getSkinRank(progress, skinId) {
  return clampRank(Number(progress?.skinRanks?.[skinId] ?? 0));
}

export function isSkinPurchased(progress, skinId) {
  return Boolean(progress?.purchasedSkins?.[skinId] || getSkinRank(progress, skinId) > 0);
}

export function getEquippedSkinState(progress) {
  const skin = getSkinDefinition(progress?.equippedSkin);
  return {
    skin,
    rank: Math.max(1, getSkinRank(progress, skin.id)),
    rankLabel: SKIN_RANKS[Math.max(1, getSkinRank(progress, skin.id)) - 1]?.label ?? SKIN_RANKS[0].label
  };
}

export function getSkinCostPlan(skinId) {
  const skin = getSkinDefinition(skinId);
  return SKIN_COST_TABLE[skin.tier] ?? SKIN_COST_TABLE.common;
}

export function getPurchaseCost(skinId) {
  return getSkinCostPlan(skinId).purchase;
}

export function getUpgradeCost(skinId, currentRank) {
  if (currentRank >= 7) return 0;
  const rank = Math.max(1, Math.floor(Number(currentRank ?? 1)));
  return getSkinCostPlan(skinId).upgrades[rank] ?? 0;
}

export function getTotalCostToMax(skinId, includePurchase = true) {
  const plan = getSkinCostPlan(skinId);
  const upgradeTotal = Object.values(plan.upgrades).reduce((sum, cost) => sum + cost, 0);
  return upgradeTotal + (includePurchase ? plan.purchase : 0);
}

export function getRemainingCostToMax(progress, skinId) {
  const purchased = isSkinPurchased(progress, skinId);
  const currentRank = getSkinRank(progress, skinId);
  let total = purchased ? 0 : getPurchaseCost(skinId);

  for (let rank = Math.max(1, currentRank); rank < 7; rank += 1) {
    total += getUpgradeCost(skinId, rank);
  }

  return total;
}

export function estimateValidMsForCoins(coins) {
  let remainingCoins = Math.ceil(Math.max(0, Number(coins ?? 0)));
  if (remainingCoins <= 0) return 0;

  let elapsedMs = 0;
  let coinRemainder = 0;
  let hourlyRemainder = 0;
  let deepRemainder = 0;
  const maxIterations = remainingCoins * 8 + 1000;

  for (let i = 0; remainingCoins > 0 && i < maxIterations; i += 1) {
    const nextCoinMs = FOCUS_REWARD_CONFIG.rewardIntervalMs - coinRemainder;
    const nextHourlyMs = FOCUS_REWARD_CONFIG.bonusIntervalMs - hourlyRemainder;
    const nextDeepMs = FOCUS_REWARD_CONFIG.deepBonusIntervalMs - deepRemainder;
    const stepMs = Math.min(nextCoinMs, nextHourlyMs, nextDeepMs);

    elapsedMs += stepMs;
    coinRemainder += stepMs;
    hourlyRemainder += stepMs;
    deepRemainder += stepMs;

    if (coinRemainder >= FOCUS_REWARD_CONFIG.rewardIntervalMs) {
      coinRemainder = 0;
      remainingCoins -= FOCUS_REWARD_CONFIG.rewardCoins;
    }

    if (hourlyRemainder >= FOCUS_REWARD_CONFIG.bonusIntervalMs) {
      hourlyRemainder = 0;
      remainingCoins -= FOCUS_REWARD_CONFIG.bonusCoins;
    }

    if (deepRemainder >= FOCUS_REWARD_CONFIG.deepBonusIntervalMs) {
      deepRemainder = 0;
      remainingCoins -= FOCUS_REWARD_CONFIG.deepBonusCoins;
    }
  }

  return elapsedMs;
}

export function getSkinVisuals(skinId, rank = 1) {
  const skin = getSkinDefinition(skinId);
  const rankBoost = Math.max(0, Math.min(6, rank - 1));
  return {
    ...skin.colors,
    sparkleOpacity: rank >= 5 ? 0.88 : 0,
    premiumOpacity: rank >= 6 ? 1 : 0,
    legendaryOpacity: rank >= 7 ? 1 : 0,
    accessoryOpacity: rank >= 3 ? 1 : 0,
    shineOpacity: rank >= 4 ? 0.42 : 0.14,
    scale: 1 + rankBoost * 0.018
  };
}

export function formatFocusDuration(ms) {
  const totalMinutes = Math.floor(Math.max(0, Number(ms ?? 0)) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

function clampInterval(value, intervalMs) {
  const numeric = Math.max(0, Number(value ?? 0));
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(intervalMs - 1, numeric % intervalMs);
}

function clampRank(rank) {
  if (!Number.isFinite(rank)) return 0;
  return Math.max(0, Math.min(7, Math.floor(rank)));
}
