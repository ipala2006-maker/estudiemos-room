import { ArrowRight, Keyboard, MousePointer2 } from 'lucide-react';

export function StartScreen({ onEnter }) {
  return (
    <main className="start-screen">
      <section className="start-content" aria-labelledby="start-title">
        <p className="start-kicker">Prototipo V0</p>
        <h1 id="start-title">Estudiemos Room</h1>
        <p className="start-lead">
          Entra a una sala virtual para estudiar con contenido principal y estimulo controlado.
        </p>
        <p className="start-description">
          Camina hasta una casita, entra al cuarto de estudio, usa la computadora y abri una pantalla
          simple con material mock para concentrarte.
        </p>

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
          <span>Presiona E para interactuar</span>
        </div>
      </section>
    </main>
  );
}
