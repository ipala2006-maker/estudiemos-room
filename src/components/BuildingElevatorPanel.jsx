import { ArrowDown, ArrowUp, Building2, Check, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BUILDING_FLOORS } from '../maps/BuildingWorld.js';

export function BuildingElevatorPanel({ currentFloor, onSelectFloor, onClose }) {
  const availableFloors = useMemo(() => BUILDING_FLOORS.filter((floor) => floor.id !== currentFloor), [currentFloor]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedIndex((current) => (current - 1 + availableFloors.length) % availableFloors.length);
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedIndex((current) => (current + 1) % availableFloors.length);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const selectedFloor = availableFloors[selectedIndex];
        if (selectedFloor) onSelectFloor(selectedFloor.id);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [availableFloors, onClose, onSelectFloor, selectedIndex]);

  return (
    <div className="building-elevator-overlay" role="presentation" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="building-elevator-panel" role="dialog" aria-modal="true" aria-label="Seleccionar piso del ascensor">
        <header>
          <span className="building-elevator-mark" aria-hidden="true"><Building2 size={20} /></span>
          <div>
            <small>EDIFICIO ESTUDIEMOS</small>
            <h2>Ascensor</h2>
          </div>
          <button type="button" className="building-elevator-close" onClick={onClose} aria-label="Cerrar ascensor" title="Cerrar">
            <X size={19} />
          </button>
        </header>

        <div className="building-elevator-current">
          <span>Estas en</span>
          <strong>{BUILDING_FLOORS.find((floor) => floor.id === currentFloor)?.label ?? 'Lobby'}</strong>
        </div>

        <div className="building-elevator-floor-list" role="listbox" aria-label="Pisos disponibles">
          {availableFloors.map((floor, index) => (
            <button
              type="button"
              key={floor.id}
              className={index === selectedIndex ? 'is-selected' : ''}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => onSelectFloor(floor.id)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <span className="building-elevator-floor-number">{floor.shortLabel}</span>
              <span>
                <strong>{floor.label}</strong>
                <small>{floor.description}</small>
              </span>
              <Check size={18} aria-hidden="true" />
            </button>
          ))}
        </div>

        <footer>
          <span><ArrowUp size={14} /><ArrowDown size={14} /> elegir</span>
          <span><kbd>Enter</kbd> confirmar</span>
          <span><kbd>Backspace</kbd> volver</span>
        </footer>
      </section>
    </div>
  );
}
