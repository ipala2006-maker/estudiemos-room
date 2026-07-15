import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FirstPersonWorld } from './components/FirstPersonWorld.jsx';
import { Hud } from './components/Hud.jsx';
import { ScreenRemoteControl } from './components/ScreenRemoteControl.jsx';
import { StartScreen } from './components/StartScreen.jsx';
import { VirtualComputerShell } from './components/VirtualComputerShell.jsx';
import { WallAgendaEditor } from './components/WallAgendaEditor.jsx';
import { createStudyAgendaItems, getAgendaDateValue } from './data/studyAgenda.js';
import { useFocusEconomy } from './hooks/useFocusEconomy.js';
import './styles/app.css';
import './styles/computer-os.css';
import './styles/fullscreen-layout.css';
import './styles/computer-os-corrections.css';
import './styles/camera-controls.css';
import './styles/computer-keyboard-controls.css';
import './styles/computer-keyboard-scroll.css';
import './utils/installComputerKeyboardController.js';

function createEmptyScreenZone() {
  return {
    videoId: '',
    inputUrl: '',
    watchUrl: '',
    embedUrl: '',
    contentType: 'empty',
    resourceUrl: '',
    title: '',
    creator: '',
    muted: true,
    volume: 70,
    displayScale: 100,
    paused: false,
    seekSeconds: 0,
    lastPlaybackAt: 0,
    playerCommand: null,
    updatedAt: 0
  };
}

const AGENDA_STORAGE_KEY = 'estudiemos-room-agenda';

function createAgendaItemId(item, index) {
  const titleSlug = String(item?.title ?? 'bloque')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28);

  return `agenda-${String(item?.date ?? getAgendaDateValue())}-${String(item?.time ?? '00:00')}-${titleSlug || 'bloque'}-${index}`;
}

function normalizeAgendaDate(value) {
  const dateValue = String(value ?? '');
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : getAgendaDateValue();
}

function normalizeAgendaItems(items) {
  if (!Array.isArray(items)) return createStudyAgendaItems();

  return items
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => ({
      id: String(item?.id ?? '').trim() || createAgendaItemId(item, index),
      date: normalizeAgendaDate(item?.date),
      time: /^\d{2}:\d{2}$/.test(String(item?.time ?? '').slice(0, 5)) ? String(item?.time ?? '').slice(0, 5) : '',
      title: String(item?.title ?? '').trim().slice(0, 48),
      detail: String(item?.detail ?? '').trim().slice(0, 96),
      completed: Boolean(item?.completed)
    }));
}

function loadStoredAgendaItems() {
  if (typeof window === 'undefined') return createStudyAgendaItems();

  try {
    const rawAgenda = window.localStorage.getItem(AGENDA_STORAGE_KEY);
    return rawAgenda ? normalizeAgendaItems(JSON.parse(rawAgenda)) : createStudyAgendaItems();
  } catch {
    return createStudyAgendaItems();
  }
}

