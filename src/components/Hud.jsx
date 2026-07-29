import { Home, RotateCcw } from 'lucide-react';

export function Hud({ isDoorOpen, isNearComputer, isNearDoor, onBackHome, onReset }) {
  return (
    <aside className="hud">
      <div>
        <strong>{isDoorOpen ? 'Casa 1' : 'Lobby 3D'}</strong>
        <span>WASD o flechas para caminar</span>
        <span>Click en el mundo para capturar el mouse</span>
        <span>E para interactuar cuando estes cerca</span>
      </div>

      <div>
        <span>
          {isDoorOpen
            ? 'Estas dentro de Casa 1. La computadora esta en la esquina izquierda.'
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
