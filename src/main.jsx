import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ComputerUI } from './components/ComputerUI.jsx';
import { Hud } from './components/Hud.jsx';
import { StartScreen } from './components/StartScreen.jsx';
import './styles/app.css';

const FirstPersonWorld = lazy(() =>
  import('./components/FirstPersonWorld.jsx').then((module) => ({
    default: module.FirstPersonWorld
  }))
);

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [computerOpen, setComputerOpen] = useState(false);
  const [isNearDoor, setIsNearDoor] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [isNearComputer, setIsNearComputer] = useState(false);
  const [screenPlatformId, setScreenPlatformId] = useState('youtube');
  const resetWorldRef = useRef(() => {});
  const toggleDoorRef = useRef(() => {});
  const interactionLockedUntilRef = useRef(0);

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (event.repeat && (key === 'e' || key === 'escape')) return;

      if (computerOpen && key === 'escape') {
        setComputerOpen(false);
        return;
      }

      if (!hasStarted || computerOpen) return;
      if (key === 'e' && performance.now() < interactionLockedUntilRef.current) return;

      if (isNearDoor && key === 'e') {
        interactionLockedUntilRef.current = performance.now() + 600;
        toggleDoorRef.current();
        return;
      }

      if (isNearComputer && key === 'e') {
        interactionLockedUntilRef.current = performance.now() + 350;
        document.exitPointerLock?.();
        setComputerOpen(true);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [computerOpen, hasStarted, isNearComputer, isNearDoor]);

  function backToStart() {
    setComputerOpen(false);
    setHasStarted(false);
    setIsNearComputer(false);
    setIsNearDoor(false);
    setIsDoorOpen(false);
    interactionLockedUntilRef.current = 0;
  }

  if (!hasStarted) {
    return <StartScreen onEnter={() => setHasStarted(true)} />;
  }

  return (
    <main className="game-shell">
      <Suspense fallback={<div className="world-loading">Preparando Casa 1...</div>}>
        <FirstPersonWorld
          onDoorOpenChange={setIsDoorOpen}
          onNearComputerChange={setIsNearComputer}
          onNearDoorChange={setIsNearDoor}
          toggleDoorRef={toggleDoorRef}
          resetRef={resetWorldRef}
          controlsEnabled={!computerOpen}
          screenPlatformId={screenPlatformId}
        />
      </Suspense>

      <Hud
        isDoorOpen={isDoorOpen}
        isNearComputer={isNearComputer}
        isNearDoor={isNearDoor}
        onBackHome={backToStart}
        onReset={() => resetWorldRef.current()}
      />

      {isNearDoor && (
        <div className="interaction-prompt" role="status" aria-live="polite">
          Presiona E para {isDoorOpen ? 'salir al barrio' : 'entrar a Casa 1'}
        </div>
      )}

      {isNearComputer && (
        <div className="interaction-prompt" role="status" aria-live="polite">
          Presiona E para usar la computadora
        </div>
      )}

      {computerOpen && (
        <ComputerUI
          selectedPlatformId={screenPlatformId}
          onPlatformSelect={setScreenPlatformId}
          onClose={() => setComputerOpen(false)}
        />
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
