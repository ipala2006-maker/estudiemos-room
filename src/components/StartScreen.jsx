import { ArrowRight, Play } from 'lucide-react';
import { BUILD_LABEL, BUILD_MARKER } from '../data/buildInfo.js';
import '../styles/start-screen-ai.css';

export function StartScreen({ onEnter }) {
  return (
    <main className="start-screen start-screen-immersive">
      <span className="build-version-pill" data-build-marker={BUILD_MARKER}>{BUILD_LABEL}</span>
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
