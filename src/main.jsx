import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FirstPersonWorld } from './components/FirstPersonWorld.jsx';
import { Hud } from './components/Hud.jsx';
import { StartScreen } from './components/StartScreen.jsx';
import { StudyOverlay } from './components/StudyOverlay.jsx';
import { studySubjects } from './data/mockStudyContent.js';
import './styles/app.css';

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [isNearDoor, setIsNearDoor] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [isNearComputer, setIsNearComputer] = useState(false);
  const [subjectId, setSubjectId] = useState(studySubjects[0].id);
  const [videoId, setVideoId] = useState(studySubjects[0].videos[0].id);
  const resetWorldRef = useRef(() => {});
  const toggleDoorRef = useRef(() => {});

  const subject = useMemo(
    () => studySubjects.find((item) => item.id === subjectId) ?? studySubjects[0],
    [subjectId]
  );
  const video = useMemo(
    () => subject.videos.find((item) => item.id === videoId) ?? subject.videos[0],
    [subject, videoId]
  );

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (studyOpen && key === 'escape') {
        setStudyOpen(false);
        return;
      }

      if (!hasStarted || studyOpen) return;

      if (isNearDoor && key === 'e') {
        toggleDoorRef.current();
        return;
      }

      if (isNearComputer && key === 'e') {
        document.exitPointerLock?.();
        setStudyOpen(true);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasStarted, isNearComputer, isNearDoor, studyOpen]);

  function changeSubject(nextSubjectId) {
    const nextSubject = studySubjects.find((item) => item.id === nextSubjectId) ?? studySubjects[0];
    setSubjectId(nextSubject.id);
    setVideoId(nextSubject.videos[0].id);
  }

  function backToStart() {
    setStudyOpen(false);
    setHasStarted(false);
    setIsNearComputer(false);
    setIsNearDoor(false);
    setIsDoorOpen(false);
  }

  if (!hasStarted) {
    return <StartScreen onEnter={() => setHasStarted(true)} />;
  }

  return (
    <main className="game-shell">
      <FirstPersonWorld
        onDoorOpenChange={setIsDoorOpen}
        onNearComputerChange={setIsNearComputer}
        onNearDoorChange={setIsNearDoor}
        toggleDoorRef={toggleDoorRef}
        resetRef={resetWorldRef}
      />

      <Hud
        isDoorOpen={isDoorOpen}
        isNearComputer={isNearComputer}
        isNearDoor={isNearDoor}
        onBackHome={backToStart}
        onReset={() => resetWorldRef.current()}
      />

      {isNearDoor && (
        <div className="interaction-prompt">Presiona E para {isDoorOpen ? 'cerrar' : 'abrir'} la puerta</div>
      )}

      {isNearComputer && <div className="interaction-prompt">Presiona E para usar la computadora</div>}

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

createRoot(document.getElementById('root')).render(<App />);
