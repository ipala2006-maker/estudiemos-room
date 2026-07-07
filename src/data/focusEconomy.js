export const FOCUS_ECONOMY_STORAGE_KEY = 'estudiemos-room-focus-economy';

export const FOCUS_REWARD_CONFIG = {
  idleMs: 3 * 60 * 1000,
  rewardIntervalMs: 5 * 60 * 1000,
  rewardCoins: 10,
  bonusIntervalMs: 25 * 60 * 1000,
  bonusCoins: 25,
  dailyBonusCoins: 20,
  engagedMultiplier: 1.15
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
    rarity: 'Inicial',
    description: 'La mascota base de Estudiemos: simpatica, clara y lista para acompanarte.',
    baseCost: 0,
    rankCost: 45,
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
    rarity: 'Rara',
    description: 'Un look futurista para sesiones largas con visor, neon y energia limpia.',
    baseCost: 90,
    rankCost: 70,
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
    rarity: 'Epica',
    description: 'Casco, herramientas y espiritu de resolver problemas paso a paso.',
    baseCost: 130,
    rankCost: 90,
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
  coins: 0,
  totalActiveMs: 0,
  activeIntervalMs: 0,
  bonusIntervalMs: 0,
  sessionEarned: 0,
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

  return {
    ...DEFAULT_FOCUS_PROGRESS,
    ...current,
    coins: Math.max(0, Math.floor(Number(current.coins ?? 0))),
    totalActiveMs: Math.max(0, Number(current.totalActiveMs ?? 0)),
    activeIntervalMs: Math.max(0, Number(current.activeIntervalMs ?? 0)),
    bonusIntervalMs: Math.max(0, Number(current.bonusIntervalMs ?? 0)),
    sessionEarned: 0,
    purchasedSkins,
    skinRanks,
    equippedSkin,
    lastSessionDate: String(current.lastSessionDate ?? ''),
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

export function getPurchaseCost(skinId) {
  return getSkinDefinition(skinId).baseCost;
}

export function getUpgradeCost(skinId, currentRank) {
  if (currentRank >= 7) return 0;
  const skin = getSkinDefinition(skinId);
  return skin.rankCost + currentRank * Math.round(skin.rankCost * 0.42);
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
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

function clampRank(rank) {
  if (!Number.isFinite(rank)) return 0;
  return Math.max(0, Math.min(7, Math.floor(rank)));
}
