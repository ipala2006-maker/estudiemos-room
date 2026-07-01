import { Monitor, X } from 'lucide-react';
import { useState } from 'react';
import { studySubjects } from '../data/mockStudyContent.js';

const ambienceModes = {
  rain: {
    label: 'Lluvia',
    title: 'Lluvia suave',
    text: 'Lineas lentas y repetitivas para acompanar el foco sin contenido externo.'
  },
  cafe: {
    label: 'Cafeteria',
    title: 'Cafeteria tranquila',
    text: 'Bloques de luz calida con movimiento bajo para simular ambiente.'
  },
  night: {
    label: 'Noche',
    title: 'Noche calma',
    text: 'Fondo oscuro y puntos suaves para una sensacion de estudio nocturno.'
  },
  silence: {
    label: 'Silencio',
    title: 'Silencio visual',
    text: 'Estimulo minimo para dejar el protagonismo al contenido principal.'
  }
};

export function StudyOverlay({ subject, video, onClose, onSubjectChange, onVideoChange }) {
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

        <StudyRoomContent
          subject={subject}
          video={video}
          onSubjectChange={onSubjectChange}
          onVideoChange={onVideoChange}
        />
      </div>
    </section>
  );
}

export function StudyRoomContent({ subject, video, onSubjectChange, onVideoChange, className = '', actions = null }) {
  const [ambience, setAmbience] = useState('rain');
  const ambienceInfo = ambienceModes[ambience];

  return (
    <div className={`study-grid ${className}`}>
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
            Clase mock
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
          <Monitor size={70} aria-hidden="true" />
          <h2>{video.title}</h2>
          <p>{video.duration} - Placeholder de video controlado</p>
        </div>

        <article className="lesson-card">
          <h3>{video.lessonTitle}</h3>
          <p>{video.description}</p>
        </article>

        {actions}
      </section>

      <aside className="study-secondary">
        <div className={`calm-animation calm-${ambience}`} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <div>
          <h2>{ambienceInfo.title}</h2>
          <p>{ambienceInfo.text}</p>
        </div>

        <div className="ambient-options" aria-label="Opciones de estimulo">
          {Object.entries(ambienceModes).map(([id, item]) => (
            <button
              key={id}
              type="button"
              className={ambience === id ? 'is-active' : ''}
              onClick={() => setAmbience(id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
