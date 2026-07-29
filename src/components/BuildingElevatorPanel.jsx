import { Building2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BUILDING_FLOORS } from '../maps/BuildingWorld.js';

export function BuildingElevatorPanel({ currentFloor, onSelectFloor, onClose }) {
  const availableFloors = useMemo(() => BUILDING_FLOORS.filter((floor) => floor.id !== currentFloor), [currentFloor]);
  const orderedFloors = useMemo(() => [...BUILDING_FLOORS].sort((a, b) => b.number - a.number), []);
  const currentFloorInfo = BUILDING_FLOORS.find((floor) => floor.id === currentFloor) ?? BUILDING_FLOORS[0];
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((current) => (current - 1 + availableFloors.length) % availableFloors.length);
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((current) => (current + 1) % availableFloors.length);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        const selectedFloor = availableFloors[selectedIndex];
        if (selectedFloor) onSelectFloor(selectedFloor.id);
      }
    }

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [availableFloors, onClose, onSelectFloor, selectedIndex]);

  return (
    <div className="building-elevator-overlay" role="presentation" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="building-elevator-panel" role="dialog" aria-modal="true" aria-label="Seleccionar piso del ascensor">
        <span className="building-elevator-screw is-top-left" aria-hidden="true" />
        <span className="building-elevator-screw is-top-right" aria-hidden="true" />
        <span className="building-elevator-screw is-bottom-left" aria-hidden="true" />
        <span className="building-elevator-screw is-bottom-right" aria-hidden="true" />

        <header>
          <span className="building-elevator-mark" aria-hidden="true"><Building2 size={20} /></span>
          <div>
            <small>EDIFICIO ESTUDIEMOS</small>
            <h2>Botonera de cabina</h2>
          </div>
          <button type="button" className="building-elevator-close" onClick={onClose} aria-label="Cerrar ascensor" title="Cerrar">
            <X size={19} />
          </button>
        </header>

        <div className="building-elevator-display" aria-live="polite">
          <span>POSICION</span>
          <strong>{currentFloorInfo.shortLabel}</strong>
          <small>CABINA DETENIDA</small>
        </div>

        <div className="building-elevator-button-bank" role="group" aria-label="Botones de piso">
          {orderedFloors.map((floor) => {
            const availableIndex = availableFloors.findIndex((candidate) => candidate.id === floor.id);
            const isCurrent = floor.id === currentFloor;
            const isSelected = availableIndex === selectedIndex && !isCurrent;

            return (
              <button
                type="button"
                key={floor.id}
                className={`${isCurrent ? 'is-current' : ''}${isSelected ? ' is-selected' : ''}`}
                onMouseEnter={() => availableIndex >= 0 && setSelectedIndex(availableIndex)}
                onClick={() => !isCurrent && onSelectFloor(floor.id)}
                disabled={isCurrent}
                aria-label={isCurrent ? `${floor.label}, piso actual` : `Ir a ${floor.label}`}
              >
                <span className="building-elevator-button-bezel" aria-hidden="true">
                  <span>{floor.shortLabel}</span>
                </span>
                <span className="building-elevator-button-copy">
                  <strong>{floor.label}</strong>
                  <small>{floor.description}</small>
                </span>
                <span className="building-elevator-button-status">{isCurrent ? 'ACTUAL' : 'PRESIONAR'}</span>
              </button>
            );
          })}
        </div>

        <footer>
          <span>Presiona el boton del piso</span>
          <span><kbd>Enter</kbd> confirmar</span>
          <span><kbd>Esc</kbd> cerrar</span>
        </footer>
      </section>
    </div>
  );
}
