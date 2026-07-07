import { Coins, Home, RotateCcw } from 'lucide-react';
import { DachshundMascot } from './DachshundMascot.jsx';
import { formatFocusDuration, getEquippedSkinState } from '../data/focusEconomy.js';

export function Hud({ isDoorOpen, isNearComputer, isNearDoor, focusEconomy, onBackHome, onReset }) {
  const equippedSkin = getEquippedSkinState(focusEconomy?.progress);
  const nextRewardPercent = Math.min(100, Math.max(0, Math.round((focusEconomy?.nextRewardProgress ?? 0) * 100)));

  return (
    <aside className="hud">
      <div>
        <strong>Lobby 3D</strong>
        <span>WASD o flechas para caminar</span>
        <span>Click en el mundo para capturar el mouse</span>
        <span>E para interactuar cuando estes cerca</span>
      </div>

      <div>
        <span>
          {isDoorOpen
            ? 'Estas en Casa 1: la pantalla y la computadora quedan como foco principal de la sala.'
            : 'Segui el camino hasta la puerta de la casita.'}
        </span>
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
            <small>{focusEconomy.status.label} - {formatFocusDuration(focusEconomy.nextRewardRemainingMs)} para +10</small>
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

      {isNearDoor && <p className="hud-ready">Estas frente a la puerta.</p>}
      {isNearComputer && <p className="hud-ready">Estas frente a la computadora.</p>}
    </aside>
  );
}
