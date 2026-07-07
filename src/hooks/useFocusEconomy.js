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

export function useFocusEconomy({ enabled, hasScreenContent, computerOpen }) {
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
    if (!enabled) return;

    const today = getFocusDateValue();
    const yesterday = getFocusDateValue(-1);
    setProgress((current) => {
      if (current.lastSessionDate === today) return current;

      const nextStreak = current.lastSessionDate === yesterday ? current.streak + 1 : 1;
      pushRewardToast(`+${FOCUS_REWARD_CONFIG.dailyBonusCoins} Monedas de Enfoque`, 'Primera sesion del dia');
      return {
        ...current,
        coins: current.coins + FOCUS_REWARD_CONFIG.dailyBonusCoins,
        sessionEarned: current.sessionEarned + FOCUS_REWARD_CONFIG.dailyBonusCoins,
        lastSessionDate: today,
        streak: nextStreak
      };
    });
  }, [enabled]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(now - lastTickRef.current, 5000);
      lastTickRef.current = now;
      setClock(now);

      if (!enabled || document.hidden || now - lastActivityRef.current > FOCUS_REWARD_CONFIG.idleMs) return;

      const multiplier = computerOpen || hasScreenContent ? FOCUS_REWARD_CONFIG.engagedMultiplier : 1;
      const activeMs = Math.round(elapsed * multiplier);

      setProgress((current) => {
        let nextRewardRemainder = current.activeIntervalMs + activeMs;
        let nextBonusRemainder = current.bonusIntervalMs + activeMs;
        let earned = 0;
        let rewardCount = 0;
        let bonusCount = 0;

        while (nextRewardRemainder >= FOCUS_REWARD_CONFIG.rewardIntervalMs) {
          nextRewardRemainder -= FOCUS_REWARD_CONFIG.rewardIntervalMs;
          earned += FOCUS_REWARD_CONFIG.rewardCoins;
          rewardCount += 1;
        }

        while (nextBonusRemainder >= FOCUS_REWARD_CONFIG.bonusIntervalMs) {
          nextBonusRemainder -= FOCUS_REWARD_CONFIG.bonusIntervalMs;
          earned += FOCUS_REWARD_CONFIG.bonusCoins;
          bonusCount += 1;
        }

        if (earned > 0) {
          const detail = bonusCount > 0 ? 'Bonus de enfoque incluido' : `${rewardCount} bloque activo`;
          pushRewardToast(`+${earned} Monedas de Enfoque`, detail);
        }

        return {
          ...current,
          coins: current.coins + earned,
          totalActiveMs: current.totalActiveMs + activeMs,
          activeIntervalMs: nextRewardRemainder,
          bonusIntervalMs: nextBonusRemainder,
          sessionEarned: current.sessionEarned + earned
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [computerOpen, enabled, hasScreenContent]);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  const status = useMemo(() => {
    if (!enabled) return { id: 'idle', label: 'Esperando inicio', active: false };
    if (document.hidden) return { id: 'hidden', label: 'Pausado: pestana oculta', active: false };
    if (clock - lastActivityAt > FOCUS_REWARD_CONFIG.idleMs) return { id: 'afk', label: 'Pausado por inactividad', active: false };
    return { id: 'active', label: computerOpen || hasScreenContent ? 'Estudio activo reforzado' : 'Estudio activo', active: true };
  }, [clock, computerOpen, enabled, hasScreenContent, lastActivityAt]);

  const actions = useMemo(
    () => ({
      buySkin(skinId) {
        setProgress((current) => {
          if (isSkinPurchased(current, skinId)) return current;

          const cost = getPurchaseCost(skinId);
          if (current.coins < cost) {
            pushRewardToast('Monedas insuficientes', 'Segui estudiando para comprar esta skin');
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
            pushRewardToast('Monedas insuficientes', 'Falta para mejorar este rango');
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
    nextRewardRemainingMs: Math.max(0, FOCUS_REWARD_CONFIG.rewardIntervalMs - progress.activeIntervalMs)
  };
}
