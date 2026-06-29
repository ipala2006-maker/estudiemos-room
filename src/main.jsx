import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ComputerUI } from './components/ComputerUI.jsx';
import { FirstPersonWorld } from './components/FirstPersonWorld.jsx';
import { Hud } from './components/Hud.jsx';
import { StartScreen } from './components/StartScreen.jsx';
import './styles/app.css';

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [computerOpen, setComputerOpen] = useState(false);
  const [isNearDoor, setIsNearDoor] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [isNearComputer, setIsNearComputer] = useState(false);
  const [screenPlatformId, setScreenPlatformId] = useState('youtube');
  const resetWorldRef = useRef(() => {});
  const toggleDoorRef = useRef(() => {});

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (computerOpen && key === 'escape') {
        setComputerOpen(false);
        return;
      }

      if (!hasStarted || computerOpen) return;

      if (isNearDoor && key === 'e') {
        toggleDoorRef.current();
        return;
      }

      if (isNearComputer && key === 'e') {
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
        controlsEnabled={!computerOpen}
        screenPlatformId={screenPlatformId}
      />

      <Hud
        isDoorOpen={isDoorOpen}
        isNearComputer={isNearComputer}
        isNearDoor={isNearDoor}
        onBackHome={backToStart}
        onReset={() => resetWorldRef.current()}
      />

      {isNearDoor && (
        <div className="interaction-prompt">
          Presiona E para {isDoorOpen ? 'salir al barrio' : 'entrar a Casa 1'}
        </div>
      )}

      {isNearComputer && <div className="interaction-prompt">Presiona E para usar la computadora</div>}

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
