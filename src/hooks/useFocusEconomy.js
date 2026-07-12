import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DACHSHUND_SKINS,
  DEFAULT_FOCUS_PROGRESS,
  FOCUS_ECONOMY_STORAGE_KEY,
  FOCUS_REWARD_CONFIG,
  getFocusDateValue,
  getPurchaseCost,
  getSkinRank,
  getUpgradeCost,
  isSkinPurchased,
  sanitizeFocusProgress
} from '../data/focusEconomy.js';

function loadStoredFocusProgress() {
  if (typeof window === 'undefined') return DEFAULT_FOCUS_PROGRESS;

  try {
    const rawProgress = window.localStorage.getItem(FOCUS_ECONOMY_STORAGE_KEY);
    return rawProgress ? sanitizeFocusProgress(JSON.parse(rawProgress)) : DEFAULT_FOCUS_PROGRESS;
  } catch {
    return DEFAULT_FOCUS_PROGRESS;
  }
}

export function useFocusEconomy({ enabled, hasScreenContent }) {
  const [progress, setProgress] = useState(loadStoredFocusProgress);
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());
  const [rewardToast, setRewardToast] = useState(null);
  const [clock, setClock] = useState(() => Date.now());
  const lastTickRef = useRef(Date.now());
  const saveTimerRef = useRef(0);
  const toastTimerRef = useRef(0);
  const progressRef = useRef(progress);
  const lastActivityRef = useRef(lastActivityAt);

  useEffect(() => {
    progressRef.current = progress;
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      window.localStorage.setItem(FOCUS_ECONOMY_STORAGE_KEY, JSON.stringify(progressRef.current));
    }, 700);

    return () => window.clearTimeout(saveTimerRef.current);
  }, [progress]);

  useEffect(() => {
    lastActivityRef.current = lastActivityAt;
  }, [lastActivityAt]);

  useEffect(() => {
    function markActivity() {
      const now = Date.now();
      lastActivityRef.current = now;
      setLastActivityAt(now);
    }

    const events = ['mousemove', 'keydown', 'pointerdown', 'click', 'wheel', 'touchstart'];
    events.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    markActivity();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, markActivity));
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(now - lastTickRef.current, FOCUS_REWARD_CONFIG.tickMaxMs);
      lastTickRef.current = now;
      setClock(now);

      const isEligible =
        enabled &&
        hasScreenContent &&
        !document.hidden &&
        now - lastActivityRef.current <= FOCUS_REWARD_CONFIG.idleMs;

      if (!isEligible || elapsed <= 0) return;

      setProgress((current) => {
        const today = getFocusDateValue();
        const yesterday = getFocusDateValue(-1);
        const isSameEarningDay = current.lastEarningDate === today;
        let nextRewardRemainder = current.activeIntervalMs + elapsed;
        let nextBonusRemainder = current.bonusIntervalMs + elapsed;
        let nextDeepBonusRemainder = current.deepBonusIntervalMs + elapsed;
        let earned = 0;
        let rewardCount = 0;
        let hourBonusCount = 0;
        let deepBonusCount = 0;
        let nextStreak = current.streak;
        let nextLastSessionDate = current.lastSessionDate;
        let nextLastValidBonusDate = current.lastValidBonusDate;

        if (current.lastValidBonusDate !== today) {
          earned += FOCUS_REWARD_CONFIG.dailyBonusCoins;
          nextLastValidBonusDate = today;
          nextStreak = current.lastSessionDate === yesterday ? current.streak + 1 : 1;
          nextLastSessionDate = today;
        }

        while (nextRewardRemainder >= FOCUS_REWARD_CONFIG.rewardIntervalMs) {
          nextRewardRemainder -= FOCUS_REWARD_CONFIG.rewardIntervalMs;
          earned += FOCUS_REWARD_CONFIG.rewardCoins;
          rewardCount += 1;
        }

        while (nextBonusRemainder >= FOCUS_REWARD_CONFIG.bonusIntervalMs) {
          nextBonusRemainder -= FOCUS_REWARD_CONFIG.bonusIntervalMs;
          earned += FOCUS_REWARD_CONFIG.bonusCoins;
          hourBonusCount += 1;
        }

        while (nextDeepBonusRemainder >= FOCUS_REWARD_CONFIG.deepBonusIntervalMs) {
          nextDeepBonusRemainder -= FOCUS_REWARD_CONFIG.deepBonusIntervalMs;
          earned += FOCUS_REWARD_CONFIG.deepBonusCoins;
          deepBonusCount += 1;
        }

        if (earned > 0) {
          pushRewardToast(`+${earned} Monedas de Enfoque`, buildRewardDetail(rewardCount, hourBonusCount, deepBonusCount));
        }

        return {
          ...current,
          coins: current.coins + earned,
          totalValidContentMs: current.totalValidContentMs + elapsed,
          totalActiveMs: current.totalActiveMs + elapsed,
          sessionValidContentMs: current.sessionValidContentMs + elapsed,
          dailyValidContentMs: (isSameEarningDay ? current.dailyValidContentMs : 0) + elapsed,
          activeIntervalMs: nextRewardRemainder,
          bonusIntervalMs: nextBonusRemainder,
          deepBonusIntervalMs: nextDeepBonusRemainder,
          sessionEarned: current.sessionEarned + earned,
          dailyEarned: (isSameEarningDay ? current.dailyEarned : 0) + earned,
          lastEarningDate: today,
          lastRewardAt: earned > 0 ? now : current.lastRewardAt,
          lastValidBonusDate: nextLastValidBonusDate,
          lastSessionDate: nextLastSessionDate,
          streak: nextStreak
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [enabled, hasScreenContent]);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  const status = useMemo(() => {
    if (!enabled) return { id: 'idle', label: 'Esperando inicio', active: false };
    if (document.hidden) return { id: 'hidden', label: 'Pausado: pestana oculta', active: false };
    if (!hasScreenContent) return { id: 'no-content', label: 'Pausado: sin contenido', active: false };
    if (clock - lastActivityAt > FOCUS_REWARD_CONFIG.idleMs) return { id: 'afk', label: 'Pausado: inactivo', active: false };
    return { id: 'active', label: 'Ganando monedas: contenido activo', active: true };
  }, [clock, enabled, hasScreenContent, lastActivityAt]);

  const actions = useMemo(
    () => ({
      buySkin(skinId) {
        setProgress((current) => {
          if (isSkinPurchased(current, skinId)) return current;

          const cost = getPurchaseCost(skinId);
          if (current.coins < cost) {
            pushRewardToast('Monedas insuficientes', 'Necesitas mas tiempo valido con contenido');
            return current;
          }

          const nextProgress = {
            ...current,
            coins: current.coins - cost,
            purchasedSkins: { ...current.purchasedSkins, [skinId]: true },
            skinRanks: { ...current.skinRanks, [skinId]: 1 },
            equippedSkin: skinId
          };
          pushRewardToast('Skin desbloqueada', 'Equipada en tu perro salchicha');
          return nextProgress;
        });
      },
      upgradeSkin(skinId) {
        setProgress((current) => {
          if (!isSkinPurchased(current, skinId)) return current;

          const rank = getSkinRank(current, skinId);
          if (rank >= 7) return current;

          const cost = getUpgradeCost(skinId, rank);
          if (current.coins < cost) {
            pushRewardToast('Monedas insuficientes', 'Falta tiempo valido para mejorar este rango');
            return current;
          }

          pushRewardToast('Rango mejorado', `Rango ${rank + 1} desbloqueado`);
          return {
            ...current,
            coins: current.coins - cost,
            skinRanks: { ...current.skinRanks, [skinId]: rank + 1 }
          };
        });
      },
      equipSkin(skinId) {
        setProgress((current) => {
          const skinExists = DACHSHUND_SKINS.some((skin) => skin.id === skinId);
          if (!skinExists || !isSkinPurchased(current, skinId)) return current;

          pushRewardToast('Skin equipada', 'Mascota actualizada');
          return {
            ...current,
            equippedSkin: skinId
          };
        });
      }
    }),
    []
  );

  function pushRewardToast(title, detail) {
    window.clearTimeout(toastTimerRef.current);
    setRewardToast({ id: Date.now(), title, detail });
    toastTimerRef.current = window.setTimeout(() => setRewardToast(null), 3600);
  }

  return {
    progress,
    status,
    rewardToast,
    actions,
    nextRewardProgress: progress.activeIntervalMs / FOCUS_REWARD_CONFIG.rewardIntervalMs,
    nextRewardRemainingMs: Math.max(0, FOCUS_REWARD_CONFIG.rewardIntervalMs - progress.activeIntervalMs),
    nextBonusRemainingMs: Math.max(0, FOCUS_REWARD_CONFIG.bonusIntervalMs - progress.bonusIntervalMs),
    nextDeepBonusRemainingMs: Math.max(0, FOCUS_REWARD_CONFIG.deepBonusIntervalMs - progress.deepBonusIntervalMs)
  };
}

function buildRewardDetail(rewardCount, hourBonusCount, deepBonusCount) {
  if (deepBonusCount > 0) return 'Bonus de 5 h de contenido incluido';
  if (hourBonusCount > 0) return 'Bonus de 60 min de contenido incluido';
  if (rewardCount > 0) return `${rewardCount} bloque de 10 min valido`;
  return 'Primera sesion valida del dia';
}
