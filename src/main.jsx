import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DoorOpen, Monitor, RotateCcw, X } from 'lucide-react';
import * as THREE from 'three';
import { studySubjects } from './data/mockStudyContent.js';
import './styles/app.css';

const startPosition = new THREE.Vector3(0, 1.7, 20);
const houseDoorPosition = new THREE.Vector3(0, 1.7, -15.8);

function App() {
  const [place, setPlace] = useState('lobby');
  const [studyOpen, setStudyOpen] = useState(false);
  const [isNearHouse, setIsNearHouse] = useState(false);
  const [subjectId, setSubjectId] = useState(studySubjects[0].id);
  const [videoId, setVideoId] = useState(studySubjects[0].videos[0].id);
  const resetLobbyRef = useRef(() => {});

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

      if (place === 'lobby' && isNearHouse && (key === 'e' || key === 'enter')) {
        enterHouse();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isNearHouse, place, studyOpen]);

  function changeSubject(nextSubjectId) {
    const nextSubject = studySubjects.find((item) => item.id === nextSubjectId) ?? studySubjects[0];
    setSubjectId(nextSubject.id);
    setVideoId(nextSubject.videos[0].id);
  }

  function enterHouse() {
    setIsNearHouse(false);
    setPlace('room');
  }

  return (
    <main className="game-shell">
      {place === 'lobby' ? (
        <FirstPersonLobby
          onNearHouseChange={setIsNearHouse}
          resetRef={resetLobbyRef}
        />
      ) : (
        <SimpleRoom onExit={() => setPlace('lobby')} onOpenStudy={() => setStudyOpen(true)} />
      )}

      <Hud
        place={place}
        isNearHouse={isNearHouse}
        onReset={() => {
          if (place === 'lobby') resetLobbyRef.current();
        }}
      />

      {place === 'lobby' && isNearHouse && (
        <button className="interaction-prompt" type="button" onClick={enterHouse}>
          <DoorOpen size={18} aria-hidden="true" />
          Entrar a la casa
        </button>
      )}

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

function FirstPersonLobby({ onNearHouseChange, resetRef }) {
  const mountRef = useRef(null);
  const nearRef = useRef(false);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8ed2f0);
    scene.fog = new THREE.Fog(0x8ed2f0, 30, 72);

    const camera = new THREE.PerspectiveCamera(74, mount.clientWidth / mount.clientHeight, 0.1, 120);
    camera.position.copy(startPosition);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x4d6b45, 2.2);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.8);
    sun.position.set(12, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    buildLobbyScene(scene);

    const keys = new Set();
    let yaw = 0;
    let pitch = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    function resetCamera() {
      camera.position.copy(startPosition);
      yaw = 0;
      pitch = 0;
      camera.rotation.set(pitch, yaw, 0);
      nearRef.current = false;
      onNearHouseChange(false);
    }

    resetRef.current = resetCamera;

    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        keys.add(key);
        moveCameraForKey(key, 0.55);
        event.preventDefault();
      }
      if (key === 'r') resetCamera();
    }

    function onKeyUp(event) {
      keys.delete(event.key.toLowerCase());
    }

    function onPointerDown(event) {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      mount.setPointerCapture?.(event.pointerId);
    }

    function onPointerMove(event) {
      if (!dragging) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      yaw -= dx * 0.004;
      pitch = clamp(pitch - dy * 0.003, -0.72, 0.52);
      camera.rotation.set(pitch, yaw, 0);
    }

    function onPointerUp(event) {
      dragging = false;
      mount.releasePointerCapture?.(event.pointerId);
    }

    function onResize() {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }

    function moveCameraForKey(key, step) {
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw) * -1);
      const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const move = new THREE.Vector3();

      if (key === 'w' || key === 'arrowup') move.add(forward);
      if (key === 's' || key === 'arrowdown') move.sub(forward);
      if (key === 'd' || key === 'arrowright') move.add(right);
      if (key === 'a' || key === 'arrowleft') move.sub(right);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(step);
        camera.position.add(move);
        camera.position.x = clamp(camera.position.x, -27.5, 27.5);
        camera.position.z = clamp(camera.position.z, -27.5, 27.5);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    mount.addEventListener('pointerdown', onPointerDown);
    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerup', onPointerUp);
    mount.addEventListener('pointerleave', onPointerUp);

    const clock = new THREE.Clock();
    let frameId = 0;

    function animate() {
      const delta = Math.min(clock.getDelta(), 0.04);
      const speed = 8.5 * delta;
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw) * -1);
      const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const move = new THREE.Vector3();

      if (keys.has('w') || keys.has('arrowup')) move.add(forward);
      if (keys.has('s') || keys.has('arrowdown')) move.sub(forward);
      if (keys.has('d') || keys.has('arrowright')) move.add(right);
      if (keys.has('a') || keys.has('arrowleft')) move.sub(right);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(speed);
        camera.position.add(move);
        camera.position.x = clamp(camera.position.x, -27.5, 27.5);
        camera.position.z = clamp(camera.position.z, -27.5, 27.5);
      }

      const nearHouse = camera.position.distanceTo(houseDoorPosition) < 5;
      if (nearHouse !== nearRef.current) {
        nearRef.current = nearHouse;
        onNearHouseChange(nearHouse);
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      mount.removeEventListener('pointerdown', onPointerDown);
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerup', onPointerUp);
      mount.removeEventListener('pointerleave', onPointerUp);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [onNearHouseChange, resetRef]);

  return <section className="three-world" ref={mountRef} aria-label="Lobby 3D en primera persona" />;
}

