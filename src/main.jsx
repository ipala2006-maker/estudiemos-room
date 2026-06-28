import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Monitor, RotateCcw, X } from 'lucide-react';
import * as THREE from 'three';
import { studySubjects } from './data/mockStudyContent.js';
import './styles/app.css';

const startPosition = new THREE.Vector3(0, 1.7, 20);
const houseDoorPosition = new THREE.Vector3(0, 1.7, -13.7);
const computerPosition = new THREE.Vector3(-3.0, 1.7, -23.3);

function App() {
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

      if (!studyOpen && isNearDoor && key === 'e') {
        toggleDoorRef.current();
        return;
      }

      if (!studyOpen && isNearComputer && key === 'e') {
        setStudyOpen(true);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDoorOpen, isNearComputer, isNearDoor, studyOpen]);

  function changeSubject(nextSubjectId) {
    const nextSubject = studySubjects.find((item) => item.id === nextSubjectId) ?? studySubjects[0];
    setSubjectId(nextSubject.id);
    setVideoId(nextSubject.videos[0].id);
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
        onReset={() => resetWorldRef.current()}
      />

      {isNearDoor && (
        <div className="interaction-prompt">Presiona E para {isDoorOpen ? 'cerrar' : 'abrir'} la puerta</div>
      )}

      {isNearComputer && (
        <div className="interaction-prompt">Presiona E para abrir la computadora</div>
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

function FirstPersonWorld({ onDoorOpenChange, onNearComputerChange, onNearDoorChange, toggleDoorRef, resetRef }) {
  const mountRef = useRef(null);
  const nearDoorRef = useRef(false);
  const nearComputerRef = useRef(false);
  const doorOpenRef = useRef(false);

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

    const { doorPivot } = buildLobbyScene(scene);

    const keys = new Set();
    const keyPulses = new Map();
    let yaw = 0;
    let pitch = 0;
    let lastMouseX = null;
    let lastMouseY = null;

    function resetCamera() {
      camera.position.copy(startPosition);
      yaw = 0;
      pitch = 0;
      camera.rotation.set(pitch, yaw, 0);
      doorOpenRef.current = false;
      doorPivot.rotation.y = 0;
      nearDoorRef.current = false;
      nearComputerRef.current = false;
      onDoorOpenChange(false);
      onNearDoorChange(false);
      onNearComputerChange(false);
    }

    resetRef.current = resetCamera;
    toggleDoorRef.current = () => {
      doorOpenRef.current = !doorOpenRef.current;
      onDoorOpenChange(doorOpenRef.current);
    };

    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        keys.add(key);
        keyPulses.set(key, 0.12);
        event.preventDefault();
      }
      if (key === 'r') resetCamera();
    }

    function onKeyUp(event) {
      keys.delete(event.key.toLowerCase());
    }

    function onMouseMove(event) {
      if (lastMouseX == null || lastMouseY == null) {
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        return;
      }

      const dx = event.clientX - lastMouseX;
      const dy = event.clientY - lastMouseY;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      yaw -= dx * 0.004;
      pitch = clamp(pitch - dy * 0.003, -0.72, 0.52);
      camera.rotation.set(pitch, yaw, 0);
    }

    function onResize() {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    document.addEventListener('mousemove', onMouseMove);

    const clock = new THREE.Clock();
    let frameId = 0;

    function animate() {
      const delta = Math.min(clock.getDelta(), 0.04);
      const speed = 8.5 * delta;
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw) * -1);
      const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const move = new THREE.Vector3();

      keyPulses.forEach((timeLeft, key) => {
        const nextTime = timeLeft - delta;
        if (nextTime <= 0) keyPulses.delete(key);
        else keyPulses.set(key, nextTime);
      });

      if (isMoving(keys, keyPulses, 'w', 'arrowup')) move.add(forward);
      if (isMoving(keys, keyPulses, 's', 'arrowdown')) move.sub(forward);
      if (isMoving(keys, keyPulses, 'd', 'arrowright')) move.add(right);
      if (isMoving(keys, keyPulses, 'a', 'arrowleft')) move.sub(right);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(speed);
        camera.position.add(move);
        camera.position.x = clamp(camera.position.x, -27.5, 27.5);
        camera.position.z = clamp(camera.position.z, -27.5, 27.5);
        if (!doorOpenRef.current && camera.position.z < -13.7 && Math.abs(camera.position.x) < 7.2) {
          camera.position.z = -13.7;
        }
        if (doorOpenRef.current && camera.position.z < -22.15 && Math.abs(camera.position.x) < 7.2) {
          camera.position.z = -22.15;
        }
      }

      doorPivot.rotation.y += ((doorOpenRef.current ? -Math.PI * 0.62 : 0) - doorPivot.rotation.y) * 0.16;

      const nearDoor = camera.position.distanceTo(houseDoorPosition) < 5;
      if (nearDoor !== nearDoorRef.current) {
        nearDoorRef.current = nearDoor;
        onNearDoorChange(nearDoor);
      }

      const nearComputer = doorOpenRef.current && camera.position.distanceTo(computerPosition) < 5.8;
      if (nearComputer !== nearComputerRef.current) {
        nearComputerRef.current = nearComputer;
        onNearComputerChange(nearComputer);
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
      document.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [onDoorOpenChange, onNearComputerChange, onNearDoorChange, toggleDoorRef, resetRef]);

  return <section className="three-world" ref={mountRef} aria-label="Mundo 3D en primera persona" />;
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

  const wallParts = [
    { position: [-4.15, 3.5, 4.5], size: [3.7, 7, 0.35] },
    { position: [4.15, 3.5, 4.5], size: [3.7, 7, 0.35] },
    { position: [-1.775, 2, 4.5], size: [1.05, 4, 0.35] },
    { position: [1.775, 2, 4.5], size: [1.05, 4, 0.35] },
    { position: [0, 5.75, 4.5], size: [7, 2.5, 0.35] },
    { position: [0, 3.5, -4.5], size: [12, 7, 0.35] },
    { position: [-6, 3.5, 0], size: [0.35, 7, 9] },
    { position: [6, 3.5, 0], size: [0.35, 7, 9] }
  ];

  wallParts.forEach((part) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(...part.size), houseWall);
    wall.position.set(...part.position);
    wall.castShadow = true;
    wall.receiveShadow = true;
    houseGroup.add(wall);
  });

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(11.4, 0.18, 8.4),
    new THREE.MeshStandardMaterial({ color: 0xb9865f, roughness: 0.95 })
  );
  floor.position.y = 0.09;
  floor.receiveShadow = true;
  houseGroup.add(floor);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(8.8, 4.8, 4), roofMaterial);
  roof.position.y = 9.4;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  houseGroup.add(roof);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-1.25, 0, 4.72);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4, 0.18), doorMaterial);
  door.position.set(1.25, 2, 0);
  door.castShadow = true;
  doorPivot.add(door);
  houseGroup.add(doorPivot);

  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x74c7df, roughness: 0.35 });
  [-3.8, 3.8].forEach((x) => {
    const window = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 0.16), windowMaterial);
    window.position.set(x, 4.5, 4.7);
    houseGroup.add(window);
  });

  scene.add(houseGroup);

  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 1, 1.8),
    new THREE.MeshStandardMaterial({ color: 0x6a4635, roughness: 0.9 })
  );
  desk.position.set(-3.0, 1.05, -24.35);
  desk.castShadow = true;
  scene.add(desk);

  const upperScreen = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 2.25, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x203336, roughness: 0.5 })
  );
  upperScreen.position.set(-3.0, 3.75, -24.08);
  upperScreen.castShadow = true;
  scene.add(upperScreen);

  const upperGlow = new THREE.Mesh(
    new THREE.BoxGeometry(3.62, 1.68, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x57c1c8, emissive: 0x1b6f74, emissiveIntensity: 0.6 })
  );
  upperGlow.position.set(-3.0, 3.75, -23.92);
  scene.add(upperGlow);

  const lowerScreen = new THREE.Mesh(
    new THREE.BoxGeometry(3.45, 1.35, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x203336, roughness: 0.5 })
  );
  lowerScreen.position.set(-3.0, 2.05, -24.08);
  lowerScreen.castShadow = true;
  scene.add(lowerScreen);

  const lowerGlow = new THREE.Mesh(
    new THREE.BoxGeometry(2.86, 0.86, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x77d7a6, emissive: 0x1f7f50, emissiveIntensity: 0.55 })
  );
  lowerGlow.position.set(-3.0, 2.05, -23.92);
  scene.add(lowerGlow);

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

  return { doorPivot };
}

function Hud({ isDoorOpen, isNearComputer, isNearDoor, onReset }) {
  return (
    <aside className="hud">
      <div>
        <strong>Lobby 3D</strong>
        <span>WASD o flechas para caminar</span>
        <span>Mueve el mouse para mirar</span>
      </div>
      <div>
        <span>{isDoorOpen ? 'Entra a la casa y acercate a la computadora' : 'Camina por el sendero hasta la puerta'}</span>
        <span>E para interactuar cuando estes cerca</span>
      </div>
      <button type="button" onClick={onReset}>
        <RotateCcw size={16} aria-hidden="true" />
        Reiniciar
      </button>
      {isNearDoor && <p className="hud-ready">Estas frente a la puerta.</p>}
      {isNearComputer && <p className="hud-ready">Estas frente a la computadora.</p>}
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

function isMoving(keys, keyPulses, primary, alternate) {
  return keys.has(primary) || keys.has(alternate) || keyPulses.has(primary) || keyPulses.has(alternate);
}

createRoot(document.getElementById('root')).render(<App />);
