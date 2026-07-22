import { CheckCircle2, Coins, Lock, PawPrint, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DachshundMascot } from './DachshundMascot.jsx';
import {
  DACHSHUND_SKINS,
  SKIN_RANKS,
  estimateValidMsForCoins,
  formatFocusDuration,
  getEquippedSkinState,
  getPurchaseCost,
  getRemainingCostToMax,
  getSkinCostPlan,
  getSkinRank,
  getUpgradeCost,
  isSkinPurchased
} from '../data/focusEconomy.js';

const SHOP_FILTERS = [
  ['all', 'Todos'],
  ['skins', 'Skins'],
  ['ranks', 'Rangos'],
  ['unlocked', 'Desbloqueados'],
  ['locked', 'Bloqueados']
];

function isTextEntryElement(element) {
  const tagName = element?.tagName?.toLowerCase();
  if (tagName === 'textarea' || tagName === 'select') return true;
  if (tagName !== 'input') return Boolean(element?.isContentEditable);
  const type = String(element.type ?? 'text').toLowerCase();
  return !['button', 'checkbox', 'radio', 'submit', 'reset'].includes(type);
}

function getEscapedId(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return String(value).replace(/"/g, '');
}

export function RoomShopOverlay({ focusEconomy, onClose }) {
  const progress = focusEconomy.progress;
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedSkinId, setSelectedSkinId] = useState(progress.equippedSkin);
  const equippedSkin = getEquippedSkinState(progress);

  const skinCards = useMemo(
    () =>
      DACHSHUND_SKINS.map((skin) => {
        const purchased = isSkinPurchased(progress, skin.id);
        const rank = getSkinRank(progress, skin.id);
        const visibleRank = Math.max(1, rank);
        const isEquipped = progress.equippedSkin === skin.id;
        const purchaseCost = getPurchaseCost(skin.id);
        const upgradeCost = getUpgradeCost(skin.id, rank);
        const canBuy = !purchased && progress.coins >= purchaseCost;
        const canUpgrade = purchased && rank < 7 && progress.coins >= upgradeCost;
        const nextCost = purchased ? upgradeCost : purchaseCost;
        const missing = Math.max(0, nextCost - progress.coins);
        const plan = getSkinCostPlan(skin.id);

        return {
          skin,
          purchased,
          rank,
          visibleRank,
          isEquipped,
          purchaseCost,
          upgradeCost,
          canBuy,
          canUpgrade,
          missing,
          plan,
          maxed: purchased && rank >= 7
        };
      }),
    [progress]
  );

  const visibleCards = useMemo(
    () =>
      skinCards.filter((item) => {
        if (activeFilter === 'unlocked') return item.purchased;
        if (activeFilter === 'locked') return !item.purchased;
        return activeFilter !== 'ranks';
      }),
    [activeFilter, skinCards]
  );

  const selectedCard = skinCards.find((item) => item.skin.id === selectedSkinId) ?? skinCards[0];
  const selectedRemaining = getRemainingCostToMax(progress, selectedCard.skin.id);
  const selectedRemainingEstimate = estimateValidMsForCoins(Math.max(0, selectedRemaining - progress.coins));

  const handlePrimaryAction = useCallback((item) => {
    if (!item.purchased) {
      focusEconomy.actions.buySkin(item.skin.id);
      return;
    }

    focusEconomy.actions.equipSkin(item.skin.id);
  }, [focusEconomy.actions]);

  const selectCard = useCallback((skinId) => {
    setSelectedSkinId(skinId);
    window.requestAnimationFrame(() => {
      listRef.current
        ?.querySelector(`[data-shop-card-id="${getEscapedId(skinId)}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (activeFilter === 'ranks') return;
    if (!visibleCards.length) return;
    if (!visibleCards.some((item) => item.skin.id === selectedSkinId)) {
      selectCard(visibleCards[0].skin.id);
    }
  }, [activeFilter, selectedSkinId, selectCard, visibleCards]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTextEntryElement(event.target)) return;

      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const currentIndex = Math.max(0, SHOP_FILTERS.findIndex(([filterId]) => filterId === activeFilter));
        const nextIndex = (currentIndex + direction + SHOP_FILTERS.length) % SHOP_FILTERS.length;
        setActiveFilter(SHOP_FILTERS[nextIndex][0]);
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const navigationCards = activeFilter === 'ranks' ? skinCards : visibleCards;
        if (!navigationCards.length) return;

        event.preventDefault();
        event.stopPropagation();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const currentIndex = Math.max(0, navigationCards.findIndex((item) => item.skin.id === selectedSkinId));
        const nextIndex = (currentIndex + direction + navigationCards.length) % navigationCards.length;
        selectCard(navigationCards[nextIndex].skin.id);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        if (!selectedCard.isEquipped && (selectedCard.purchased || selectedCard.canBuy)) {
          handlePrimaryAction(selectedCard);
          return;
        }
        if (selectedCard.canUpgrade) {
          focusEconomy.actions.upgradeSkin(selectedCard.skin.id);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [activeFilter, focusEconomy.actions, handlePrimaryAction, onClose, selectCard, selectedCard, selectedSkinId, skinCards, visibleCards]);

  return (
    <div className="room-shop-overlay" role="dialog" aria-modal="true" aria-label="Tienda Salchi" onPointerDown={(event) => event.stopPropagation()}>
      <section className="room-shop-panel" ref={panelRef} tabIndex={-1}>
        <header className="room-shop-header">
          <div className="room-shop-title">
            <span>
              <PawPrint size={17} aria-hidden="true" />
              Tienda Salchi
            </span>
            <h2>Skins y rangos</h2>
          </div>
          <div className="room-shop-wallet" aria-label={`${progress.coins} monedas disponibles`}>
            <Coins size={18} aria-hidden="true" />
            <strong>{progress.coins}</strong>
            <span>monedas</span>
          </div>
          <button type="button" className="room-shop-close" onClick={onClose} aria-label="Cerrar tienda">
            <X size={20} aria-hidden="true" />
          </button>
          <p className="room-shop-keyboard-hint">↑↓ elegir · ←→ filtros · Enter confirmar · Backspace volver</p>
        </header>

        <nav className="room-shop-tabs" aria-label="Filtros de tienda">
          {SHOP_FILTERS.map(([filterId, label]) => (
            <button
              key={filterId}
              type="button"
              className={activeFilter === filterId ? 'is-active' : ''}
              aria-pressed={activeFilter === filterId}
              onClick={() => setActiveFilter(filterId)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="room-shop-layout">
          <section className="room-shop-list" ref={listRef} role="listbox" aria-label="Articulos disponibles">
            {activeFilter === 'ranks' ? (
              <RankGuide selectedCard={selectedCard} />
            ) : (
              visibleCards.map((item) => (
                <article
                  key={item.skin.id}
                  data-shop-card-id={item.skin.id}
                  role="option"
                  aria-selected={selectedCard.skin.id === item.skin.id}
                  className={`room-shop-card${item.isEquipped ? ' is-equipped' : ''}${!item.purchased ? ' is-locked' : ''}${
                    selectedCard.skin.id === item.skin.id ? ' is-selected' : ''
                  }`}
                  onClick={() => selectCard(item.skin.id)}
                >
                  <button type="button" className="room-shop-card-preview" onFocus={() => selectCard(item.skin.id)} onClick={() => selectCard(item.skin.id)}>
                    <DachshundMascot skinId={item.skin.id} rank={item.visibleRank} size="shop" showBadges={false} />
                  </button>
                  <div className="room-shop-card-copy">
                    <span className="room-shop-card-kicker">{item.skin.rarity}</span>
                    <h3>{item.skin.name}</h3>
                    <p>{item.skin.description}</p>
                    <SkinStateBadge item={item} />
                  </div>
                  <div className="room-shop-rank-track" aria-label={`Rango ${item.visibleRank} de 7`}>
                    {SKIN_RANKS.map((rankItem) => (
                      <span key={rankItem.rank} className={item.purchased && rankItem.rank <= item.visibleRank ? 'is-active' : ''} />
                    ))}
                  </div>
                  <div className="room-shop-card-actions">
                    <button
                      type="button"
                      className="room-shop-primary-action"
                      disabled={item.isEquipped || (!item.purchased && !item.canBuy)}
                      onClick={() => handlePrimaryAction(item)}
                    >
                      {item.purchased ? <CheckCircle2 size={16} aria-hidden="true" /> : <Coins size={16} aria-hidden="true" />}
                      <span>{getPrimaryActionLabel(item)}</span>
                    </button>
                    {item.purchased && !item.maxed && (
                      <button type="button" disabled={!item.canUpgrade} onClick={() => focusEconomy.actions.upgradeSkin(item.skin.id)}>
                        <Sparkles size={16} aria-hidden="true" />
                        <span>{item.canUpgrade ? `Mejorar ${item.upgradeCost}` : `Faltan ${item.missing}`}</span>
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </section>

          <aside className="room-shop-detail" aria-label="Detalle seleccionado">
            <div className="room-shop-vendor-card">
              <DachshundMascot skinId={selectedCard.skin.id} rank={selectedCard.visibleRank} size="profile" showBadges={false} />
              <span>{selectedCard.plan.label}</span>
            </div>
            <div className="room-shop-detail-copy">
              <span>{selectedCard.skin.rarity}</span>
              <h3>{selectedCard.skin.name}</h3>
              <p>{selectedCard.skin.description}</p>
            </div>

            <div className="room-shop-detail-stats">
              <div>
                <ShieldCheck size={16} aria-hidden="true" />
                <span>{selectedCard.purchased ? `Rango ${selectedCard.visibleRank}/7` : 'Bloqueada'}</span>
              </div>
              <div>
                <Coins size={16} aria-hidden="true" />
                <span>{selectedCard.purchased ? `${selectedRemaining} para completar` : `${selectedCard.purchaseCost} para comprar`}</span>
              </div>
            </div>

            <div className="room-shop-detail-ranks">
              {SKIN_RANKS.map((rankItem) => {
                const unlocked = selectedCard.purchased && rankItem.rank <= selectedCard.visibleRank;
                return (
                  <span key={rankItem.rank} className={unlocked ? 'is-unlocked' : ''}>
                    {rankItem.rank}
                  </span>
                );
              })}
            </div>

            <p className="room-shop-detail-note">
              {selectedRemaining > progress.coins
                ? `Aprox. ${formatFocusDuration(selectedRemainingEstimate)} de contenido activo para completar esta skin.`
                : selectedCard.maxed
                  ? 'Esta skin ya esta completa.'
                  : 'Tenes monedas suficientes para el siguiente paso.'}
            </p>

            <button
              type="button"
              className="room-shop-detail-button"
              disabled={selectedCard.isEquipped || (!selectedCard.purchased && !selectedCard.canBuy)}
              onClick={() => handlePrimaryAction(selectedCard)}
            >
              {selectedCard.purchased ? <CheckCircle2 size={18} aria-hidden="true" /> : <Coins size={18} aria-hidden="true" />}
              <span>{getPrimaryActionLabel(selectedCard)}</span>
            </button>

            <small>Equipada ahora: {equippedSkin.skin.name}, rango {equippedSkin.rank}</small>
          </aside>
        </div>
      </section>
    </div>
  );
}

function SkinStateBadge({ item }) {
  if (item.isEquipped) {
    return (
      <span className="room-shop-state is-equipped">
        <CheckCircle2 size={14} aria-hidden="true" />
        Equipado
      </span>
    );
  }

  if (item.purchased) {
    return (
      <span className="room-shop-state is-unlocked">
        <ShieldCheck size={14} aria-hidden="true" />
        Desbloqueado
      </span>
    );
  }

  return (
    <span className="room-shop-state is-locked">
      <Lock size={14} aria-hidden="true" />
      Bloqueado
    </span>
  );
}

function RankGuide({ selectedCard }) {
  return (
    <div className="room-shop-rank-guide">
      {SKIN_RANKS.map((rankItem) => {
        const unlocked = selectedCard.purchased && rankItem.rank <= selectedCard.visibleRank;
        return (
          <article key={rankItem.rank} className={unlocked ? 'is-unlocked' : ''}>
            <strong>Rango {rankItem.rank}</strong>
            <span>{rankItem.label}</span>
            <small>{unlocked ? 'Disponible' : 'Bloqueado'}</small>
          </article>
        );
      })}
    </div>
  );
}

function getPrimaryActionLabel(item) {
  if (item.isEquipped) return 'Equipado';
  if (item.purchased) return 'Equipar';
  if (item.canBuy) return `Comprar ${item.purchaseCost}`;
  return `Faltan ${item.missing}`;
}
