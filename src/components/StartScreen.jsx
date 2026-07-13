import { ArrowRight, Home, Keyboard, MonitorUp, MousePointer2, Move3D } from 'lucide-react';
import { BUILD_LABEL, BUILD_MARKER } from '../data/buildInfo.js';

export function StartScreen({ onEnter }) {
  return (
    <main className="start-screen">
      <span className="build-version-pill" data-build-marker={BUILD_MARKER}>{BUILD_LABEL}</span>
      <section className="start-content" aria-labelledby="start-title">
        <p className="start-kicker">Modo foco</p>
        <h1 id="start-title">Estudiemos Room</h1>
        <p className="start-lead">
          Entra a Casa 1, prepara tu material y estudia en una sala tranquila hecha para concentrarte.
        </p>
        <p className="start-description">
          Todo lo importante queda cerca: computadora, pantalla, agenda y musica de fondo, sin ruido visual.
        </p>

        <div className="start-meta" aria-label="Caracteristicas principales">
          <span>
            <Home size={16} aria-hidden="true" />
            Casa 1
          </span>
          <span>
            <Move3D size={16} aria-hidden="true" />
            Primera persona
          </span>
          <span>
            <MonitorUp size={16} aria-hidden="true" />
            Pantalla y PC
          </span>
        </div>

        <button type="button" className="primary-action" onClick={onEnter}>
          Comenzar
          <ArrowRight size={20} aria-hidden="true" />
        </button>

        <div className="start-controls" aria-label="Controles basicos">
          <span>
            <MousePointer2 size={17} aria-hidden="true" />
            Click toma camara
          </span>
          <span>
            <Keyboard size={17} aria-hidden="true" />
            WASD o flechas
          </span>
          <span>
            <MousePointer2 size={17} aria-hidden="true" />
            Mouse para mirar
          </span>
          <span>E para interactuar</span>
        </div>
      </section>
    </main>
  );
}
