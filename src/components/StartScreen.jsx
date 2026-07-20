import { ArrowRight, Play } from 'lucide-react';
import { BUILD_LABEL, BUILD_MARKER } from '../data/buildInfo.js';

export function StartScreen({ onEnter }) {
  return (
    <main className="start-screen start-screen-immersive">
      <span className="build-version-pill" data-build-marker={BUILD_MARKER}>{BUILD_LABEL}</span>
      <div className="start-room-visual" aria-hidden="true">
        <span className="start-room-window" />
        <span className="start-room-screen" />
        <span className="start-room-desk" />
        <span className="start-room-lamp" />
        <span className="start-room-chair" />
      </div>
      <section className="start-content start-content-immersive" aria-labelledby="start-title">
        <h1 id="start-title">ESTUDIEMOS ROOM</h1>
        <p className="start-lead">Tu sala digital para estudiar con calma.</p>
        <button type="button" className="primary-action start-enter-button" onClick={onEnter} aria-label="Empezar a estudiar en Casa 1">
          <Play size={18} aria-hidden="true" fill="currentColor" />
          <span>EMPEZAR A ESTUDIAR</span>
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      </section>
    </main>
  );
}
