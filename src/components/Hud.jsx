import { Home, RotateCcw } from 'lucide-react';

export function Hud({ isDoorOpen, isNearComputer, isNearDoor, onBackHome, onReset }) {
  return (
    <aside className="hud">
      <div>
        <strong>Lobby 3D</strong>
        <span>WASD o flechas para caminar</span>
        <span>Mueve el mouse para mirar</span>
        <span>E para interactuar cuando estes cerca</span>
      </div>

      <div>
        <span>
          {isDoorOpen
            ? 'La puerta esta abierta: entra, mira a la esquina izquierda y acercate a la computadora.'
            : 'Segui el camino hasta la puerta de la casita.'}
        </span>
      </div>

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
