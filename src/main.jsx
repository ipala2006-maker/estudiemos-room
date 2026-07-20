import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FirstPersonWorld } from './components/FirstPersonWorld.jsx';
import { Hud } from './components/Hud.jsx';
import { RoomSpeakerPlayer, dispatchRoomSpeakerCommand } from './components/RoomSpeakerPlayer.jsx';
import { ScreenRemoteControl } from './components/ScreenRemoteControl.jsx';
import { SpeakerRemoteControl } from './components/SpeakerRemoteControl.jsx';
import { StartScreen } from './components/StartScreen.jsx';
import { VirtualComputerShell } from './components/VirtualComputerShell.jsx';
import { WallAgendaEditor } from './components/WallAgendaEditor.jsx';
import { useFocusEconomy } from './hooks/useFocusEconomy.js';
import { loadStoredAgendaItems, normalizeAgendaItems, saveAgendaItems, serializeAgendaItems, subscribeToAgendaItems } from './utils/agendaSync.js';
import './styles/app.css';
import './styles/computer-os.css';
import './styles/fullscreen-layout.css';
import './styles/computer-os-corrections.css';
import './styles/camera-controls.css';
import './styles/computer-keyboard-controls.css';
import './styles/computer-keyboard-scroll.css';
import './styles/hud-xp-bar.css';
import './utils/installComputerKeyboardController.js';
import { installInteractionTargeting } from './utils/installInteractionTargeting.js';
import './utils/installRoomSpeakerWorld.js';

installInteractionTargeting();

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

const SPOTIFY_STORAGE_KEY = 'estudiemos-room-spotify-content';
const SPOTIFY_ROOM_CONTENT_EVENT = 'estudiemos:spotify-room-content';
const SPEAKER_AIM_EVENT = 'estudiemos:room-speaker-aim';
const INTERACTION_TARGET_EVENT = 'estudiemos:interaction-target';
const INTERACTION_TARGETS = new Set(['computer', 'agenda', 'screen', 'speaker']);

function normalizeSpotifyContent(savedContent) {
  if (!savedContent || typeof savedContent !== 'object') return null;

  const uri = String(savedContent.uri ?? '').trim();
  const embedUrl = String(savedContent.embedUrl ?? '').trim();
  if (!uri || !embedUrl) return null;

  return {
    ...savedContent,
    uri,
    embedUrl,
    title: String(savedContent.title ?? 'Spotify').slice(0, 80),
    label: String(savedContent.label ?? 'Spotify').slice(0, 40)
  };
}