function getEstimatedPlaybackSeconds(zone) {
  const baseSeconds = Math.max(0, Number(zone?.seekSeconds ?? 0));
  const lastPlaybackAt = Number(zone?.lastPlaybackAt ?? 0);
  if (zone?.paused || !lastPlaybackAt) return baseSeconds;
  return baseSeconds + Math.max(0, (Date.now() - lastPlaybackAt) / 1000);
}

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [computerOpen, setComputerOpen] = useState(false);
  const [screenRemoteOpen, setScreenRemoteOpen] = useState(false);
  const [wallAgendaOpen, setWallAgendaOpen] = useState(false);
  const [isNearDoor, setIsNearDoor] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [isNearComputer, setIsNearComputer] = useState(false);
  const [isAimingAgendaBoard, setIsAimingAgendaBoard] = useState(false);
  const [isAimingScreen, setIsAimingScreen] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [screenLayout, setScreenLayout] = useState('side-by-side');
  const [agendaItems, setAgendaItems] = useState(loadStoredAgendaItems);
  const [screenZones, setScreenZones] = useState({
    upper: createEmptyScreenZone(),
    lower: createEmptyScreenZone()
  });
  const hasScreenContent = Object.values(screenZones).some((zone) => zone.contentType !== 'spotify' && Boolean(zone.videoId || zone.resourceUrl));
  const focusEconomy = useFocusEconomy({
    enabled: hasStarted,
    hasScreenContent,
    computerOpen
  });
  const resetWorldRef = useRef(() => {});
  const toggleDoorRef = useRef(() => {});
  const screenCommandCounterRef = useRef(0);

  useEffect(() => {
    window.localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(agendaItems));
  }, [agendaItems]);

  useEffect(() => {
    function onPointerLockChange() {
      setIsPointerLocked(Boolean(document.pointerLockElement));
    }

    document.addEventListener('pointerlockchange', onPointerLockChange);
    return () => document.removeEventListener('pointerlockchange', onPointerLockChange);
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (computerOpen && key === 'escape') {
        setComputerOpen(false);
        return;
      }

      if (screenRemoteOpen && key === 'escape') {
        setScreenRemoteOpen(false);
        return;
      }

      if (wallAgendaOpen && key === 'escape') {
        setWallAgendaOpen(false);
        return;
      }

      if (!hasStarted || computerOpen || screenRemoteOpen || wallAgendaOpen) return;

      if (isNearDoor && key === 'e') {
        toggleDoorRef.current();
        return;
      }

      if (isAimingScreen && key === 'q') {
        document.exitPointerLock?.();
        setScreenRemoteOpen(true);
        return;
      }

      if (isAimingAgendaBoard && key === 'e') {
        document.exitPointerLock?.();
        setWallAgendaOpen(true);
        return;
      }

      if (isNearComputer && key === 'e') {
        document.exitPointerLock?.();
        setComputerOpen(true);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [computerOpen, hasStarted, isAimingAgendaBoard, isAimingScreen, isNearComputer, isNearDoor, screenRemoteOpen, wallAgendaOpen]);

  function backToStart() {
    setComputerOpen(false);
    setScreenRemoteOpen(false);
    setWallAgendaOpen(false);
    setIsAimingAgendaBoard(false);
    setIsAimingScreen(false);
    setHasStarted(false);
    setIsNearComputer(false);
    setIsNearDoor(false);
    setIsDoorOpen(false);
  }

  function assignVideoToZone(zoneId, video) {
    const now = Date.now();
    setScreenZones((current) => ({
      ...current,
      [zoneId]: (() => {
        const nextZone = {
          ...current[zoneId],
          ...video,
          paused: false,
          seekSeconds: 0,
          lastPlaybackAt: now,
          playerCommand: null,
          updatedAt: now
        };

        if (nextZone.contentType === 'youtube' && nextZone.videoId) {
          nextZone.playerCommand = createScreenCommand('sync-audio', {
            muted: nextZone.muted,
            volume: nextZone.volume
          });
        }

        return nextZone;
      })()
    }));
  }

  function createScreenCommand(action, payload = {}) {
    screenCommandCounterRef.current += 1;
    return {
      id: `${Date.now()}-${screenCommandCounterRef.current}`,
      action,
      payload
    };
  }

  function updateScreenZone(zoneId, patch) {
    const hasRefreshStamp = Object.prototype.hasOwnProperty.call(patch, 'updatedAt');
    const { updatedAt, ...zonePatch } = patch;

    setScreenZones((current) => ({
      ...current,
      [zoneId]: (() => {
        const currentZone = current[zoneId];
        const nextZone = {
          ...currentZone,
          ...zonePatch,
          ...(hasRefreshStamp ? { updatedAt } : {})
        };

        if (
          nextZone.contentType === 'youtube' &&
          nextZone.videoId &&
          (Object.prototype.hasOwnProperty.call(zonePatch, 'muted') || Object.prototype.hasOwnProperty.call(zonePatch, 'volume'))
        ) {
          nextZone.playerCommand = createScreenCommand('sync-audio', {
            muted: nextZone.muted,
            volume: nextZone.volume
          });
        }

        return nextZone;
      })()
    }));
  }

  function commandScreenZone(zoneId, action, payload = {}) {
    setScreenZones((current) => {
      const currentZone = current[zoneId];
      if (!currentZone || currentZone.contentType !== 'youtube' || !currentZone.videoId) return current;

      const now = Date.now();
      const estimatedSeconds = getEstimatedPlaybackSeconds(currentZone);
      const nextZone = { ...currentZone };
      let commandAction = action;
      let commandPayload = { ...payload };

      if (action === 'play') {
        nextZone.paused = false;
        nextZone.seekSeconds = estimatedSeconds;
        nextZone.lastPlaybackAt = now;
      }

      if (action === 'pause') {
        nextZone.paused = true;
        nextZone.seekSeconds = estimatedSeconds;
        nextZone.lastPlaybackAt = now;
      }

      if (action === 'restart') {
        nextZone.paused = false;
        nextZone.seekSeconds = 0;
        nextZone.lastPlaybackAt = now;
      }

      if (action === 'seek-relative' || action === 'skip-ad') {
        const deltaSeconds = action === 'skip-ad' ? Number(payload.seconds ?? 45) : Number(payload.seconds ?? 0);
        const targetSeconds = Math.max(0, Math.round(estimatedSeconds + deltaSeconds));
        nextZone.paused = false;
        nextZone.seekSeconds = targetSeconds;
        nextZone.lastPlaybackAt = now;
        commandAction = 'seek';
        commandPayload = {
          seconds: targetSeconds,
          play: true
        };
      }

      nextZone.playerCommand = createScreenCommand(commandAction, commandPayload);

      return {
        ...current,
        [zoneId]: nextZone
      };
    });
  }

  function clearScreenZone(zoneId) {
    setScreenZones((current) => ({
      ...current,
      [zoneId]: {
        ...createEmptyScreenZone(),
        muted: current[zoneId].muted,
        volume: current[zoneId].volume,
        displayScale: current[zoneId].displayScale,
        updatedAt: Date.now()
      }
    }));
  }

  const canShowWorldPrompts = hasStarted && !computerOpen && !screenRemoteOpen && !wallAgendaOpen;
  const interactionPrompts = [
    canShowWorldPrompts && isNearDoor
      ? { key: 'door', label: `E - ${isDoorOpen ? 'salir al barrio' : 'entrar a Casa 1'}` }
      : null,
    canShowWorldPrompts && isNearComputer
      ? { key: 'computer', label: 'E - abrir computadora' }
      : null,
    canShowWorldPrompts && isAimingAgendaBoard
      ? { key: 'agenda', label: 'E - editar agenda de pared' }
      : null,
    canShowWorldPrompts && isAimingScreen
      ? { key: 'screen', className: 'screen-remote-prompt', label: 'Q - control de pantalla' }
      : null
  ].filter(Boolean);

  if (!hasStarted) {
    return <StartScreen onEnter={() => setHasStarted(true)} />;
  }

  return (
    <main className={`game-shell${computerOpen ? ' is-computer-open' : ''}${screenRemoteOpen ? ' is-screen-remote-open' : ''}`}>
      <FirstPersonWorld
        onDoorOpenChange={setIsDoorOpen}
        onNearComputerChange={setIsNearComputer}
        onNearDoorChange={setIsNearDoor}
        onAgendaBoardAimChange={setIsAimingAgendaBoard}
        onScreenAimChange={setIsAimingScreen}
        toggleDoorRef={toggleDoorRef}
        resetRef={resetWorldRef}
        controlsEnabled={!computerOpen && !screenRemoteOpen && !wallAgendaOpen}
        screenContentEnabled={!computerOpen}
        screenZones={screenZones}
        screenLayout={screenLayout}
        agendaItems={agendaItems}
        focusProgress={focusEconomy.progress}
      />

      <Hud
        isDoorOpen={isDoorOpen}
        isNearComputer={isNearComputer}
        isNearDoor={isNearDoor}
        focusEconomy={focusEconomy}
        onBackHome={backToStart}
        onReset={() => resetWorldRef.current()}
      />

      {focusEconomy.rewardToast && (
        <div className="focus-reward-toast" role="status">
          <strong>{focusEconomy.rewardToast.title}</strong>
          <span>{focusEconomy.rewardToast.detail}</span>
        </div>
      )}

      {interactionPrompts.length > 0 && (
        <div className="interaction-prompt-stack" aria-live="polite">
          {interactionPrompts.map((prompt) => (
            <div key={prompt.key} className={`interaction-prompt${prompt.className ? ` ${prompt.className}` : ''}`}>
              {prompt.label}
            </div>
          ))}
        </div>
      )}

      {!computerOpen && !screenRemoteOpen && !wallAgendaOpen && !isPointerLocked && (
        <div className="camera-lock-prompt">
          <strong>La camara sigue el mouse</strong>
          <span>Click activa giro continuo. Esc libera el mouse.</span>
        </div>
      )}

      {computerOpen && (
        <VirtualComputerShell
          screenZones={screenZones}
          screenLayout={screenLayout}
          onAssignVideo={assignVideoToZone}
          onUpdateZone={updateScreenZone}
          onClearZone={clearScreenZone}
          onScreenLayoutChange={setScreenLayout}
          onScreenCommand={commandScreenZone}
          agendaItems={agendaItems}
          onAgendaItemsChange={setAgendaItems}
          focusEconomy={focusEconomy}
          onClose={() => setComputerOpen(false)}
        />
      )}

      {wallAgendaOpen && (
        <WallAgendaEditor
          agendaItems={agendaItems}
          onAgendaItemsChange={setAgendaItems}
          onClose={() => setWallAgendaOpen(false)}
        />
      )}

      {screenRemoteOpen && (
        <ScreenRemoteControl
          screenZones={screenZones}
          screenLayout={screenLayout}
          onAssignVideo={assignVideoToZone}
          onUpdateZone={updateScreenZone}
          onClearZone={clearScreenZone}
          onScreenLayoutChange={setScreenLayout}
          onScreenCommand={commandScreenZone}
          onClose={() => setScreenRemoteOpen(false)}
        />
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
