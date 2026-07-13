import { Coins, Home, RotateCcw } from 'lucide-react';
import { DachshundMascot } from './DachshundMascot.jsx';
import { BUILD_LABEL, BUILD_MARKER } from '../data/buildInfo.js';
import { FOCUS_REWARD_CONFIG, formatFocusDuration, getEquippedSkinState } from '../data/focusEconomy.js';

export function Hud({ isDoorOpen, isNearComputer, isNearDoor, focusEconomy, onBackHome, onReset }) {
  const equippedSkin = getEquippedSkinState(focusEconomy?.progress);
  const nextRewardPercent = Math.min(100, Math.max(0, Math.round((focusEconomy?.nextRewardProgress ?? 0) * 100)));
  const sceneTitle = isDoorOpen ? 'Casa 1' : 'Lobby 3D';
  const contextHint = isNearComputer
    ? 'E: abrir computadora'
    : isNearDoor
      ? isDoorOpen ? 'E: salir al barrio' : 'E: entrar a Casa 1'
      : isDoorOpen
        ? 'Q: control de pantalla'
        : 'Moverse y mirar';

  return (
    <aside className="hud hud-compact">
      <span className="hud-build-version" data-build-marker={BUILD_MARKER}>{BUILD_LABEL}</span>
      <div className="hud-heading">
        <strong>{sceneTitle}</strong>
        <span>{contextHint}</span>
      </div>

      <div className="hud-mini-guide" aria-label="Controles basicos">
        <span>WASD</span>
        <span>Mouse</span>
        <span>Interactuar</span>
      </div>

      {focusEconomy && (
        <section className="hud-focus-card" aria-label="Monedas de Enfoque">
          <DachshundMascot skinId={equippedSkin.skin.id} rank={equippedSkin.rank} size="hud" />
          <div>
            <span className="hud-focus-kicker">
              <Coins size={15} aria-hidden="true" />
              {focusEconomy.progress.coins} Monedas
            </span>
            <strong>{equippedSkin.skin.name}</strong>
            <span>Rango {equippedSkin.rank} - {equippedSkin.rankLabel}</span>
            <div className="hud-focus-progress" aria-label={`Progreso a proxima recompensa ${nextRewardPercent}%`}>
              <span style={{ width: `${nextRewardPercent}%` }} />
            </div>
            <small>{focusEconomy.status.label} - {formatFocusDuration(focusEconomy.nextRewardRemainingMs)} para +{FOCUS_REWARD_CONFIG.rewardCoins}</small>
          </div>
        </section>
      )}

      <div className="hud-actions">
        <button type="button" onClick={onReset}>
          <RotateCcw size={16} aria-hidden="true" />
          Reiniciar
        </button>
        <button type="button" onClick={onBackHome}>
          <Home size={16} aria-hidden="true" />
          Inicio
        </button>
      </div>
    </aside>
  );
}