function buildLobbyScene(scene) {
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x57a957, roughness: 0.95 });
  const pathMaterial = new THREE.MeshStandardMaterial({ color: 0xc9ad72, roughness: 1 });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xb8d4dd, roughness: 0.8 });
  const houseWall = new THREE.MeshStandardMaterial({ color: 0xe6c894, roughness: 0.9 });
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xb64d43, roughness: 0.8 });
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x6f4a35, roughness: 0.85 });

  const ground = new THREE.Mesh(new THREE.BoxGeometry(60, 0.6, 60), groundMaterial);
  ground.position.y = -0.3;
  ground.receiveShadow = true;
  scene.add(ground);

  const path = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.08, 35), pathMaterial);
  path.position.set(0, 0.04, 2.5);
  path.receiveShadow = true;
  scene.add(path);

  const wallSpecs = [
    { position: [0, 3, -30], size: [60, 6, 1] },
    { position: [0, 3, 30], size: [60, 6, 1] },
    { position: [-30, 3, 0], size: [1, 6, 60] },
    { position: [30, 3, 0], size: [1, 6, 60] }
  ];

  wallSpecs.forEach((spec) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(...spec.size), wallMaterial);
    wall.position.set(...spec.position);
    wall.receiveShadow = true;
    wall.castShadow = true;
    scene.add(wall);
  });

  const houseGroup = new THREE.Group();
  houseGroup.position.set(0, 0, -20);

  const body = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 9), houseWall);
  body.position.y = 3.5;
  body.castShadow = true;
  body.receiveShadow = true;
  houseGroup.add(body);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.8, 4.8, 4), roofMaterial);
  roof.position.y = 9.4;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  houseGroup.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 0.18), doorMaterial);
  door.position.set(0, 2, 4.6);
  door.castShadow = true;
  houseGroup.add(door);

  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x74c7df, roughness: 0.35 });
  [-3.8, 3.8].forEach((x) => {
    const window = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 0.16), windowMaterial);
    window.position.set(x, 4.5, 4.7);
    houseGroup.add(window);
  });

  scene.add(houseGroup);

  [
    [-17, -12],
    [18, -8],
    [-21, 7],
    [21, 13]
  ].forEach(([x, z]) => {
    const trunk = new THREE.Mesh(
      new THREE.BoxGeometry(1, 3.2, 1),
      new THREE.MeshStandardMaterial({ color: 0x7a5136, roughness: 0.9 })
    );
    trunk.position.set(x, 1.6, z);
    trunk.castShadow = true;
    scene.add(trunk);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(2.8, 5.5, 4),
      new THREE.MeshStandardMaterial({ color: 0x2f7f42, roughness: 0.9 })
    );
    leaves.position.set(x, 5.3, z);
    leaves.rotation.y = Math.PI / 4;
    leaves.castShadow = true;
    scene.add(leaves);
  });
}

function SimpleRoom({ onExit, onOpenStudy }) {
  return (
    <section className="simple-room">
      <button className="exit-room" type="button" onClick={onExit}>
        <DoorOpen size={20} aria-hidden="true" />
        Volver al lobby
      </button>
      <div className="room-card">
        <div className="room-desk">
          <button className="room-computer" type="button" onClick={onOpenStudy}>
            <Monitor size={46} aria-hidden="true" />
            Abrir estudio
          </button>
        </div>
      </div>
    </section>
  );
}

function Hud({ place, isNearHouse, onReset }) {
  return (
    <aside className="hud">
      <div>
        <strong>{place === 'lobby' ? 'Lobby 3D' : 'Interior simple'}</strong>
        <span>WASD o flechas para caminar</span>
        <span>Arrastra el mouse para mirar</span>
      </div>
      {place === 'lobby' && (
        <div>
          <span>Camina por el sendero hasta la puerta</span>
          <span>E / Enter para entrar cuando estes cerca</span>
        </div>
      )}
      {place === 'lobby' && (
        <button type="button" onClick={onReset}>
          <RotateCcw size={16} aria-hidden="true" />
          Reiniciar
        </button>
      )}
      {isNearHouse && <p className="hud-ready">Estas frente a la puerta.</p>}
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

createRoot(document.getElementById('root')).render(<App />);
