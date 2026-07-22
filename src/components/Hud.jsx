import { Coins, Home, RotateCcw } from 'lucide-react';
import { DachshundMascot } from './DachshundMascot.jsx';
import { BUILD_LABEL, BUILD_MARKER } from '../data/buildInfo.js';
import { getEquippedSkinState } from '../data/focusEconomy.js';

export function Hud({ isDoorOpen, interactionHint, focusEconomy, onBackHome, onReset }) {
  const equippedSkin = getEquippedSkinState(focusEconomy?.progress);
  const nextRewardPercent = Math.min(100, Math.max(0, Math.round((focusEconomy?.nextRewardProgress ?? 0) * 100)));
  const progressSegments = Array.from({ length: 10 }, (_, index) => index);
  const filledSegments = Math.min(10, Math.max(0, Math.ceil(nextRewardPercent / 10)));
  const activeSegment = nextRewardPercent > 0 && nextRewardPercent < 100 ? Math.max(0, filledSegments - 1) : -1;
  const sceneTitle = isDoorOpen ? 'Piso 1' : 'Lobby';
  const contextLabel = interactionHint?.title ?? '';
  const contextKey = interactionHint?.control ?? '';

  return (
    <aside className="hud hud-compact hud-clean">
      <span className="hud-build-version" data-build-marker={BUILD_MARKER}>{BUILD_LABEL}</span>
      <div className="hud-heading">
        <strong>{sceneTitle}</strong>
        {contextKey && (
          <span className="hud-context-key" aria-label={`${contextKey}: ${contextLabel}`} title={contextLabel}>
            {contextKey}
          </span>
        )}
      </div>

      {focusEconomy && (
        <section
          className="hud-focus-card hud-focus-xp-card"
          aria-label={`Salchicha rango ${equippedSkin.rank}, ${focusEconomy.progress.coins} monedas, progreso ${nextRewardPercent}%`}
        >
          <div className="hud-focus-supercharged" aria-hidden="true">
            <span>XP</span>
            <strong>SUPERCHARGED!</strong>
          </div>
          <div className="hud-focus-avatar-shell">
            <DachshundMascot skinId={equippedSkin.skin.id} rank={equippedSkin.rank} size="hud" showBadges={false} />
          </div>
          <div className="hud-focus-xp-body">
            <div className="hud-focus-level-row">
              <span className="hud-focus-level-prefix">LVL</span>
              <strong>{equippedSkin.rank}</strong>
              <span className="hud-focus-kicker" aria-label={`${focusEconomy.progress.coins} monedas`}>
                <Coins size={15} aria-hidden="true" />
                +{focusEconomy.progress.coins.toLocaleString('es-AR')}
                <small>XP</small>
              </span>
            </div>
            <div
              className="hud-focus-progress hud-focus-segment-track"
              aria-label={`Progreso a proxima recompensa ${nextRewardPercent}%`}
              style={{ '--focus-progress': `${nextRewardPercent}%` }}
            >
              {progressSegments.map((segment) => {
                const classes = [
                  'hud-focus-xp-segment',
                  segment < filledSegments ? 'is-filled' : '',
                  segment === activeSegment ? 'is-active' : '',
                  segment >= 8 ? 'is-bonus' : ''
                ].filter(Boolean).join(' ');

                return <span key={segment} className={classes} />;
              })}
            </div>
          </div>
        </section>
      )}

      <div className="hud-actions">
        <button type="button" onClick={onReset} aria-label="Reiniciar" title="Reiniciar">
          <RotateCcw size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={onBackHome} aria-label="Inicio" title="Inicio">
          <Home size={16} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
