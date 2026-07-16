import { ArrowRight } from 'lucide-react';
import { BUILD_LABEL, BUILD_MARKER } from '../data/buildInfo.js';

export function StartScreen({ onEnter }) {
  return (
    <main className="start-screen">
      <span className="build-version-pill" data-build-marker={BUILD_MARKER}>{BUILD_LABEL}</span>
      <section className="start-content start-content-minimal" aria-labelledby="start-title">
        <h1 id="start-title">Estudiemos Room</h1>
        <p className="start-lead">Entrá a Casa 1 y usá la computadora, la pantalla y la música de fondo para estudiar con calma.</p>
        <button type="button" className="primary-action" onClick={onEnter} aria-label="Entrar a Estudiemos Room">
          Entrar
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      </section>
    </main>
  );
}
