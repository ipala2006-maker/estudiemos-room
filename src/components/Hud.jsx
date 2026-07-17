import { Coins, Home, RotateCcw } from 'lucide-react';
import { DachshundMascot } from './DachshundMascot.jsx';
import { BUILD_LABEL, BUILD_MARKER } from '../data/buildInfo.js';
import { getEquippedSkinState } from '../data/focusEconomy.js';

export function Hud({ isDoorOpen, interactionHint, focusEconomy, onBackHome, onReset }) {
  const equippedSkin = getEquippedSkinState(focusEconomy?.progress);
  const nextRewardPercent = Math.min(100, Math.max(0, Math.round((focusEconomy?.nextRewardProgress ?? 0) * 100)));
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
        <section className="hud-focus-card" aria-label="Monedas de Enfoque">
          <DachshundMascot skinId={equippedSkin.skin.id} rank={equippedSkin.rank} size="hud" showBadges={false} />
          <div>
            <div className="hud-focus-meta">
              <span className="hud-focus-kicker" aria-label={`${focusEconomy.progress.coins} monedas`}>
                <Coins size={15} aria-hidden="true" />
                {focusEconomy.progress.coins}
              </span>
            </div>
            <div className="hud-focus-progress" aria-label={`Progreso a proxima recompensa ${nextRewardPercent}%`}>
              <span style={{ width: `${nextRewardPercent}%` }} />
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
