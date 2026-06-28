import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DoorOpen, Monitor, RotateCcw, X } from 'lucide-react';
import { studySubjects } from './data/mockStudyContent.js';
import './styles/app.css';

const lobbyStart = { x: 18, y: 72 };
const roomStart = { x: 24, y: 66 };

function App() {
  const [place, setPlace] = useState('lobby');
  const [studyOpen, setStudyOpen] = useState(false);
  const [player, setPlayer] = useState(lobbyStart);
  const [subjectId, setSubjectId] = useState(studySubjects[0].id);
  const [videoId, setVideoId] = useState(studySubjects[0].videos[0].id);

  const subject = useMemo(
    () => studySubjects.find((item) => item.id === subjectId) ?? studySubjects[0],
    [subjectId]
  );
  const video = useMemo(
    () => subject.videos.find((item) => item.id === videoId) ?? subject.videos[0],
    [subject, videoId]
  );

  const nearHouse = place === 'lobby' && distance(player, { x: 72, y: 42 }) < 15;
  const nearComputer = place === 'room' && distance(player, { x: 67, y: 40 }) < 14;

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toLowerCase();

      if (studyOpen) {
        if (key === 'escape') setStudyOpen(false);
        return;
      }

      if ((key === 'e' || key === 'enter') && nearHouse) {
        setPlace('room');
        setPlayer(roomStart);
        return;
      }

      if ((key === 'e' || key === 'enter') && nearComputer) {
        setStudyOpen(true);
        return;
      }

      if (key === 'r') {
        setPlayer(place === 'lobby' ? lobbyStart : roomStart);
        return;
      }

      const step = place === 'lobby' ? 3 : 3.5;
      const next = { ...player };
      if (key === 'w' || key === 'arrowup') next.y -= step;
      if (key === 's' || key === 'arrowdown') next.y += step;
      if (key === 'a' || key === 'arrowleft') next.x -= step;
      if (key === 'd' || key === 'arrowright') next.x += step;

      if (next.x !== player.x || next.y !== player.y) {
        event.preventDefault();
        setPlayer({
          x: clamp(next.x, place === 'lobby' ? 5 : 8, place === 'lobby' ? 95 : 92),
          y: clamp(next.y, place === 'lobby' ? 16 : 18, place === 'lobby' ? 88 : 82)
        });
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nearComputer, nearHouse, place, player, studyOpen]);

  function changeSubject(nextSubjectId) {
    const nextSubject = studySubjects.find((item) => item.id === nextSubjectId) ?? studySubjects[0];
    setSubjectId(nextSubject.id);
    setVideoId(nextSubject.videos[0].id);
  }

  return (
    <main className="game-shell">
      {place === 'lobby' ? (
        <Lobby player={player} nearHouse={nearHouse} onEnter={() => goRoom(setPlace, setPlayer)} />
      ) : (
        <Room
          player={player}
          nearComputer={nearComputer}
          onOpenStudy={() => setStudyOpen(true)}
          onExit={() => {
            setPlace('lobby');
            setPlayer({ x: 70, y: 56 });
          }}
        />
      )}

      <Hud
        place={place}
        nearHouse={nearHouse}
        nearComputer={nearComputer}
        onReset={() => setPlayer(place === 'lobby' ? lobbyStart : roomStart)}
      />

      {studyOpen && (
        <StudyOverlay
          subject={subject}
          video={video}
          onSubjectChange={changeSubject}
          onVideoChange={setVideoId}
          onClose={() => setStudyOpen(false)}
        />
      )}
    </main>
  );
}

function Lobby({ player, nearHouse, onEnter }) {
  return (
    <section className="world lobby-world" aria-label="Lobby virtual">
      <div className="sky" />
      <div className="terrain">
        <div className="path" />
        <div className="tree tree-a" />
        <div className="tree tree-b" />
        <div className="tree tree-c" />
        <button className="house" type="button" onClick={onEnter} aria-label="Entrar a la casita">
          <span className="house-roof" />
          <span className="house-face">
            <span className="house-window" />
            <span className="house-door" />
          </span>
        </button>
        <Player position={player} />
      </div>

      {nearHouse && (
        <button className="interaction-prompt" type="button" onClick={onEnter}>
          <DoorOpen size={18} aria-hidden="true" />
          Entrar a la casita
        </button>
      )}
    </section>
  );
}

function Room({ player, nearComputer, onOpenStudy, onExit }) {
  return (
    <section className="world room-world" aria-label="Interior de la casita">
      <div className="room-floor">
        <button className="exit-door" type="button" onClick={onExit} aria-label="Salir al lobby">
          <DoorOpen size={28} aria-hidden="true" />
          Salir
        </button>
        <div className="rug" />
        <div className="bookshelf">
          <span />
          <span />
          <span />
        </div>
        <div className="desk-setup">
          <button className="desk-computer" type="button" onClick={onOpenStudy} aria-label="Abrir pantalla de estudio">
            <Monitor size={46} aria-hidden="true" />
            <span>Study</span>
          </button>
          <div className="desk-table" />
          <div className="stool" />
        </div>
        <Player position={player} />
      </div>

      {nearComputer && (
        <button className="interaction-prompt" type="button" onClick={onOpenStudy}>
          <Monitor size={18} aria-hidden="true" />
          Abrir computadora
        </button>
      )}
    </section>
  );
}

function Player({ position }) {
  return (
    <div
      className="player"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      aria-label="Posicion del usuario"
    />
  );
}

function Hud({ place, nearHouse, nearComputer, onReset }) {
  return (
    <aside className="hud">
      <div>
        <strong>{place === 'lobby' ? 'Lobby' : 'Casita'}</strong>
        <span>WASD o flechas para moverte</span>
      </div>
      <div>
        <span>R para reiniciar posicion</span>
        <span>E / Enter para interactuar al acercarte</span>
      </div>
      <button type="button" onClick={onReset}>
        <RotateCcw size={16} aria-hidden="true" />
        Reiniciar
      </button>
      {(nearHouse || nearComputer) && <p className="hud-ready">Puedes interactuar ahora.</p>}
    </aside>
  );
}

function StudyOverlay({ subject, video, onSubjectChange, onVideoChange, onClose }) {
  return (
    <section className="study-overlay" aria-label="Pantalla de estudio">
      <div className="study-window">
        <header className="study-header">
          <div>
            <span>Estudiemos Room</span>
            <h1>Pantalla de estudio</h1>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar pantalla de estudio">
            <X size={22} aria-hidden="true" />
          </button>
        </header>

        <div className="study-grid">
          <section className="study-primary">
            <div className="selectors">
              <label>
                Materia
                <select value={subject.id} onChange={(event) => onSubjectChange(event.target.value)}>
                  {studySubjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Video mock
                <select value={video.id} onChange={(event) => onVideoChange(event.target.value)}>
                  {subject.videos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="video-stage">
              <Monitor size={68} aria-hidden="true" />
              <h2>{video.title}</h2>
              <p>{video.duration} - Placeholder de video controlado</p>
            </div>

            <article className="lesson-card">
              <h3>{video.lessonTitle}</h3>
              <p>{video.description}</p>
            </article>
          </section>

          <aside className="study-secondary">
            <div className="calm-animation">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <h2>Estimulo tranquilo</h2>
            <p>{subject.ambientText}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}

function goRoom(setPlace, setPlayer) {
  setPlace('room');
  setPlayer(roomStart);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

createRoot(document.getElementById('root')).render(<App />);
