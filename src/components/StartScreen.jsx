import { ArrowRight, Keyboard, MousePointer2, Move3D, ShieldCheck } from 'lucide-react';

export function StartScreen({ onEnter }) {
  return (
    <main className="start-screen">
      <section className="start-content" aria-labelledby="start-title">
        <p className="start-kicker">Estudiemos Room</p>
        <h1 id="start-title">Campus de estudio virtual</h1>
        <p className="start-lead">
          Un entorno 3D tranquilo para entrar a una casa de estudio, abrir tu estacion y concentrarte
          con contenido guiado.
        </p>
        <p className="start-description">
          Explora un barrio suburbano, entra a Casa 1 y usa la computadora para preparar sesiones de
          estudio con fuentes controladas y una interfaz pensada para no distraer.
        </p>

        <div className="start-meta" aria-label="Caracteristicas principales">
          <span>
            <Move3D size={16} aria-hidden="true" />
            Entorno 3D
          </span>
          <span>
            <ShieldCheck size={16} aria-hidden="true" />
            Fuentes controladas
          </span>
          <span>Modo foco</span>
        </div>

        <button type="button" className="primary-action" onClick={onEnter}>
          Entrar al Room
          <ArrowRight size={20} aria-hidden="true" />
        </button>

        <div className="start-controls" aria-label="Controles basicos">
          <span>
            <Keyboard size={17} aria-hidden="true" />
            WASD o flechas
          </span>
          <span>
            <MousePointer2 size={17} aria-hidden="true" />
            Mouse para mirar
          </span>
          <span>Espacio para saltar</span>
          <span>E para interactuar</span>
        </div>
      </section>
    </main>
  );
}