function loadStoredSpotifyContent() {
  if (typeof window === 'undefined') return null;

  try {
    const savedContent = JSON.parse(window.localStorage.getItem(SPOTIFY_STORAGE_KEY) ?? 'null');
    return normalizeSpotifyContent(savedContent);
  } catch {
    return null;
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
  const [speakerRemoteOpen, setSpeakerRemoteOpen] = useState(false);
  const [wallAgendaOpen, setWallAgendaOpen] = useState(false);
  const [isNearDoor, setIsNearDoor] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [isNearComputer, setIsNearComputer] = useState(false);
  const [isAimingAgendaBoard, setIsAimingAgendaBoard] = useState(false);
  const [isAimingScreen, setIsAimingScreen] = useState(false);
  const [isAimingSpeaker, setIsAimingSpeaker] = useState(false);
  const [aimedInteractionTarget, setAimedInteractionTarget] = useState(undefined);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [screenLayout, setScreenLayout] = useState('side-by-side');
  const [agendaItems, setAgendaItemsState] = useState(loadStoredAgendaItems);
  const [roomSpotifyContent, setRoomSpotifyContent] = useState(loadStoredSpotifyContent);
  const [speakerCommand, setSpeakerCommand] = useState(null);
  const [speakerState, setSpeakerState] = useState({
    apiState: 'idle',
    paused: true,
    note: 'Parlante sin musica cargada'
  });
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
  const hasInteractionTargetSignal = aimedInteractionTarget !== undefined;
  const canTargetComputer = hasInteractionTargetSignal ? aimedInteractionTarget === 'computer' : isNearComputer;
  const canTargetAgenda = hasInteractionTargetSignal ? aimedInteractionTarget === 'agenda' || isAimingAgendaBoard : isAimingAgendaBoard;
  const canTargetScreen = hasInteractionTargetSignal ? aimedInteractionTarget === 'screen' : isAimingScreen;
  const canTargetSpeaker = hasInteractionTargetSignal ? aimedInteractionTarget === 'speaker' : isAimingSpeaker;
  const resetWorldRef = useRef(() => {});
  const toggleDoorRef = useRef(() => {});
  const screenCommandCounterRef = useRef(0);
  const speakerCommandCounterRef = useRef(0);
  const agendaStorageSnapshotRef = useRef('');
  const spotifyStorageSnapshotRef = useRef('');

  function setAgendaItems(nextAgendaItems) {
    setAgendaItemsState((currentItems) => {
      const resolvedItems = typeof nextAgendaItems === 'function' ? nextAgendaItems(currentItems) : nextAgendaItems;
      return normalizeAgendaItems(resolvedItems);
    });
  }

  useEffect(() => {
    const serializedItems = serializeAgendaItems(agendaItems);
    if (serializedItems === agendaStorageSnapshotRef.current) return;

    agendaStorageSnapshotRef.current = serializedItems;
    saveAgendaItems(agendaItems);
  }, [agendaItems]);

  useEffect(
    () =>
      subscribeToAgendaItems((nextAgendaItems) => {
        const serializedItems = serializeAgendaItems(nextAgendaItems);
        if (serializedItems === agendaStorageSnapshotRef.current) return;

        agendaStorageSnapshotRef.current = serializedItems;
        setAgendaItemsState(normalizeAgendaItems(nextAgendaItems));
      }),
    []
  );

  useEffect(() => {
    const serializedContent = roomSpotifyContent ? JSON.stringify(roomSpotifyContent) : '';
    spotifyStorageSnapshotRef.current = serializedContent;

    if (roomSpotifyContent) {
      window.localStorage.setItem(SPOTIFY_STORAGE_KEY, serializedContent);
      return;
    }

    window.localStorage.removeItem(SPOTIFY_STORAGE_KEY);
  }, [roomSpotifyContent]);

  useEffect(() => {
    function syncSpotifyFromStorage() {
      const rawContent = window.localStorage.getItem(SPOTIFY_STORAGE_KEY) ?? '';
      if (rawContent === spotifyStorageSnapshotRef.current) return;

      spotifyStorageSnapshotRef.current = rawContent;
      setRoomSpotifyContent(loadStoredSpotifyContent());
    }

    syncSpotifyFromStorage();
    const timer = window.setInterval(syncSpotifyFromStorage, 850);
    window.addEventListener('focus', syncSpotifyFromStorage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', syncSpotifyFromStorage);
    };
  }, []);

  useEffect(() => {
    function onPointerLockChange() {
      setIsPointerLocked(Boolean(document.pointerLockElement));
    }

    document.addEventListener('pointerlockchange', onPointerLockChange);
    return () => document.removeEventListener('pointerlockchange', onPointerLockChange);
  }, []);

  useEffect(() => {
    function onSpeakerAimChange(event) {
      setIsAimingSpeaker(Boolean(event.detail?.isAiming));
    }

    window.addEventListener(SPEAKER_AIM_EVENT, onSpeakerAimChange);
    return () => window.removeEventListener(SPEAKER_AIM_EVENT, onSpeakerAimChange);
  }, []);

  useEffect(() => {
    function onInteractionTargetChange(event) {
      const nextTarget = String(event.detail?.target ?? '');
      setAimedInteractionTarget(INTERACTION_TARGETS.has(nextTarget) ? nextTarget : null);
    }

    window.addEventListener(INTERACTION_TARGET_EVENT, onInteractionTargetChange);
    return () => window.removeEventListener(INTERACTION_TARGET_EVENT, onInteractionTargetChange);
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (speakerRemoteOpen && key === 'escape') {
        setSpeakerRemoteOpen(false);
        return;
      }

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

      if (!hasStarted || computerOpen || screenRemoteOpen || speakerRemoteOpen || wallAgendaOpen) return;

      if (canTargetScreen && key === 'q') {
        document.exitPointerLock?.();
        setScreenRemoteOpen(true);
        return;
      }

      if (canTargetSpeaker && key === 'q') {
        document.exitPointerLock?.();
        setSpeakerRemoteOpen(true);
        return;
      }

      if (canTargetAgenda && key === 'e') {
        document.exitPointerLock?.();
        setWallAgendaOpen(true);
        return;
      }

      if (canTargetComputer && key === 'e') {
        document.exitPointerLock?.();
        setComputerOpen(true);
        return;
      }

      if (isNearDoor && key === 'e') {
        toggleDoorRef.current();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    computerOpen,
    canTargetAgenda,
    canTargetComputer,
    canTargetScreen,
    canTargetSpeaker,
    hasStarted,
    isNearDoor,
    screenRemoteOpen,
    speakerRemoteOpen,
    wallAgendaOpen
  ]);

  function backToStart() {
    setComputerOpen(false);
    setScreenRemoteOpen(false);
    setSpeakerRemoteOpen(false);
    setWallAgendaOpen(false);
    setIsAimingAgendaBoard(false);
    setIsAimingScreen(false);
    setIsAimingSpeaker(false);
    setAimedInteractionTarget(null);
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

  function commandRoomSpeaker(action, payload = {}) {
    speakerCommandCounterRef.current += 1;
    const command = {
      id: `${Date.now()}-${speakerCommandCounterRef.current}`,
      action,
      payload
    };

    dispatchRoomSpeakerCommand(command);
    setSpeakerCommand(command);
  }

  function loadSpotifyOnRoomSpeaker(content) {
    setRoomSpotifyContent(content);
    setSpeakerState((current) => ({
      ...current,
      paused: true,
      note: content ? 'Spotify cargado en el parlante de sala' : 'Parlante sin musica cargada'
    }));
  }

  function clearSpotifyFromRoomSpeaker() {
    setRoomSpotifyContent(null);
    setSpeakerState({
      apiState: 'idle',
      paused: true,
      note: 'Parlante sin musica cargada'
    });
  }

  useEffect(() => {
    function onSpotifyRoomContent(event) {
      if (event.detail?.action === 'clear') {
        clearSpotifyFromRoomSpeaker();
        return;
      }

      const nextContent = normalizeSpotifyContent(event.detail?.content);
      if (!nextContent) return;

      loadSpotifyOnRoomSpeaker(nextContent);
      if (event.detail?.command === 'play') {
        window.setTimeout(() => commandRoomSpeaker('play'), 480);
      }
    }

    window.addEventListener(SPOTIFY_ROOM_CONTENT_EVENT, onSpotifyRoomContent);
    return () => window.removeEventListener(SPOTIFY_ROOM_CONTENT_EVENT, onSpotifyRoomContent);
  }, []);

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

  const canShowWorldPrompts = hasStarted && !computerOpen && !screenRemoteOpen && !speakerRemoteOpen && !wallAgendaOpen;
  const activeInteractionPrompt = canShowWorldPrompts
    ? canTargetComputer
      ? { key: 'computer', control: 'E', title: 'Abrir computadora', label: 'E - abrir computadora' }
      : canTargetAgenda
        ? { key: 'agenda', control: 'E', title: 'Editar agenda de pared', label: 'E - editar agenda' }
        : canTargetScreen
          ? { key: 'screen', control: 'Q', title: 'Control de pantalla', className: 'screen-remote-prompt', label: 'Q - control de pantalla' }
          : canTargetSpeaker
            ? { key: 'speaker', control: 'Q', title: 'Control de parlante', className: 'screen-remote-prompt', label: 'Q - control de parlante' }
            : isNearDoor
              ? {
                  key: 'door',
                  control: 'E',
                  title: isDoorOpen ? 'Salir al barrio' : 'Entrar a Casa 1',
                  label: `E - ${isDoorOpen ? 'salir al barrio' : 'entrar a Casa 1'}`
                }
              : null
    : null;
  const interactionPrompts = activeInteractionPrompt ? [activeInteractionPrompt] : [];

  if (!hasStarted) {
    return <StartScreen onEnter={() => setHasStarted(true)} />;
  }

  return (
    <main
      className={`game-shell${computerOpen ? ' is-computer-open' : ''}${screenRemoteOpen ? ' is-screen-remote-open' : ''}${
        speakerRemoteOpen ? ' is-speaker-remote-open' : ''
      }`}
    >
      <FirstPersonWorld
        onDoorOpenChange={setIsDoorOpen}
        onNearComputerChange={setIsNearComputer}
        onNearDoorChange={setIsNearDoor}
        onAgendaBoardAimChange={setIsAimingAgendaBoard}
        onScreenAimChange={setIsAimingScreen}
        onSpeakerAimChange={setIsAimingSpeaker}
        toggleDoorRef={toggleDoorRef}
        resetRef={resetWorldRef}
        controlsEnabled={!computerOpen && !screenRemoteOpen && !speakerRemoteOpen && !wallAgendaOpen}
        screenContentEnabled={!computerOpen}
        screenZones={screenZones}
        screenLayout={screenLayout}
        agendaItems={agendaItems}
        focusProgress={focusEconomy.progress}
        initialInside
      />

      <Hud
        isDoorOpen={isDoorOpen}
        interactionHint={activeInteractionPrompt}
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

      <RoomSpeakerPlayer
        content={roomSpotifyContent}
        command={speakerCommand}
        onPlayerStateChange={(nextState) => setSpeakerState((current) => ({ ...current, ...nextState }))}
      />

      {!computerOpen && !screenRemoteOpen && !speakerRemoteOpen && !wallAgendaOpen && !isPointerLocked && (
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

      {speakerRemoteOpen && (
        <SpeakerRemoteControl
          content={roomSpotifyContent}
          speakerState={speakerState}
          onLoadSpotify={loadSpotifyOnRoomSpeaker}
          onClearSpotify={clearSpotifyFromRoomSpeaker}
          onSpeakerCommand={commandRoomSpeaker}
          onClose={() => setSpeakerRemoteOpen(false)}
        />
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
