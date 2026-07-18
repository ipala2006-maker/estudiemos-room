import { Coins, Home, RotateCcw } from 'lucide-react';
import { DachshundMascot } from './DachshundMascot.jsx';
import { BUILD_LABEL, BUILD_MARKER } from '../data/buildInfo.js';
import { getEquippedSkinState } from '../data/focusEconomy.js';

export function Hud({ isDoorOpen, interactionHint, focusEconomy, onBackHome, onReset }) {
  const equippedSkin = getEquippedSkinState(focusEconomy?.progress);
  const nextRewardPercent = Math.min(100, Math.max(0, Math.round((focusEconomy?.nextRewardProgress ?? 0) * 100)));
  const progressSegments = Array.from({ length: 10 }, (_, index) => index);
  const filledSegments = Math.min(10, Math.max(0, Math.ceil(nextRewardPercent / 10)));
  const sceneTitle = isDoorOpen ? 'Casa 1' : 'Lobby 3D';
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
          <div className="hud-focus-avatar-shell">
            <DachshundMascot skinId={equippedSkin.skin.id} rank={equippedSkin.rank} size="hud" showBadges={false} />
            <span className="hud-focus-rank-chip">R{equippedSkin.rank}</span>
          </div>
          <div className="hud-focus-xp-body">
            <div className="hud-focus-xp-top">
              <span className="hud-focus-mode">Modo foco</span>
              <span className="hud-focus-kicker" aria-label={`${focusEconomy.progress.coins} monedas`}>
                <Coins size={15} aria-hidden="true" />
                {focusEconomy.progress.coins}
              </span>
            </div>
            <div className="hud-focus-level-row">
              <strong>Rango {equippedSkin.rank}</strong>
              <span>{nextRewardPercent}%</span>
            </div>
            <div
              className="hud-focus-progress hud-focus-segment-track"
              aria-label={`Progreso a proxima recompensa ${nextRewardPercent}%`}
              style={{ '--focus-progress': `${nextRewardPercent}%` }}
            >
              {progressSegments.map((segment) => (
                <span key={segment} className={segment < filledSegments ? 'is-filled' : ''} />
              ))}
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
